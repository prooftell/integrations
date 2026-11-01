// The node's contract, read from the built description (`npm run build` first): every operation's method, URL and
// body routing, the credential's header and test, the package's verification facts. Declarative nodes run inside
// n8n, so the request itself is not made here; the `preSend` steps are called as n8n calls them.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');
const { Prooftell } = require('../dist/nodes/Prooftell/Prooftell.node.js');
const { ProoftellApi } = require('../dist/credentials/ProoftellApi.credentials.js');
const { dropBlankFields, requireAnIdentity } = require('../dist/nodes/Prooftell/body.js');

const description = new Prooftell().description;
const properties = description.properties;

/** The properties shown for a resource (and, when given, an operation). */
function shownFor(resource, operation) {
	return properties.filter((p) => {
		const show = p.displayOptions?.show ?? {};
		if (!show.resource?.includes(resource)) return false;
		return operation === undefined || !show.operation || show.operation.includes(operation);
	});
}

const operations = {
	phone: {
		value: 'lookup',
		name: 'Look Up a Phone Number',
		action: 'Look up a phone number',
		url: '/v1/phone',
		required: ['phone'],
		optional: ['country', 'level'],
	},
	email: {
		value: 'verify',
		name: 'Verify an Email Address',
		action: 'Verify an email address',
		url: '/v1/email',
		required: ['email'],
		optional: [],
	},
	ip: {
		value: 'lookup',
		name: 'Look Up an IP Address',
		action: 'Look up an IP address',
		url: '/v1/ip',
		required: ['ip'],
		optional: [],
	},
	risk: {
		value: 'assess',
		name: 'Assess the Risk of an Identity',
		action: 'Assess the risk of an identity',
		url: '/v1/assess',
		required: [],
		optional: ['phone', 'email', 'ip', 'country', 'reference'],
	},
};

test('the node: name, icons, tool use, request defaults', () => {
	assert.equal(description.displayName, 'ProofTell');
	assert.equal(description.name, 'prooftell');
	assert.equal(description.usableAsTool, true);
	assert.deepEqual(description.credentials, [{ name: 'prooftellApi', required: true }]);
	assert.equal(description.requestDefaults.baseURL, 'https://api.prooftell.com');
	assert.deepEqual(description.requestDefaults.headers, {
		Accept: 'application/json',
		'Content-Type': 'application/json',
		'User-Agent': `prooftell-n8n/${pkg.version}`,
	});
	assert.deepEqual(description.icon, {
		light: 'file:prooftell.svg',
		dark: 'file:prooftell.dark.svg',
	});
	for (const file of ['prooftell.svg', 'prooftell.dark.svg']) {
		assert.ok(existsSync(new URL(`../dist/nodes/Prooftell/${file}`, import.meta.url)), file);
	}
});

test('the four resources', () => {
	const resource = properties.find((p) => p.name === 'resource');
	assert.deepEqual(resource.options.map((o) => o.value).sort(), ['email', 'ip', 'phone', 'risk']);
	assert.equal(resource.default, 'phone');
});

for (const [resource, expected] of Object.entries(operations)) {
	test(`${resource}: one operation, POST ${expected.url}, every field in the body`, () => {
		const operation = shownFor(resource).find((p) => p.name === 'operation');
		assert.equal(operation.options.length, 1, 'one operation');
		const [op] = operation.options;
		assert.equal(op.value, expected.value);
		assert.equal(op.name, expected.name);
		assert.equal(op.action, expected.action);
		assert.match(op.description, /Charged per check from your balance; the sandbox is free\.$/);
		assert.deepEqual(op.routing.request, { method: 'POST', url: expected.url });
		assert.equal(op.routing.send.preSend[0], dropBlankFields);
		assert.equal(operation.default, expected.value);

		const fields = shownFor(resource, expected.value).filter((p) => p.name !== 'operation');
		const byName = Object.fromEntries(fields.map((p) => [p.name, p]));
		for (const name of expected.required) {
			assert.equal(byName[name]?.required, true, `${name} is required`);
			assert.deepEqual(byName[name].routing, { send: { type: 'body', property: name } });
		}
		for (const name of expected.optional) {
			assert.ok(byName[name], `${name} is shown`);
			assert.notEqual(byName[name].required, true, `${name} is optional`);
			assert.deepEqual(byName[name].routing, { send: { type: 'body', property: name } });
		}
	});
}

