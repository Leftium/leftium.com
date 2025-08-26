<script>
	import { undent } from '$lib/tag-functions/undent'
	import markdownit from 'markdown-it'
	import attr from 'markdown-it-attrs'
	import centerText from 'markdown-it-center-text'

	const html = markdownit({
		linkify: true,
	})
		.use(attr)
		.use(centerText).render(undent`
        # John's Site

        [View John's resume](/resume){role=button} [Download PDF](/John-Kim-Murphy-Resume.pdf){role=button .outline} {.resume role=group}

        [Browse John's work](/portfolio){role=button .full}

        [Learn how to work with John (coming soon...)](/#){role=button .full disabled}

        ->[Contact Info](/contact)<-
    `)
</script>

<scope-css>{@html html}</scope-css>

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
