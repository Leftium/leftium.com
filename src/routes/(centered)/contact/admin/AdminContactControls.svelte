<script lang="ts">
	import { enhance } from '$app/forms'
	import { resolve } from '$app/paths'
	import { tick } from 'svelte'
	import { SvelteURLSearchParams } from 'svelte/reactivity'

	import type { ActionData, PageData } from './$types'

	let { contact, form }: { contact: PageData['contact']; form: ActionData | null } = $props()
	type DialogTarget =
		| { kind: 'selection' }
		| { kind: 'field'; id: string; label: string; value: string; qrEligible: boolean; url: string }

	const selectableIds = $derived(new Set(contact.allFieldIds))
	const privateFieldIds = $derived(
		new Set(
			contact.fields.filter((field) => !field.public && field.shareable).map((field) => field.id),
		),
	)
	let selectedFieldIds = $derived([...contact.defaultFieldIds])
	let qrError = $state('')
	let copyResult = $state<{ fieldId: string; status: 'copied' | 'failed' } | null>(null)
	let grantCopyStatus = $state('')
	let detailsDialog = $state<HTMLDialogElement>()
	let dialogTarget = $state<DialogTarget | null>(null)
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
	const activeQrUrl = $derived(dialogTarget?.kind === 'field' ? dialogTarget.url : qrUrl)
	const activeDialogHeading = $derived(
		dialogTarget?.kind === 'field' ? dialogTarget.label : 'Selected contact QR code',
	)
	const activeQrAlt = $derived(
		dialogTarget?.kind === 'field'
			? `QR code for ${dialogTarget.label}`
			: `QR code containing the selected contact details for ${contact.displayName}`,
	)
	const activeQrDescription = $derived(
		dialogTarget?.kind === 'field'
			? `Scan to use ${dialogTarget.label}.`
			: `Scan to add the selected contact details for ${contact.displayName}.`,
	)

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

	function isRegionalPreset(set: PageData['contact']['sets'][number]) {
		const id = set.id.toLowerCase()
		return id === 'korea' || id === 'us'
	}

	function privatePresetFieldIds(set: PageData['contact']['sets'][number]) {
		return set.fieldIds.filter((id) => privateFieldIds.has(id))
	}

	function applyNamedPreset(set: PageData['contact']['sets'][number]) {
		if (isRegionalPreset(set)) {
			toggleFieldGroup(privatePresetFieldIds(set))
			return
		}

		applySelection(set.fieldIds)
	}

	function openDetailsDialog(event: MouseEvent, target: DialogTarget) {
		if (!detailsDialog || typeof detailsDialog.showModal !== 'function') return

		event.preventDefault()
		qrError = ''
		if (target.kind === 'field' && copyResult?.fieldId !== target.id) copyResult = null
		dialogTarget = target
		if (!detailsDialog.open) detailsDialog.showModal()
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

	async function copyFieldValue(fieldId: string, value: string) {
		try {
			await navigator.clipboard.writeText(value)
			copyResult = { fieldId, status: 'copied' }
		} catch {
			copyResult = { fieldId, status: 'failed' }
		}
	}

	function copyDialogFieldValue() {
		if (dialogTarget?.kind !== 'field') return
		void copyFieldValue(dialogTarget.id, dialogTarget.value)
	}

	function fieldCopyButtonText(fieldId: string) {
		if (copyResult?.fieldId !== fieldId) return 'Copy'
		return copyResult.status === 'copied' ? 'Copied' : 'Retry'
	}

	function fieldCopyAriaLabel(fieldId: string, label: string) {
		if (copyResult?.fieldId !== fieldId) return `Copy ${label} value`
		return copyResult.status === 'copied'
			? `Copied ${label} value`
			: `Copy failed. Retry copying ${label} value`
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
		const parameters = new SvelteURLSearchParams()
		if (format) parameters.set('format', format)
		for (const id of selectedFieldIds) parameters.append('field', id)
		return parameters.toString()
	}

	function buildFieldQrUrl(fieldId: string) {
		const parameters = new SvelteURLSearchParams({ field: fieldId })
		return resolve(`/api/contact-qr?${parameters}`)
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
			if (failedUrl !== activeQrUrl) return

			qrError =
				response.status === 422
					? await response.text()
					: dialogTarget?.kind === 'field'
						? 'The QR code could not be generated. Try again.'
						: 'The QR code could not be generated. Try selecting fewer fields.'
		} catch {
			if (failedUrl === activeQrUrl) {
				qrError =
					dialogTarget?.kind === 'field'
						? 'The QR code could not be generated. Try again.'
						: 'The QR code could not be generated. Try selecting fewer fields.'
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
				aria-pressed={isRegionalPreset(set)
					? hasEverySelectedField(privatePresetFieldIds(set))
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
				<label class="field-name" for={`contact-field-${index}`}>
					<strong>{field.label}</strong>
					{#if field.public}<small>Public</small>{/if}
				</label>
				<span class="field-actions">
					<button
						type="button"
						class="field-action"
						aria-label={`Show ${field.label} value${field.qrEligible ? ' and QR code' : ''}`}
						onclick={(event) =>
							openDetailsDialog(event, {
								kind: 'field',
								id: field.id,
								label: field.label,
								value: field.value,
								qrEligible: field.qrEligible,
								url: buildFieldQrUrl(field.id),
							})}
					>
						Show
					</button>
					<button
						type="button"
						class="field-action"
						aria-label={fieldCopyAriaLabel(field.id, field.label)}
						aria-live="polite"
						onclick={() => copyFieldValue(field.id, field.value)}
					>
						{fieldCopyButtonText(field.id)}
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
			<a
				class="button"
				href={qrUrl}
				rel="external"
				data-sveltekit-reload
				onclick={(event) => openDetailsDialog(event, { kind: 'selection' })}>QR code</a
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
		id="admin-contact-details-dialog"
		aria-labelledby="admin-contact-details-heading"
		bind:this={detailsDialog}
		onclick={closeDialogOnBackdrop}
		onclose={() => (dialogTarget = null)}
	>
		<h2 id="admin-contact-details-heading">{activeDialogHeading}</h2>
		{#if dialogTarget?.kind === 'field'}
			<div class="field-dialog-value">
				<span>{dialogTarget.value}</span>
			</div>
		{/if}
		{#if dialogTarget && (dialogTarget.kind === 'selection' ? hasSelection : dialogTarget.qrEligible)}
			<img
				class:failed={qrError}
				src={activeQrUrl}
				alt={activeQrAlt}
				onerror={(event) =>
					void showQrError(event.currentTarget.getAttribute('src') ?? activeQrUrl)}
			/>
			{#if qrError}<p class="qr-error" aria-live="polite">{qrError}</p>{/if}
			<p>{activeQrDescription}</p>
		{/if}
		<form method="dialog" class="dialog-actions">
			{#if dialogTarget?.kind === 'field'}
				<button
					type="button"
					class="button secondary"
					aria-label={fieldCopyAriaLabel(dialogTarget.id, dialogTarget.label)}
					aria-live="polite"
					onclick={copyDialogFieldValue}
				>
					{fieldCopyButtonText(dialogTarget.id)}
				</button>
			{/if}
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
						<button
							type="button"
							aria-label={grantCopyStatus === 'Copied'
								? 'Copied visitor link'
								: grantCopyStatus
									? 'Copy failed. Retry copying visitor link'
									: 'Copy visitor link'}
							aria-live="polite"
							onclick={() => copyGrantLink(form.grantLink)}
						>
							{grantCopyStatus === 'Copied' ? 'Copied' : grantCopyStatus ? 'Retry' : 'Copy link'}
						</button>
					</div>
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
		box-sizing: border-box;
		display: grid;
		inline-size: var(--size-content-2);
		max-inline-size: 100%;
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

	.field-name {
		overflow-wrap: anywhere;
	}

	.field-actions {
		display: flex;
		gap: var(--size-1);
	}

	.field-action {
		box-sizing: border-box;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 4rem;
		min-block-size: 1.75rem;
		padding: 0 var(--size-2);
		border: 1px solid var(--gray-5);
		border-radius: var(--radius-2);
		background: var(--gray-0);
		color: inherit;
		font: inherit;
		font-size: var(--font-size-0);
		line-height: 1.25;
		text-decoration: none;
		cursor: pointer;
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

	.field-dialog-value {
		text-align: center;
	}

	.field-dialog-value span {
		overflow-wrap: anywhere;
	}

	dialog img {
		display: block;
		width: min(100%, 20rem);
		height: auto;
		aspect-ratio: 1;
		margin: var(--size-3) auto 0;
	}

	dialog img.failed {
		display: none;
	}

	dialog form {
		margin-top: var(--size-4);
	}

	.dialog-actions {
		display: flex;
		justify-content: center;
		gap: var(--size-2);
	}

	.button.secondary {
		border-color: var(--gray-5);
		background: var(--gray-0);
		color: inherit;
		box-shadow: none;
	}

	.button.secondary:hover {
		background: var(--gray-1);
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
