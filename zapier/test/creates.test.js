/* globals describe, it, expect */
'use strict';

const zapier = require('zapier-platform-core');

const App = require('../index');
const { authData, live } = require('./env');
const { appError } = require('./errors');

const appTester = zapier.createAppTester(App);

// The sandbox's documented inputs (api/openapi.yaml): deterministic, free. This suite runs with a sandbox key
// only: with a live key the same inputs are real, charged checks, answered differently (test/triggers.test.js
// is the live key's file).
const describeSandbox = live ? describe.skip : describe;
const run = (create, inputData) => appTester(App.creates[create].operation.perform, { authData, inputData });

const expectError = async (promise, status, codes) => {
  expect.assertions(2);
  try {
    await promise;
  } catch (error) {
    const parsed = appError(error);
    expect(parsed.status).toBe(status);
    expect(codes).toContain(parsed.code);
  }
};

describeSandbox('Look up a phone number', () => {
  it('answers the sandbox GB mobile at line type, the default level', async () => {
    const result = await run('phone_lookup', { phone: '+447700900123' });
    expect(result.status).toBe('success');
    expect(result.valid).toBe(true);
    expect(result.line_type).toBe('mobile');
    expect(result.e164).toBe('+447700900123');
    expect(result.country_code).toBe('GB');
    expect(result.level).toBe('line_type');
    expect(result.signals.line_type.status).toBe('ok');
    expect(result.cost).toBe('0.000000');
  });

  it('reads a national number with its country, and sends nothing for an empty level', async () => {
    const result = await run('phone_lookup', { phone: '07700 900123', country: 'GB', level: '' });
    expect(result.valid).toBe(true);
    expect(result.e164).toBe('+447700900123');
    expect(result.level).toBe('line_type');
  });

  it('runs the level asked', async () => {
    const result = await run('phone_lookup', { phone: '+447700900123', level: 'line_status' });
    expect(result.level).toBe('line_status');
    expect(result.valid).toBe(true);
    expect(['ok', 'unavailable']).toContain(result.signals.line_status.status);
    if (result.signals.line_status.status === 'ok') {
      expect(result.line_status.present).toBe('yes');
      expect(result.current_carrier.carrier).toBeTruthy();
    }
  });

  it('answers a number that is not valid', async () => {
    const result = await run('phone_lookup', { phone: '+15005550003' });
    expect(result.status).toBe('success');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('unrecognized_range');
  });

  it('shows the api error as it is', async () => {
    await expectError(run('phone_lookup', { phone: '+447700900123', level: 'deepest' }), 400, ['invalid_level']);
  });

  it('shows a 503 as it is', async () => {
    await expectError(run('phone_lookup', { phone: '+15005550004' }), 503, ['signals_unavailable', 'unavailable']);
  });
});

describeSandbox('Verify an email address', () => {
  it('answers the sandbox deliverable address', async () => {
    const result = await run('email_verification', { email: 'jane@example.com' });
    expect(result.status).toBe('success');
    expect(result.result).toBe('deliverable');
    expect(result.deliverable).toBe(true);
    expect(result.verdict).toBe('deliverable');
    expect(result.reason).toBe('mailbox_exists');
    expect(result.flags.disposable).toBe(false);
    expect(result.cost).toBe('0.000000');
  });

  it('answers a disposable address, with a timeout given', async () => {
    const result = await run('email_verification', { email: 'disposable@sandbox.prooftell.com', timeout: 5000 });
    expect(result.verdict).toBe('risky');
    expect(result.reason).toBe('disposable_domain');
    expect(result.flags.disposable).toBe(true);
  });

  it('shows the api error as it is', async () => {
    await expectError(run('email_verification', { email: 'jane@example.com', timeout: 1 }), 400, ['invalid_timeout']);
  });
});

describeSandbox('Look up an IP address', () => {
  it('answers the sandbox clean US address', async () => {
    const result = await run('ip_lookup', { ip: '203.0.113.1' });
    expect(result.status).toBe('success');
    expect(result.routable).toBe(true);
    expect(result.is_tor).toBe(false);
    expect(result.is_vpn).toBe(false);
    expect(result.is_datacenter).toBe(false);
    expect(result.is_anonymous).toBe(false);
    expect(result.country_code).toBe('US');
    expect(result.cost).toBe('0.000000');
  });

  it('answers the sandbox Tor address', async () => {
    const result = await run('ip_lookup', { ip: '203.0.113.66' });
    expect(result.is_tor).toBe(true);
    expect(result.is_anonymous).toBe(true);
  });

  it('shows the api error as it is', async () => {
    await expectError(run('ip_lookup', { ip: 'not an address' }), 400, ['invalid_ip']);
  });
});

describeSandbox('Assess the risk of an identity', () => {
  it("scores the spec's example: a GB number and a US address, a geo mismatch", async () => {
    const result = await run('risk_assessment', {
      phone: '+447700900123',
      email: 'jane@example.com',
      ip: '203.0.113.1',
    });
    expect(result.id).toMatch(/^asm_/);
    expect(result.score).toBe(15);
    expect(result.verdict).toBe('allow');
    expect(result.reasons.map((r) => r.code)).toEqual(['geo_mismatch']);
    expect(result.signals.phone.result.valid).toBe(true);
    expect(result.signals.email.result.result).toBe('deliverable');
    expect(result.signals.ip.result.is_tor).toBe(false);
    expect(result.mode).toBe('test');
    expect(result.cost).toBe('0.000000');
  });

  it('takes one signal alone, echoes the reference and sends nothing for empty fields', async () => {
    const result = await run('risk_assessment', {
      phone: '',
      email: 'disposable@sandbox.prooftell.com',
      ip: '',
      country: '',
      reference: 'zapier-test-1',
    });
    expect(result.reference).toBe('zapier-test-1');
    expect(result.reasons.map((r) => r.code)).toContain('email_disposable');
    expect(result.score).toBeGreaterThanOrEqual(35);
    expect(result.signals.phone).toBeUndefined();
    expect(result.signals.ip).toBeUndefined();
  });

  it('refuses an empty identity before calling the api', async () => {
    expect.assertions(2);
    try {
      await run('risk_assessment', { phone: '', email: '', ip: '' });
    } catch (error) {
      const { message, status } = appError(error);
      expect(message).toBe('Give at least one of a phone number, an email address and an IP address.');
      expect(status).toBe(400);
    }
  });
});
