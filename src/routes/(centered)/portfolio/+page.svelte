<script>
	import 'open-props/style'

	import { resolve } from '$app/paths'
	import { onMount } from 'svelte'

	onMount(() => {
		const revealFragment = () => {
			const fragment = window.location.hash.slice(1)
			if (!fragment) return

			let targetId = fragment
			try {
				targetId = decodeURIComponent(fragment)
			} catch {
				// Keep the literal fragment when it is not valid URI encoding.
			}

			const target = document.getElementById(targetId)
			if (!target) return

			const disclosure = target.closest('.project-disclosure')

			if (disclosure instanceof HTMLDetailsElement) {
				disclosure.open = true
				target.scrollIntoView()
			}
		}

		revealFragment()
		window.addEventListener('hashchange', revealFragment)

		return () => window.removeEventListener('hashchange', revealFragment)
	})
</script>

<svelte:head>
	<title>Portfolio | Leftium</title>
	<meta
		name="description"
		content="Projects by John-Kim Murphy, including WeatherSense, RIFT, HN Reader, Veneer, gg, Whiz, and MultiLaunch."
	/>
</svelte:head>

<div class="portfolio">
	<header class="page-header">
		<h1>Selected Projects</h1>
		<nav class="project-nav" aria-label="Jump to a project">
			<ul>
				<li><a href="#weather-sense">WeatherSense</a></li>
				<li><a href="#rift">RIFT</a></li>
				<li><a href="#veneer">Veneer</a></li>
				<li><a href="#gg">gg</a></li>
				<li><a href="#hn-reader">HN Reader</a></li>
				<li><a href="#whiz">Whiz</a></li>
				<li><a href="#multi-launch">MultiLaunch</a></li>
				<li><a href="#leftium-com">Leftium.com</a></li>
			</ul>
		</nav>
	</header>

	<div class="projects">
		<article class="project" aria-labelledby="weather-sense">
			<h2 id="weather-sense">WeatherSense</h2>
			<p class="project-lead">User-friendly, actionable weather forecasts.</p>
			<p>
				WeatherSense shows the last two days of weather next to the forecast. This makes an
				unfamiliar temperature easier to judge: is it getting warmer or colder than the weather I
				just felt?
			</p>

			<details class="project-disclosure">
				<summary>How WeatherSense works</summary>
				<div class="project-disclosure-body">
					<section class="project-detail" aria-labelledby="weather-sense-relative-temperature">
						<h3 id="weather-sense-relative-temperature">Compare with recent weather</h3>
						<p>
							A temperature means more when I can compare it with weather I have already felt.
							WeatherSense puts the previous hours, yesterday, and two days ago beside the forecast.
							I
							<a
								href="https://blog.leftium.com/2013/12/how-to-display-temperature-properly.html"
								target="_blank"
								rel="noreferrer">first wrote about this idea in 2013</a
							>.
						</p>
					</section>

					<section class="project-detail" aria-labelledby="weather-sense-visual-language">
						<h3 id="weather-sense-visual-language">WMO weather codes</h3>
						<p>
							Open-Meteo has 28 WMO weather codes. I arranged them into a
							<a
								href="https://blog.leftium.com/2024/07/wmo-codes.html"
								target="_blank"
								rel="noreferrer">"periodic table"</a
							>
							of five broad families, three conditions, and three severity levels. Related states share
							a hue; cells become darker and more saturated as severity rises. The table also defines
							the
							<a href="https://weather-sense.leftium.com/wmo-codes" target="_blank" rel="noreferrer"
								>icons and colors used throughout the forecast</a
							>.
						</p>
					</section>

					<section class="project-detail" aria-labelledby="weather-sense-ambient-sky">
						<h3 id="weather-sense-ambient-sky">Sky colors from sunrise and sunset</h3>
						<p>
							WeatherSense uses local sunrise and sunset times to choose the background colors.
							Moving the time cursor through the forecast also
							<a
								href="https://github.com/Leftium/weather-sense/blob/main/src/lib/skyAnimation.ts"
								target="_blank"
								rel="noreferrer">moves the background</a
							>
							through dawn, daylight, dusk, and night.
						</p>
					</section>

					<section class="project-detail" aria-labelledby="weather-sense-calm-mode">
						<h3 id="weather-sense-calm-mode">Calm mode</h3>
						<p>
							<a href="https://weather-sense.leftium.com/?calm" target="_blank" rel="noreferrer"
								>Calm mode</a
							>
							removes the digits and units, replacing them with words such as <em>Cold</em>,
							<em>Likely</em>, and <em>Damp</em>. The colors, icons, spacing, and positions stay the
							same. One click restores the full forecast.
						</p>
					</section>

					<section class="project-detail" aria-labelledby="weather-sense-evolution">
						<h3 id="weather-sense-evolution">HyperWeather, UltraWeather, and WeatherSense</h3>
						<p>
							I have rebuilt this idea three times:
							<a
								href="https://blog.leftium.com/2016/06/hyperweather.html"
								target="_blank"
								rel="noreferrer">HyperWeather in 2015</a
							>, continued as
							<a href="https://github.com/Leftium/ultra-weather" target="_blank" rel="noreferrer"
								>UltraWeather in 2021</a
							>, and became
							<a
								href="https://blog.leftium.com/2025/05/weathersense.html"
								target="_blank"
								rel="noreferrer">WeatherSense in 2025</a
							>. All three put recent weather beside the forecast. Each version uses different data,
							time ranges, and controls.
						</p>
					</section>
				</div>
			</details>
			<ul class="project-links" aria-label="WeatherSense links">
				<li>
					<a href="https://weather-sense.leftium.com" target="_blank" rel="noreferrer"
						>Try WeatherSense</a
					>
				</li>
				<li>
					<a href="https://github.com/Leftium/weather-sense" target="_blank" rel="noreferrer"
						>View source</a
					>
				</li>
			</ul>
		</article>

		<article class="project" aria-labelledby="rift">
			<h2 id="rift">RIFT</h2>
			<p class="project-lead">Realtime Interactive Fluid Transcription.</p>
			<p>
				RIFT lets you click, select, and type while transcription is still in progress. Its Svelte
				component receives voice results the same way a <code>&lt;textarea&gt;</code> receives input
				and composition events. <code>rift-local</code> serves streaming speech recognition over WebSocket
				using local models.
			</p>
			<ul class="project-links" aria-label="RIFT links">
				<li>
					<a href="https://rift-transcription.vercel.app" target="_blank" rel="noreferrer"
						>Try RIFT</a
					>
				</li>
				<li>
					<a href="https://github.com/Leftium/rift-local" target="_blank" rel="noreferrer"
						>View <code>rift-local</code> source</a
					>
				</li>
			</ul>
		</article>

		<article class="project" aria-labelledby="veneer">
			<h2 id="veneer">Veneer</h2>
			<p class="project-lead">A thin layer over Google Forms &amp; Sheets.</p>
			<p>
				Site owners edit content in Google Sheets or submit it through Google Forms, including from
				their phones. I've run and improved Veneer for sites such as
				<a href="https://vivimil.com" target="_blank" rel="noreferrer">vivimil.com</a> since 2022.
			</p>
			<ul class="project-links" aria-label="Veneer links">
				<li>
					<a href="https://veneer.leftium.com" target="_blank" rel="noreferrer">Try Veneer</a>
				</li>
				<li>
					<a href="https://github.com/Leftium/veneer" target="_blank" rel="noreferrer"
						>View source</a
					>
				</li>
			</ul>
		</article>

		<article class="project" aria-labelledby="gg">
			<h2 id="gg">gg</h2>
			<p class="project-lead">Never use <code>console.log()</code> to debug again!</p>
			<p>
				<code>gg()</code> is a logger/debugger with automatic namespaces based on the source file
				and calling function, unique colors, and millisecond timestamps. With
				<code>fileSink: true</code>, browser and server logs are written to
				<code>.gg/logs-&lbrace;port&rbrace;.jsonl</code>, so coding agents can read them directly.
			</p>
			<ul class="project-links" aria-label="gg links">
				<li>
					<a href="https://github.com/Leftium/gg" target="_blank" rel="noreferrer">View source</a>
				</li>
			</ul>
		</article>

		<article class="project" aria-labelledby="hn-reader">
			<h2 id="hn-reader">HN Reader <span class="project-alias">(Seeking Orange)</span></h2>
			<p class="project-lead">Hacker News clients.</p>
			<p>
				HN Reader makes long comment threads easier to scan without changing the comment order.
				Comments can appear as full text, a one-line preview, or a colored strip. Story lists can
				also
				<a
					href="https://hn.leftium.com/newest?min_karma=500&amp;min_age_years=5"
					target="_blank"
					rel="noreferrer">filter for a submitter's karma and account age</a
				>
				, based on
				<a href="https://hn.leftium.com/i/47228169" target="_blank" rel="noreferrer"
					>a reader's suggestion</a
				>.
			</p>

			<details class="project-disclosure">
				<summary>HN Reader features</summary>
				<div class="project-disclosure-body">
					<section class="project-detail" aria-labelledby="hn-reader-comment-detail">
						<h3 id="hn-reader-comment-detail">Three comment detail levels</h3>
						<p>
							Comments have
							<a
								href="https://github.com/Leftium/hn/blob/main/specs/comment-lod.md"
								target="_blank"
								rel="noreferrer">three levels of detail</a
							>: full text, a one-line preview, and a colored strip. Top-level comments start as
							full text, replies as previews, and deeper comments as strips. The comment order stays
							the same. Click a preview or strip to expand it.
						</p>
					</section>

					<section class="project-detail" aria-labelledby="hn-reader-author-context">
						<h3 id="hn-reader-author-context">Authors and parent comments</h3>
						<p>
							The
							<a
								href="https://github.com/Leftium/hn/blob/main/specs/comment-author-promotion.md"
								target="_blank"
								rel="noreferrer">author controls</a
							>
							let you select one or more people and keep their comments previewed or fully open. When
							a selected comment is a reply, its direct parent stays visible. Author selections can also
							be included in the thread URL.
						</p>
					</section>

					<section class="project-detail" aria-labelledby="hn-reader-new-comments">
						<h3 id="hn-reader-new-comments">New comment checkpoints</h3>
						<p>
							HN Reader saves a checkpoint when the visible comment count changes. Comments added
							after that checkpoint get an orange <em>NEW</em> marker and at least a one-line
							preview. A refresh with no new comments does not move the checkpoint. The
							<a
								href="https://github.com/Leftium/hn/blob/main/specs/new-comment-timeline.md"
								target="_blank"
								rel="noreferrer">comment-activity timeline</a
							>
							lets you move it to an earlier visit or any point in the discussion.
						</p>
					</section>

					<section class="project-detail" aria-labelledby="hn-reader-navigation">
						<h3 id="hn-reader-navigation">Search and highlight navigation</h3>
						<p>
							Search and comment highlights have
							<a
								href="https://github.com/Leftium/hn/blob/main/specs/comment-view-promotion.md"
								target="_blank"
								rel="noreferrer">separate previous and next controls</a
							>. Search opens a matching comment to full text and keeps its direct parent visible. A
							second navigator moves through <em>NEW</em> comments and selected authors. Both keep the
							current result highlighted.
						</p>
					</section>

					<section class="project-detail" aria-labelledby="hn-reader-evolution">
						<h3 id="hn-reader-evolution">HckrWeb and Seeking Orange</h3>
						<p>
							<a href="https://hckrweb.netlify.app" target="_blank" rel="noreferrer">HckrWeb</a>
							focuses on a dense story list and marks stories posted since your last visit. Seeking Orange,
							now HN Reader, adds detail levels and navigation to the comments. I kept HckrWeb online
							so you can still use and compare it.
						</p>
					</section>
				</div>
			</details>
			<ul class="project-links" aria-label="HN Reader links">
				<li>
					<a href="https://hn.leftium.com" target="_blank" rel="noreferrer">Try HN Reader</a>
				</li>
				<li>
					<a href="https://hckrweb.netlify.app" target="_blank" rel="noreferrer">Try HckrWeb</a>
				</li>
				<li>
					<a href="https://github.com/Leftium/hn" target="_blank" rel="noreferrer"
						>View HN Reader source</a
					>
				</li>
				<li>
					<a href="https://github.com/Leftium/hckrweb" target="_blank" rel="noreferrer"
						>View HckrWeb source</a
					>
				</li>
			</ul>
		</article>

		<article class="project" aria-labelledby="whiz">
			<h2 id="whiz">Whiz</h2>
			<p class="project-lead">More powerful, more user-friendly bang search.</p>
			<p>
				Whiz, formerly whizBang, can
				<a
					href="https://kagifeedback.org/d/256-multiple-bangs-open-extra-bangs-site-in-new-tab"
					target="_blank"
					rel="noreferrer">launch multiple bangs from one query</a
				>
				and handle blocked popups. It can also
				<a
					href="https://kagifeedback.org/d/4065-query-personal-search-history-to-revisit-previous-search-results"
					target="_blank"
					rel="noreferrer">query your search history</a
				>
				and includes a "zero-effort journal" that resurfaces memories such as what you did a year ago.
			</p>
			<ul class="project-links" aria-label="Whiz links">
				<li>
					<a href="https://whiz.leftium.com" target="_blank" rel="noreferrer">Try Whiz</a>
				</li>
				<li>
					<a href="https://github.com/Leftium/whiz" target="_blank" rel="noreferrer">View source</a>
				</li>
			</ul>
		</article>

		<article class="project" aria-labelledby="multi-launch">
			<h2 id="multi-launch">MultiLaunch</h2>
			<p class="project-lead">Bookmarks/start page for power users.</p>
			<p>
				Launch plans are editable
				<a href="https://multi-launch.leftium.com/doc" target="_blank" rel="noreferrer"
					>TOML files</a
				>
				that define groups of buttons. Depending on the input, one button can open a saved set, search
				several sites, choose different links for text, URLs, or Korean, and reuse existing tabs. The
				forms still work without JavaScript.
			</p>
			<ul class="project-links" aria-label="MultiLaunch links">
				<li>
					<a href="https://multi-launch.leftium.com" target="_blank" rel="noreferrer"
						>Try MultiLaunch</a
					>
				</li>
				<li>
					<a href="https://github.com/Leftium/multi-launch" target="_blank" rel="noreferrer"
						>View source</a
					>
				</li>
			</ul>
		</article>

		<article class="project" aria-labelledby="leftium-com">
			<h2 id="leftium-com">Leftium.com</h2>
			<p class="project-lead">I designed and developed this entire site.</p>
			<p>
				Leftium.com is built with SvelteKit. It includes responsive text layouts, an interactive
				logo, and downloadable vCards and QR codes generated from the same contact data.
			</p>
			<ul class="project-links" aria-label="Leftium.com links">
				<li>
					<a href="https://leftium.com" target="_blank" rel="noreferrer">Visit Leftium.com</a>
				</li>
				<li>
					<a href="https://github.com/Leftium/leftium.com" target="_blank" rel="noreferrer"
						>View source</a
					>
				</li>
			</ul>
		</article>
	</div>

	<section class="elsewhere" aria-labelledby="elsewhere-heading">
		<h2 id="elsewhere-heading">Elsewhere</h2>
		<ul>
			<li><a href="https://github.com/Leftium" target="_blank" rel="noreferrer">GitHub</a></li>
			<li>
				<a href="https://stackoverflow.com/users/117030/leftium" target="_blank" rel="noreferrer"
					>Stack Overflow</a
				>
			</li>
			<li>
				<a href="https://news.ycombinator.com/threads?id=Leftium" target="_blank" rel="noreferrer"
					>Hacker News</a
				>
			</li>
			<li>
				<a href="https://www.reddit.com/user/Leftium" target="_blank" rel="noreferrer">Reddit</a>
			</li>
			<li><a href="https://blog.leftium.com" target="_blank" rel="noreferrer">Blog</a></li>
		</ul>
	</section>

	<p class="contact-action">
		<a href={resolve('/contact')} role="button" class="outline">Tell me what you're stuck on</a>
	</p>
