# Standalone Selective Contact Sharing

**Date**: 2026-08-06
**Status**: Draft - Durable Object storage recommended; product and identity decisions pending
**Owner**: John
**Related**: [Selective Contact Sharing](./2026-07-31-selective-contact-sharing.md)

## One Sentence

Build a standalone Contact Capsule service where each profile owns isolated server-side state, public and selective-sharing URLs remain short capabilities rather than data containers, and the contact domain stays portable enough to support a Cloudflare OS Gadget later.

## First-Screen Contract

The current `/contact` feature is a single-profile, database-free deployment. Its canonical contact profile is server-only TOML, and its signed visitor links carry field IDs and expiration but never contact values.

The earlier standalone proposal put an entire contact profile in a compressed URL fragment. That removes storage and account infrastructure, but it makes every link an immutable copy of the data. A leaked link cannot be revoked, an edited profile requires new links, and a client receiving the complete profile can inspect every value unless each URL contains only one already-filtered view.

The proposed standalone version instead stores one canonical profile in one SQLite-backed Durable Object. URLs carry a random public profile ID plus, when needed, a random owner or visitor capability in the fragment. The Durable Object owns profile updates, field grants, expiration, and revocation. The browser removes fragment credentials before exchanging them for an HTTP-only session cookie.

This draft is ready for implementation planning when it settles:

1. Whether Durable Objects are the default hosted storage model.
2. Whether v0 ownership uses a recovery capability, a passkey/account, or both.
3. Whether a Cloudflare OS Gadget is an optional edition or a required runtime.
4. Whether self-contained URL snapshots are retained as an import/export format.

## Thesis And Scope

```txt
One sentence:
  Contact data is durable profile state; URLs identify the profile and convey bounded authority.

In scope:
  standalone profile creation, owner editing, selective sharing, short URLs,
  vCard and QR output, revocation, export, deletion, and reusable contact-domain code.

Out of scope:
  a general Cloudflare OS distribution, arbitrary Gadget generation, social discovery,
  contact messaging, CRM features, and end-to-end encrypted multi-device sync.
```

## Storage Models

Durable Objects and Cloudflare OS Gadgets are different layers, not direct alternatives:

```txt
Durable Object
  = stateful compute and isolated persistent storage

Cloudflare OS Gadget
  = one modifiable app instance
    -> runs in the Cloudflare OS Workshop
    -> uses a Dynamic Worker sandbox
    -> is backed by Durable Object state
    -> inherits Workshop identity, sharing, and Blueprint behavior
```

### Comparison

| Concern | Data in URL | Dedicated Durable Object service | Cloudflare OS Gadget |
| --- | --- | --- | --- |
| Canonical state | Every URL is a separate snapshot | One object per profile | One Gadget instance with its own code and state |
| Typical URL | `https://contact.example/#/c/1/<payload>` | `https://contact.example/p/<id>#g=<secret>` | `https://os.example/gadget/<id>#share=<key>` |
| Link length | Roughly 150-800 or more encoded characters | Roughly 50-100 characters | Short object ID plus share key |
| Update behavior | Existing links stay stale | Existing links resolve the current profile | Existing Gadget collaborators see current Gadget state |
| Revocation | Impossible after distribution | Revoke one grant or the whole profile | Revoke Workshop share links or collaborators |
| Selective disclosure | Safe only if each payload contains an already-filtered subset, or values are separately encrypted | The server returns only fields authorized by the grant | Gadget sharing controls Gadget access; field-level contact grants still require app logic |
| Offline and portability | Excellent; the link is the artifact | Requires the service, with explicit export for portability | Requires a Cloudflare OS deployment or compatible `workerd` host |
| Operator trust | No stored server copy when decoding happens only in the browser | The service can read plaintext profile data unless client-side encryption is added | The Cloudflare OS deployment can access Gadget state according to its trust boundary |
| Operational burden | Static hosting only | Worker, Durable Objects, migrations, abuse controls, backups, and data lifecycle | All dedicated-service concerns plus Workshop, Dynamic Workers, identity, and Cloudflare OS upgrades |
| Best fit | Portable snapshots and one-off public cards | Stable hosted contact profiles | Personal, modifiable apps inside an existing Cloudflare OS installation |

### Recommendation

Use a dedicated Durable Object service as the default hosted edition. Keep the URL format as an optional portable snapshot and import/export mechanism, not as the canonical live profile.

This gives the common user a normal product model:

```txt
edit once
  -> every active link sees the current authorized values

revoke once
  -> that link stops working

delete once
  -> the service removes the profile state
```

