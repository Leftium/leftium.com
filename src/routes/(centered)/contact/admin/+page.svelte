<script lang="ts">
	import { enhance } from '$app/forms'
	import { replaceState } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { page } from '$app/state'
	import { onMount, tick } from 'svelte'

	import AdminContactControls from './AdminContactControls.svelte'

	import type { PageProps } from './$types'

	let { data, form }: PageProps = $props()

	let claimToken = $state('')
	let copyStatus = $state('')
	let loginDialog = $state<HTMLDialogElement>()
	let loginLinkInput = $state<HTMLInputElement>()

	$effect(() => {
		const loginLink =
			form?.action === 'createLoginLink' && 'loginLink' in form ? form.loginLink : undefined
		if (!loginLink) return

		void showLoginDialog()
	})

	onMount(() => {
		const timeout = window.setTimeout(readBootstrapLink)
		return () => window.clearTimeout(timeout)
	})

	function readBootstrapLink() {
		if (location.hash === '#signed-in') {
			clearBootstrapFragment()
			return
		}

		const fragment = new URLSearchParams(location.hash.slice(1))
		const token = fragment.get('login')
		if (!token) return
		if (data.contact.mode === 'admin') {
			clearBootstrapFragment()
			return
		}

		claimToken = token
	}

	function clearBootstrapFragment() {
		try {
			replaceState(resolve('/contact/admin'), page.state ?? {})
		} catch {
			// A fresh page can mount before SvelteKit's router is ready. The claim redirect also clears it.
		}
	}

	async function showLoginDialog() {
		await tick()
		if (!loginDialog || typeof loginDialog.showModal !== 'function') return

		if (loginDialog.open) loginDialog.close()
		loginDialog.showModal()
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

	async function copyLoginLink(loginLink: string | undefined) {
		if (!loginLink) return

		if (navigator.clipboard) {
			try {
				await navigator.clipboard.writeText(loginLink)
				copyStatus = 'Copied'
				return
			} catch {
				// Fall back for browsers that expose the API but deny access.
			}
		}

		loginLinkInput?.focus()
		loginLinkInput?.select()
		loginLinkInput?.setSelectionRange(0, loginLink.length)
		copyStatus = document.execCommand('copy') ? 'Copied' : 'Select the link and copy it manually.'
	}
</script>

<svelte:head>
	<title>Contact Admin - {data.contact.displayName}</title>
</svelte:head>

<main class="admin">
	{#if data.contact.mode !== 'admin'}
		<h1>Contact Admin</h1>
	{/if}

	{#if data.contact.mode === 'admin'}
		<AdminContactControls contact={data.contact} {form} />

		{#if form?.action === 'createLoginLink' && 'unauthorized' in form}
			<p class="form-error">Your admin session is no longer valid. Log in again.</p>
		{/if}

		<div class="session-actions">
			<form
				method="POST"
				action="?/createLoginLink"
				use:enhance={() => {
					copyStatus = ''
					return async ({ update }) => update({ invalidateAll: false, reset: false })
				}}
			>
				<button type="submit">Create mobile login</button>
			</form>
			<form class="admin-logout" method="POST" action="?/logout" use:enhance>
				<button type="submit">Log out of admin mode</button>
			</form>
		</div>
	{:else if claimToken}
		<form class="bootstrap-claim" method="POST" action="?/claim" onsubmit={clearBootstrapFragment}>
			<p>Open this page in Safari before continuing, then tap "Enter admin mode."</p>
			<input type="hidden" name="token" value={claimToken} />
			<button type="submit">Enter admin mode</button>
		</form>
	{:else if data.contact.adminAccessAvailable}
		<form class="login" method="POST" action="?/login" use:enhance>
			<label for="access-key">Admin access key</label>
			<input
				id="access-key"
				name="accessKey"
				type="password"
				autocomplete="current-password"
				maxlength="256"
				required
			/>
			<button type="submit">Enter admin mode</button>
		</form>

		{#if form?.action === 'login' && 'invalid' in form && form.invalid}
			<p class="form-error">That access key is not valid.</p>
		{:else if form?.action === 'claim' && 'invalid' in form && form.invalid}
			<p class="form-error">That mobile login link is invalid or has expired.</p>
		{:else if form?.action === 'claim' && 'unavailable' in form && form.unavailable}
			<p class="form-error">Admin access is not configured.</p>
		{/if}
	{:else}
		<p class="form-error">Admin access is not configured.</p>
	{/if}

	<footer>
		<a class="back-link" href={resolve('/contact')}>Back to public contact page</a>
	</footer>

	{#if form?.action === 'createLoginLink' && 'loginLink' in form}
		<dialog
			open
			aria-labelledby="mobile-login-heading"
			bind:this={loginDialog}
			onclick={closeDialogOnBackdrop}
		>
			<h2 id="mobile-login-heading">Mobile login</h2>
			<p>
				This link is valid for {form.expiresInMinutes} minutes and does not expose your permanent access
				key.
			</p>
			<div class="generated-login">
				<label for="mobile-login-link">Mobile login link</label>
				<div class="copy-row">
					<input
						id="mobile-login-link"
						type="text"
						readonly
						value={form.loginLink}
						bind:this={loginLinkInput}
						onfocus={(event) => event.currentTarget.select()}
					/>
					<button type="button" onclick={() => copyLoginLink(form.loginLink)}>Copy link</button>
				</div>
				{#if copyStatus}<p class="copy-status" aria-live="polite">{copyStatus}</p>{/if}
				<img
					class="login-qr"
					src={form.loginQrDataUrl}
					alt="QR code for a short-lived admin login"
				/>
			</div>
			<form method="dialog">
				<button type="submit">Close</button>
			</form>
		</dialog>
	{/if}
</main>

<style>
	.admin {
		margin: auto;
		text-align: center;
	}

	.bootstrap-claim {
		display: grid;
		gap: var(--size-3);
		justify-items: center;
		max-width: 28rem;
		margin: var(--size-6) auto 0;
	}

	.bootstrap-claim p {
		margin: 0;
	}

	.back-link {
		display: block;
		width: fit-content;
		margin: 0 auto;
		color: var(--gray-7);
		font-size: var(--font-size-0);
	}

	.session-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--size-3);
		margin-top: var(--size-7);
	}

	.session-actions form {
		margin: 0;
	}

	.admin-logout button {
		border-color: var(--gray-5);
		background: var(--gray-1);
		color: inherit;
		box-shadow: none;
	}

	.admin-logout button:hover {
		background: var(--gray-2);
	}

	.login {
		display: grid;
		gap: var(--size-3);
		max-width: 28rem;
		margin: var(--size-6) auto 0;
		text-align: left;
	}

	.login input {
		min-width: 0;
		padding: var(--size-2);
	}

	.generated-login {
		display: grid;
		gap: var(--size-3);
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

	.login-qr {
		display: block;
		width: min(100%, 24rem);
		height: auto;
		margin: 0 auto;
	}

	footer {
		margin-top: var(--size-4);
	}

	button {
		padding: var(--size-2) var(--size-4);
		border: 1px solid var(--blue-9);
		border-radius: var(--radius-2);
		background: var(--blue-8);
		color: white;
		font: inherit;
		font-weight: var(--font-weight-6);
		cursor: pointer;
	}

	button:hover {
		background: var(--blue-9);
	}

	dialog {
		box-sizing: border-box;
		width: min(calc(100% - var(--size-6)), 34rem);
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

	dialog > form {
		margin-top: var(--size-4);
	}

	.form-error {
		color: var(--red-8);
	}

	@media (max-width: 35rem) {
		.copy-row {
			grid-template-columns: 1fr;
		}
	}
</style>
