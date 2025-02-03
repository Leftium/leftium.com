<script>
	import { undent } from '$lib/undent'
	import markdownit from 'markdown-it'
	import attr from 'markdown-it-attrs'

	const html = markdownit({
		linkify: true,
	}).use(attr).render(undent`
        # John's Site

        [View John's resume](/resume){role=button .full}

        [Contact Info](/contact)
    `)
</script>

<scope-css>{@html html}</scope-css>

<style>
	scope-css {
		:global(h1) {
			text-align: center;
		}

		:global(.full) {
			width: 100%;
		}
	}
</style>
