import {
	formatContactFieldLabel,
	formatContactFieldValue,
	selectContactFields,
} from '$lib/contact/profile'
import {
	createVisitorSessionToken,
	loadVisitorAuthConfig,
	resolveVisitorAccess,
	setVisitorSessionCookie,
	verifyContactGrantToken,
	VisitorAuthConfigurationError,
} from '$lib/contact/visitor-auth.server'
import { fail } from '@sveltejs/kit'

import { loadContactProfile } from './contact-profile.server'

import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ cookies, setHeaders }) => {
	const profile = loadContactProfile()
	const visitorAccess = await resolveVisitorAccess(cookies, profile)
	const fields = selectContactFields(profile, visitorAccess.authorization)
		.filter(
			(field) =>
				field.kind !== 'name' &&
				(field.kind !== 'url' || (!field.public && Boolean(field.vcard.types?.length))),
		)
		.map((field) => {
			const contactUrl = field.kind === 'url' && !field.public && Boolean(field.vcard.types?.length)
			return {
				id: field.id,
				label: formatContactFieldLabel(field),
				value:
					field.kind === 'photo'
						? 'Included in downloaded vCard'
						: contactUrl
							? 'Open'
							: formatContactFieldValue(field),
				href: field.link,
			}
		})

	setHeaders({
		'Cache-Control': 'private, no-store',
		'Referrer-Policy': 'no-referrer',
		Vary: 'Cookie',
	})

	return {
		contact: {
			displayName: profile.displayName,
			granted: visitorAccess.authorization.mode === 'visitor',
			fields,
			requestMethods: profile.requestMethods.map(({ label }) => ({ label })),
		},
	}
}

export const actions = {
	claimGrant: async ({ cookies, request }) => {
		const profile = loadContactProfile()
		const formData = await request.formData()
		const submittedToken = formData.get('token')
		let config

		try {
			config = loadVisitorAuthConfig()
		} catch (error) {
			if (!(error instanceof VisitorAuthConfigurationError)) throw error
			return fail(503, { action: 'claimGrant', unavailable: true })
		}

		const grantedFieldIds = await verifyContactGrantToken(submittedToken, config, profile)
		if (!grantedFieldIds) {
			return fail(400, { action: 'claimGrant', invalid: true })
		}

		const currentAccess = await resolveVisitorAccess(cookies, profile)
		const currentFieldIds =
			currentAccess.authorization.mode === 'visitor'
				? [...currentAccess.authorization.fieldIds]
				: []
		const sessionToken = await createVisitorSessionToken(
			config,
			profile,
			new Set([...currentFieldIds, ...grantedFieldIds]),
		)
		setVisitorSessionCookie(cookies, sessionToken, config)

		return { action: 'claimGrant', granted: true }
	},
} satisfies Actions
