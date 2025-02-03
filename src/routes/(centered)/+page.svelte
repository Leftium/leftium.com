<script>
	import { undent } from '$lib/undent'
	import markdownit from 'markdown-it'

	const html = markdownit({
		linkify: true,
	}).render(undent`
        # John's Site
        - [Resume](/resume)

        ## vCard

        <a href="/api/vcard" download><button>Download vCard as VCF file</button></a>

        ### QR Code:

        ![](/api/vcard?format=png)
    `)
</script>

<article>
	{@html html}
</article>
