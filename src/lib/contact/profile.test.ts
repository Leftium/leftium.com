import { describe, expect, it } from 'vitest'

import {
	ContactProfileError,
	formatContactFieldValue,
	parseContactProfileToml,
	selectContactFields,
} from './profile'

const profileToml = `
[profile]
name = "Example Person"
photo = "./photo.png"

[public]
email = "hello@example.com"
url = "https://example.com"

[private.email]
personal = "person@example.net"
work = { value = "person@work.example", label = "Office email", type = "work" }

[private.phone]
korea = "+82 10 5555 6789"

[private.address.korea]
street = "161 Sajik-ro, Jongno-gu"
city = "Seoul"
postal_code = "03045"
country = "South Korea"

[sets]
korea = ["phone.korea", "address.korea"]
business = ["email.work"]
everything = ["all"]
`

function parseProfile() {
	return parseContactProfileToml(profileToml, {
		resolvePhoto: () => ({ base64: 'cGhvdG8=', mediaType: 'image/png' }),
	})
}

describe('parseContactProfileToml', () => {
	it('expands terse fields, sets, requests, and profile defaults', () => {
		const profile = parseProfile()

		expect(profile).toMatchObject({
			id: 'default',
			version: 1,
			displayName: 'Example Person',
			requestEmail: 'hello@example.com',
		})
		expect(profile.fields.map(({ id }) => id)).toEqual([
			'profile.name',
			'profile.photo',
			'public.email',
			'public.url',
			'private.email.personal',
			'private.email.work',
			'private.phone.korea',
			'private.address.korea',
		])

		expect(profile.fields.find(({ id }) => id === 'private.email.work')).toMatchObject({
			label: 'Office email',
			link: 'mailto:person@work.example',
			vcard: { property: 'EMAIL', types: ['WORK'] },
		})
		expect(profile.fields.find(({ id }) => id === 'private.phone.korea')).toMatchObject({
			label: 'Korea phone',
			link: 'tel:+821055556789',
			vcard: { property: 'TEL' },
		})
		expect(profile.fields.find(({ id }) => id === 'profile.photo')?.value).toEqual({
			base64: 'cGhvdG8=',
			mediaType: 'image/png',
		})

		const publicIds = ['profile.name', 'profile.photo', 'public.email', 'public.url']
		expect(profile.sets).toEqual([
			{
				id: 'korea',
				label: 'Korea',
				fieldIds: [...publicIds, 'private.phone.korea', 'private.address.korea'],
			},
			{
				id: 'business',
				label: 'Business',
				fieldIds: [...publicIds, 'private.email.work'],
			},
			{
				id: 'everything',
				label: 'Everything',
				fieldIds: [
					...publicIds,
					'private.email.personal',
					'private.email.work',
					'private.phone.korea',
					'private.address.korea',
				],
			},
		])
		expect(profile.requestMethods).toEqual([
			{
				id: 'email',
				label: 'Email',
				defaultFieldIds: ['private.email.personal', 'private.email.work'],
			},
			{
				id: 'phone',
				label: 'Phone',
				defaultFieldIds: ['private.phone.korea'],
			},
			{
				id: 'address',
				label: 'Address',
				defaultFieldIds: ['private.address.korea'],
			},
		])
	})

	it('applies request overrides without duplicating inferred methods', () => {
		const profile = parseContactProfileToml(
			`
[profile]
name = "Example Person"

[public]
email = "hello@example.com"

[private.phone]
home = "+1 212 555 6789"
work = "+1 646 555 6789"

[requests.phone]
label = "Call me"
fields = ["phone.work"]
			`,
		)

		expect(profile.requestMethods).toEqual([
			{
				id: 'phone',
				label: 'Call me',
				defaultFieldIds: ['private.phone.work'],
			},
		])
	})

	it('rejects ambiguous request email and unknown set references', () => {
		expect(() =>
			parseContactProfileToml(`
[profile]
name = "Example Person"

[public.email]
personal = "one@example.com"
work = "two@example.com"
			`),
		).toThrow(ContactProfileError)

		expect(() =>
			parseContactProfileToml(`
[profile]
name = "Example Person"

[public]
email = "hello@example.com"

[sets]
missing = ["phone.unknown"]
			`),
		).toThrow(/unknown private field reference/)
	})
})

describe('selectContactFields', () => {
	it('filters public, visitor, owner, and requested selections', () => {
		const profile = parseProfile()
		const publicIds = selectContactFields(profile, { mode: 'public' }).map(({ id }) => id)
		expect(publicIds).toEqual(['profile.name', 'profile.photo', 'public.email', 'public.url'])

		const visitorIds = selectContactFields(profile, {
			mode: 'visitor',
			fieldIds: ['private.phone.korea', 'private.unknown'],
		}).map(({ id }) => id)
		expect(visitorIds).toEqual([...publicIds, 'private.phone.korea'])

		expect(selectContactFields(profile, { mode: 'owner' })).toHaveLength(profile.fields.length)

		const requestedIds = selectContactFields(profile, { mode: 'owner' }, [
			'private.email.work',
		]).map(({ id }) => id)
		expect(requestedIds).toEqual(['profile.name', 'private.email.work'])
	})

	it('formats structured addresses for display', () => {
		const address = parseProfile().fields.find(({ id }) => id === 'private.address.korea')
		expect(address && formatContactFieldValue(address)).toBe(
			'161 Sajik-ro, Jongno-gu, Seoul, 03045, South Korea',
		)
	})
})
