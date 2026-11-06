// The nodes inside a real Node-RED runtime (node-red-node-test-helper). A local server stands in for the api
// (PROOFTELL_BASE_URL points at it) to prove the wiring: the fields and a string payload become the body, the answer
// lands in the output property, a failed check is the node's error with msg.statusCode. With PROOFTELL_TEST_KEY set
// (the smoke organization's sandbox key, read into the command, never written down) the four actions also run against
// staging and must give the sandbox's documented answers.
'use strict'

const assert = require('node:assert/strict')
const http = require('node:http')
const { after, afterEach, before, describe, test } = require('node:test')
const helper = require('node-red-node-test-helper')
const prooftellNode = require('../nodes/prooftell.js')

helper.init(require.resolve('node-red'))

const CONFIG = { id: 'c1', type: 'prooftell-config', name: 'test' }

function flow (props) {
  return [
    CONFIG,
    Object.assign(
      {
        id: 'n1',
        type: 'prooftell',
        connection: 'c1',
        action: 'phone',
        phone: 'payload.phone',
        phoneType: 'msg',
        email: 'payload.email',
        emailType: 'msg',
        ip: 'payload.ip',
        ipType: 'msg',
        country: '',
        countryType: 'str',
        level: 'line_type',
        timeout: '',
        reference: '',
        referenceType: 'str',
        output: 'payload',
        wires: [['h1']],
      },
      props,
    ),
    { id: 'h1', type: 'helper' },
  ]
}

function load (props, key = 'pt_test_local') {
  return new Promise((resolve) => helper.load(prooftellNode, flow(props), { c1: { apiKey: key } }, resolve))
}

/** Sends a message into n1 and resolves with the message that comes out, or the error it raises. */
function run (input) {
  const n1 = helper.getNode('n1')
  const h1 = helper.getNode('h1')
  return new Promise((resolve) => {
    h1.on('input', (msg) => resolve({ msg }))
    n1.on('call:error', (call) => resolve({ error: call.args[0], msg: call.args[1] }))
    n1.receive(input)
  })
}

