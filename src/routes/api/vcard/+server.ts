import qrcode from 'qrcode-generator'

import { VCARD } from '$env/static/private'

export const GET = async ({ url }) => {
	const format = url.searchParams.get('format')?.toLowerCase() || 'vcf'

	const vcard = `BEGIN:VCARD\nVERSION:3.0\n${VCARD}\nEND:VCARD`

	if (format === 'svg') {
		try {
			// Strip PHOTO field from QR data — base64 images are too large for QR codes.
			// The full vcard (with photo) is still available via the .vcf download.
			const vcardForQr = vcard
				.split('\n')
				.filter((line, i, arr) => {
					if (line.match(/^PHOTO[;:]/i)) return false
					// Also skip continuation lines (start with space/tab) after PHOTO
					if ((line.startsWith(' ') || line.startsWith('\t')) && i > 0 && !arr[i - 1]) return false
					return true
				})
				.join('\n')

			// Generate QR code as SVG (vector, sharp at any size, Workers-compatible)
			const qr = qrcode(0, 'L')
			qr.addData(vcardForQr)
			qr.make()

			const svg = qr.createSvgTag({ cellSize: 4, margin: 0 })

			return new Response(svg, {
				headers: {
					'Content-Type': 'image/svg+xml',
					'Content-Disposition': `inline; filename="john-kim-murphy-qr-vcard.svg"`,
				},
			})
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
		} catch (error) {
			return new Response('Failed to generate QR code', { status: 500 })
		}
	}

	return new Response(vcard, {
		headers: {
			'Content-Type': 'text/vcard',
			'Content-Disposition': `attachment; filename="john-kim-murphy.vcf"`,
		},
	})
}
