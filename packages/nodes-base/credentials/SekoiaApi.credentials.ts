import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class SekoiaApi implements ICredentialType {
	name = 'sekoiaApi';

	displayName = 'Sekoia API';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
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
}