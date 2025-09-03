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

<scope-css>
	{@html md`
		# An Unprompted Testimonial

		From [William Albright](https://github.com/ewilliam), a fellow software developer
		_(Minor edits for readability)_

		> **I was burned out. React and JSX were kicking my ass, and I questioned whether\
		web development was for me.** I loved working across the full stack, but my\
		mental model kept me stuck in the backend—writing business logic, structuring\
		databases—while awkwardly hacking together frontend features. It worked, but I\
		never felt like I could replicate the frontends I admired on the web.
		>
		> Remember the first version of VEE? I had a sprawling schema with separate tables\
		and columns for every individual rubric item—a big, slow mess. I thought I\
		was clever using JSON columns to handle unstructured annotations. **But then John\
		took it further: storing not just annotations, but entire rubric definitions in\
		JSON.** It never occurred to me that complex UI could be unlocked by the right\
		data structures. I thought that was “backend stuff.”
		>
		> John's implementation of the “functional core, imperative shell” pattern is\
		another thing that stuck with me—code that’s testable and modular, separate\
		from the UI. **John read an article and then put it into practice. That inspired\
		me to read more technical material.** And John's logging strategies? Quality of\
		life improvements that punch above weight.
		>
		> All of that helped shift my perspective on frontend development. I used to buy\
		into the idea that frontend was somehow less serious than backend. Now I think\
		frontend is more fun, engaging, and beautiful. That shift came at the right\
		time, with the rise of powerful backend services enabling laser focus on the\
		user experience.
		>
		> And finally—John's lack of ego, his willingness to collaborate with my team\
		regardless of skill level—it humbled me. Killed off whatever diva energy I\
		had left. **I’ve become a better builder because of John!**
	`}
</scope-css>

<style>
	scope-css {
		display: block;
		margin: auto;

		max-width: var(--size-content-2);
	}
</style>
