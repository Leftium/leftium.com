import { createHash, randomBytes } from 'node:crypto'
import { SignJWT } from 'jose'
import { describe, expect, it } from 'vitest'

import {
	ADMIN_BOOTSTRAP_LIFETIME_MINUTES,
	AdminAuthConfigurationError,
	clearAdminSessionCookie,
	createAdminBootstrapToken,
	createAdminSessionToken,
	parseAdminAuthConfig,
	setAdminSessionCookie,
	verifyAdminAccessKey,
	verifyAdminBootstrapToken,
	verifyAdminSessionToken,
} from './admin-auth.server'

import type { Cookies } from '@sveltejs/kit'

const accessKey = 'admin_example_access_key'
const now = new Date('2026-07-31T00:00:00.000Z')

function createConfig(overrides: Record<string, string | undefined> = {}) {
	return parseAdminAuthConfig(
		{
			CONTACT_ADMIN_KEY_SHA256: createHash('sha256').update(accessKey).digest('hex'),
			CONTACT_ADMIN_SESSION_SECRET: randomBytes(32).toString('base64url'),
			CONTACT_ADMIN_SESSION_VERSION: '3',
			...overrides,
		},
		false,
	)
}

describe('admin access-key verification', () => {
	it('accepts only the configured random access key', async () => {
		const config = createConfig()

		await expect(verifyAdminAccessKey(accessKey, config)).resolves.toBe(true)
		await expect(verifyAdminAccessKey('admin_wrong', config)).resolves.toBe(false)
		await expect(verifyAdminAccessKey('', config)).resolves.toBe(false)
		await expect(verifyAdminAccessKey('x'.repeat(257), config)).resolves.toBe(false)
	})

	it('rejects malformed configuration', () => {
		expect(() =>
			parseAdminAuthConfig({
				CONTACT_ADMIN_KEY_SHA256: 'not-a-digest',
				CONTACT_ADMIN_SESSION_SECRET: randomBytes(32).toString('base64url'),
			}),
		).toThrow(AdminAuthConfigurationError)

		expect(() =>
			createConfig({
				CONTACT_ADMIN_SESSION_SECRET: randomBytes(16).toString('base64url'),
			}),
		).toThrow(/at least 32 bytes/)
	})
})

describe('admin session tokens', () => {
	it('verifies a current token with the configured session version', async () => {
		const config = createConfig()
		const token = await createAdminSessionToken(config, now)

		await expect(verifyAdminSessionToken(token, config, now)).resolves.toBe(true)
	})

	it('rejects expired, wrong-version, and wrong-algorithm tokens', async () => {
		const config = createConfig()
		const token = await createAdminSessionToken(config, now)

		await expect(
			verifyAdminSessionToken(token, config, new Date('2027-08-01T00:00:00.000Z')),
		).resolves.toBe(false)
		await expect(
			verifyAdminSessionToken(token, { ...config, sessionVersion: 4 }, now),
		).resolves.toBe(false)

		const wrongAlgorithmToken = await new SignJWT({
			token_type: 'contact-admin-session',
			session_version: 3,
		})
			.setProtectedHeader({ alg: 'HS384', typ: 'JWT' })
			.setIssuer('leftium.com/contact')
			.setAudience('leftium.com/contact/admin')
			.setIssuedAt(Math.floor(now.getTime() / 1000))
			.setExpirationTime(Math.floor(now.getTime() / 1000) + 60)
			.sign(randomBytes(48))

		await expect(verifyAdminSessionToken(wrongAlgorithmToken, config, now)).resolves.toBe(false)
	})
})

describe('admin bootstrap tokens', () => {
	it('verifies only a current bootstrap token with the configured session version', async () => {
		const config = createConfig()
		const token = await createAdminBootstrapToken(config, now)

		await expect(verifyAdminBootstrapToken(token, config, now)).resolves.toBe(true)
		await expect(
			verifyAdminBootstrapToken(
				token,
				config,
				new Date(now.getTime() + (ADMIN_BOOTSTRAP_LIFETIME_MINUTES + 1) * 60 * 1000),
			),
		).resolves.toBe(false)
		await expect(
			verifyAdminBootstrapToken(token, { ...config, sessionVersion: 4 }, now),
		).resolves.toBe(false)
	})

	it('does not substitute bootstrap and session tokens', async () => {
		const config = createConfig()
		const bootstrapToken = await createAdminBootstrapToken(config, now)
		const sessionToken = await createAdminSessionToken(config, now)

		await expect(verifyAdminSessionToken(bootstrapToken, config, now)).resolves.toBe(false)
		await expect(verifyAdminBootstrapToken(sessionToken, config, now)).resolves.toBe(false)
	})
})

describe('admin session cookies', () => {
	it('sets a protected one-year cookie and clears it from the root path', () => {
		const calls: unknown[][] = []
		const cookies = {
			set: (...arguments_: unknown[]) => calls.push(['set', ...arguments_]),
			delete: (...arguments_: unknown[]) => calls.push(['delete', ...arguments_]),
		} as unknown as Cookies

		setAdminSessionCookie(cookies, 'signed-token', { ...createConfig(), secureCookies: true })
		clearAdminSessionCookie(cookies)

		expect(calls).toEqual([
			[
				'set',
				'contact_admin',
				'signed-token',
				{
					httpOnly: true,
					secure: true,
					sameSite: 'lax',
					path: '/',
					maxAge: 365 * 24 * 60 * 60,
				},
			],
			['delete', 'contact_admin', { path: '/' }],
		])
	})
})
