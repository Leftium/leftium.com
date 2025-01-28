<script lang="ts">
	let { children } = $props()
</script>

<main class="container">
	{@render children()}
</main>

<style>
	main {
		background-color: var(--pico-background-color);
		min-height: 100vh;
	}
</style>
