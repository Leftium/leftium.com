<script>
	import 'open-props/style'

	import { dev } from '$app/environment'
	import { makeTagFunctionMd } from '$lib/tag-functions/markdown.js'
	import attr from 'markdown-it-attrs'
	import centerText from 'markdown-it-center-text'
	import deflist from 'markdown-it-deflist'

	let { data } = $props()

	const md = makeTagFunctionMd({ html: true, linkify: true, typographer: true, breaks: true }, [
		[attr],
		[deflist],
		[centerText],
	])
</script>

<scope-css>
	{@html md`
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
	`}
</scope-css>

<pre hidden={!dev}>{JSON.stringify(data.contactInfo, null, 4)}</pre>

<style lang="css">
	scope-css {
		display: block;
		max-width: var(--size-content-3);
		margin: auto;

		:global(.full) {
			width: 100%;
		}

		:global(.text-align-center) {
			text-align: center;
		}
	}
</style>
