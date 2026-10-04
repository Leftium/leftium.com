import { defineEnvVars } from '@sveltejs/kit/env'

// Dynamic environment variables previously read through $env/dynamic/private.
// Preserve the old missing-value behavior; existing config loaders validate required values.
export const variables = defineEnvVars({
	CONTACT_INFO_TOML: { schema: (input) => input ?? '' },
	CONTACT_ADMIN_KEY_SHA256: { schema: (input) => input ?? '' },
	CONTACT_ADMIN_SESSION_SECRET: { schema: (input) => input ?? '' },
	// Keep missing versions optional so the existing validator defaults them to 1.
	// An explicitly empty value still fails project-level validation.
	CONTACT_ADMIN_SESSION_VERSION: { schema: (input) => input },
	CONTACT_GRANT_SECRET: { schema: (input) => input ?? '' },
})
