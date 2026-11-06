// Writes the HubSpot app as two developer projects (the plan's §7.2): `projects/production` (the marketplace app,
// calling api.prooftell.com) and `projects/staging` (a private app for the test accounts, calling
// api.prooftell.dev). An action has one URL, so each environment has its own app; both come from this one
// definition, and the projects are generated, never edited by hand. Run: `node scripts/build.mjs`, then commit
// `projects/`. The names, the inputs and the outputs follow integrations/CLAUDE.md's surface and the api's
// `prooftell.integrations.CrmChecks`; the levels' provider is never named (D68), no price is written (D38).
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(dirname(fileURLToPath(import.meta.url)))

const ENVIRONMENTS = {
  production: {
    name: 'ProofTell',
    distribution: 'marketplace',
    api: 'https://api.prooftell.com',
    redirectUrls: ['https://app.prooftell.com/integrations/hubspot/callback'],
  },
  staging: {
    name: 'ProofTell staging',
    distribution: 'private',
    api: 'https://api.prooftell.dev',
    redirectUrls: [
      'https://app.prooftell.dev/integrations/hubspot/callback',
      'http://localhost:5173/integrations/hubspot/callback',
    ],
  },
}

// The api's HubSpotOAuth.SCOPES, the same list: HubSpot refuses a consent page that leaves a required one out.
const SCOPES = [
  'oauth',
  'crm.objects.contacts.read',
  'crm.objects.contacts.write',
  'crm.schemas.contacts.read',
  'crm.schemas.contacts.write',
  'automation',
]

const text = (name) => ({ typeDefinition: { name, type: 'string', fieldType: 'text' } })
const number = (name) => ({ typeDefinition: { name, type: 'number', fieldType: 'number' } })
const input = (name, required, fromContact = true) => ({
  typeDefinition: { name, type: 'string', fieldType: 'text' },
  // HubSpot takes one value type per input: the contact's property for what is checked, a typed value otherwise.
  supportedValueTypes: fromContact ? ['OBJECT_PROPERTY'] : ['STATIC_VALUE'],
  isRequired: required,
})

// The codes the api answers with FAIL_CONTINUE (HubSpotActions), each a sentence in the workflow's history.
const ERRORS = {
  not_connected: 'This HubSpot account is not connected to a ProofTell organization. Connect it from the ProofTell dashboard (Integrations).',
  insufficient_balance: 'The ProofTell balance is too low for this check. Top it up in the ProofTell dashboard (Billing).',
  organization_suspended: 'The ProofTell organization is suspended. Write to support@prooftell.com.',
  payment_disputed: 'A card payment of the ProofTell organization is disputed: this check is paused. Write to support@prooftell.com.',
  staging_restricted: 'This test organization runs sandbox checks only.',
  invalid_phone: 'The phone number is missing or is not a phone number.',
  invalid_email: 'The email address is missing or is not an email address.',
  invalid_ip: 'The IP address is missing or is not an IP address.',
  invalid_country: 'The country is not a two-letter ISO 3166-1 code.',
  invalid_level: 'The level is not one of Basic, Line type, Current carrier, Line status or Fraud score.',
  invalid_reference: 'The reference is too long.',
  bad_request: 'Give a phone number, an email address or an IP address.',
}
const errorRules = Object.keys(ERRORS).map((code) => ({ labelName: code, conditions: { prooftell_error: [code] } }))

const COMMON_OUT_LABELS = { cost: 'Cost (USD)', prooftell_error: 'ProofTell error code' }

