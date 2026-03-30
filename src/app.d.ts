// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

// TypeScript 6.0 requires type declarations for CSS side-effect imports.
// open-props exports CSS files without a `types` field; declare them here.
declare module 'open-props/style' {}
declare module 'open-props/normalize' {}

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {}
