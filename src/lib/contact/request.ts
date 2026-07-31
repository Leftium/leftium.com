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
		'Contact methods that would help',
		'(change [ ] to [x] for any that apply):',
		'',
		...checklist,
		'[ ] Other:',
		'',
		'Context:',
		'',
		'[What would you like to discuss, and what contact details would help?]',
	].join('\n')
	const parameters = new URLSearchParams({
		subject: 'Contact information request',
		body,
	})

	return {
		body,
		mailtoHref: `mailto:${encodeURIComponent(requestEmail)}?${parameters}`,
	}
}
