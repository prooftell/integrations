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
| `scripts/logo.cjs`, `assets/logo-1024.png` | The app's logo: the single-ink mark rendered black on a transparent 1024 × 1024 canvas, the way Make tints a logo (white or transparent shows in the theme colour, black white, semi-transparent a tint). PNG, square, 512 to 2048 px, under 500 kB | The form's App logo; later Options → Edit on the app's page |
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
type create (a check runs and is charged; an assessment gets an id), on the connection `prooftell`.

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
   the logo (`assets/logo-1024.png`, rendered by `scripts/logo.cjs`; `LISTING.md` says how Make tints it). The name
   cannot change later.
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

**3. The Make CLI** (`npm install -g @makehq/cli`, then `make-cli login` with the zone EU1 and the token, or
`MAKE_API_KEY` and `MAKE_ZONE` in the environment): `make-cli sdk-apps create --name prooftell --label ProofTell
--theme '#2458e6' --language en --audience global --description "…"`, `sdk-connections create --app-name prooftell
--type apikey --label ProofTell`, `sdk-modules create --app-name prooftell --app-version 1 --name lookUpPhoneNumber
--type-id 4 --label "Look up a phone number" --description "…"` (type 4 is an action) for each module, then
`set-section` per file: the app's `base` (and `set-docs` for `README.md`); the connection's `api` (communication) and
`parameters`; each module's `api`, `expect` (the mappable parameters), `interface` and `samples`. The section names
are the Make API's (`developers.make.com/api-documentation/api-reference/sdk-apps`, `…/connections`, `…/modules`);
the CLI's reference is `developers.make.com/make-cli/make-cli-reference/custom-app-development`.

## The connection's test

The app calls production, `api.prooftell.com`, so the connection takes a key of a production organization — a
`pt_test_` key of Adil's own account, named for Make, created in the dashboard (Developers → Integrations): the
sandbox is free. (The smoke organization's key is a test organization's: production refuses it with 403
`test_organization`.) In a scenario, add "Look up a phone number", click "Add" on the connection, paste the key:
Make calls `GET /v1/balance`; a 200 saves the connection and labels it "(Sandbox)"; a wrong key shows
`[401 invalid_api_key] The API key is missing, unknown or revoked.` Then one run per module with the sandbox's
documented inputs — `+447700900123` at Line status, `jane@example.com`, `203.0.113.66`, and the three together in
"Assess the risk of an identity" (`203.0.113.1` as the IP: a `geo_mismatch`, score 15) — and the output panel
should show the sample's fields. Two things to confirm in that first run, since only Make evaluates IML: the
connection's label expression (`contains(parameters.apiKey, 'pt_test_')`) and the error message's `ifempty`
fallback (force a 400 by sending `phone` empty in the risk module with nothing else).

## Tomorrow: Adil's part, then the deploy

1. A Make account in the EU zone (`eu1.make.com`) on `support@prooftell.com`; the organization's name ProofTell.
2. Profile → API access → "+ Add token" with the scopes `sdk-apps:read` and `sdk-apps:write` (shown once) →
   `keys/make.txt` (a date line, the token on line 2, the `.gitattributes` entry, `git-crypt status` says
   encrypted). The token is also what the extension and the CLI take.
3. Custom apps → "+ Create app" with `app.json` and the logo (step 3 above).
4. Claude deploys the files (way 1), then builds one scenario per module on a sandbox key of Adil's account and
   runs it; Adil checks the four outputs and the connection's label.
5. Publish: the app's page → "Publish" generates the invite link (the app cannot be made private again after
   that, nor a component deleted: rename and hide instead). The link goes on the site's and the dashboard's
   integration pages (`available: true` on both lists, the same hour).
6. Make's partner programme first: the Make Partnership Agreement, signed on the support@prooftell.com account —
   the partner form requires an active one. Then the partner form at https://f.make.com/submit-your-app with
   `LISTING.md`, the invite link and the logo. Make's business review takes 2–3 days; then the app is on Make's
   integrations page. ("Request review" on the app's page, the route to an approved app for every Maker, needs a
   universal module the app does not have: not this one.)

Afterwards, a change is a file edited here, `node validate.js`, and "Deploy to Make"; a published app's modules
cannot be removed, only hidden. The token, the invite link and the review's state are operated from the
workspace's `RUNBOOK.md` → Integrations.

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
