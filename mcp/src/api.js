// ProofTell's public API, as the MCP server calls it: one request per tool, the answer back unchanged, or an
// `ApiError` carrying the api's own message, code and status. The key comes from the server's environment
// (`PROOFTELL_API_KEY`); `PROOFTELL_BASE_URL` points it elsewhere for tests only. Nothing here logs an input or the key.
import { readFileSync } from 'node:fs'

export const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

/** The shipped address. */
export const BASE_URL = 'https://api.prooftell.com'

/** Milliseconds a request may take: an email check may take 45 s at the mail server, plus the way there and back. */
const REQUEST_TIMEOUT = 60000

export class ApiError extends Error {
  constructor (message, { code, status } = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

/** Sends one request and resolves with the api's JSON answer. `body` undefined makes it a GET. */
export async function request (path, body, { env = process.env, fetchImpl = fetch } = {}) {
  const key = (env.PROOFTELL_API_KEY || '').trim()
  if (!key) {
    throw new ApiError(
      'No API key: set PROOFTELL_API_KEY in this MCP server\'s configuration to a key from the ProofTell dashboard ' +
        '(Developers → Integrations). A pt_test_ key is the free sandbox.',
      { code: 'no_key' },
    )
  }
  const baseUrl = (env.PROOFTELL_BASE_URL || BASE_URL).replace(/\/+$/, '')
  let response
  try {
    response = await fetchImpl(baseUrl + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        'User-Agent': `prooftell-mcp/${version}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    })
  } catch (err) {
    const reason = err && err.name === 'TimeoutError' ? 'it did not answer within 60 seconds' : 'it could not be reached'
    throw new ApiError(`The ProofTell API did not answer: ${reason}.`, { code: 'network' })
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
    throw new ApiError(message, { code: error && error.code, status: response.status })
  }
  if (answer === undefined) {
    throw new ApiError('The ProofTell API answered something other than JSON.', { status: response.status })
  }
  return answer
}