It also preserves an escape hatch:

```txt
hosted profile
  -> export self-contained capsule
    -> save locally or import into another deployment
```

The exported capsule must be treated as a snapshot. Deleting or updating the hosted profile cannot recall exported data.

## Why One Durable Object Per Profile

The profile is the natural consistency and privacy boundary:

```txt
Profile Durable Object
  owns:
    canonical contact fields
    visibility and shareability policy
    named field sets
    owner credential hashes
    visitor grant hashes and field selections
    grant expiration and revocation
    schema version and migration state

  must not own:
    raw fragment credentials
    plaintext owner recovery secrets
    deployment-wide aliases
    cross-profile analytics
```

One object per profile provides atomic edits and revocations without a shared contact table. Requests for one profile cannot accidentally query another profile's rows. SQLite is more capacity than a contact card needs, but its transactional storage, per-object isolation, point-in-time recovery, and straightforward local `workerd` development make it a better fit than adding a central database solely to store small profiles.

Durable Objects do not make the service operator-blind. Cloudflare encrypts Durable Object data at rest and in transit, but the application code can read the plaintext needed to render the page, vCard, and QR output. End-to-end encrypted storage would move decryption keys back into URLs or devices and would prevent normal server rendering; defer it unless operator-blind storage becomes a product requirement.

## Proposed Architecture

```txt
browser
  -> Contact Capsule Worker
    -> resolve random public profile ID
      -> Profile Durable Object
        -> authorize public, visitor, or owner request
          -> shared contact-domain functions
            -> HTML, vCard, field QR, or vCard QR
```

The Worker owns HTTP routing, cookies, security headers, rate limits, and response encoding. The Durable Object owns persistent profile state and capability validation. The reusable contact core owns parsing, normalized types, selection policy, formatting, request templates, and vCard/QR serialization. Svelte components own presentation and must never decide authorization.

The existing pure boundaries are the extraction starting point:

- [`profile.ts`](../src/lib/contact/profile.ts) - profile parsing, selection, and display formatting.
- [`types.ts`](../src/lib/contact/types.ts) - normalized contact-domain types.
- [`vcard.ts`](../src/lib/contact/vcard.ts) - vCard and vCard QR serialization.
- [`field-qr.ts`](../src/lib/contact/field-qr.ts) - native per-field QR payloads.
- [`request.ts`](../src/lib/contact/request.ts) - request-template generation.

Server authentication in `admin-auth.server.ts` and `visitor-auth.server.ts` is evidence for behavior, but the standalone service should replace deployment-wide signing configuration with per-profile stored capability records.

### Proposed State Shape

The exact schema may change after a storage spike, but it must express this contract:

```ts
type StoredProfile = {
	publicId: string
	schemaVersion: number
	profileVersion: number
	profile: ContactProfile
	createdAt: number
	updatedAt: number
}

type StoredGrant = {
	id: string
	secretHash: string
	fieldIds: string[]
	createdAt: number
	expiresAt: number
	revokedAt?: number
}

type OwnerCredential = {
	id: string
	secretHash: string
	createdAt: number
	revokedAt?: number
}
```

Raw capability secrets are generated with at least 128 bits of entropy, returned once, and stored only as domain-separated HMAC hashes. Contact data and secrets must never be written to application logs.

## URL Contract

### Stable Public Profile

```txt
https://contact.example/p/7KQM4P2D9W3H
```

`7KQM4P2D9W3H` is a random public ID, not a password. It locates the Durable Object and reduces casual enumeration, but public fields remain public. A 12-character Crockford Base32 ID provides 60 random bits and avoids ambiguous characters.

Optional vanity aliases may later provide:

```txt
https://contact.example/@leftium
```

Aliases require deployment-wide uniqueness, moderation, rename, and squatting policy. They should not block v0. The random ID remains the canonical identity when an alias changes.

### Selective Visitor Link

```txt
https://contact.example/p/7KQM4P2D9W3H#g=V1StGXR8_Z5jdHi6B-myTQ
```

The path identifies the profile. The fragment carries an opaque 128-bit grant secret and contains no field IDs or contact values. The Profile Durable Object stores the secret hash, authorized field IDs, expiration, and revocation state.

On first open, the page:

1. Reads `g` from the fragment.
2. Removes the fragment with `history.replaceState`.
3. Posts the secret to the same-origin claim endpoint.
4. Has the Durable Object hash and validate the secret.
5. Receives an HTTP-only, secure, same-site visitor cookie scoped to the profile.
6. Reloads authorized page data.

