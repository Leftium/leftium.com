import QRCode from 'qrcode'

import { VCARD } from '$env/static/private'

export const GET = async ({ url }) => {
	const format = url.searchParams.get('format')?.toLowerCase() || 'vcf'

	const vcard = `BEGIN:VCARD\nVERSION:3.0\n${VCARD}\nEND:VCARD`

	if (format === 'png') {
		try {
			const qrCode = await QRCode.toDataURL(vcard)
			const base64Image = qrCode.split(',')[1] // Remove the data URL prefix

			const buffer = Buffer.from(base64Image, 'base64')
			return new Response(buffer, {
				headers: {
					'Content-Type': 'image/png',
					'Content-Disposition': `attachment; filename="john-kim-murphy-qr-vcard.png"`,
					'Content-Length': buffer.length.toString(),
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
