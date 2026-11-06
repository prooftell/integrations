// The server as a client sees it: the SDK's own client spawns `src/index.js` over stdio, lists the tools and calls
// them. A local server stands in for the api (PROOFTELL_BASE_URL) to prove the wiring: the arguments become the body,
// the key the bearer, the answer the result, an api error a tool error with its message and code. With
// PROOFTELL_TEST_KEY set (a sandbox key, read into the command, never written down) every tool also runs against
// staging and must give the sandbox's documented answers.
import assert from 'node:assert/strict'
import http from 'node:http'
import { after, before, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const SERVER = fileURLToPath(new URL('../src/index.js', import.meta.url))

async function connect (env) {
  const transport = new StdioClientTransport({ command: process.execPath, args: [SERVER], env: { PATH: process.env.PATH, ...env }, stderr: 'pipe' })
  const client = new Client({ name: 'prooftell-mcp-test', version: '0.0.0' })
  await client.connect(transport)
  return client
}

/** The answer of a successful call, parsed from its text; fails the test on a tool error. */
function answerOf (result) {
  assert.notEqual(result.isError, true, result.content?.[0]?.text)
  const parsed = JSON.parse(result.content[0].text)
  assert.deepEqual(result.structuredContent, parsed)
  return parsed
}

describe('against a local api', () => {
  let api
  let client
  const requests = []
  const answers = {
    'POST /v1/phone': [200, { valid: true, line_type: 'mobile', cost: '0.000000' }],
    'POST /v1/email': [402, { error: { code: 'insufficient_balance', message: 'Top up $0.0030 or more.' } }],
    'POST /v1/ip': [200, { is_tor: true, cost: '0.000000' }],
    'POST /v1/assess': [200, { score: 15, verdict: 'allow', reasons: [] }],
    'GET /v1/balance': [200, { currency: 'USD', balance: '0.0000' }],
  }

  before(async () => {
    api = http.createServer((req, res) => {
      let data = ''
      req.on('data', (chunk) => (data += chunk))
      req.on('end', () => {
        requests.push({ route: `${req.method} ${req.url}`, headers: req.headers, body: data ? JSON.parse(data) : undefined })
        const [status, answer] = answers[`${req.method} ${req.url}`] || [404, { error: { code: 'not_found', message: 'No such route.' } }]
        res.writeHead(status, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(answer))
      })
    })
    await new Promise((resolve) => api.listen(0, '127.0.0.1', resolve))
    client = await connect({ PROOFTELL_API_KEY: 'pt_test_local', PROOFTELL_BASE_URL: `http://127.0.0.1:${api.address().port}` })
  })

  after(async () => {
    await client.close()
    await new Promise((resolve) => api.close(resolve))
  })

  test('the five tools, titled with the actions’ names, the checks marked as charged', async () => {
    const { tools } = await client.listTools()
    const byName = Object.fromEntries(tools.map((t) => [t.name, t]))
    assert.deepEqual(Object.keys(byName).sort(), ['assess_identity_risk', 'get_balance', 'look_up_ip_address', 'look_up_phone_number', 'verify_email_address'])
    assert.equal(byName.look_up_phone_number.title, 'Look up a phone number')
    assert.equal(byName.verify_email_address.title, 'Verify an email address')
    assert.equal(byName.look_up_ip_address.title, 'Look up an IP address')
    assert.equal(byName.assess_identity_risk.title, 'Assess the risk of an identity')
    assert.deepEqual(byName.look_up_phone_number.inputSchema.required, ['phone'])
    assert.deepEqual(byName.look_up_phone_number.inputSchema.properties.level.enum, ['basic', 'line_type', 'current_carrier', 'line_status', 'fraud_score'])
    for (const name of ['look_up_phone_number', 'verify_email_address', 'look_up_ip_address', 'assess_identity_risk']) {
      assert.match(byName[name].description, /Charged per (check|signal) from your balance; the sandbox \(a pt_test_ key\) is free\./)
      assert.equal(byName[name].annotations.readOnlyHint, false)
    }
    assert.equal(byName.get_balance.annotations.readOnlyHint, true)
  })

  test('a check posts its arguments, trimmed, with the key and the user agent, and answers the api’s JSON', async () => {
    requests.length = 0
    const result = await client.callTool({ name: 'look_up_phone_number', arguments: { phone: ' +447700900123 ', country: 'gb', level: 'line_status' } })
    assert.deepEqual(answerOf(result), answers['POST /v1/phone'][1])
    assert.equal(requests[0].route, 'POST /v1/phone')
    assert.deepEqual(requests[0].body, { phone: '+447700900123', country: 'GB', level: 'line_status' })
    assert.equal(requests[0].headers.authorization, 'Bearer pt_test_local')
    assert.match(requests[0].headers['user-agent'], /^prooftell-mcp\/\d/)
  })

  test('an assessment sends only what was given; the balance is a GET', async () => {
    requests.length = 0
    answerOf(await client.callTool({ name: 'assess_identity_risk', arguments: { ip: '203.0.113.1', email: '', reference: 'signup-42' } }))
    answerOf(await client.callTool({ name: 'get_balance', arguments: {} }))
    assert.deepEqual(requests[0].body, { ip: '203.0.113.1', reference: 'signup-42' })
    assert.equal(requests[1].route, 'GET /v1/balance')
    assert.equal(requests[1].body, undefined)
  })

  test('an api error is a tool error with the api’s message and code', async () => {
    const result = await client.callTool({ name: 'verify_email_address', arguments: { email: 'jane@example.com' } })
    assert.equal(result.isError, true)
    assert.equal(result.content[0].text, 'Top up $0.0030 or more. (insufficient_balance, HTTP 402)')
  })

  test('an assessment of nothing is refused before any request; a bad argument by the schema', async () => {
    requests.length = 0
    const nothing = await client.callTool({ name: 'assess_identity_risk', arguments: { country: 'GB' } })
    assert.equal(nothing.isError, true)
    assert.match(nothing.content[0].text, /at least one of/)
    const badTimeout = await client.callTool({ name: 'verify_email_address', arguments: { email: 'jane@example.com', timeout: 99 } })
    assert.equal(badTimeout.isError, true)
    assert.equal(requests.length, 0)
  })
})

describe('without a key', () => {
  test('the tools are listed, and a call says how to set the key', async () => {
    const client = await connect({})
    try {
      assert.equal((await client.listTools()).tools.length, 5)
      const result = await client.callTool({ name: 'look_up_ip_address', arguments: { ip: '203.0.113.1' } })
      assert.equal(result.isError, true)
      assert.match(result.content[0].text, /set PROOFTELL_API_KEY/)
    } finally {
      await client.close()
    }
  })
})

const KEY = process.env.PROOFTELL_TEST_KEY

describe('against staging, with the sandbox key', { skip: !KEY && 'PROOFTELL_TEST_KEY is not set' }, () => {
  let client
  before(async () => {
    client = await connect({ PROOFTELL_API_KEY: KEY, PROOFTELL_BASE_URL: 'https://api.prooftell.dev' })
  })
  after(() => client.close())

  test('Look up a phone number: a GB mobile', async () => {
    const answer = answerOf(await client.callTool({ name: 'look_up_phone_number', arguments: { phone: '+447700900123' } }))
    assert.equal(answer.valid, true)
    assert.equal(answer.line_type, 'mobile')
  })

  test('Verify an email address: deliverable', async () => {
    const answer = answerOf(await client.callTool({ name: 'verify_email_address', arguments: { email: 'jane@example.com' } }))
    assert.equal(answer.verdict, 'deliverable')
  })

  test('Look up an IP address: Tor', async () => {
    const answer = answerOf(await client.callTool({ name: 'look_up_ip_address', arguments: { ip: '203.0.113.66' } }))
    assert.equal(answer.is_tor, true)
  })

  test('Assess the risk of an identity: allow, with a geo mismatch', async () => {
    const answer = answerOf(await client.callTool({ name: 'assess_identity_risk', arguments: { phone: '+447700900123', ip: '203.0.113.1' } }))
    assert.equal(answer.verdict, 'allow')
    assert.ok(answer.reasons.some((r) => r.code === 'geo_mismatch'))
  })

  test("Get the account's balance", async () => {
    const answer = answerOf(await client.callTool({ name: 'get_balance', arguments: {} }))
    assert.equal(answer.currency, 'USD')
  })
})
