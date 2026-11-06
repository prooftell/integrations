#!/usr/bin/env node
// The ProofTell MCP server: the four checks and the balance as tools, over stdio, for an assistant that runs it
// locally (Claude, Cursor, VS Code…). Configured by its environment: PROOFTELL_API_KEY, a key from the ProofTell
// dashboard (Developers → Integrations). Nothing is written to stdout but the protocol; nothing is logged.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { version } from './api.js'
import { TOOLS, run } from './tools.js'

const INSTRUCTIONS = `ProofTell checks phone numbers, email addresses and IP addresses, and scores the risk of an identity from any
mix of the three (0–100, with a verdict: allow, review or deny, and its reasons). Each check is charged per check from
the account's balance; a pt_test_ key is the free sandbox, whose answers are simulated and deterministic:
+447700900123 is a GB mobile, jane@example.com is deliverable, 203.0.113.1 is a clean US address, 203.0.113.66 is Tor.
Use assess_identity_risk to decide on a sign-up or an order; the single checks to clean or enrich one value. The API
reference: https://prooftell.com/docs.`

const server = new McpServer({ name: 'prooftell', title: 'ProofTell', version }, { instructions: INSTRUCTIONS })

for (const tool of TOOLS) {
  server.registerTool(
    tool.name,
    { title: tool.title, description: tool.description, inputSchema: tool.inputSchema, annotations: tool.annotations },
    (args) => run(tool, args),
  )
}

await server.connect(new StdioServerTransport())
