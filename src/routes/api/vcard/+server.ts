import qrcode from 'qrcode-generator'

import { VCARD } from '$env/static/private'

export const GET = async ({ url }) => {
	const format = url.searchParams.get('format')?.toLowerCase() || 'vcf'

	const vcard = `BEGIN:VCARD\nVERSION:3.0\n${VCARD}\nEND:VCARD`

	if (format === 'png') {
		try {
			// Generate QR code as PNG data URL
			const qr = qrcode(0, 'L')
			qr.addData(vcard)
			qr.make()

			// Get the data URL and extract base64 part
			const dataUrl = qr.createDataURL()
			const base64Image = dataUrl.split(',')[1]

			// Convert base64 to Uint8Array (Workers-compatible)
			const binaryString = atob(base64Image)
			const bytes = new Uint8Array(binaryString.length)
			for (let i = 0; i < binaryString.length; i++) {
				bytes[i] = binaryString.charCodeAt(i)
			}

			return new Response(bytes, {
				headers: {
					'Content-Type': 'image/png',
					'Content-Disposition': `attachment; filename="john-kim-murphy-qr-vcard.png"`,
					'Content-Length': bytes.length.toString(),
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
