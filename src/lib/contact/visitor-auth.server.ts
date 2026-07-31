import { dev } from '$app/environment'
import { env } from '$env/dynamic/private'
import { base64url, jwtVerify, SignJWT } from 'jose'

import type { Cookies } from '@sveltejs/kit'
import type { ContactAuthorization, ContactProfile } from './types'

const VISITOR_COOKIE_NAME = 'contact_visitor'
const TOKEN_ISSUER = 'leftium.com/contact'
const GRANT_TOKEN_TYPE = 'contact-visitor-grant'
const GRANT_TOKEN_AUDIENCE = 'leftium.com/contact/grant'
const VISITOR_TOKEN_TYPE = 'contact-visitor-session'
const VISITOR_TOKEN_AUDIENCE = 'leftium.com/contact/visitor'
const GRANT_MAX_AGE = 7 * 24 * 60 * 60
const VISITOR_MAX_AGE = 24 * 60 * 60
const MAX_TOKEN_LENGTH = 16_384

export const CONTACT_GRANT_LIFETIME_DAYS = GRANT_MAX_AGE / (24 * 60 * 60)
export const CONTACT_VISITOR_LIFETIME_HOURS = VISITOR_MAX_AGE / (60 * 60)

export type VisitorAuthConfig = {
	signingSecret: Uint8Array
	secureCookies: boolean
}

export type VisitorAccess = {
	authorization: ContactAuthorization
	available: boolean
}

export class VisitorAuthConfigurationError extends Error {
	constructor(message: string) {
		super(`Invalid visitor authentication configuration: ${message}`)
		this.name = 'VisitorAuthConfigurationError'
	}
}

export function parseVisitorAuthConfig(
	source: Record<string, string | undefined>,
	secureCookies = !dev,
): VisitorAuthConfig {
	return {
		signingSecret: decodeSigningSecret(source.CONTACT_GRANT_SECRET),
		secureCookies,
	}
}

export function loadVisitorAuthConfig(): VisitorAuthConfig {
	return parseVisitorAuthConfig(env)
}

export async function createContactGrantToken(
	config: VisitorAuthConfig,
	profile: ContactProfile,
	fieldIds: Iterable<string>,
	now = new Date(),
): Promise<string> {
	const authorizedFieldIds = validateAuthorizedFieldIds(profile, fieldIds)
	if (authorizedFieldIds.length === 0) {
		throw new TypeError('A contact grant must contain at least one private field')
	}

	return signToken(
		config,
		profile,
		authorizedFieldIds,
		GRANT_TOKEN_TYPE,
		GRANT_TOKEN_AUDIENCE,
		GRANT_MAX_AGE,
		now,
	)
}

export async function verifyContactGrantToken(
	token: unknown,
	config: VisitorAuthConfig,
	profile: ContactProfile,
	now = new Date(),
): Promise<string[] | null> {
	return verifyToken(
		token,
		config,
		profile,
		GRANT_TOKEN_TYPE,
		GRANT_TOKEN_AUDIENCE,
		GRANT_MAX_AGE,
		now,
	)
}

export async function createVisitorSessionToken(
	config: VisitorAuthConfig,
	profile: ContactProfile,
	fieldIds: Iterable<string>,
	now = new Date(),
): Promise<string> {
	const authorizedFieldIds = validateAuthorizedFieldIds(profile, fieldIds)

	return signToken(
		config,
		profile,
		authorizedFieldIds,
		VISITOR_TOKEN_TYPE,
		VISITOR_TOKEN_AUDIENCE,
		VISITOR_MAX_AGE,
		now,
	)
}

export async function verifyVisitorSessionToken(
	token: unknown,
	config: VisitorAuthConfig,
	profile: ContactProfile,
	now = new Date(),
): Promise<string[] | null> {
	return verifyToken(
		token,
		config,
		profile,
		VISITOR_TOKEN_TYPE,
		VISITOR_TOKEN_AUDIENCE,
		VISITOR_MAX_AGE,
		now,
	)
}

export async function resolveVisitorAccess(
	cookies: Cookies,
	profile: ContactProfile,
): Promise<VisitorAccess> {
	let config: VisitorAuthConfig

	try {
		config = loadVisitorAuthConfig()
	} catch (error) {
		if (!(error instanceof VisitorAuthConfigurationError)) throw error
		clearVisitorSessionCookie(cookies)
		return { authorization: { mode: 'public' }, available: false }
	}

	const token = cookies.get(VISITOR_COOKIE_NAME)
	if (!token) return { authorization: { mode: 'public' }, available: true }

	const fieldIds = await verifyVisitorSessionToken(token, config, profile)
	if (!fieldIds) {
		clearVisitorSessionCookie(cookies, config.secureCookies)
		return { authorization: { mode: 'public' }, available: true }
	}

	return {
		authorization: { mode: 'visitor', fieldIds },
		available: true,
	}
}

