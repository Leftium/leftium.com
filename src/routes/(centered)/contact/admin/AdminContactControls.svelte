<script lang="ts">
	import { resolve } from '$app/paths'

	import type { PageData } from './$types'

	let { contact }: { contact: PageData['contact'] } = $props()

	const selectableIds = $derived(new Set(contact.allFieldIds))
	let selectedFieldIds = $derived([...contact.defaultFieldIds])
	let qrError = $state('')
	let revealedFieldId = $state<string | null>(null)
	let copyResult = $state<{ fieldId: string; status: 'copied' | 'failed' } | null>(null)

	const hasSelection = $derived(selectedFieldIds.length > 0)
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

	function buildArtifactQuery(format?: 'svg') {
		const parameters = new URLSearchParams()
		if (format) parameters.set('format', format)
		for (const id of selectedFieldIds) parameters.append('field', id)
		return parameters.toString()
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
		{#each contact.fields as field (field.id)}
			<div class="field-row" class:unshareable={!field.shareable}>
				<input
					id={`contact-field-${field.id}`}
					type="checkbox"
					value={field.id}
					bind:group={selectedFieldIds}
					disabled={!field.shareable}
					onchange={() => (qrError = '')}
				/>
				<span class:has-value={revealedFieldId === field.id} class="field-details">
					<label class="field-name" for={`contact-field-${field.id}`}>
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
</style>
