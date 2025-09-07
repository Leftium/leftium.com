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

		->[Learn more...](/digital-consulting){role=button .outline}<-

		---
	`}

	<div class="testimonial-container">
		<a href="https://github.com/ewilliam" class="william-attribution" target="_blank">
			{@html md`
				![](/william.jpg){.william-photo}
			`}
			<div>
				{@html md`
					William Albright{.william-name}

					software developer{.william-title}
				`}
			</div>
		</a>

		{@html md`
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
			> **I've become a better builder because of John!**
		`}
	</div>

	{@html md`
		->[Read full testimonial...](/testimonials){role=button .outline}<-
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
			margin-bottom: var(--size-1);
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

		:global([role='button']) {
			border-radius: 2rem;
		}
	}
</style>
