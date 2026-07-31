<script lang="ts">
	import { enhance } from '$app/forms'
	import { replaceState } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { page } from '$app/state'
	import { onMount, tick } from 'svelte'

	import AdminContactControls from './AdminContactControls.svelte'

	import type { PageProps } from './$types'

	let { data, form }: PageProps = $props()

	let claimForm = $state<HTMLFormElement>()
	let claimToken = $state('')
	let copyStatus = $state('')
	let loginLinkInput = $state<HTMLInputElement>()

	onMount(() => {
		const timeout = window.setTimeout(() => void claimBootstrapLink())
		return () => window.clearTimeout(timeout)
	})

	async function claimBootstrapLink() {
		if (location.hash === '#signed-in') {
			clearBootstrapFragment()
			return
		}

		const fragment = new URLSearchParams(location.hash.slice(1))
		const token = fragment.get('login')
		if (!token) return

		clearBootstrapFragment()
		claimToken = token
		await tick()
		claimForm?.requestSubmit()
	}

	function clearBootstrapFragment() {
		try {
			replaceState(resolve('/contact/admin'), page.state ?? {})
		} catch {
			// A fresh page can mount before SvelteKit's router is ready. The claim redirect also clears it.
		}
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
	<title>Contact admin - {data.contact.displayName}</title>
</svelte:head>

<main class="admin">
	<form class="bootstrap-claim" method="POST" action="?/claim" bind:this={claimForm}>
		<input type="hidden" name="token" value={claimToken} />
	</form>

	<a class="back-link" href={resolve('/contact')}>Back to public contact page</a>

	{#if data.contact.mode !== 'admin'}
		<h1>Contact admin</h1>
	{/if}

	{#if data.contact.mode === 'admin'}
		<form class="admin-logout" method="POST" action="?/logout" use:enhance>
			<button type="submit">Log out of admin mode</button>
		</form>

		<AdminContactControls contact={data.contact} {form} />

		<section class="mobile-login" aria-labelledby="mobile-login-heading">
			<h2 id="mobile-login-heading">Sign in on another device</h2>
			<p>Create a short-lived link or QR code without exposing your permanent access key.</p>
			<form method="POST" action="?/createLoginLink" use:enhance>
				<button type="submit">Create mobile login</button>
			</form>

			{#if form?.action === 'createLoginLink' && 'loginLink' in form}
				<div class="generated-login">
					<label for="mobile-login-link"
						>Mobile login link, valid for {form.expiresInMinutes} minutes</label
					>
					<div class="copy-row">
						<input
							id="mobile-login-link"
							type="text"
							readonly
							value={form.loginLink}
							bind:this={loginLinkInput}
							onfocus={(event) => event.currentTarget.select()}
						/>
						<button type="button" onclick={() => copyLoginLink(form.loginLink)}> Copy link </button>
					</div>
					{#if copyStatus}<p class="copy-status" aria-live="polite">{copyStatus}</p>{/if}
					<img
						class="login-qr"
						src={form.loginQrDataUrl}
						alt="QR code for a short-lived admin login"
					/>
				</div>
			{:else if form?.action === 'createLoginLink' && 'unauthorized' in form}
				<p class="form-error">Your admin session is no longer valid. Log in again.</p>
			{/if}
		</section>
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
</main>

<style>
	.admin {
		margin: auto;
		text-align: center;
	}

	.bootstrap-claim {
		display: none;
	}

	.back-link {
		display: block;
		width: fit-content;
		margin-bottom: var(--size-4);
		color: var(--gray-7);
		font-size: var(--font-size-0);
	}

	.admin-logout {
		margin: var(--size-3) auto var(--size-4);
	}

	.admin-logout button {
		padding: var(--size-1) var(--size-3);
		font-size: var(--font-size-0);
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

	.mobile-login {
		margin-top: var(--size-7);
		padding-top: var(--size-5);
		border-top: 1px solid var(--gray-4);
	}

	.generated-login {
		display: grid;
		gap: var(--size-3);
		margin-top: var(--size-4);
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

	.login-qr {
		display: block;
		width: min(100%, 24rem);
		height: auto;
		margin: 0 auto;
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

	.form-error {
		color: var(--red-8);
	}

	@media (max-width: 35rem) {
		.copy-row {
			grid-template-columns: 1fr;
		}
	}
</style>
