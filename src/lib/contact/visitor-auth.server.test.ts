import { randomBytes } from 'node:crypto'
import { decodeJwt, decodeProtectedHeader, SignJWT } from 'jose'
import { describe, expect, it } from 'vitest'

import { createAdminSessionToken } from './admin-auth.server'
import { parseContactProfileToml } from './profile'
import {
	clearVisitorSessionCookie,
	CONTACT_GRANT_LIFETIME_DAYS,
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
		const grant = await createContactGrantToken(config, profile, fieldIds, now)

		expect(await verifyContactGrantToken(grant.token, config, profile, now)).toEqual(grant)
		expect(decodeProtectedHeader(grant.token)).toEqual({ alg: 'HS256' })
		const payload = decodeJwt(grant.token)
		expect(Object.keys(payload).sort()).toEqual(['aud', 'exp', 'f', 'iat', 'v'])
		expect(payload).toMatchObject({
			v: profile.version,
			f: ['email.personal', 'phone.mobile'],
			aud: 'g',
			iat: Math.floor(now.getTime() / 1000),
			exp: grant.expiresAt,
		})
		expect(grant.token.length).toBeLessThanOrEqual(190)
		expect(
			await verifyContactGrantToken(
				grant.token,
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
			[{ fieldId: 'private.email.personal', expiresAt: grant.expiresAt }],
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

		expect(await verifyContactGrantToken(`${grant.token}x`, config, profile, now)).toBeNull()
		expect(await verifyContactGrantToken(grant.token, config, changedProfile, now)).toBeNull()
		expect(await verifyContactGrantToken(visitor.token, config, profile, now)).toBeNull()
		expect(await verifyContactGrantToken(admin, config, profile, now)).toBeNull()
		expect(await verifyVisitorSessionToken(grant.token, config, profile, now)).toBeNull()
		expect(await verifyVisitorSessionToken(admin, config, profile, now)).toBeNull()
	})

	it('accepts an optional matching profile and rejects a different profile', async () => {
		const config = createConfig()
		const issuedAt = Math.floor(now.getTime() / 1000)
		const matchingToken = await new SignJWT({
			p: profile.id,
			v: profile.version,
			f: ['email.personal'],
		})
			.setProtectedHeader({ alg: 'HS256' })
			.setAudience('g')
			.setIssuedAt(issuedAt)
			.setExpirationTime(issuedAt + 7 * 24 * 60 * 60)
			.sign(config.signingSecret)
		const differentToken = await new SignJWT({
			p: 'different-profile',
			v: profile.version,
			f: ['email.personal'],
		})
			.setProtectedHeader({ alg: 'HS256' })
			.setAudience('g')
			.setIssuedAt(issuedAt)
			.setExpirationTime(issuedAt + 7 * 24 * 60 * 60)
			.sign(config.signingSecret)

		expect(await verifyContactGrantToken(matchingToken, config, profile, now)).not.toBeNull()
		expect(await verifyContactGrantToken(differentToken, config, profile, now)).toBeNull()
	})

	it('rejects signed grants with invalid claims, lifetimes, or the old verbose format', async () => {
		const config = createConfig()
		const issuedAt = Math.floor(now.getTime() / 1000)
		const invalidClaims = [
			{ v: profile.version, f: [] },
			{ v: profile.version, f: ['unknown'] },
			{ v: profile.version, f: ['private.email.personal'] },
			{ v: profile.version, f: ['email.personal', 'email.personal'] },
			{ p: 1, v: profile.version, f: ['email.personal'] },
		]
		const invalidClaimTokens = await Promise.all(
			invalidClaims.map((claims) =>
				new SignJWT(claims)
					.setProtectedHeader({ alg: 'HS256' })
					.setAudience('g')
					.setIssuedAt(issuedAt)
					.setExpirationTime(issuedAt + 7 * 24 * 60 * 60)
					.sign(config.signingSecret),
			),
		)
		const shortLifetimeToken = await new SignJWT({
			v: profile.version,
			f: ['email.personal'],
		})
			.setProtectedHeader({ alg: 'HS256' })
			.setAudience('g')
			.setIssuedAt(issuedAt)
			.setExpirationTime(issuedAt + 6 * 24 * 60 * 60)
			.sign(config.signingSecret)
		const futureIssuedAt = issuedAt + 60
		const futureToken = await new SignJWT({ v: profile.version, f: ['email.personal'] })
			.setProtectedHeader({ alg: 'HS256' })
			.setAudience('g')
			.setIssuedAt(futureIssuedAt)
			.setExpirationTime(futureIssuedAt + 7 * 24 * 60 * 60)
			.sign(config.signingSecret)
		const oldToken = await new SignJWT({
			token_type: 'contact-visitor-grant',
			profile_id: profile.id,
			profile_version: profile.version,
			field_ids: ['private.email.personal'],
		})
			.setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
			.setIssuer('leftium.com/contact')
			.setAudience('leftium.com/contact/grant')
			.setIssuedAt(issuedAt)
			.setExpirationTime(issuedAt + 7 * 24 * 60 * 60)
			.sign(config.signingSecret)

		for (const token of invalidClaimTokens) {
			expect(await verifyContactGrantToken(token, config, profile, now)).toBeNull()
		}
		expect(await verifyContactGrantToken(shortLifetimeToken, config, profile, now)).toBeNull()
		expect(await verifyContactGrantToken(futureToken, config, profile, now)).toBeNull()
		expect(await verifyContactGrantToken(oldToken, config, profile, now)).toBeNull()
	})
})

