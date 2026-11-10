#!/usr/bin/env node
// Shapes openapi-to-postmanv2's output into the published collection; run by build.sh.
//   node postprocess.js <raw collection> <openapi.json> <output>
// What it does: names and describes the collection; bearer auth at the collection from {{api_key}}; the variables
// base_url, api_key and file_id; every request on {{base_url}}; request bodies and parameters from the spec's examples
// (the sandbox's documented inputs); the spec's response examples as saved examples; the requests in three folders in
// the spec's order; one test on every request (a 2xx, or the error's code and message); no generated ids, so that an
// unchanged spec yields an unchanged file.
'use strict';
const fs = require('fs');

const [, , rawPath, specPath, outPath] = process.argv;
if (!outPath) {
  console.error('usage: node postprocess.js <raw collection> <openapi.json> <output>');
  process.exit(2);
}
const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));

const BASE_URL = 'https://api.prooftell.com';
const DOCS = 'https://prooftell.com/docs';
const KEY_HELP = 'Create a key in the ProofTell dashboard (Developers → Integrations), named after this platform (Postman). A `pt_test_` key is the free sandbox: simulated, deterministic answers. A `pt_live_` key spends the account\'s balance.';

// --- the spec ---------------------------------------------------------------------------------------------------

function deref(s) {
  while (s && s.$ref) s = s.$ref.replace(/^#\//, '').split('/').reduce((o, k) => o[k], spec);
  return s;
}

// An example value for a schema: its own example, else one built from its properties' examples; a required
// property without an example gets its type's empty value, so that the body is at least well-formed.
function exampleOf(schema) {
  schema = deref(schema);
  if (!schema) return undefined;
  if (schema.allOf) {
    const o = {};
    for (const part of schema.allOf) Object.assign(o, exampleOf(part) || {});
    return Object.keys(o).length ? o : undefined;
  }
  if (schema.example !== undefined) return schema.example;
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  if (type === 'object' || schema.properties) {
    const o = {};
    for (const [k, v] of Object.entries(schema.properties || {})) {
      let e = exampleOf(v);
      if (e === undefined && (schema.required || []).includes(k)) e = emptyOf(deref(v));
      if (e !== undefined) o[k] = e;
    }
    return Object.keys(o).length ? o : undefined;
  }
  if (type === 'array') {
    const e = exampleOf(schema.items);
    return e === undefined ? undefined : [e];
  }
  if (schema.default !== undefined) return schema.default;
  if (schema.enum) return schema.enum[0];
  return undefined;
}

function emptyOf(schema) {
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  if (type === 'integer' || type === 'number') return 0;
  if (type === 'boolean') return false;
  if (type === 'array') return [];
  if (type === 'object') return exampleOf(schema) || {};
  return '';
}

// Where the spec's property examples do not add up to the request its saved example answers, the body is spelled out.
const bodies = {
  'POST /v1/files/{fileId}/verify': { signals: ['phone_line_type'], columns: { phone: 2, email: 1, ip: -1, header_row: true }, country: 'MA' },
};

// The versioning sentence of the spec's preamble: a request's description may refer to "the notice above".
const versioning = (spec.info.description.replace(/\s+/g, ' ').match(/Version 1:.*?\(60 days, §6\)\./) || [''])[0];

const operations = [];
for (const [path, item] of Object.entries(spec.paths)) {
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    if (item[method]) operations.push({ key: `${method.toUpperCase()} ${path}`, path, method, op: item[method], params: [...(item.parameters || []), ...(item[method].parameters || [])].map(deref) });
  }
}

// --- the collection ---------------------------------------------------------------------------------------------

const flat = raw.item.flatMap((it) => (it.item ? it.item : [it]));
const byKey = new Map();
for (const it of flat) {
  const path = '/' + it.request.url.path.map((p) => (p.startsWith(':') ? `{${p.slice(1)}}` : p)).join('/');
  byKey.set(`${it.request.method} ${path}`, it);
}

