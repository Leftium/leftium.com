<script lang="ts">
	import 'open-props/style'

	import { favicon, LeftiumLogo } from '@leftium/leftium-logo'
	import { dev } from '$app/environment'
	import { page } from '$app/stores'

	let { children } = $props()

	let animated = $state(!dev)

	function handleLogoClick(event: MouseEvent) {
		event.preventDefault()
		event.stopPropagation()
		animated = !animated
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header class="screen-only">
	<nav class="container">
		<ul>
			<li>
				<a href="/" class="brand">
					<div class="logo-wrapper">
						<LeftiumLogo
							{animated}
							boundingBox="square"
							size="3.75rem"
							on:click={handleLogoClick}
						/>
					</div>
					<div>
						<h1>Leftium</h1>
						<em>The element of creativity!</em>
					</div>
				</a>
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
		margin-bottom: var(--size-3);
		flex-wrap: wrap;
		padding-inline: var(--size-3);

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
	}

	main {
		background-color: var(--pico-background-color);
		min-height: 100vh;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: var(--size-3);
		text-decoration: none;
		border: 1px solid color-mix(in srgb, var(--pico-secondary) 25%, transparent);
		padding: var(--size-2);
		border-radius: 0;
		background-color: var(--pico-card-sectioning-background-color);

		div {
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
	}

	.brand:link em,
	.brand:visited em,
	.brand:hover em {
		color: rgba(128, 128, 128, 1) !important;
	}

	.brand:hover {
		text-decoration: none;
	}

	@media (max-width: 767px) {
		.brand {
			pointer-events: none;
		}

		.logo-wrapper {
			pointer-events: auto;
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
		transition: text-shadow 0.3s ease;

		@media (prefers-color-scheme: dark) {
			color: #3973ff;
		}
	}

	nav ul:last-child a.active {
		text-shadow: 0 0 16px rgba(28, 78, 224, 0.7);
	}

	@media (prefers-color-scheme: dark) {
		nav ul:last-child a.active {
			text-shadow: 0 0 16px rgba(57, 115, 255, 0.7);
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
