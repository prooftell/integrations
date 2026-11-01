#!/usr/bin/env node
// Checks the Make app's files before they go into Make: every JSON file parses, makecomapp.json names files that
// exist, every IML reference ({{parameters.x}}, {{connection.x}}) names a declared parameter, each module's
// interface is well formed and its sample fits it, the base sanitizes the key, and the words follow the plan
// (plans/2026-10-31-integrations.md §1). Run from anywhere: `node integrations/make/validate.js`. Exit 1 on an error.
'use strict';
const fs = require('fs');
const path = require('path');

const root = __dirname;
const src = path.join(root, 'src');
const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const ACTION_NAMES = new Set([
  'Look up a phone number',
  'Verify an email address',
  'Look up an IP address',
  'Assess the risk of an identity',
]);
const PARAM_TYPES = new Set(['text', 'password', 'number', 'integer', 'uinteger', 'boolean', 'select', 'email',
  'url', 'date', 'array', 'collection', 'json', 'hidden', 'any', 'filename', 'buffer', 'file', 'folder', 'color',
  'time', 'timestamp', 'timezone', 'port', 'path', 'cert', 'pkey', 'uuid', 'filter']);
const INTERFACE_TYPES = new Set(['text', 'number', 'integer', 'uinteger', 'boolean', 'date', 'array',
  'collection', 'email', 'url', 'any', 'time', 'timestamp', 'buffer', 'json', 'filename', 'color', 'uuid']);

// ---- files -------------------------------------------------------------------------------------------------

function readJson(file) {
  const text = fs.readFileSync(file, 'utf8');
  try {
    return JSON.parse(text);
  } catch (e) {
    err(`${rel(file)}: does not parse as JSON (${e.message})`);
    return undefined;
  }
}
const rel = (f) => path.relative(root, f);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const allFiles = walk(src);
const jsonFiles = allFiles.filter((f) => /\.(json|jsonc)$/.test(f));
const parsed = new Map();
for (const f of jsonFiles) parsed.set(f, readJson(f));
const get = (relPath) => parsed.get(path.join(src, relPath));

// ---- makecomapp.json ---------------------------------------------------------------------------------------

const manifest = get('makecomapp.json');
if (!manifest) {
  report();
}
if (manifest.fileVersion !== 1) err('makecomapp.json: fileVersion must be 1');
for (const [code, file] of Object.entries(manifest.generalCodeFiles || {})) {
  if (file === null) continue;
  if (!fs.existsSync(path.join(src, file))) err(`makecomapp.json: generalCodeFiles.${code} names a missing file ${file}`);
}
const components = manifest.components && typeof manifest.components === 'object' ? manifest.components : {};
if (components !== manifest.components) err('makecomapp.json: components is missing');
for (const type of ['connection', 'webhook', 'module', 'rpc', 'function', 'endpoint']) {
  if (!components[type] || typeof components[type] !== 'object') err(`makecomapp.json: components.${type} is missing`);
}
const connections = components.connection || {};
const modules = components.module || {};
// A code file set to null is ignored by the extension (no such code in Make, or not kept locally).
const code = (codeFiles, name) => (codeFiles && codeFiles[name] ? get(codeFiles[name]) : null);
for (const [id, c] of Object.entries(connections)) {
  if (!['basic', 'oauth'].includes(c.connectionType)) err(`connection ${id}: connectionType must be basic or oauth`);
  if (!c.label) err(`connection ${id}: no label`);
  checkCodeFiles(`connection ${id}`, c.codeFiles);
}
for (const [id, m] of Object.entries(modules)) {
  if (!/^[a-zA-Z][0-9a-zA-Z]+[0-9a-zA-Z]$/.test(id) || id.length > 48) err(`module ${id}: the id must match Make's rule ^[a-zA-Z][0-9a-zA-Z]+[0-9a-zA-Z]$, 3 to 48 characters`);
  if (!ACTION_NAMES.has(m.label)) err(`module ${id}: label "${m.label}" is not one of the four action names of plan §1`);
  if (!m.description || !m.description.includes('the sandbox is free')) err(`module ${id}: the description must say what it costs ("… the sandbox is free")`);
  if (m.moduleType !== 'action') err(`module ${id}: moduleType must be action`);
  if (!(m.connection in connections)) err(`module ${id}: connection "${m.connection}" is not a connection of the app`);
  checkCodeFiles(`module ${id}`, m.codeFiles);
}
if (!Array.isArray(manifest.origins) || manifest.origins.length === 0) err('makecomapp.json: no origin');
for (const o of manifest.origins || []) {
  if (!/^https:\/\/.*\/api$/.test(o.baseUrl || '')) err(`origin ${o.label}: baseUrl must be https://<zone>.make.com/api`);
  if (!/^[a-z][0-9a-z-]+[0-9a-z]$/.test(o.appId || '')) err(`origin ${o.label}: appId does not match Make's pattern`);
  if (!o.apikeyFile) err(`origin ${o.label}: no apikeyFile`);
}
function checkCodeFiles(what, codeFiles) {
  if (!codeFiles) return err(`${what}: no codeFiles`);
  for (const [code, file] of Object.entries(codeFiles)) {
    if (file === null) continue;
    if (!fs.existsSync(path.join(src, file))) err(`${what}: codeFiles.${code} names a missing file ${file}`);
  }
}

