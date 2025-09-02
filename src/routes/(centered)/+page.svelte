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
	<LeftiumLogo animated={!dev} boundingBox="square" size="9rem" style="margin-right: 2rem;" />
	<div>
		<h1>Leftium</h1>
		<i>The element of creativity!</i>
	</div>
</header>

<scope-css>
	{@html md`
	    <center>John-Kim is a...</center>

		## Digital Consultant...

		#### Getting you from point A to point B...
		
		- **Point B is where you want to be!** Imagine you had an all-powerful magic wand.\
		  What would you do? Where would you go? What is the goal/transformation you most desire?
		- **Point A is your current situation.** John will customize the best route to B.\
		  This requires understanding *your* specific needs and strengths.
		

		#### (Often) with expertise in computers/tech...
		- **John has probably *forgotten* more about computers than most will ever *learn* in a lifetime.** He has...
		  - Assembled and repaired computers.
		  - Made web sites that *make other web sites.*
		  - Improved the secret source code of Microsoft Windows and Office.

		#### But not always!
		- **One of John's greatest accomplishments was getting a troubled student to finish reading their very first book.**
		  The student's mother literally teared up because she thought this would be impossible.

		### Learn more...

		---

		[View John's resume](/resume){role=button} [Download PDF](/John-Kim-Murphy-Resume.pdf){role=button .outline} {.resume role=group}

		[Browse John's work](/portfolio){role=button .full}

		[Learn how to work with John (coming soon...)](/#){role=button .full disabled}

		->[Contact Info](/contact)<-
	`}
</scope-css>

<style lang="css">
	header {
		display: flex;
		flex-wrap: wrap;

		justify-content: center;
		align-items: center;
		gap: 10px;
		padding: 1rem;
		border: 1px solid #ddd;
		margin: auto;
		margin-bottom: 2rem;

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

		:global(h1), :global(h2) {
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
