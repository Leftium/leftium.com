import { describe, expect, it } from 'vitest'

import { parseContactProfileToml } from './profile'
import {
	buildContactFieldQrPayload,
	ContactFieldQrError,
	isContactFieldQrEligible,
} from './field-qr'

const profile = parseContactProfileToml(
	`
[profile]
name = "Example Person"
photo = "./photo.png"

[public]
email = "hello@example.com"
url = "https://example.com/profile?a=1&b=2"

[private.phone]
mobile = "+1 (651) 555-6789"

[private.address]
home = { street = "1988 Goodrich Ave", city = "St Paul", state = "MN", postal_code = "55105", country = "USA" }

[private.custom.bank]
"US account" = "Example Credit Union 123"
	`,
	{
		resolvePhoto: () => ({ base64: 'cGhvdG8=', mediaType: 'image/png' }),
	},
)

function field(id: string) {
	const result = profile.fields.find((candidate) => candidate.id === id)
	if (!result) throw new Error(`Missing test field ${id}`)
	return result
}

describe('buildContactFieldQrPayload', () => {
	it('uses native actionable links for email, phone, and URL fields', () => {
		expect(buildContactFieldQrPayload(field('public.email'))).toBe('mailto:hello@example.com')
		expect(buildContactFieldQrPayload(field('private.phone.mobile'))).toBe('tel:+16515556789')
		expect(buildContactFieldQrPayload(field('public.url'))).toBe(
			'https://example.com/profile?a=1&b=2',
		)
	})

	it('opens addresses as encoded Google Maps searches', () => {
		expect(buildContactFieldQrPayload(field('private.address.home'))).toBe(
			'https://www.google.com/maps/search/?api=1&query=1988%20Goodrich%20Ave%2C%20St%20Paul%2C%20MN%2C%2055105%2C%20USA',
		)
	})

	it('uses labeled plain text for custom fields', () => {
		expect(buildContactFieldQrPayload(field('private.custom.bank.US account'))).toBe(
			'US account: Example Credit Union 123',
		)
	})

	it('excludes identity and photo fields from individual QR actions', () => {
		expect(isContactFieldQrEligible(field('profile.name'))).toBe(false)
		expect(isContactFieldQrEligible(field('profile.photo'))).toBe(false)
		expect(() => buildContactFieldQrPayload(field('profile.photo'))).toThrow(ContactFieldQrError)
	})
})