The service must re-check the stored grant on personalized requests so revocation takes effect. A stateless cookie that remains valid after its source grant is revoked does not meet the target contract.

### Owner Recovery And Device Bootstrap

Minimal no-account v0:

```txt
https://contact.example/p/7KQM4P2D9W3H/admin#owner=lPx8G4...22_chars
```

The creation flow shows the owner URL once, asks the user to save a recovery code, exchanges the fragment for an HTTP-only owner session, and removes the fragment from browser history. Losing every owner credential means losing the ability to edit or delete the profile; the service cannot recover a secret it does not store.

A better consumer UX may add passkeys:

```txt
https://contact.example/manage
```

Passkeys improve recovery and multi-device access but introduce account, credential-registration, and recovery policy. The v0 decision should be explicit rather than accidentally building a weak password system.

An authenticated owner may create a short-lived mobile bootstrap link using the same fragment-exchange pattern as the current `/contact/admin#login=...` flow.

### Artifacts

```txt
https://contact.example/p/7KQM4P2D9W3H/card.vcf
https://contact.example/p/7KQM4P2D9W3H/qr.svg
https://contact.example/p/7KQM4P2D9W3H/field/private.phone.korea/qr.svg
```

These routes use the caller's public, visitor, or owner session. Query parameters never expand authority. A selective link must be claimed before direct artifact routes include its private fields.

### Portable Snapshot

Optional export and import:

```txt
https://contact.example/import#capsule=<versioned-compressed-payload>
```

Import reads the fragment locally, previews the data, creates a new Durable Object only after confirmation, and removes the fragment. Exported snapshots should include only the fields the owner explicitly selects. A full private-profile export should be encrypted with a separate key or downloaded as a file instead of placed into routine browser history and link-sync systems.

## User Experience

### Create A Profile

1. The visitor opens `contact.example` and selects `Create contact page`.
2. The form collects a name and contact fields, with explicit Public, Private, and Not shareable choices.
3. The browser previews the page, vCard, and QR output before saving.
4. Save creates the Profile Durable Object and returns the public link plus the chosen ownership method.
5. The product requires the owner to save a recovery credential before leaving when no passkey/account exists.
6. The owner lands in the field-selection admin view already established by the current feature.

### Share Selected Details

1. The owner checks any public or private fields.
2. The owner chooses `Create access link`.
3. The service stores a grant with the selected field IDs and expiration.
4. The result modal shows a short URL, copy action, QR code, expiration, and `Revoke` action.
5. The recipient opens the link and sees the current values for exactly those fields.
6. Editing an authorized value updates what the recipient sees; adding a new field does not silently add it to an existing grant.

### Manage Links

The owner sees active and expired links with labels, field names, creation time, expiration, last-used time if retained, and revocation state. The UI must not display raw grant secrets after creation. Copying an existing logical share may mint a new secret under the same grant or create a new grant; this remains an open UX decision.

### Delete Or Export

The owner can export a redacted or complete snapshot, then permanently delete the hosted profile. Deletion removes the Durable Object storage and invalidates all hosted URLs. The UI must state that downloaded vCards, screenshots, forwarded values, and exported snapshots cannot be recalled.

## Cloudflare OS Gadget Edition

A Contact Capsule Blueprint is plausible, but it should be an optional edition rather than the hosted product's foundation.

The mapping is attractive:

```txt
Contact Capsule Blueprint
  -> each owner instantiates one Gadget
    -> Gadget code is independently modifiable
    -> Gadget state is isolated in its Durable Object
    -> owner can collaborate or publish another Blueprint
```

It is especially useful for a person or organization that already runs Cloudflare OS and wants a contact app they can modify with an agent. It is less suitable for the default public service because:

- A fixed contact product does not need a separate modifiable code copy for every profile.
- Gadget URLs and navigation inherit the Workshop product shape.
- Cloudflare OS collaboration grants access to the Gadget; it does not replace field-level contact authorization.
- Accountless anonymous access and public contact-page presentation need verification against the current early-access sharing model.
- Running Cloudflare OS adds Dynamic Workers, Workshop identity, deployment, and upgrade responsibilities that the contact use case does not otherwise require.

Cloudflare OS already uses the useful URL pattern this spec adopts: a stable Gadget route plus a `#share=<key>` fragment. Its current sharing design stores only a hash of the raw 128-bit key and supports server-side revocation. The standalone service should borrow that mechanism without inheriting the entire Workshop.

