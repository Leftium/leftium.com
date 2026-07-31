<script lang="ts">
	import { enhance } from '$app/forms'
	import { resolve } from '$app/paths'
	import { tick } from 'svelte'

	import type { ActionData, PageData } from './$types'

	let { contact, form }: { contact: PageData['contact']; form: ActionData | null } = $props()

	const selectableIds = $derived(new Set(contact.allFieldIds))
	const privateFieldIds = $derived(
		new Set(
			contact.fields.filter((field) => !field.public && field.shareable).map((field) => field.id),
		),
	)
	let selectedFieldIds = $derived([...contact.defaultFieldIds])
	let qrError = $state('')
	let revealedFieldId = $state<string | null>(null)
	let copyResult = $state<{ fieldId: string; status: 'copied' | 'failed' } | null>(null)
	let grantCopyStatus = $state('')
	let grantDialog = $state<HTMLDialogElement>()
	let grantLinkInput = $state<HTMLInputElement>()

	$effect(() => {
		if (form?.action !== 'createGrantLink') return

		void showGrantDialog()
	})

	const hasSelection = $derived(selectedFieldIds.length > 0)
	const selectedPrivateFieldIds = $derived(
		contact.fields
			.filter((field) => !field.public && field.shareable && selectedFieldIds.includes(field.id))
			.map((field) => field.id),
	)
	const hasPrivateSelection = $derived(selectedPrivateFieldIds.length > 0)
	const hasAllSelected = $derived(
		contact.allFieldIds.length > 0 &&
			contact.allFieldIds.every((id) => selectedFieldIds.includes(id)),
	)
	const hasAllPublicSelected = $derived(
		contact.defaultFieldIds.length > 0 &&
			contact.defaultFieldIds.every((id) => selectedFieldIds.includes(id)),
	)
	const namedPresets = $derived(
		contact.sets.filter((set) => !contact.allFieldIds.every((id) => set.fieldIds.includes(id))),
	)
	const vcardQuery = $derived(buildArtifactQuery())
	const qrQuery = $derived(buildArtifactQuery('svg'))
	const qrUrl = $derived(resolve(`/api/vcard?${qrQuery}`))

	function applySelection(fieldIds: string[]) {
		qrError = ''
		grantCopyStatus = ''
		selectedFieldIds = [...new Set(fieldIds.filter((id) => selectableIds.has(id)))]
	}

	function toggleAllFields() {
		applySelection(hasAllSelected ? [] : contact.allFieldIds)
	}

	function togglePublicFields() {
		toggleFieldGroup(contact.defaultFieldIds)
	}

	function toggleFieldGroup(fieldIds: string[]) {
		const fieldIdSet = new Set(fieldIds)
		applySelection(
			hasEverySelectedField(fieldIds)
				? selectedFieldIds.filter((id) => !fieldIdSet.has(id))
				: [...selectedFieldIds, ...fieldIds],
		)
	}

	function hasEverySelectedField(fieldIds: string[]) {
		return fieldIds.length > 0 && fieldIds.every((id) => selectedFieldIds.includes(id))
	}

	function applyNamedPreset(set: PageData['contact']['sets'][number]) {
		if (set.id === 'korea') {
			toggleFieldGroup(set.fieldIds.filter((id) => privateFieldIds.has(id)))
			return
		}

		applySelection(set.fieldIds)
	}

	function openQrDialog(event: MouseEvent) {
		const dialog = document.querySelector<HTMLDialogElement>('#admin-contact-qr-dialog')
		if (!dialog || typeof dialog.showModal !== 'function') return

		event.preventDefault()
		if (!dialog.open) dialog.showModal()
	}

	function closeDialogOnBackdrop(event: MouseEvent) {
		const dialog = event.currentTarget
		if (!(dialog instanceof HTMLDialogElement) || event.target !== dialog) return

		const bounds = dialog.getBoundingClientRect()
		const outsideDialog =
			event.clientX < bounds.left ||
			event.clientX > bounds.right ||
			event.clientY < bounds.top ||
			event.clientY > bounds.bottom
		if (outsideDialog) dialog.close()
	}

	async function showGrantDialog() {
		await tick()
		if (!grantDialog || typeof grantDialog.showModal !== 'function') return

		if (grantDialog.open) grantDialog.close()
		grantDialog.showModal()
	}

	function toggleFieldValue(fieldId: string) {
		revealedFieldId = revealedFieldId === fieldId ? null : fieldId
	}

	async function copyFieldValue(fieldId: string, value: string) {
		try {
			await navigator.clipboard.writeText(value)
			copyResult = { fieldId, status: 'copied' }
		} catch {
			copyResult = { fieldId, status: 'failed' }
		}
	}

	async function copyGrantLink(grantLink: string | undefined) {
		if (!grantLink) return

		if (navigator.clipboard) {
			try {
				await navigator.clipboard.writeText(grantLink)
				grantCopyStatus = 'Copied'
				return
			} catch {
				// Fall back for browsers that expose the API but deny access.
			}
		}

		grantLinkInput?.focus()
		grantLinkInput?.select()
		grantLinkInput?.setSelectionRange(0, grantLink.length)
		grantCopyStatus = document.execCommand('copy')
			? 'Copied'
			: 'Select the link and copy it manually.'
	}

	function buildArtifactQuery(format?: 'svg') {
		const parameters = new URLSearchParams()
		if (format) parameters.set('format', format)
		for (const id of selectedFieldIds) parameters.append('field', id)
		return parameters.toString()
	}

	function sameFieldIds(left: string[] | undefined, right: string[]) {
		if (left === undefined || left.length !== right.length) return false

		const sortedLeft = [...left].sort()
		const sortedRight = [...right].sort()
		return sortedLeft.every((fieldId, index) => fieldId === sortedRight[index])
	}

	async function showQrError(failedUrl: string) {
		try {
			const response = await fetch(failedUrl)
			if (failedUrl !== qrUrl) return

			qrError =
				response.status === 422
					? await response.text()
					: 'The QR code could not be generated. Try selecting fewer fields.'
		} catch {
			if (failedUrl === qrUrl) {
				qrError = 'The QR code could not be generated. Try selecting fewer fields.'
			}
		}
	}
