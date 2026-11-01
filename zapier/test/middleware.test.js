/* globals describe, it, expect */
'use strict';

// The middlewares on fake requests and responses, no network: what the sandbox cannot provoke (a 429, a body
// that is not JSON) is checked here. z.errors are core's own classes (not exported from its index).
const errors = require('zapier-platform-core/src/errors');
const { befores, afters } = require('../middleware');
const { version } = require('../package.json');
const { appError } = require('./errors');

const z = { errors };
const [addAuth] = befores;
const [raiseApiErrors] = afters;

const errorResponse = (status, error) => ({ status, data: error ? { error } : undefined });

const thrown = (fn) => {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error('nothing was thrown');
};

describe('before each request', () => {
  it('adds the bearer header and the User-Agent', () => {
    const request = addAuth({ headers: {} }, z, { authData: { api_key: 'pt_test_example' } });
    expect(request.headers.Authorization).toBe('Bearer pt_test_example');
    expect(request.headers['User-Agent']).toBe(`prooftell-zapier/${version}`);
  });

  it('sends no bearer without a key', () => {
    const request = addAuth({}, z, { authData: {} });
    expect(request.headers.Authorization).toBeUndefined();
    expect(request.headers['User-Agent']).toBe(`prooftell-zapier/${version}`);
  });
});

describe('after each response', () => {
  it('passes a success through', () => {
    const response = { status: 200, data: { balance: '1.0000' } };
    expect(raiseApiErrors(response, z, {})).toBe(response);
  });

  it('shows the api error as it is, with its code and status', () => {
    const error = thrown(() =>
      raiseApiErrors(
        errorResponse(402, {
          code: 'insufficient_balance',
          message: 'The call needs $0.002500 and $0.000000 is available: top up $0.002500.',
        }),
        z,
        {},
      ),
    );
    expect(error.name).toBe('AppError');
    expect(appError(error)).toEqual({
      message: 'The call needs $0.002500 and $0.000000 is available: top up $0.002500.',
      code: 'insufficient_balance',
      status: 402,
    });
  });

  it('lets Zapier retry a 429 after the api retry_after', () => {
    const error = thrown(() =>
      raiseApiErrors(errorResponse(429, { code: 'rate_limited', message: 'Too many requests.', retry_after: 7 }), z, {}),
    );
    expect(error.name).toBe('ThrottledError');
    expect(appError(error)).toEqual({ message: 'Too many requests.', delay: 7 });
  });

  it('retries a 429 after 30 s when the body does not say', () => {
    const error = thrown(() => raiseApiErrors(errorResponse(429, { code: 'rate_limited', message: 'Too many requests.' }), z, {}));
    expect(error.name).toBe('ThrottledError');
    expect(appError(error).delay).toBe(30);
  });

  it('names the status when the body is not the api envelope', () => {
    const error = thrown(() => raiseApiErrors(errorResponse(502), z, {}));
    expect(error.name).toBe('AppError');
    expect(appError(error)).toEqual({ message: 'ProofTell answered 502 without a message.', code: 'http_error', status: 502 });
  });
});
