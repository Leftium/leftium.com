import { formatContactFieldValue } from './profile'

import type { ContactField } from './types'

export class ContactFieldQrError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'ContactFieldQrError'
	}
}

export function isContactFieldQrEligible(field: ContactField): boolean {
	return field.shareable && field.kind !== 'name' && field.kind !== 'photo'
}

export function buildContactFieldQrPayload(field: ContactField): string {
	if (!isContactFieldQrEligible(field)) {
		throw new ContactFieldQrError(`Field "${field.id}" does not support an individual QR code`)
	}

	if (field.kind === 'email' || field.kind === 'phone' || field.kind === 'url') {
		if (!field.link) {
			throw new ContactFieldQrError(`Field "${field.id}" does not have a QR link`)
		}
		return field.link
	}

	if (field.kind === 'address') {
		return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
			formatContactFieldValue(field),
		)}`
	}

	if (field.kind === 'custom') {
		if (field.link) return field.link
		if (typeof field.value !== 'string') {
			throw new ContactFieldQrError(`Field "${field.id}" has an unsupported QR value`)
		}
		return field.vcard.value ?? `${field.label}: ${field.value}`
	}

	throw new ContactFieldQrError(`Field "${field.id}" does not support an individual QR code`)
}
