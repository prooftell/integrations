'use strict';

// The tests run against staging with the smoke organization's sandbox key, both given through the environment
// (README.md says how) and never written down. The key's value is never printed, logged or asserted on.
const apiKey = process.env.PROOFTELL_API_KEY;
if (!apiKey) {
  throw new Error('PROOFTELL_API_KEY is not set. README.md says how to run the tests.');
}

module.exports = {
  authData: { api_key: apiKey },
  // Files need a live key: the trigger's test runs only then, and the sandbox's 501 is tested only otherwise.
  live: apiKey.startsWith('pt_live_'),
};
