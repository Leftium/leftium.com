import { resolveAdminAccess } from '$lib/contact/admin-auth.server'
import {
	buildContactFieldQrPayload,
	ContactFieldQrError,
	isContactFieldQrEligible,
} from '$lib/contact/field-qr'
import { ContactProfileError, selectContactFields } from '$lib/contact/profile'
import { contactFilename } from '$lib/contact/vcard'
import { buildQrSvg } from '$lib/qr'
import { loadContactProfile } from '../../(centered)/contact/contact-profile.server'

import type { RequestHandler } from './$types'

const contactHeaders = {
	'Cache-Control': 'private, no-store',
	Vary: 'Cookie',
}

function textResponse(message: string, status: number) {
	return new Response(message, {
		status,
		headers: {
			...contactHeaders,
			'Content-Type': 'text/plain; charset=utf-8',
		},
	})
}

export const GET: RequestHandler = async ({ cookies, url }) => {
	const profile = loadContactProfile()
	const adminAccess = await resolveAdminAccess(cookies)
	if (adminAccess.authorization.mode !== 'admin') {
		return textResponse('Admin authorization is required', 401)
	}

	const requestedIds = url.searchParams.getAll('field')
	if (requestedIds.length !== 1 || !requestedIds[0]) {
		return textResponse('Exactly one contact field is required', 400)
	}

	let fields
	try {
		fields = selectContactFields(profile, adminAccess.authorization, requestedIds)
	} catch (error) {
		if (error instanceof ContactProfileError) return textResponse(error.message, 400)
		throw error
	}

	const field = fields.find((candidate) => candidate.id === requestedIds[0])
	if (!field || !isContactFieldQrEligible(field)) {
		return textResponse('The requested contact field does not support an individual QR code', 400)
	}

	let payload
	try {
		payload = buildContactFieldQrPayload(field)
	} catch (error) {
		if (error instanceof ContactFieldQrError) return textResponse(error.message, 400)
		throw error
	}

	let svg
	try {
		svg = buildQrSvg(payload)
	} catch {
		return textResponse('This contact field is too large to fit in a QR code.', 422)
	}

	return new Response(svg, {
		headers: {
			...contactHeaders,
			'Content-Type': 'image/svg+xml; charset=utf-8',
			'Content-Disposition': `inline; filename="${contactFilename(profile.displayName, '-field-qr.svg')}"`,
		},
	})
}
