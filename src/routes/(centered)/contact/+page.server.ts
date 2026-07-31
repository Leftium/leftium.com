import {
	formatContactFieldLabel,
	formatContactFieldValue,
	selectContactFields,
} from '$lib/contact/profile'

import { loadContactProfile } from './contact-profile.server'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = ({ setHeaders }) => {
	const profile = loadContactProfile()
	const fields = selectContactFields(profile, { mode: 'public' })
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
	})

	return {
		contact: {
			displayName: profile.displayName,
			fields,
			requestMethods: profile.requestMethods.map(({ label }) => ({ label })),
		},
	}
}
