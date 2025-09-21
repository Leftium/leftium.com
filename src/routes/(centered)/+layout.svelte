<script lang="ts">
	import 'open-props/style'

	import { LeftiumLogo } from '@leftium/logo'
	import { page } from '$app/stores'

	let { children } = $props()

	// Read resume format from URL for brand visibility
	const hideBrand = $derived(
		$page.url.pathname === '/resume' && !$page.url.searchParams.has('text'),
	)
</script>

<header class="screen-only">
	<nav class="container">
		<ul>
			<li>
				<div class="brand">
					<div class="logo-wrapper" class:hidden={hideBrand}>
						<LeftiumLogo boundingBox="cropped" size="3.75rem" />
					</div>
					<a href="/" class="brand-text">
						<h1>Leftium</h1>
						<em>The element of creativity!</em>
					</a>
				</div>
			</li>
		</ul>
		<ul>
			<li><a href="/" class:active={$page.url.pathname === '/'}>Home</a></li>
			<li><a href="/resume" class:active={$page.url.pathname === '/resume'}>Resume</a></li>
			<li><a href="/portfolio" class:active={$page.url.pathname === '/portfolio'}>Portfolio</a></li>
			<li><a href="/contact" class:active={$page.url.pathname === '/contact'}>Contact</a></li>
		</ul>
	</nav>
</header>

<main class="container">
	{@render children()}
</main>

<style>
	header,
	nav,
	main {
		padding-top: 0;
		padding-bottom: 0%;
	}

	header {
		background-color: var(--pico-muted-border-color);
	}

	nav {
		max-width: var(--size-content-3);
		margin: auto;
		margin-bottom: var(--size-1);
		flex-wrap: wrap;
		padding-inline: var(--pico-block-spacing-horizontal);
		transition: all 0.3s ease;

		ul:first-child {
			flex: 1 1 100%;
			justify-content: center;
			padding-inline-start: 0;
			margin-inline: 0;
		}

		ul:last-child {
			flex: 1 1 100%;
			justify-content: center;
			padding-block: 0;
			margin-bottom: var(--size-2);
			padding-inline-start: 0;
			margin-inline: 0;
		}
	}

	@media (min-width: 768px) {
		nav {
			ul:first-child {
				flex: 0 0 auto;
			}

			ul:last-child {
				flex: 0 0 auto;
				justify-content: flex-end;
				margin-bottom: var(--size-1);
			}
		}

		nav ul:first-child li {
			padding: 0;
			padding-block: var(--size-1);
		}
	}

	main {
		background-color: var(--pico-background-color);
		min-height: 100vh;
		max-width: var(--size-content-3);
	}

	.brand {
		display: flex;
		align-items: center;
		text-decoration: none;
		border: 1px solid color-mix(in srgb, var(--pico-secondary) 25%, transparent);
		border-radius: 0;
		background-color: var(--pico-card-sectioning-background-color);
		transition:
			transform 0.4s ease-in-out,
			padding 0.4s ease-in-out;
		padding-right: var(--size-2);
		overflow: hidden;

		div,
		.brand-text {
			display: flex;
			flex-direction: column;
			line-height: 1.2;

			h1 {
				margin-bottom: 0;
				color: #1c4ee0;

				@media (prefers-color-scheme: dark) {
					color: #3973ff;
				}
			}

			em {
				opacity: 75%;
				font-size: 0.85em;
				font-style: italic;
			}
		}

		.brand-text {
			text-decoration: none;
			color: inherit;
			transition: transform 0.4s ease-in-out;
		}
	}

	.brand:link em,
	.brand:visited em,
	.brand:hover em,
	.brand-text:link em,
	.brand-text:visited em,
	.brand-text:hover em {
		color: rgba(128, 128, 128, 1) !important;
	}

	.logo-wrapper {
		width: 4.6rem;
		height: 4.6rem;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		transition:
			opacity 0.4s ease-in-out,
			transform 0.4s ease-in-out,
			margin 0.4s ease-in-out;
	}

	.brand:hover,
	.brand-text:hover {
		text-decoration: none;
	}

	.logo-wrapper.hidden {
		opacity: 0;
		transform: translateX(-100%);
		margin-right: -4.6rem;
	}

	.brand:has(.logo-wrapper.hidden) {
		padding-left: var(--size-2);
	}

	@media (max-width: 767px) {
		.brand {
			pointer-events: none;
		}

		.logo-wrapper {
			pointer-events: auto;

			&.hidden {
				pointer-events: none;
			}
		}
	}

	nav ul:last-child li {
		padding-block: 0;
		margin-block: 0;
	}

	nav ul:last-child a {
		color: #1c4ee0;
		text-decoration: none;
		padding-block: 0;
		font-weight: 400;
		transition: all 0.3s ease;

		@media (prefers-color-scheme: dark) {
			color: #3973ff;
		}
	}

	nav ul:last-child a.active {
		font-weight: 600;
		text-shadow: 0 0 20px rgba(28, 78, 224, 0.9);
		transform: scale(1.02);
	}

	@media (prefers-color-scheme: dark) {
		nav ul:last-child a.active {
			text-shadow: 0 0 20px rgba(57, 115, 255, 0.9);
		}
	}

	@media (max-width: 767px) {
		nav ul:last-child a.active {
			text-shadow: 0 0 24px rgba(28, 78, 224, 1);
		}

		@media (prefers-color-scheme: dark) {
			nav ul:last-child a.active {
				text-shadow: 0 0 24px rgba(57, 115, 255, 1);
			}
		}
	}

	nav ul:last-child a:visited,
	nav ul:last-child a:focus,
	nav ul:last-child a:active {
		text-decoration: none;
	}

	@media (hover: hover) {
		nav ul:last-child a:hover {
			text-shadow: 0 0 16px rgba(28, 78, 224, 0.7);
		}
	}

	@media (hover: hover) and (prefers-color-scheme: dark) {
		nav ul:last-child a:hover {
			text-shadow: 0 0 16px rgba(57, 115, 255, 0.7);
		}
	}
</style>
