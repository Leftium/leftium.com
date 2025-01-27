<script lang="ts">
	import '$lib/resume.scss';
    import markdownit from 'markdown-it'
    import markdownitDeflist from 'markdown-it-deflist'

	import resume from './resume.md?raw';

    const md = markdownit().use(markdownitDeflist)
    const resumeHtml = md.render(resume)
</script>

<main class="resume">
	{@html resumeHtml}
</main>

<style lang="scss">
	@use 'open-props-scss' as *;

	main.resume {
		max-width: 750px;
		margin: 0 auto;
		padding: 0 $size-7;
	}
</style>
