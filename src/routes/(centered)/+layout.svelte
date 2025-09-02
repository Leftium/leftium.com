<script lang="ts">
	import { favicon } from '@leftium/leftium-logo'

	let { children } = $props()
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<main class="container">
	{@render children()}
</main>

<style>
	main {
		background-color: var(--pico-background-color);
		min-height: 100vh;
	}
</style>