describe('against a local api', () => {
  let server
  const requests = []
  const answers = {
    '/v1/phone': [200, { valid: true, line_type: 'mobile', cost: '0.000000' }],
    '/v1/email': [402, { error: { code: 'insufficient_balance', message: 'Top up $0.0030 or more.' } }],
    '/v1/ip': [200, { is_tor: true, country_code: 'DE', cost: '0.000000' }],
    '/v1/assess': [200, { score: 15, verdict: 'allow', reasons: [], cost: '0.000000' }],
  }

  before(async () => {
    server = http.createServer((req, res) => {
      let data = ''
      req.on('data', (chunk) => (data += chunk))
      req.on('end', () => {
        requests.push({ path: req.url, headers: req.headers, body: JSON.parse(data || '{}') })
        const [status, answer] = answers[req.url] || [404, { error: { code: 'not_found', message: 'No such route.' } }]
        res.writeHead(status, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(answer))
      })
    })
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    process.env.PROOFTELL_BASE_URL = `http://127.0.0.1:${server.address().port}`
    await new Promise((resolve) => helper.startServer(resolve))
  })

  after(async () => {
    delete process.env.PROOFTELL_BASE_URL
    await new Promise((resolve) => helper.stopServer(resolve))
    await new Promise((resolve) => server.close(resolve))
  })

  afterEach(async () => {
    requests.length = 0
    await helper.unload()
  })

  test('both nodes load', async () => {
    await load({})
    assert.ok(helper.getNode('n1'))
    assert.ok(helper.getNode('c1'))
  })

  test('a string payload is the phone number; the answer replaces the payload', async () => {
    await load({ level: 'current_carrier' })
    const { msg, error } = await run({ payload: '+447700900123' })
    assert.equal(error, undefined)
    assert.deepEqual(msg.payload, answers['/v1/phone'][1])
    assert.deepEqual(requests[0].body, { phone: '+447700900123', level: 'current_carrier' })
    assert.equal(requests[0].headers.authorization, 'Bearer pt_test_local')
    assert.match(requests[0].headers['user-agent'], /^prooftell-node-red\//)
  })

  test('an assessment reads its fields from the payload and a fixed reference; the answer goes where it is told', async () => {
    await load({ action: 'assess', reference: 'signup-42', referenceType: 'str', output: 'prooftell' })
    const payload = { phone: '+447700900123', ip: '203.0.113.1', name: 'kept' }
    const { msg } = await run({ payload })
    assert.deepEqual(msg.payload, payload)
    assert.deepEqual(msg.prooftell, answers['/v1/assess'][1])
    assert.deepEqual(requests[0].body, { phone: '+447700900123', ip: '203.0.113.1', reference: 'signup-42' })
  })

  test('a field can read another property; the IP check sends only the IP', async () => {
    await load({ action: 'ip', ip: 'req.ip', ipType: 'msg' })
    const { msg } = await run({ payload: { phone: '+447700900123' }, req: { ip: '203.0.113.66' } })
    assert.equal(msg.payload.is_tor, true)
    assert.equal(requests[0].path, '/v1/ip')
    assert.deepEqual(requests[0].body, { ip: '203.0.113.66' })
  })

  test("a failed check is the api's message as the node's error, with the status, and nothing goes out", async () => {
    await load({ action: 'email', timeout: '5000' })
    const { error, msg } = await run({ payload: 'jane@example.com' })
    assert.equal(error.message, 'Top up $0.0030 or more.')
    assert.equal(msg.statusCode, 402)
    assert.deepEqual(requests[0].body, { email: 'jane@example.com', timeout: 5000 })
  })

  test('a message without a payload is a field left empty, not a crash', async () => {
    await load({ action: 'phone' })
    const { error } = await run({ topic: 'no payload' })
    assert.match(error.message, /Give a phone number/)
    assert.equal(requests.length, 0)
  })

  test('an assessment with nothing to assess is refused before any request', async () => {
    await load({ action: 'assess' })
    const { error } = await run({ payload: 'not an object' })
    assert.match(error.message, /at least one of/)
    assert.equal(requests.length, 0)
  })
})

const KEY = process.env.PROOFTELL_TEST_KEY

describe('against staging, with the sandbox key', { skip: !KEY && 'PROOFTELL_TEST_KEY is not set' }, () => {
  before(async () => {
    process.env.PROOFTELL_BASE_URL = 'https://api.prooftell.dev'
    await new Promise((resolve) => helper.startServer(resolve))
  })

  after(async () => {
    delete process.env.PROOFTELL_BASE_URL
    await new Promise((resolve) => helper.stopServer(resolve))
  })

  afterEach(() => helper.unload())

  test('Look up a phone number: a GB mobile', async () => {
    await load({ action: 'phone' }, KEY)
    const { msg, error } = await run({ payload: '+447700900123' })
    assert.equal(error, undefined, error && error.message)
    assert.equal(msg.payload.valid, true)
    assert.equal(msg.payload.line_type, 'mobile')
    assert.equal(msg.payload.country_code, 'GB')
  })

  test('Verify an email address: deliverable', async () => {
    await load({ action: 'email' }, KEY)
    const { msg, error } = await run({ payload: { email: 'jane@example.com' } })
    assert.equal(error, undefined, error && error.message)
    assert.equal(msg.payload.verdict, 'deliverable')
  })

  test('Look up an IP address: Tor', async () => {
    await load({ action: 'ip' }, KEY)
    const { msg, error } = await run({ payload: '203.0.113.66' })
    assert.equal(error, undefined, error && error.message)
    assert.equal(msg.payload.is_tor, true)
  })

  test('Assess the risk of an identity: allow, with a geo mismatch', async () => {
    await load({ action: 'assess' }, KEY)
    const { msg, error } = await run({ payload: { phone: '+447700900123', ip: '203.0.113.1' } })
    assert.equal(error, undefined, error && error.message)
    assert.equal(msg.payload.verdict, 'allow')
    assert.ok(msg.payload.reasons.some((r) => r.code === 'geo_mismatch'))
  })

  test('a wrong key is refused with the api’s message', async () => {
    await load({ action: 'ip' }, 'pt_test_wrong')
    const { error, msg } = await run({ payload: '203.0.113.1' })
    assert.equal(msg.statusCode, 401)
    assert.ok(error.message.length > 0)
  })
})
