import {
	formatContactFieldLabel,
	formatContactFieldValue,
	selectContactFields,
} from '$lib/contact/profile'
import { buildContactRequestTemplate } from '$lib/contact/request'
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

import type { ContactField } from '$lib/contact/types'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ cookies, setHeaders }) => {
	const profile = loadContactProfile()
	const visitorAccess = await resolveVisitorAccess(cookies, profile)
	const authorizedFields = selectContactFields(profile, visitorAccess.authorization)
	const authorizedFieldIds = new Set(authorizedFields.map(({ id }) => id))
	const fields = authorizedFields.filter(isContactPageField).map((field) => {
		const contactUrl = field.kind === 'url' && !field.public
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
	const unavailableFields = profile.fields
		.filter(
			(field) =>
				isContactPageField(field) &&
				!field.public &&
				field.shareable &&
				!authorizedFieldIds.has(field.id),
		)
		.map(({ label }) => ({ label }))
	const request =
		profile.requestMethods.length === 0
			? null
			: buildContactRequestTemplate(
					profile.displayName,
					profile.requestEmail,
					profile.requestMethods.map(({ label }) => label),
				)

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
			unavailableFields,
			request,
		},
	}
}

function isContactPageField(field: ContactField): boolean {
	return field.kind !== 'name' && field.kind !== 'photo' && !(field.public && field.kind === 'url')
}

export const actions = {
	claimGrant: async ({ cookies, request }) => {
		const profile = loadContactProfile()
		const formData = await request.formData()
		const submittedToken = formData.get('token')
		const now = new Date()
		let config

		try {
			config = loadVisitorAuthConfig()
		} catch (error) {
			if (!(error instanceof VisitorAuthConfigurationError)) throw error
			return fail(503, { action: 'claimGrant', unavailable: true })
		}

		const grant = await verifyContactGrantToken(submittedToken, config, profile, now)
		if (!grant) {
			return fail(400, { action: 'claimGrant', invalid: true })
		}

		const currentAccess = await resolveVisitorAccess(cookies, profile, now)
		const fieldExpirations = new Map(
			currentAccess.fieldGrants.map(({ fieldId, expiresAt }) => [fieldId, expiresAt]),
		)
		for (const fieldId of grant.fieldIds) {
			fieldExpirations.set(fieldId, Math.max(fieldExpirations.get(fieldId) ?? 0, grant.expiresAt))
		}
		const session = await createVisitorSessionToken(
			config,
			profile,
			[...fieldExpirations].map(([fieldId, expiresAt]) => ({ fieldId, expiresAt })),
			now,
		)
		setVisitorSessionCookie(cookies, session.token, config, session.expiresAt, now)

		return { action: 'claimGrant', granted: true }
	},
} satisfies Actions
