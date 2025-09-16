<script>
	import 'open-props/style'

	import { makeTagFunctionMd } from '$lib/tag-functions/markdown'
	import attr from 'markdown-it-attrs'
	import centerText from 'markdown-it-center-text'

	const md = makeTagFunctionMd({ html: true, linkify: true, typographer: true, breaks: false }, [
		[attr],
		[centerText],
	])
</script>

<scope-css>
	{@html md`
		_If I shared this page with you, it was because you showed concern about how quiet I am. (It's rare, but often enough to warrant a web page.)_

		First of all, thank you for your concern~

		- I am not quiet because I am upset or uninterested.
		- I am only as uncomfortable as my quietness makes you uncomfortable.

		_Let me try to explain:_

		**One of the main reasons I may seem quiet and untalkative is because [I'm a very slow thinker](https://sive.rs/slow).**

		- That short passage deeply resonates with me. It concisely conveys our condition. Please read it.
		- So if I'm quiet, it's usually not because I'm holding thoughts back. I just don't have any thoughts to share.
		- Perhaps a perk of this condition is I am in a nearly constant meditative state.
		- My mind is not totally devoid of thoughts, but I imagine it as more of a trickle compared to a "normal" stream of consciousness.
		- This trickle is often _delayed:_ the thoughts are often connected to something said 5 minutes ago, an hour ago... even a day or week ago! So usually this thought doesn't fit into the current conversation.
		- If you ask me a question, the best answers usually come after simmering in my head for a while.
		  - I don't actively think and focus on the question...
		  - the thought just develops in my subconscious and suddenly pops out. (See the previous point about delayed thoughts.)

		I could probably stop there, but **the other main reason I am quiet is: I have something like PTSD related to talking.**

		- For years and years, I _felt_ my voice was ignored, misconstrued, and used against me.
		- So I associated talking with feelings similar to being trapped, punished, or suppressed.
		- It felt like talking only made it worse: a vicious cycle.
		- Additionally, my talking skills were underdeveloped because this happened when people develop social skills.
		- Thankfully, I don't feel like that any more. But I still value action more highly than talk:
		  - People seem more interested in being heard than listening to others.
		  - People often seem to talk just for the sake of talking.
		  - People often don't really mean what they say.
		  - I know some people's words are filled with the truest intentions; but I also understand how fleeting intentions can be.

		I respect your right to speak the sincerest truths, whitest lies, and even most blatant untruths.
		Thank you for respecting my right to be quiet.

		Being quiet may seem like a deliberate choice to you, but it's not. Several aspects of my life would be _so much easier_ if I were not quiet.

		I could probably force myself to be more talkative. But then I wouldn't feel like myself.

		- It would probably be similar to forcing yourself to be as quiet as me.
		- I think bad things happen when a person who identifies as one thing is forced to be another.
		  - When someone who identifies as a boy is forced to be a girl.
		  - When a left-hander is forced to use their right hand.

		I've never read it, but multiple people have told me they understood me better after reading [Quiet](https://www.amazon.com/Quiet-Power-Introverts-World-Talking/dp/0307352145) by Susan Cain.

		Despite being as quiet as I am, I'm also very open. Please feel free to ask me any questions!
	`}
</scope-css>

<style lang="css">
	scope-css {
		display: block;
		max-width: var(--size-content-3);

		margin: auto;
	}
</style>
