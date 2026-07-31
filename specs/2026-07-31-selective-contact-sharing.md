# Selective Contact Sharing

**Date**: 2026-07-31
**Status**: In Progress - direct sharing and visitor grants are implemented; request email remains
**Owner**: John

## One Sentence

Turn `/contact` into a database-free, capability-gated contact profile where the admin selects the details to share, presents them directly as a vCard QR code or sends a signed access link, and visitors can request additional contact methods through a prefilled email.

## Overview

The contact route now loads a server-only TOML profile, exposes only public fields to visitors, and generates filtered vCard downloads and QR codes. A separate admin route provides access-key login, a one-year session, short-lived mobile bootstrap links, named field presets, arbitrary field selection, direct vCard downloads, and direct QR sharing.

The completed work establishes two modes:

- Visitor mode shows public details with matching vCard and QR representations. Website fields stay in contact artifacts but are omitted from the site UI because the visitor is already on the website.
- Admin mode is unlocked with a high-entropy admin access key. It shows every contact field, applies named sets as selection presets, and generates a direct vCard QR code or download for an arbitrary selection.

The remaining target adds the request-email workflow and final hardening. The full change is complete when an unauthorized request cannot retrieve a private value from page data, vCard, or QR endpoints; the admin can share any selected combination by QR or signed link; and a pasted request email can initialize a reviewed selection without becoming trusted input.

## Scope

In scope:

- A human-authored, server-only TOML contact profile parsed into a structured internal model.
- Public fields, private fields, required identity fields, named sets, and public request-method labels.
- An optional photo embedded in downloaded vCards but omitted from QR payloads.
- High-entropy admin-key login and a one-year admin session.
- Arbitrary admin field selection.
- Direct vCard QR and vCard download generation from the admin's selection.
- Signed, seven-day visitor access links.
- Signed, 24-hour visitor sessions.
- Authorized text, link, vCard, and QR representations.
- A `mailto:` request containing a plain-text bracket checklist of contact methods.
- Admin-side parsing of a pasted request email into an editable suggested field selection.
- Tests for profile filtering, token boundaries, vCard generation, and authorization.

Out of scope:

- Typed OTPs or short access codes.
- D1, KV, or another grant database.
- Automated email delivery or a server-submitted request form.
- Visitor-side selection before opening the email draft.
- Per-device admin-session listing or revocation.
- Extracting a reusable package or operating a URL-only hosted service.

## Current State

- [`+page.server.ts`](<../src/routes/(centered)/contact/+page.server.ts>) returns public contact fields and public request-method labels without serializing private values. URL fields are omitted from this route's visible data.
- [`+page.svelte`](<../src/routes/(centered)/contact/+page.svelte>) renders the public fields, vCard download, QR code, and a small link to `/contact/admin`.
- [`contact-info.server.example.toml`](<../src/routes/(centered)/contact/contact-info.server.example.toml>) documents concise public and private fields, the bank preset, named sets, and the optional `qr_as_address` compatibility override. Local development can load an ignored private TOML file; deployments load the same TOML text from the `CONTACT_INFO_TOML` runtime secret.
- [`/contact/admin`](<../src/routes/(centered)/contact/admin/+page.svelte>) provides access-key login, a single "Log out of admin mode" control, 10-minute mobile login links, and the full-width field-selection interface.
- [`AdminContactControls.svelte`](<../src/routes/(centered)/contact/admin/AdminContactControls.svelte>) provides dense field rows, wrapping labels, named presets, arbitrary checkbox edits, and direct vCard and QR output. Field values are hidden by default, with per-field reveal and copy actions; revealing one field hides the previous value. A preset containing every shareable field clears the selection when everything is already checked, and oversized QR selections show an actionable error without disabling vCard download.
- [`/api/vcard`](../src/routes/api/vcard/+server.ts) uses public authorization by default, accepts explicit field selections only from an authenticated admin, and serializes download and QR representations separately.
- [`qr.ts`](../src/lib/qr.ts) encodes QR input as UTF-8 bytes so non-ASCII contact text survives scanning.
- [`admin-auth.server.ts`](../src/lib/contact/admin-auth.server.ts) implements high-entropy access-key verification, one-year admin sessions, and 10-minute bootstrap tokens with distinct token claims.
- Focused profile, vCard, QR, and admin-auth tests cover the implemented domain and token boundaries.
- Signed seven-day visitor grants, fragment claiming, unioned 24-hour visitor sessions, and granted
  page/vCard/QR representations are implemented. Request email and request import remain.
