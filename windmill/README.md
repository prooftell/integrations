# ProofTell on Windmill

[ProofTell](https://prooftell.com/integrations?utm_source=windmill&utm_medium=integration) for
[Windmill](https://www.windmill.dev/): a resource type, `prooftell` (the API key), and four TypeScript (Bun) scripts,
one per action — look up a phone number, verify an email address, look up an IP address, assess the risk of an
identity. Each script calls ProofTell's public API (https://prooftell.com/docs) and returns the answer unchanged;
nothing is stored on the way. Each check is charged per check from your balance; the sandbox is free.

| Script | Call | Inputs |
|---|---|---|
| `scripts/look_up_a_phone_number.ts` | `POST /v1/phone` | `phone`; `country`, for a number in national format; `level`: `basic`, `line_type` (the default), `current_carrier`, `line_status`, `fraud_score` |
| `scripts/verify_an_email_address.ts` | `POST /v1/email` | `email`; `timeout`, 1000 to 45000 ms |
| `scripts/look_up_an_ip_address.ts` | `POST /v1/ip` | `ip` |
| `scripts/assess_the_risk_of_an_identity.ts` | `POST /v1/assess` | any of `phone`, `email`, `ip` (one at least); `country`; `reference` |

A failed call throws the API's message with its code and status (`insufficient_balance, HTTP 402` names what the
check needs and what to top up), so the flow's error handler or retry takes it.

## Using it in a workspace

1. Create a key in the ProofTell dashboard (Developers → Integrations), named Windmill. A `pt_test_` key is the free
   sandbox: simulated, deterministic answers. A `pt_live_` key spends the account's balance.
2. The resource type: from the Hub, once it is approved there; until then Resources → Resource types → Add a
   resource type, named `prooftell`, with the schema of `resource-type.json`. Then Resources → Add a resource of type
   `prooftell` with the key (keep the key itself in a secret variable and reference it).
3. The scripts: from the Hub, or a new Bun script with a file's content pasted. Pick the resource in the script's
   `prooftell` input; the other inputs come from the flow.

The sandbox's inputs: `+447700900123` is a GB mobile, `jane@example.com` is deliverable, `203.0.113.66` is Tor, and an
assessment of `+447700900123` with `203.0.113.1` is a `geo_mismatch`, allowed with a score of 15.

## Tests

```sh
bun test     # each script against a local stand-in for the API; with PROOFTELL_TEST_KEY set to a sandbox key
             # (read into the command, never written down), against staging as well
```

`PROOFTELL_BASE_URL` points the scripts at another API (`https://api.prooftell.dev`, staging); it is read from the
environment only.

## Publishing on the Hub

On https://hub.windmill.dev, signed in: the resource type first (name `prooftell`, integration ProofTell, the schema
of `resource-type.json`), then a script per file (its summary the action's name, integration ProofTell, the file's
header comment as the description, language Bun, the file's content). Windmill's team approves each before it shows
in every workspace; a change is a new version of the script there.

## Resources

- ProofTell: https://prooftell.com/integrations?utm_source=windmill&utm_medium=integration
- The API reference: https://prooftell.com/docs
- Support: support@prooftell.com
