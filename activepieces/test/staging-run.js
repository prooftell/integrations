const realFetch = globalThis.fetch;
globalThis.fetch = (input, init) =>
  realFetch(String(input).replace('https://api.prooftell.com/', 'https://api.prooftell.dev/'), init);

const dist = process.argv[2];
const key = process.env.K;
if (!dist || !key) {
  console.error('usage: K=<key> node staging-run.js <piece dist folder>');
  process.exit(2);
}

const { prooftellAuth } = require(`${dist}/src/lib/auth.js`);
const { lookUpPhoneNumber } = require(`${dist}/src/lib/actions/look-up-a-phone-number.js`);
const { verifyEmailAddress } = require(`${dist}/src/lib/actions/verify-an-email-address.js`);
const { lookUpIpAddress } = require(`${dist}/src/lib/actions/look-up-an-ip-address.js`);
const { assessIdentityRisk } = require(`${dist}/src/lib/actions/assess-the-risk-of-an-identity.js`);
const { prooftell } = require(`${dist}/src/index.js`);

const ctx = (propsValue) => ({ auth: { secret_text: key }, propsValue });
const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, o[k]]));

(async () => {
  console.log('piece:', prooftell.displayName, '| actions:', Object.keys(prooftell.actions()).join(', '));
  console.log('validate(sandbox key):', JSON.stringify(await prooftellAuth.validate({ auth: key })));
  console.log('validate(wrong key):  ', JSON.stringify(await prooftellAuth.validate({ auth: 'pt_test_not_a_key' })));

  const phone = await lookUpPhoneNumber.run(ctx({ phone: '+447700900123', level: 'line_type' }));
  console.log('phone:  ', JSON.stringify(pick(phone, ['status', 'valid', 'line_type', 'e164', 'country_code', 'level', 'cost'])));

  const email = await verifyEmailAddress.run(ctx({ email: 'jane@example.com' }));
  console.log('email:  ', JSON.stringify(pick(email, ['status', 'result', 'deliverable', 'reason', 'cost'])));

  const ip = await lookUpIpAddress.run(ctx({ ip: '203.0.113.66' }));
  console.log('ip:     ', JSON.stringify(pick(ip, ['status', 'is_tor', 'is_vpn', 'is_datacenter', 'country_code', 'cost'])));

  const assess = await assessIdentityRisk.run(
    ctx({ phone: '+447700900123', email: 'jane@example.com', ip: '203.0.113.1', reference: 'activepieces-test' })
  );
  console.log('assess: ', JSON.stringify({ score: assess.score, verdict: assess.verdict, reasons: assess.reasons.map((r) => r.code), mode: assess.mode, cost: assess.cost }));

  try {
    await assessIdentityRisk.run(ctx({ phone: '', email: undefined }));
    console.log('assess(empty): no error (unexpected)');
  } catch (e) {
    console.log('assess(empty) error:', e.message);
  }
  try {
    await lookUpPhoneNumber.run(ctx({ phone: '+15005550004', level: 'line_type' }));
    console.log('phone(503 number): no error (unexpected)');
  } catch (e) {
    console.log('phone(503 number) error:', e.message);
  }
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