- [`wrangler.toml`](../wrangler.toml) establishes Cloudflare Workers as an intended deployment target.

## Terminology

- **Admin access key**: A randomly generated bearer credential used only to enter admin mode. It is not a cryptographic private key and is not used to sign sessions or grants.
- **Admin session**: A signed, persistent cookie proving that the current browser has completed admin login.
- **Contact field**: One independently renderable and shareable value, such as a personal email address, Korean mobile number, or mailing address.
- **Required identity field**: A field, such as the display name, that is added when necessary to produce a useful or valid contact artifact.
- **Set**: A named admin preset containing contact field IDs. A set initializes the admin's checkboxes but does not restrict later edits.
- **Grant**: A signed bearer token authorizing a specific list of private contact field IDs until its claim deadline.
- **Visitor session**: A signed cookie containing the field IDs granted to the current browser.
- **Direct artifact**: A vCard file or QR code generated for the admin's exact current selection. Its contact values are delivered directly and cannot expire after being scanned or saved.
- **Request method**: A public, value-free label such as "Email", "Phone", or "Postal mail" included in the visitor's email checklist, with optional default field IDs used only to initialize the admin's selection.
- **Request import**: Client-side parsing of a pasted request email. It recognizes checked method labels and suggests fields but never authorizes or sends anything by itself.

## Design Decisions

| Decision                 | Class                   | Choice                                                                       | Rationale                                                                                                                                            |
| ------------------------ | ----------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Initial sharing channels | Design coherence        | Direct vCard QR in person and signed access links remotely                   | These cover the expected face-to-face and remote cases without adding a rarely used short-code flow.                                                 |
| Admin credential         | Taste under constraints | Random 128-bit-or-stronger admin access key                                  | A high-entropy key can use fast verification and does not need password-strength rules or an adaptive password hash.                                 |
| Credential separation    | Design coherence        | Separate admin access, admin-session, and grant-signing secrets              | Compromise of an entered admin credential must not directly reveal the key used to forge visitor grants.                                             |
| Admin session lifetime   | Taste under constraints | One year                                                                     | This is a single-admin personal site, and avoiding frequent reauthentication is worth the lost-device risk.                                          |
| Grant storage            | Design coherence        | Stateless signed token                                                       | Links can carry field IDs and expiration without carrying contact values or requiring a database.                                                    |
| Grant claim lifetime     | Taste under constraints | Seven days                                                                   | Email recipients have time to open the link without making the bearer capability effectively permanent.                                              |
| Visitor session lifetime | Taste under constraints | 24 hours after claim                                                         | A recipient can revisit and download the contact data without reopening the email link.                                                              |
| Authoring format         | Evidence                | Minimal server-only TOML shorthand parsed into the internal TypeScript model | The file should state contact facts once; IDs, labels, visibility, links, vCard properties, and request mappings are inferred from their TOML paths. |
| Photo handling           | Design coherence        | Embed the configured photo in downloaded vCards and omit it from QR vCards   | This preserves the current full-card behavior without exceeding practical QR payload size.                                                           |
| QR note compatibility    | Evidence                | Allow custom fields to opt into `ADR;TYPE=OTHER` only in QR vCards           | iPhone Camera drops `NOTE` values but imports an `OTHER` address. Downloads keep the configured property, including `NOTE`.                          |
| Public website display   | Taste under constraints | Keep URL fields in contact artifacts but omit them from `/contact` UI        | Repeating the current website on its own contact route adds noise without helping the visitor.                                                       |
| Visitor request UI       | Design coherence        | One `mailto:` action with a plain-text bracket checklist                     | The email itself captures selections and context; the admin chooses the actual fields to grant.                                                      |
| Request import           | Design coherence        | Parse pasted email locally into an editable suggestion                       | This saves admin effort without treating visitor-edited text as trusted state.                                                                       |
| Named sets               | Design coherence        | Admin-only presets using stable field IDs                                    | Sets speed common selections without limiting arbitrary combinations or becoming part of the security model.                                         |
| Dynamic values           | Evidence                | Render as escaped Svelte values, not dynamic `{@html}`                       | Private contact data must not pass through the current developer-authored Markdown HTML path.                                                        |
| Reusable package         | Deferred                | Preserve pure core boundaries but do not extract in v1                       | The route behavior should settle before its API is made public.                                                                                      |

