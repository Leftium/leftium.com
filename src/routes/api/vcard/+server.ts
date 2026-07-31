import { selectContactFields } from '$lib/contact/profile'
import { buildVCard, buildVCardQrSvg, contactFilename, ContactQrError } from '$lib/contact/vcard'
import { loadContactProfile } from '../../(centered)/contact/contact-profile.server'

import type { RequestHandler } from './$types'

const contactHeaders = {
	'Cache-Control': 'private, no-store',
	Vary: 'Cookie',
}

export const GET: RequestHandler = async ({ url }) => {
	const profile = loadContactProfile()
	const fields = selectContactFields(profile, { mode: 'public' })
	const format = url.searchParams.get('format')?.toLowerCase() ?? 'vcf'

	if (format === 'svg') {
		try {
			const vcard = buildVCard(fields, { includePhoto: false })
			const svg = buildVCardQrSvg(vcard)

			return new Response(svg, {
				headers: {
					...contactHeaders,
					'Content-Type': 'image/svg+xml; charset=utf-8',
					'Content-Disposition': `inline; filename="${contactFilename(profile.displayName, '-qr-vcard.svg')}"`,
				},
			})
		} catch (error) {
			if (error instanceof ContactQrError) {
				return new Response(error.message, {
					status: 422,
					headers: {
						...contactHeaders,
						'Content-Type': 'text/plain; charset=utf-8',
					},
				})
			}
			throw error
		}
	}

	if (format !== 'vcf') {
		return new Response('Unsupported vCard format', {
			status: 400,
			headers: {
				...contactHeaders,
				'Content-Type': 'text/plain; charset=utf-8',
			},
		})
	}

	const vcard = buildVCard(fields, { includePhoto: true })
	return new Response(vcard, {
		headers: {
			...contactHeaders,
			'Content-Type': 'text/vcard; charset=utf-8',
			'Content-Disposition': `attachment; filename="${contactFilename(profile.displayName, '.vcf')}"`,
		},
	})
}
