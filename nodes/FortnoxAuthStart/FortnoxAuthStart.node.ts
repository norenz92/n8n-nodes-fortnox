import type {
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { randomBytes } from 'crypto';

const ALL_SCOPES = [
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
];

export class FortnoxAuthStart implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Fortnox Auth Start',
		name: 'fortnoxAuthStart',
		icon: 'file:fortnox.svg',
		group: ['trigger'],
		version: 1,
		subtitle: 'OAuth consent redirect',
		description:
			'Redirects the client to the Fortnox OAuth consent screen. Pair with a Fortnox Auth Callback node to complete the flow.',
		defaults: {
			name: 'Fortnox Auth Start',
		},
		usableAsTool: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'fortnoxApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				path: 'start',
				nodeType: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Callback URL',
				name: 'callbackUrl',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'https://your-n8n.example.com/webhook/…/callback',
				description:
					'The webhook URL of the Fortnox Auth Callback node. Copy it from the callback node settings and paste it here. Fortnox will redirect the client to this URL after consent.',
			},
			{
				displayName: 'Scopes',
				name: 'scopes',
				type: 'multiOptions',
				default: [],
				options: ALL_SCOPES,
				description:
					'Scopes to request during the OAuth consent. Only select scopes that your Fortnox app has been approved for in the developer portal.',
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const credentials = await this.getCredentials('fortnoxApi');
		const clientId = credentials.clientId as string;
		const callbackUrl = this.getNodeParameter('callbackUrl', '') as string;
		const scopes = this.getNodeParameter('scopes', []) as string[];

		const state = randomBytes(32).toString('hex');
		const scopeString = scopes.join(' ');

		const authUrl = new URL('https://apps.fortnox.se/oauth-v1/auth');
		authUrl.searchParams.set('client_id', clientId);
		authUrl.searchParams.set('redirect_uri', callbackUrl);
		authUrl.searchParams.set('response_type', 'code');
		authUrl.searchParams.set('scope', scopeString);
		authUrl.searchParams.set('state', state);
		authUrl.searchParams.set('account_type', 'service');

		const res = this.getResponseObject();
		res.writeHead(302, { Location: authUrl.toString() });
		res.end();

		return { noWebhookResponse: true };
	}
}
