<script lang="ts">
	import '$lib/resume.scss'
	import markdownit from 'markdown-it'
	import markdownitDeflist from 'markdown-it-deflist'
	import { LeftiumLogo } from '@leftium/leftium-logo'

	import resume from './resume.md?raw'
	import { dev } from '$app/environment'

	const md = markdownit({
		linkify: true,
	}).use(markdownitDeflist)

	// Preprocess resume to remove the image line
	const resumeLines = resume.split('\n')
	const processedResume = resumeLines.slice(1).join('\n') // Remove first line (image)
	const resumeHtml = md.render(processedResume)
</script>

<main class="resume">
	<LeftiumLogo
		class="logo"
		animated={!dev}
		boundingBox="square"
		size="7rem"
		style="margin: 1rem; margin-left: 1.5rem;"
	/>
	{@html resumeHtml}
</main>

<style lang="scss">
	@use 'open-props-scss' as *;

	main.resume {
		max-width: 63ch;
		margin: 0 auto;
	}
</style>
