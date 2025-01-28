import { VCARD } from '$env/static/private'

export const GET = async () => {
	const vcard = `BEGIN:VCARD\nVERSION:3.0\n${VCARD}\nEND:VCARD`

	return new Response(vcard, {
		headers: {
			'Content-Type': 'text/vcard',
			'Content-Disposition': `attachment; filename="john-kim-murphy.vcf"`,
		},
	})
}
