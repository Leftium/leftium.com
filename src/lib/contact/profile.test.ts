import { describe, expect, it } from 'vitest'

import {
	ContactProfileError,
	formatContactFieldLabel,
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
"Korea mobile" = "+82 10 5555 6789"

[private.address.korea]
street = "161 Sajik-ro, Jongno-gu"
city = "Seoul"
postal_code = "03045"
country = "South Korea"

[sets]
korea = ["phone.Korea mobile", "address.korea"]
business = ["email.work"]
everything = ["all"]
`

function parseProfile() {
	return parseContactProfileToml(profileToml, {
		resolvePhoto: () => ({ base64: 'cGhvdG8=', mediaType: 'image/png' }),
	})
}

describe('parseContactProfileToml', () => {
	it('parses an explicit QR address override only for custom fields', () => {
		const profile = parseContactProfileToml(`
[profile]
name = "Example Person"

[public]
email = "hello@example.com"

[private.custom]
bank = { value = "Bank account: Example Bank 123", vcard_property = "NOTE", qr_as_address = true }
`)

		expect(profile.fields.find(({ id }) => id === 'private.custom.bank')).toMatchObject({
			vcard: { property: 'NOTE' },
			qrAsAddress: true,
		})

		expect(() =>
			parseContactProfileToml(`
[profile]
name = "Example Person"

[public]
email = "hello@example.com"

[private.phone]
mobile = { value = "+1 212 555 6789", qr_as_address = true }
`),
		).toThrow(/qr_as_address is only valid for custom fields/)
	})

	it('expands custom bank labels and infers artifact and request behavior', () => {
		const profile = parseContactProfileToml(`
[profile]
name = "Example Person"

[public]
email = "hello@example.com"

[private.custom.bank]
"Korea account" = "Example Bank 123"
"US account" = "Example Credit Union 456"
`)

		expect(
			profile.fields.find(({ id }) => id === 'private.custom.bank.Korea account'),
		).toMatchObject({
			label: 'Korea account',
			value: 'Example Bank 123',
			vcard: { property: 'NOTE', value: 'Korea account: Example Bank 123' },
			qrAsAddress: true,
		})
		expect(profile.requestMethods).toContainEqual({
			id: 'bank',
			label: 'Bank',
			defaultFieldIds: ['private.custom.bank.Korea account', 'private.custom.bank.US account'],
		})
	})

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
			'private.phone.Korea mobile',
			'private.address.korea',
		])

		expect(profile.fields.find(({ id }) => id === 'private.email.work')).toMatchObject({
			label: 'Office email',
			link: 'mailto:person@work.example',
			vcard: { property: 'EMAIL', types: ['WORK'] },
		})
		expect(profile.fields.find(({ id }) => id === 'private.phone.Korea mobile')).toMatchObject({
			label: 'Korea mobile',
			link: 'tel:+821055556789',
			vcard: { property: 'TEL', types: ['CELL'] },
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
				fieldIds: [...publicIds, 'private.phone.Korea mobile', 'private.address.korea'],
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
					'private.phone.Korea mobile',
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
				defaultFieldIds: ['private.phone.Korea mobile'],
			},
			{
				id: 'address',
				label: 'Address',
				defaultFieldIds: ['private.address.korea'],
			},
		])
	})

	it('uses scalar phone keys as labels with an optional trimmed type prefix', () => {
		const profile = parseContactProfileToml(`
[profile]
name = "Example Person"

[public]
email = "hello@example.com"

[private.phone]
"Korea mobile" = "+82 10 5555 6789"
"fax:   Korea office" = "+82 2 5555 6789"
"Signal: support" = "+82 2 5555 6790"
`)

		expect(profile.fields.find(({ id }) => id === 'private.phone.Korea mobile')).toMatchObject({
			label: 'Korea mobile',
			vcard: { property: 'TEL', types: ['CELL'] },
		})
		expect(
			profile.fields.find(({ id }) => id === 'private.phone.fax:   Korea office'),
		).toMatchObject({
			label: 'Korea office',
			vcard: { property: 'TEL', types: ['FAX'] },
		})
		expect(profile.fields.find(({ id }) => id === 'private.phone.Signal: support')).toMatchObject({
			label: 'Signal: support',
			vcard: { property: 'TEL', types: ['CELL'] },
		})
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

	it('derives URL labels, vCard types, and separate request methods from scalar keys', () => {
		const profile = parseContactProfileToml(`
[profile]
name = "Example Person"

[public]
email = "hello@example.com"

[private.url]
Facebook = "https://facebook.example/example"
KakaoTalk = "https://open.kakao.example/example#Leftium"
docs = { value = "https://example.com/manual#installation", label = "Documentation", type = "Docs" }
`)
		const kakaotalk = profile.fields.find(({ id }) => id === 'private.url.KakaoTalk')
		const docs = profile.fields.find(({ id }) => id === 'private.url.docs')

		expect(kakaotalk).toMatchObject({
			label: 'KakaoTalk',
			value: 'https://open.kakao.example/example#Leftium',
			link: 'https://open.kakao.example/example#Leftium',
			vcard: { property: 'URL', types: ['KakaoTalk-Leftium'] },
		})
		expect(kakaotalk && formatContactFieldLabel(kakaotalk)).toBe('KakaoTalk (Leftium)')
		expect(docs && formatContactFieldLabel(docs)).toBe('Documentation')
		expect(docs).toMatchObject({
			value: 'https://example.com/manual#installation',
			vcard: { property: 'URL', types: ['Docs'] },
		})
		expect(profile.requestMethods).toEqual([
			{
				id: 'url.Facebook',
				label: 'Facebook',
				defaultFieldIds: ['private.url.Facebook'],
			},
			{
				id: 'url.KakaoTalk',
				label: 'KakaoTalk',
				defaultFieldIds: ['private.url.KakaoTalk'],
			},
			{
				id: 'url.docs',
				label: 'Documentation',
				defaultFieldIds: ['private.url.docs'],
			},
		])
	})

	it('requires scalar named URLs to be absolute', () => {
		expect(() =>
			parseContactProfileToml(`
[profile]
name = "Example Person"

[public]
email = "hello@example.com"

[private.url]
KakaoTalk = "not-an-absolute-url#Leftium"
`),
		).toThrow(/must be an absolute URL/)
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
	it('filters public, visitor, admin, and requested selections', () => {
		const profile = parseProfile()
		const publicIds = selectContactFields(profile, { mode: 'public' }).map(({ id }) => id)
		expect(publicIds).toEqual(['profile.name', 'profile.photo', 'public.email', 'public.url'])

		const visitorIds = selectContactFields(profile, {
			mode: 'visitor',
			fieldIds: ['private.phone.Korea mobile', 'private.unknown'],
		}).map(({ id }) => id)
		expect(visitorIds).toEqual([...publicIds, 'private.phone.Korea mobile'])

		expect(selectContactFields(profile, { mode: 'admin' })).toHaveLength(profile.fields.length)

		const requestedIds = selectContactFields(profile, { mode: 'admin' }, [
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
