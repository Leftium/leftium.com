<script>
	import { undent } from '$lib/undent'
	import markdownit from 'markdown-it'
	import attr from 'markdown-it-attrs'
	import centerText from 'markdown-it-center-text'
	import deflist from 'markdown-it-deflist'

	let { data } = $props()

	const html = markdownit({
		html: true,
		linkify: true,
	})
		.use(attr)
		.use(deflist)
		.use(centerText).render(undent`
        # How to contact John

        E-mail
        ~ john@leftium.com

        Phone number
        ~ Upon request...

        Postal Address
        ~ Upon request...

        ---

        ## If viewing on your phone:

        [Load digital business card (vCard)](/api/vcard){role=button .full download}

        ## If viewing on PC scan this QR code:

        ->![](/api/vcard?format=png)<-

    `)
</script>

<scope-css>{@html html}</scope-css>

<pre>{JSON.stringify(data.contactInfo, null, 4)}</pre>

<style>
	scope-css {
		:global(.full) {
			width: 100%;
		}

		:global(.text-align-center) {
			text-align: center;
		}
	}
</style>
