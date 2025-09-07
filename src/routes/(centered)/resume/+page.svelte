<script lang="ts">
	import 'open-props/style'
	import '$lib/resume.scss'

	import markdownit from 'markdown-it'
	import markdownitDeflist from 'markdown-it-deflist'
	import { LeftiumLogo } from '@leftium/logo'
	import { page } from '$app/state'
	import { fade } from 'svelte/transition'
	import { dev } from '$app/environment'

	import resume from './resume.md?raw'
	const md = markdownit({
		linkify: true,
	}).use(markdownitDeflist)

	// Preprocess resume - always remove the image line since we handle logo in Svelte
	let resumeProcessed = resume.replace('John Kim', 'John&nbsp;Kim')
	const resumeLines = resumeProcessed.split('\n')
	resumeProcessed = resumeLines.slice(1).join('\n') // Remove first line (image)
	const resumeHtml = md.render(resumeProcessed)

	// Reactive format based on URL params
	const format = $derived(page.url.searchParams.has('text') ? 'text' : 'html')
</script>

<accent-box class="screen-only">
	<div
		class="format-toggle switch-container"
		role="group"
		aria-label="Resume format selection"
		data-active={format}
	>
		<div class="switch-slider"></div>
		<a
			href="/resume"
			class:active={format === 'html'}
			aria-current={format === 'html' ? 'page' : undefined}
		>
			HTML
		</a>
		<a
			href="/resume?text"
			class:active={format === 'text'}
			aria-current={format === 'text' ? 'page' : undefined}
		>
			Text
		</a>
	</div>

	<div class="pdf-button switch-container" role="group" aria-label="Download PDF">
		<div class="switch-slider"></div>
		<a href="/John-Kim-Murphy-Resume.pdf" target="_blank" class="active">
			PDF <span class="external-icon" aria-label="opens in new window">↗</span>
		</a>
	</div>
</accent-box>

<main class="resume container">
	{#if format === 'html'}
		<div class="resume-container html" transition:fade={{ duration: 200 }}>
			<LeftiumLogo class="logo screen-only" animated={!dev} boundingBox="square" size="6rem" />
			<img class="logo print-only" src="/le.svg" alt="Logo" />

			{@html resumeHtml}
		</div>
	{:else}
		<div class="resume-container" transition:fade={{ duration: 200 }}>
			<pre class="resume-text">{resume}</pre>
		</div>
	{/if}
</main>

<style lang="scss">
	@use 'open-props-scss' as *;

	accent-box {
		display: flex;
		flex-wrap: nowrap;
		position: relative;
		align-items: center;
		justify-content: center;
		padding-block: var(--size-1);
		border: 1px solid var(--pico-muted-border-color);
		margin-bottom: var(--size-3);

		max-width: var(--size-content-3);
		width: 100%;
	}

	.switch-container {
		position: relative;
		display: flex;
		justify-content: space-evenly;
		background: var(--pico-muted-border-color);
		border-radius: 2rem;
		padding: 4px;
		transition: background-color 0.2s ease;
		max-width: 160px;
		height: 40px;
		min-width: 120px;

		.switch-slider {
			position: absolute;
			inset: 4px;
			width: 50%;
			background: var(--pico-primary);
			border-radius: inherit;
			transition: transform 0.3s ease;
			z-index: 1;
		}

		&[data-active='text'] .switch-slider {
			transform: translateX(100%);
		}

		a {
			display: flex;
			align-items: center;
			justify-content: center;
			flex: 1;
			gap: var(--size-1);
			font-size: 0.9em;
			text-decoration: none;
			padding: var(--size-1) var(--size-2);
			border-radius: 1.5rem;
			transition: color 0.2s ease;
			position: relative;
			z-index: 2;
			background: transparent !important;

			&:hover {
				color: var(--pico-primary);
			}

			&.active {
				color: var(--pico-primary-inverse);
				font-weight: 600;
			}
		}

		&.pdf-button {
			position: absolute;
			right: var(--size-3);
			top: 50%;
			transform: translateY(-50%);
			max-width: 80px;
			min-width: 80px;
			background: transparent;

			.switch-slider {
				width: calc(100% - 8px);
			}

			.external-icon {
				font-size: 0.8em;
				margin-left: 0.25em;
				opacity: 0.9;
			}
		}
	}

	.resume-text {
		padding: var(--size-2) var(--size-4);
		white-space: pre-wrap;
		font-size: 0.9em;
		line-height: 1.4;
	}

	.container {
		position: relative;
	}

	.resume-container {
		position: absolute;
		inset: 0;
		margin: 0 auto;
		max-width: min(53ch, 100%);

		&.html {
			padding-inline: 4ch;
		}
	}
</style>
