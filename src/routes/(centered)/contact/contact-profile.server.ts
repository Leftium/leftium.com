import { parseContactProfileToml } from '$lib/contact/profile'
import { dev } from '$app/environment'
import { env } from '$env/dynamic/private'

import type { ContactPhotoSource, ContactProfile } from '$lib/contact/types'

const profileSources = import.meta.glob('./contact-info.server*.toml', {
	eager: true,
	query: '?raw',
	import: 'default',
}) as Record<string, string>

const photoAssets = import.meta.glob('../../../../static/icon-192.png', {
	eager: true,
	query: '?inline',
	import: 'default',
}) as Record<string, string>

let cachedProfile: ContactProfile | undefined

export function loadContactProfile(): ContactProfile {
	if (cachedProfile) return cachedProfile

	const source =
		env.CONTACT_INFO_TOML?.trim() ||
		profileSources['./contact-info.server.toml'] ||
		(dev ? profileSources['./contact-info.server.example.toml'] : undefined)

	if (!source) {
		throw new Error(
			'Contact profile is missing. Set CONTACT_INFO_TOML in the deployment environment or add the private contact-info.server.toml.',
		)
	}

	cachedProfile = parseContactProfileToml(source, { resolvePhoto })
	return cachedProfile
}

function resolvePhoto(reference: string): ContactPhotoSource {
	const asset = photoAssets[reference]
	if (!asset) {
		throw new Error(`asset is not bundled; expected one of: ${Object.keys(photoAssets).join(', ')}`)
	}

	const match = /^data:([^;,]+);base64,(.+)$/.exec(asset)
	if (!match) throw new Error('asset was not bundled as a base64 data URL')

	return {
		mediaType: match[1],
		base64: match[2],
	}
}
