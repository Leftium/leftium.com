import qrcode from 'qrcode-generator'

import type { ContactAddress, ContactField, ContactPhoto } from './types'

export type BuildVCardOptions = {
	includePhoto?: boolean
}

export class ContactQrError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options)
		this.name = 'ContactQrError'
	}
}

export function buildVCard(
	fields: ContactField[],
	{ includePhoto = true }: BuildVCardOptions = {},
): string {
	const name = fields.find((field) => field.kind === 'name')
	if (!name || typeof name.value !== 'string') {
		throw new Error('A name field is required to build a vCard')
	}

	const lines = [
		'BEGIN:VCARD',
		'VERSION:3.0',
		`N:;${escapeVCardText(name.value)};;;`,
		`FN:${escapeVCardText(name.value)}`,
	]

	for (const field of fields) {
		if (field.kind === 'name' || (!includePhoto && field.kind === 'photo')) continue
		lines.push(serializeField(field))
	}

	lines.push('END:VCARD')
	return `${lines.flatMap(foldVCardLine).join('\r\n')}\r\n`
}

export function buildVCardQrSvg(vcard: string): string {
	try {
		const qr = qrcode(0, 'L')
		qr.addData(vcard)
		qr.make()
		return qr.createSvgTag({ cellSize: 4, margin: 0 })
	} catch (error) {
		throw new ContactQrError(
			'The selected contact details are too large to fit in a QR code. Select fewer fields.',
			{ cause: error },
		)
	}
}

export function contactFilename(displayName: string, suffix: string): string {
	const slug =
		displayName
			.normalize('NFKD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '') || 'contact'
	return `${slug}${suffix}`
}

function serializeField(field: ContactField): string {
	const parameters = field.vcard.types?.length
		? `;TYPE=${field.vcard.types.map(escapeParameter).join(',')}`
		: ''

	if (field.kind === 'address') {
		const address = field.value as ContactAddress
		const components = [
			address.poBox,
			address.extended,
			address.street,
			address.city,
			address.region,
			address.postalCode,
			address.country,
		]
		return `${field.vcard.property}${parameters}:${components.map((value) => escapeVCardText(value ?? '')).join(';')}`
	}

	if (field.kind === 'photo') {
		const photo = field.value as ContactPhoto
		const type = photo.mediaType.split('/')[1]?.toUpperCase()
		if (!type) throw new Error(`Unsupported photo media type "${photo.mediaType}"`)
		return `${field.vcard.property};ENCODING=b;TYPE=${escapeParameter(type)}:${photo.base64}`
	}

	if (typeof field.value !== 'string') {
		throw new Error(`Field "${field.id}" has an unsupported vCard value`)
	}

	return `${field.vcard.property}${parameters}:${escapeVCardText(field.value)}`
}

function escapeVCardText(value: string): string {
	return value
		.replace(/\\/g, '\\\\')
		.replace(/\r\n|\r|\n/g, '\\n')
		.replace(/;/g, '\\;')
		.replace(/,/g, '\\,')
}

function escapeParameter(value: string): string {
	return value.replace(/[^A-Za-z0-9-]/g, '')
}

function foldVCardLine(line: string): string[] {
	const encoder = new TextEncoder()
	const chunks: string[] = []
	let chunk = ''
	let byteLimit = 75

	for (const character of line) {
		const candidate = `${chunk}${character}`
		if (encoder.encode(candidate).length > byteLimit && chunk) {
			chunks.push(chunk)
			chunk = character
			byteLimit = 74
		} else {
			chunk = candidate
		}
	}

	chunks.push(chunk)
	return chunks.map((value, index) => (index === 0 ? value : ` ${value}`))
}