</script>

<section class="admin-controls">
	<h1>Contact Admin</h1>
	<p class="subtitle">Choose details to share</p>

	<div class="presets" aria-label="Contact field presets">
		<button type="button" aria-pressed={hasAllSelected} onclick={toggleAllFields}>All</button>
		<button type="button" aria-pressed={hasAllPublicSelected} onclick={togglePublicFields}
			>Public</button
		>
		{#each namedPresets as set (set.id)}
			<button
				type="button"
				aria-pressed={set.id === 'korea'
					? hasEverySelectedField(set.fieldIds.filter((id) => privateFieldIds.has(id)))
					: undefined}
				onclick={() => applyNamedPreset(set)}>{set.label}</button
			>
		{/each}
	</div>

	<fieldset>
		<legend>Contact fields</legend>
		{#each contact.fields as field, index (field.id)}
			<div class="field-row" class:unshareable={!field.shareable}>
				<input
					id={`contact-field-${index}`}
					type="checkbox"
					value={field.id}
					bind:group={selectedFieldIds}
					disabled={!field.shareable}
					onchange={() => {
						qrError = ''
						grantCopyStatus = ''
					}}
				/>
				<span class:has-value={revealedFieldId === field.id} class="field-details">
					<label class="field-name" for={`contact-field-${index}`}>
						<strong>{field.label}</strong>
						{#if field.public}<small>Public</small>{/if}
					</label>
					{#if revealedFieldId === field.id}
						<span class="field-value">{field.value}</span>
					{/if}
				</span>
				<span class="field-actions">
					<button
						type="button"
						class="field-action value-toggle"
						aria-label={`${revealedFieldId === field.id ? 'Hide' : 'Show'} ${field.label} value`}
						aria-pressed={revealedFieldId === field.id}
						onclick={() => toggleFieldValue(field.id)}
					>
						{revealedFieldId === field.id ? 'Hide' : 'Show'}
					</button>
					<button
						type="button"
						class="field-action"
						aria-label={copyResult?.fieldId === field.id
							? copyResult.status === 'copied'
								? `Copied ${field.label} value`
								: `Copy failed. Retry copying ${field.label} value`
							: `Copy ${field.label} value`}
						aria-live="polite"
						onclick={() => copyFieldValue(field.id, field.value)}
					>
						{copyResult?.fieldId === field.id
							? copyResult.status === 'copied'
								? 'Copied'
								: 'Retry'
							: 'Copy'}
					</button>
				</span>
			</div>
		{/each}
	</fieldset>

	<div class="artifacts" aria-label="Selected contact card actions">
		{#if hasSelection}
			<a class="button" href={resolve(`/api/vcard?${vcardQuery}`)} data-sveltekit-reload download
				>Download selected vCard</a
			>
			<a class="button" href={qrUrl} rel="external" data-sveltekit-reload onclick={openQrDialog}
				>QR code</a
			>
		{:else}
			<p>Select at least one contact field to create a vCard or QR code.</p>
		{/if}
		<form
			method="POST"
			action="?/createGrantLink"
			use:enhance={() => {
				grantCopyStatus = ''
				return async ({ update }) => update({ invalidateAll: false, reset: false })
			}}
		>
			{#each selectedPrivateFieldIds as fieldId (fieldId)}
				<input type="hidden" name="field" value={fieldId} />
			{/each}
			<button class="button grant-action" type="submit" disabled={!hasPrivateSelection}
				>Create visitor link</button
			>
		</form>
	</div>

	<dialog
		id="admin-contact-qr-dialog"
		aria-labelledby="admin-contact-qr-heading"
		onclick={closeDialogOnBackdrop}
	>
		<h2 id="admin-contact-qr-heading">Selected contact QR code</h2>
		{#if hasSelection}
			<img
				class:failed={qrError}
				src={qrUrl}
				alt={`QR code containing the selected contact details for ${contact.displayName}`}
				onerror={(event) => void showQrError(event.currentTarget.getAttribute('src') ?? qrUrl)}
			/>
			{#if qrError}<p class="qr-error" aria-live="polite">{qrError}</p>{/if}
		{/if}
		<p>Scan to add the selected contact details for {contact.displayName}.</p>
		<form method="dialog">
			<button class="button" type="submit">Close</button>
		</form>
	</dialog>

	{#if form?.action === 'createGrantLink'}
		<dialog
			open
			aria-labelledby="visitor-link-heading"
			bind:this={grantDialog}
			onclick={closeDialogOnBackdrop}
		>
			<h2 id="visitor-link-heading">Visitor link</h2>
			{#if 'grantLink' in form && sameFieldIds(form.grantFieldIds, selectedPrivateFieldIds)}
				<p>
					This link can be claimed for {form.expiresInDays} days and grants access until the link expires.
				</p>
				<div class="generated-grant">
					<label for="visitor-grant-link">Visitor link</label>
					<div class="copy-row">
						<input
							id="visitor-grant-link"
							type="text"
							readonly
							value={form.grantLink}
							bind:this={grantLinkInput}
							onfocus={(event) => event.currentTarget.select()}
						/>
						<button type="button" onclick={() => copyGrantLink(form.grantLink)}>Copy link</button>
					</div>
					{#if grantCopyStatus}
						<p class="copy-status" aria-live="polite">{grantCopyStatus}</p>
					{/if}
				</div>
			{:else if 'grantLink' in form}
				<p class="form-error">The selection changed. Create a new visitor link.</p>
			{:else if 'unauthorized' in form}
				<p class="form-error">Your admin session is no longer valid. Log in again.</p>
			{:else if 'unavailable' in form}
				<p class="form-error">Visitor link signing is not configured.</p>
			{:else if 'invalidSelection' in form}
				<p class="form-error">Select at least one private contact field and try again.</p>
			{/if}
			<form method="dialog">
				<button class="button" type="submit">Close</button>
			</form>
		</dialog>
	{/if}
</section>

<style>
	.admin-controls {
		margin-top: 0;
		padding-bottom: var(--size-5);
		border-bottom: 1px solid var(--gray-4);
	}

	.admin-controls > h1 {
		margin-bottom: var(--size-2);
	}

	.subtitle {
		margin: 0;
		color: var(--gray-7);
	}

	.artifacts {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--size-3);
		margin: var(--size-4) 0 0;
	}

	.artifacts form {
		margin: 0;
	}

	.artifacts p {
		margin: 0;
	}

	.presets {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--size-2);
		margin: var(--size-4) 0;
	}

	button {
		padding: var(--size-2) var(--size-3);
		border: 1px solid var(--gray-5);
		border-radius: var(--radius-2);
		background: var(--gray-0);
		color: inherit;
		cursor: pointer;
	}

	fieldset {
		display: grid;
		gap: 0;
		margin: auto;
		padding: var(--size-2);
		border: 1px solid var(--gray-4);
		border-radius: var(--radius-2);
		text-align: left;
	}

	.field-row {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: var(--size-2);
		align-items: start;
		padding: var(--size-1) var(--size-2);
		border-radius: var(--radius-2);
		line-height: 1.25;
	}

	.field-row:hover {
		background: var(--gray-1);
	}

	.field-row.unshareable {
		opacity: 0.6;
	}

	fieldset input {
		margin: 0.1em 0 0;
	}

	small {
		margin-left: var(--size-2);
		color: var(--gray-7);
		font-weight: normal;
	}

	.field-details {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--size-2);
		align-items: baseline;
	}

	.field-details.has-value {
		grid-template-columns: minmax(7rem, 0.45fr) minmax(0, 1fr);
	}

	.field-name {
		overflow-wrap: anywhere;
	}

	.field-value {
		overflow-wrap: anywhere;
		color: var(--gray-7);
	}

	.field-actions {
		display: flex;
		gap: var(--size-1);
	}

	.field-action {
		padding: 0 var(--size-2);
		font-size: var(--font-size-0);
	}

	.value-toggle {
		inline-size: 3.5rem;
	}

	@media (max-width: 30rem) {
		.field-details.has-value {
			grid-template-columns: minmax(0, 1fr);
			gap: 0;
		}
	}

	.grant-action {
		border-color: var(--blue-9);
		background: var(--blue-8);
		color: white;
		font-weight: var(--font-weight-6);
	}

	.grant-action:disabled,
	.grant-action:disabled:hover {
		border-color: var(--gray-5);
		background: var(--gray-3);
		color: var(--gray-7);
		cursor: not-allowed;
	}

	.generated-grant {
		display: grid;
		gap: var(--size-2);
		max-width: 44rem;
		margin: var(--size-4) auto 0;
		text-align: left;
	}

	.copy-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: var(--size-2);
		align-items: stretch;
	}

	.copy-row input,
	.copy-row button {
		box-sizing: border-box;
		margin: 0;
		font: inherit;
		line-height: 1.5;
	}

	.copy-row input {
		min-width: 0;
		padding: var(--size-2);
	}

	.copy-status {
		margin: 0;
		color: var(--gray-7);
	}

	.form-error {
		color: var(--red-8);
	}

	.button {
		box-sizing: border-box;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin: 0;
		padding: var(--size-2) var(--size-4);
		border: 1px solid var(--blue-9);
		border-radius: var(--radius-2);
		background: var(--blue-8);
		color: white;
		font: inherit;
		font-weight: var(--font-weight-6);
		line-height: 1.5;
		text-decoration: none;
		cursor: pointer;
		box-shadow: var(--shadow-2);
	}

	.button:hover {
		background: var(--blue-9);
	}

	dialog {
		box-sizing: border-box;
		width: min(calc(100% - var(--size-6)), 30rem);
		max-width: none;
		padding: var(--size-5);
		border: 0;
		border-radius: var(--radius-3);
		text-align: center;
		box-shadow: var(--shadow-5);
	}

	dialog::backdrop {
		background: rgb(0 0 0 / 60%);
	}

	dialog h2 {
		margin-top: 0;
	}

	dialog img {
		display: block;
		width: min(100%, 20rem);
		height: auto;
		margin: var(--size-3) auto 0;
	}

	dialog img.failed {
		display: none;
	}

	dialog form {
		margin-top: var(--size-4);
	}

	.qr-error {
		color: var(--red-8);
	}

	@media (max-width: 35rem) {
		.copy-row {
			grid-template-columns: 1fr;
		}
	}
</style>
