import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAdminSessionToken, parseAdminAuthConfig } from '$lib/contact/admin-auth.server'
import { parseContactProfileToml } from '$lib/contact/profile'
import {
	createContactGrantToken,
	createVisitorSessionToken,
	parseVisitorAuthConfig,
	verifyContactGrantToken,
	verifyVisitorSessionToken,
} from '$lib/contact/visitor-auth.server'

import type { Cookies } from '@sveltejs/kit'

const testState = vi.hoisted(() => ({
	env: {
		CONTACT_ADMIN_KEY_SHA256: '0'.repeat(64),
		CONTACT_ADMIN_SESSION_SECRET: 'A'.repeat(43),
		CONTACT_ADMIN_SESSION_VERSION: '1',
		CONTACT_GRANT_SECRET: 'B'.repeat(43),
	},
}))

vi.mock('$env/dynamic/private', () => ({ env: testState.env }))

const profile = parseContactProfileToml(`
[profile]
id = "leftium"
version = 4
name = "Leftium"

[public]
email = "public-route@example.com"
url = "https://public-route.example.com"

[private.email]
personal = "private-route@example.com"

[private.phone]
mobile = "+82 10 7654 3210"

[private.url]
KakaoTalk = "https://open.kakao.example/example#SecretHandle"
`)

vi.mock('./contact-profile.server', () => ({ loadContactProfile: () => profile }))

const now = new Date('2026-07-31T00:00:00.000Z')

class TestCookies {
	readonly values = new Map<string, string>()
	readonly sets: Array<{ name: string; value: string; options: Record<string, unknown> }> = []

	get(name: string) {
		return this.values.get(name)
	}

	set(name: string, value: string, options: Record<string, unknown>) {
		this.values.set(name, value)
		this.sets.push({ name, value, options })
	}

	delete(name: string) {
		this.values.delete(name)
	}
}

function createFormRequest(values: Array<[string, string]>) {
	const formData = new FormData()
	for (const [name, value] of values) formData.append(name, value)
	return new Request('https://leftium.com/contact', { method: 'POST', body: formData })
}

beforeEach(() => {
	vi.useFakeTimers()
	vi.setSystemTime(now)
})

afterEach(() => {
	vi.useRealTimers()
})

