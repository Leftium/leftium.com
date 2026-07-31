import { describe, expect, it } from 'vitest'

import { buildContactRequestTemplate } from './request'

describe('contact request templates', () => {
	it('builds a channel-neutral checklist and an encoded email action', () => {
		const template = buildContactRequestTemplate('Example Person', 'hello+contact@example.com', [
			'Email',
			'카카오톡',
			'Bank',
		])

		expect(template.body).toBe(`Hi Example,

I'd like to request another way to get in touch.

(change [ ] to [x] for any that apply):

[ ] Email
[ ] 카카오톡
[ ] Bank
[ ] Other:

Context:

[What would you like to discuss?]`)
		expect(template.body).not.toMatch(/^(?:To|Subject):/m)

		const mailto = new URL(template.mailtoHref)
		expect(mailto.protocol).toBe('mailto:')
		expect(decodeURIComponent(mailto.pathname)).toBe('hello+contact@example.com')
		expect(mailto.searchParams.get('subject')).toBe('Contact information request')
		expect(mailto.searchParams.get('body')).toBe(template.body.replaceAll('\n', '\r\n'))
		expect(template.mailtoHref).not.toContain('+')
		expect(template.mailtoHref).toContain('subject=Contact%20information%20request')
		expect(template.mailtoHref).toContain('Hi%20Example%2C%0D%0A%0D%0A')
		expect(template.mailtoHref).toContain('%5B%20%5D')
		expect(template.mailtoHref).toContain(encodeURIComponent('카카오톡'))
	})
})
