import { dev } from '$app/environment'
import { env } from '$env/dynamic/private'
import { base64url, jwtVerify, SignJWT } from 'jose'

import type { Cookies } from '@sveltejs/kit'
import type { ContactAuthorization } from './types'

const ADMIN_COOKIE_NAME = 'contact_admin'
const ADMIN_TOKEN_TYPE = 'contact-admin-session'
const ADMIN_TOKEN_ISSUER = 'leftium.com/contact'
const ADMIN_TOKEN_AUDIENCE = 'leftium.com/contact/admin'
const ADMIN_BOOTSTRAP_TOKEN_TYPE = 'contact-admin-bootstrap'
const ADMIN_BOOTSTRAP_TOKEN_AUDIENCE = 'leftium.com/contact/admin/bootstrap'
const ADMIN_SESSION_MAX_AGE = 365 * 24 * 60 * 60
const ADMIN_BOOTSTRAP_MAX_AGE = 10 * 60
const MAX_ACCESS_KEY_LENGTH = 256

export const ADMIN_BOOTSTRAP_LIFETIME_MINUTES = ADMIN_BOOTSTRAP_MAX_AGE / 60

export type AdminAuthConfig = {
	accessKeyDigest: Uint8Array
	sessionSecret: Uint8Array
	sessionVersion: number
	secureCookies: boolean
}

export type AdminAccess = {
	authorization: ContactAuthorization
	available: boolean
}

export class AdminAuthConfigurationError extends Error {
	constructor(message: string) {
		super(`Invalid admin authentication configuration: ${message}`)
		this.name = 'AdminAuthConfigurationError'
	}
}

export function parseAdminAuthConfig(
	source: Record<string, string | undefined>,
	secureCookies = !dev,
): AdminAuthConfig {
	const accessKeyDigest = decodeHexDigest(
		source.CONTACT_ADMIN_KEY_SHA256,
		'CONTACT_ADMIN_KEY_SHA256',
	)
	const sessionSecret = decodeSessionSecret(source.CONTACT_ADMIN_SESSION_SECRET)
	const sessionVersion = Number(source.CONTACT_ADMIN_SESSION_VERSION ?? '1')

	if (!Number.isSafeInteger(sessionVersion) || sessionVersion < 1) {
		throw new AdminAuthConfigurationError(
			'CONTACT_ADMIN_SESSION_VERSION must be a positive integer',
		)
	}

	return {
		accessKeyDigest,
		sessionSecret,
		sessionVersion,
		secureCookies,
	}
}

export function loadAdminAuthConfig(): AdminAuthConfig {
	return parseAdminAuthConfig(env)
}

export async function verifyAdminAccessKey(
	accessKey: unknown,
	config: AdminAuthConfig,
): Promise<boolean> {
	if (
		typeof accessKey !== 'string' ||
		accessKey.length === 0 ||
		accessKey.length > MAX_ACCESS_KEY_LENGTH
	) {
		return false
	}

	const digest = new Uint8Array(
		await crypto.subtle.digest('SHA-256', new TextEncoder().encode(accessKey)),
	)
	return constantTimeEqual(digest, config.accessKeyDigest)
}

export async function createAdminSessionToken(
	config: AdminAuthConfig,
	now = new Date(),
): Promise<string> {
	const issuedAt = Math.floor(now.getTime() / 1000)

	return new SignJWT({
		token_type: ADMIN_TOKEN_TYPE,
		session_version: config.sessionVersion,
	})
		.setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
		.setIssuer(ADMIN_TOKEN_ISSUER)
		.setAudience(ADMIN_TOKEN_AUDIENCE)
		.setIssuedAt(issuedAt)
		.setExpirationTime(issuedAt + ADMIN_SESSION_MAX_AGE)
		.sign(config.sessionSecret)
}

export async function verifyAdminSessionToken(
	token: string,
	config: AdminAuthConfig,
	now = new Date(),
): Promise<boolean> {
	try {
		const { payload } = await jwtVerify(token, config.sessionSecret, {
			algorithms: ['HS256'],
			issuer: ADMIN_TOKEN_ISSUER,
			audience: ADMIN_TOKEN_AUDIENCE,
			typ: 'JWT',
			currentDate: now,
		})

		return (
			payload.token_type === ADMIN_TOKEN_TYPE && payload.session_version === config.sessionVersion
		)
	} catch {
		return false
	}
}

