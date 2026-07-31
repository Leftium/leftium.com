# Selective Contact Sharing

**Date**: 2026-07-31
**Status**: Draft
**Owner**: John

## One Sentence

Turn `/contact` into a database-free, capability-gated contact profile where the owner selects the details to share, presents them directly as a vCard QR code or sends a signed access link, and visitors can request additional contact methods through a prefilled email.

## Overview

The current contact route publishes a fixed email address and exposes one environment-provided vCard through public download and QR endpoints. It has placeholders for server-loaded contact data and named sets, but no owner authentication, field-level selection, visitor grants, or request flow.

The target route has two modes:

- Visitor mode shows public details, details granted to the current browser, vCard and QR representations of those details, and a simple email-based way to request more access.
- Owner mode is unlocked with a high-entropy owner access key. It shows every contact field, applies named sets as selection presets, and generates either a direct vCard QR code or a signed access link for an arbitrary selection.

The change is complete when an unauthorized request cannot retrieve a private value from page data, vCard, or QR endpoints; the owner can manage contact details in a human-readable text file and share any selected combination by QR or link; downloaded vCards preserve the configured photo while QR payloads omit it; a link grant persists in the visitor's browser for 24 hours; and the request email contains an editable bracket checklist that the owner can paste back into the page to initialize a reviewed selection.

## Scope

In scope:

- A human-authored, server-only TOML contact profile parsed into a structured internal model.
- Public fields, private fields, required identity fields, named sets, and public request-method labels.
- An optional photo embedded in downloaded vCards but omitted from QR payloads.
- High-entropy owner-key login and a one-year owner session.
- Arbitrary owner field selection.
- Direct vCard QR and vCard download generation from the owner's selection.
- Signed, seven-day visitor access links.
- Signed, 24-hour visitor sessions.
- Authorized text, link, vCard, and QR representations.
- A `mailto:` request containing a plain-text bracket checklist of contact methods.
- Owner-side parsing of a pasted request email into an editable suggested field selection.
- Tests for profile filtering, token boundaries, vCard generation, and authorization.

Out of scope:

- Typed OTPs or short access codes.
- D1, KV, or another grant database.
- Automated email delivery or a server-submitted request form.
- Visitor-side selection before opening the email draft.
- Per-device owner-session listing or revocation.
- Extracting a reusable package or operating a URL-only hosted service.

## Current State

- [`+page.svelte`](<../src/routes/(centered)/contact/+page.svelte>) renders hard-coded contact copy and links directly to `/api/vcard`.
- [`+page.server.ts`](<../src/routes/(centered)/contact/+page.server.ts>) returns no contact data and contains only a commented import placeholder.
- [`contact-info.server.example.toml`](<../src/routes/(centered)/contact/contact-info.server.example.toml>) establishes TOML as the existing human-oriented direction, but stores one raw vCard and identifies set membership through exact vCard lines.
- [`/api/vcard`](../src/routes/api/vcard/+server.ts) returns the entire private `VCARD` environment value without checking owner or visitor authorization. Its download preserves the configured photo, while its SVG mode attempts to remove the photo before creating a QR code.
- [`hooks.server.ts`](../src/hooks.server.ts) runs `web-sentinel` but does not establish contact-route sessions or authorization.
- [`package.json`](../package.json) includes `qrcode-generator`, SvelteKit, and Cloudflare/Vercel adapters, but no authentication, token, validation, or test library.
- [`wrangler.toml`](../wrangler.toml) establishes Cloudflare Workers as an intended deployment target.
- No repository-level specification or ADR convention existed before this document.

## Terminology

