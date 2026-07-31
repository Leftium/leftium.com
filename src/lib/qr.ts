import qrcode from 'qrcode-generator'

const textEncoder = new TextEncoder()
qrcode.stringToBytes = (value) => Array.from(textEncoder.encode(value))

export function buildQrSvg(value: string): string {
	const qr = qrcode(0, 'L')
	qr.addData(value)
	qr.make()
	return qr.createSvgTag({ cellSize: 4, margin: 0 })
}
