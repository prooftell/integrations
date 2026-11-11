# n8n-nodes-prooftell

The [ProofTell](https://prooftell.com/integrations?utm_source=n8n&utm_medium=integration) node for
[n8n](https://n8n.io/): look up a phone number, verify an email address, look up an IP address, or assess the risk
of an identity, with one API key. The node calls ProofTell's public API (https://prooftell.com/docs) and gives the
answer back unchanged; nothing is stored on the way.

## Installation

- **Self-hosted n8n:** Settings → Community nodes → Install, package `n8n-nodes-prooftell`. Or, in the n8n
  user folder (`~/.n8n/nodes`): `npm i n8n-nodes-prooftell`, then restart n8n. The
  [community nodes guide](https://docs.n8n.io/integrations/community-nodes/installation/) has the details.
- **n8n Cloud:** once the node is verified by n8n, search for ProofTell in the nodes panel.

## Credentials

Create a key in the ProofTell dashboard (Developers → Integrations), named n8n, and paste it into a **ProofTell
API** credential. A `pt_test_` key is the free sandbox: simulated, deterministic answers. A `pt_live_` key spends
the account's balance. The credential's test calls `GET /v1/balance`: a 200 proves the key.

## Operations

Each operation is one call, charged per check from your balance; the sandbox is free. The answer is the API's JSON,
as documented at https://prooftell.com/docs.

| Operation | Call | Inputs | What comes back |
|---|---|---|---|
| Look up a phone number | `POST /v1/phone` | Phone number (required); Country, for a number in national format; Level: Basic, Line type (the default), Current carrier, Line status, Fraud score, each including the ones before it | `valid`, `line_type`, `e164`, the formats, `country_code`, `original_carrier`, the level's block, `cost` |
| Verify an email address | `POST /v1/email` | Email address (required); Timeout, 1000 to 45000 ms, under Options | `result`, `deliverable`, `reason`, `flags`, `did_you_mean`, `cost` |
| Look up an IP address | `POST /v1/ip` | IP address (required) | `is_tor`, `is_vpn`, `is_datacenter`, `is_anonymous`, `country_code`, `city`, `asn`, `as_org`, `cost` |
| Assess the risk of an identity | `POST /v1/assess` | Any of Phone number, Email address, IP address (one at least); Country; Reference | `score` (0–100), `verdict` (allow, review, deny), `reasons[]`, `signals.*.result`, `cost` |

A field left empty is not sent. The node can be used as a tool by an AI agent node.

### Errors

The API answers an error as `{ "error": { "code", "message" } }`. In n8n a failed request becomes a NodeApiError:
its headline is n8n's own sentence for the status (a 402 reads "Payment required…", a 429 "Your request is being
throttled…"), and the API's message is the error's description beneath it, as the API wrote it. A 402
`insufficient_balance` names the amounts there: what the call needs, what the balance holds, what to top up. A 429
`rate_limited` is a burst above the key's rate; a 503 (`unavailable`, `signals_unavailable`: a source did not answer)
is a moment to wait. For both, turn on **Retry on fail** in the node's settings and n8n retries the item. The hint
n8n adds to a 429, to batch the requests, does not apply to this node: one item is one check.

## Example

A workflow that runs free on a `pt_test_` key, three nodes:

1. **Manual Trigger**.
2. **ProofTell**, resource Risk, operation "Assess the risk of an identity", with the ProofTell API credential
   holding the sandbox key, Phone number `+447700900123` and IP address `203.0.113.1`.
3. **IF**, one condition: `{{ $json.verdict }}` is equal to `allow`. The true branch goes on (creating the account,
   sending the welcome email); the false branch goes to whoever reviews sign-ups.

Run it: the ProofTell node answers with `score` 15, `verdict` `allow`, one reason, `geo_mismatch` (a GB number with
a US address), each signal's own result under `signals`, and `cost` `0.000000`, the sandbox being free. In
production the same workflow takes a `pt_live_` key and the phone number and IP address come from the trigger's
item, as expressions.

## The sandbox

With a `pt_test_` key every call is simulated, deterministic and free, and every documented answer can be reached:

- `+447700900123` is a GB mobile; `+15005550002` is VoIP (fraud score: medium); `+15005550003` is not valid;
  `+447700900005` is switched off (line status: not present).
- `jane@example.com` is deliverable; `undeliverable@sandbox.prooftell.com`, `disposable@…`, `catchall@…`,
  `risky@…`, `role@…` and `greylisted@…` give that result.
- `203.0.113.1` is a clean US address; `203.0.113.66` is Tor, `203.0.113.77` a VPN, `203.0.113.99` a datacenter.
- An assessment of `+447700900123` with `203.0.113.1` is a `geo_mismatch`.

The full list is in the API reference: https://prooftell.com/docs.

## Compatibility

Built with n8n's node tool (`@n8n/node-cli` 0.54) in the declarative style, on `n8n-workflow` 2.x. It needs an n8n
that knows `usableAsTool` and `NodeConnectionTypes`: a recent 1.x or any 2.x.

## Development

```sh
npm install
npm run build     # compiles into dist/ and copies the icons
npm run lint      # n8n-node lint: n8n's community-node rules
npm test          # the spec on the built description: every operation's method, URL and body routing
npm run dev       # links this package under ~/.n8n-node-cli and starts n8n (npx n8n@latest) with it loaded,
                  # at http://localhost:5678, rebuilding on change; --external-n8n for an n8n you run yourself
                  # with N8N_DEV_RELOAD=true
```

## Releasing

The package is published by GitHub Actions with npm provenance, never from a machine (n8n's rule for verified
nodes since May 2026). The workflow is `.github/workflows/release-n8n.yml` at the root of
[prooftell/integrations](https://github.com/prooftell/integrations).

1. Once: an npm account owning `n8n-nodes-prooftell`, and one of the two ways the workflow can publish. With a
   token: a granular access token with publish rights on the package, stored as the repository secret `NPM_TOKEN`
   (the first release needs this: the package does not exist on npm before it). Without a secret: npm's trusted
   publishing — on npmjs.com, the package's settings, Publish access → Trusted Publishers → GitHub Actions, owner
   `prooftell`, repository `integrations`, workflow `release-n8n.yml`, "Allow npm publish" ticked; the workflow writes
   no token when `NPM_TOKEN` is absent and `npm publish` then authenticates through GitHub's OIDC. npm expires a new
   trusted publisher that no successful publish has used within 2 days: this package's, set after 1.0.0 and unused,
   is to be deleted and created again the day of its next release. The repository must be public (provenance
   links the package to its source).
2. For each release: bump `version` in `package.json`, add the entry to `CHANGELOG.md`, commit, then tag that commit
   `n8n-v<version>` (`git tag n8n-v1.0.0 && git push origin n8n-v1.0.0`). The workflow builds, lints, tests, checks
   that the tag names the version, and publishes.
3. For verification, once: submit the package at n8n's Creator Portal (https://creators.n8n.io/nodes) with the
   text of `SUBMISSION.md`. Reviews take up to four weeks.

## Resources

- ProofTell: https://prooftell.com/integrations?utm_source=n8n&utm_medium=integration
- The API reference: https://prooftell.com/docs
- n8n's community nodes documentation: https://docs.n8n.io/integrations/#community-nodes
- Support: support@prooftell.com

## License

MIT.