- **Owner access key**: A randomly generated bearer credential used only to enter owner mode. It is not a cryptographic private key and is not used to sign sessions or grants.
- **Owner session**: A signed, persistent cookie proving that the current browser has completed owner login.
- **Contact field**: One independently renderable and shareable value, such as a personal email address, Korean mobile number, or mailing address.
- **Required identity field**: A field, such as the display name, that is added when necessary to produce a useful or valid contact artifact.
- **Set**: A named owner preset containing contact field IDs. A set initializes the owner's checkboxes but does not restrict later edits.
- **Grant**: A signed bearer token authorizing a specific list of private contact field IDs until its claim deadline.
- **Visitor session**: A signed cookie containing the field IDs granted to the current browser.
- **Direct artifact**: A vCard file or QR code generated for the owner's exact current selection. Its contact values are delivered directly and cannot expire after being scanned or saved.
- **Request method**: A public, value-free label such as "Email", "Phone", or "Postal mail" included in the visitor's email checklist, with optional default field IDs used only to initialize the owner's selection.
- **Request import**: Client-side parsing of a pasted request email. It recognizes checked method labels and suggests fields but never authorizes or sends anything by itself.

## Design Decisions

| Decision | Class | Choice | Rationale |
| --- | --- | --- | --- |
| Initial sharing channels | Design coherence | Direct vCard QR in person and signed access links remotely | These cover the expected face-to-face and remote cases without adding a rarely used short-code flow. |
| Owner credential | Taste under constraints | Random 128-bit-or-stronger owner access key | A high-entropy key can use fast verification and does not need password-strength rules or an adaptive password hash. |
| Credential separation | Design coherence | Separate owner access, owner-session, and grant-signing secrets | Compromise of an entered owner credential must not directly reveal the key used to forge visitor grants. |
| Owner session lifetime | Taste under constraints | One year | This is a single-owner personal site, and avoiding frequent reauthentication is worth the lost-device risk. |
| Grant storage | Design coherence | Stateless signed token | Links can carry field IDs and expiration without carrying contact values or requiring a database. |
| Grant claim lifetime | Taste under constraints | Seven days | Email recipients have time to open the link without making the bearer capability effectively permanent. |
| Visitor session lifetime | Taste under constraints | 24 hours after claim | A recipient can revisit and download the contact data without reopening the email link. |
| Authoring format | Evidence | Minimal server-only TOML shorthand parsed into the internal TypeScript model | The file should state contact facts once; IDs, labels, visibility, links, vCard properties, and request mappings are inferred from their TOML paths. |
| Photo handling | Design coherence | Embed the configured photo in downloaded vCards and omit it from QR vCards | This preserves the current full-card behavior without exceeding practical QR payload size. |
| Visitor request UI | Design coherence | One `mailto:` action with a plain-text bracket checklist | The email itself captures selections and context; the owner chooses the actual fields to grant. |
| Request import | Design coherence | Parse pasted email locally into an editable suggestion | This saves owner effort without treating visitor-edited text as trusted state. |
| Named sets | Design coherence | Owner-only presets using stable field IDs | Sets speed common selections without limiting arbitrary combinations or becoming part of the security model. |
| Dynamic values | Evidence | Render as escaped Svelte values, not dynamic `{@html}` | Private contact data must not pass through the current developer-authored Markdown HTML path. |
| Reusable package | Deferred | Preserve pure core boundaries but do not extract in v1 | The route behavior should settle before its API is made public. |

## Contact Profile

### Human-Authored Source

The canonical authoring source is a server-only TOML file based on the existing `contact-info.server.example.toml`. The implementation parses and validates that text into the normalized TypeScript model used by the rest of the feature.

The real TOML file and any private photo asset must follow the repository's private deployment process and must not be committed to a public repository. Keep a redacted example in version control. Editing the TOML or replacing its referenced photo takes effect after a rebuild or redeploy; runtime content management is out of scope.

The common case should contain only facts that cannot be inferred:

```toml
[profile]
name = "John Kim Murphy"
photo = "./contact-photo.jpg"

[public]
email = "john@leftium.com"
url = "https://leftium.com"

[private.email]
personal = "john@example.com"
work = "john@work.example"

[private.phone]
korea = "+82 10 5555 6789"
us = { value = "+1 212 555 6789", label = "US mobile", type = "cell" }

[private.address.korea]
street = "161 Sajik-ro, Jongno-gu"
city = "Seoul"
postal_code = "03045"
country = "South Korea"

[sets]
korea = ["phone.korea", "address.korea"]
business = ["email.work", "phone.us"]
```

