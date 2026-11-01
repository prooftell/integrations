# ProofTell for Zapier

The Zapier integration, a zapier-platform-cli 19 app: `authentication.js` (an API key, tested on
`GET /v1/balance`), `middleware.js` (the bearer header and the User-Agent before each request; the api's
`{error: {code, message}}` shown as it is after, a 429 left to Zapier to retry), four creates in `creates/`
(a check runs and is charged, so none is a search), one polling trigger in `triggers/`, and the tests in
`test/`. `lib/api.js` holds the base URL: `https://api.prooftell.com` as shipped, `PROOFTELL_API_BASE` for the
tests. The directory copy is `LISTING.md`. The words everywhere follow the workspace's plan
(`plans/2026-10-31-integrations.md` §1): the brand is ProofTell, sentence case, no emoji, the levels' provider
never named.

## Commands

```sh
npm install --ignore-scripts        # once; zapier-platform-cli is a dev dependency, so `npx zapier-platform` works here
npx zapier-platform validate --without-style # the schema checks, no login needed (the style checks need an account)
npx zapier-platform test                     # the tests: see below for the environment they need
NODE_PATH=<playwright's node_modules> CH=<chromium> node scripts/logo.cjs   # re-renders assets/logo-512.png from the mark
```

## Tests

The tests call staging (`https://api.prooftell.dev`) with the smoke organization's sandbox key, line 7 of the
workspace's `keys/smoke-accounts.txt`. Both reach the tests through the environment and nothing else: the key is
never printed, echoed, logged or written to a file, and no `.env` is ever committed. From this folder:

```sh
PROOFTELL_API_BASE=https://api.prooftell.dev \
PROOFTELL_API_KEY=$(sed -n 7p ../../keys/smoke-accounts.txt) \
npx zapier-platform test
```

Every create is tested on the sandbox's documented inputs (`api/openapi.yaml` says each) and on the api's
errors as they reach the user; the creates' suite runs with a sandbox key only, since the same inputs are real,
charged checks with a live key, answered differently. The trigger lists files, which need a live key: with the
sandbox key its listing test is skipped and the sandbox's 501 is tested instead. The live smoke key, line 10 of
the same file (the `^pt_live_` line), runs the trigger's file alone:

```sh
PROOFTELL_API_BASE=https://api.prooftell.dev \
PROOFTELL_API_KEY=$(sed -n 10p ../../keys/smoke-accounts.txt) \
npx zapier-platform test -- test/triggers.test.js
```

## Tomorrow: publishing

Adil creates the Zapier developer account (developer.zapier.com, on support@prooftell.com), a deploy key
(Settings → Deploy keys) saved as `keys/zapier.txt` (a date line, the key on line 2, the `.gitattributes`
entry), and, in his production ProofTell account, an organization "Zapier review" with a $5 top-up, where
`integration-testing@zapier.com` is invited as a developer. Then, from this folder:

1. `npx zapier-platform login --sso` or `npx zapier-platform login` with the deploy key (`ZAPIER_DEPLOY_KEY=$(sed -n 2p
   ../../keys/zapier.txt) npx zapier-platform …` works for every command without a login).
2. Register the app, with `LISTING.md`'s values; `.zapierapprc` is written, commit it (it holds the app's id,
   no secret):

   ```sh
   npx zapier-platform register "ProofTell" \
     --desc "ProofTell is a verification API: a phone number, an email address and an IP address checked, or scored together as one risk score." \
     --url "https://prooftell.com/integrations?utm_source=zapier&utm_medium=integration" \
     --audience global --role employee --category developer-tools --no-subscribe
   ```
3. `npx zapier-platform push`: the version 1.0.0 goes up, private to the account.
4. `npx zapier-platform users:add <email>` for each tester (Adil's own account, `integration-testing@zapier.com`
   for Zapier's reviewers), or `npx zapier-platform users:links` for the invite link.
5. In Zapier, with a key of the "Zapier review" organization: one Zap per action, turned on, with at least one
   run each (the review requires it); for the trigger, one 3-row file uploaded in the dashboard and run to
   completion, then the Zap turned on.
6. `npx zapier-platform promote 1.0.0`, then the publishing request in developer.zapier.com with `LISTING.md`'s copy,
   the logo and the test Zaps. Zapier lists the app in beta about a week later; public after 90 days.

A new version is a bump of `version` in `package.json`, `npx zapier-platform push`, then `npx zapier-platform promote` and, once
users are on it, `npx zapier-platform migrate <old> <new>`. The deploy key, the app id and each review's state are
operated from the workspace's `RUNBOOK.md` → Integrations.
