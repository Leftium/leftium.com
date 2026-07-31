import { parse } from 'smol-toml'

import type {
	ContactAddress,
	ContactAuthorization,
	ContactField,
	ContactFieldKind,
	ContactPhotoSource,
	ContactProfile,
	ContactProfileParserOptions,
	ContactRequestMethod,
	ContactSet,
} from './types'

type TomlRecord = Record<string, unknown>

const standardKinds = ['email', 'phone', 'url', 'address'] as const
const supportedKinds = [...standardKinds, 'custom'] as const
const addressKeys = new Set([
	'po_box',
	'extended',
	'street',
	'city',
	'region',
	'state',
	'postal_code',
	'country',
])
const knownVCardTypes = new Map([
	['home', 'HOME'],
	['work', 'WORK'],
	['cell', 'CELL'],
	['mobile', 'CELL'],
	['fax', 'FAX'],
])

export class ContactProfileError extends Error {
	constructor(message: string) {
		super(`Invalid contact profile: ${message}`)
		this.name = 'ContactProfileError'
	}
}

export function parseContactProfileToml(
	source: string,
	options: ContactProfileParserOptions = {},
): ContactProfile {
	let document: TomlRecord

	try {
		document = parse(source) as TomlRecord
	} catch (error) {
		throw new ContactProfileError(
			`TOML could not be parsed${error instanceof Error ? `: ${error.message}` : ''}`,
		)
	}

	const profileSource = expectRecord(document.profile, 'profile')
	const displayName = expectNonEmptyString(profileSource.name, 'profile.name')
	const id =
		profileSource.id === undefined
			? 'default'
			: expectNonEmptyString(profileSource.id, 'profile.id')
	const version =
		profileSource.version === undefined
			? 1
			: expectPositiveInteger(profileSource.version, 'profile.version')

	const fields: ContactField[] = [
		{
			id: 'profile.name',
			kind: 'name',
			label: 'Name',
			value: displayName,
			public: true,
			shareable: true,
			requiredForVCard: true,
			vcard: { property: 'FN' },
		},
	]

	if (profileSource.photo !== undefined) {
		fields.push(parsePhotoField(profileSource.photo, options.resolvePhoto))
	}

	for (const visibility of ['public', 'private'] as const) {
		const namespace = document[visibility]
		if (namespace === undefined) continue
		parseNamespace(expectRecord(namespace, visibility), visibility, fields)
	}

	assertUniqueIds(
		fields.map((field) => field.id),
		'field',
	)

	const requestEmail = resolveRequestEmail(profileSource.request_email, fields)
	const sets = parseSets(document.sets, fields)
	const requestMethods = parseRequestMethods(document.requests, fields)

	return {
		id,
		version,
		displayName,
		requestEmail,
		fields,
		sets,
		requestMethods,
	}
}

export function selectContactFields(
	profile: ContactProfile,
	authorization: ContactAuthorization,
	requestedIds?: Iterable<string>,
): ContactField[] {
	const knownIds = new Set(profile.fields.map((field) => field.id))
	const requiredIds = new Set(
		profile.fields.filter((field) => field.requiredForVCard).map((field) => field.id),
	)
	const authorizedIds = new Set<string>()

	for (const field of profile.fields) {
		if (field.public || authorization.mode === 'admin') authorizedIds.add(field.id)
	}

	if (authorization.mode === 'visitor') {
		for (const id of authorization.fieldIds) {
			if (!knownIds.has(id)) continue
			const field = profile.fields.find((candidate) => candidate.id === id)
			if (field && !field.public && field.shareable) authorizedIds.add(id)
		}
	}

	if (requestedIds === undefined) {
		return profile.fields.filter((field) => authorizedIds.has(field.id))
	}

	const requested = new Set(requestedIds)
	for (const id of requested) {
		if (!knownIds.has(id)) throw new ContactProfileError(`unknown requested field "${id}"`)
	}
	for (const id of requiredIds) requested.add(id)

	return profile.fields.filter((field) => requested.has(field.id) && authorizedIds.has(field.id))
}

export function formatContactFieldValue(field: ContactField): string {
	if (typeof field.value === 'string') return field.value
	if (field.kind !== 'address') return ''

	const address = field.value as ContactAddress
	return [
		address.street,
		address.extended,
		address.city,
		address.region,
		address.postalCode,
		address.country,
	]
		.filter(Boolean)
		.join(', ')
}

export function formatContactFieldLabel(field: ContactField): string {
	const username = inferUrlUsername(field)
	return username ? `${field.label} (${username})` : field.label
}