This produces normalized fields such as `public.email`, `private.email.work`, and `private.phone.korea` without repeating those IDs in the file.

The TOML should reference an image asset rather than containing a large base64 string. The server-only profile loader resolves that reference into an embeddable photo value at build time. It must remain compatible with Cloudflare Workers and must not depend on reading an arbitrary local filesystem path at request time.

### Inference Rules

Inference must be deterministic and documented:

- The `public` or `private` namespace determines visibility.
- The next path segment determines the field kind: `email`, `phone`, `url`, `address`, or `custom`.
- A scalar kind value creates one field, such as `public.email`.
- A table under a kind normally creates named fields, such as `private.phone.korea`.
- An inline table containing `value` is one field with explicit overrides, not a group of child fields.
- An address table containing recognized address components is one structured address field. The parser does not guess an address structure from a free-form string.
- The canonical field ID is its full TOML path. Reordering entries does not change IDs.
- A named field label defaults to its title-cased alias plus the kind, such as `korea` under `phone` becoming "Korea phone".
- A singleton label defaults to the kind label, such as "Email" or "Website".
- Email and phone links are inferred as `mailto:` and `tel:`.
- The vCard property is inferred from the kind.
- Well-known aliases such as `home`, `work`, `cell`, and `fax` may infer a vCard type. Other aliases do not invent one.
- Inferred standard fields are shareable by default.
- The profile ID defaults to the single configured profile, and the profile version defaults to `1`. Either may be supplied in `[profile]` when needed.
- The request email defaults to the singleton public email or the public email named `main`. Multiple public emails without `main` require an explicit `request_email`.
- Each standard private field kind becomes one request method. Its label is inferred from the kind, and its default field IDs are every private field of that kind. Custom fields require an explicit request override.
- Applying a named set selects every public field plus the private references in that set. The owner may then change any checkbox.
- A set reference such as `phone.korea` resolves within the private namespace. A kind reference such as `phone` expands to every private phone field. The reserved value `all` expands to every private field.
- The top-level photo becomes a public identity field included in downloaded vCards when selected by the effective policy and always omitted from QR vCards. Its media type is inferred from the file extension unless explicitly overridden.

Common scalar values may be replaced by inline tables when inference is insufficient:

```toml
[private.phone]
us = { value = "+1 212 555 6789", label = "US mobile", type = "cell" }

[private.url]
signal = { value = "https://signal.me/example", label = "Signal", vcard_type = "social" }
```

Only meaningful overrides belong in these tables. Authors should not need to restate inferred IDs, kinds, visibility, shareability, links, or request mappings.

Structured values remain structured where guessing would be unsafe. Addresses use named components, and an optional structured-name override may supply family, given, additional, prefix, and suffix components. A plain `profile.name` remains sufficient for display and a valid conservative vCard representation.

Optional request overrides are available only when the inferred private-kind behavior is wrong:

```toml
[requests.phone]
label = "Phone"
fields = ["phone.korea"]

[requests.url]
enabled = false
```

Custom fields are the escape hatch and may require explicit label, value, link, and vCard metadata. The parser should keep the common email, phone, URL, address, set, request, and photo paths terse rather than forcing every field through the custom shape.

### Normalized Internal Model

The exact TypeScript representation may use discriminated field variants, but it must express this contract:

```ts
type ContactFieldKind = 'name' | 'email' | 'phone' | 'url' | 'address' | 'photo' | 'custom'

type ContactField = {
	id: string
	kind: ContactFieldKind
	label: string
	value: unknown
	public: boolean
	shareable: boolean
	requiredForVCard?: boolean
	vcard: unknown
}

type ContactSet = {
	id: string
	label: string
	fieldIds: string[]
}

type ContactRequestMethod = {
	id: string
	label: string
	defaultFieldIds: string[]
}

type ContactProfile = {
	id: string
	version: number
	displayName: string
	requestEmail: string
	fields: ContactField[]
	sets: ContactSet[]
	requestMethods: ContactRequestMethod[]
}
```

