<script>
	import 'open-props/style'

	import { makeTagFunctionMd } from '$lib/tag-functions/markdown.js'
	import attr from 'markdown-it-attrs'
	import centerText from 'markdown-it-center-text'
	import deflist from 'markdown-it-deflist'

	const md = makeTagFunctionMd({ html: true, linkify: true, typographer: true, breaks: true }, [
		[attr],
		[deflist],
		[centerText],
	])
</script>

<!-- eslint-disable svelte/no-at-html-tags -- developer-authored markdown, not user input -->
<scope-css>
	{@html md`
		# ->How to contact John<-

		Email
		~ john@leftium.com

		Phone
		~ Upon request...

		Mail
		~ Upon request...

		## ->If viewing on your phone:<-

		->[Load digital business card (vCard)](/api/vcard){role=button download}<-

		## -></scope-css>Or scan this QR code:<-

		->![](/api/vcard?format=svg)<-
	`}
</scope-css>

<style>
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

			/* Render definition lists as simple table: */
			dl {
				display: grid;
				grid-template-columns: max-content 1fr;
				max-width: 100%;
				width: fit-content;
				margin-block: var(--size-2);
				margin-inline: auto;
				padding: 0;
				padding-inline: var(--size-3);

				dt,
				dd {
					margin: 0;
					padding: var(--size-2) 0;
				}

				dt {
					font-weight: var(--font-weight-7);
					text-align: right;
					align-self: start;
					padding-right: var(--size-3);
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
