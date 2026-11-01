'use strict';

const { url, body } = require('../lib/api');

// The five levels, named as on the site; each includes the ones before it.
const LEVELS = [
  { value: 'basic', sample: 'basic', label: 'Basic' },
  { value: 'line_type', sample: 'line_type', label: 'Line type' },
  { value: 'current_carrier', sample: 'current_carrier', label: 'Current carrier' },
  { value: 'line_status', sample: 'line_status', label: 'Line status' },
  { value: 'fraud_score', sample: 'fraud_score', label: 'Fraud score' },
];

const perform = async (z, bundle) => {
  const response = await z.request({
    method: 'POST',
    url: url('/v1/phone'),
    body: body(bundle.inputData, ['phone', 'country', 'level']),
  });
  return response.data;
};

// The spec's example: the sandbox's answer for +447700900123 at line status.
const sample = {
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
  level: 'line_status',
  line_status: {
    status: 'success',
    present: 'yes',
    reachable: true,
    covered: true,
    ported: false,
    network: 'Sandbox Wireless',
    line_type: 'mobile',
    country_code: 'GB',
  },
  current_carrier: {
    status: 'success',
    carrier: 'Sandbox Wireless',
    ported: false,
    country_code: 'GB',
    source: 'line_status',
  },
  cost: '0.000000',
  currency: 'USD',
  signals: {
    line_type: { status: 'ok', cost: '0.000000' },
    line_status: { status: 'ok', cost: '0.000000' },
  },
};

module.exports = {
  key: 'phone_lookup',
  noun: 'Phone number',
  display: {
    // Zapier's directory requires title case in labels (its check D018 blocks promoting otherwise); the name
    // itself is the one every ProofTell connector uses, "Look up a phone number".
    label: 'Look Up a Phone Number',
    description:
      'Checks a phone number: whether it is valid, its formats and its country, and, by level, its line type, ' +
      'the carrier it is on today, whether it is on the network right now, or its fraud score. ' +
      'Charged per check from your balance; the sandbox is free.',
  },
  operation: {
    inputFields: [
      {
        key: 'phone',
        label: 'Phone number',
        type: 'string',
        required: true,
        helpText:
          'In international format with the country code (+447700900123). ' +
          'A number in national format (07700 900123) needs Country.',
      },
      {
        key: 'country',
        label: 'Country',
        type: 'string',
        required: false,
        helpText:
          'The two-letter country code (GB, US, MA) of a number in national format. ' +
          'Not needed for a number in international format.',
      },
      {
        key: 'level',
        label: 'Level',
        type: 'string',
        required: false,
        choices: LEVELS,
        default: 'line_type',
        helpText:
          'How far to look; each level includes the ones before it. Basic is free: valid or not, the formats and ' +
          'the country. Line type adds the line type (mobile, fixed line, VoIP, toll-free, premium-rate) and the ' +
          'carrier the number was allocated to. Current carrier adds the carrier the number is on today and whether ' +
          'it was ported. Line status adds whether the subscriber is on the network right now. Fraud score adds a ' +
          "0 to 100 score with its risk level and the range's service type.",
      },
    ],
    perform,
    sample,
    outputFields: [
      { key: 'valid', label: 'Valid', type: 'boolean' },
      { key: 'line_type', label: 'Line type', type: 'string' },
      { key: 'reason', label: 'Reason (when not valid)', type: 'string' },
      { key: 'e164', label: 'E.164', type: 'string' },
      { key: 'international_format', label: 'International format', type: 'string' },
      { key: 'national_format', label: 'National format', type: 'string' },
      { key: 'country_code', label: 'Country code', type: 'string' },
      { key: 'country', label: 'Country', type: 'string' },
      { key: 'original_carrier', label: 'Original carrier', type: 'string' },
      { key: 'level', label: 'Level', type: 'string' },
      { key: 'current_carrier__carrier', label: 'Current carrier', type: 'string' },
      { key: 'current_carrier__ported', label: 'Ported', type: 'boolean' },
      { key: 'line_status__present', label: 'Present on the network', type: 'string' },
      { key: 'line_status__reason', label: 'Line status reason', type: 'string' },
      { key: 'fraud_score__score', label: 'Fraud score', type: 'integer' },
      { key: 'fraud_score__risk_level', label: 'Risk level', type: 'string' },
      { key: 'cost', label: 'Cost (USD)', type: 'string' },
    ],
  },
};