Requirements:

- TOML is the owner-facing storage format; the TypeScript type is the validated internal representation.
- Field IDs are stable canonical TOML paths. Changing a value or an explicit label does not change the ID; renaming a path does and may require a profile-version increment.
- A set uses concise field-path or kind references that the parser resolves to normalized field IDs, never raw vCard lines.
- Unknown or duplicate IDs fail configuration validation.
- Request methods and their defaults are inferred from private field kinds unless explicitly overridden. They expose labels only to visitors; normalized default field IDs are returned only in owner mode and initialize, but never finalize, the owner's response selection.
- The top-level photo reference is normalized into a public identity field with a media type and the encoded value needed by the vCard serializer.
- The profile version is included in signed grants and visitor sessions. Incrementing it invalidates tokens based on a materially incompatible field mapping.
- Server startup or the first contact request must fail closed with a useful server-side error when the profile is malformed. It must not fall back to exposing the raw `VCARD` value.

The current TOML example should be replaced by a safe example of this shorthand contract. The implementation should not retain raw vCard-line equality as the field identity mechanism.

## Visibility Rules

Every output path must use the same field-selection policy:

```txt
unauthenticated visitor
  -> public fields

visitor session
  -> public fields + granted private fields

owner page
  -> all fields

owner direct artifact
  -> exact checked fields + required identity fields
```

Additional rules:

- A grant contains private field IDs selected by the owner. Public fields do not need to be included in its scope.
- Claiming another valid grant unions its private field IDs with the current visitor session and starts a new 24-hour session for the combined scope.
- Invalid, expired, incorrectly signed, or incompatible tokens produce public-only access.
- Client-supplied field IDs never expand a visitor's authorized scope.
- Private values are filtered before SvelteKit serializes page data. They are not sent and hidden with CSS or client-side conditions.

## Owner Authentication

### Credential

Generate an owner access key with at least 128 bits of cryptographic randomness and store the original in the owner's password manager. Use a recognizable prefix such as `owner_` to prevent confusion with other secrets.

Store only a SHA-256 digest of the access key in private deployment configuration. A fast digest is acceptable because the input is randomly generated rather than human chosen.

Use separate private secrets for:

- Owner-session signing.
- Visitor-grant and visitor-session signing.

Separate environment variables are preferred. Domain-separated derived keys are acceptable if a single root secret is deliberately used.

### Login

The owner login form submits the access key in a POST body. The server:

1. Applies a conservative input-length limit.
2. Hashes the submitted value.
3. Compares the digest in constant time.
4. Returns one generic invalid-key response on failure.
5. Issues the owner cookie on success.

The access key, its digest, request body, and partial values must never be logged. No value derived from the access key is stored in browser storage.

The key's entropy removes the need for password complexity rules, an adaptive password hash, or Turnstile. Retain a coarse endpoint limit to control traffic abuse and accidental repeated submissions rather than to make the key guess-resistant.

### Owner Session

The owner cookie contains a signed token with:

- A token type or audience that can only be accepted as an owner session.
- A session-version claim.
- Issued-at and one-year expiration timestamps.

Cookie attributes:

- `HttpOnly`
- `Secure` in production
- `SameSite=Lax`
- `Path=/`
- One-year `Max-Age`

Owner logout clears the cookie. Rotating the owner-session signing secret or incrementing the configured session version invalidates all existing owner sessions. Per-device revocation is not supported without server-side state.

The owner UI must clearly indicate owner mode and provide an obvious logout action because the session is long-lived.

## Signed Access Links

### Token

Use a maintained JOSE implementation and HMAC-SHA-256 rather than defining a general-purpose token format. Grant and session verification must constrain the expected algorithm, issuer, audience, and token type.

A grant contains:

```ts
type ContactGrantClaims = {
	profileId: string
	profileVersion: number
	fieldIds: string[]
	iat: number
	exp: number
}
```

