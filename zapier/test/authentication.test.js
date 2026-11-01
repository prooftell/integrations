/* globals describe, it, expect */
'use strict';

const zapier = require('zapier-platform-core');

const App = require('../index');
const { authData, live } = require('./env');
const { appError } = require('./errors');

const appTester = zapier.createAppTester(App);

describe('authentication', () => {
  it('proves the key on the balance', async () => {
    const response = await appTester(App.authentication.test, { authData });
    expect(response.status).toBe(200);
    expect(response.data.currency).toBe('USD');
    expect(response.data).toHaveProperty('balance');
  });

  // Sandbox only, like the creates' suite (test/creates.test.js): the live key runs test/triggers.test.js alone.
  (live ? it.skip : it)('labels the connection from the key prefix', async () => {
    const label = await appTester(App.authentication.connectionLabel, { authData });
    expect(label).toBe('Sandbox');
  });

  it('refuses an unknown key with the api message', async () => {
    expect.assertions(3);
    try {
      await appTester(App.authentication.test, { authData: { api_key: 'pt_test_not_a_key' } });
    } catch (error) {
      const { message, status, code } = appError(error);
      expect(message).toMatch(/key/i);
      expect(status).toBe(401);
      expect(code).toBe('invalid_api_key');
    }
  });
});
