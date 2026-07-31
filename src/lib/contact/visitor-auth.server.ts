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
const MAX_TOKEN_LENGTH = 16_384

export const CONTACT_GRANT_LIFETIME_DAYS = GRANT_MAX_AGE / (24 * 60 * 60)

export type ContactGrant = {
	token: string
	fieldIds: string[]
	expiresAt: number
}

export type VisitorFieldGrant = {
	fieldId: string
	expiresAt: number
}

export type VisitorSession = {
	token: string
	fieldGrants: VisitorFieldGrant[]
	expiresAt: number
}

export type VisitorAuthConfig = {
	signingSecret: Uint8Array
	secureCookies: boolean
}

export type VisitorAccess = {
	authorization: ContactAuthorization
	available: boolean
	fieldGrants: VisitorFieldGrant[]
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
): Promise<ContactGrant> {
	const authorizedFieldIds = validateAuthorizedFieldIds(profile, fieldIds)
	if (authorizedFieldIds.length === 0) {
		throw new TypeError('A contact grant must contain at least one private field')
	}

	const issuedAt = Math.floor(now.getTime() / 1000)
	const expiresAt = issuedAt + GRANT_MAX_AGE
	const token = await new SignJWT({
		token_type: GRANT_TOKEN_TYPE,
		profile_id: profile.id,
		profile_version: profile.version,
		field_ids: authorizedFieldIds,
	})
		.setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
		.setIssuer(TOKEN_ISSUER)
		.setAudience(GRANT_TOKEN_AUDIENCE)
		.setIssuedAt(issuedAt)
		.setExpirationTime(expiresAt)
		.sign(config.signingSecret)

	return { token, fieldIds: authorizedFieldIds, expiresAt }
}

export async function verifyContactGrantToken(
	token: unknown,
	config: VisitorAuthConfig,
	profile: ContactProfile,
	now = new Date(),
): Promise<ContactGrant | null> {
	const verified = await verifyToken(
		token,
		config,
		profile,
		GRANT_TOKEN_TYPE,
		GRANT_TOKEN_AUDIENCE,
		GRANT_MAX_AGE,
		now,
	)
	if (!verified) return null

	return { token: token as string, fieldIds: verified.fieldIds, expiresAt: verified.expiresAt }
}

export async function createVisitorSessionToken(
	config: VisitorAuthConfig,
	profile: ContactProfile,
	fieldGrants: Iterable<VisitorFieldGrant>,
	now = new Date(),
): Promise<VisitorSession> {
	const issuedAt = Math.floor(now.getTime() / 1000)
	const authorizedFieldGrants = validateFieldGrants(profile, fieldGrants, issuedAt)
	const expiresAt = Math.max(...authorizedFieldGrants.map((grant) => grant.expiresAt))
	if (expiresAt > issuedAt + GRANT_MAX_AGE) {
		throw new TypeError('Visitor authorization cannot outlive the grant lifetime')
	}

	const token = await new SignJWT({
		token_type: VISITOR_TOKEN_TYPE,
		profile_id: profile.id,
		profile_version: profile.version,
		field_grants: authorizedFieldGrants,
	})
		.setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
		.setIssuer(TOKEN_ISSUER)
		.setAudience(VISITOR_TOKEN_AUDIENCE)
		.setIssuedAt(issuedAt)
		.setExpirationTime(expiresAt)
		.sign(config.signingSecret)

	return { token, fieldGrants: authorizedFieldGrants, expiresAt }
}

export async function verifyVisitorSessionToken(
	token: unknown,
	config: VisitorAuthConfig,
	profile: ContactProfile,
	now = new Date(),
): Promise<VisitorSession | null> {
	if (typeof token !== 'string' || token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
		return null
	}

	try {
		const { payload } = await jwtVerify(token, config.signingSecret, {
			algorithms: ['HS256'],
			issuer: TOKEN_ISSUER,
			audience: VISITOR_TOKEN_AUDIENCE,
			typ: 'JWT',
			currentDate: now,
		})
		const nowSeconds = Math.floor(now.getTime() / 1000)
		if (
			payload.token_type !== VISITOR_TOKEN_TYPE ||
			payload.profile_id !== profile.id ||
			payload.profile_version !== profile.version ||
			!Number.isSafeInteger(payload.iat) ||
			!Number.isSafeInteger(payload.exp) ||
			(payload.iat as number) > nowSeconds ||
			(payload.exp as number) > (payload.iat as number) + GRANT_MAX_AGE ||
			!Array.isArray(payload.field_grants)
		) {
			return null
		}

		const allFieldGrants = validateFieldGrantClaims(
			profile,
			payload.field_grants,
			payload.iat as number,
			payload.exp as number,
		)
		const expiresAt = Math.max(...allFieldGrants.map((grant) => grant.expiresAt))
		if (expiresAt !== payload.exp) return null

		const fieldGrants = allFieldGrants.filter((grant) => grant.expiresAt > nowSeconds)
		if (fieldGrants.length === 0) return null

		return { token, fieldGrants, expiresAt }
	} catch {
		return null
	}
}

