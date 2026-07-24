<script>
	import 'open-props/style'

	import { resolve } from '$app/paths'
	import { makeTagFunctionMd } from '$lib/tag-functions/markdown'
	import attr from 'markdown-it-attrs'

	const md = makeTagFunctionMd({ html: true, linkify: true, typographer: true, breaks: false }, [
		[attr],
	])
</script>

<!-- eslint-disable svelte/no-at-html-tags -- developer-authored markdown, not user input -->
<scope-css>
	<section class="consulting-intro">
		<h1>Stuck? Working on something important?</h1>
		<p>
			Some problems don't fit neatly into people, products, or technology. I'm a full-stack
			SvelteKit developer who obsesses over UX and finds unconventional solutions. I work across
			boundaries to find what is blocking the outcome and build a way forward.
		</p>
		<h2 class="consulting-action">
			<a href={resolve('/digital-consulting')} role="button" class="outline">
				See what I can do for you
			</a>
		</h2>
		<hr />
	</section>

	<div class="testimonial-container">
		<a
			href="https://github.com/braden-w"
			class="testimonial-attribution"
			target="_blank"
			rel="noreferrer"
		>
			{@html md`
				![](/braden-w.jpg){.testimonial-photo}
			`}
			<div>
				{@html md`
					Braden Wong{.testimonial-name}

					Founder, Epicenter (YC S25){.testimonial-title}
				`}
			</div>
		</a>

		{@html md`
			> John has been one of the most positive and independent forces I've had the
			> pleasure of working with as an OSS developer.
			>
			> What has impressed me most about John is his ability to be **both highly
			> independent and an exceptional team player.**
			>
			> I have yet to encounter another open source developer who demonstrates
			> John's level of initiative...
		`}
	</div>

	<div class="testimonial-container">
		<a
			href="https://github.com/ewilliam"
			class="testimonial-attribution"
			target="_blank"
			rel="noreferrer"
		>
			{@html md`
				![](/william.jpg){.testimonial-photo}
			`}
			<div>
				{@html md`
					William Albright{.testimonial-name}

					software developer{.testimonial-title}
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

	<p class="testimonial-action">
		<a href={resolve('/testimonials')} role="button" class="outline">Read the full testimonials</a>
	</p>
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

		.testimonial-action {
			text-align: center;
		}

		:global([role='button']) {
			border-radius: 2rem;
		}

		.consulting-action {
			margin-block: var(--size-6);
		}
	}
</style>
