<script>
	import 'open-props/style'

	import { makeTagFunctionMd } from '$lib/tag-functions/markdown'
	import { LeftiumLogo } from '@leftium/leftium-logo'
	import attr from 'markdown-it-attrs'
	import centerText from 'markdown-it-center-text'
	import { dev } from '$app/environment'

	const md = makeTagFunctionMd({ html: true, linkify: true, typographer: true, breaks: true }, [
		[attr],
		[centerText],
	])
</script>

<header>
	<LeftiumLogo animated={!dev} boundingBox="square" size="3.75rem" />
	<div>
		<h1>Leftium</h1>
		<i>The element of creativity!</i>
	</div>
</header>

<scope-css>
	{@html md`

		[Resume](/resume){role=button .outline} [Portfolio](/portfolio){role=button .outline} [Contact Info](/contact){role=button .outline} {role=group} 

		<center>John-Kim is a...</center>

		## Digital Consultant...

		#### Getting you from point A to point B...

		- **Point B is where you want to be!** Imagine you had an all-powerful magic wand.\
		  What would you do? Where would you go? What is the goal/transformation you most desire?
		- **Point A is your current situation.** John will customize the best route to B.\
		  This requires understanding _your_ specific needs and strengths.

		#### (Often) with expertise in computers/tech...

		- **John has probably _forgotten_ more about computers than most will ever _learn_ in a lifetime.** He has...
		- Assembled and repaired computers.
		- Made web sites that _make other web sites._
		- Improved the secret source code of Microsoft Windows and Office.

		#### But not always!

		- **One of John's greatest accomplishments was getting a troubled student to finish reading their very first book.**
		  The student's mother literally teared up because she thought this would be impossible.

		### Learn more...
	`}
</scope-css>

<style lang="css">
	header {
		display: flex;
		flex-wrap: wrap;

		justify-content: center;
		align-items: center;
		gap: var(--size-3);
		padding: var(--size-3);
		border: 1px solid var(--pico-muted-border-color);
		margin: auto;
		margin-bottom: var(--size-3);

		max-width: var(--size-content-3);

		div {
			h1 {
				margin-bottom: 0;
			}

			i {
				opacity: 50%;
			}
		}
	}

	scope-css {
		display: block;
		max-width: var(--size-content-2);

		margin: auto;

		:global(h1),
		:global(h2) {
			margin-top: 0;
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
