<script>
	import { dev } from '$app/environment'
	import { undent } from '$lib/tag-functions/undent.js'
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
        # John-Kim's Portfolio

        ### Coming soon, for select projects:

        - Screenshots
        - Source code
        - Quick descriptions
        - Detailed explanations
        - "Behind-the-scenes" dev stories

        _In the meantime..._

        ## Try using some of my projects:

        - https://weather-sense.leftium.com [(repo)](https://github.com/Leftium/weather-sense)
        - https://hw.leftium.com [(repo)](https://github.com/Leftium/hckrweb)
        - https://vivibl.com [(repo)](https://github.com/Leftium/modu-blues.com)
        - https://multi-launch.leftium.com [(repo)](https://github.com/Leftium/multi-launch)
        - https://zbang.leftium.com [(repo)](https://github.com/Leftium/zbang)

        ## Browse my activity on other sites:

        - [Github](https://github.com/Leftium)
        - [StackOverflow](https://stackoverflow.com/users/117030/leftium)
        - [Hacker News](https://news.ycombinator.com/threads?id=Leftium)
        - [Reddit](https://www.reddit.com/user/Leftium)

        ## Read older articles I've written on my blog:

        - https://blog.leftium.com



    `)
</script>

<scope-css>{@html html}</scope-css>

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