const statusText = { 200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request', 401: 'Unauthorized', 402: 'Payment Required', 403: 'Forbidden', 404: 'Not Found', 409: 'Conflict', 413: 'Payload Too Large', 429: 'Too Many Requests', 500: 'Internal Server Error', 501: 'Not Implemented', 503: 'Service Unavailable' };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const text = (d) => (d && typeof d === 'object' ? d.content : d) || '';
// The converter's leftovers in a description: "(Required) " and "(This can only be one of …)".
const clean = (d) => text(d).replace(/^\(Required\)\s*/, '').replace(/\s*\(This can only be one of [^)]*\)/g, '').trim();

function shape({ key, path, method, op, params }) {
  const it = byKey.get(key);
  if (!it) throw new Error(`the converter made no request for ${key}`);
  delete it.id;
  const req = it.request;
  if (typeof req.description === 'object') req.description = req.description.content;

  // The URL: every request on {{base_url}}; path variables and query parameters from the spec's examples.
  req.url.host = ['{{base_url}}'];
  for (const v of req.url.variable || []) {
    const p = params.find((q) => q.in === 'path' && q.name === v.key);
    if (v.key === 'fileId') {
      // Start a file job stores the new file's id in {{file_id}}; the other Files requests run on it.
      v.value = '{{file_id}}';
      v.description = 'The file\'s id (fil_…): {{file_id}}, set by Start a file job, or one from Your organization\'s 100 newest files.';
    } else {
      const e = p && (p.example !== undefined ? p.example : exampleOf(p.schema));
      if (e !== undefined) v.value = String(e);
      v.description = clean(v.description) || (p && p.description) || '';
    }
    if (typeof v.type === 'string') delete v.type;
  }
  for (const q of req.url.query || []) {
    const p = params.find((r) => r.in === 'query' && r.name === q.key);
    const e = p && (p.example !== undefined ? p.example : p.schema && (p.schema.example !== undefined ? p.schema.example : p.schema.default));
    if (e !== undefined) q.value = encodeURIComponent(String(e)); // a query value travels encoded: a + would read as a space
    else { q.value = ''; q.disabled = true; } // no example in the spec: off, never the converter's faked value
    if (q.key === 'key') { q.value = ''; q.disabled = true; } // the key travels as the bearer
    q.description = clean(q.description) || (p && p.description) || '';
  }
  req.url.raw = `{{base_url}}${path.replace(/\{(\w+)\}/g, ':$1')}${queryString(req.url.query)}`;

  // The body: JSON from the spec's examples.
  const body = op.requestBody && op.requestBody.content;
  if (body && body['application/json'] && req.body && req.body.mode === 'raw') {
    const value = bodies[key] !== undefined ? bodies[key] : exampleOf(body['application/json'].schema);
    req.body.raw = JSON.stringify(value === undefined ? {} : value, null, 2);
    req.body.options = { raw: { language: 'json' } };
  }

  // The security: the pricing call is public; every other request inherits the collection's bearer.
  if (op.security && op.security.length === 0) req.auth = { type: 'noauth' };
  else delete req.auth;

  // Start a file job keeps the new file's id for the other Files requests.
  if (key === 'POST /v1/files') {
    it.event = [{ listen: 'test', script: { type: 'text/javascript', exec: [
      'if (pm.response.code === 201) { pm.collectionVariables.set("file_id", pm.response.json().file.id); }',
    ] } }];
  }

  // The saved examples: the spec's named examples, one saved response each; nothing invented.
  it.response = [];
  for (const [code, r0] of Object.entries(op.responses || {})) {
    const r = deref(r0);
    const media = r.content && r.content['application/json'];
    if (!media || !media.examples) continue;
    for (const [name, ex] of Object.entries(media.examples)) {
      it.response.push({
        name: `${cap(name)} (${code})`,
        originalRequest: JSON.parse(JSON.stringify(req)),
        status: statusText[code] || '',
        code: Number(code),
        _postman_previewlanguage: 'json',
        header: [{ key: 'Content-Type', value: 'application/json' }],
        cookie: [],
        body: JSON.stringify(ex.value, null, 2),
      });
    }
  }
  return it;
}

