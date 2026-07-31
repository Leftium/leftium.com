import { describe, expect, it } from 'vitest'

import { buildContactRequestTemplate } from './request'

describe('contact request templates', () => {
	it('builds a channel-neutral checklist and an encoded email action', () => {
		const template = buildContactRequestTemplate('Example Person', 'hello+contact@example.com', [
			'Email',
			'KakaoTalk',
			'Bank',
		])

		expect(template.body).toBe(`Hi Example,

I'd like to request another way to get in touch.

Contact methods that would help
(change [ ] to [x] for any that apply):

[ ] Email
[ ] KakaoTalk
[ ] Bank
[ ] Other:

Context:

[What would you like to discuss, and what contact details would help?]`)
		expect(template.body).not.toMatch(/^(?:To|Subject):/m)

		const mailto = new URL(template.mailtoHref)
		expect(mailto.protocol).toBe('mailto:')
		expect(decodeURIComponent(mailto.pathname)).toBe('hello+contact@example.com')
		expect(mailto.searchParams.get('subject')).toBe('Contact information request')
		expect(mailto.searchParams.get('body')).toBe(template.body)
	})
})
