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
			<li><a href="/"><LeftiumLogo animated={!dev} boundingBox="square" size="3.75rem" /></a></li>
		</ul>
		<ul>
			<li><a href="/resume">Resume</a></li>
			<li><a href="/portfolio">Portfolio</a></li>
			<li><a href="/contact" style="white-space: nowrap;">Contact Info</a></li>
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
	}

	main {
		background-color: var(--pico-background-color);
		min-height: 100vh;
	}
</style>