## Contact Profile

### Human-Authored Source

The canonical authoring source is a server-only TOML file based on the existing `contact-info.server.example.toml`. The implementation parses and validates that text into the normalized TypeScript model used by the rest of the feature.

The real TOML file must not be committed to a public repository. Keep a redacted example in version control, use an ignored private file for local development, and store the complete TOML text in the `CONTACT_INFO_TOML` runtime secret for Cloudflare or Vercel. Editing the TOML or replacing its referenced photo takes effect after a rebuild or redeploy; runtime content management is out of scope.

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
"Korea mobile" = "+82 10 5555 6789"
"US mobile" = "+1 212 555 6789"

[private.address.korea]
street = "161 Sajik-ro, Jongno-gu"
city = "Seoul"
postal_code = "03045"
country = "South Korea"

[private.custom.bank]
"Bank account" = "Example Bank 123"

[sets]
korea = ["phone.Korea mobile", "address.korea"]
business = ["email.work", "phone.US mobile"]
```

This produces normalized fields such as `public.email`, `private.email.work`, and `private.phone.Korea mobile` without repeating those IDs in the file.

The TOML should reference an image asset rather than containing a large base64 string. The server-only profile loader resolves that reference into an embeddable photo value at build time. It must remain compatible with Cloudflare Workers and must not depend on reading an arbitrary local filesystem path at request time.

### Inference Rules

Inference must be deterministic and documented:

- The `public` or `private` namespace determines visibility.
- The next path segment determines the field kind: `email`, `phone`, `url`, `address`, or `custom`.
- A scalar kind value creates one field, such as `public.email`.
- A table under a kind normally creates named fields, such as
  `private.phone.Korea mobile`.
- An inline table containing `value` is one field with explicit overrides, not a group of child fields.
- An address table containing recognized address components is one structured address field. The parser does not guess an address structure from a free-form string.
- The canonical field ID is its full TOML path. Reordering entries does not change IDs.
- A scalar named phone uses its TOML key as its label and defaults to the `CELL` vCard type.
  A recognized, case-insensitive prefix followed by `:` overrides the type, such as
  `"fax: Korea office"`. Whitespace surrounding the label after the separator is ignored.
  Unknown prefixes remain part of the label. Inline phone tables retain explicit label and
  type behavior.
- Other named field labels default to their title-cased alias plus the kind.
- A singleton label defaults to the kind label, such as "Email" or "Website".
- Email and phone links are inferred as `mailto:` and `tel:`.
- The vCard property is inferred from the kind.
- Well-known inline-table aliases such as `home`, `work`, `cell`, and `fax` may infer a vCard
  type. Other aliases do not invent one.
- A scalar named private URL uses its TOML key as the stable field-ID suffix, public request
  label, and mixed-case vCard type. An optional URL fragment is its private username.
  Authorized UI renders the decoded fragment as a parenthetical label suffix, while vCard
  or QR output appends its normalized token to the field type for iOS and retains the
  fragment in the URL for Android. Inline URL tables remain explicit and do not interpret
  fragments as usernames.
- A scalar entry under `custom.bank` uses its TOML key as the label and its scalar as the
  private value. It infers a `NOTE` for downloaded vCards, prefixes the artifact value with
  the label, and enables the `OTHER` address representation for QR vCards. Private bank
  fields also infer one value-free `Bank` request method.
- Inferred standard fields are shareable by default.
- The profile ID defaults to the single configured profile, and the profile version defaults to `1`. Either may be supplied in `[profile]` when needed.
- The request email defaults to the singleton public email or the public email named `main`. Multiple public emails without `main` require an explicit `request_email`.
- Each standard private field kind becomes one request method. Named URL fields instead
  become separate request methods using their value-free field labels. The `custom.bank`
  preset becomes one Bank request method; other custom fields require an explicit request
  override.
- Applying a named set selects every public field plus the private references in that set. The admin may then change any checkbox.
- A set reference such as `phone.Korea mobile` resolves within the private namespace. A kind reference such as `phone` expands to every private phone field. The reserved value `all` expands to every private field.
- The top-level photo becomes a public identity field included in downloaded vCards when selected by the effective policy and always omitted from QR vCards. Its media type is inferred from the file extension unless explicitly overridden.

Common scalar values may be replaced by inline tables when inference is insufficient:

```toml
[private.phone]
office = { value = "+1 212 555 6789", label = "US office", type = "work" }

