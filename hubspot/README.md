# HubSpot: the ProofTell app

An OAuth app with a backend of ours (D190, the plan's §7): a HubSpot account connects to a ProofTell organization
from the dashboard (or the marketplace's install), and its workflows get the four checks as actions. The backend is
the api's `prooftell.integrations` package; this folder is the app HubSpot hosts.

HubSpot has created no new public app since 2026-06-23: an app is a developer project uploaded with the HubSpot CLI.
There are two, generated from one definition, because an action has one URL:

| Project | App | Distribution | Calls | Redirect |
|---------|-----|--------------|-------|----------|
| `projects/production` | ProofTell | marketplace | `https://api.prooftell.com/integrations/hubspot/actions/<check>` | `https://app.prooftell.com/integrations/hubspot/callback` |
| `projects/staging` | ProofTell staging | private (the test accounts) | `https://api.prooftell.dev/…` | `https://app.prooftell.dev/…` and `http://localhost:5173/…` |

`scripts/build.mjs` writes both: the app (`src/app/app-hsmeta.json`: OAuth, the scopes, support), the four actions
(`src/app/workflow-actions/<check>-hsmeta.json`: inputs, outputs, the error sentences) and the logo (Zapier's
`assets/logo-512.png`). Never edit `projects/` by hand: change `scripts/build.mjs`, run `node scripts/build.mjs`,
commit both. The scopes are the api's `HubSpotOAuth.SCOPES`; the action names, inputs and outputs are the
connectors' surface (`../CLAUDE.md`) and the api's `CrmChecks`; each `prooftell_error` code the api answers has its
sentence in the actions' execution rules.

## The actions

Look up a phone number, Verify an email address, Look up an IP address, Assess the risk of an identity: each takes
its fields from the contact (or typed), and returns its answer as outputs a workflow copies into properties or branches
on. A check that cannot run (no connection, no balance, a refused input) ends `FAIL_CONTINUE`: the workflow goes on
and its history says why. Requests are signed with the app's client secret; the api checks the signature.

## Publishing

Adil, once (the plan's §7.6 step 1): a HubSpot account for ProofTell on `admin@prooftell.com`, a personal access key
for the CLI (Development → Keys, or `hs account auth`'s link) saved as `hubspot.txt` in `../../keys/` (a date line,
the key on line 2, the `.gitattributes` entry), and a second HubSpot account to install the staging app into. Then:

The account is 6798532. The CLI takes the key from the environment, so it is never written to a config file:

```sh
cd projects/staging       # then projects/production
K=$(sed -n 2p ../../../../keys/hubspot.txt)
HUBSPOT_ACCOUNT_ID=6798532 HUBSPOT_PERSONAL_ACCESS_KEY="$K" npx -y -p @hubspot/cli@8.18.0 hs project validate --use-env
HUBSPOT_ACCOUNT_ID=6798532 HUBSPOT_PERSONAL_ACCESS_KEY="$K" npx -y -p @hubspot/cli@8.18.0 hs project upload --use-env --force -m "<what changed>"
```

HubSpot's own rules, learnt at the first upload: an input takes exactly one value type (`OBJECT_PROPERTY` for what is
checked, `STATIC_VALUE` for what is typed); an object type is named by its id (`0-1`, contacts); a rule's condition
is a list of values; `permittedUrls` is required, empty here. The projects are `prooftell-staging` (app 60525952,
private) and `prooftell` (app 60526039, marketplace).

After the first upload, the app's Auth page shows its client id and secret: the id goes to the service's env
(`PROOFTELL_HUBSPOT_CLIENT_ID`), the secret into the environment's `integrations` secret
(`api/src/main/java/prooftell/integrations/IntegrationsConfig.java` says its shape), and the api's
`actionReceipts` TTL policy is deployed first (`firebase deploy --only firestore` in `api/`). Staging's app is
allowlisted to the test account in the project's settings. The marketplace listing: `LISTING.md` holds its copy, tab by tab, and
what must stand before the submission — three active installs by unaffiliated accounts, every URL live, the setup
guide (`/integrations#hubspot`) among them; the icon is `assets/listing-icon-800.png` (`scripts/icon.cjs`). The
initial review takes up to ten business days (D190).
