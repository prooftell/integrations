'use strict';

const { url, body } = require('../lib/api');

const perform = async (z, bundle) => {
  const response = await z.request({
    method: 'POST',
    url: url('/v1/ip'),
    body: body(bundle.inputData, ['ip']),
  });
  return response.data;
};

// The spec's example: the sandbox's answer for its documented Tor address, 203.0.113.66.
const sample = {
  ip: '203.0.113.66',
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
  is_tor: true,
  is_vpn: false,
  is_datacenter: true,
  is_anonymous: true,
  anycast: false,
  data_version: 'sandbox',
  cost: '0.000000',
  currency: 'USD',
  signals: {
    ip: { status: 'ok', cost: '0.000000' },
  },
};

module.exports = {
  key: 'ip_lookup',
  noun: 'IP address',
  display: {
    // Title case: Zapier's check D018 (see creates/phone.js).
    label: 'Look Up an IP Address',
    description:
      'Looks up an IP address: whether it is a Tor exit, a VPN or a datacenter address, and its country, city ' +
      "and network. The address stays in ProofTell's infrastructure. " +
      'Charged per check from your balance; the sandbox is free.',
  },
  operation: {
    inputFields: [
      {
        key: 'ip',
        label: 'IP address',
        type: 'string',
        required: true,
        helpText: 'IPv4 or IPv6 (203.0.113.1). A private or reserved address is answered as not routable, free.',
      },
    ],
    perform,
    sample,
    outputFields: [
      { key: 'is_tor', label: 'Tor', type: 'boolean' },
      { key: 'is_vpn', label: 'VPN', type: 'boolean' },
      { key: 'is_datacenter', label: 'Datacenter', type: 'boolean' },
      { key: 'is_anonymous', label: 'Anonymous (Tor or VPN)', type: 'boolean' },
      { key: 'routable', label: 'Routable', type: 'boolean' },
      { key: 'country_code', label: 'Country code', type: 'string' },
      { key: 'country', label: 'Country', type: 'string' },
      { key: 'region', label: 'Region', type: 'string' },
      { key: 'city', label: 'City', type: 'string' },
      { key: 'asn', label: 'ASN', type: 'integer' },
      { key: 'as_org', label: 'Network (AS organization)', type: 'string' },
      { key: 'cost', label: 'Cost (USD)', type: 'string' },
    ],
  },
};
