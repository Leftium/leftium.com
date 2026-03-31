<script lang="ts">
	import 'open-props/style'
	import '$lib/resume.css'

	import markdownit from 'markdown-it'
	import markdownitDeflist from 'markdown-it-deflist'
	import { LeftiumLogo } from '@leftium/logo'
	import { page } from '$app/state'
	import { fly } from 'svelte/transition'
	import { dev } from '$app/environment'

	import resume from './resume.md?raw'
	const md = markdownit({
		linkify: true,
	}).use(markdownitDeflist)

	// Preprocess resume - always remove the image line since we handle logo in Svelte
	const resumeHtml = md.render(
		resume.replace('John Kim', 'John&nbsp;Kim').split('\n').slice(1).join('\n'),
	)

	// Reactive format based on URL params
	const format = $derived(page.url.searchParams.has('text') ? 'text' : 'html')
</script>

<!-- eslint-disable svelte/no-at-html-tags -- developer-authored markdown, not user input -->
<svelte:head>
	<title>John-Kim Murphy | Resume</title>
</svelte:head>

{#snippet buttonPill(
	variant = '',
	role = '',
	ariaLabel = '',
	dataActive = '',
	links: Array<{
		href: string
		target?: string
		active?: boolean
		ariaCurrent?: 'page'
		html: string
	}>,
)}
	<div class="switch-container {variant}" {role} aria-label={ariaLabel} data-active={dataActive}>
		<div class="switch-slider"></div>
		<!-- eslint-disable svelte/no-navigation-without-resolve -- dynamic href from snippet param -->
		{#each links as link (link.href)}
			<a
				href={link.href}
				target={link.target || undefined}
				class:active={link.active}
				aria-current={link.ariaCurrent}
			>
				{@html link.html}
			</a>
		{/each}
	</div>
{/snippet}

<accent-box class="screen-only">
	{@render buttonPill('format-toggle', 'group', 'Resume format selection', format, [
		{
			href: '/resume',
			active: format === 'html',
			ariaCurrent: format === 'html' ? 'page' : undefined,
			html: 'HTML',
		},
		{
			href: '/resume?text',
			active: format === 'text',
			ariaCurrent: format === 'text' ? 'page' : undefined,
			html: 'Text',
		},
	])}

	{@render buttonPill('pdf-button', 'group', 'Download PDF', '', [
		{
			href: '/John-Kim-Murphy-Resume.pdf',
			target: '_blank',
			active: true,
			html: 'PDF <span class="external-icon" aria-label="opens in new window">↗</span>',
		},
	])}
</accent-box>

<main class="resume">
	{#if format === 'html'}
		<div class="resume-container html" transition:fly={{ x: 77 }}>
			<LeftiumLogo
				class="logo screen-only"
				animated={!dev}
				boundingBox="square"
				size="6rem"
				squircle={true}
			/>
			<img class="logo print-only" src="/le.svg" alt="Logo" />

			{@html resumeHtml}
		</div>
	{:else}
		<div class="resume-container" transition:fly={{ x: -77 }}>
			<pre class="resume-text">{resume}</pre>
		</div>
	{/if}
</main>

<style>
	accent-box {
		display: flex;
		position: relative;
		align-items: center;
		justify-content: center;
		padding: var(--size-1);
		border: 1px solid var(--nc-surface-3);
		border-radius: 2rem;
		margin-bottom: var(--size-3);
		max-width: var(--size-content-3);
		width: 100%;
	}

	.switch-container {
		--switch-padding: 4px;
		--switch-height: 40px;
		--switch-radius: 2rem;
		--switch-max-width: 180px;
		--switch-min-width: 140px;

		position: relative;
		display: flex;
		justify-content: space-evenly;
		gap: 0;
		margin: 0;
		background: var(--nc-surface-3);
		border-radius: var(--switch-radius);
		padding: var(--switch-padding);
		transition: background-color 0.2s ease;
		max-width: var(--switch-max-width);
		height: var(--switch-height);
		min-width: var(--switch-min-width);
		overflow: hidden;

		/* Suppress nimble [role="group"] dividers and border-radius reset */
		:global(> * + *::before) {
			content: none !important;
		}
		:global(> *) {
			border-radius: inherit !important;
		}

		.switch-slider {
			position: absolute;
			background: var(--nc-primary);
			border-radius: inherit;
			width: calc(50% - 4px);
			height: calc(100% - 8px);
			top: 4px;
			left: 4px;
			transition: transform 0.3s ease;
			z-index: 1;
		}

		&[data-active='text'] .switch-slider {
			transform: translateX(100%);
		}

		a,
		a:visited {
			display: flex;
			align-items: center;
			justify-content: center;
			flex: 1;
			gap: var(--size-1);
			font-size: 0.9em;
			color: var(--nc-text);
			text-decoration: none;
			padding: var(--size-1) var(--size-2);
			border-radius: 1.5rem;
			transition: color 0.2s ease;
			position: relative;
			z-index: 2;
			background: transparent !important;

			&:hover {
				color: var(--nc-primary);
			}

			&.active {
				color: #fff;
				font-weight: 600;
			}
		}

		&.pdf-button {
			--switch-max-width: 80px;
			--switch-min-width: 80px;
			--switch-radius: 2rem;

			position: absolute;
			right: var(--size-1);
			top: var(--size-1);
			bottom: var(--size-1);
			background: transparent;
			border-radius: var(--switch-radius);

			.switch-slider {
				width: calc(100% - 8px);
			}
		}
	}

	@media (max-width: 480px) {
		accent-box {
			justify-content: flex-start;
			padding: var(--size-1);
		}
	}

	.resume-text {
		padding: var(--size-2) var(--size-4);
		white-space: pre-wrap;
		font-size: 0.9em;
		line-height: 1.4;
	}

	.resume {
		position: relative;
	}

	.resume-container {
		position: absolute;
		inset: 0;
		margin: 0 auto;
		max-width: min(56ch, 100%);

		&.html {
			font-family:
				Trebuchet MS,
				sans-serif;
			letter-spacing: 0.03em; /* small tracking increase */

			/* Pico set font-family on headings explicitly (system-ui, not inherited),
			   so headings rendered in SF Pro rather than Trebuchet MS. Match that. */
			:global(h1),
			:global(h2) {
				font-family: system-ui, sans-serif;
			}
		}
	}
</style>
