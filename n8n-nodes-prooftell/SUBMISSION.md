# Creator Portal submission

The text for n8n's Creator Portal (https://creators.n8n.io/nodes), submitted once the package is on npm with
provenance. Each block is pasted into the field of that name; the portal's fields may be named a little differently.

**npm package:** `n8n-nodes-prooftell`

**Node name:** ProofTell

**Short description:** Look up a phone number, verify an email address, look up an IP address, or assess the risk of
an identity, with one ProofTell API key.

**Description:**

ProofTell checks the three things a sign-up, a lead or an order gives you — a phone number, an email address and an
IP address — one at a time or together as a 0–100 risk score with a verdict and its reasons. This node puts those
checks in a workflow: four operations on ProofTell's public API, charged per check from the account's balance,
with a free sandbox key for building and testing.

- **Look up a phone number**: whether the number is valid, its formats and country, then by level its line type,
  current carrier, line status or fraud score.
- **Verify an email address**: deliverable, undeliverable, risky or unknown, with the reason, the flags and a
  likely correction of a misspelt domain.
- **Look up an IP address**: where the address is, what network it is on, and whether it is Tor, a VPN or a
  datacenter.
- **Assess the risk of an identity**: a score from 0 to 100 with a verdict (allow, review or deny) and its reasons,
  from any mix of the three.

The answer is the API's JSON, unchanged. The node can be used as a tool by an AI agent.

**Credential:** ProofTell API, one API key, sent as a bearer token. Created in the ProofTell dashboard
(Developers → Integrations). A `pt_test_` key is the free sandbox with simulated, deterministic answers; a
`pt_live_` key spends the account's balance. The credential test calls `GET /v1/balance`.

**Category:** Development and Sales, as the node's codex says.

**Documentation:** https://prooftell.com/integrations#n8n (the node's page) and https://prooftell.com/docs (the API
reference). The README of the package covers installation, the operations, the sandbox and the errors.

**Repository:** https://github.com/prooftell/integrations, folder `n8n-nodes-prooftell`

**Homepage:** https://prooftell.com/integrations?utm_source=n8n&utm_medium=integration

**Author and contact:** ProofTell, support@prooftell.com

**License:** MIT

## How the verification guidelines are met

- Built with `@n8n/node-cli` (the declarative template) in TypeScript; `n8n-node lint` passes with no warning;
  `@n8n/scan-community-package`'s analyzer passes on the tarball and the source.
- No runtime dependency (`dependencies` is absent; `n8n-workflow` is a peer). No environment variable, no file
  system access: everything comes from the node's parameters and the credential.
- One third-party service, ProofTell, one package. No trigger in this release. It duplicates no
  existing node.
- Published by GitHub Actions with npm provenance from the public repository named in `package.json`; the author on
  npm and in the repository is the same (ProofTell).
- English only, sentence case for descriptions and the action names, Title Case for the parameters and the
  operation names, the API key a password field, the errors in n8n's message and description shape.
- README with installation, credentials, the operations, an example workflow (a manual trigger, an assessment on
  the sandbox, an IF on the verdict), the sandbox's example inputs and the errors; MIT license.
