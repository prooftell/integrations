# GoHighLevel: the ProofTell app

An OAuth app for sub-accounts (locations) with a backend of ours (D190, the plan's §7): a location connects to a
ProofTell organization from the dashboard (or the marketplace's install), and its workflows get the four checks as
actions. The backend is the api's `prooftell.integrations` package; this folder is the app GoHighLevel hosts, as the
`ghl` CLI (`@gohighlevel/marketplace-cli`) keeps it.

| Workspace | App | Listing | Its actions call | Redirect |
|-----------|-----|---------|------------------|----------|
| `production/` | ProofTell, 6aedd79314f3ff12d05de224 | public, white-label friendly | `https://api.prooftell.com/integrations/sub-account/actions/<check>` | `https://app.prooftell.com/integrations/sub-account/callback` |
| `staging/` | ProofTell staging, 6aede33f959132de0efc66b5 | private | `https://api.prooftell.dev/…` | `https://app.prooftell.dev/…` and `http://localhost:5173/…` |

- **The addresses say `sub-account`, never GoHighLevel's name**: a white-label app's redirect (and webhook) URLs may
  not carry it. The api and the dashboard map the slug to the platform `gohighlevel`.
- **Scopes**: `contacts.readonly`, `contacts.write`, `locations.readonly`, `locations/customFields.readonly`,
  `locations/customFields.write`, `workflows.readonly` (the api's `GoHighLevelOAuth.SCOPES`).
- **The actions** are written by `scripts/build.mjs` into both workspaces; never edit their JSON by hand. Each calls our
  endpoint with the header `X-ProofTell-Action-Secret`, its value injected at push from `PROOFTELL_GHL_ACTION_SECRET`
  (lines 9 and 10 of `keys/gohighlevel.txt`, staging then production): how the api knows the request is GoHighLevel's.
  An action key is unique across the developer account, so production's are `prooftell_phone_lookup`,
  `prooftell_email_verification`, `prooftell_ip_lookup`, `prooftell_risk_assessment`, staging's the short ones.
- **The webhook** address is `https://api.prooftell.<com|dev>/integrations/sub-account/events`: GoHighLevel posts the
  app's install and uninstall there, signed with its Ed25519 key; an uninstall ends the connection.
- `keys/gohighlevel.txt`: each app's client id and secret (a client key: `ghl app keys`), the two action secrets, and
  the password of the developer sandbox agency "ProofTell sandbox" (company qRExp8SdaHsct2IZlK1J, until 2027-05-06),
  where the staging app is installed and tried.
- The CLI's own guides (`CLAUDE.md`, `AGENTS.md`, `HIGHLEVEL_*.md`) are rewritten at each pull and ignored here.

## Commands

The CLI logs in through a browser and a loopback port: from forge the approval's redirect is pasted back by hand (the
plan's §0 has the way). Then, in a workspace:

```sh
npx -y -p @gohighlevel/marketplace-cli@1.1.0 ghl app pull --force       # refresh from the portal (actions too)
node ../scripts/build.mjs                                               # rewrite the actions after a pull
PROOFTELL_GHL_ACTION_SECRET=$(sed -n 9p ../../../keys/gohighlevel.txt) \
  npx -y -p @gohighlevel/marketplace-cli@1.1.0 ghl app actions push      # staging (production: line 10)
npx -y -p @gohighlevel/marketplace-cli@1.1.0 ghl app validate --remote  # publish readiness, before `ghl app publish`
```

A push or a pull rewrites the action headers' value as `${remote}` (GoHighLevel keeps the secret): push after
`build.mjs`, which writes the `${env:…}` reference again. **An action shows in a workflow's builder only once published**
(`ghl app actions publish <key> --notes "…" --force`); staging's four are. To change a published action:
`ghl app actions new-version <key>`, then `build.mjs`, push, publish. The private staging app is installed by its draft
version (the api adds `version_id`); the public app enters the marketplace's review with `ghl app publish`.
