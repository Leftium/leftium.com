<script>
	import { undent } from '$lib/undent'
	import markdownit from 'markdown-it'
	import attr from 'markdown-it-attrs'

	const html = markdownit({
		linkify: true,
	}).use(attr).render(undent`
        # John's Site
        [View John's Resume](/resume){role=button .full}

        ## vCard

        [Download vCard as VCF file](/api/vcard){role=button .full download}

        ### QR Code:

        ![](/api/vcard?format=png)
    `)
</script>

<scope-css>{@html html}</scope-css>

<style>
	scope-css :global(.full) {
		width: 100%;
	}
</style>