test('phone: the five levels, alphabetical as n8n wants, line type the default', () => {
	const level = shownFor('phone', 'lookup').find((p) => p.name === 'level');
	assert.deepEqual(
		level.options.map((o) => [o.name, o.value]),
		[
			['Basic', 'basic'],
			['Current Carrier', 'current_carrier'],
			['Fraud Score', 'fraud_score'],
			['Line Status', 'line_status'],
			['Line Type', 'line_type'],
		],
	);
	assert.equal(level.default, 'line_type');
});

test('email: the timeout is an option in the body, within the api’s bounds', () => {
	const options = shownFor('email', 'verify').find((p) => p.name === 'options');
	assert.equal(options.type, 'collection');
	const [timeout] = options.options;
	assert.equal(timeout.name, 'timeout');
	assert.deepEqual(timeout.typeOptions, { minValue: 1000, maxValue: 45000, numberPrecision: 0 });
	assert.deepEqual(timeout.routing, { send: { type: 'body', property: 'timeout' } });
});

test('risk: the assessment refuses an empty identity before the request', () => {
	const [, second] = shownFor('risk').find((p) => p.name === 'operation').options[0].routing.send
		.preSend;
	assert.equal(second, requireAnIdentity);
});

const fakeContext = {
	getNode: () => ({
		name: 'ProofTell',
		type: 'prooftell',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	}),
	getItemIndex: () => 3,
};

test('preSend: the blank fields are dropped, the given ones kept', async () => {
	const request = {
		method: 'POST',
		url: '/v1/assess',
		body: {
			phone: '+447700900123',
			email: '',
			ip: '   ',
			country: '',
			reference: 'signup-48213',
			options: {},
		},
	};
	const out = await dropBlankFields.call(fakeContext, request);
	assert.deepEqual(out.body, { phone: '+447700900123', reference: 'signup-48213' });
});

test('preSend: an assessment without a phone, an email or an IP is refused with a sentence', async () => {
	await assert.rejects(
		requireAnIdentity.call(fakeContext, {
			method: 'POST',
			url: '/v1/assess',
			body: { reference: 'x' },
		}),
		(error) => {
			assert.equal(error.constructor.name, 'NodeOperationError');
			assert.match(
				error.message,
				/at least one of 'Phone Number', 'Email Address' and 'IP Address'/,
			);
			return true;
		},
	);
	const ok = await requireAnIdentity.call(fakeContext, {
		method: 'POST',
		url: '/v1/assess',
		body: { ip: '203.0.113.1' },
	});
	assert.deepEqual(ok.body, { ip: '203.0.113.1' });
});

test('the credential: a bearer header, tested on /v1/balance', () => {
	const credential = new ProoftellApi();
	assert.equal(credential.name, 'prooftellApi');
	assert.equal(credential.displayName, 'ProofTell API');
	assert.equal(credential.documentationUrl, 'https://prooftell.com/integrations#n8n');
	const [apiKey] = credential.properties;
	assert.equal(apiKey.name, 'apiKey');
	assert.equal(apiKey.typeOptions.password, true);
	assert.equal(apiKey.required, true);
	assert.match(apiKey.description, /pt_test_.*sandbox/);
	assert.deepEqual(credential.authenticate, {
		type: 'generic',
		properties: { headers: { Authorization: '=Bearer {{$credentials.apiKey}}' } },
	});
	assert.deepEqual(credential.test, {
		request: { baseURL: 'https://api.prooftell.com', url: '/v1/balance' },
	});
});

test('the package: what n8n’s verification reads', () => {
	assert.equal(pkg.name, 'n8n-nodes-prooftell');
	assert.ok(pkg.keywords.includes('n8n-community-node-package'));
	assert.equal(pkg.license, 'MIT');
	assert.equal(pkg.dependencies, undefined, 'no runtime dependency');
	assert.deepEqual(pkg.author, { name: 'ProofTell', email: 'support@prooftell.com' });
	assert.equal(pkg.repository.directory, 'n8n-nodes-prooftell');
	assert.deepEqual(pkg.n8n.nodes, ['dist/nodes/Prooftell/Prooftell.node.js']);
	assert.deepEqual(pkg.n8n.credentials, ['dist/credentials/ProoftellApi.credentials.js']);
	for (const file of [...pkg.n8n.nodes, ...pkg.n8n.credentials]) {
		assert.ok(existsSync(new URL(`../${file}`, import.meta.url)), file);
	}
});
