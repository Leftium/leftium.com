import { describe, expect, it } from 'vitest'

import { variables } from './env'
import { AdminAuthConfigurationError, parseAdminAuthConfig } from './lib/contact/admin-auth.server'

describe('Kit environment compatibility', () => {
	it('keeps the legacy default version when deployment configuration omits it', async () => {
		const result =
			await variables.CONTACT_ADMIN_SESSION_VERSION.schema['~standard'].validate(undefined)
		if (result.issues) throw new Error('Optional session version was rejected')
		const config = parseAdminAuthConfig({
			CONTACT_ADMIN_KEY_SHA256: '0'.repeat(64),
			CONTACT_ADMIN_SESSION_SECRET: 'A'.repeat(43),
			CONTACT_ADMIN_SESSION_VERSION: result.value,
		})
		expect(config.sessionVersion).toBe(1)
	})

	it('keeps an explicitly empty deployment version invalid', async () => {
		const result = await variables.CONTACT_ADMIN_SESSION_VERSION.schema['~standard'].validate('')
		if (result.issues) throw new Error('Empty session version did not reach project validation')
		expect(() =>
			parseAdminAuthConfig({
				CONTACT_ADMIN_KEY_SHA256: '0'.repeat(64),
				CONTACT_ADMIN_SESSION_SECRET: 'A'.repeat(43),
				CONTACT_ADMIN_SESSION_VERSION: result.value,
			}),
		).toThrow(AdminAuthConfigurationError)
	})
})
