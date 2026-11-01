'use strict';

const { url, body } = require('../lib/api');

const perform = async (z, bundle) => {
  const input = body(bundle.inputData, ['phone', 'email', 'ip', 'country', 'reference']);
  if (!input.phone && !input.email && !input.ip) {
    throw new z.errors.Error(
      'Give at least one of a phone number, an email address and an IP address.',
      'bad_request',
      400,
    );
  }
  const response = await z.request({
    method: 'POST',
    url: url('/v1/assess'),
    body: input,
  });
  return response.data;
};

// The spec's example: the sandbox's answer for +447700900123, jane@example.com and 203.0.113.1, a geo mismatch.
const sample = {
  id: 'asm_4ceu7cr3cm7nah6r',
  mode: 'test',
  score: 15,
  verdict: 'allow',
  reasons: [
    {
      code: 'geo_mismatch',
      points: 15,
      message: "The phone number's country (GB) differs from the IP address's (US).",
    },
  ],
  signals: {
    phone: {
      status: 'ok',
      cost: '0.000000',
      result: {
        status: 'success',
        phone: '+447700900123',
        valid: true,
        line_type: 'mobile',
        region: 'Sandbox',
        country: 'United Kingdom',
        country_code: 'GB',
        country_prefix: '44',
        international_format: '+44 7700 900123',
        national_format: '07700 900123',
        e164: '+447700900123',
        original_carrier: 'Sandbox Wireless',
        timezone: ['Europe/London'],
        geographical: false,
      },
    },
    email: {
      status: 'ok',
      cost: '0.000000',
      result: {
        status: 'success',
        email: 'jane@example.com',
        result: 'deliverable',
        deliverable: true,
        did_you_mean: '',
        user: 'jane',
        domain: 'example.com',
        code: 200,
        verdict: 'deliverable',
        reason: 'mailbox_exists',
        suggested_action: 'accept',
        flags: {
          disposable: false,
          role_account: false,
          free_provider: false,
          catch_all: false,
        },
        provider: '',
        latency_ms: 12,
      },
    },
    ip: {
      status: 'ok',
      cost: '0.000000',
      result: {
        ip: '203.0.113.1',
        status: 'success',
        version: 4,
        routable: true,
        country_code: 'US',
        country: 'United States',
        region: 'New York',
        city: 'Sandbox City',
        latitude: 40.7128,
        longitude: -74.006,
        accuracy_km: 20,
        timezone: 'America/New_York',
        asn: 64500,
        as_org: 'SANDBOX-NET',
        is_tor: false,
        is_vpn: false,
        is_datacenter: false,
        is_anonymous: false,
        anycast: false,
        data_version: 'sandbox',
      },
    },
  },
  ruleset: '2026-10-07',
  cost: '0.000000',
  currency: 'USD',
  createdAt: '2026-10-27T15:59:50.195198859Z',
};

module.exports = {
  key: 'risk_assessment',
  noun: 'Assessment',
  display: {
    // Title case: Zapier's check D018 (see creates/phone.js).
    label: 'Assess the Risk of an Identity',
    description:
      'Scores a phone number, an email address and an IP address together, any one of the three at least: ' +
      'a 0 to 100 score, a verdict (allow, review, deny) and the reasons, with each signal\'s own result. ' +
      'Charged per signal from your balance; the sandbox is free.',
  },
  operation: {
    inputFields: [
      {
        key: 'phone',
        label: 'Phone number',
        type: 'string',
        required: false,
        helpText:
          'In international format with the country code (+447700900123); a number in national format needs ' +
          'Country. Give at least one of Phone number, Email address and IP address.',
      },
      {
        key: 'email',
        label: 'Email address',
        type: 'string',
        required: false,
        helpText: 'The address to verify (jane@example.com). Text that is not an address is scored, not refused.',
      },
      {
        key: 'ip',
        label: 'IP address',
        type: 'string',
        required: false,
        helpText: "The end user's IPv4 or IPv6 address (203.0.113.1).",
      },
      {
        key: 'country',
        label: 'Country',
        type: 'string',
        required: false,
        helpText: 'The two-letter country code (GB, US, MA) of a phone number in national format.',
      },
      {
        key: 'reference',
        label: 'Reference',
        type: 'string',
        required: false,
        helpText: 'Your own id for this check (an order, a sign-up), up to 128 characters, echoed back.',
      },
    ],
    perform,
    sample,
    outputFields: [
      { key: 'id', label: 'Assessment id', type: 'string' },
      { key: 'score', label: 'Score', type: 'integer' },
      { key: 'verdict', label: 'Verdict', type: 'string' },
      { key: 'reasons[]code', label: 'Reason code', type: 'string' },
      { key: 'reasons[]points', label: 'Reason points', type: 'integer' },
      { key: 'reasons[]message', label: 'Reason', type: 'string' },
      { key: 'signals__phone__status', label: 'Phone signal', type: 'string' },
      { key: 'signals__phone__result__valid', label: 'Phone valid', type: 'boolean' },
      { key: 'signals__phone__result__line_type', label: 'Phone line type', type: 'string' },
      { key: 'signals__phone__result__e164', label: 'Phone E.164', type: 'string' },
      { key: 'signals__phone__result__country_code', label: 'Phone country code', type: 'string' },
      { key: 'signals__email__status', label: 'Email signal', type: 'string' },
      { key: 'signals__email__result__result', label: 'Email result', type: 'string' },
      { key: 'signals__email__result__deliverable', label: 'Email deliverable', type: 'boolean' },
      { key: 'signals__email__result__reason', label: 'Email reason', type: 'string' },
      { key: 'signals__ip__status', label: 'IP signal', type: 'string' },
      { key: 'signals__ip__result__is_tor', label: 'IP Tor', type: 'boolean' },
      { key: 'signals__ip__result__is_vpn', label: 'IP VPN', type: 'boolean' },
      { key: 'signals__ip__result__is_datacenter', label: 'IP datacenter', type: 'boolean' },
      { key: 'signals__ip__result__is_anonymous', label: 'IP anonymous (Tor or VPN)', type: 'boolean' },
      { key: 'signals__ip__result__country_code', label: 'IP country code', type: 'string' },
      { key: 'mode', label: 'Mode (live or test)', type: 'string' },
      { key: 'reference', label: 'Reference', type: 'string' },
      { key: 'ruleset', label: 'Rule set', type: 'string' },
      { key: 'cost', label: 'Cost (USD)', type: 'string' },
      { key: 'createdAt', label: 'Created at', type: 'datetime' },
    ],
  },
};
