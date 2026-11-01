// The ProofTell node: four resources, one operation each, routed declaratively onto the public api's four checks.
// Every parameter goes into the JSON body (`routing.send.type: 'body'`); the blanks are dropped in `body.ts` before
// the request leaves. The answer is the api's own JSON, unchanged, as the item's output. What each call does, what it
// costs and the sandbox: https://prooftell.com/docs.
//
// Names: each operation's `action` (what n8n's node panel lists) is the action's name as on every ProofTell
// connector, verbatim; its `name` (the dropdown inside the node) is the same sentence in Title Case, and the phone
// levels are Title Case too, because n8n's linter requires it of option names. The file and class are spelt
// `Prooftell` because the linter derives the file name from the display name as `Github` from "GitHub"; everything a
// user sees says ProofTell.
import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { version } from '../../package.json';
import { dropBlankFields, requireAnIdentity } from './body';

export class Prooftell implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ProofTell',
		name: 'prooftell',
		icon: { light: 'file:prooftell.svg', dark: 'file:prooftell.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Look up a phone number, verify an email address, look up an IP address, or assess the risk of an identity with ProofTell',
		defaults: {
			name: 'ProofTell',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'prooftellApi', required: true }],
		requestDefaults: {
			baseURL: 'https://api.prooftell.com',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				'User-Agent': `prooftell-n8n/${version}`,
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Email', value: 'email' },
					{ name: 'IP', value: 'ip' },
					{ name: 'Phone', value: 'phone' },
					{ name: 'Risk', value: 'risk' },
				],
				default: 'phone',
			},

			// Phone
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['phone'] } },
				options: [
					{
						name: 'Look Up a Phone Number',
						value: 'lookup',
						action: 'Look up a phone number',
						description:
							'Checks a phone number: valid or not, its formats and country, then by level its line type, current carrier, line status or fraud score. Charged per check from your balance; the sandbox is free.',
						routing: {
							request: { method: 'POST', url: '/v1/phone' },
							send: { preSend: [dropBlankFields] },
						},
					},
				],
				default: 'lookup',
			},
			{
				displayName: 'Phone Number',
				name: 'phone',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. +447700900123',
				description:
					'The number to look up, in international format. A number in national format needs the country.',
				displayOptions: { show: { resource: ['phone'], operation: ['lookup'] } },
				routing: { send: { type: 'body', property: 'phone' } },
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				placeholder: 'e.g. GB',
				description:
					'The two-letter country code (ISO 3166-1 alpha-2) of a number given in national format. Leave empty for a number in international format.',
				displayOptions: { show: { resource: ['phone'], operation: ['lookup'] } },
				routing: { send: { type: 'body', property: 'country' } },
			},
			{
				displayName: 'Level',
				name: 'level',
				type: 'options',
				description:
					'How far to look, a ladder: basic, line type, current carrier, line status, fraud score. Each level includes the ones before it and is priced on its own; what is not offered for the number comes back as unavailable, at no cost.',
				// Alphabetical, as n8n's rules want: the ladder's order is in the description and each level names
				// the one it builds on.
				options: [
					{
						name: 'Basic',
						value: 'basic',
						description: 'Valid or not, the formats and the country. Free, but needs a balance.',
					},
					{
						name: 'Current Carrier',
						value: 'current_carrier',
						description:
							'Line type, plus the carrier the number is on today and whether it was ported',
					},
					{
						name: 'Fraud Score',
						value: 'fraud_score',
						description:
							'Line status, plus a 0–100 fraud score with its risk level, the range’s service type and its premium-rate flags',
					},
					{
						name: 'Line Status',
						value: 'line_status',
						description: 'Current carrier, plus whether the subscriber is on the network right now',
					},
					{
						name: 'Line Type',
						value: 'line_type',
						description:
							'Basic, plus the line type and the carrier the number range was allocated to. The default.',
					},
				],
				default: 'line_type',
				displayOptions: { show: { resource: ['phone'], operation: ['lookup'] } },
				routing: { send: { type: 'body', property: 'level' } },
			},

			// Email
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['email'] } },
				options: [
					{
						name: 'Verify an Email Address',
						value: 'verify',
						action: 'Verify an email address',
						description:
							'Checks whether an email address accepts mail: deliverable, undeliverable, risky or unknown, with the reason, the flags and a likely correction of a misspelt domain. Charged per check from your balance; the sandbox is free.',
						routing: {
							request: { method: 'POST', url: '/v1/email' },
							send: { preSend: [dropBlankFields] },
						},
					},
				],
				default: 'verify',
			},
			{
				displayName: 'Email Address',
				name: 'email',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. jane@example.com',
				description: 'The address to verify',
				displayOptions: { show: { resource: ['email'], operation: ['verify'] } },
				routing: { send: { type: 'body', property: 'email' } },
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: { show: { resource: ['email'], operation: ['verify'] } },
				options: [
					{
						displayName: 'Timeout',
						name: 'timeout',
						type: 'number',
						typeOptions: { minValue: 1000, maxValue: 45000, numberPrecision: 0 },
						default: 45000,
						description:
							'Milliseconds allowed for the dialogue with the mail server, 1000 to 45000. Past it the address comes back unknown, free.',
						routing: { send: { type: 'body', property: 'timeout' } },
					},
				],
			},

			// IP
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['ip'] } },
				options: [
					{
						name: 'Look Up an IP Address',
						value: 'lookup',
						action: 'Look up an IP address',
						description:
							'Finds where an IP address is and what network it is on, and whether it is Tor, a VPN or a datacenter. Charged per check from your balance; the sandbox is free.',
						routing: {
							request: { method: 'POST', url: '/v1/ip' },
							send: { preSend: [dropBlankFields] },
						},
					},
				],
				default: 'lookup',
			},
			{
				displayName: 'IP Address',
				name: 'ip',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. 203.0.113.1',
				description: 'The address to look up, IPv4 or IPv6',
				displayOptions: { show: { resource: ['ip'], operation: ['lookup'] } },
				routing: { send: { type: 'body', property: 'ip' } },
			},

			// Risk
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['risk'] } },
				options: [
					{
						name: 'Assess the Risk of an Identity',
						value: 'assess',
						action: 'Assess the risk of an identity',
						description:
							'Scores an identity from 0 to 100 with a verdict (allow, review or deny) and its reasons, from any mix of phone number, email address and IP address, each checked in parallel. Charged per check from your balance; the sandbox is free.',
						routing: {
							request: { method: 'POST', url: '/v1/assess' },
							send: { preSend: [dropBlankFields, requireAnIdentity] },
						},
					},
				],
				default: 'assess',
			},
			{
				displayName: 'Phone Number',
				name: 'phone',
				type: 'string',
				default: '',
				placeholder: 'e.g. +447700900123',
				description:
					'The phone number, in international format, or in national format with the country. Give at least one of phone number, email address and IP address.',
				displayOptions: { show: { resource: ['risk'], operation: ['assess'] } },
				routing: { send: { type: 'body', property: 'phone' } },
			},
			{
				displayName: 'Email Address',
				name: 'email',
				type: 'string',
				default: '',
				placeholder: 'e.g. jane@example.com',
				description:
					'The email address. Give at least one of phone number, email address and IP address.',
				displayOptions: { show: { resource: ['risk'], operation: ['assess'] } },
				routing: { send: { type: 'body', property: 'email' } },
			},
			{
				displayName: 'IP Address',
				name: 'ip',
				type: 'string',
				default: '',
				placeholder: 'e.g. 203.0.113.1',
				description:
					'The IP address of the end user, IPv4 or IPv6. Give at least one of phone number, email address and IP address.',
				displayOptions: { show: { resource: ['risk'], operation: ['assess'] } },
				routing: { send: { type: 'body', property: 'ip' } },
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				placeholder: 'e.g. GB',
				description:
					'The two-letter country code (ISO 3166-1 alpha-2) of a phone number given in national format',
				displayOptions: { show: { resource: ['risk'], operation: ['assess'] } },
				routing: { send: { type: 'body', property: 'country' } },
			},
			{
				displayName: 'Reference',
				name: 'reference',
				type: 'string',
				default: '',
				placeholder: 'e.g. signup-48213',
				description: 'Your own ID for this check, up to 128 characters, echoed back in the answer',
				displayOptions: { show: { resource: ['risk'], operation: ['assess'] } },
				routing: { send: { type: 'body', property: 'reference' } },
			},
		],
	};
}