function parseNamespace(
	namespace: TomlRecord,
	visibility: 'public' | 'private',
	fields: ContactField[],
): void {
	for (const [kind, value] of Object.entries(namespace)) {
		if (!supportedKinds.includes(kind as (typeof supportedKinds)[number])) {
			throw new ContactProfileError(`${visibility}.${kind} uses an unsupported field kind`)
		}
		parseKind(kind as (typeof supportedKinds)[number], value, visibility, fields)
	}
}

function parseKind(
	kind: (typeof supportedKinds)[number],
	source: unknown,
	visibility: 'public' | 'private',
	fields: ContactField[],
): void {
	const baseId = `${visibility}.${kind}`

	if (
		typeof source === 'string' ||
		isInlineField(source) ||
		(kind === 'address' && isAddress(source))
	) {
		fields.push(parseField(baseId, kind, undefined, source, visibility === 'public'))
		return
	}

	const namedFields = expectRecord(source, baseId)
	if (Object.keys(namedFields).length === 0) {
		throw new ContactProfileError(`${baseId} must not be empty`)
	}

	for (const [alias, value] of Object.entries(namedFields)) {
		if (kind === 'custom' && alias === 'bank' && isRecord(value) && !isInlineField(value)) {
			parseBankFields(value, `${baseId}.bank`, visibility === 'public', fields)
			continue
		}
		fields.push(parseField(`${baseId}.${alias}`, kind, alias, value, visibility === 'public'))
	}
}

function parseBankFields(
	source: unknown,
	baseId: string,
	isPublic: boolean,
	fields: ContactField[],
): void {
	const namedFields = expectRecord(source, baseId)
	if (Object.keys(namedFields).length === 0) {
		throw new ContactProfileError(`${baseId} must not be empty`)
	}

	for (const [alias, sourceValue] of Object.entries(namedFields)) {
		const label = expectNonEmptyString(alias.trim(), `${baseId}.${alias} key`)
		const value = expectNonEmptyString(sourceValue, `${baseId}.${alias}`)
		fields.push({
			id: `${baseId}.${alias}`,
			kind: 'custom',
			label,
			value,
			public: isPublic,
			shareable: true,
			vcard: {
				property: 'NOTE',
				value: `${label}: ${value}`,
			},
			qrAsAddress: true,
		})
	}
}

function parseField(
	id: string,
	kind: (typeof supportedKinds)[number],
	alias: string | undefined,
	source: unknown,
	isPublic: boolean,
): ContactField {
	const namedUrlShorthand =
		kind === 'url' && !isPublic && alias !== undefined && typeof source === 'string'
	const namedPhoneShorthand = kind === 'phone' && alias !== undefined && typeof source === 'string'
	const phoneShorthand = namedPhoneShorthand ? parsePhoneShorthand(alias, `${id} key`) : undefined
	const fieldSource = typeof source === 'string' ? { value: source } : expectRecord(source, id)
	const label = namedUrlShorthand
		? alias
		: phoneShorthand
			? phoneShorthand.label
			: fieldSource.label === undefined
				? inferLabel(alias, kind)
				: expectNonEmptyString(fieldSource.label, `${id}.label`)
	const shareable =
		fieldSource.shareable === undefined
			? true
			: expectBoolean(fieldSource.shareable, `${id}.shareable`)
	const explicitTypeSource =
		fieldSource.type === undefined
			? undefined
			: expectNonEmptyString(fieldSource.type, `${id}.type`)
	const explicitType = explicitTypeSource
		? (knownVCardTypes.get(explicitTypeSource.toLowerCase()) ??
			normalizeVCardTypeToken(explicitTypeSource, `${id}.type`))
		: undefined
	const inferredType = alias ? knownVCardTypes.get(alias.toLowerCase()) : undefined
	const shorthandType = namedUrlShorthand
		? normalizeVCardTypeToken(alias, `${id} key`)
		: phoneShorthand?.type
	const shorthandUsername =
		namedUrlShorthand && typeof source === 'string'
			? parseUrlFragmentUsername(source, `${id}.value`)
			: undefined
	const usernameType = shorthandUsername
		? normalizeVCardTypeToken(shorthandUsername, `${id}.value fragment`)
		: undefined
	const baseType = explicitType ?? shorthandType ?? inferredType
	const types = baseType ? [`${baseType}${usernameType ? `-${usernameType}` : ''}`] : undefined
	const qrAsAddress =
		fieldSource.qr_as_address === undefined
			? false
			: expectBoolean(fieldSource.qr_as_address, `${id}.qr_as_address`)

	if (kind === 'address') {
		if (qrAsAddress) {
			throw new ContactProfileError(`${id}.qr_as_address is only valid for custom fields`)
		}
		const address = parseAddress(fieldSource, id)
		return {
			id,
			kind,
			label,
			value: address,
			public: isPublic,
			shareable,
			vcard: { property: 'ADR', types },
		}
	}

	if (qrAsAddress && kind !== 'custom') {
		throw new ContactProfileError(`${id}.qr_as_address is only valid for custom fields`)
	}

	const value = expectNonEmptyString(fieldSource.value, `${id}.value`)
	const property =
		fieldSource.vcard_property === undefined
			? inferVCardProperty(kind)
			: expectNonEmptyString(fieldSource.vcard_property, `${id}.vcard_property`).toUpperCase()
	const link =
		fieldSource.link === undefined
			? inferLink(kind, value)
			: expectNonEmptyString(fieldSource.link, `${id}.link`)

	return {
		id,
		kind,
		label,
		value,
		public: isPublic,
		shareable,
		link,
		vcard: { property, types },
		qrAsAddress: qrAsAddress || undefined,
	}
}

