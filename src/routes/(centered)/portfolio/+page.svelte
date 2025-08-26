<script>
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

		- weather-sense.leftium.com (view the [source code](https://github.com/Leftium/weather-sense))
		- hw.leftium.com (view the [source code](https://github.com/Leftium/hckrweb))
		- vivibl.com (view the [source code](https://github.com/Leftium/modu-blues.com))
		- multi-launch.leftium.com (view the [source code](https://github.com/Leftium/multi-launch))
		- zbang.leftium.com (view the [source code](https://github.com/Leftium/zbang))

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
