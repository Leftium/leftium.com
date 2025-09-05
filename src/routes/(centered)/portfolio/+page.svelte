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
		# John-Kim's Portfolio

		### Coming soon, for select projects:

		- Screenshots
		- Source code
		- Quick descriptions
		- Detailed explanations
		- "Behind-the-scenes" dev stories

		_In the meantime..._

		## Try using some of my projects:

		weather-sense.leftium.com
		~ [source code](https://github.com/Leftium/weather-sense)

		hw.leftium.com
		~ [source code](https://github.com/Leftium/hckrweb)

		vivibl.com
		~ [source code](https://github.com/Leftium/modu-blues.com)

		multi-launch.leftium.com
		~ [source code](https://github.com/Leftium/multi-launch)

		zbang.leftium.com
		~ [source code](https://github.com/Leftium/zbang)

		## Browse my activity on other sites:

		- [Github](https://github.com/Leftium)
		- [StackOverflow](https://stackoverflow.com/users/117030/leftium)
		- [Hacker News](https://news.ycombinator.com/threads?id=Leftium)
		- [Reddit](https://www.reddit.com/user/Leftium)

		## Read older articles I've written on my blog:

		- blog.leftium.com
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