describe('visitor session tokens', () => {
	it('never extends access beyond the original grant expiration', async () => {
		const config = createConfig()
		const grant = await createContactGrantToken(config, profile, ['private.email.personal'], now)
		const lateClaim = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000)
		const verifiedGrant = await verifyContactGrantToken(grant.token, config, profile, lateClaim)

		expect(verifiedGrant).not.toBeNull()
		const session = await createVisitorSessionToken(
			config,
			profile,
			verifiedGrant!.fieldIds.map((fieldId) => ({
				fieldId,
				expiresAt: verifiedGrant!.expiresAt,
			})),
			lateClaim,
		)

		expect(session.expiresAt).toBe(grant.expiresAt)
		expect(
			await verifyVisitorSessionToken(
				session.token,
				config,
				profile,
				new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
			),
		).toBeNull()
	})

	it('keeps each field authorized only until its grant expires', async () => {
		const config = createConfig()
		const nowSeconds = Math.floor(now.getTime() / 1000)
		const session = await createVisitorSessionToken(
			config,
			profile,
			[
				{ fieldId: 'private.email.personal', expiresAt: nowSeconds + 24 * 60 * 60 },
				{ fieldId: 'private.phone.mobile', expiresAt: nowSeconds + 7 * 24 * 60 * 60 },
			],
			now,
		)

		expect(await verifyVisitorSessionToken(session.token, config, profile, now)).toEqual(session)
		expect(await verifyContactGrantToken(session.token, config, profile, now)).toBeNull()
		expect(
			await verifyVisitorSessionToken(
				session.token,
				config,
				profile,
				new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
			),
		).toEqual({
			token: session.token,
			fieldGrants: [{ fieldId: 'private.phone.mobile', expiresAt: nowSeconds + 7 * 24 * 60 * 60 }],
			expiresAt: session.expiresAt,
		})
		expect(
			await verifyVisitorSessionToken(
				session.token,
				config,
				profile,
				new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
			),
		).toBeNull()
	})

	it.each([true, false])(
		'sets and clears a protected grant-capped cookie with secure=%s',
		(secureCookies) => {
			const calls: unknown[][] = []
			const expiresAt = Math.floor(now.getTime() / 1000) + 6 * 60 * 60
			const cookies = {
				set: (...arguments_: unknown[]) => calls.push(['set', ...arguments_]),
				delete: (...arguments_: unknown[]) => calls.push(['delete', ...arguments_]),
			} as unknown as Cookies

			setVisitorSessionCookie(
				cookies,
				'signed-token',
				{ ...createConfig(), secureCookies },
				expiresAt,
				now,
			)
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
						maxAge: 6 * 60 * 60,
					},
				],
				['delete', 'contact_visitor', { path: '/', secure: secureCookies }],
			])
		},
	)
})
