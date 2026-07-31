import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createAdminSessionToken, parseAdminAuthConfig } from '$lib/contact/admin-auth.server'
import { parseContactProfileToml } from '$lib/contact/profile'

import type { Cookies } from '@sveltejs/kit'

const testState = vi.hoisted(() => ({
	env: {
		CONTACT_ADMIN_KEY_SHA256: '0'.repeat(64),
		CONTACT_ADMIN_SESSION_SECRET: 'A'.repeat(43),
		CONTACT_ADMIN_SESSION_VERSION: '1',
	},
	payloads: [] as string[],
}))

vi.mock('$env/dynamic/private', () => ({ env: testState.env }))
vi.mock('$lib/qr', () => ({
	buildQrSvg: (payload: string) => {
		testState.payloads.push(payload)
		return '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
	},
}))

const profile = parseContactProfileToml(
	`
[profile]
name = "Route Person"
photo = "./photo.png"

[public]
email = "public-route@example.com"

[private.email]
personal = "private-route@example.com"

[private.phone]
mobile = "+82 10 7654 3210"

[private.custom]
hidden = { value = "not-shareable", shareable = false }
	`,
	{
		resolvePhoto: () => ({ base64: 'cGhvdG8=', mediaType: 'image/png' }),
	},
)

vi.mock('../../(centered)/contact/contact-profile.server', () => ({
	loadContactProfile: () => profile,
}))

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

async function createAdminCookies() {
	const cookies = new TestCookies()
	const config = parseAdminAuthConfig(testState.env, false)
	cookies.values.set('contact_admin', await createAdminSessionToken(config))
	return cookies
}

beforeEach(() => {
	testState.payloads.length = 0
})

describe('individual contact QR route', () => {
	it('encodes only the requested private field for an authenticated admin', async () => {
		const { GET } = await import('./+server')
		const response = await GET({
			cookies: (await createAdminCookies()) as unknown as Cookies,
			url: new URL('https://leftium.com/api/contact-qr?field=private.phone.mobile'),
		} as never)

		expect(response.status).toBe(200)
		expect(response.headers.get('Content-Type')).toBe('image/svg+xml; charset=utf-8')
		expect(response.headers.get('Cache-Control')).toBe('private, no-store')
		expect(testState.payloads).toEqual(['tel:+821076543210'])
		expect(testState.payloads[0]).not.toContain('private-route@example.com')
	})

	it('requires admin authorization even for a public field', async () => {
		const { GET } = await import('./+server')
		const response = await GET({
			cookies: new TestCookies() as unknown as Cookies,
			url: new URL('https://leftium.com/api/contact-qr?field=public.email'),
		} as never)

		expect(response.status).toBe(401)
		expect(testState.payloads).toEqual([])
	})

	it('rejects multiple, unknown, unshareable, and photo fields', async () => {
		const { GET } = await import('./+server')
		const urls = [
			'https://leftium.com/api/contact-qr?field=public.email&field=private.phone.mobile',
			'https://leftium.com/api/contact-qr?field=private.phone.unknown',
			'https://leftium.com/api/contact-qr?field=private.custom.hidden',
			'https://leftium.com/api/contact-qr?field=profile.photo',
		]

		for (const url of urls) {
			const response = await GET({
				cookies: (await createAdminCookies()) as unknown as Cookies,
				url: new URL(url),
			} as never)
			expect(response.status).toBe(400)
		}
		expect(testState.payloads).toEqual([])
	})
})
