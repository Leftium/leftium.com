import { formatContactFieldValue, selectContactFields } from '$lib/contact/profile'

import { loadContactProfile } from './contact-profile.server'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ setHeaders }) => {
	const profile = loadContactProfile()
	const fields = selectContactFields(profile, { mode: 'public' })
		.filter((field) => !['name', 'photo'].includes(field.kind))
		.map((field) => ({
			id: field.id,
			label: field.label,
			value: formatContactFieldValue(field),
			href: field.link,
		}))

	setHeaders({
		'Cache-Control': 'private, no-store',
		'Referrer-Policy': 'no-referrer',
		Vary: 'Cookie',
	})

	return {
		contact: {
			displayName: profile.displayName,
			fields,
			requestMethods: profile.requestMethods.map(({ id, label }) => ({ id, label })),
		},
	}
}