export function setVisitorSessionCookie(
	cookies: Cookies,
	token: string,
	config: VisitorAuthConfig,
): void {
	cookies.set(VISITOR_COOKIE_NAME, token, {
		httpOnly: true,
		secure: config.secureCookies,
		sameSite: 'lax',
		path: '/',
		maxAge: VISITOR_MAX_AGE,
	})
}

export function clearVisitorSessionCookie(cookies: Cookies, secureCookies = !dev): void {
	cookies.delete(VISITOR_COOKIE_NAME, { path: '/', secure: secureCookies })
}

async function signToken(
	config: VisitorAuthConfig,
	profile: ContactProfile,
	fieldIds: string[],
	tokenType: string,
	audience: string,
	maxAge: number,
	now: Date,
): Promise<string> {
	const issuedAt = Math.floor(now.getTime() / 1000)

	return new SignJWT({
		token_type: tokenType,
		profile_id: profile.id,
		profile_version: profile.version,
		field_ids: fieldIds,
	})
		.setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
		.setIssuer(TOKEN_ISSUER)
		.setAudience(audience)
		.setIssuedAt(issuedAt)
		.setExpirationTime(issuedAt + maxAge)
		.sign(config.signingSecret)
}

async function verifyToken(
	token: unknown,
	config: VisitorAuthConfig,
	profile: ContactProfile,
	tokenType: string,
	audience: string,
	maxAge: number,
	now: Date,
): Promise<string[] | null> {
	if (typeof token !== 'string' || token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
		return null
	}

	try {
		const { payload } = await jwtVerify(token, config.signingSecret, {
			algorithms: ['HS256'],
			issuer: TOKEN_ISSUER,
			audience,
			typ: 'JWT',
			currentDate: now,
		})
		const nowSeconds = Math.floor(now.getTime() / 1000)

		if (
			payload.token_type !== tokenType ||
			payload.profile_id !== profile.id ||
			payload.profile_version !== profile.version ||
			!Number.isSafeInteger(payload.iat) ||
			!Number.isSafeInteger(payload.exp) ||
			(payload.iat as number) > nowSeconds ||
			(payload.exp as number) - (payload.iat as number) !== maxAge ||
			!Array.isArray(payload.field_ids)
		) {
			return null
		}

		const fieldIds = payload.field_ids
		if (!fieldIds.every((fieldId): fieldId is string => typeof fieldId === 'string')) {
			return null
		}

		const validatedFieldIds = validateAuthorizedFieldIds(profile, fieldIds)
		return validatedFieldIds.length === fieldIds.length ? validatedFieldIds : null
	} catch {
		return null
	}
}

function validateAuthorizedFieldIds(profile: ContactProfile, fieldIds: Iterable<string>): string[] {
	const requested = [...fieldIds]
	if (new Set(requested).size !== requested.length) {
		throw new TypeError('Contact authorization field IDs must be unique')
	}

	const allowed = new Set(
		profile.fields.filter((field) => !field.public && field.shareable).map((field) => field.id),
	)
	for (const fieldId of requested) {
		if (typeof fieldId !== 'string' || !allowed.has(fieldId)) {
			throw new TypeError('Contact authorization contains an invalid private field ID')
		}
	}

	const requestedSet = new Set(requested)
	return profile.fields.filter((field) => requestedSet.has(field.id)).map((field) => field.id)
}

function decodeSigningSecret(value: string | undefined): Uint8Array {
	if (!value) {
		throw new VisitorAuthConfigurationError(
			'CONTACT_GRANT_SECRET must be a base64url-encoded secret',
		)
	}

	let secret: Uint8Array
	try {
		secret = base64url.decode(value)
	} catch {
		throw new VisitorAuthConfigurationError(
			'CONTACT_GRANT_SECRET must be a base64url-encoded secret',
		)
	}

	if (secret.byteLength < 32) {
		throw new VisitorAuthConfigurationError('CONTACT_GRANT_SECRET must decode to at least 32 bytes')
	}

	return secret
}
