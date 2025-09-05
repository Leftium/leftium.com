<script>
	import 'open-props/style'

	import { makeTagFunctionMd } from '$lib/tag-functions/markdown'
	import attr from 'markdown-it-attrs'
	import centerText from 'markdown-it-center-text'

	const md = makeTagFunctionMd({ html: true, linkify: true, typographer: true, breaks: false }, [
		[attr],
		[centerText],
	])
</script>

<scope-css>
	{@html md`
		# Need a digital consultant?

		- A _consultant_ helps you get from point A to point B.
		- A _digital_ consultant has expertise in computers/tech.

		[Learn more...](/digital-consulting){role=button .outline .full}

		---

		# A heart-felt testimonial

		->From [William Albright](https://github.com/ewilliam),<br>
		a fellow software developer:<-

		> **I was burned out.** React and JSX were kicking my ass, and I
		> questioned whether web development was for me...
		>
		> Then John [showed] me that complex UI could be unlocked by the right data structures...
		> [He] inspired me to read more technical material...
		> **[He] helped shift my perspective on frontend development...**
		>
		> And finally—John's lack of ego, his willingness to
		> collaborate with my team regardless of skill level—it
		> humbled me...
		> **I’ve become a better builder because of John!**

		->Read the [full testimonial](/testimonials)!<-
	`}
</scope-css>

<style lang="css">
	scope-css {
		display: block;
		max-width: var(--size-content-2);

		margin: auto;

		:global(h1),
		:global(h2) {
			margin-top: 0;
			text-align: center;
		}

		:global(p.resume) {
			display: grid;
			grid-template-columns: 1fr auto;
		}

		:global(.full) {
			width: 100%;
		}

		:global(.text-align-center) {
			text-align: center;
		}

		:global(blockquote) {
			background-color: var(--pico-card-sectioning-background-color);
			padding: var(--size-2) var(--size-3);
			-border-radius: var(--radius-2);
			-border-left: 4px solid var(--pico-primary);
			margin: var(--size-4) 0;

			:global(p:last-child) {
				margin-bottom: 0 !important;
			}
		}
	}
</style>