describe('visitor grant route boundaries', () => {
	it('lists unavailable field labels without serializing their private values', async () => {
		const { load } = await import('./+page.server')
		const result = await load({
			cookies: new TestCookies() as unknown as Cookies,
			setHeaders: vi.fn(),
		} as never)
		const contact = (
			result as {
				contact: {
					fields: Array<{ label: string; value: string }>
					unavailableFields: Array<{ label: string }>
					request: { body: string; mailtoHref: string }
				}
			}
		).contact
		const serialized = JSON.stringify(result)

		expect(contact.fields).toEqual([
			expect.objectContaining({ label: 'Email', value: 'public-route@example.com' }),
		])
		expect(contact.unavailableFields).toEqual([
			{ label: 'Personal email' },
			{ label: 'mobile' },
			{ label: 'KakaoTalk' },
		])
		expect(contact.request.body).toContain('[ ] Email\n[ ] Phone\n[ ] KakaoTalk')
		expect(contact.request.body).not.toMatch(/^(?:To|Subject):/m)
		expect(new URL(contact.request.mailtoHref).searchParams.get('body')).toBe(
			contact.request.body.replaceAll('\n', '\r\n'),
		)
		expect(contact.request.mailtoHref).not.toContain('+')
		expect(serialized).not.toContain('https://public-route.example.com')
		expect(serialized).not.toContain('private-route@example.com')
		expect(serialized).not.toContain('+82 10 7654 3210')
		expect(serialized).not.toContain('SecretHandle')
	})

	it('moves a granted field from the unavailable group to authorized details', async () => {
		const { load } = await import('./+page.server')
		const config = parseVisitorAuthConfig(testState.env, false)
		const cookies = new TestCookies()
		const grant = await createContactGrantToken(config, profile, ['private.url.KakaoTalk'], now)
		const session = await createVisitorSessionToken(
			config,
			profile,
			[{ fieldId: 'private.url.KakaoTalk', expiresAt: grant.expiresAt }],
			now,
		)
		cookies.values.set('contact_visitor', session.token)

		const result = await load({
			cookies: cookies as unknown as Cookies,
			setHeaders: vi.fn(),
		} as never)

		expect(result).toMatchObject({
			contact: {
				fields: expect.arrayContaining([
					{
						id: 'private.url.KakaoTalk',
						label: 'KakaoTalk (SecretHandle)',
						value: 'Open',
						href: 'https://open.kakao.example/example#SecretHandle',
					},
				]),
				unavailableFields: [{ label: 'Personal email' }, { label: 'mobile' }],
			},
		})
	})

	it('creates a signed link for the admin selection', async () => {
		const { actions } = await import('./admin/+page.server')
		const cookies = new TestCookies()
		const adminConfig = parseAdminAuthConfig(testState.env, false)
		cookies.values.set('contact_admin', await createAdminSessionToken(adminConfig, now))

		const result = await actions.createGrantLink({
			cookies: cookies as unknown as Cookies,
			request: createFormRequest([
				['field', 'private.phone.mobile'],
				['field', 'private.email.personal'],
			]),
			url: new URL('https://leftium.com/contact/admin'),
		} as never)

		expect(result).toMatchObject({
			action: 'createGrantLink',
			grantFieldIds: ['private.email.personal', 'private.phone.mobile'],
			expiresInDays: 7,
		})
		const grantUrl = new URL((result as { grantLink: string }).grantLink)
		const token = new URLSearchParams(grantUrl.hash.slice(1)).get('grant')
		const config = parseVisitorAuthConfig(testState.env, false)
		expect(await verifyContactGrantToken(token, config, profile, now)).toMatchObject({
			fieldIds: ['private.email.personal', 'private.phone.mobile'],
		})
	})

	it('unions grants without extending an older field authorization', async () => {
		const { actions } = await import('./+page.server')
		const config = parseVisitorAuthConfig(testState.env, false)
		const cookies = new TestCookies()
		const emailGrant = await createContactGrantToken(
			config,
			profile,
			['private.email.personal'],
			now,
		)
		const existingSession = await createVisitorSessionToken(
			config,
			profile,
			[{ fieldId: 'private.email.personal', expiresAt: emailGrant.expiresAt }],
			now,
		)
		cookies.values.set('contact_visitor', existingSession.token)

		const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000)
		vi.setSystemTime(nextDay)
		const phoneGrant = await createContactGrantToken(
			config,
			profile,
			['private.phone.mobile'],
			nextDay,
		)
		await actions.claimGrant({
			cookies: cookies as unknown as Cookies,
			request: createFormRequest([['token', phoneGrant.token]]),
		} as never)

		const session = await verifyVisitorSessionToken(
			cookies.values.get('contact_visitor'),
			config,
			profile,
			nextDay,
		)
		expect(session).toMatchObject({
			fieldGrants: [
				{ fieldId: 'private.email.personal', expiresAt: emailGrant.expiresAt },
				{ fieldId: 'private.phone.mobile', expiresAt: phoneGrant.expiresAt },
			],
			expiresAt: phoneGrant.expiresAt,
		})
	})

	it('preserves an existing visitor session when a claim is invalid', async () => {
		const { actions } = await import('./+page.server')
		const cookies = new TestCookies()
		cookies.values.set('contact_visitor', 'existing-session')

		const result = await actions.claimGrant({
			cookies: cookies as unknown as Cookies,
			request: createFormRequest([['token', 'invalid-grant']]),
		} as never)

		expect(result).toMatchObject({ status: 400, data: { invalid: true } })
		expect(cookies.values.get('contact_visitor')).toBe('existing-session')
		expect(cookies.sets).toHaveLength(0)
	})

	it('filters downloaded vCards to public and currently granted fields', async () => {
		const { GET } = await import('../../api/vcard/+server')
		const config = parseVisitorAuthConfig(testState.env, false)
		const cookies = new TestCookies()
		const grant = await createContactGrantToken(config, profile, ['private.phone.mobile'], now)
		const session = await createVisitorSessionToken(
			config,
			profile,
			[{ fieldId: 'private.phone.mobile', expiresAt: grant.expiresAt }],
			now,
		)
		cookies.values.set('contact_visitor', session.token)

		const response = await GET({
			cookies: cookies as unknown as Cookies,
			url: new URL('https://leftium.com/api/vcard'),
		} as never)
		const vcard = await response.text()

		expect(response.status).toBe(200)
		expect(vcard).toContain('public-route@example.com')
		expect(vcard).toContain('+82 10 7654 3210')
		expect(vcard).not.toContain('private-route@example.com')
	})
})
