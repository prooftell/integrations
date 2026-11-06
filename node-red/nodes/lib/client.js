// The four checks as requests to ProofTell's public API, apart from Node-RED so that they are tested on their own.
// `bodyFor` keeps only what was given (a blank is not sent) and refuses what the api would refuse anyway, with a
// sentence a flow's author can act on; `call` sends one request and gives back the api's JSON unchanged, or throws
// a `ProoftellError` carrying the api's own message, code and status. Nothing here logs an input or the key.
'use strict'

const { version } = require('../../package.json')

/** The shipped address; tests point the node at staging or a local server through the environment only. */
const BASE_URL = 'https://api.prooftell.com'

/** Milliseconds a request may take: an email check may take 45 s at the mail server, plus the way there and back. */
const REQUEST_TIMEOUT = 60000

/** The four actions, named as on every ProofTell connector: the path each calls and the fields it sends. */
const ACTIONS = {
  phone: { label: 'Look up a phone number', path: '/v1/phone', fields: ['phone', 'country', 'level'], required: 'phone' },
  email: { label: 'Verify an email address', path: '/v1/email', fields: ['email', 'timeout'], required: 'email' },
  ip: { label: 'Look up an IP address', path: '/v1/ip', fields: ['ip'], required: 'ip' },
  assess: { label: 'Assess the risk of an identity', path: '/v1/assess', fields: ['phone', 'email', 'ip', 'country', 'reference'] },
}

const IDENTITY_FIELDS = ['phone', 'email', 'ip']

const NAMES = { phone: 'a phone number', email: 'an email address', ip: 'an IP address' }

class ProoftellError extends Error {
  constructor (message, { code, status } = {}) {
    super(message)
    this.name = 'ProoftellError'
    this.code = code
    this.status = status
  }
}

function isBlank (value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
}

/** The JSON body of an action from the values given; throws a `ProoftellError` when the call cannot be made. */
function bodyFor (action, values) {
  const spec = ACTIONS[action]
  if (!spec) throw new ProoftellError(`Unknown action "${action}".`)
  const body = {}
  for (const field of spec.fields) {
    const value = values[field]
    if (isBlank(value)) continue
    body[field] = typeof value === 'string' ? value.trim() : value
  }
  if (spec.required && body[spec.required] === undefined) {
    throw new ProoftellError(`Give ${NAMES[spec.required]}: the node's field, or a string in msg.payload.`)
  }
  if (action === 'assess' && !IDENTITY_FIELDS.some((field) => body[field] !== undefined)) {
    throw new ProoftellError('Give at least one of a phone number, an email address and an IP address.')
  }
  if (body.timeout !== undefined) {
    const timeout = Number(body.timeout)
    if (!Number.isInteger(timeout) || timeout < 1000 || timeout > 45000) {
      throw new ProoftellError('The timeout is in milliseconds, a whole number from 1000 to 45000.')
    }
    body.timeout = timeout
  }
  return body
}

/** Sends one action and resolves with the api's answer; rejects with a `ProoftellError` whose message is the api's. */
async function call ({ key, action, body, baseUrl = process.env.PROOFTELL_BASE_URL || BASE_URL, fetchImpl = fetch }) {
  if (isBlank(key)) throw new ProoftellError('No API key: open the ProofTell connection and paste a key.')
  let response
  try {
    response = await fetchImpl(baseUrl + ACTIONS[action].path, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key.trim()}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': `prooftell-node-red/${version}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    })
  } catch (err) {
    const reason = err && err.name === 'TimeoutError' ? 'it did not answer within 60 seconds' : 'it could not be reached'
    throw new ProoftellError(`The ProofTell API did not answer: ${reason}.`, { code: 'network' })
  }
  const text = await response.text()
  let answer
  try {
    answer = text ? JSON.parse(text) : {}
  } catch {
    answer = undefined
  }
  if (!response.ok) {
    const error = answer && answer.error
    const message = error && error.message ? error.message : `The ProofTell API answered ${response.status}.`
    throw new ProoftellError(message, { code: error && error.code, status: response.status })
  }
  if (answer === undefined) {
    throw new ProoftellError('The ProofTell API answered something other than JSON.', { status: response.status })
  }
  return answer
}

/** A few words on the answer for the node's status: the result, never the input. */
function summary (action, answer) {
  switch (action) {
    case 'phone':
      return answer.valid === false ? 'not valid' : (answer.line_type || 'valid')
    case 'email':
      return answer.verdict || answer.result || 'checked'
    case 'ip':
      return answer.is_tor ? 'Tor' : answer.is_vpn ? 'VPN' : answer.is_datacenter ? 'datacenter' : (answer.country_code || 'checked')
    case 'assess':
      return answer.verdict ? `${answer.verdict}, ${answer.score}` : 'assessed'
    default:
      return 'done'
  }
}

module.exports = { ACTIONS, BASE_URL, ProoftellError, bodyFor, call, summary }
