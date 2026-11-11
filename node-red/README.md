# @prooftell/node-red-prooftell

The [ProofTell](https://prooftell.com/integrations?utm_source=node-red&utm_medium=integration) node for
[Node-RED](https://nodered.org/): look up a phone number, verify an email address, look up an IP address, or assess
the risk of an identity, with one API key. The node calls ProofTell's public API (https://prooftell.com/docs) and
gives the answer back unchanged; nothing is stored on the way.

## Installation

In the editor: Menu → Manage palette → Install, search for `@prooftell/node-red-prooftell`. Or, in the Node-RED
user folder (`~/.node-red`): `npm install @prooftell/node-red-prooftell`, then restart Node-RED. It needs Node-RED
4 or later on Node.js 18 or later.

## The connection

Create a key in the ProofTell dashboard (Developers → Integrations), named Node-RED, and paste it into a **ProofTell**
connection (the node's Connection field, then the pencil). A `pt_test_` key is the free sandbox: simulated,
deterministic answers. A `pt_live_` key spends the account's balance. The connection's label says sandbox or live
from the key. The key is kept in Node-RED's credentials, not in the flow: an exported flow does not carry it.

## The node

One **ProofTell** node, in the palette's network section; its Action is one of the four checks. Each check is
charged per check from your balance; the sandbox is free.

| Action | Call | Fields | What comes back in `msg.payload` |
|---|---|---|---|
| Look up a phone number | `POST /v1/phone` | Phone (required); Country, for a number in national format; Level: Basic, Line type (the default), Current carrier, Line status, Fraud score, each including the ones before it | `valid`, `line_type`, `e164`, the formats, `country_code`, `original_carrier`, the level's block, `cost` |
| Verify an email address | `POST /v1/email` | Email (required); Timeout, 1000 to 45000 ms | `verdict` (deliverable, undeliverable, risky, unknown), `reason`, `flags`, `did_you_mean`, `cost` |
| Look up an IP address | `POST /v1/ip` | IP address (required) | `is_tor`, `is_vpn`, `is_datacenter`, `is_anonymous`, `country_code`, `city`, `asn`, `as_org`, `cost` |
| Assess the risk of an identity | `POST /v1/assess` | Any of Phone, Email, IP address (one at least); Country; Reference | `score` (0–100), `verdict` (allow, review, deny), `reasons[]`, `signals.*.result`, `cost` |

Each field is a Node-RED typed input: by default it reads `msg.payload.phone`, `msg.payload.email` or
`msg.payload.ip`, and it can instead hold a fixed value, another message property, a flow or global value, an
environment variable or a JSONata expression. For the three single checks, a string `msg.payload` is the value to
check when the field gives none: an inject node with `+447700900123` is enough. A field left empty is not sent.
**Answer to** sets where the answer goes (`msg.payload` by default; `msg.prooftell` keeps the payload as it was).
The node's status shows the result in a few words (`mobile`, `deliverable`, `Tor`, `allow, 15`), never the input.

### Errors

A failed check stops the message and reports the API's own message as the node's error, which a **Catch** node
receives, with `msg.statusCode` set: 401 for a wrong key; 402 `insufficient_balance` when the balance cannot cover
the check, the message naming what the check needs, what the balance holds and what to top up; 429 `rate_limited`
above the key's rate; 503 when a source did not answer, a moment to wait. A check the API would refuse — a phone
lookup with no number, an assessment with nothing to assess — is refused before any request, with a sentence that
says what to give.

## Examples

Menu → Import → Examples → @prooftell/node-red-prooftell has a flow per action: an inject node with the sandbox's
input, the ProofTell node, a debug node for the answer, and a Catch node with a debug node for an error. Open the
connection, paste a sandbox key, deploy, and click the inject node. "Assess the risk of an identity" answers
`score` 15, `verdict` `allow`, one reason, `geo_mismatch` (a GB number with a US address), and `cost` `0.000000`.

## The sandbox

With a `pt_test_` key every call is simulated, deterministic and free, and every documented answer can be reached:

- `+447700900123` is a GB mobile; `+15005550002` is VoIP (fraud score: medium); `+15005550003` is not valid;
  `+447700900005` is switched off (line status: not present).
- `jane@example.com` is deliverable; `undeliverable@sandbox.prooftell.com`, `disposable@…`, `catchall@…`,
  `risky@…`, `role@…` and `greylisted@…` give that result.
- `203.0.113.1` is a clean US address; `203.0.113.66` is Tor, `203.0.113.77` a VPN, `203.0.113.99` a datacenter.
- An assessment of `+447700900123` with `203.0.113.1` is a `geo_mismatch`.

The full list is in the API reference: https://prooftell.com/docs.

## Development

Plain JavaScript, no build step: `nodes/prooftell.js` (the runtime), `nodes/prooftell.html` (the editor and the
help), `nodes/lib/client.js` (the requests, tested on their own), `examples/` (a flow per action).

```sh
npm install
npm test     # the requests with a fake fetch, then the nodes in a Node-RED runtime against a local stand-in for the
             # API; with PROOFTELL_TEST_KEY set to a sandbox key (read into the command, never written down),
             # the four actions against staging as well
```

To run it in a Node-RED of its own: `npm install <this folder>` in a scratch user folder, then
`node_modules/.bin/node-red --userDir <that folder>` from this folder (Node-RED is a dev dependency) and open
http://127.0.0.1:1880. `PROOFTELL_BASE_URL` points the node at another API (`https://api.prooftell.dev`, staging); it
is read from the environment only.

## Releasing

The package is published by GitHub Actions with npm provenance, from `.github/workflows/release-node-red.yml` at the
root of [prooftell/integrations](https://github.com/prooftell/integrations).

1. Once: the first release needs the repository secret `NPM_TOKEN` (the package does not exist on npm before it): a
   granular token with Read and write on all packages and Bypass two-factor authentication, or the publish stops at
   npm's one-time password. Then npm's trusted publishing — on npmjs.com, the package's settings, Publish access →
   Trusted Publishers → GitHub Actions, owner `prooftell`, repository `integrations`, workflow
   `release-node-red.yml`, "Allow npm publish" ticked — and the secret and the token deleted. npm expires a new trusted publisher that no successful publish has used within 2 days (then: delete it,
   create it again and release within 2 days); the token-free path was first proven with 1.0.1.
2. For each release: bump `version` in `package.json`, commit, then tag that commit `node-red-v<version>`
   (`git tag node-red-v1.0.1 && git push origin node-red-v1.0.1`). The workflow tests, checks that the tag names the
   version, and publishes.
3. For the Flow Library, once: on https://flows.nodered.org, signed in with GitHub, + → Node, the package's name. It
   is listed at once; a new version is picked up from its page's "request refresh" link, or by submitting again.

## Resources

- ProofTell: https://prooftell.com/integrations?utm_source=node-red&utm_medium=integration
- The API reference: https://prooftell.com/docs
- Support: support@prooftell.com

## License

MIT.
