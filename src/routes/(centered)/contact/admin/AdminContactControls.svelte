<script lang="ts">
	import { enhance } from '$app/forms'
	import { resolve } from '$app/paths'

	import type { ActionData, PageData } from './$types'

	let { contact, form }: { contact: PageData['contact']; form: ActionData | null } = $props()

	const selectableIds = $derived(new Set(contact.allFieldIds))
	let selectedFieldIds = $derived([...contact.defaultFieldIds])
	let qrError = $state('')
	let revealedFieldId = $state<string | null>(null)
	let copyResult = $state<{ fieldId: string; status: 'copied' | 'failed' } | null>(null)
	let grantCopyStatus = $state('')
	let grantLinkInput = $state<HTMLInputElement>()

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
	const hasEverythingPreset = $derived(
		contact.sets.some((set) => contact.allFieldIds.every((id) => set.fieldIds.includes(id))),
	)
	const vcardQuery = $derived(buildArtifactQuery())
	const qrQuery = $derived(buildArtifactQuery('svg'))
	const qrUrl = $derived(resolve(`/api/vcard?${qrQuery}`))

	function applySelection(fieldIds: string[]) {
		qrError = ''
		grantCopyStatus = ''
		selectedFieldIds = [...new Set(fieldIds.filter((id) => selectableIds.has(id)))]
	}

	function applyPreset(fieldIds: string[]) {
		const selectsEverything = contact.allFieldIds.every((id) => fieldIds.includes(id))
		applySelection(selectsEverything && hasAllSelected ? [] : fieldIds)
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

<section class="admin-controls" aria-labelledby="admin-contact-heading">
	<h2 id="admin-contact-heading">Choose details to share</h2>

	<div class="presets" aria-label="Contact field presets">
		<button type="button" onclick={() => applySelection(contact.defaultFieldIds)}
			>Public only</button
		>
		{#each contact.sets as set (set.id)}
			<button type="button" onclick={() => applyPreset(set.fieldIds)}>{set.label}</button>
		{/each}
		{#if !hasEverythingPreset}
			<button type="button" onclick={() => applyPreset(contact.allFieldIds)}>Everything</button>
		{/if}
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

	<section class="artifacts" aria-labelledby="admin-card-heading">
		<h2 id="admin-card-heading">Selected digital business card</h2>
		{#if hasSelection}
			<a class="button" href={resolve(`/api/vcard?${vcardQuery}`)} data-sveltekit-reload download
				>Download selected vCard</a
			>
			<h3>Or scan this QR code</h3>
			<img
				class:failed={qrError}
				src={qrUrl}
				alt={`QR code containing the selected contact details for ${contact.displayName}`}
				onerror={(event) => void showQrError(event.currentTarget.getAttribute('src') ?? qrUrl)}
			/>
			{#if qrError}<p class="qr-error" aria-live="polite">{qrError}</p>{/if}
		{:else}
			<p>Select at least one contact field to create a vCard or QR code.</p>
		{/if}
	</section>

	<section class="grant-sharing" aria-labelledby="grant-sharing-heading">
		<h2 id="grant-sharing-heading">Share selected private details by link</h2>
		<p>The link can be claimed for seven days and grants access until the link expires.</p>
		<form
			method="POST"
			action="?/createGrantLink"
			use:enhance={() =>
				async ({ update }) =>
					update({ invalidateAll: false, reset: false })}
		>
			{#each selectedPrivateFieldIds as fieldId (fieldId)}
				<input type="hidden" name="field" value={fieldId} />
			{/each}
			<button class="grant-action" type="submit" disabled={!hasPrivateSelection}
				>Create visitor link</button
			>
		</form>

		{#if form?.action === 'createGrantLink' && 'grantLink' in form && sameFieldIds(form.grantFieldIds, selectedPrivateFieldIds)}
			<div class="generated-grant">
				<label for="visitor-grant-link">Visitor link, claimable for {form.expiresInDays} days</label
				>
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
		{:else if form?.action === 'createGrantLink' && 'grantLink' in form}
			<p class="form-error">The selection changed. Create a new visitor link.</p>
		{:else if form?.action === 'createGrantLink' && 'unauthorized' in form}
			<p class="form-error">Your admin session is no longer valid. Log in again.</p>
		{:else if form?.action === 'createGrantLink' && 'unavailable' in form}
			<p class="form-error">Visitor link signing is not configured.</p>
		{:else if form?.action === 'createGrantLink' && 'invalidSelection' in form}
			<p class="form-error">Select at least one private contact field and try again.</p>
		{/if}
	</section>
</section>

<style>
	.admin-controls {
		margin-top: var(--size-6);
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

	.artifacts {
		margin-top: var(--size-6);
	}

	.grant-sharing {
		margin-top: var(--size-7);
		padding-top: var(--size-4);
		border-top: 1px solid var(--gray-4);
	}

	.grant-action {
		border-color: var(--blue-9);
		background: var(--blue-8);
		color: white;
		font-weight: var(--font-weight-6);
	}

	.grant-action:disabled {
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
		display: inline-block;
		padding: var(--size-2) var(--size-4);
		border: 1px solid var(--blue-9);
		border-radius: var(--radius-2);
		background: var(--blue-8);
		color: white;
		font-weight: var(--font-weight-6);
		text-decoration: none;
		box-shadow: var(--shadow-2);
	}

	.button:hover {
		background: var(--blue-9);
	}

	img {
		display: block;
		width: min(100%, 24rem);
		height: auto;
		margin: var(--size-3) auto 0;
	}

	img.failed {
		display: none;
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
