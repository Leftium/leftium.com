<script lang="ts">
	import 'open-props/style'

	import { enhance } from '$app/forms'
	import { replaceState } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { page } from '$app/state'
	import { onMount, tick } from 'svelte'

	import type { PageProps } from './$types'

	let { data, form }: PageProps = $props()
	let claimForm = $state<HTMLFormElement>()
	let claimToken = $state('')
	let requestCopyStatus = $state('')

	onMount(() => {
		const timeout = window.setTimeout(() => void claimGrantLink())
		return () => window.clearTimeout(timeout)
	})

	async function claimGrantLink() {
		const fragment = new URLSearchParams(location.hash.slice(1))
		const token = fragment.get('grant')
		if (!token) return

		clearGrantFragment()
		claimToken = token
		await tick()
		claimForm?.requestSubmit()
	}

	function clearGrantFragment() {
		try {
			replaceState(resolve('/contact'), page.state ?? {})
		} catch {
			// A fresh page can mount before SvelteKit's router is ready. A successful claim also clears it.
		}
	}

	function openQrDialog(event: MouseEvent) {
		const dialog = document.querySelector<HTMLDialogElement>('#contact-qr-dialog')
		if (!dialog || typeof dialog.showModal !== 'function') return

		event.preventDefault()
		if (!dialog.open) dialog.showModal()
	}

	function closeQrDialogOnBackdrop(event: MouseEvent) {
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

	async function copyRequestTemplate() {
		const request = data.contact.request
		if (!request) return

		if (navigator.clipboard) {
			try {
				await navigator.clipboard.writeText(request.body)
				requestCopyStatus = 'Copied'
				return
			} catch {
				// Fall back for browsers that expose the API but deny access.
			}
		}

		const source = document.createElement('textarea')
		source.value = request.body
		source.readOnly = true
		source.style.position = 'fixed'
		source.style.opacity = '0'
		document.body.append(source)
		let copied: boolean
		try {
			source.focus()
			source.select()
			source.setSelectionRange(0, source.value.length)
			copied = document.execCommand('copy')
		} catch {
			copied = false
		} finally {
			source.remove()
		}
		requestCopyStatus = copied ? 'Copied' : 'Copy failed. Try the email template instead.'
	}
</script>

<svelte:head>
	<title>Contact {data.contact.displayName}</title>
</svelte:head>

<main class="contact">
	<form class="grant-claim" method="POST" action="?/claimGrant" bind:this={claimForm} use:enhance>
		<input type="hidden" name="token" value={claimToken} />
	</form>

	<h1>How to contact {data.contact.displayName.split(' ')[0]}</h1>
	<div class="button-row contact-actions" aria-label="Contact card actions">
		<a class="button" href={resolve('/api/vcard')} data-sveltekit-reload download>Download vCard</a>
		<a
			class="button"
			href={resolve('/api/vcard?format=svg')}
			rel="external"
			data-sveltekit-reload
			onclick={openQrDialog}>QR code</a
		>
	</div>

	{#if data.contact.granted}
		<p class="grant-status">Additional contact details have been shared with this browser.</p>
	{/if}

	{#if form?.action === 'claimGrant' && ('invalid' in form || 'unavailable' in form)}
		<p class="grant-error" aria-live="polite">This access link is invalid or has expired.</p>
	{/if}

	{#if data.contact.fields.length > 0}
		<dl>
			{#each data.contact.fields as field (field.id)}
				<dt>{field.label}</dt>
				<dd>
					{#if field.href}
						<a href={field.href} rel="external">{field.value}</a>
					{:else}
						{field.value}
					{/if}
				</dd>
			{/each}
		</dl>
	{/if}

	{#if data.contact.unavailableFields.length > 0}
		<section aria-labelledby="unavailable-contact-heading">
			<h2 id="unavailable-contact-heading">Available upon request</h2>
			<ul class="unavailable-fields">
				{#each data.contact.unavailableFields as field, index (index)}
					<li>{field.label}</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if data.contact.request}
		<section class="request-actions" aria-label="Request contact details">
			<div class="button-row">
				<a class="button" href={data.contact.request.mailtoHref} rel="external"
					>Email request template</a
				>
				<button class="button" type="button" onclick={copyRequestTemplate}
					>Copy request template</button
				>
			</div>
			{#if requestCopyStatus}
				<p class="copy-status" aria-live="polite">{requestCopyStatus}</p>
			{/if}
		</section>
	{/if}

	<dialog
		id="contact-qr-dialog"
		aria-labelledby="contact-qr-heading"
		onclick={closeQrDialogOnBackdrop}
	>
		<h2 id="contact-qr-heading">Contact QR code</h2>
		<img
			src={resolve('/api/vcard?format=svg')}
			alt={`QR code containing ${data.contact.displayName}'s authorized contact details`}
		/>
		<p>Scan to add {data.contact.displayName.split(' ')[0]}'s authorized contact details.</p>
		<form method="dialog">
			<button class="button" type="submit">Close</button>
		</form>
	</dialog>

	<footer>
		<a class="admin-link" href={resolve('/contact/admin')}>Admin</a>
	</footer>
</main>

<style>
	.contact {
		margin: auto;
		text-align: center;
	}

	.grant-claim {
		display: none;
	}

	.grant-status {
		color: var(--green-8);
	}

	.grant-error {
		color: var(--red-8);
	}

	dl {
		display: grid;
		grid-template-columns: max-content 1fr;
		width: fit-content;
		max-width: 100%;
		margin: var(--size-5) auto;
		padding: 0 var(--size-3);
		text-align: left;
	}

	dt,
	dd {
		margin: 0;
		padding: var(--size-2) 0;
		border-top: 1px solid #dcdcdc;
	}

	dt:first-of-type,
	dt:first-of-type + dd {
		border-top: none;
	}

	dt {
		padding-right: var(--size-3);
		font-weight: var(--font-weight-7);
		text-align: right;
	}

	.unavailable-fields {
		display: flex;
		flex-wrap: wrap;
		gap: var(--size-2) var(--size-4);
		justify-content: center;
		width: min(100%, calc(32rem + var(--size-4) + var(--size-4) + var(--size-4)));
		margin: 0 auto var(--size-5);
		padding: 0;
		text-align: left;
		list-style: none;
	}

	.unavailable-fields li {
		box-sizing: border-box;
		flex: 0 1 8rem;
	}

	.contact-actions {
		margin-block: var(--size-4) var(--size-5);
	}

	.request-actions {
		margin-block: var(--size-6);
	}

	.button-row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--size-3);
		justify-content: center;
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

	.copy-status {
		margin-bottom: 0;
		color: var(--green-8);
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
		margin: var(--size-3) auto;
	}

	dialog form {
		margin-top: var(--size-4);
	}

	footer {
		margin-top: var(--size-8);
	}

	.admin-link {
		color: var(--gray-6);
		font-size: var(--font-size-0);
	}
</style>
