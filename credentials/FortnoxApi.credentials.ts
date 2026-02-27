import type {
	IAuthenticateGeneric,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestHelper,
	INodeProperties,
} from 'n8n-workflow';

export class FortnoxApi implements ICredentialType {
	name = 'fortnoxApi';

	displayName = 'Fortnox API';

	documentationUrl = '';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'hidden',
			typeOptions: {
				expirable: true,
			},
			default: '',
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
			description:
				'Found in Fortnox Developer Portal under your app settings',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description:
				'Found in Fortnox Developer Portal under your app settings',
		},
		{
			displayName: 'Tenant ID',
			name: 'tenantId',
			type: 'string',
			default: '',
			required: true,
			description:
				'The numeric tenant identifier for the Fortnox company. Also known as the DatabaseNumber in Fortnox company information.',
		},
		{
			displayName: 'Scopes',
			name: 'scopes',
			type: 'multiOptions',
			default: [
				'companyinformation',
				'invoice',
				'customer',
				'article',
				'order',
			],
			options: [
				{ name: 'Archive', value: 'archive' },
				{ name: 'Article', value: 'article' },
				{ name: 'Assets', value: 'assets' },
				{ name: 'Bookkeeping', value: 'bookkeeping' },
				{ name: 'Company Information', value: 'companyinformation' },
				{ name: 'Cost Center', value: 'costcenter' },
				{ name: 'Currency', value: 'currency' },
				{ name: 'Customer', value: 'customer' },
				{ name: 'Invoice', value: 'invoice' },
				{ name: 'Offer', value: 'offer' },
				{ name: 'Order', value: 'order' },
				{ name: 'Price', value: 'price' },
				{ name: 'Print', value: 'print' },
				{ name: 'Project', value: 'project' },
				{ name: 'Salary', value: 'salary' },
				{ name: 'Settings', value: 'settings' },
				{ name: 'Supplier', value: 'supplier' },
				{ name: 'Supplier Invoice', value: 'supplierinvoice' },
			],
			description:
				'Scopes to request when obtaining access tokens. Must match scopes granted during client consent in the Fortnox Developer Portal.',
		},
	];

	async preAuthentication(
		this: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
	) {
		const clientId = credentials.clientId as string;
		const clientSecret = credentials.clientSecret as string;
		const tenantId = credentials.tenantId as string;
		const scopes = credentials.scopes as string[];
		const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
			'base64',
		);
		const scopeString = scopes.join(' ');

		const response = await this.helpers.httpRequest({
			method: 'POST',
			url: 'https://apps.fortnox.se/oauth-v1/token',
			headers: {
				Authorization: `Basic ${basicAuth}`,
				'Content-Type': 'application/x-www-form-urlencoded',
				TenantId: tenantId,
			},
			body: `grant_type=client_credentials&scope=${encodeURIComponent(scopeString)}`,
		});

		return { accessToken: response.access_token };
	}

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.fortnox.se',
			url: '/3/companyinformation',
		},
	};
}
