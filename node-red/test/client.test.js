// The requests on their own: what each action sends, what it refuses before sending, and how the api's answers and
// errors come back. No network: `call` is given a fetch that records the request and answers as the api would.
'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { version } = require('../package.json')
const { bodyFor, call, summary, ProoftellError } = require('../nodes/lib/client')

test('each action sends only the fields given, trimmed', () => {
  assert.deepEqual(bodyFor('phone', { phone: ' +447700900123 ', country: '', level: 'line_type', email: 'x@y.z' }), {
    phone: '+447700900123',
    level: 'line_type',
  })
  assert.deepEqual(bodyFor('email', { email: 'jane@example.com', timeout: '5000' }), { email: 'jane@example.com', timeout: 5000 })
  assert.deepEqual(bodyFor('ip', { ip: '203.0.113.1', phone: '+447700900123' }), { ip: '203.0.113.1' })
  assert.deepEqual(bodyFor('assess', { phone: '+447700900123', ip: '203.0.113.1', email: '  ', reference: 'u-42' }), {
    phone: '+447700900123',
    ip: '203.0.113.1',
    reference: 'u-42',
  })
})

test('a call that cannot be made is refused before it is sent', () => {
  assert.throws(() => bodyFor('phone', { country: 'GB' }), /Give a phone number/)
  assert.throws(() => bodyFor('email', {}), /Give an email address/)
  assert.throws(() => bodyFor('ip', { ip: '' }), /Give an IP address/)
  assert.throws(() => bodyFor('assess', { country: 'GB', reference: 'u-42' }), /at least one of/)
  assert.throws(() => bodyFor('email', { email: 'jane@example.com', timeout: 50000 }), /1000 to 45000/)
  assert.throws(() => bodyFor('nothing', {}), ProoftellError)
})

function fakeFetch (status, answer) {
  const calls = []
  const impl = async (url, init) => {
    calls.push({ url, init })
    const text = typeof answer === 'string' ? answer : JSON.stringify(answer)
    return { ok: status >= 200 && status < 300, status, text: async () => text }
  }
  return { impl, calls }
}

test('a call posts the body with the key, the user agent and JSON headers, and gives the answer back unchanged', async () => {
  const answer = { valid: true, line_type: 'mobile', cost: '0.000000' }
  const { impl, calls } = fakeFetch(200, answer)
  const got = await call({ key: ' pt_test_abc ', action: 'phone', body: { phone: '+447700900123' }, baseUrl: 'https://api.example', fetchImpl: impl })
  assert.deepEqual(got, answer)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://api.example/v1/phone')
  assert.equal(calls[0].init.method, 'POST')
  assert.equal(calls[0].init.headers.Authorization, 'Bearer pt_test_abc')
  assert.equal(calls[0].init.headers['Content-Type'], 'application/json')
  assert.equal(calls[0].init.headers['User-Agent'], `prooftell-node-red/${version}`)
  assert.equal(calls[0].init.body, JSON.stringify({ phone: '+447700900123' }))
})

test('the api answers https://api.prooftell.com by default', async () => {
  const saved = process.env.PROOFTELL_BASE_URL
  delete process.env.PROOFTELL_BASE_URL
  try {
    const { impl, calls } = fakeFetch(200, {})
    await call({ key: 'pt_test_abc', action: 'assess', body: { ip: '203.0.113.1' }, fetchImpl: impl })
    assert.equal(calls[0].url, 'https://api.prooftell.com/v1/assess')
  } finally {
    if (saved !== undefined) process.env.PROOFTELL_BASE_URL = saved
  }
})

test("an error is the api's own message, with its code and status", async () => {
  const message = 'This check costs $0.0040 and the balance holds $0.0010: top up $0.0030 or more.'
  const { impl } = fakeFetch(402, { error: { code: 'insufficient_balance', message } })
  await assert.rejects(call({ key: 'pt_live_abc', action: 'email', body: { email: 'jane@example.com' }, fetchImpl: impl }), (err) => {
    assert.ok(err instanceof ProoftellError)
    assert.equal(err.message, message)
    assert.equal(err.code, 'insufficient_balance')
    assert.equal(err.status, 402)
    return true
  })
})

test('an answer that is not JSON, a missing key and an unreachable api each say so', async () => {
  const html = fakeFetch(502, '<html>Bad gateway</html>')
  await assert.rejects(call({ key: 'k', action: 'ip', body: { ip: '203.0.113.1' }, fetchImpl: html.impl }), /answered 502/)
  await assert.rejects(call({ key: '', action: 'ip', body: { ip: '203.0.113.1' }, fetchImpl: html.impl }), /No API key/)
  const down = async () => {
    throw new TypeError('fetch failed')
  }
  await assert.rejects(call({ key: 'k', action: 'ip', body: { ip: '203.0.113.1' }, fetchImpl: down }), /could not be reached/)
})

test("the node's status names the result, never the input", () => {
  assert.equal(summary('phone', { valid: true, line_type: 'mobile', phone: '+447700900123' }), 'mobile')
  assert.equal(summary('phone', { valid: false }), 'not valid')
  assert.equal(summary('email', { verdict: 'deliverable', email: 'jane@example.com' }), 'deliverable')
  assert.equal(summary('ip', { is_tor: true }), 'Tor')
  assert.equal(summary('ip', { country_code: 'US' }), 'US')
  assert.equal(summary('assess', { verdict: 'allow', score: 15 }), 'allow, 15')
})