const ACTIONS = [
  {
    check: 'phone',
    name: 'Look up a phone number',
    description:
      'Checks a phone number with ProofTell: valid or not, its line type and country; above the line type, its current carrier, whether the line is live, or a fraud score. Charged per check from your balance; the sandbox is free.',
    card: 'Look up a phone number with ProofTell',
    inputs: [
      input('phone', true),
      input('country', false, false),
      {
        typeDefinition: {
          name: 'level',
          type: 'enumeration',
          fieldType: 'select',
          options: [
            { value: 'basic', label: 'Basic' },
            { value: 'line_type', label: 'Line type' },
            { value: 'current_carrier', label: 'Current carrier' },
            { value: 'line_status', label: 'Line status' },
            { value: 'fraud_score', label: 'Fraud score' },
          ],
        },
        supportedValueTypes: ['STATIC_VALUE'],
        isRequired: false,
      },
    ],
    inputLabels: { phone: 'Phone number', country: 'Country', level: 'Level' },
    inputDescriptions: {
      phone: 'In international format (+44 7700 900123), or national with the country.',
      country: 'The two-letter code (GB, US) of a number in national format.',
      level: 'How deep the check goes: Line type when left empty.',
    },
    outputs: [
      text('valid'),
      text('e164'),
      text('line_type'),
      text('country_code'),
      text('original_carrier'),
      text('reason'),
      text('current_carrier'),
      text('ported'),
      text('reachable'),
      number('fraud_score'),
      text('risk_level'),
      text('cost'),
      text('prooftell_error'),
    ],
    outputLabels: {
      valid: 'Valid',
      e164: 'Number in E.164',
      line_type: 'Line type',
      country_code: 'Country code',
      original_carrier: 'Original carrier',
      reason: 'Why not valid',
      current_carrier: 'Current carrier',
      ported: 'Ported',
      reachable: 'Reachable',
      fraud_score: 'Fraud score',
      risk_level: 'Risk level',
    },
  },
  {
    check: 'email',
    name: 'Verify an email address',
    description:
      'Verifies an email address with ProofTell: deliverable or not, disposable, catch-all, a misspelt domain. Charged per check from your balance; the sandbox is free.',
    card: 'Verify an email address with ProofTell',
    inputs: [input('email', true)],
    inputLabels: { email: 'Email address' },
    inputDescriptions: { email: 'The address to verify.' },
    outputs: [text('result'), text('deliverable'), text('verdict'), text('reason'), text('did_you_mean'), text('cost'), text('prooftell_error')],
    outputLabels: {
      result: 'Result',
      deliverable: 'Deliverable',
      verdict: 'Verdict',
      reason: 'Reason',
      did_you_mean: 'Did you mean',
    },
  },
  {
    check: 'ip',
    name: 'Look up an IP address',
    description:
      'Looks up an IP address with ProofTell: its country and city, its network, and whether it is Tor, a VPN or a data centre. Charged per check from your balance; the sandbox is free.',
    card: 'Look up an IP address with ProofTell',
    inputs: [input('ip', true)],
    inputLabels: { ip: 'IP address' },
    inputDescriptions: { ip: 'An IPv4 or IPv6 address.' },
    outputs: [
      text('country_code'),
      text('city'),
      number('asn'),
      text('as_org'),
      text('is_tor'),
      text('is_vpn'),
      text('is_datacenter'),
      text('is_anonymous'),
      text('cost'),
      text('prooftell_error'),
    ],
    outputLabels: {
      country_code: 'Country code',
      city: 'City',
      asn: 'Network number (ASN)',
      as_org: 'Network',
      is_tor: 'Tor',
      is_vpn: 'VPN',
      is_datacenter: 'Data centre',
      is_anonymous: 'Anonymous',
    },
  },
  {
    check: 'assess',
    name: 'Assess the risk of an identity',
    description:
      'Scores a phone number, an email address and an IP address together with ProofTell: a score from 0 to 100, a verdict (allow, review, deny) and its reasons. Charged per check from your balance; the sandbox is free.',
    card: 'Assess the risk of an identity with ProofTell',
    inputs: [input('phone', false), input('email', false), input('ip', false), input('country', false, false), input('reference', false, false)],
    inputLabels: { phone: 'Phone number', email: 'Email address', ip: 'IP address', country: 'Country', reference: 'Reference' },
    inputDescriptions: {
      phone: 'Give at least one of the phone number, the email address and the IP address.',
      country: 'The two-letter code of a phone number in national format.',
      reference: 'Your own id for this assessment, shown in the ProofTell dashboard.',
    },
    outputs: [number('score'), text('verdict'), text('reasons'), text('assessment_id'), text('cost'), text('prooftell_error')],
    outputLabels: { score: 'Score', verdict: 'Verdict', reasons: 'Reasons', assessment_id: 'Assessment id' },
  },
]

function action(a, env) {
  return {
    uid: `prooftell_${a.check}`,
    type: 'workflow-action',
    config: {
      actionUrl: `${env.api}/integrations/hubspot/actions/${a.check}`,
      isPublished: true,
      supportedClients: [{ client: 'WORKFLOWS' }],
      objectTypes: ['0-1'], // contacts, as HubSpot names an object type
      inputFields: a.inputs,
      outputFields: a.outputs,
      executionRules: errorRules,
      labels: {
        en: {
          actionName: a.name,
          actionDescription: a.description,
          actionCardContent: a.card,
          appDisplayName: 'ProofTell',
          inputFieldLabels: a.inputLabels,
          inputFieldDescriptions: a.inputDescriptions,
          outputFieldLabels: { ...a.outputLabels, ...COMMON_OUT_LABELS },
          executionRules: ERRORS,
        },
      },
    },
  }
}

function app(env) {
  return {
    uid: 'prooftell',
    type: 'app',
    config: {
      name: env.name,
      description:
        'ProofTell checks the people in your CRM: a phone number, an email address and an IP address, one at a time from a workflow or scored together as one risk score. Connect your HubSpot account to a ProofTell organization; each check is charged to its balance, and its sandbox is free.',
      logo: '/app/app-logo.png',
      distribution: env.distribution,
      auth: { type: 'oauth', redirectUrls: env.redirectUrls, requiredScopes: SCOPES, optionalScopes: [], conditionallyRequiredScopes: [] },
      // The app has no card or page in HubSpot: nothing of ours is fetched or framed there.
      permittedUrls: { fetch: [], iframe: [], img: [] },
      support: {
        supportEmail: 'support@prooftell.com',
        documentationUrl: 'https://prooftell.com/integrations#hubspot',
        supportUrl: 'https://prooftell.com/contact',
      },
    },
  }
}

const write = (path, value) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n')
}

for (const [key, env] of Object.entries(ENVIRONMENTS)) {
  const root = join(here, 'projects', key)
  rmSync(root, { recursive: true, force: true })
  write(join(root, 'hsproject.json'), { name: key === 'production' ? 'prooftell' : 'prooftell-staging', srcDir: 'src', platformVersion: '2026.03' })
  write(join(root, 'src/app/app-hsmeta.json'), app(env))
  for (const a of ACTIONS) write(join(root, `src/app/workflow-actions/${a.check}-hsmeta.json`), action(a, env))
  copyFileSync(join(here, '../zapier/assets/logo-512.png'), join(root, 'src/app/app-logo.png'))
}
console.log('projects/production and projects/staging written')