The default claim deadline is seven days after generation. The token is reusable until expiration and cannot be individually revoked in v1. It contains field IDs, not contact values.

The owner creates a link by submitting the current private-field selection to a protected server action. The server validates every field ID against the profile before signing.

An empty private selection should not generate a link because it grants nothing beyond the public page.

### URL and Claim

Place the grant token in a fragment:

```txt
https://leftium.com/contact#grant=<signed-token>
```

On mount, the contact page:

1. Reads the fragment.
2. Posts the token to the grant-claim action.
3. Receives the visitor cookie after successful verification.
4. Removes the fragment with `history.replaceState`.
5. Refreshes the page data.

Do not use top-level `await` in the page module. Grant claiming belongs in `onMount` or another function.

The fragment keeps the token out of the initial HTTP request, referrer, and ordinary access logs. JavaScript is required to claim a grant in v1; no query-string fallback should reintroduce token leakage.

### Visitor Session

The visitor cookie contains:

- A visitor-only token type or audience.
- Profile ID and version.
- The granted private field IDs.
- Issued-at and 24-hour expiration timestamps.

It uses the same cookie protections as the owner cookie, with a 24-hour `Max-Age`. It must not be accepted as an owner session even if the same underlying token library is used.

## vCard and QR Output

Create pure server-side helpers for:

```ts
selectContactFields(profile, authorization, requestedIds?)
buildVCard(fields, { includePhoto: true })
buildVCardQrSvg(buildVCard(fields, { includePhoto: false }))
```

All text, link, vCard, and QR representations must call the same selection policy.

The existing `/api/vcard` endpoint may remain the public URL, but its behavior changes:

- A visitor request derives its fields from public access plus the visitor cookie.
- An owner request may provide selected field IDs and receives exactly that selection plus required identity fields.
- The server validates and intersects requested IDs with the caller's authorization.
- An unauthorized caller cannot add private fields through query parameters.
- A downloaded vCard embeds an authorized, selected photo when one is configured.
- `format=svg` produces a QR code from the already filtered fields but always serializes them without the photo.

Responses containing contact data use:

- `Cache-Control: private, no-store`
- `Vary: Cookie`
- An appropriate `Content-Type`
- A safe, stable filename

The vCard generator must:

- Produce a broadly compatible vCard version.
- Use CRLF line endings.
- Escape structured values correctly.
- Include required identity properties.
- Embed the configured photo with the correct vCard encoding, media type, and line folding in downloaded vCards.
- Remove the structured photo field before QR serialization instead of trying to strip serialized continuation lines afterward.
- Return an actionable owner-side error when the selected vCard is too large for a QR code rather than silently dropping requested contact fields.

The owner QR encodes the selected contact values directly. Scanning it does not create a visitor session and cannot be revoked or expired after the values have been delivered.

## Visitor Request Email

Visitor mode presents one request action after the currently visible contact details:

```txt
Need another way to reach me?
[Request more contact information]
```

The action opens a `mailto:` URL addressed to `profile.requestEmail`. The body is generated from the configured public request methods:

```txt
Hi John,

I'd like to request another way to get in touch.

Contact methods that would help
(change [ ] to [x] for any that apply):

[ ] Email
[ ] Phone
[ ] Postal mail
[ ] Other:

Context:

[What would you like to discuss, and what contact details would help?]
```

Requirements:

- The list contains method labels only, never private contact values.
- The body is URL-encoded correctly.
- The checklist uses bracket markers without Markdown list bullets.
- The markers are plain email text. The design does not assume that an email client renders interactive controls.
- The visitor can edit `[ ]` to `[x]`, add specifics, and explain the request in the email editor.
- The page provides a copyable email address, and preferably a copyable request template, for visitors without a configured `mailto:` handler.
- The site does not submit, store, or send the request.

### Owner Request Import

Owner mode includes a "Paste request email" textarea and an "Apply request" action. Parsing happens entirely in the browser:

