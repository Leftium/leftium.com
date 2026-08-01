import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
	createAdminBootstrapToken,
	parseAdminAuthConfig,
} from '$lib/contact/admin-auth.server'

import type { Cookies } from '@sveltejs/kit'

const testState = vi.hoisted(() => ({
	env: {
		CONTACT_ADMIN_KEY_SHA256: '0'.repeat(64),
		CONTACT_ADMIN_SESSION_SECRET: 'A'.repeat(43),
		CONTACT_ADMIN_SESSION_VERSION: '1',
	},
}))

vi.mock('$env/dynamic/private', () => ({ env: testState.env }))

const now = new Date('2026-08-01T00:00:00.000Z')

class TestCookies {
	readonly values = new Map<string, string>()

	get(name: string) {
		return this.values.get(name)
	}

	set(name: string, value: string) {
		this.values.set(name, value)
	}

	delete(name: string) {
		this.values.delete(name)
	}
}

beforeEach(() => {
	vi.useFakeTimers()
	vi.setSystemTime(now)
})

afterEach(() => {
	vi.useRealTimers()
})

describe('admin login route', () => {
	it('keeps same-origin POST origins while suppressing cross-site referrers', async () => {
		const { load } = await import('./+page.server')
		const setHeaders = vi.fn()

		await load({ cookies: new TestCookies() as unknown as Cookies, setHeaders } as never)

		expect(setHeaders).toHaveBeenCalledWith(
			expect.objectContaining({ 'Referrer-Policy': 'same-origin' }),
		)
	})

	it('claims a bootstrap token from a form request', async () => {
		const { actions } = await import('./+page.server')
		const config = parseAdminAuthConfig(testState.env, false)
		const token = await createAdminBootstrapToken(config, now)
		const cookies = new TestCookies()
		const formData = new FormData()
		formData.set('token', token)
		const request = new Request('https://leftium.com/contact/admin?/claim', {
			method: 'POST',
			body: formData,
		})

		await expect(
			actions.claim({ cookies: cookies as unknown as Cookies, request } as never),
		).rejects.toMatchObject({ status: 303, location: '/contact/admin#signed-in' })
		expect(cookies.values.get('contact_admin')).toBeTruthy()
	})
})
