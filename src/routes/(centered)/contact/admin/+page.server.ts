import {
	ADMIN_BOOTSTRAP_LIFETIME_MINUTES,
	AdminAuthConfigurationError,
	clearAdminSessionCookie,
	createAdminBootstrapToken,
	createAdminSessionToken,
	loadAdminAuthConfig,
	resolveAdminAccess,
	setAdminSessionCookie,
	verifyAdminAccessKey,
	verifyAdminBootstrapToken,
} from '$lib/contact/admin-auth.server'
import { formatContactFieldValue, selectContactFields } from '$lib/contact/profile'
import { buildQrSvg } from '$lib/qr'
import { resolve } from '$app/paths'
import { fail, redirect } from '@sveltejs/kit'

import { loadContactProfile } from '../contact-profile.server'

import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ cookies, setHeaders }) => {
	const profile = loadContactProfile()
	const adminAccess = await resolveAdminAccess(cookies)
	const isAdmin = adminAccess.authorization.mode === 'admin'
	const fields = isAdmin
		? selectContactFields(profile, adminAccess.authorization)
				.filter((field) => field.kind !== 'name')
				.map((field) => ({
					id: field.id,
					label: field.label,
					value:
						field.kind === 'photo'
							? 'Include photo in downloaded vCard'
							: formatContactFieldValue(field),
					public: field.public,
					shareable: field.shareable,
				}))
		: []

	setHeaders({
		'Cache-Control': 'private, no-store',
		'Referrer-Policy': 'no-referrer',
		Vary: 'Cookie',
	})

	return {
		contact: {
			displayName: profile.displayName,
			mode: isAdmin ? ('admin' as const) : ('public' as const),
			adminAccessAvailable: adminAccess.available,
			fields,
			sets: isAdmin ? profile.sets : [],
			defaultFieldIds: isAdmin
				? fields.filter((field) => field.public && field.shareable).map((field) => field.id)
				: [],
			allFieldIds: isAdmin
				? fields.filter((field) => field.shareable).map((field) => field.id)
				: [],
		},
	}
}

export const actions = {
	login: async ({ cookies, request }) => {
		const formData = await request.formData()
		const accessKey = formData.get('accessKey')
		let config

		try {
			config = loadAdminAuthConfig()
		} catch (error) {
			if (!(error instanceof AdminAuthConfigurationError)) throw error
			return fail(503, { action: 'login', unavailable: true })
		}

		if (!(await verifyAdminAccessKey(accessKey, config))) {
			return fail(400, { action: 'login', invalid: true })
		}

		const token = await createAdminSessionToken(config)
		setAdminSessionCookie(cookies, token, config)
		return { action: 'login' }
	},
	createLoginLink: async ({ cookies, url }) => {
		const adminAccess = await resolveAdminAccess(cookies)
		if (adminAccess.authorization.mode !== 'admin') {
			return fail(401, { action: 'createLoginLink', unauthorized: true })
		}

		const config = loadAdminAuthConfig()
		const token = await createAdminBootstrapToken(config)
		const loginUrl = new URL(resolve('/contact/admin'), url.origin)
		loginUrl.hash = new URLSearchParams({ login: token }).toString()
		const loginLink = loginUrl.toString()
		const loginQrSvg = buildQrSvg(loginLink)

		return {
			action: 'createLoginLink',
			loginLink,
			loginQrDataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(loginQrSvg)}`,
			expiresInMinutes: ADMIN_BOOTSTRAP_LIFETIME_MINUTES,
		}
	},
	claim: async ({ cookies, request }) => {
		const formData = await request.formData()
		const token = formData.get('token')
		let config

		try {
			config = loadAdminAuthConfig()
		} catch (error) {
			if (!(error instanceof AdminAuthConfigurationError)) throw error
			return fail(503, { action: 'claim', unavailable: true })
		}

		if (!(await verifyAdminBootstrapToken(token, config))) {
			return fail(400, { action: 'claim', invalid: true })
		}

		const sessionToken = await createAdminSessionToken(config)
		setAdminSessionCookie(cookies, sessionToken, config)
		redirect(303, `${resolve('/contact/admin')}#signed-in`)
	},
	logout: ({ cookies }) => {
		clearAdminSessionCookie(cookies)
		redirect(303, resolve('/contact'))
	},
} satisfies Actions
