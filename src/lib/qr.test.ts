import { describe, expect, it } from 'vitest'

import { buildQrSvg } from './qr'

describe('buildQrSvg', () => {
	it('encodes non-ASCII text as UTF-8 instead of truncating UTF-16 code units', () => {
		const korean = '우리은행'
		const truncated = String.fromCharCode(
			...Array.from(korean, (character) => character.charCodeAt(0) & 0xff),
		)

		expect(buildQrSvg(korean)).not.toBe(buildQrSvg(truncated))
	})
})
