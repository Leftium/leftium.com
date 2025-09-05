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
		# ->How to contact John<-

		Email
		~ john@leftium.com

		Phone
		~ Upon request...

		Postal Address
		~ Upon request...

		## ->If viewing on your phone:<-

		->[Load digital business card (vCard)](/api/vcard){role=button download}<-

		## -></scope-css>Or scan this QR code:<-

		->![](/api/vcard?format=png)<-
	`}
</scope-css>

<pre hidden={!dev}>{JSON.stringify(data.contactInfo, null, 4)}</pre>

<style lang="scss">
	@use 'open-props-scss' as *;

	scope-css {
		display: block;
		max-width: var(--size-content-2);
		margin: auto;

		:global {
			.full {
				width: 100%;
			}

			.text-align-center {
				text-align: center;
			}

			// Render definition lists as simple table:
			dl {
				display: grid;
				grid-template-columns: max-content 1fr;
				max-width: 100%;
				width: fit-content;
				margin-block: $size-2;
				margin-inline: auto;
				padding: 0;
				padding-inline: $size-3;

				dt,
				dd {
					margin: 0;
					padding: $size-2 0;
				}

				dt {
					font-weight: $font-weight-7;
					text-align: right;
					align-self: start;
					padding-right: $size-3;
				}

				dt:first-of-type,
				dt:first-of-type + dd {
					border-top: none;
				}

				dd {
					grid-column: 2;
				}

				dt,
				dt + dd {
					border-top: 1px solid #dcdcdc;
				}
			}
		}
	}
</style>
