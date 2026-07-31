import { formatContactFieldValue, selectContactFields } from '$lib/contact/profile'

import { loadContactProfile } from './contact-profile.server'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = ({ setHeaders }) => {
	const profile = loadContactProfile()
	const fields = selectContactFields(profile, { mode: 'public' })
		.filter((field) => field.kind !== 'name' && field.kind !== 'url')
		.map((field) => ({
			id: field.id,
			label: field.label,
			value:
				field.kind === 'photo' ? 'Included in downloaded vCard' : formatContactFieldValue(field),
			href: field.link,
		}))

	setHeaders({
		'Cache-Control': 'private, no-store',
		'Referrer-Policy': 'no-referrer',
	})

	return {
		contact: {
			displayName: profile.displayName,
			fields,
			requestMethods: profile.requestMethods
				.filter(({ id }) => id !== 'url')
				.map(({ label }) => ({ label })),
		},
	}
}