// ---- IML references ----------------------------------------------------------------------------------------

function imlRefs(value, prefix) {
  // Every `<prefix>.<name>` inside {{ }} anywhere in the value (strings, nested objects).
  const refs = new Set();
  const re = new RegExp(`\\b${prefix}\\.([A-Za-z_][A-Za-z0-9_]*)`, 'g');
  const visit = (v) => {
    if (typeof v === 'string') {
      for (const expr of v.match(/\{\{[^}]*\}\}/g) || []) for (const m of expr.matchAll(re)) refs.add(m[1]);
    } else if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === 'object') Object.values(v).forEach(visit);
  };
  visit(value);
  return refs;
}
const usesWholeParameters = (value) => JSON.stringify(value).includes('"{{parameters}}"');

// ---- connection --------------------------------------------------------------------------------------------

const connectionParamNames = new Map();
for (const [id, c] of Object.entries(connections)) {
  const params = code(c.codeFiles, 'params');
  const comm = code(c.codeFiles, 'communication');
  if (!Array.isArray(params)) { err(`connection ${id}: params is missing or not an array`); continue; }
  if (!comm) err(`connection ${id}: no communication (the test of the key)`);
  const names = checkParams(`connection ${id}`, params);
  connectionParamNames.set(id, names);
  if (!params.some((p) => p.type === 'password' && p.required)) err(`connection ${id}: no required password parameter`);
  if (!comm) continue;
  for (const ref of imlRefs(comm, 'parameters')) if (!names.has(ref)) err(`connection ${id}: communication uses parameters.${ref}, not a parameter`);
  if (!/^https:\/\//.test(comm.url || '')) err(`connection ${id}: the communication's url must be absolute (the base is not applied to a connection)`);
  if ((comm.method || 'GET').toUpperCase() !== 'GET') err(`connection ${id}: the test is GET /v1/balance`);
  if (!/\/v1\/balance$/.test(comm.url || '')) err(`connection ${id}: the test must call /v1/balance`);
  checkSanitize(`connection ${id}`, comm.log);
  if (!comm.response || !comm.response.error) err(`connection ${id}: no response.error`);
}

// ---- base --------------------------------------------------------------------------------------------------

const base = code(manifest.generalCodeFiles, 'base');
if (!base) err('base: missing');
else {
  if (base.baseUrl !== 'https://api.prooftell.com') err('base: baseUrl must be https://api.prooftell.com');
  const headers = Object.fromEntries(Object.entries(base.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
  if (!/^Bearer \{\{connection\.apiKey\}\}$/.test(headers.authorization || '')) err('base: the Authorization header must be "Bearer {{connection.apiKey}}"');
  if (headers['content-type'] !== 'application/json') err('base: Content-Type must be application/json');
  if (!/^prooftell-make\/\d+\.\d+$/.test(headers['user-agent'] || '')) err('base: User-Agent must be prooftell-make/<version>');
  const allConnectionParams = new Set([].concat(...[...connectionParamNames.values()].map((s) => [...s])));
  for (const ref of imlRefs(base, 'connection')) if (!allConnectionParams.has(ref)) err(`base: uses connection.${ref}, not a parameter of any connection`);
  const error = base.response && base.response.error;
  if (!error || !error.message) err('base: response.error.message is missing');
  else {
    if (!error.message.includes('{{statusCode}}') || !error.message.includes('body.error.message')) err('base: the error message must show body.error.message and fall back to the status');
    for (const [k, v] of Object.entries(error)) {
      if (/^\d{3}$/.test(k) && !(v && v.message)) err(`base: response.error.${k} needs its own message`);
    }
  }
  checkSanitize('base', base.log);
}

// ---- modules -----------------------------------------------------------------------------------------------

for (const [id, m] of Object.entries(modules)) {
  const comm = code(m.codeFiles, 'communication');
  const mappable = code(m.codeFiles, 'mappableParams');
  const statics = code(m.codeFiles, 'staticParams');
  const iface = code(m.codeFiles, 'interface');
  const sample = code(m.codeFiles, 'samples');
  const scope = code(m.codeFiles, 'scope');
  if (!Array.isArray(mappable)) { err(`module ${id}: mappable parameters are missing or not an array`); continue; }
  const names = checkParams(`module ${id}`, mappable);
  if (Array.isArray(statics) && statics.length) warn(`module ${id}: static parameters are for triggers; an action's go in the mappable ones`);
  if (scope !== null && (!Array.isArray(scope) || scope.length)) warn(`module ${id}: scope should be null in the manifest or [] (no OAuth)`);
  if (!comm) err(`module ${id}: no communication`);
  else {
    if ((comm.method || '').toUpperCase() !== 'POST') err(`module ${id}: every action is a POST`);
    if (!/^\/v1\/(phone|email|ip|assess)$/.test(comm.url || '')) err(`module ${id}: url must be relative, one of the four endpoints`);
    if (!comm.response || comm.response.output !== '{{body}}') err(`module ${id}: response.output must be {{body}} (the whole answer is kept)`);
    const refs = imlRefs(comm, 'parameters');
    for (const ref of refs) if (!names.has(ref)) err(`module ${id}: communication uses parameters.${ref}, not a mappable parameter`);
    if (!usesWholeParameters(comm) && refs.size === 0) err(`module ${id}: the communication sends no parameter`);
    if (usesWholeParameters(comm)) {
      // The body is the parameters as they are: their names are the api's field names.
      const apiFields = { '/v1/phone': ['phone', 'country', 'level'], '/v1/email': ['email', 'timeout'], '/v1/ip': ['ip'], '/v1/assess': ['phone', 'email', 'ip', 'country', 'reference'] }[comm.url] || [];
      for (const n of names) if (!apiFields.includes(n)) err(`module ${id}: parameter "${n}" is not a field of ${comm.url} (the body is {{parameters}})`);
    }
  }
  if (!Array.isArray(iface)) err(`module ${id}: interface is not an array`);
  else {
    checkInterface(`module ${id}`, iface);
    if (sample && typeof sample === 'object' && !Array.isArray(sample)) checkSample(`module ${id}`, iface, sample, '');
    else err(`module ${id}: the sample must be one object (one bundle)`);
  }
}

function checkParams(what, params) {
  const names = new Set();
  for (const p of params) {
    if (!p.name) { err(`${what}: a parameter has no name`); continue; }
    if (names.has(p.name)) err(`${what}: parameter "${p.name}" is declared twice`);
    names.add(p.name);
    if (!PARAM_TYPES.has(p.type)) err(`${what}: parameter "${p.name}" has an unknown type "${p.type}"`);
    if (!p.label) err(`${what}: parameter "${p.name}" has no label`);
    if (p.label && p.label !== sentenceCase(p.label)) warn(`${what}: label "${p.label}" is not in sentence case`);
    if (p.type === 'select') {
      if (!Array.isArray(p.options) || p.options.length === 0) err(`${what}: select "${p.name}" has no options`);
      else {
        for (const o of p.options) if (!('label' in o) || !('value' in o)) err(`${what}: select "${p.name}" has an option without label and value`);
        if ('default' in p && !p.options.some((o) => o.value === p.default)) err(`${what}: select "${p.name}" defaults to a value that is not an option`);
      }
    }
    if (p.validate && typeof p.validate !== 'object') err(`${what}: parameter "${p.name}" has a validate that is not an object`);
  }
  return names;
}

function checkInterface(what, items, prefix = '') {
  const seen = new Set();
  for (const it of items) {
    const name = prefix + (it.name || '?');
    if (!it.name) err(`${what}: an interface field under "${prefix || '/'}" has no name`);
    if (seen.has(it.name)) err(`${what}: interface field "${name}" is declared twice`);
    seen.add(it.name);
    if (!it.label) err(`${what}: interface field "${name}" has no label`);
    if (!INTERFACE_TYPES.has(it.type)) err(`${what}: interface field "${name}" has an unknown type "${it.type}"`);
    if (it.type === 'collection') {
      if (!Array.isArray(it.spec)) err(`${what}: collection "${name}" needs a spec array`);
      else checkInterface(what, it.spec, name + '.');
    }
    if (it.type === 'array' && it.spec !== undefined) {
      if (Array.isArray(it.spec)) checkInterface(what, it.spec, name + '[].');
      else if (typeof it.spec === 'object') { if (!INTERFACE_TYPES.has(it.spec.type)) err(`${what}: array "${name}" has a spec of unknown type`); }
      else err(`${what}: array "${name}" has a spec that is neither an object nor an array`);
    }
  }
}

function checkSample(what, iface, sample, prefix) {
  const byName = new Map(iface.map((it) => [it.name, it]));
  for (const [k, v] of Object.entries(sample)) {
    const it = byName.get(k);
    const name = prefix + k;
    if (!it) { err(`${what}: the sample has "${name}", which the interface does not declare`); continue; }
    if (!fits(it, v)) err(`${what}: sample "${name}" is a ${describe(v)}, the interface says ${it.type}`);
    if (it.type === 'collection' && v && typeof v === 'object' && Array.isArray(it.spec)) checkSample(what, it.spec, v, name + '.');
    if (it.type === 'array' && Array.isArray(v) && Array.isArray(it.spec)) v.forEach((row, i) => { if (row && typeof row === 'object') checkSample(what, it.spec, row, `${name}[${i}].`); });
  }
  if (prefix === '') {
    const missing = iface.filter((it) => !(it.name in sample)).map((it) => it.name);
    if (missing.length) warn(`${what}: the sample does not carry ${missing.length} declared field(s) (${missing.join(', ')}); fine when the level or the input does not produce them`);
  }
}
function fits(it, v) {
  if (v === null) return true;
  switch (it.type) {
    case 'boolean': return typeof v === 'boolean';
    case 'number': return typeof v === 'number';
    case 'integer': return Number.isInteger(v);
    case 'uinteger': return Number.isInteger(v) && v >= 0;
    case 'collection': return typeof v === 'object' && !Array.isArray(v);
    case 'array': return Array.isArray(v);
    case 'date': return typeof v === 'string' && !Number.isNaN(Date.parse(v));
    case 'any': return true;
    default: return typeof v === 'string';
  }
}
function describe(v) {
  return v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
}

function checkSanitize(what, log) {
  const list = (log && log.sanitize) || [];
  if (!list.some((p) => p.toLowerCase() === 'request.headers.authorization')) err(`${what}: log.sanitize must hide request.headers.authorization`);
}
function sentenceCase(label) {
  // The first letter capitalized, the rest as written: an abbreviation (URL, IP, E.164, USD) is allowed upper case.
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// ---- app.json ----------------------------------------------------------------------------------------------

const app = readJson(path.join(root, 'app.json'));
if (app) {
  if (!/^[a-z][0-9a-z-]+[0-9a-z]$/.test(app.name || '')) err('app.json: name does not match Make\'s pattern ^[a-z][0-9a-z-]+[0-9a-z]$');
  if (app.label !== 'ProofTell') err('app.json: label must be ProofTell');
  if (!/^#[0-9a-f]{6}$/i.test(app.theme || '')) err('app.json: theme must be a hex colour');
  if (app.language !== 'en') err('app.json: language must be en');
  if (!app.description || !app.description.includes('the sandbox is free')) err('app.json: the description must say what it costs');
  for (const o of manifest.origins || []) if (o.appId !== app.name) err(`app.json: name "${app.name}" differs from the origin's appId "${o.appId}"`);
}

// ---- words -------------------------------------------------------------------------------------------------

const textFiles = [...allFiles, path.join(root, 'README.md'), path.join(root, 'LISTING.md'), path.join(root, 'app.json')].filter((f) => fs.existsSync(f));
for (const f of textFiles) {
  const text = fs.readFileSync(f, 'utf8');
  if (/\p{Extended_Pictographic}/u.test(text)) err(`${rel(f)}: contains an emoji`);
  for (const bad of ['Prooftell', 'PROOFTELL', 'Proof Tell', 'proofTell']) if (text.includes(bad)) err(`${rel(f)}: writes "${bad}"; the brand is ProofTell`);
  if (/\bcredits\b/i.test(text)) err(`${rel(f)}: says "credits"; money is dollars (the site's "no credit packs" is the one allowed phrase)`);
}

report();

function report() {
  for (const w of warnings) console.log(`warning: ${w}`);
  for (const e of errors) console.log(`error: ${e}`);
  const n = (k) => Object.keys(manifest && manifest.components && manifest.components[k] || {}).length;
  console.log(`${jsonFiles.length} JSON files parsed, ${n('connection')} connection(s), ${n('module')} module(s); ${errors.length} error(s), ${warnings.length} warning(s).`);
  process.exit(errors.length ? 1 : 0);
}
