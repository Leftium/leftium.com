import MarkdownIt from 'markdown-it'
import type { Options, PluginSimple, PluginWithOptions } from 'markdown-it'
import { undent } from './undent'

export function makeTagFunctionMd(
	options: Options,
	plugins: Array<[PluginSimple | PluginWithOptions<unknown>, unknown?]> = [],
) {
	const parser = new MarkdownIt(options)
	plugins.forEach(([plugin, opts]) => parser.use(plugin, opts))

	return function md(
		strings: TemplateStringsArray,
		...values: Array<string | number | boolean | null | undefined>
	) {
		const undented = undent(strings, ...values)
		return parser.render(undented)
	}
}