[private.url]
KakaoTalk = "https://open.kakao.com/o/example#ExampleUser"
```

Only meaningful overrides belong in these tables. Authors should not need to restate inferred IDs, kinds, visibility, shareability, links, or request mappings.

Structured values remain structured where guessing would be unsafe. Addresses use named components, and an optional structured-name override may supply family, given, additional, prefix, and suffix components. A plain `profile.name` remains sufficient for display and a valid conservative vCard representation.

Optional request overrides are available only when the inferred private-kind behavior is wrong:

```toml
[requests.phone]
label = "Phone"
fields = ["phone.Korea mobile"]

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

- TOML is the admin-facing storage format; the TypeScript type is the validated internal representation.
- Field IDs are stable canonical TOML paths. Changing a value or an explicit label does not change the ID; renaming a path does and may require a profile-version increment.
- A set uses concise field-path or kind references that the parser resolves to normalized field IDs, never raw vCard lines.
- Unknown or duplicate IDs fail configuration validation.
- Request methods and their defaults are inferred from private field kinds unless explicitly overridden. They expose labels only to visitors; normalized default field IDs are returned only in admin mode and initialize, but never finalize, the admin's response selection.
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

admin page
  -> all fields

admin direct artifact
  -> exact checked fields + required identity fields
```

Additional rules:

- A grant contains private field IDs selected by the admin. Public fields do not need to be included in its scope.
- Claiming another valid grant unions its private field IDs with the current visitor session and starts a new 24-hour session for the combined scope.
- Invalid, expired, incorrectly signed, or incompatible tokens add no authorization. A previously
  valid visitor session remains effective; otherwise access is public-only.
- Client-supplied field IDs never expand a visitor's authorized scope.
- Private values are filtered before SvelteKit serializes page data. They are not sent and hidden with CSS or client-side conditions.

## Admin Authentication

### Credential

Generate an admin access key with at least 128 bits of cryptographic randomness and store the original in the admin's password manager. Use a recognizable prefix such as `admin_` to prevent confusion with other secrets.

Store only a SHA-256 digest of the access key in private deployment configuration. A fast digest is acceptable because the input is randomly generated rather than human chosen.

Use separate private secrets for:

- Admin-session signing.
- Visitor-grant and visitor-session signing.

Separate environment variables are preferred. Domain-separated derived keys are acceptable if a single root secret is deliberately used.

### Login

The admin login form submits the access key in a POST body. The server:

1. Applies a conservative input-length limit.
2. Hashes the submitted value.
3. Compares the digest in constant time.
4. Returns one generic invalid-key response on failure.
5. Issues the admin cookie on success.

The access key, its digest, request body, and partial values must never be logged. No value derived from the access key is stored in browser storage.

The key's entropy removes the need for password complexity rules, an adaptive password hash, or Turnstile. Retain a coarse endpoint limit to control traffic abuse and accidental repeated submissions rather than to make the key guess-resistant.

### Admin Session

The admin cookie contains a signed token with:

- A token type or audience that can only be accepted as an admin session.
- A session-version claim.
- Issued-at and one-year expiration timestamps.

Cookie attributes:

- `HttpOnly`
- `Secure` in production
- `SameSite=Lax`
- `Path=/`
- One-year `Max-Age`

Admin logout clears the cookie. Rotating the admin-session signing secret or incrementing the configured session version invalidates all existing admin sessions. Per-device revocation is not supported without server-side state.

The admin UI must clearly indicate admin mode and provide an obvious logout action because the session is long-lived.

### Mobile Login Bootstrap

An authenticated admin may explicitly generate a signed mobile-login link and QR code. The link
contains a short-lived bootstrap token in its URL fragment, never the permanent admin access key:

```txt
/contact/admin#login=<signed-bootstrap-token>
```

The bootstrap token uses a distinct token type and audience, includes the current admin-session
version, and expires after 10 minutes. The fragment is not sent with the initial HTTP request. After
the page mounts, client code removes the fragment from browser history before submitting the token
to the server in a POST body. A valid bootstrap token establishes the normal one-year admin cookie.

Because this design has no server-side token store, a bootstrap token is reusable until it expires;
it must not be described as single-use. Rotating the admin-session secret or version invalidates
both existing admin sessions and outstanding bootstrap tokens.

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

The admin creates a link by submitting the current private-field selection to a protected server action. The server validates every field ID against the profile before signing.

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

It uses the same cookie protections as the admin cookie, with a 24-hour `Max-Age`. It must not be accepted as an admin session even if the same underlying token library is used.

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
- An admin request may provide selected field IDs and receives exactly that selection plus required identity fields.
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
- Honor an explicit `qr_as_address` compatibility override for custom fields, preserving the
  configured value as a normal vCard property in downloads while emitting it as an `OTHER` address
  in QR vCards for iPhone Camera compatibility.
- Apply the same representation automatically to `custom.bank`, prefixing the artifact value
  with its value-free field label.
- Embed the configured photo with the correct vCard encoding, media type, and line folding in downloaded vCards.
- Remove the structured photo field before QR serialization instead of trying to strip serialized continuation lines afterward.
- Return an actionable admin-side error when the selected vCard is too large for a QR code rather than silently dropping requested contact fields.

The admin QR encodes the selected contact values directly. Scanning it does not create a visitor session and cannot be revoked or expired after the values have been delivered.

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

### Admin Request Import

Admin mode includes a "Paste request email" textarea and an "Apply request" action. Parsing happens entirely in the browser:

1. Find lines whose normalized form is `[x] <configured method label>` or `[X] <configured method label>`.
2. Tolerate surrounding whitespace and common quoted-email prefixes such as `>`.
3. Match the remaining label case-insensitively against configured request-method labels.
4. Union the matched methods' `defaultFieldIds`.
5. Apply that union as the current suggested field selection.
6. Report matched and unmatched checked lines, then leave every checkbox editable.

Additional prose, email headers, signatures, unchecked lines, and unknown labels do not select fields. A method with no default fields is reported as matched but leaves the choice to the admin.

The pasted email is untrusted text. Do not render it as HTML, execute links from it, persist it, log it, or submit it to the server. The parser is an admin convenience, not an authorization or policy boundary.

The admin reviews the suggestion, chooses suitable fields, creates an access link, and pastes it into the email reply. The incoming email never finalizes or constrains the admin's selection.

## User Interface States

### Public Visitor

- Show public contact details at the top.
- Offer vCard download and QR output for the currently public details when the result is useful.
- Offer the request-email action.
- Keep a small link to `/contact/admin` at the bottom of the page.

### Granted Visitor

- Show public and granted details together at the top.
- Show a concise indication that additional details have been shared with this browser.
- Generate vCard and QR output from the same effective field set.
- Continue to offer the request-email action because the visitor may need something else.

### Admin

- Show one explicit "Log out of admin mode" button.
- Show all fields with values and selection checkboxes.
- Offer named sets that replace the current selection with the set's field IDs.
- When an all-fields preset is applied while every shareable field is selected, clear the selection.
- Allow the admin to adjust any preset arbitrarily.
- Use dense, full-width field rows; align checkboxes to the first line and allow long labels to wrap.
- Offer a plain-text request-email textarea that can apply checked methods as a suggested selection.
- Show which request methods matched, which checked lines did not match, and keep the resulting field selection editable.
- Offer:
  - Show selected vCard QR.
  - Download selected vCard.
  - Copy seven-day access link.
- Disable selection-dependent actions when no useful fields are selected.
- Do not expose the admin access key after login.
- Allow an authenticated admin to generate a 10-minute mobile-login link and QR code.

## Request and Route Boundaries

The exact file split may follow SvelteKit conventions discovered during implementation, but the behavior should have these boundaries:

| Boundary                                 | Authentication                     | Responsibility                                                                  |
| ---------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------- |
| `/contact` server load                   | Public                             | Return only public fields and request-method labels.                            |
| `/contact/admin` server load             | Optional admin cookie              | Return the login state or all fields and named sets for an authenticated admin. |
| `/contact/admin` login action            | Public, rate limited               | Verify access key and set admin cookie.                                         |
| `/contact/admin` bootstrap-create action | Admin                              | Return an explicitly requested 10-minute mobile-login link and QR code.         |
| `/contact/admin` bootstrap-claim action  | Public                             | Verify a fragment-submitted bootstrap token and set the admin cookie.           |
| `/contact/admin` logout action           | Admin or idempotent public         | Clear admin cookie and return to `/contact`.                                    |
| Grant creation action                    | Admin                              | Validate selected IDs and return a signed seven-day link.                       |
| Grant claim action                       | Public                             | Verify fragment-submitted token and set or extend the visitor cookie.           |
| `/api/vcard`                             | Optional admin and visitor cookies | Return only the authorized vCard or QR representation.                          |

Token parsing, cookie handling, profile filtering, and vCard generation belong in server-only library modules rather than inside page components.

## Security Boundary

This feature is intended to deter indexing, accidental disclosure, casual guessing, and unauthorized direct endpoint access. It does not prevent:

- An authorized recipient from saving, copying, photographing, or forwarding contact details.
- A forwarded access link from being used before it expires.
- A person with access to the admin's unlocked browser from using the one-year admin session.
- Disclosure after compromise of the server, admin access key, or signing secrets.
- A QR recipient from retaining contact values indefinitely.

Required controls:

- Filter private values before serialization.
- Validate every token's algorithm, type, audience, signature, expiration, profile, and version.
- Use constant-time secret comparisons.
- Check the request origin for admin actions.
- Never log access keys, grant tokens, visitor tokens, or private contact values.
- Treat pasted request emails as untrusted text and process them locally without HTML rendering or persistence.
- Use `Cache-Control: private, no-store` for personalized HTML and contact artifacts.
- Use `Referrer-Policy: no-referrer` on the contact route.
- Reject malformed field selections and unknown IDs.
- Ensure errors do not echo secrets or private values.

## Implementation Plan

### Phase 1: Contact Domain

- [x] Define the minimal TOML shorthand, deterministic inference rules, optional overrides, and normalized contact model.
- [x] Add a server-only TOML loader that expands scalar and named-table fields, sets, inferred request methods, and profile defaults.
- [x] Replace the raw vCard-line identity model with canonical TOML-path field IDs.
- [x] Resolve a referenced photo asset into a Workers-compatible embedded vCard value without placing base64 data in the TOML.
- [x] Add pure field-selection and effective-authorization helpers.
- [x] Add vCard serialization with photo support, structural QR photo omission, UTF-8 QR encoding, and the opt-in QR address representation.
- [x] Add focused unit tests for shorthand expansion, overrides, ambiguity failures, set expansion, request inference, selection, vCard output, and QR encoding.

### Phase 2: Protect Existing Outputs

- [x] Move the current vCard and QR generation onto the new profile and selection helpers.
- [x] Preserve public behavior using only fields explicitly marked public.
- [x] Add admin-selected output mode.
- [x] Add visitor-authorized output mode.
- [x] Add no-store and cookie-varying response headers.
- [x] Verify that query-parameter field selection cannot expand public access.

Do not remove the old construction path until the new public vCard and QR behavior has been verified.

### Phase 3: Admin Mode

- [x] Add admin access-key verification without logging sensitive input.
- [x] Add one-year signed admin cookies and logout.
- [x] Add 10-minute mobile-login links and QR codes using a distinct bootstrap token.
- [x] Return the complete profile and named sets only in admin mode.
- [x] Build field selection, preset application, direct vCard download, and direct QR display.
- [x] Refine the admin UI with one logout control, dense wrapping field rows, default-hidden values, per-field reveal and copy actions, full-width layout, and all-fields deselection.
- [x] Add the signed access-link action and copy interaction.

### Phase 4: Visitor Grants

- [x] Add seven-day grant signing and strict verification.
- [x] Claim fragment tokens through an `onMount`-initiated POST.
- [x] Remove the fragment and refresh filtered page data after claim.
- [x] Add the 24-hour visitor cookie and scope-union behavior.
- [x] Render granted text, links, vCard, and QR from the same effective field set.

### Phase 5: Request Email and Import

- [ ] Generate the bracket-only checklist from `requestMethods`.
- [ ] Build the encoded `mailto:` subject and body.
- [ ] Add copy fallbacks for the address and template.
- [ ] Add the admin-only paste textarea and a pure client-side checked-method parser.
- [ ] Map recognized methods to default field suggestions and report unmatched checked lines.
- [ ] Verify the result in common desktop and mobile email flows without assuming rendered checkbox controls.

### Phase 6: Hardening and Completion

- [ ] Add coarse admin-login throttling and origin checks.
- [x] Add private no-store caching and no-referrer protections to implemented contact routes.
- [ ] Complete token-redaction and origin protections for the remaining grant actions.
- [x] Cover invalid, expired, incompatible, and tampered tokens.
- [ ] Verify public, granted, admin, logout, direct QR, direct vCard, grant-link, and request-email flows.
- [ ] Run type checking and linting.
- [x] Document admin environment variables, key generation, and local setup.
- [x] Document grant-key rotation and recovery.

## Edge Cases

- **Malformed or missing profile**: Fail closed and log a server-side configuration error without rendering private fallback data.
- **Ambiguous public email**: Require `public.email.main` or an explicit `profile.request_email`; never choose an arbitrary address.
- **Scalar and table forms conflict**: Reject the TOML with the conflicting canonical path.
- **Renamed TOML path**: Treat it as a field-ID change and require a profile-version increment when outstanding grants must be invalidated.
- **Empty kind or set expansion**: Reject references that resolve to no private fields.
- **Unsupported inference**: Require an explicit inline or custom-field override rather than guessing.
- **Unknown field in a set**: Reject the profile configuration.
- **Unknown field in an admin submission**: Reject the request; do not silently sign a partial selection.
- **Expired or invalid grant**: Remove or ignore the fragment, preserve any valid existing visitor
  session, and show a generic message.
- **Old profile version**: Reject the grant or visitor cookie and retain public access.
- **Multiple grants**: Union valid private scopes and issue a fresh 24-hour visitor cookie.
- **Empty grant selection**: Do not create a link.
- **Lost admin device**: Rotate the admin-session secret or session version to invalidate all admin cookies.
- **Admin access-key rotation**: Change the stored digest. Rotate the session secret as well when existing sessions must be invalidated.
- **No email handler**: Keep the request email address and template copyable.
- **Checklist not rendered as controls**: The bracket checklist remains understandable and editable as plain text.
- **Pasted request uses old labels**: Report unmatched checked lines and do not guess at field selection.
- **Pasted request contains HTML, links, or quoted content**: Treat everything as text; only recognized checked lines affect the suggestion.
- **Request method has no defaults**: Report the method as matched and let the admin select fields manually.
- **Oversized QR payload**: Keep vCard download available and tell the admin why QR generation failed.
- **Missing or invalid photo asset**: Fail profile validation with a server-side configuration error rather than emitting a corrupt vCard.
- **Photo field**: Embed it in an authorized downloaded vCard when selected; never place its encoded payload in the QR.

## Success Criteria

- [x] An unauthenticated page response, serialized page data, vCard request, and QR request contain no private contact value.
- [x] A random admin access key can establish a one-year admin session, and logout removes it.
- [x] An authenticated admin can generate a 10-minute mobile-login link and QR code that establish
      the same admin session without exposing the permanent access key.
- [x] Admin, grant, and visitor tokens cannot be substituted for one another.
- [x] Named sets initialize admin selections, and the admin can adjust any field afterward.
- [x] The admin can manage the profile through concise TOML without editing TypeScript or raw vCard lines.
- [x] A common email, phone, URL, address, photo, set, and request configuration does not repeat inferred IDs, labels, kinds, visibility, links, vCard properties, shareability, or request mappings.
- [x] The TOML loader produces the same validated normalized model for shorthand values and their equivalent explicit overrides.
- [x] A downloaded vCard embeds the configured selected photo, while the equivalent QR vCard contains no photo property or continuation data.
- [x] A configured custom `NOTE` remains a note in downloads and can be represented as an `OTHER` address only in QR vCards.
- [x] QR payloads preserve UTF-8 contact text.
- [x] The admin can produce a vCard and direct vCard QR containing exactly the checked fields plus required identity fields, subject to the QR photo exclusion.
- [x] The admin can copy a signed link for the checked private fields.
- [x] Opening a valid link grants only those fields and persists them for 24 hours.
- [x] Expired, modified, wrongly typed, or incompatible tokens do not reveal private data.
- [x] Visitor text, link, vCard, and QR output agree on the effective authorized field set.
- [ ] The request action opens an email draft containing every configured request-method label as a bracket-only checklist item.
- [ ] Pasting an email with checked methods suggests the configured default fields, reports unmatched entries, sends no pasted content to the server, and leaves the admin in control of the final selection.
- [x] No database or email provider is required.
- [ ] Key setup, rotation, and recovery behavior are documented.

## Deferred Work

### Typed Access Codes

Add typed codes only after a demonstrated need to share remotely with someone who cannot receive a link or scan the admin's QR code. At that point, evaluate:

- A compact authenticated set encoding.
- Named-set indices versus limited arbitrary field masks.
- Human-friendly Base32 formatting.
- Expiration windows and progressive abuse protection.

Do not reserve field-bit positions or constrain the v1 profile around a hypothetical code format.

### Reusable Component

After the route behavior is stable, extract:

- Pure contact selection and vCard generation.
- Svelte admin and visitor presentation components.
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