A later adapter can package the shared contact core and UI as a Blueprint. That experiment succeeds when a Gadget can create, edit, selectively share, revoke, export, and render a profile without importing dedicated-service APIs into the contact domain.

## Security And Privacy Boundary

The service is designed to prevent accidental disclosure, indexing of private fields, cross-profile access, casual guessing, log leakage, and continued hosted access after revocation. It cannot prevent an authorized recipient from saving or forwarding values.

Required controls:

- Keep contact values out of ordinary URLs, query strings, logs, analytics, and error messages.
- Put raw owner and visitor capabilities only in fragments, scrub them immediately, and exchange them through same-origin POST requests.
- Store only domain-separated HMAC hashes of raw capability secrets.
- Treat the public profile ID as an identifier, never as authorization.
- Revalidate stored grant status before returning private profile data or artifacts.
- Filter unauthorized fields before serialization into page data, vCard, or QR output.
- Use `Cache-Control: private, no-store` for personalized responses and `Referrer-Policy: no-referrer` throughout the contact surface.
- Avoid third-party scripts on any page that handles fragment credentials or private contact data.
- Apply conservative creation, claim, login, and artifact rate limits.
- Provide complete profile deletion and document the persistence of recipient copies and exported snapshots.
- Version the stored profile and grant schemas and test migrations against local Durable Object storage.
- Define jurisdiction and retention policy before accepting production user data.

Fragment credentials avoid server access logs and referrer headers, but they can still be copied, forwarded, captured by browser extensions, or synchronized in browser history before cleanup. They are bearer capabilities, not a protection against a compromised recipient device.

## Design Decisions

| Decision | Class | Choice | Rationale |
| --- | --- | --- | --- |
| Canonical hosted storage | Taste under constraints | One SQLite-backed Durable Object per profile | Stable updates and revocation matter more than zero-state hosting for the normal product. |
| URL contents | Design coherence | Public ID in the path; opaque capabilities in fragments; no contact values | The URL identifies state and conveys bounded authority without becoming the database. |
| Grant representation | Design coherence | Random opaque secret with server-side metadata | This produces shorter URLs and immediate revocation without putting field IDs in the link. |
| Secret storage | Evidence | Store domain-separated HMAC hashes only | A state leak should not reconstruct active owner or visitor links. |
| Authorization owner | Design coherence | Durable Object authorizes; contact core filters and serializes | Presentation must not decide access, and every representation must use one filtered field set. |
| Public profile address | Taste under constraints | Random canonical ID; vanity alias deferred | This avoids a global naming and moderation system in v0. |
| Portable URL payload | Taste under constraints | Keep as explicit snapshot import/export, not live state | It preserves portability without imposing stale, irrevocable links on the common flow. |
| Cloudflare OS | Deferred | Optional Blueprint/Gadget edition after the dedicated service | Gadgets add valuable modifiability but also impose a larger product and runtime boundary. |
| Operator-blind encryption | Deferred | Plaintext application storage with platform encryption | Server rendering and selective policy stay simple; revisit if zero-knowledge storage becomes a requirement. |

## Implementation Plan

### Phase 0: Decisions And Storage Spike

- [ ] Decide recovery capability, passkey, or hybrid ownership for v0.
- [ ] Prototype one profile Durable Object with local `workerd` storage.
- [ ] Prove create, edit, read, grant, revoke, and delete operations.
- [ ] Measure the public, grant, owner, and artifact URL lengths.
- [ ] Confirm the service can revalidate revocation on personalized artifact requests.
- [ ] Decide whether the standalone application lives in this repository, a workspace package, or a new repository.

### Phase 1: Reusable Contact Core

- [ ] Define a framework-neutral package boundary for normalized profiles, selection, formatting, request templates, vCard, and QR serialization.
- [ ] Move current route consumers onto the package while the existing modules remain available.
- [ ] Verify the current `/contact` behavior and focused tests before removing old imports.
- [ ] Keep authentication, cookies, HTTP routing, storage, and Svelte components outside the core package.

### Phase 2: Hosted Profile

- [ ] Build profile creation and owner-session exchange.
- [ ] Store and edit the normalized profile in one Durable Object.
- [ ] Render public HTML, vCard, vCard QR, and per-field QR from the shared core.
- [ ] Add export and permanent deletion.
- [ ] Add schema migration and local recovery tests.

### Phase 3: Selective Grants

