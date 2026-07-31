<script lang="ts">
	import 'open-props/style'

	import { resolve } from '$app/paths'

	import type { PageProps } from './$types'

	let { data }: PageProps = $props()
</script>

<svelte:head>
	<title>Contact {data.contact.displayName}</title>
</svelte:head>

<main class="contact">
	<h1>How to contact {data.contact.displayName.split(' ')[0]}</h1>

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

	{#if data.contact.requestMethods.length > 0}
		<p class="request-note">
			More contact details are available upon request:
			{data.contact.requestMethods.map(({ label }) => label).join(', ')}.
		</p>
	{/if}

	<section aria-labelledby="contact-card-heading">
		<h2 id="contact-card-heading">Digital business card</h2>
		<a class="button" href={resolve('/api/vcard')} data-sveltekit-reload download>Download vCard</a>

		<h2>Or scan this QR code</h2>
		<img
			src={resolve('/api/vcard?format=svg')}
			alt={`QR code containing ${data.contact.displayName}'s public contact details`}
		/>
	</section>

	<footer>
		<a class="admin-link" href={resolve('/contact/admin')}>Admin</a>
	</footer>
</main>

<style>
	.contact {
		max-width: var(--size-content-2);
		margin: auto;
		text-align: center;
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

	.request-note {
		max-width: var(--size-content-1);
		margin-inline: auto;
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

	footer {
		margin-top: var(--size-8);
	}

	.admin-link {
		color: var(--gray-6);
		font-size: var(--font-size-0);
	}
</style>
