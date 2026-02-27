import type {
	ICredentialTestFunctions,
	ICredentialsDecrypted,
	IExecuteFunctions,
	IHttpRequestOptions,
	INodeCredentialTestResult,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

export class Fortnox implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Fortnox',
		name: 'fortnox',
		icon: 'file:fortnox.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the Fortnox accounting API',
		defaults: {
			name: 'Fortnox',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'fortnoxApi',
				required: true,
				testedBy: 'fortnoxApiTest',
			},
		],
		properties: [],
	};

	methods = {
		credentialTest: {
			async fortnoxApiTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const { clientId, clientSecret, tenantId, scopes } = credential.data!;
				const requestedScopes = scopes as string[];

				// Access httpRequest via type assertion -- the runtime helpers object
				// has httpRequest available, but ICredentialTestFunctions types are limited
				const httpRequest = (
					this.helpers as unknown as {
						httpRequest: (
							options: IHttpRequestOptions,
						) => Promise<Record<string, unknown>>;
					}
				).httpRequest;

				try {
					// Step 1: Fetch token to get granted scopes
					const basicAuth = Buffer.from(
						`${clientId as string}:${clientSecret as string}`,
					).toString('base64');
					const scopeString = requestedScopes.join(' ');

					const tokenResponse = (await httpRequest({
						method: 'POST',
						url: 'https://apps.fortnox.se/oauth-v1/token',
						headers: {
							Authorization: `Basic ${basicAuth}`,
							'Content-Type': 'application/x-www-form-urlencoded',
							TenantId: tenantId as string,
						},
						body: `grant_type=client_credentials&scope=${encodeURIComponent(scopeString)}`,
					})) as { access_token: string; scope: string };

					const grantedScopes = tokenResponse.scope.split(' ');
					const missingScopes = requestedScopes.filter(
						(s) => !grantedScopes.includes(s),
					);

					// Step 2: Call company information endpoint
					const companyResponse = (await httpRequest({
						method: 'GET',
						url: 'https://api.fortnox.se/3/companyinformation',
						headers: {
							Authorization: `Bearer ${tokenResponse.access_token}`,
						},
					})) as {
						CompanyInformation?: { CompanyName?: string };
					};

					const companyName =
						companyResponse.CompanyInformation?.CompanyName ?? 'Unknown';

					// Step 3: Build result message
					let message = `Connected to ${companyName}`;
					if (missingScopes.length > 0) {
						message += `. Warning: missing scopes: ${missingScopes.join(', ')}`;
					}

					return { status: 'OK', message };
				} catch (error) {
					return {
						status: 'Error',
						message: `Authentication failed: ${(error as Error).message}`,
					};
				}
			},
		},
	};

	async execute(this: IExecuteFunctions) {
		const items = this.getInputData();
		return [items];
	}
}
