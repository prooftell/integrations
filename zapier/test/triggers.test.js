/* globals describe, it, expect */
'use strict';

const zapier = require('zapier-platform-core');

const App = require('../index');
const { authData, live } = require('./env');
const { appError } = require('./errors');

const appTester = zapier.createAppTester(App);

// Files need a live key: the sandbox answers 501 on /v1/files, so the listing is tested with a live key only
// and the 501 with a sandbox key only.
const itLive = live ? it : it.skip;
const itSandbox = live ? it.skip : it;

describe('File completed', () => {
  itLive('lists the completed files, newest first, each with its id', async () => {
    const results = await appTester(App.triggers.file_completed.operation.perform, { authData });
    expect(Array.isArray(results)).toBe(true);
    for (const file of results) {
      expect(file.status).toBe('complete');
      expect(file.id).toMatch(/^fil_/);
    }
    for (let i = 1; i < results.length; i += 1) {
      expect(results[i - 1].created_at >= results[i].created_at).toBe(true);
    }
  });

  itSandbox('shows the sandbox refusal as it is', async () => {
    expect.assertions(2);
    try {
      await appTester(App.triggers.file_completed.operation.perform, { authData });
    } catch (error) {
      const { status, code } = appError(error);
      expect(status).toBe(501);
      expect(code).toBe('sandbox_not_available');
    }
  });
});
