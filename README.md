# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

### Admin contact access

Copy `src/routes/(centered)/contact/contact-info.server.example.toml` to
`contact-info.server.toml` in the same directory, then replace the redacted values. The private
file is ignored by Git. Development falls back to the redacted example when the private file is
absent.

Production deployments should store the complete contents of the private TOML as the
`CONTACT_INFO_TOML` runtime secret. Do not commit the private file or put its values directly in
`wrangler.toml`.

For Cloudflare Workers:

```sh
pnpm exec wrangler secret put CONTACT_INFO_TOML \
  < 'src/routes/(centered)/contact/contact-info.server.toml'
```

For Vercel production:

```sh
vercel env add CONTACT_INFO_TOML production \
  < 'src/routes/(centered)/contact/contact-info.server.toml'
```

Add the Vercel variable separately for `preview` when preview deployments need the real profile.
Redeploy after adding or changing the secret.

The admin controls live at `/contact/admin`. Generate an access key and a separate
session-signing secret:

**The login form accepts the generated `admin_...` access key. It does not accept the SHA-256
digest or session secret stored in `.env`.**

```sh
node <<'NODE'
const { createHash, randomBytes } = require('node:crypto')

const accessKey = `admin_${randomBytes(24).toString('base64url')}`
const accessKeyDigest = createHash('sha256').update(accessKey).digest('hex')
const sessionSecret = randomBytes(32).toString('base64url')

console.log('\n=== ADMIN ACCESS KEY: SAVE THIS AND ENTER IT IN THE LOGIN FORM ===\n')
console.log(accessKey)
console.log('\n=== COPY THESE VALUES TO .env ===\n')
console.log(`CONTACT_ADMIN_KEY_SHA256=${accessKeyDigest}`)
console.log(`CONTACT_ADMIN_SESSION_SECRET=${sessionSecret}`)
console.log('CONTACT_ADMIN_SESSION_VERSION=1')
console.log('\nRestart the development server after updating .env.\n')
NODE
```

The access key is printed once. Store it in a password manager. Keep the session secret separate
from the access key, and do not commit either value.

Restart the development server after updating `.env`, then follow the small "Admin" link at the
bottom of `/contact` or open `/contact/admin` directly.

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