1. Find lines whose normalized form is `[x] <configured method label>` or `[X] <configured method label>`.
2. Tolerate surrounding whitespace and common quoted-email prefixes such as `>`.
3. Match the remaining label case-insensitively against configured request-method labels.
4. Union the matched methods' `defaultFieldIds`.
5. Apply that union as the current suggested field selection.
6. Report matched and unmatched checked lines, then leave every checkbox editable.

Additional prose, email headers, signatures, unchecked lines, and unknown labels do not select fields. A method with no default fields is reported as matched but leaves the choice to the owner.

The pasted email is untrusted text. Do not render it as HTML, execute links from it, persist it, log it, or submit it to the server. The parser is an owner convenience, not an authorization or policy boundary.

The owner reviews the suggestion, chooses suitable fields, creates an access link, and pastes it into the email reply. The incoming email never finalizes or constrains the owner's selection.

## User Interface States

### Public Visitor

- Show public contact details at the top.
- Offer vCard download and QR output for the currently public details when the result is useful.
- Offer the request-email action.
- Keep owner login available but visually secondary.

### Granted Visitor

- Show public and granted details together at the top.
- Show a concise indication that additional details have been shared with this browser.
- Generate vCard and QR output from the same effective field set.
- Continue to offer the request-email action because the visitor may need something else.

### Owner

- Show an explicit owner-mode indicator and logout.
- Show all fields with values and selection checkboxes.
- Offer named sets that replace the current selection with the set's field IDs.
- Allow the owner to adjust any preset arbitrarily.
- Offer a plain-text request-email textarea that can apply checked methods as a suggested selection.
- Show which request methods matched, which checked lines did not match, and keep the resulting field selection editable.
- Offer:
  - Show selected vCard QR.
  - Download selected vCard.
  - Copy seven-day access link.
- Disable selection-dependent actions when no useful fields are selected.
- Do not expose the owner access key after login.

## Request and Route Boundaries

The exact file split may follow SvelteKit conventions discovered during implementation, but the behavior should have these boundaries:

| Boundary | Authentication | Responsibility |
| --- | --- | --- |
| `/contact` server load | Optional owner and visitor cookies | Return mode, filtered fields, sets for owners, and request-method labels. |
| Owner login action | Public, rate limited | Verify access key and set owner cookie. |
| Owner logout action | Owner or idempotent public | Clear owner cookie. |
| Grant creation action | Owner | Validate selected IDs and return a signed seven-day link. |
| Grant claim action | Public | Verify fragment-submitted token and set or extend the visitor cookie. |
| `/api/vcard` | Optional owner and visitor cookies | Return only the authorized vCard or QR representation. |

Token parsing, cookie handling, profile filtering, and vCard generation belong in server-only library modules rather than inside page components.

## Security Boundary

This feature is intended to deter indexing, accidental disclosure, casual guessing, and unauthorized direct endpoint access. It does not prevent:

- An authorized recipient from saving, copying, photographing, or forwarding contact details.
- A forwarded access link from being used before it expires.
- A person with access to the owner's unlocked browser from using the one-year owner session.
- Disclosure after compromise of the server, owner access key, or signing secrets.
- A QR recipient from retaining contact values indefinitely.

Required controls:

- Filter private values before serialization.
- Validate every token's algorithm, type, audience, signature, expiration, profile, and version.
- Use constant-time secret comparisons.
- Check the request origin for owner actions.
- Never log access keys, grant tokens, visitor tokens, or private contact values.
- Treat pasted request emails as untrusted text and process them locally without HTML rendering or persistence.
- Use `Cache-Control: private, no-store` for personalized HTML and contact artifacts.
- Use `Referrer-Policy: no-referrer` on the contact route.
- Reject malformed field selections and unknown IDs.
- Ensure errors do not echo secrets or private values.

## Implementation Plan

### Phase 1: Contact Domain