function queryString(query) {
  const live = (query || []).filter((q) => !q.disabled);
  return live.length ? '?' + live.map((q) => `${q.key}=${q.value}`).join('&') : '';
}

const shaped = new Map(operations.map((o) => [o.key, shape(o)]));
const take = (...keys) => keys.map((k) => { const it = shaped.get(k); if (!it) throw new Error(`no request for ${k}`); shaped.delete(k); return it; });
const fileKeys = operations.map((o) => o.key).filter((k) => k.includes('/v1/files'));

const folders = [
  { name: 'Pricing and balance', description: 'The public rate card, and the balance of the account the key belongs to: 200 proves the key.', item: take('GET /v1/pricing', 'GET /v1/balance') },
  { name: 'Checks', description: 'The four checks, charged per check from the balance; with a pt_test_ key each is a free, simulated and deterministic answer.', item: take('POST /v1/phone', 'POST /v1/email', 'POST /v1/ip', 'POST /v1/assess') },
  { name: 'Files', description: 'A file of numbers, addresses or IPs checked as a job: create, upload (a PUT to the answer\'s upload_url with its headers, outside this collection), finish, run, follow, download, stop, delete. Start a file job stores the new file\'s id in {{file_id}} for the other requests. Live keys only: the sandbox answers 501.', item: take(...fileKeys) },
];
if (shaped.size) throw new Error(`requests without a folder: ${[...shaped.keys()].join(', ')}`);

const collection = {
  info: {
    name: 'ProofTell API',
    description: [
      'ProofTell checks a phone number, an email address and an IP address: one at a time, or together as a 0 to 100 risk score with a verdict and its reasons. Phone lookups come in five levels (basic, line type, current carrier, line status, fraud score); emails are verified down to the mailbox; IPs are read for Tor, VPN and datacenter use and their geography.',
      versioning,
      `Every request but the rate card sends \`Authorization: Bearer {{api_key}}\`: set the collection variable \`api_key\`. ${KEY_HELP} The sandbox's documented inputs: \`+447700900123\` (a GB mobile), \`jane@example.com\` (deliverable), \`203.0.113.1\` (a clean US address), \`203.0.113.66\` (Tor); the sandbox answers 501 on the files endpoints.`,
      '`base_url` is `https://api.prooftell.com`. Money is a decimal string in USD, never a float. An error answers `{"error": {"code", "message"}}` under its HTTP status (401 `invalid_api_key`, 402 `insufficient_balance` with the amounts, 429 `rate_limited` with `retry_after`), and the test on every request fails with that code and message. The reference: ' + DOCS,
    ].filter(Boolean).join('\n\n'),
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  item: folders,
  auth: { type: 'bearer', bearer: [{ key: 'token', value: '{{api_key}}', type: 'string' }] },
  event: [{
    listen: 'test',
    script: { type: 'text/javascript', exec: [
      'pm.test("answered 2xx", function () {',
      '  if (pm.response.code >= 200 && pm.response.code < 300) { return; }',
      '  let e; try { e = pm.response.json().error; } catch (_) { }',
      '  pm.expect.fail(e ? e.code + ": " + e.message : pm.response.code + " " + pm.response.status);',
      '});',
    ] },
  }],
  variable: [
    { key: 'base_url', value: BASE_URL, type: 'string', description: 'The API; sandbox keys work here too.' },
    { key: 'api_key', value: '', type: 'string', description: `Your ProofTell API key. ${KEY_HELP}` },
    { key: 'file_id', value: '', type: 'string', description: 'Set by Start a file job: the new file\'s id, which the other Files requests use.' },
  ],
};

const json = JSON.stringify(collection, null, 2).replace(/\]\(#schema-/g, `](${DOCS}#schema-`) + '\n';
fs.writeFileSync(outPath, json);
const n = folders.reduce((a, f) => a + f.item.length, 0);
const ex = folders.reduce((a, f) => a + f.item.reduce((b, i) => b + i.response.length, 0), 0);
console.log(`wrote ${outPath}: ${folders.length} folders, ${n} requests, ${ex} saved examples`);
