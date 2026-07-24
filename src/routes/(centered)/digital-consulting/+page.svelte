<script lang="ts">
	import 'open-props/style'
	import { resolve } from '$app/paths'
</script>

<svelte:head>
	<title>Digital Consulting | Leftium</title>
	<meta
		name="description"
		content="Digital consulting for problems that need a closer look, a wider view, or a longer horizon."
	/>
</svelte:head>

<div class="consulting">
	<header class="hero">
		<p class="eyebrow">Stuck? Meet your new secret weapon.</p>
		<h1>A Different Kind of Digital Consultant</h1>
		<p class="promise">Getting you from where you are to where you want to be.</p>

		<ul class="perspectives">
			<li>
				<strong>Look closer</strong>
				<span>I notice friction and human needs others overlook.</span>
			</li>
			<li>
				<strong>Look wider</strong>
				<span>I connect ideas from domains that rarely meet.</span>
			</li>
			<li>
				<strong>Look further</strong>
				<span>I see what will feel obvious later.</span>
			</li>
		</ul>
	</header>

	<section aria-labelledby="situations-heading">
		<h2 id="situations-heading">When digital consulting helps</h2>
		<ul>
			<li>You know where you want to go, but not how to get there.</li>
			<li>The obvious solutions have not worked.</li>
			<li>The problem crosses people, products, and technology.</li>
			<li>You need someone who can investigate the problem and build the solution.</li>
		</ul>
	</section>

	<section aria-labelledby="superpowers-heading">
		<h2 id="superpowers-heading">My superpowers</h2>

		<ul class="superpowers">
			<li>
				<strong>A dogged dedication to UX keeps me looking where most people stop.</strong>
				The product is only the obvious place to start. I get unusually close to users. "About Us" pages,
				<a href="https://www.wsj.com/articles/BL-ATWORKB-2287" target="_blank" rel="noreferrer"
					>job listings</a
				>, and even
				<a
					href="https://learn.microsoft.com/en-us/archive/blogs/cdnstudents/how-to-deliver-a-successful-persuasive-pitch"
					target="_blank"
					rel="noreferrer">presentations</a
				>
				all shape what a human experiences and does next. That wider lens exposes opportunities that slip
				between conventional roles.
			</li>
			<li>
				<strong>I remix ideas that rarely meet.</strong>
				<p>
					I start with the human need, adapt useful patterns from other domains, and invent the
					missing pieces.
				</p>
			</li>
		</ul>
	</section>

	<section aria-labelledby="work-heading">
		<h2 id="work-heading">Selected work</h2>

		<ul class="project-list">
			<li>
				<strong
					><a href="https://veneer.leftium.com" target="_blank" rel="noreferrer">Veneer</a></strong
				>
				<p>
					A thin layer over Google Forms and Sheets that lets nontechnical people publish and update
					polished mini-sites from their phones. I've operated and improved it continuously for the
					people behind sites like <a href="https://vivimil.com" target="_blank" rel="noreferrer"
						>vivimil.com</a
					>
					since 2022.
				</p>
			</li>
			<li>
				<strong
					><a href="https://rift-transcription.vercel.app" target="_blank" rel="noreferrer">RIFT</a
					></strong
				>
				<p>
					A fluid transcription UX where users can speak, click, type, and edit in the same text
					area while transcription continues. Its Svelte component mirrors the core
					<code>&lt;textarea&gt;</code> API and treats voice like IME composition.
					<a href="https://github.com/Leftium/rift-local" target="_blank" rel="noreferrer"
						><code>rift-local</code></a
					>
					is a Python WebSocket server for private, local inference across multiple backends.
				</p>
			</li>
			<li>
				<strong
					><a href="https://github.com/Leftium/gg" target="_blank" rel="noreferrer"
						><code>gg</code></a
					></strong
				>
				<p>
					What began as a better <code>console.log()</code> for humans now lets coding agents query browser
					logs directly instead of waiting for me to copy-paste debugging context.
				</p>
			</li>
		</ul>

		<p class="centered-action">
			<a href={resolve('/portfolio')} role="button" class="outline">See more work</a>
		</p>
	</section>

	<section aria-labelledby="testimonial-heading">
		<h2 id="testimonial-heading">What it's like to work with me</h2>

		<blockquote>
			<p>
				"I have yet to encounter another open source developer who demonstrates John's level of
				initiative."
			</p>
			<footer>Braden Wong, Founder, Epicenter (YC S25)</footer>
		</blockquote>

		<p class="centered-action">
			<a href={resolve('/testimonials')} role="button" class="outline">Read the testimonials</a>
		</p>
	</section>

	<section aria-labelledby="invitation-heading">
		<h2 id="invitation-heading">What are you stuck on?</h2>
		<p>
			You may know exactly what is blocking you. Or you may only know that something important is
			not working. Either is enough to start.
		</p>
		<p>
			The work can take the shape of a focused consultation, a prototype, hands-on development,
			ongoing fractional support, or the right full-time role.
		</p>
		<p class="centered-action">
			<a href={resolve('/contact')} role="button" class="outline">Tell me what you're stuck on</a>
		</p>
	</section>
</div>

<style>
	.consulting {
		padding-block: var(--size-6);
	}

	h1 {
		font-size: clamp(var(--font-size-4), 4.5vw, var(--font-size-6));
		line-height: var(--font-lineheight-1);
	}

	.hero {
		text-align: center;
	}

	.eyebrow {
		max-width: var(--size-content-2);
		margin-inline: auto;
		margin-bottom: 0;
		font-size: var(--font-size-1);
		font-weight: var(--font-weight-6);
		opacity: 0.65;
	}

	.eyebrow + h1 {
		margin-top: 0;
	}

	.promise {
		max-width: var(--size-content-2);
		margin-inline: auto;
		font-size: var(--font-size-3);
		font-weight: var(--font-weight-6);
		line-height: var(--font-lineheight-2);
	}

	.perspectives {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--size-2);
		margin-top: var(--size-6);
	}

	.perspectives li {
		padding: var(--size-3) var(--size-4);
		border-radius: var(--radius-3);
		background: var(--nc-surface-2);
	}

	.perspectives strong {
		display: block;
		font-size: var(--font-size-2);
		text-align: center;
	}

	.perspectives span {
		display: block;
		margin-top: var(--size-2);
		font-size: var(--font-size-0);
		text-align: center;
	}

	.perspectives,
	.superpowers {
		padding-left: 0;
		list-style: none;
	}

	section {
		max-width: var(--size-content-2);
		margin-inline: auto;
		margin-top: var(--size-8);
	}

	.centered-action {
		text-align: center;
	}

	.centered-action [role='button'] {
		border-radius: 2rem;
	}

	.superpowers,
	.project-list {
		margin-top: var(--size-4);
	}

	@media (max-width: 47.999rem) {
		.perspectives {
			grid-template-columns: 1fr;
		}
	}
</style>
