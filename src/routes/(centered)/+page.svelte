<script>
	import { makeTagFunctionMd } from '$lib/tag-functions/markdown'
	import { LeftiumLogo } from '@leftium/leftium-logo'
	import attr from 'markdown-it-attrs'
	import centerText from 'markdown-it-center-text'

	const md = makeTagFunctionMd({ html: true, linkify: true, typographer: true, breaks: true }, [
		[attr],
		[centerText],
	])
</script>

<header>
	<LeftiumLogo animated={false} boundingBox="square" size="6rem" style="margin-right: 1.2rem;" />
	<div>
		<h1>Leftium</h1>
		<i>The element of creativity!</i>
	</div>
</header>

<scope-css>
	{@html md`
		## John's Site

		[View John's resume](/resume){role=button} [Download PDF](/John-Kim-Murphy-Resume.pdf){role=button .outline} {.resume role=group}

		[Browse John's work](/portfolio){role=button .full}

		[Learn how to work with John (coming soon...)](/#){role=button .full disabled}

		->[Contact Info](/contact)<-
	`}
</scope-css>

<style>
	header {
		display: flex;
		flex-wrap: wrap;

		justify-content: center;
		align-items: center;
		gap: 10px;
		padding: 1rem;
		border: 1px solid #ddd;
		margin-bottom: 2rem;

		div {
			max-width: 36ch;

			h1 {
				margin-bottom: 0;
			}

			i {
				opacity: 50%;
			}
		}
	}

	scope-css {
		:global(h2) {
			text-align: center;
		}

		:global(p.resume) {
			display: grid;
			grid-template-columns: 1fr auto;
		}

		:global(.full) {
			width: 100%;
		}

		:global(.text-align-center) {
			text-align: center;
		}
	}
</style>
