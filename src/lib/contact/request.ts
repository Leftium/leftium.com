export type ContactRequestTemplate = {
	body: string
	mailtoHref: string
}

export function buildContactRequestTemplate(
	displayName: string,
	requestEmail: string,
	methodLabels: Iterable<string>,
): ContactRequestTemplate {
	const greetingName = displayName.split(/\s+/)[0]
	const checklist = [...methodLabels].map((label) => `[ ] ${label}`)
	const body = [
		`Hi ${greetingName},`,
		'',
		"I'd like to request another way to get in touch.",
		'',
		'(change [ ] to [x] for any that apply):',
		'',
		...checklist,
		'[ ] Other:',
		'',
		'Context:',
		'',
		'[What would you like to discuss?]',
	].join('\n')
	const subject = 'Contact information request'
	const mailBody = body.replaceAll('\n', '\r\n')
	const parameters = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailBody)}`

	return {
		body,
		mailtoHref: `mailto:${encodeURIComponent(requestEmail)}?${parameters}`,
	}
}