function parsePhotoField(
	source: unknown,
	resolvePhoto: ContactProfileParserOptions['resolvePhoto'],
): ContactField {
	const photoSource =
		typeof source === 'string'
			? { reference: source, mediaType: undefined }
			: (() => {
					const record = expectRecord(source, 'profile.photo')
					return {
						reference: expectNonEmptyString(record.path, 'profile.photo.path'),
						mediaType:
							record.media_type === undefined
								? undefined
								: expectNonEmptyString(record.media_type, 'profile.photo.media_type'),
					}
				})()

	if (!resolvePhoto) {
		throw new ContactProfileError(
			`profile.photo "${photoSource.reference}" cannot be resolved without a photo resolver`,
		)
	}

	let resolved: ContactPhotoSource
	try {
		resolved = resolvePhoto(photoSource.reference)
	} catch (error) {
		throw new ContactProfileError(
			`profile.photo "${photoSource.reference}" could not be resolved${
				error instanceof Error ? `: ${error.message}` : ''
			}`,
		)
	}

	return {
		id: 'profile.photo',
		kind: 'photo',
		label: 'Photo',
		value: {
			base64: expectNonEmptyString(resolved.base64, 'resolved profile.photo.base64'),
			mediaType:
				photoSource.mediaType ??
				expectNonEmptyString(resolved.mediaType, 'resolved profile.photo.mediaType'),
		},
		public: true,
		shareable: true,
		vcard: { property: 'PHOTO' },
	}
}

function parseAddress(source: TomlRecord, id: string): ContactAddress {
	const unknownKeys = Object.keys(source).filter(
		(key) => !addressKeys.has(key) && !['label', 'shareable', 'type'].includes(key),
	)
	if (unknownKeys.length > 0) {
		throw new ContactProfileError(`${id} has unknown address properties: ${unknownKeys.join(', ')}`)
	}

	const address: ContactAddress = {
		poBox: optionalString(source.po_box, `${id}.po_box`),
		extended: optionalString(source.extended, `${id}.extended`),
		street: optionalString(source.street, `${id}.street`),
		city: optionalString(source.city, `${id}.city`),
		region: optionalString(source.region ?? source.state, `${id}.region`),
		postalCode: optionalString(source.postal_code, `${id}.postal_code`),
		country: optionalString(source.country, `${id}.country`),
	}

	if (!Object.values(address).some(Boolean)) {
		throw new ContactProfileError(`${id} must contain at least one address component`)
	}

	return address
}

function parseSets(source: unknown, fields: ContactField[]): ContactSet[] {
	if (source === undefined) return []
	const setsSource = expectRecord(source, 'sets')
	const publicIds = fields.filter((field) => field.public).map((field) => field.id)

	return Object.entries(setsSource).map(([id, references]) => {
		if (!Array.isArray(references) || references.length === 0) {
			throw new ContactProfileError(`sets.${id} must be a non-empty array`)
		}

		const privateIds = references.flatMap((reference, index) =>
			resolvePrivateReference(
				expectNonEmptyString(reference, `sets.${id}[${index}]`),
				fields,
				`sets.${id}`,
			),
		)

		return {
			id,
			label: titleCase(id),
			fieldIds: [...new Set([...publicIds, ...privateIds])],
		}
	})
}

