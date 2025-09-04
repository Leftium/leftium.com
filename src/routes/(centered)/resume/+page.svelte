<script lang="ts">
	import 'open-props/style'
	import '$lib/resume.scss'

	import markdownit from 'markdown-it'
	import markdownitDeflist from 'markdown-it-deflist'
	import { LeftiumLogo } from '@leftium/leftium-logo'

	import resume from './resume.md?raw'
	import { dev } from '$app/environment'
	const md = markdownit({
		linkify: true,
	}).use(markdownitDeflist)

	// Preprocess resume - always remove the image line since we handle logo in Svelte
	let resumeProcessed = resume.replace('John Kim', 'John&nbsp;Kim')
	const resumeLines = resumeProcessed.split('\n')
	resumeProcessed = resumeLines.slice(1).join('\n') // Remove first line (image)
	const resumeHtml = md.render(resumeProcessed)
</script>

<accent-box class="screen-only">
	<a href="/">Return Home</a><a href="/John-Kim-Murphy-Resume.pdf" target="_blank">Download PDF</a>
</accent-box>

<main class="resume">
	<LeftiumLogo class="logo screen-only" animated={!dev} boundingBox="cropped" size="8.5rem" />
	<img class="logo print-only" src="/le.svg" alt="Logo" />

	{@html resumeHtml}
</main>

<style lang="scss">
	@use 'open-props-scss' as *;

	accent-box {
		display: flex;
		flex-wrap: wrap;

		margin: auto;

		justify-content: center;

		gap: var(--size-3);
		padding: var(--size-1);
		border: 1px solid var(--pico-muted-border-color);
		margin-bottom: var(--size-3);

		max-width: var(--size-content-3);
	}

	main.resume {
		max-width: 54ch;
		margin: 0 auto;
	}

	/* Hide print version on screen */
	.print-only {
		display: none;
	}

	/* Show appropriate logo version when printing */
	@media print {
		:global(.screen-only) {
			display: none !important;
		}

		.print-only {
			display: block;
		}
	}
</style>
