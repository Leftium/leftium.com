import { randomBytes } from 'node:crypto'
import { SignJWT } from 'jose'
import { describe, expect, it } from 'vitest'

import { createAdminSessionToken } from './admin-auth.server'
import { parseContactProfileToml } from './profile'
import {
	clearVisitorSessionCookie,
	CONTACT_GRANT_LIFETIME_DAYS,
	CONTACT_VISITOR_LIFETIME_HOURS,
	createContactGrantToken,
	createVisitorSessionToken,
	parseVisitorAuthConfig,
	setVisitorSessionCookie,
	verifyContactGrantToken,
	verifyVisitorSessionToken,
	VisitorAuthConfigurationError,
} from './visitor-auth.server'

import type { Cookies } from '@sveltejs/kit'

const now = new Date('2026-07-31T00:00:00.000Z')
const profile = parseContactProfileToml(`
[profile]
id = "leftium"
version = 4
name = "Leftium"

[public]
email = "public@example.com"

[private.email]
personal = "private@example.com"

[private.phone]
mobile = "+82 10 1234 5678"

[private.custom.hidden]
value = "not shareable"
shareable = false
vcard_property = "NOTE"
`)

function createConfig() {
	return parseVisitorAuthConfig(
		{ CONTACT_GRANT_SECRET: randomBytes(32).toString('base64url') },
		false,
	)
}

describe('visitor authentication configuration', () => {
	it('requires a separate strong signing secret', () => {
		expect(() => parseVisitorAuthConfig({}, false)).toThrow(VisitorAuthConfigurationError)
		expect(() =>
			parseVisitorAuthConfig(
				{ CONTACT_GRANT_SECRET: randomBytes(16).toString('base64url') },
				false,
			),
		).toThrow('at least 32 bytes')
	})
})

describe('contact grant tokens', () => {
	it('signs only private shareable fields for seven days', async () => {
		const config = createConfig()
		const fieldIds = ['private.phone.mobile', 'private.email.personal']
		const token = await createContactGrantToken(config, profile, fieldIds, now)

		expect(await verifyContactGrantToken(token, config, profile, now)).toEqual([
			'private.email.personal',
			'private.phone.mobile',
		])
		expect(
			await verifyContactGrantToken(
				token,
				config,
				profile,
				new Date(now.getTime() + CONTACT_GRANT_LIFETIME_DAYS * 24 * 60 * 60 * 1000),
			),
		).toBeNull()
	})

	it('rejects empty, public, unknown, unshareable, and duplicate selections', async () => {
		const config = createConfig()

		await expect(createContactGrantToken(config, profile, [], now)).rejects.toThrow(
			'at least one private field',
		)
		for (const fieldIds of [
			['public.email'],
			['private.unknown'],
			['private.custom.hidden'],
			['private.email.personal', 'private.email.personal'],
		]) {
			await expect(createContactGrantToken(config, profile, fieldIds, now)).rejects.toThrow()
		}
	})

	it('rejects tampering, incompatible profiles, and token substitution', async () => {
		const config = createConfig()
		const grant = await createContactGrantToken(config, profile, ['private.email.personal'], now)
		const visitor = await createVisitorSessionToken(
			config,
			profile,
			['private.email.personal'],
			now,
		)
		const admin = await createAdminSessionToken(
			{
				accessKeyDigest: new Uint8Array(32),
				sessionSecret: config.signingSecret,
				sessionVersion: 1,
				secureCookies: false,
			},
			now,
		)
		const changedProfile = { ...profile, version: profile.version + 1 }

		expect(await verifyContactGrantToken(`${grant}x`, config, profile, now)).toBeNull()
		expect(await verifyContactGrantToken(grant, config, changedProfile, now)).toBeNull()
		expect(await verifyContactGrantToken(visitor, config, profile, now)).toBeNull()
		expect(await verifyContactGrantToken(admin, config, profile, now)).toBeNull()
		expect(await verifyVisitorSessionToken(grant, config, profile, now)).toBeNull()
		expect(await verifyVisitorSessionToken(admin, config, profile, now)).toBeNull()
	})

	it('rejects correctly signed tokens with unknown fields or the wrong type', async () => {
		const config = createConfig()
		const issuedAt = Math.floor(now.getTime() / 1000)
		const token = await new SignJWT({
			token_type: 'contact-visitor-grant',
			profile_id: profile.id,
			profile_version: profile.version,
			field_ids: ['private.unknown'],
		})
			.setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
			.setIssuer('leftium.com/contact')
			.setAudience('leftium.com/contact/grant')
			.setIssuedAt(issuedAt)
			.setExpirationTime(issuedAt + 7 * 24 * 60 * 60)
			.sign(config.signingSecret)

		expect(await verifyContactGrantToken(token, config, profile, now)).toBeNull()
	})
})

describe('visitor session tokens', () => {
	it('lasts 24 hours and cannot be used as a grant', async () => {
		const config = createConfig()
		const token = await createVisitorSessionToken(config, profile, ['private.email.personal'], now)

		expect(await verifyVisitorSessionToken(token, config, profile, now)).toEqual([
			'private.email.personal',
		])
		expect(await verifyContactGrantToken(token, config, profile, now)).toBeNull()
		expect(
			await verifyVisitorSessionToken(
				token,
				config,
				profile,
				new Date(now.getTime() + CONTACT_VISITOR_LIFETIME_HOURS * 60 * 60 * 1000),
			),
		).toBeNull()
	})

	it.each([true, false])(
		'sets and clears a protected 24-hour cookie with secure=%s',
		(secureCookies) => {
			const calls: unknown[][] = []
			const cookies = {
				set: (...arguments_: unknown[]) => calls.push(['set', ...arguments_]),
				delete: (...arguments_: unknown[]) => calls.push(['delete', ...arguments_]),
			} as unknown as Cookies

			setVisitorSessionCookie(cookies, 'signed-token', { ...createConfig(), secureCookies })
			clearVisitorSessionCookie(cookies, secureCookies)

			expect(calls).toEqual([
				[
					'set',
					'contact_visitor',
					'signed-token',
					{
						httpOnly: true,
						secure: secureCookies,
						sameSite: 'lax',
						path: '/',
						maxAge: 24 * 60 * 60,
					},
				],
				['delete', 'contact_visitor', { path: '/', secure: secureCookies }],
			])
		},
	)
})
