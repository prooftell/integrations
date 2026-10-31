# ProofTell integrations

The connectors that put ProofTell's checks inside the platforms teams already use. Each one runs on its platform
and takes a ProofTell API key (`pt_live_…`, or `pt_test_…` for the free sandbox); nothing of a customer's is stored
here or by us. The four actions are the same everywhere — look up a phone number, verify an email address, look up an
IP address, assess the risk of an identity — on the public API (https://prooftell.com/docs). How each is published,
re-published and reviewed: the workspace's `RUNBOOK.md` → Integrations; why: `DECISIONS.md` D188.

| Folder | What | Where it goes |
|--------|------|---------------|
| `zapier/` | The Zapier integration (zapier-platform-cli) | Zapier's app directory |
| `n8n-nodes-prooftell/` | The n8n community node, an npm package | npm, then n8n's verified community nodes |
| `make/` | The Make custom app, as files | Make's integrations page (a community app) |
| `power-platform/` | The Power Platform independent-publisher connector | `microsoft/PowerPlatformConnectors` by PR |
| `activepieces/` | The Activepieces piece | `activepieces/activepieces` by PR |
| `postman/` | The Postman collection, generated from the api's OpenAPI | Postman's API Network |