export async function createAdminBootstrapToken(
	config: AdminAuthConfig,
	now = new Date(),
): Promise<string> {
	const issuedAt = Math.floor(now.getTime() / 1000)

	return new SignJWT({
		token_type: ADMIN_BOOTSTRAP_TOKEN_TYPE,
		session_version: config.sessionVersion,
	})
		.setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
		.setIssuer(ADMIN_TOKEN_ISSUER)
		.setAudience(ADMIN_BOOTSTRAP_TOKEN_AUDIENCE)
		.setIssuedAt(issuedAt)
		.setExpirationTime(issuedAt + ADMIN_BOOTSTRAP_MAX_AGE)
		.sign(config.sessionSecret)
}

export async function verifyAdminBootstrapToken(
	token: unknown,
	config: AdminAuthConfig,
	now = new Date(),
): Promise<boolean> {
	if (typeof token !== 'string' || token.length === 0) return false

	try {
		const { payload } = await jwtVerify(token, config.sessionSecret, {
			algorithms: ['HS256'],
			issuer: ADMIN_TOKEN_ISSUER,
			audience: ADMIN_BOOTSTRAP_TOKEN_AUDIENCE,
			typ: 'JWT',
			currentDate: now,
		})

		return (
			payload.token_type === ADMIN_BOOTSTRAP_TOKEN_TYPE &&
			payload.session_version === config.sessionVersion
		)
	} catch {
		return false
	}
}

export async function resolveAdminAccess(cookies: Cookies): Promise<AdminAccess> {
	let config: AdminAuthConfig

	try {
		config = loadAdminAuthConfig()
	} catch (error) {
		if (!(error instanceof AdminAuthConfigurationError)) throw error
		clearAdminSessionCookie(cookies)
		return { authorization: { mode: 'public' }, available: false }
	}

	const token = cookies.get(ADMIN_COOKIE_NAME)
	if (!token) return { authorization: { mode: 'public' }, available: true }

	if (!(await verifyAdminSessionToken(token, config))) {
		clearAdminSessionCookie(cookies)
		return { authorization: { mode: 'public' }, available: true }
	}

	return { authorization: { mode: 'admin' }, available: true }
}

export function setAdminSessionCookie(
	cookies: Cookies,
	token: string,
	config: AdminAuthConfig,
): void {
	cookies.set(ADMIN_COOKIE_NAME, token, {
		httpOnly: true,
		secure: config.secureCookies,
		sameSite: 'lax',
		path: '/',
		maxAge: ADMIN_SESSION_MAX_AGE,
	})
}

export function clearAdminSessionCookie(cookies: Cookies): void {
	cookies.delete(ADMIN_COOKIE_NAME, { path: '/' })
}

function decodeHexDigest(value: string | undefined, name: string): Uint8Array {
	if (!value || !/^[a-fA-F0-9]{64}$/.test(value)) {
		throw new AdminAuthConfigurationError(`${name} must be a 64-character SHA-256 hex digest`)
	}

	return Uint8Array.from(value.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16))
}

function decodeSessionSecret(value: string | undefined): Uint8Array {
	if (!value) {
		throw new AdminAuthConfigurationError(
			'CONTACT_ADMIN_SESSION_SECRET must be a base64url-encoded secret',
		)
	}

	let secret: Uint8Array
	try {
		secret = base64url.decode(value)
	} catch {
		throw new AdminAuthConfigurationError(
			'CONTACT_ADMIN_SESSION_SECRET must be a base64url-encoded secret',
		)
	}

	if (secret.byteLength < 32) {
		throw new AdminAuthConfigurationError(
			'CONTACT_ADMIN_SESSION_SECRET must decode to at least 32 bytes',
		)
	}

	return secret
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
	if (left.byteLength !== right.byteLength) return false

	let difference = 0
	for (let index = 0; index < left.byteLength; index += 1) {
		difference |= left[index] ^ right[index]
	}
	return difference === 0
}
