'use strict';

const { version } = require('./package.json');

// Before every request: the key as a bearer, and who we are. The key goes into this header and nowhere else;
// no input (a phone number, an email address, an IP address) is ever logged.
const addAuth = (request, z, bundle) => {
  request.headers = request.headers || {};
  if (bundle.authData && bundle.authData.api_key) {
    request.headers.Authorization = `Bearer ${bundle.authData.api_key}`;
  }
  request.headers['User-Agent'] = `prooftell-zapier/${version}`;
  return request;
};

// After every response: the api answers an error as {error: {code, message}}; the message is shown as it is
// (a 402 insufficient_balance names the amounts). A 429 rate_limited is left to Zapier to retry after the
// api's retry_after (seconds), 30 s when the body does not say.
const DEFAULT_RETRY_SECONDS = 30;

const raiseApiErrors = (response, z, bundle) => {
  if (response.status < 400) return response;
  const error = (response.data && response.data.error) || {};
  const code = error.code || 'http_error';
  const message = error.message || `ProofTell answered ${response.status} without a message.`;
  if (response.status === 429) {
    const retryAfter = Number(error.retry_after);
    const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : DEFAULT_RETRY_SECONDS;
    throw new z.errors.ThrottledError(message, delay);
  }
  throw new z.errors.Error(message, code, response.status);
};

module.exports = { befores: [addAuth], afters: [raiseApiErrors] };
