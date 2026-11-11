# @prooftell/mcp

[ProofTell](https://prooftell.com/integrations?utm_source=mcp&utm_medium=integration)'s MCP server: the checks of
ProofTell's public API (https://prooftell.com/docs) as tools for Claude, Cursor, VS Code and any client of the
Model Context Protocol. Ask the assistant to check a phone number, an email address or an IP address, or to assess
the risk of a sign-up; it calls ProofTell with your key and reads the answer. The server runs on your machine
(stdio) and stores nothing.

## The key

Create a key in the ProofTell dashboard (Developers → Integrations), named after this platform. A `pt_test_` key is
the free sandbox: simulated, deterministic answers. A `pt_live_` key spends the account's balance. The server reads
it from the environment variable `PROOFTELL_API_KEY`, set in the client's configuration below.

## Adding it to a client

It needs Node.js 18 or later; `npx` fetches the server on first use.

**Claude Code:**

```sh
claude mcp add prooftell --env PROOFTELL_API_KEY=pt_test_… -- npx -y @prooftell/mcp
```

**Claude Desktop:** Settings → Developer → Edit config, then in `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "prooftell": {
      "command": "npx",
      "args": ["-y", "@prooftell/mcp"],
      "env": { "PROOFTELL_API_KEY": "pt_test_…" }
    }
  }
}
```

**Cursor:** the same block in `~/.cursor/mcp.json` (every project) or `.cursor/mcp.json` (one project).

**VS Code** (agent mode): in `.vscode/mcp.json`; VS Code asks for the key once and keeps it out of the file.

```json
{
  "inputs": [
    { "type": "promptString", "id": "prooftell-key", "description": "ProofTell API key", "password": true }
  ],
  "servers": {
    "prooftell": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@prooftell/mcp"],
      "env": { "PROOFTELL_API_KEY": "${input:prooftell-key}" }
    }
  }
}
```

## The tools

Each check is charged per check from your balance; the sandbox is free. The answer is the API's JSON, unchanged.

| Tool | Title | Call | Arguments |
|---|---|---|---|
| `look_up_phone_number` | Look up a phone number | `POST /v1/phone` | `phone` (required); `country`, for a number in national format; `level`: `basic`, `line_type` (the default), `current_carrier`, `line_status`, `fraud_score`, each including the ones before it |
| `verify_email_address` | Verify an email address | `POST /v1/email` | `email` (required); `timeout`, 1000 to 45000 ms |
| `look_up_ip_address` | Look up an IP address | `POST /v1/ip` | `ip` (required) |
| `assess_identity_risk` | Assess the risk of an identity | `POST /v1/assess` | any of `phone`, `email`, `ip` (one at least); `country`; `reference` |
| `get_balance` | Get the account's balance | `GET /v1/balance` | — (free) |

An assessment answers a `score` from 0 to 100, a `verdict` (allow, review, deny) and the `reasons` that added to the
score; each signal's own result is under `signals`. A failed call comes back as a tool error with the API's message
and code — `insufficient_balance` names what the check needs and what to top up, `rate_limited` is a burst above the
key's rate, `invalid_api_key` a wrong or revoked key — so the assistant can say what to do.

## The sandbox

With a `pt_test_` key every call is simulated, deterministic and free: `+447700900123` is a GB mobile,
`+15005550003` is not valid; `jane@example.com` is deliverable, `disposable@sandbox.prooftell.com` disposable;
`203.0.113.1` is a clean US address, `203.0.113.66` Tor; an assessment of `+447700900123` with `203.0.113.1` is a
`geo_mismatch`, allowed with a score of 15. The full list is in the API reference: https://prooftell.com/docs.

## Development

Plain JavaScript (ES modules), no build step: `src/index.js` (the server), `src/tools.js` (the tools and their
schemas), `src/api.js` (the requests).

```sh
npm install
npm test     # the SDK's client spawns the server: the tools' list, the requests against a local stand-in for the
             # API, the errors; with PROOFTELL_TEST_KEY set to a sandbox key (read into the command, never written
             # down), every tool against staging as well
```

`PROOFTELL_BASE_URL` points the server at another API (`https://api.prooftell.dev`, staging); it is read from the
environment only.

## Releasing

1. npm, by GitHub Actions with provenance (`.github/workflows/release-mcp.yml` at the root of
   [prooftell/integrations](https://github.com/prooftell/integrations)): bump `version` in `package.json` and in
   `server.json` (both places), commit, tag `mcp-v<version>` and push the tag. The first release publishes with the
   repository secret `NPM_TOKEN` (a granular token with Read and write on all packages and Bypass two-factor
   authentication); after it, npm's trusted publishing (the package's settings, Publish access → Trusted Publishers
   → GitHub Actions, owner `prooftell`, repository `integrations`, workflow `release-mcp.yml`, "Allow npm publish"
   ticked), the secret and the token deleted. npm expires a new trusted publisher that no successful publish has used within 2 days (then: delete it,
   create it again and release within 2 days); the token-free path was first proven with 1.0.1.
2. The official MCP Registry, once the version is on npm, from this folder with
   [mcp-publisher](https://github.com/modelcontextprotocol/registry/releases): `mcp-publisher login dns --domain
   prooftell.com --private-key <the key's hex>`, then `mcp-publisher publish`. The name `com.prooftell/mcp` is proven
   by the TXT record `v=MCPv1; k=ed25519; p=…` at prooftell.com's apex; `package.json`'s `mcpName` ties the npm
   package to it. A version published there cannot be changed or removed: a fix is a new version.

## Resources

- ProofTell: https://prooftell.com/integrations?utm_source=mcp&utm_medium=integration
- The API reference: https://prooftell.com/docs
- Support: support@prooftell.com

## License

MIT.
