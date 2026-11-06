// The tools an assistant sees: the four checks, named as on every ProofTell connector (their titles; the names are
// the same in snake_case, as MCP clients expect), and the account's balance. Each check is one request, charged per
// check from the balance (the sandbox is free); the answer is the api's JSON, unchanged, as text and as structured
// content. A failed call is a tool error carrying the api's message and code, so the assistant can say what to do.
import { z } from 'zod'
import { ApiError, request } from './api.js'

const LEVELS = ['basic', 'line_type', 'current_carrier', 'line_status', 'fraud_score']

/** A text argument: a required one must not be empty; an optional one may be, and is then not sent. */
function text (max, description, required) {
  return required ? z.string().min(1).max(max).describe(description) : z.string().max(max).describe(description).optional()
}

const PHONE = 'The phone number, in international format (E.164, e.g. +447700900123), or in national format with the country.'
const EMAIL = 'The email address, e.g. jane@example.com.'
const IP = 'The IPv4 or IPv6 address of the end user, e.g. 203.0.113.1.'
const country = z
  .string()
  .regex(/^([A-Za-z]{2})?$/, 'a two-letter country code')
  .describe('The two-letter country code (ISO 3166-1 alpha-2, e.g. GB) of a number given in national format.')
  .optional()

/** The answer of a call that cost something: neither read-only nor idempotent, since each call is charged. */
const CHECK = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }

export const TOOLS = [
  {
    name: 'look_up_phone_number',
    title: 'Look up a phone number',
    description:
      'Checks a phone number: valid or not, its formats and country, then by level its line type, the carrier it is ' +
      'on today, whether it is live on the network, or a fraud score. The levels are a ladder, each including the ' +
      'ones before it and priced on its own: basic, line_type (the default), current_carrier, line_status, ' +
      'fraud_score; what is not offered for the number comes back as unavailable, at no cost. Charged per check from ' +
      'your balance; the sandbox (a pt_test_ key) is free.',
    inputSchema: {
      phone: text(32, PHONE, true),
      country,
      level: z.enum(LEVELS).optional().describe('How far to look; line_type when omitted.'),
    },
    annotations: { title: 'Look up a phone number', ...CHECK },
    call: (args) => request('/v1/phone', args),
  },
  {
    name: 'verify_email_address',
    title: 'Verify an email address',
    description:
      'Checks whether an email address accepts mail: a verdict (deliverable, undeliverable, risky, unknown) with its ' +
      'reason, the flags (disposable, role address, catch-all…), the safe action for a sign-up form, and a likely ' +
      'correction of a misspelt domain. Charged per check from your balance; the sandbox (a pt_test_ key) is free.',
    inputSchema: {
      email: text(254, EMAIL, true),
      timeout: z
        .number()
        .int()
        .min(1000)
        .max(45000)
        .optional()
        .describe('Milliseconds allowed for the mail server, 1000 to 45000 (the default); past it the address comes back unknown, free.'),
    },
    annotations: { title: 'Verify an email address', ...CHECK },
    call: (args) => request('/v1/email', args),
  },
  {
    name: 'look_up_ip_address',
    title: 'Look up an IP address',
    description:
      'Finds where an IP address is and what network it is on (country, city, ASN and organisation), and whether it ' +
      'is Tor, a VPN or a datacenter. Charged per check from your balance; the sandbox (a pt_test_ key) is free.',
    inputSchema: { ip: text(64, IP, true) },
    annotations: { title: 'Look up an IP address', ...CHECK },
    call: (args) => request('/v1/ip', args),
  },
  {
    name: 'assess_identity_risk',
    title: 'Assess the risk of an identity',
    description:
      'Scores an identity from 0 (no risk found) to 100 with a verdict (allow, review or deny) and the reasons that ' +
      'added to the score, from any mix of phone number, email address and IP address, each checked in parallel; ' +
      'each signal\'s own result is under signals. Give at least one of the three. Charged per signal from your ' +
      'balance; the sandbox (a pt_test_ key) is free.',
    inputSchema: {
      phone: text(32, PHONE),
      email: text(254, EMAIL),
      ip: text(64, IP),
      country,
      reference: z.string().max(128).optional().describe('Your own id for this check (a sign-up, an order), echoed back.'),
    },
    annotations: { title: 'Assess the risk of an identity', ...CHECK },
    call: (args) => {
      if (!args.phone && !args.email && !args.ip) {
        throw new ApiError('Give at least one of a phone number, an email address and an IP address.', { code: 'nothing_to_assess' })
      }
      return request('/v1/assess', args)
    },
  },
  {
    name: 'get_balance',
    title: "Get the account's balance",
    description:
      "The account's balance in US dollars (paid and promotional money, what is held for running files) and what " +
      "this month's checks cost so far, by signal. Free. Useful before a batch of checks, or to tell a live key " +
      '(pt_live_) from the sandbox.',
    inputSchema: {},
    annotations: { title: "Get the account's balance", readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    call: () => request('/v1/balance'),
  },
]

/** The arguments as the api takes them: empty strings dropped, a country upper-cased. */
function cleaned (args = {}) {
  const out = {}
  for (const [key, value] of Object.entries(args)) {
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) continue
    out[key] = typeof value === 'string' ? value.trim() : value
  }
  if (out.country) out.country = out.country.toUpperCase()
  return out
}

/** Runs a tool and shapes its result for MCP: the answer as JSON text and structured content, or a tool error. */
export async function run (tool, args) {
  try {
    const answer = await tool.call(cleaned(args))
    return { content: [{ type: 'text', text: JSON.stringify(answer, null, 2) }], structuredContent: answer }
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'The call failed before reaching ProofTell.'
    const detail = err instanceof ApiError && err.code ? ` (${err.code}${err.status ? `, HTTP ${err.status}` : ''})` : ''
    return { isError: true, content: [{ type: 'text', text: message + detail }] }
  }
}
