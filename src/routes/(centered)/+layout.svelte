<script lang="ts">
	import 'open-props/style'

	import { favicon, LeftiumLogo } from '@leftium/leftium-logo'
	import { dev } from '$app/environment'

	let { children } = $props()
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header class="container screen-only">
	<nav>
		<ul>
			<li>
				<a href="/" class="brand">
					<LeftiumLogo animated={!dev} boundingBox="square" size="3.75rem" />
					<div>
						<h1>Leftium</h1>
						<em>The element of creativity!</em>
					</div>
				</a>
			</li>
		</ul>
		<ul>
			<li><a href="/resume">Resume</a></li>
			<li><a href="/portfolio">Portfolio</a></li>
			<li><a href="/contact">Contact</a></li>
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

	nav {
		max-width: var(--size-content-3);
		margin: auto;
		margin-top: var(--size-3);
		margin-bottom: var(--size-3);
		flex-wrap: wrap;
		border: 1px solid var(--pico-muted-border-color);
		padding-inline: var(--size-3);

		ul:first-child {
			flex: 1 1 100%;
			justify-content: center;
		}

		ul:last-child {
			flex: 1 1 100%;
			justify-content: center;
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

		div {
			display: flex;
			flex-direction: column;
			line-height: 1.2;

			h1 {
				margin-bottom: 0;
				color: #1c4ee0;
			}

			em {
				color: inherit;
				opacity: 50%;
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

	nav ul:last-child a {
		color: #1c4ee0;
	}
</style>