- [ ] Define the minimal TOML shorthand, deterministic inference rules, optional overrides, and normalized contact model.
- [ ] Add a server-only TOML loader that expands scalar and named-table fields, sets, inferred request methods, and profile defaults.
- [ ] Replace the raw vCard-line identity model with canonical TOML-path field IDs.
- [ ] Resolve a referenced photo asset into a Workers-compatible embedded vCard value without placing base64 data in the TOML.
- [ ] Add pure field-selection and effective-authorization helpers.
- [ ] Add vCard serialization with photo support and QR preparation that omits photo fields structurally.
- [ ] Add focused unit tests for shorthand expansion, overrides, ambiguity failures, set expansion, request inference, selection, and vCard output, introducing a Vite-compatible test runner if needed.

### Phase 2: Protect Existing Outputs

- [ ] Move the current vCard and QR generation onto the new profile and selection helpers.
- [ ] Preserve public behavior using only fields explicitly marked public.
- [ ] Add owner-selected and visitor-authorized output modes.
- [ ] Add no-store and cookie-varying response headers.
- [ ] Verify that query-parameter tampering cannot expand visitor access.

Do not remove the old construction path until the new public vCard and QR behavior has been verified.

### Phase 3: Owner Mode

- [ ] Add owner access-key verification without logging sensitive input.
- [ ] Add one-year signed owner cookies and logout.
- [ ] Return the complete profile and named sets only in owner mode.
- [ ] Build field selection, preset application, direct vCard download, and direct QR display.
- [ ] Add the signed access-link action and copy interaction.

### Phase 4: Visitor Grants

- [ ] Add seven-day grant signing and strict verification.
- [ ] Claim fragment tokens through an `onMount`-initiated POST.
- [ ] Remove the fragment and refresh filtered page data after claim.
- [ ] Add the 24-hour visitor cookie and scope-union behavior.
- [ ] Render granted text, links, vCard, and QR from the same effective field set.

### Phase 5: Request Email and Import

- [ ] Generate the bracket-only checklist from `requestMethods`.
- [ ] Build the encoded `mailto:` subject and body.
- [ ] Add copy fallbacks for the address and template.
- [ ] Add the owner-only paste textarea and a pure client-side checked-method parser.
- [ ] Map recognized methods to default field suggestions and report unmatched checked lines.
- [ ] Verify the result in common desktop and mobile email flows without assuming rendered checkbox controls.

### Phase 6: Hardening and Completion

- [ ] Add coarse owner-login throttling and origin checks.
- [ ] Add cache, referrer, and token-redaction protections.
- [ ] Cover invalid, expired, incompatible, and tampered tokens.
- [ ] Verify public, granted, owner, logout, direct QR, direct vCard, grant-link, and request-email flows.
- [ ] Run type checking and linting.
- [ ] Document environment variables, key generation, rotation, and local setup.

## Edge Cases

- **Malformed or missing profile**: Fail closed and log a server-side configuration error without rendering private fallback data.
- **Ambiguous public email**: Require `public.email.main` or an explicit `profile.request_email`; never choose an arbitrary address.
- **Scalar and table forms conflict**: Reject the TOML with the conflicting canonical path.
- **Renamed TOML path**: Treat it as a field-ID change and require a profile-version increment when outstanding grants must be invalidated.
- **Empty kind or set expansion**: Reject references that resolve to no private fields.
- **Unsupported inference**: Require an explicit inline or custom-field override rather than guessing.
- **Unknown field in a set**: Reject the profile configuration.
- **Unknown field in an owner submission**: Reject the request; do not silently sign a partial selection.
- **Expired or invalid grant**: Remove or ignore the fragment, retain public access, and show a generic message.
- **Old profile version**: Reject the grant or visitor cookie and retain public access.
- **Multiple grants**: Union valid private scopes and issue a fresh 24-hour visitor cookie.
- **Empty grant selection**: Do not create a link.
- **Lost owner device**: Rotate the owner-session secret or session version to invalidate all owner cookies.
- **Owner access-key rotation**: Change the stored digest. Rotate the session secret as well when existing sessions must be invalidated.
- **No email handler**: Keep the request email address and template copyable.
- **Checklist not rendered as controls**: The bracket checklist remains understandable and editable as plain text.
- **Pasted request uses old labels**: Report unmatched checked lines and do not guess at field selection.
- **Pasted request contains HTML, links, or quoted content**: Treat everything as text; only recognized checked lines affect the suggestion.
- **Request method has no defaults**: Report the method as matched and let the owner select fields manually.
- **Oversized QR payload**: Keep vCard download available and tell the owner why QR generation failed.
- **Missing or invalid photo asset**: Fail profile validation with a server-side configuration error rather than emitting a corrupt vCard.
- **Photo field**: Embed it in an authorized downloaded vCard when selected; never place its encoded payload in the QR.

