import { describe, expect, it } from 'vitest'

import { parseContactProfileToml, selectContactFields } from './profile'
import { buildVCard, buildVCardQrSvg, contactFilename } from './vcard'

const profile = parseContactProfileToml(
	`
[profile]
name = "Example Person"
photo = "./photo.png"

[public]
email = "hello@example.com"
url = "https://example.com/about?a=1,b=2"

[public.address]
street = "123 Example St; Suite 4"
city = "Example City"
country = "Example Country"

[private.custom]
bank = { value = "Bank account: Example Bank 123", label = "Bank account", vcard_property = "NOTE", qr_as_address = true }
	`,
	{
		resolvePhoto: () => ({
			base64: 'a'.repeat(180),
			mediaType: 'image/png',
		}),
	},
)

describe('buildVCard', () => {
	it('serializes compatible CRLF output with an embedded, folded photo', () => {
		const vcard = buildVCard(selectContactFields(profile, { mode: 'public' }))

		expect(vcard).toContain('BEGIN:VCARD\r\nVERSION:3.0\r\n')
		expect(vcard).toContain('N:;Example Person;;;\r\n')
		expect(vcard).toContain('FN:Example Person\r\n')
		expect(vcard).toContain('EMAIL:hello@example.com\r\n')
		expect(vcard).toContain('URL:https://example.com/about?a=1\\,b=2\r\n')
		expect(vcard).toContain('ADR:;;123 Example St\\; Suite 4;Example City;;;Example Country\r\n')
		expect(vcard).toContain('PHOTO;ENCODING=b;TYPE=PNG:')
		expect(vcard).toMatch(/\r\n [a]+\r\n/)
		expect(vcard).not.toMatch(/(?<!\r)\n/)
		expect(vcard).toMatch(/END:VCARD\r\n$/)
	})

	it('omits photo structurally for QR data', () => {
		const fields = selectContactFields(profile, { mode: 'public' })
		const vcard = buildVCard(fields, { includePhoto: false, representation: 'qr' })

		expect(vcard).not.toContain('PHOTO')
		expect(buildVCardQrSvg(vcard)).toContain('<svg')
	})

	it('keeps a standard bank note in downloads and uses an address in QR vCards', () => {
		const fields = selectContactFields(profile, { mode: 'admin' }, ['private.custom.bank'])
		const downloadedVcard = buildVCard(fields)
		const qrVcard = buildVCard(fields, { includePhoto: false, representation: 'qr' })

		expect(downloadedVcard).toContain('NOTE:Bank account: Example Bank 123\r\n')
		expect(downloadedVcard).not.toContain('ADR;TYPE=OTHER')
		expect(qrVcard).toContain('ADR;TYPE=OTHER:;;Bank account: Example Bank 123;;;;\r\n')
		expect(qrVcard).not.toContain('NOTE:Bank account')
		expect(buildVCardQrSvg(qrVcard)).toContain('<svg')
	})
})

describe('contactFilename', () => {
	it('creates a stable ASCII filename', () => {
		expect(contactFilename('Jöhn Kim Murphy', '.vcf')).toBe('john-kim-murphy.vcf')
	})
})
