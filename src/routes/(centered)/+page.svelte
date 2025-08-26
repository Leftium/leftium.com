<script>
	import { makeTagFunctionMd } from '$lib/tag-functions/markdown'
	import attr from 'markdown-it-attrs'
	import centerText from 'markdown-it-center-text'

	const md = makeTagFunctionMd({ html: true, linkify: true, typographer: true, breaks: true }, [
		[attr],
		[centerText],
	])
</script>

<scope-css>
	{@html md`
		# John's Site

		[View John's resume](/resume){role=button} [Download PDF](/John-Kim-Murphy-Resume.pdf){role=button .outline} {.resume role=group}

		[Browse John's work](/portfolio){role=button .full}

		[Learn how to work with John (coming soon...)](/#){role=button .full disabled}

		->[Contact Info](/contact)<-
	`}
</scope-css>

<style>
	scope-css {
		:global(h1) {
			text-align: center;
		}

		:global(p.resume) {
			display: grid;
			grid-template-columns: 1fr auto;
		}

		:global(.full) {
			width: 100%;
		}

		:global(.text-align-center) {
			text-align: center;
		}
	}
</style>