function parseRequestMethods(source: unknown, fields: ContactField[]): ContactRequestMethod[] {
	const privateFields = fields.filter((field) => !field.public && field.shareable)
	const overrides = source === undefined ? {} : expectRecord(source, 'requests')
	const methods: ContactRequestMethod[] = []

	for (const kind of standardKinds) {
		const fieldsForKind = privateFields.filter((field) => field.kind === kind)
		const overrideSource = overrides[kind]
		const override =
			overrideSource === undefined ? undefined : expectRecord(overrideSource, `requests.${kind}`)

		if (kind === 'url' && override === undefined) {
			methods.push(
				...fieldsForKind.map((field) => ({
					id: field.id.replace(/^private\./, ''),
					label: field.label,
					defaultFieldIds: [field.id],
				})),
			)
			continue
		}

		const enabled =
			override?.enabled === undefined
				? true
				: expectBoolean(override.enabled, `requests.${kind}.enabled`)

		if (!enabled || (fieldsForKind.length === 0 && override?.fields === undefined)) continue

		const defaultFieldIds =
			override?.fields === undefined
				? fieldsForKind.map((field) => field.id)
				: parseReferenceList(override.fields, fields, `requests.${kind}.fields`)

		if (defaultFieldIds.length === 0) {
			throw new ContactProfileError(`requests.${kind} resolves to no private fields`)
		}

		methods.push({
			id: kind,
			label:
				override?.label === undefined
					? kindLabel(kind)
					: expectNonEmptyString(override.label, `requests.${kind}.label`),
			defaultFieldIds: [...new Set(defaultFieldIds)],
		})
	}

	const bankFields = privateFields.filter((field) => field.id.startsWith('private.custom.bank.'))
	const bankOverrideSource = overrides.bank
	const bankOverride =
		bankOverrideSource === undefined ? undefined : expectRecord(bankOverrideSource, 'requests.bank')
	const bankEnabled =
		bankOverride?.enabled === undefined
			? true
			: expectBoolean(bankOverride.enabled, 'requests.bank.enabled')

	if (bankEnabled && (bankFields.length > 0 || bankOverride?.fields !== undefined)) {
		const defaultFieldIds =
			bankOverride?.fields === undefined
				? bankFields.map((field) => field.id)
				: parseReferenceList(bankOverride.fields, fields, 'requests.bank.fields')
		if (defaultFieldIds.length === 0) {
			throw new ContactProfileError('requests.bank resolves to no private fields')
		}
		methods.push({
			id: 'bank',
			label:
				bankOverride?.label === undefined
					? 'Bank'
					: expectNonEmptyString(bankOverride.label, 'requests.bank.label'),
			defaultFieldIds: [...new Set(defaultFieldIds)],
		})
	}

	for (const [id, overrideSource] of Object.entries(overrides)) {
		if (standardKinds.includes(id as (typeof standardKinds)[number]) || id === 'bank') continue
		const override = expectRecord(overrideSource, `requests.${id}`)
		const enabled =
			override.enabled === undefined
				? true
				: expectBoolean(override.enabled, `requests.${id}.enabled`)
		if (!enabled) continue
		const defaultFieldIds = parseReferenceList(override.fields, fields, `requests.${id}.fields`)
		methods.push({
			id,
			label:
				override.label === undefined
					? titleCase(id)
					: expectNonEmptyString(override.label, `requests.${id}.label`),
			defaultFieldIds: [...new Set(defaultFieldIds)],
		})
	}

	return methods
}

function parseReferenceList(source: unknown, fields: ContactField[], path: string): string[] {
	if (!Array.isArray(source) || source.length === 0) {
		throw new ContactProfileError(`${path} must be a non-empty array`)
	}
	return source.flatMap((reference, index) =>
		resolvePrivateReference(expectNonEmptyString(reference, `${path}[${index}]`), fields, path),
	)
}

function resolvePrivateReference(
	reference: string,
	fields: ContactField[],
	path: string,
): string[] {
	const normalized = reference.startsWith('private.') ? reference : `private.${reference}`
	const matches =
		reference === 'all'
			? fields.filter((field) => !field.public)
			: fields.filter(
					(field) =>
						!field.public && (field.id === normalized || field.id.startsWith(`${normalized}.`)),
				)

	if (matches.length === 0) {
		throw new ContactProfileError(`${path} contains unknown private field reference "${reference}"`)
	}

	return matches.map((field) => field.id)
}

function resolveRequestEmail(source: unknown, fields: ContactField[]): string {
	if (source !== undefined) return expectNonEmptyString(source, 'profile.request_email')

	const publicEmails = fields.filter((field) => field.public && field.kind === 'email')
	if (publicEmails.length === 1) return publicEmails[0].value as string

	const mainEmail = publicEmails.find((field) => field.id === 'public.email.main')
	if (mainEmail) return mainEmail.value as string

	throw new ContactProfileError(
		'profile.request_email is required unless there is one public email or public.email.main',
	)
}