## Success Criteria

- [ ] An unauthenticated page response, serialized page data, vCard request, and QR request contain no private contact value.
- [ ] A random owner access key can establish a one-year owner session, and logout removes it.
- [ ] Owner, grant, and visitor tokens cannot be substituted for one another.
- [ ] Named sets initialize owner selections, and the owner can adjust any field afterward.
- [ ] The owner can manage the profile through concise TOML without editing TypeScript or raw vCard lines.
- [ ] A common email, phone, URL, address, photo, set, and request configuration does not repeat inferred IDs, labels, kinds, visibility, links, vCard properties, shareability, or request mappings.
- [ ] The TOML loader produces the same validated normalized model for shorthand values and their equivalent explicit overrides.
- [ ] A downloaded vCard embeds the configured selected photo, while the equivalent QR vCard contains no photo property or continuation data.
- [ ] The owner can produce a vCard and direct vCard QR containing exactly the checked fields plus required identity fields, subject to the QR photo exclusion.
- [ ] The owner can copy a signed link for the checked private fields.
- [ ] Opening a valid link grants only those fields and persists them for 24 hours.
- [ ] Expired, modified, wrongly typed, or incompatible tokens do not reveal private data.
- [ ] Visitor text, link, vCard, and QR output agree on the effective authorized field set.
- [ ] The request action opens an email draft containing every configured request-method label as a bracket-only checklist item.
- [ ] Pasting an email with checked methods suggests the configured default fields, reports unmatched entries, sends no pasted content to the server, and leaves the owner in control of the final selection.
- [ ] No database or email provider is required.
- [ ] Key setup, rotation, and recovery behavior are documented.

## Deferred Work

### Typed Access Codes

Add typed codes only after a demonstrated need to share remotely with someone who cannot receive a link or scan the owner's QR code. At that point, evaluate:

- A compact authenticated set encoding.
- Named-set indices versus limited arbitrary field masks.
- Human-friendly Base32 formatting.
- Expiration windows and progressive abuse protection.

Do not reserve field-bit positions or constrain the v1 profile around a hypothetical code format.

### Reusable Component

After the route behavior is stable, extract:

- Pure contact selection and vCard generation.
- Svelte owner and visitor presentation components.
- Server token and cookie adapters.
- A documented host-provided profile contract.

### Database-Free Hosted Service

A separate specification should evaluate storing an encrypted contact payload in a URL fragment. It must document that the resulting URL is a bearer capability, cannot be made both short and database-free, and cannot revoke information after delivery.

## References

- [`src/routes/(centered)/contact/+page.svelte`](<../src/routes/(centered)/contact/+page.svelte>) - Current public contact presentation.
- [`src/routes/(centered)/contact/+page.server.ts`](<../src/routes/(centered)/contact/+page.server.ts>) - Current server-load placeholder.
- [`src/routes/(centered)/contact/contact-info.server.example.toml`](<../src/routes/(centered)/contact/contact-info.server.example.toml>) - Existing vCard and set experiment.
- [`src/routes/api/vcard/+server.ts`](../src/routes/api/vcard/+server.ts) - Existing public vCard and QR implementation.
- [`src/hooks.server.ts`](../src/hooks.server.ts) - Current request hook.
- [`package.json`](../package.json) - Runtime, dependencies, and available checks.
- [`wrangler.toml`](../wrangler.toml) - Cloudflare Workers deployment configuration.
