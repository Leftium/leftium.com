<script lang="ts">
	import './resume.scss';
	import Resume from './Resume.svx';
</script>

<main class="resume">
	<Resume />
</main>

<style lang="scss">
	@use 'open-props-scss' as *;

	main.resume {
		max-width: 750px;
		margin: 0 auto;
		padding: 0 $size-7;
	}
</style>