</div>

<style>
	.portfolio {
		max-width: var(--size-content-2);
		margin-inline: auto;
		padding-block: var(--size-6) var(--size-8);
	}

	.page-header {
		text-align: center;
	}

	.page-header h1 {
		margin: 0;
	}

	.project-nav {
		margin-block-start: var(--size-4);
	}

	.project-nav ul {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--size-2) var(--size-4);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.project-nav li {
		margin: 0;
	}

	.projects {
		margin-top: var(--size-7);
	}

	.project {
		margin: 0;
		padding: var(--size-7) 0;
		border: 0;
		border-top: 1px solid color-mix(in srgb, var(--nc-secondary) 25%, transparent);
		border-radius: 0;
		background: transparent;
		box-shadow: none;
	}

	.project h2 {
		margin-block: 0 var(--size-1);
	}

	.project :is(h2, h3)[id] {
		scroll-margin-block-start: var(--size-8);
	}

	.project-detail {
		margin-block-start: var(--size-5);
	}

	.project-disclosure {
		margin-block-start: var(--size-5);
	}

	.project-disclosure summary {
		width: fit-content;
		color: var(--nc-primary);
		font-weight: var(--font-weight-6);
		cursor: pointer;
	}

	.project-disclosure summary:hover {
		text-decoration: underline;
		text-underline-offset: 0.15em;
	}

	.project-disclosure summary:focus-visible {
		border-radius: 0.125rem;
		outline: 2px solid currentColor;
		outline-offset: var(--size-1);
	}

	.project-disclosure-body {
		margin-inline-start: 0.25em;
		padding-inline-start: var(--size-4);
		border-inline-start: 2px solid color-mix(in srgb, var(--nc-secondary) 25%, transparent);
	}

	.project-detail h3 {
		margin-block: 0 var(--size-2);
		font-size: var(--font-size-3);
		line-height: var(--font-lineheight-2);
	}

	.project-detail p {
		margin-block: 0;
	}

	.project-alias {
		font-size: 0.7em;
		font-weight: var(--font-weight-4);
		white-space: nowrap;
	}

	.project-lead {
		margin-block: 0 var(--size-3);
		font-size: var(--font-size-2);
		font-weight: var(--font-weight-6);
		line-height: var(--font-lineheight-2);
	}

	.project-links,
	.elsewhere ul {
		display: flex;
		flex-wrap: wrap;
		gap: var(--size-2) var(--size-4);
		margin-block: var(--size-4) 0;
		padding: 0;
		list-style: none;
	}

	.project-links li,
	.elsewhere li {
		margin: 0;
	}

	.project-links a {
		font-weight: var(--font-weight-6);
	}

	.elsewhere {
		padding-block-start: var(--size-7);
		border-top: 1px solid color-mix(in srgb, var(--nc-secondary) 25%, transparent);
	}

	.elsewhere h2 {
		margin-block: 0;
	}

	.contact-action {
		margin-block: var(--size-8) 0;
		text-align: center;
	}

	.contact-action [role='button'] {
		border-radius: 2rem;
	}
</style>
