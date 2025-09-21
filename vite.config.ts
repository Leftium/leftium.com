import devtoolsJson from 'vite-plugin-devtools-json'
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

import { ViteToml } from 'vite-plugin-toml'

export default defineConfig({
	plugins: [sveltekit(), ViteToml(), devtoolsJson()],
})
