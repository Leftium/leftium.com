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

	// Preprocess resume 
	let resumeProcessed = resume.replace('John Kim', 'John&nbsp;Kim')

	// Remove the image line
	const resumeLines = resumeProcessed.split('\n')
	resumeProcessed = resumeLines.slice(1).join('\n') // Remove first line (image)
	const resumeHtml = md.render(resumeProcessed)
</script>

<main class="resume">
	<LeftiumLogo class="logo" animated={!dev} boundingBox="default" size="8.5rem"/>
	{@html resumeHtml}
</main>

<style lang="scss">
	@use 'open-props-scss' as *;

	main.resume {
		max-width: 54ch;
		margin: 0 auto;
	}
</style>
