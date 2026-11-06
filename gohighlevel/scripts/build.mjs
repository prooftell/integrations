// Writes GoHighLevel's four workflow actions (the plan's §7.2) into both app workspaces: `staging/` (the private app
// 6aede33f959132de0efc66b5, calling api.prooftell.dev) and `production/` (the marketplace app 6aedd79314f3ff12d05de224,
// calling api.prooftell.com). One definition, so the two cannot drift; run `node scripts/build.mjs`, then push each
// workspace (README). The addresses use the slug `sub-account`, never GoHighLevel's name: a white-label app's URLs
// may not carry it. The header's value is injected at push from `PROOFTELL_GHL_ACTION_SECRET` (keys/gohighlevel.txt):
// it is how the api knows a request is GoHighLevel's. Names, inputs and outputs follow integrations/CLAUDE.md's surface
// and the api's CrmChecks; the levels' provider is never named (D68), no price is written (D38).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(dirname(fileURLToPath(import.meta.url)))
const API = { staging: 'https://api.prooftell.dev', production: 'https://api.prooftell.com' }
// An action's key is unique across the developer account, so each app has its own: staging took the short ones first.
const KEYS = {
  staging: { phone: 'prooftell_phone', email: 'prooftell_email', ip: 'prooftell_ip', assess: 'prooftell_assess' },
  production: { phone: 'prooftell_phone_lookup', email: 'prooftell_email_verification', ip: 'prooftell_ip_lookup', assess: 'prooftell_risk_assessment' },
}

const text = (field, title, required, helpText, value) => ({
  field, title, required, fieldType: 'string', helpText, allowCustomInputPicker: true, ...(value ? { value } : {}),
})
const out = (name, reference, fieldType = 'string') => ({ name, reference, fieldType })
const COMMON_OUT = [out('Cost (USD)', 'cost'), out('ProofTell error code', 'prooftell_error')]
const CHARGE = 'Charged per check from your ProofTell balance; the sandbox is free.'

const ACTIONS = [
  {
    check: 'phone',
    name: 'Look up a phone number',
    description: 'Valid or not, the line type and country; above it, the current carrier, whether the line is live, or a fraud score.',
    inputs: [
      text('phone', 'Phone number', true, 'In international format (+44 7700 900123), or national with the country.', '{{contact.phone}}'),
      text('country', 'Country', false, 'The two-letter code (GB, US) of a number in national format.'),
      {
        field: 'level', title: 'Level', required: false, fieldType: 'select', helpText: 'How deep the check goes: Line type when left empty.',
        options: [
          { label: 'Basic', value: 'basic' }, { label: 'Line type', value: 'line_type' }, { label: 'Current carrier', value: 'current_carrier' },
          { label: 'Line status', value: 'line_status' }, { label: 'Fraud score', value: 'fraud_score' },
        ],
      },
    ],
    sample: { valid: 'true', e164: '+447700900123', line_type: 'mobile', country_code: 'GB', original_carrier: 'EE', reason: '',
      current_carrier: 'EE', ported: 'false', reachable: 'true', fraud_score: 12, risk_level: 'low', cost: '0.002500', prooftell_error: '' },
    outputs: [out('Valid', 'valid'), out('Number in E.164', 'e164'), out('Line type', 'line_type'), out('Country code', 'country_code'),
      out('Original carrier', 'original_carrier'), out('Why not valid', 'reason'), out('Current carrier', 'current_carrier'),
      out('Ported', 'ported'), out('Reachable', 'reachable'), out('Fraud score', 'fraud_score', 'numerical'), out('Risk level', 'risk_level')],
  },
  {
    check: 'email',
    name: 'Verify an email address',
    description: 'Deliverable or not, disposable, catch-all, a misspelt domain.',
    inputs: [text('email', 'Email address', true, 'The address to verify.', '{{contact.email}}')],
    sample: { result: 'deliverable', deliverable: 'true', verdict: 'deliverable', reason: 'mailbox_exists', did_you_mean: '', cost: '0.004000', prooftell_error: '' },
    outputs: [out('Result', 'result'), out('Deliverable', 'deliverable'), out('Verdict', 'verdict'), out('Reason', 'reason'), out('Did you mean', 'did_you_mean')],
  },
  {
    check: 'ip',
    name: 'Look up an IP address',
    description: 'Its country and city, its network, and whether it is Tor, a VPN or a data centre.',
    inputs: [text('ip', 'IP address', true, 'An IPv4 or IPv6 address.')],
    sample: { country_code: 'GB', city: 'London', asn: 15169, as_org: 'GOOGLE', is_tor: 'false', is_vpn: 'false', is_datacenter: 'true',
      is_anonymous: 'false', cost: '0.000000', prooftell_error: '' },
    outputs: [out('Country code', 'country_code'), out('City', 'city'), out('Network number (ASN)', 'asn', 'numerical'), out('Network', 'as_org'),
      out('Tor', 'is_tor'), out('VPN', 'is_vpn'), out('Data centre', 'is_datacenter'), out('Anonymous', 'is_anonymous')],
  },
  {
    check: 'assess',
    name: 'Assess the risk of an identity',
    description: 'A phone number, an email address and an IP address scored together: 0 to 100, a verdict (allow, review, deny) and its reasons.',
    inputs: [
      text('phone', 'Phone number', false, 'Give at least one of the phone number, the email address and the IP address.', '{{contact.phone}}'),
      text('email', 'Email address', false, '', '{{contact.email}}'),
      text('ip', 'IP address', false, ''),
      text('country', 'Country', false, 'The two-letter code of a phone number in national format.'),
      text('reference', 'Reference', false, 'Your own id for this assessment, shown in the ProofTell dashboard.'),
    ],
    sample: { score: 35, verdict: 'review', reasons: 'email_disposable', assessment_id: 'asm_k3m9q2x7a8b4c5d6', cost: '0.006500', prooftell_error: '' },
    outputs: [out('Score', 'score', 'numerical'), out('Verdict', 'verdict'), out('Reasons', 'reasons'), out('Assessment id', 'assessment_id')],
  },
]

for (const env of ['staging', 'production']) {
  const dir = join(here, env, 'src/modules/workflows/actions')
  mkdirSync(dir, { recursive: true })
  for (const a of ACTIONS) {
    const key = KEYS[env][a.check]
    const file = join(dir, key.replaceAll('_', '-') + '.json')
    let existing = null
    try { existing = JSON.parse(readFileSync(file, 'utf8')) } catch { /* new */ }
    const doc = {
      $schema: '../../../../.ghl/schemas/ghl-workflow-action.schema.json',
      schemaVersion: 1,
      key,
      ...(existing?.templateId ? { templateId: existing.templateId } : {}),
      versions: [{
        version: existing?.versions?.[0]?.version ?? '1.0',
        status: 'draft',
        info: { name: a.name, description: a.description, summary: `${a.description} ${CHARGE}`, groupName: 'ProofTell', keywords: ['ProofTell', 'verify', 'validation'] },
        inputs: a.inputs,
        customVars: [...a.outputs, ...COMMON_OUT],
        customVarsJson: a.sample,
        payloadCustomizationType: 'default',
        customizedPayload: {},
        branchesConfig: {},
        executionConfig: {
          type: 'API',
          url: `${API[env]}/integrations/sub-account/actions/${a.check}`,
          method: 'POST',
          headers: { 'X-ProofTell-Action-Secret': '${env:PROOFTELL_GHL_ACTION_SECRET}' },
        },
      }],
    }
    writeFileSync(file, JSON.stringify(doc, null, 2) + '\n')
  }
}
console.log('the four actions written into staging/ and production/')