function inferLabel(alias: string | undefined, kind: ContactFieldKind): string {
	if (!alias) return kindLabel(kind)
	return `${titleCase(alias)} ${kindLabel(kind).toLowerCase()}`
}

function kindLabel(kind: ContactFieldKind): string {
	if (kind === 'url') return 'Website'
	return titleCase(kind)
}

function inferVCardProperty(kind: ContactFieldKind): string {
	const properties: Partial<Record<ContactFieldKind, string>> = {
		email: 'EMAIL',
		phone: 'TEL',
		url: 'URL',
		custom: 'X-CUSTOM',
	}
	const property = properties[kind]
	if (!property) throw new ContactProfileError(`cannot infer a vCard property for ${kind}`)
	return property
}

function inferLink(kind: ContactFieldKind, value: string): string | undefined {
	if (kind === 'email') return `mailto:${value}`
	if (kind === 'phone') return `tel:${value.replace(/[^\d+]/g, '')}`
	if (kind === 'url') return value
	return undefined
}

function parsePhoneShorthand(alias: string, path: string): { label: string; type: string } {
	const separatorIndex = alias.indexOf(':')
	if (separatorIndex >= 0) {
		const typePrefix = alias.slice(0, separatorIndex).trim().toLowerCase()
		const type = knownVCardTypes.get(typePrefix)
		if (type) {
			return {
				label: expectNonEmptyString(alias.slice(separatorIndex + 1).trim(), `${path} label`),
				type,
			}
		}
	}

	return {
		label: expectNonEmptyString(alias.trim(), `${path} label`),
		type: 'CELL',
	}
}

function normalizeVCardTypeToken(value: string, path: string): string {
	const token = value
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^A-Za-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')

	if (!token) {
		throw new ContactProfileError(`${path} must contain a letter or number`)
	}
	return token
}

function parseUrlFragmentUsername(value: string, path: string): string | undefined {
	let url: URL
	try {
		url = new URL(value)
	} catch {
		throw new ContactProfileError(`${path} must be an absolute URL`)
	}
	if (!url.hash || url.hash === '#') return undefined

	try {
		return decodeURIComponent(url.hash.slice(1)).trim() || undefined
	} catch {
		throw new ContactProfileError(`${path} must contain a valid encoded URL fragment`)
	}
}

function inferUrlUsername(field: ContactField): string | undefined {
	if (field.kind !== 'url' || typeof field.value !== 'string') return undefined

	let username
	try {
		username = parseUrlFragmentUsername(field.value, field.id)
	} catch {
		return undefined
	}
	if (!username) return undefined

	const expectedType = `${normalizeVCardTypeToken(field.label, field.id)}-${normalizeVCardTypeToken(
		username,
		field.id,
	)}`
	return field.vcard.types?.includes(expectedType) ? username : undefined
}

function isInlineField(value: unknown): boolean {
	return isRecord(value) && Object.hasOwn(value, 'value')
}

function isAddress(value: unknown): boolean {
	return isRecord(value) && Object.keys(value).some((key) => addressKeys.has(key))
}

function isRecord(value: unknown): value is TomlRecord {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function expectRecord(value: unknown, path: string): TomlRecord {
	if (!isRecord(value)) throw new ContactProfileError(`${path} must be a table`)
	return value
}

function expectNonEmptyString(value: unknown, path: string): string {
	if (typeof value !== 'string' || value.trim() === '') {
		throw new ContactProfileError(`${path} must be a non-empty string`)
	}
	return value.trim()
}

function optionalString(value: unknown, path: string): string | undefined {
	if (value === undefined) return undefined
	return expectNonEmptyString(value, path)
}

function expectPositiveInteger(value: unknown, path: string): number {
	if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
		throw new ContactProfileError(`${path} must be a positive integer`)
	}
	return value
}

function expectBoolean(value: unknown, path: string): boolean {
	if (typeof value !== 'boolean') throw new ContactProfileError(`${path} must be a boolean`)
	return value
}

function assertUniqueIds(ids: string[], kind: string): void {
	const seen = new Set<string>()
	for (const id of ids) {
		if (seen.has(id)) throw new ContactProfileError(`duplicate ${kind} ID "${id}"`)
		seen.add(id)
	}
}

function titleCase(value: string): string {
	return value
		.split(/[-_\s]+/)
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
}
