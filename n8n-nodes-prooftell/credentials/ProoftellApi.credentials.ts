// The ProofTell API key as an n8n credential: sent as `Authorization: Bearer <key>` on every request of the
// ProofTell node, tested with GET /v1/balance (a 200 proves the key). One key, live or sandbox, by its prefix.
// The file and class are spelt `Prooftell` because n8n's linter derives them from the display name as
// `Github` from "GitHub"; everything a user sees says ProofTell.
import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class ProoftellApi implements ICredentialType {
	name = 'prooftellApi';

	displayName = 'ProofTell API';

	documentationUrl = 'https://prooftell.com/integrations#n8n';

	icon: Icon = {
		light: 'file:../nodes/Prooftell/prooftell.svg',
		dark: 'file:../nodes/Prooftell/prooftell.dark.svg',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description:
				'Create a key in the ProofTell dashboard (Developers → Integrations), named n8n. A pt_test_ key is the free sandbox: simulated, deterministic answers. A pt_live_ key spends the account’s balance.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.prooftell.com',
			url: '/v1/balance',
		},
	};
}
