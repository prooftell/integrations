'use strict';

const { url, body } = require('../lib/api');

const perform = async (z, bundle) => {
  const response = await z.request({
    method: 'POST',
    url: url('/v1/email'),
    body: body(bundle.inputData, ['email', 'timeout']),
  });
  return response.data;
};

// The spec's example: the sandbox's answer for jane@example.com.
const sample = {
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
  billed: true,
  suggested_action: 'accept',
  flags: {
    disposable: false,
    role_account: false,
    free_provider: false,
    catch_all: false,
  },
  provider: '',
  latency_ms: 12,
  cost: '0.000000',
  currency: 'USD',
  signals: {
    email: { status: 'ok', cost: '0.000000' },
  },
};

module.exports = {
  key: 'email_verification',
  noun: 'Email address',
  display: {
    // Title case: Zapier's check D018 (see creates/phone.js).
    label: 'Verify an Email Address',
    description:
      'Verifies an email address: whether its mailbox exists and accepts mail, with the reason, the flags ' +
      '(disposable, role account, free provider, catch-all) and a likely correction of a misspelt domain. ' +
      'Charged per check from your balance; the sandbox is free.',
  },
  operation: {
    inputFields: [
      {
        key: 'email',
        label: 'Email address',
        type: 'string',
        required: true,
        helpText: 'The address to verify (jane@example.com).',
      },
      {
        key: 'timeout',
        label: 'Timeout (ms)',
        type: 'integer',
        required: false,
        helpText:
          'How long the mail server may take to answer, in milliseconds: 1000 to 45000. ' +
          'Past it the address comes back as unknown, free.',
      },
    ],
    perform,
    sample,
    outputFields: [
      { key: 'result', label: 'Result', type: 'string' },
      { key: 'deliverable', label: 'Deliverable', type: 'boolean' },
      { key: 'verdict', label: 'Verdict', type: 'string' },
      { key: 'reason', label: 'Reason', type: 'string' },
      { key: 'suggested_action', label: 'Suggested action', type: 'string' },
      { key: 'did_you_mean', label: 'Did you mean', type: 'string' },
      { key: 'flags__disposable', label: 'Disposable', type: 'boolean' },
      { key: 'flags__role_account', label: 'Role account', type: 'boolean' },
      { key: 'flags__free_provider', label: 'Free provider', type: 'boolean' },
      { key: 'flags__catch_all', label: 'Catch-all', type: 'boolean' },
      { key: 'provider', label: 'Mail provider', type: 'string' },
      { key: 'cost', label: 'Cost (USD)', type: 'string' },
    ],
  },
};
