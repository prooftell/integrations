## Description

Adds a ProofTell piece (prooftell.com): phone, email and IP verification with a risk score on top, on ProofTell's
public API (`api.prooftell.com`, bearer API key).

**Auth:** `PieceAuth.SecretText` — the API key, validated on connection with `GET /v1/balance`. A `pt_test_` key
is the free sandbox (simulated, deterministic answers); a `pt_live_` key spends the account's balance.

**Actions** (each a `POST`, the response body returned as it is, with `cost` and `currency`):

- **Look up a phone number** — `POST /v1/phone`: validity, formats, country, then by level (a static dropdown:
  Basic, Line type, Current carrier, Line status, Fraud score) the line type, current carrier, line status or fraud
  score.
- **Verify an email address** — `POST /v1/email`: deliverable, undeliverable, risky or unknown, with the reason,
  the flags and a did-you-mean suggestion; an optional timeout in milliseconds.
- **Look up an IP address** — `POST /v1/ip`: Tor, VPN, datacenter and anonymous flags, geography, ASN.
- **Assess the risk of an identity** — `POST /v1/assess`: any mix of the three (at least one, checked in `run`),
  a 0–100 score, a verdict and its reasons, each signal's result.
- **Custom API Call** — the generic escape hatch against `https://api.prooftell.com`.

The four actions carry `audience`, `aiMetadata` and `classification`; the connection is labelled Sandbox or Live from the key's prefix (`getConnectionIdentifier`). Errors surface the API's own
`error.message` as it is (a 402 reads "Top up to run this lookup."); a step retries on failure by default
(`errorHandlingOptions`), which covers the API's 429; request bodies are redacted from `HttpError`
(`redactBodyInErrors`) so no input reaches the logs. Requests send `User-Agent: prooftell-activepieces/<version>`.

Logo: `https://prooftell.com/favicon.svg` (ProofTell's own host); happy to switch to the CDN if you prefer to host
it.

## How was this tested?

`npx turbo run build --filter=@activepieces/piece-prooftell` and `npx turbo run lint --filter=@activepieces/piece-prooftell`
both pass. Exercised live against ProofTell's staging API with a sandbox key through the built action modules:
connection validation (a valid key, then a wrong one answering the API's 401 message), all four actions with the
API's documented sandbox inputs, the "at least one of the three" check, and the API's 503 path (the message shown,
the request body redacted).

### Linear ticket

None — external contribution.

### Breaking change?  (required — CI fails if this is left unedited)

- [x] no — reviewed, not breaking
- [ ] yes — technical (removed/renamed API field or endpoint, dropped column, new required field, removed/required env var)
- [ ] yes — functional (default/limit/behaviour change, new self-hosted setup step)

### Security impact?  (required — CI fails if this is left unedited)

- [x] no — reviewed, no security impact
- [ ] yes — security-sensitive (call out the risk and mitigation in the description above)
