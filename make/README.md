# ProofTell for Make

The Make custom app, as the files the Make Apps SDK for VS Code deploys: `src/` is the app's local workspace in the
extension's own layout (its manifest `makecomapp.json` names every file), `app.json` holds what the extension does
not carry — the values of Make's "Create app" form and of the CLI's `sdk-apps create` (the API's equivalent of
`audience: global` is `global: true`) —, `validate.js` checks the files, `scripts/logo.cjs` renders the logo into
`assets/`, and `LISTING.md` is the copy for the app's page and the partner form. The words everywhere follow the workspace's plan
(`plans/2026-10-31-integrations.md` §1): the brand is ProofTell, sentence case, no emoji, the levels' provider never
named. The layout and every key come from Make's custom-apps documentation (developers.make.com) and the
extension's source (`integromat/vscode-apps-sdk`); the pages followed are listed at the end.

## The files

| File | What it is | Its place in Make (Custom apps → the app) |
|------|-----------|--------------------------------------------|
| `app.json` | name `prooftell`, label ProofTell, description, theme `#2458e6` (the design system's `primary`), language, audience | The "Create app" form; the CLI's `sdk-apps create`; or the body of `POST /api/v2/sdk/apps` (`global: true` there) |
| `scripts/logo.cjs`, `assets/logo-512.png` | The app's logo: the single-ink mark rendered black on a transparent 512 × 512 canvas, the way Make tints a logo (white or transparent shows in the theme colour, black white, semi-transparent a tint). Make's page says PNG, square, 512 to 2048 px, under 500 kB; its API takes exactly 512 × 512 | `make-cli sdk-apps set-icon`; the form's App logo; later Options → Edit on the app's page |
| `src/makecomapp.json` | The extension's manifest: the components, their files, the origin (zone `eu1`, app `prooftell`, version 1, the token's file) | Nothing to paste: it drives the deploy |
| `src/general/base.iml.jsonc` | `baseUrl` `https://api.prooftell.com`; the headers `Authorization: Bearer {{connection.apiKey}}`, `Content-Type`, `User-Agent prooftell-make/1.0`; `response.error` showing the api's `{error: {code, message}}` after its status, a 400 as a `DataError`, a 402 with the amounts and the top-up link the api sends beside its message (`cost_missing`, `cost_required`, `cost_available`, `topup_url`), a 401 or 403 as an `InvalidConfigurationError`, a 429 and a 5xx left to Make's defaults (`RateLimitError`, `ConnectionError`: it retries); `log.sanitize` of the Authorization header | Base |
| `src/general/common.json` | Empty: the app has no secret of its own | Common data |
| `src/README.md` | The app's documentation shown in Make | Readme |
| `src/modules/groups.json` | One group, Checks, with the four modules in order | Groups |
| `src/connections/prooftell/prooftell.params.iml.jsonc` | The connection's one parameter, `apiKey` (password, required), with §1's help | Connections → ProofTell → Parameters |
| `src/connections/prooftell/prooftell.communication.iml.jsonc` | The connection's test: `GET https://api.prooftell.com/v1/balance` with the key; `response.metadata` names the connection Sandbox or Live from the key's prefix; its own `log.sanitize` (the base is not applied to a connection, so the url is absolute) | Connections → ProofTell → Communication |
| `src/modules/<module>/<module>.communication.iml.jsonc` | `POST` to the endpoint, `body: {{parameters}}` (the parameters are named as the api's fields; one left empty is not sent), `output: {{body}}` (the whole answer is kept) | Modules → the module → Communication |
| `…mappable-params.iml.jsonc` | The inputs: phone (`phone` required, `country`, `level` a select of the five levels, Line type the default); email (`email` required, `timeout` advanced, 1000 to 45000); ip (`ip` required); risk (`phone`, `email`, `ip`, `country`, `reference` advanced; the api answers 400 when none of the three is sent, shown as it is) | Mappable parameters |
| `…interface.iml.jsonc` | The output fields of §1 with their types and labels, and the rest of the answer's shape (`cost` is text: a decimal string, never a float) | Interface |
| `…samples.iml.jsonc` | The spec's example for the endpoint (`api/openapi.yaml`), verbatim | Samples |
| `…static-params.iml.jsonc` | `[]`: static parameters are for triggers. There is no scope file (`"scope": null` in the manifest): Make shows a scope only with OAuth | Static parameters |

The four modules, their ids in Make and their endpoints: `lookUpPhoneNumber` "Look up a phone number"
(`/v1/phone`), `verifyEmailAddress` "Verify an email address" (`/v1/email`), `lookUpIpAddress` "Look up an IP
address" (`/v1/ip`), `assessRisk` "Assess the risk of an identity" (`/v1/assess`). All are action modules of CRUD
type create (a check runs and is charged; an assessment gets an id), on the connection `prooftell` — named
`prooftell-pu2f1x` in Make, like the app: the manifest's `idMapping` pairs the two.

## Validate

```sh
node validate.js
```

Every JSON file must parse; the manifest's files must exist; each `{{parameters.x}}` and `{{connection.x}}` must
name a declared parameter; each interface must be well formed and its sample fit it; the base and the connection
must sanitize the key; the words must be the plan's. Run it after any change, before a deploy.

## How the files go into Make

Three ways; the first is the one the layout is made for.

**1. The Make Apps SDK extension for VS Code** (`Integromat.apps-sdk` on the marketplace):

1. In VS Code, open this folder (`integrations/make`) as the workspace.
2. Add the environment in the extension's settings: zone `eu1.make.com`, the API token (below). The extension
   lists the account's custom apps under "Make apps".
3. The app must exist in Make first, empty: Make → Custom apps → "+ Create app" with `app.json`'s values
   (Name `prooftell`, Label `ProofTell`, the Description, Theme `#2458e6`, Language English, Audience Global) and
   the logo (`assets/logo-512.png`, rendered by `scripts/logo.cjs`; `LISTING.md` says how Make tints it). Make
   appends a random suffix to the name (ours became `prooftell-pu2f1x`), and the name cannot change later.
4. Put the token where the manifest's origin expects it, without printing it:
   `mkdir -p .secrets && sed -n 2p ../../keys/make.txt > .secrets/apikey` (`.secrets/` is gitignored).
5. Right-click `src/makecomapp.json` → "Deploy to Make (beta)", pick the origin "ProofTell on Make (EU1)", and for
   each component answer "Deploy as new remote" ("and Apply for all unmapped" does them all). The extension deploys
   in dependency order (the connection before the modules) and writes an `idMapping` into `makecomapp.json`:
   keep it (it holds no secret). The app's metadata is not deployed; it stays what the form set.
6. Later changes: edit the file, right-click it (or the component's folder, or the manifest) → "Deploy to Make";
   "Compare with Make" shows the diff first; "Pull" brings back what was edited in Make's web editor.

The pages followed: `get-started/make-apps-editor/apps-sdk` (and its `generation-of-your-api-key`,
`configuration-of-vs-code`, `creating-an-app-in-vs-code`), `…/local-development-for-apps` (`clone-make-app-to-local-workspace`,
`develop-app-in-a-local-workspace-offline`, `deploy-changes-from-local-app-to-make-app`, `create-a-new-app-origin`),
all under https://developers.make.com/custom-apps-documentation/; the file names and the manifest's keys from the
extension's `src/local-development/` and `src/services/component-code-def.ts`.

**2. The web editor** (Make → Custom apps → the app): create the app as in step 3, then paste each file into its
tab as the table above names it — Base; a connection "ProofTell" of type Basic (an API key is a basic connection
in Make's terms) with Parameters and Communication; four action modules created with the labels above and the
descriptions of `makecomapp.json`, each with Communication, Mappable parameters, Interface and Samples. The
`.iml.jsonc` files hold plain JSON.

**3. The Make CLI** (`npm install @makehq/cli` somewhere outside the repo, or `npx @makehq/cli`; the token through
`MAKE_API_KEY="$(sed -n 2p ../../keys/make.txt)" MAKE_ZONE=eu1.make.com` in the command's environment, never
printed; `make-cli login` is the interactive way). This is how the app was first put into Make, headlessly, from
this folder:

1. `make-cli sdk-apps create --name=prooftell --label='ProofTell' --theme='#2458e6' --language=en --audience=global
   --description="…"` (`app.json`'s values). Make answered with the name `prooftell-pu2f1x`: it appends a random
   suffix, and every later command takes that name (`APP`).
2. `make-cli sdk-apps set-section --name=$APP --version=1 --section=base --body="$(cat src/general/base.iml.jsonc)"`;
   `set-docs --docs="$(cat src/README.md)"`; `set-icon --data-base64="$(base64 -w0 assets/logo-512.png)"`.
3. `make-cli sdk-connections create --app-name=$APP --type=apikey --label='ProofTell'` — Make stores the type as
   `basic` and names the connection after the app, `prooftell-pu2f1x`; then `set-section --connection-name=$APP`
   for `api` (the communication file) and `parameters` (the params file).
4. The modules through the API, because the CLI's `sdk-modules create` has no `crud` and no `connection`:
   `POST https://eu1.make.com/api/v2/sdk/apps/$APP/1/modules` (header `Authorization: Token …`) with
   `{"name","typeId":4,"label","description","connection":"$APP","crud":"create","moduleInitMode":"blank"}` from
   `makecomapp.json`, for each of the four; then `make-cli sdk-modules set-section --app-name=$APP --app-version=1
   --module-name=<id> --section=<api|expect|interface|samples> --body="$(cat <file>)"` (`api` is the communication
   file, `expect` the mappable parameters).
5. `make-cli sdk-apps set-section --section=groups --body="$(cat src/modules/groups.json)"`.
6. Read back: `sdk-modules list`, `sdk-connections get`, `sdk-apps get-section --section=base`.
7. `make-cli sdk-apps set-public --name=$APP --version=1`: the app is published and the answer carries the invite
   token (`POST /sdk/apps/{name}/{version}/public` in the API). Irreversible: see "Publishing" below.

The section names are the Make API's (`developers.make.com/api-documentation/api-reference/sdk-apps`,
`…/connections`, `…/modules`); the CLI's reference is `developers.make.com/make-cli/make-cli-reference/custom-app-development`.
A later change is the same `set-section` with the edited file (or way 1, now that the manifest's origin and
`idMapping` name the app in Make).

## The connection's test

The app calls production, `api.prooftell.com`. A `pt_test_` key of any organization works there, the smoke
organization's included (D31: the sandbox is free and simulated; what production refuses is a test organization's
*live* key), so the test may take line 7 of `keys/smoke-accounts.txt`, read inline and never printed — or a
`pt_test_` key of Adil's own account, named for Make, created in the dashboard (Developers → Integrations). In a
scenario, add "Look up a phone number", click "Add" on the connection, paste the key:
Make calls `GET /v1/balance`; a 200 saves the connection and labels it "(Sandbox)"; a wrong key shows
`[401 invalid_api_key] The API key is missing, unknown or revoked.`

Proven through Make's API with the smoke organization's sandbox key (the connection 12620373 "ProofTell sandbox
(smoke organization)" in the team "My Team", kept for Adil's look): `POST /connections/{id}/test` answers
`verified: true`, its debug line shows the call to `https://api.prooftell.com/v1/balance` with the authorization
header as `***` (the sanitize works), and the connection's `metadata.value` is `Sandbox` (the label expression
works). The scenario 8321436 "ProofTell test: Look up a phone number" (`+447700900123` at Line type, stopped after
the test, its history kept) ran once through `POST /scenarios/{id}/run`: `status 1`, SUCCESS, 1 operation, 441
bytes back — the phone answer. The scenario 8507240 "ProofTell test: email, IP and assessment" (2026-11-11) chains
the three others with the sandbox's documented inputs — `jane@example.com`, `203.0.113.66`, and the three together
in "Assess the risk of an identity" (`203.0.113.1` as the IP) — and ran SUCCESS, 3 operations, 2,293 bytes back.
The scenario 8507256 "ProofTell test: an error's message" sends the risk module nothing and fails as it should:
`DataError`, `[400 bad_request] Send at least one of phone, email, ip.` — the api's code and message, as the base's
`error` writes them. Make's API gives a run's status, operations and bytes, never its bundles (a Return output
module, `scenario-service:ReturnData` version 2, with the scenario's outputs, did not bring them back): the bundles
show only in the editor's history of each scenario.

Two traps of Make's API, for the next test: a custom app's modules and connection type carry the prefix `app#` —
the blueprint's module is `app#prooftell-pu2f1x:lookUpPhoneNumber`, a connection's `accountType` is
`app#prooftell-pu2f1x` (without it: "Module not found", "Failed to load manifest"); and `POST /connections`
answers a 307 to its own `…/test?formula=1`, which must be followed (or called) for the connection to be verified.
An on-demand scenario must be started (`POST /scenarios/{id}/start`) before `run` accepts it (IM325).

## Where it stands, and what remains

In Make (eu1, Adil's account, the organization "My Organization", 9496520): the app `prooftell-pu2f1x` version 1,
label ProofTell, every section and the icon deployed from these files through way 3, **published** (`public:
true`, not approved — approval is Make's review, not sought). The invite link, from the app's `inviteToken`:

https://www.make.com/en/hq/app-invitation/711be10b6633929513d0180ed0b31208

Publishing's facts: `make-cli sdk-apps set-public` prints no token, and a second `POST …/public` answers IM005
"already being published"; the token is read with `GET /sdk/apps/prooftell-pu2f1x/1?cols[]=inviteToken`. The
app cannot be made private again, nor a component deleted (rename and hide instead). The link is what another
organization installs the app by, in a browser: the API's "Accept App Invite" refuses an API token (SC403
"Organization-bound request can't be used outside of the Organization Context"), and the author's own
organization needed no install — a connection and a scenario on the app worked there at once.

The invite link is on the site's and the dashboard's integration pages. What remains, Adil's part: Make's partner
programme. First the Make Partnership Agreement, signed on the support@prooftell.com account — the partner form
requires an active one. Then the partner form at https://f.make.com/submit-your-app with `LISTING.md`, the invite
link and the logo. Make's business review takes 2–3 days; then the app is on Make's integrations page. ("Request
review" on the app's page, the route to an approved app for every Maker, needs a universal module the app does not
have: not this one.)

A change is a file edited here, `node validate.js`, then `make-cli … set-section` with the file (way 3) or "Deploy
to Make" (way 1, the manifest's origin and `idMapping` name the app); a published app's modules cannot be removed,
only hidden. The token, the invite link and the review's state are operated from the workspace's `RUNBOOK.md` →
Integrations.

## Choices worth knowing

- The connection is of type `basic` in the manifest (the extension knows `basic` and `oauth`; Make's docs file an
  API key under "Basic connection"); through the API or the CLI the closest named type is `apikey`. Both run the
  same files.
- Every error message starts with the status and the api's code, `[402 insufficient_balance] …`, then the api's
  message as it is: the code is what support asks for. Make's own convention is `[{{statusCode}}] …`.
- `email` is a text field, not Make's `email` type: the api judges the syntax itself and answers a syntax error
  for free, which a scenario may want to see; the risk module scores a non-address rather than refusing it.
- Blank optional inputs are safe: Make drops an unset parameter from `{{parameters}}`, and the api ignores an empty
  string or a null in `country`, `level`, `phone`, `ip`, `reference` (checked against staging).