export async function resolveVisitorAccess(
	cookies: Cookies,
	profile: ContactProfile,
	now = new Date(),
): Promise<VisitorAccess> {
	let config: VisitorAuthConfig

	try {
		config = loadVisitorAuthConfig()
	} catch (error) {
		if (!(error instanceof VisitorAuthConfigurationError)) throw error
		clearVisitorSessionCookie(cookies)
		return { authorization: { mode: 'public' }, available: false, fieldGrants: [] }
	}

	const token = cookies.get(VISITOR_COOKIE_NAME)
	if (!token) return { authorization: { mode: 'public' }, available: true, fieldGrants: [] }

	const session = await verifyVisitorSessionToken(token, config, profile, now)
	if (!session) {
		clearVisitorSessionCookie(cookies, config.secureCookies)
		return { authorization: { mode: 'public' }, available: true, fieldGrants: [] }
	}

	return {
		authorization: { mode: 'visitor', fieldIds: session.fieldGrants.map(({ fieldId }) => fieldId) },
		available: true,
		fieldGrants: session.fieldGrants,
	}
}

export function setVisitorSessionCookie(
	cookies: Cookies,
	token: string,
	config: VisitorAuthConfig,
	expiresAt: number,
	now = new Date(),
): void {
	const maxAge = expiresAt - Math.floor(now.getTime() / 1000)
	if (maxAge <= 0 || maxAge > GRANT_MAX_AGE) {
		throw new TypeError('Visitor cookie expiration must be within the grant lifetime')
	}

	cookies.set(VISITOR_COOKIE_NAME, token, {
		httpOnly: true,
		secure: config.secureCookies,
		sameSite: 'lax',
		path: '/',
		maxAge,
	})
}

export function clearVisitorSessionCookie(cookies: Cookies, secureCookies = !dev): void {
	cookies.delete(VISITOR_COOKIE_NAME, { path: '/', secure: secureCookies })
}

async function verifyToken(
	token: unknown,
	config: VisitorAuthConfig,
	profile: ContactProfile,
	tokenType: string,
	audience: string,
	maxAge: number,
	now: Date,
): Promise<{ fieldIds: string[]; expiresAt: number } | null> {
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
		return validatedFieldIds.length === fieldIds.length
			? { fieldIds: validatedFieldIds, expiresAt: payload.exp as number }
			: null
	} catch {
		return null
	}
}

function validateFieldGrants(
	profile: ContactProfile,
	fieldGrants: Iterable<VisitorFieldGrant>,
	nowSeconds: number,
): VisitorFieldGrant[] {
	const requested = [...fieldGrants]
	if (requested.length === 0) {
		throw new TypeError('A visitor session must contain at least one field grant')
	}
	const fieldIds = requested.map(({ fieldId }) => fieldId)
	const authorizedFieldIds = validateAuthorizedFieldIds(profile, fieldIds)
	const expirations = new Map(requested.map(({ fieldId, expiresAt }) => [fieldId, expiresAt]))

	for (const expiresAt of expirations.values()) {
		if (!Number.isSafeInteger(expiresAt) || expiresAt <= nowSeconds) {
			throw new TypeError('Visitor authorization expiration must be in the future')
		}
	}

	return authorizedFieldIds.map((fieldId) => ({ fieldId, expiresAt: expirations.get(fieldId)! }))
}

function validateFieldGrantClaims(
	profile: ContactProfile,
	claims: unknown[],
	issuedAt: number,
	sessionExpiresAt: number,
): VisitorFieldGrant[] {
	const fieldGrants: VisitorFieldGrant[] = []
	for (const claim of claims) {
		if (
			typeof claim !== 'object' ||
			claim === null ||
			!('fieldId' in claim) ||
			!('expiresAt' in claim) ||
			typeof claim.fieldId !== 'string' ||
			!Number.isSafeInteger(claim.expiresAt)
		) {
			throw new TypeError('Visitor session contains an invalid field grant')
		}
		const expiresAt = claim.expiresAt as number
		if (expiresAt <= issuedAt || expiresAt > sessionExpiresAt) {
			throw new TypeError('Visitor session contains an invalid field grant expiration')
		}
		fieldGrants.push({ fieldId: claim.fieldId, expiresAt })
	}

	const authorizedFieldIds = validateAuthorizedFieldIds(
		profile,
		fieldGrants.map(({ fieldId }) => fieldId),
	)
	const grantsById = new Map(fieldGrants.map((grant) => [grant.fieldId, grant]))
	return authorizedFieldIds.map((fieldId) => grantsById.get(fieldId)!)
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
