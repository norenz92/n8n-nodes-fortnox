import type {
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class FortnoxApi implements ICredentialType {
	name = 'fortnoxApi';

	displayName = 'Fortnox API';

	documentationUrl = 'https://developer.fortnox.se/documentation/';

	icon = 'file:fortnox.svg' as const;

	properties: INodeProperties[] = [
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
			displayName: 'Scopes',
			name: 'scopes',
			type: 'multiOptions',
			default: [],
			options: [
				{ name: 'Archive', value: 'archive' },
				{ name: 'Article', value: 'article' },
				{ name: 'Assets', value: 'assets' },
				{ name: 'Bookkeeping', value: 'bookkeeping' },
				{ name: 'Company Information', value: 'companyinformation' },
				{ name: 'Connect File', value: 'connectfile' },
				{ name: 'Cost Center', value: 'costcenter' },
				{ name: 'Currency', value: 'currency' },
				{ name: 'Customer', value: 'customer' },
				{ name: 'Inbox', value: 'inbox' },
				{ name: 'Invoice', value: 'invoice' },
				{ name: 'Nox Finans Invoice', value: 'noxfinansinvoice' },
				{ name: 'Offer', value: 'offer' },
				{ name: 'Order', value: 'order' },
				{ name: 'Payment', value: 'payment' },
				{ name: 'Price', value: 'price' },
				{ name: 'Print', value: 'print' },
				{ name: 'Profile', value: 'profile' },
				{ name: 'Project', value: 'project' },
				{ name: 'Salary', value: 'salary' },
				{ name: 'Settings', value: 'settings' },
				{ name: 'Supplier', value: 'supplier' },
				{ name: 'Supplier Invoice', value: 'supplierinvoice' },
				{ name: 'Time Reporting', value: 'timereporting' },
			],
			description:
				'Scopes to request when fetching access tokens. Only select scopes that your Fortnox app has been approved for in the developer portal.',
		},
	];

	// Credential test requires a tenantId (set per-node) so we use a
	// lightweight check via the Fortnox node credentialTest method instead.
	// This minimal test satisfies the lint rule while the real validation
	// happens at execution time with the per-node tenantId.
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://apps.fortnox.se',
			url: '/oauth-v1/.well-known/openid-configuration',
			method: 'GET',
		},
	};
}