- [ ] Create opaque grants with selected field IDs and default seven-day expiration.
- [ ] Claim fragment capabilities into profile-scoped HTTP-only visitor sessions.
- [ ] Revalidate grant revocation for every personalized representation.
- [ ] Add link listing, labeling, expiration, and revocation UI.
- [ ] Test cross-profile substitution, unknown fields, expiry, revocation, forwarding, and cache boundaries.

### Phase 4: Portability And Optional Gadget

- [ ] Add selected-field snapshot export and local preview import.
- [ ] Specify encrypted complete-profile export or prefer a downloaded file.
- [ ] Prototype a Contact Capsule Blueprint against a pinned Cloudflare OS revision.
- [ ] Compare dedicated-service and Gadget recipient UX before committing to ongoing compatibility.

## Open Questions

1. **How should an owner recover access?**
   - Options: one-time recovery capability, passkey/account, or both.
   - Recommendation: use a recovery capability for the smallest spike, but require passkeys before calling the service consumer-ready.
   - Trigger: decide before Phase 2 UI and storage schemas are locked.

2. **Should existing share links always show updated values?**
   - Options: live field references or immutable value snapshots.
   - Recommendation: live values for hosted links; explicit snapshot export when immutability is desired.
   - Trigger: validate whether changing a phone number should update every unexpired recipient grant.

3. **What does copying an existing grant mean?**
   - Options: reveal no old secret and mint a new alias key for the same logical grant, or create a new independent grant.
   - Recommendation: mint a new alias key when the selection and lifecycle should remain shared; offer `Duplicate` for independent revocation.
   - Trigger: settle with the link-management interaction design.

4. **Are vanity aliases worth a registry?**
   - Options: random IDs only or optional `@name` aliases.
   - Recommendation: random IDs in v0.
   - Trigger: add aliases only after real sharing tests show that QR and contact-list naming do not solve recognizability.

5. **Should the service support operator-blind encrypted profiles?**
   - Options: ordinary encrypted-at-rest Durable Object data or client-encrypted ciphertext.
   - Recommendation: ordinary storage for v0 with explicit trust language.
   - Trigger: a concrete audience requires the operator to be technically unable to read private fields.

6. **What role should Cloudflare OS play?**
   - Options: no integration, optional Blueprint, or primary runtime.
   - Recommendation: optional Blueprint after the dedicated service proves the domain and URL contract.
   - Trigger: test current Cloudflare OS accountless sharing, custom-domain presentation, deployment cost, and Blueprint upgrade behavior.

## Success Criteria

- [ ] A new user can create a profile and receive a public URL without deploying code.
- [ ] Public URLs remain stable when the profile changes.
- [ ] A selective link contains no contact values or field identifiers.
- [ ] Revoking a grant prevents later HTML, vCard, and QR access through that grant.
- [ ] Adding a new private field never expands an old grant.
- [ ] Unauthorized requests cannot retrieve private values through page data, artifacts, errors, caches, or cross-profile ID substitution.
- [ ] The owner can export and permanently delete hosted state.
- [ ] The current leftium.com contact route and the standalone service use the same tested contact-domain behavior.
- [ ] A recipient can open the common public or selective URL without understanding Durable Objects, Cloudflare OS, or capability terminology.

## References

- [Selective Contact Sharing](./2026-07-31-selective-contact-sharing.md) - current feature behavior and security boundary.
- `/Volumes/p/vibe/specs/2026-08-06-cloudflare-os-lessons.md` - source-backed Gadget, sharing, capability, and Blueprint analysis.
- `/Volumes/p/vibe/specs/2026-08-06-vibe-on-cloudflare-os.md` - proposed boundary between a product and the Cloudflare OS substrate.
- [Cloudflare OS repository](https://github.com/cloudflare/cloudflare-os) - current Gadget and Gatekeeper architecture.
- [Cloudflare OS sharing design](https://github.com/cloudflare/cloudflare-os/blob/main/docs/sharing.md) - collaborator links, fragment keys, hash storage, and revocation.
- [Cloudflare OS HN discussion](https://hn.leftium.com/i/49182996?l=kentonv) - Kenton Varda's explanation of Gadgets as fine-grained app instances.
- [Durable Objects overview](https://developers.cloudflare.com/durable-objects/) - stateful compute and uniquely addressed object storage.
- [SQLite-backed Durable Object storage](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/) - transactional private per-object storage and recovery capabilities.
- [Durable Object data security](https://developers.cloudflare.com/durable-objects/reference/data-security/) - platform encryption at rest and in transit.
- [Durable Object pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) - request, duration, and storage cost model.
