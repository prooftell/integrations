// The ghl CLI's own browser login, waiting an hour instead of five minutes, for a machine the approving browser cannot
// reach (forge): the approval ends on http://127.0.0.1:<port>/callback?code=…&state=…, which fails on the approver's
// machine; that whole address, pasted back, is delivered with `curl '<address>'` on this machine, and the login
// completes (the profile saved as `ghl login` saves it, ~/.config/ghl). The code is single-use and worthless without the
// PKCE verifier only this process holds. Run: `node scripts/login.mjs` (it finds the CLI in npx's cache; run any
// `npx -y -p @gohighlevel/marketplace-cli@1.1.0 ghl --version` first if none is there).
import { readdirSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const cache = join(homedir(), '.npm/_npx')
const dist = readdirSync(cache).map((d) => join(cache, d, 'node_modules/@gohighlevel/marketplace-cli/dist'))
  .find((p) => existsSync(join(p, 'lib/auth/browser-login.js')))
if (!dist) throw new Error('the ghl CLI is not in npx cache: run npx -y -p @gohighlevel/marketplace-cli@1.1.0 ghl --version first')
const { getConfig } = await import(join(dist, 'lib/config/environment.js'))
const { startBrowserLogin } = await import(join(dist, 'lib/auth/browser-login.js'))
const login = await startBrowserLogin(getConfig(), 'default', { timeoutMs: 3_600_000 })
console.log('Approve, then paste back the failed 127.0.0.1 address:\n' + login.url)
const who = await login.signIn(await login.approval)
console.log('Logged in as ' + who)
await login.close?.()
process.exit(0)
