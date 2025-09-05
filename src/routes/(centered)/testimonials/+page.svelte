<script>
	import 'open-props/style'

	import { makeTagFunctionMd } from '$lib/tag-functions/markdown.js'
	import attr from 'markdown-it-attrs'
	import centerText from 'markdown-it-center-text'
	import deflist from 'markdown-it-deflist'

	const md = makeTagFunctionMd({ html: true, linkify: true, typographer: true, breaks: false }, [
		[attr],
		[deflist],
		[centerText],
	])
</script>

<scope-css>
	{@html md`
		# An Unprompted Testimonial

		->From [William Albright](https://github.com/ewilliam), a fellow software developer<-
		-> _(slightly edited, for readability)_ <-

		> **I was burned out.** React and JSX were kicking my ass, and I
		> questioned whether web development was for me. My mental
		> model kept me stuck in the backend; I couldn't replicate the
		> frontends I admired on the web.
		>
		> [Before working with John,] I had a sprawling schema with
		> separate tables and columns for every individual rubric item—a
		> big, slow mess. **Then John [simplified everything by]
		> storing the entire rubric in JSON.** It never occurred to me
		> that complex UI could be unlocked by the right data
		> structures.
		>
		> John's implementation of the “functional core, imperative
		> shell” pattern is another thing that stuck with me—code
		> that’s testable and modular, separate from the UI. **John read
		> an article and then put it into practice. That inspired me
		> to read more technical material.**
		>
		> And John's logging strategies? **Quality of life improvements
		> that punch above weight.**
		>
		> All of that helped shift my perspective on frontend
		> development. I used to think frontend was less serious than
		> backend. Now I think frontend is more fun, engaging, and
		> beautiful.
		>
		> And finally—John's lack of ego, his willingness to
		> collaborate with my team regardless of skill level—it
		> humbled me. Killed off whatever diva energy I had left. **I’ve
		> become a better builder because of John!**
	`}
</scope-css>

<style>
	scope-css {
		display: block;
		margin: auto;

		max-width: var(--size-content-2);
	}

	:global {
		h1 {
			margin-bottom: 0;
		}
	}

	:global(.text-align-center) {
		text-align: center;
	}
</style>
