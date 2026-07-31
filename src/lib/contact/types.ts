export type ContactFieldKind = 'name' | 'email' | 'phone' | 'url' | 'address' | 'photo' | 'custom'

export type ContactAddress = {
	poBox?: string
	extended?: string
	street?: string
	city?: string
	region?: string
	postalCode?: string
	country?: string
}

export type ContactPhoto = {
	base64: string
	mediaType: string
}

export type ContactVCard = {
	property: string
	types?: string[]
	value?: string
}

export type ContactField = {
	id: string
	kind: ContactFieldKind
	label: string
	value: string | ContactAddress | ContactPhoto
	public: boolean
	shareable: boolean
	requiredForVCard?: boolean
	link?: string
	vcard: ContactVCard
	qrAsAddress?: boolean
}

export type ContactSet = {
	id: string
	label: string
	fieldIds: string[]
}

export type ContactRequestMethod = {
	id: string
	label: string
	defaultFieldIds: string[]
}

export type ContactProfile = {
	id: string
	version: number
	displayName: string
	requestEmail: string
	fields: ContactField[]
	sets: ContactSet[]
	requestMethods: ContactRequestMethod[]
}

export type ContactAuthorization =
	{ mode: 'public' } | { mode: 'visitor'; fieldIds: Iterable<string> } | { mode: 'admin' }

export type ContactPhotoSource = ContactPhoto

export type ContactProfileParserOptions = {
	resolvePhoto?: (reference: string) => ContactPhotoSource
}
