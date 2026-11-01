'use strict';

const { url } = require('./lib/api');

// A 200 on the balance proves the key. The response is returned whole; the label does not read it, it reads
// the key's prefix: pt_test_ is the sandbox, pt_live_ spends the balance.
const test = (z, bundle) => z.request({ url: url('/v1/balance') });

const connectionLabel = (z, bundle) => {
  const key = (bundle.authData && bundle.authData.api_key) || '';
  return key.startsWith('pt_test_') ? 'Sandbox' : 'Live';
};

module.exports = {
  type: 'custom',
  fields: [
    {
      key: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      helpText:
        'Create a key in the [ProofTell dashboard](https://app.prooftell.com/integrations) ' +
        '(Developers → Integrations), named for Zapier. ' +
        'A `pt_test_` key is the free sandbox: simulated, deterministic answers. ' +
        "A `pt_live_` key spends the account's balance.",
    },
  ],
  test,
  connectionLabel,
};
