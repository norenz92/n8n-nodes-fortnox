import type {
	ICredentialTestFunctions,
	ICredentialsDecrypted,
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { fortnoxApiRequest, fortnoxApiRequestAllItems } from './GenericFunctions';
import { invoiceFields, invoiceOperations } from './InvoiceDescription';

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
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Invoice',
						value: 'invoice',
					},
				],
				default: 'invoice',
			},
			...invoiceOperations,
			...invoiceFields,
		],
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
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: IDataObject | IDataObject[] | undefined;

				if (resource === 'invoice') {
					if (operation === 'create') {
						const customerNumber = this.getNodeParameter('customerNumber', i) as string;
						const invoiceRows = this.getNodeParameter('invoiceRows', i) as IDataObject;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = {
							Invoice: {
								CustomerNumber: customerNumber,
							} as IDataObject,
						};

						const invoiceBody = body.Invoice as IDataObject;

						if (invoiceRows.row) {
							invoiceBody.InvoiceRows = invoiceRows.row;
						}

						for (const key of Object.keys(additionalFields)) {
							if (additionalFields[key] !== '') {
								invoiceBody[key] = additionalFields[key];
							}
						}

						const response = await fortnoxApiRequest.call(this, 'POST', '/3/invoices', body);
						responseData = response.Invoice as IDataObject;
					}

					if (operation === 'get') {
						const documentNumber = this.getNodeParameter('documentNumber', i) as string;
						const response = await fortnoxApiRequest.call(this, 'GET', `/3/invoices/${documentNumber}`);
						responseData = response.Invoice as IDataObject;
					}

					if (operation === 'getMany') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const filters = this.getNodeParameter('filters', i) as IDataObject;
						const qs: IDataObject = {};

						for (const key of Object.keys(filters)) {
							if (filters[key] !== '') {
								qs[key] = filters[key];
							}
						}

						if (returnAll) {
							responseData = await fortnoxApiRequestAllItems.call(
								this,
								'GET',
								'/3/invoices',
								'Invoices',
								{},
								qs,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.limit = limit;
							const response = await fortnoxApiRequest.call(this, 'GET', '/3/invoices', {}, qs);
							responseData = response.Invoices as IDataObject[];
						}
					}

					if (operation === 'update') {
						const documentNumber = this.getNodeParameter('documentNumber', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						const body: IDataObject = {
							Invoice: {} as IDataObject,
						};

						const invoiceBody = body.Invoice as IDataObject;

						if (updateFields.InvoiceRows) {
							const rows = updateFields.InvoiceRows as IDataObject;
							invoiceBody.InvoiceRows = rows.row;
							delete updateFields.InvoiceRows;
						}

						for (const key of Object.keys(updateFields)) {
							if (updateFields[key] !== '') {
								invoiceBody[key] = updateFields[key];
							}
						}

						const response = await fortnoxApiRequest.call(
							this,
							'PUT',
							`/3/invoices/${documentNumber}`,
							body,
						);
						responseData = response.Invoice as IDataObject;
					}

					if (operation === 'bookkeep') {
						const documentNumber = this.getNodeParameter('documentNumber', i) as string;
						const response = await fortnoxApiRequest.call(
							this,
							'PUT',
							`/3/invoices/${documentNumber}/bookkeep`,
						);
						responseData = response.Invoice as IDataObject;
					}

					if (operation === 'cancel') {
						const documentNumber = this.getNodeParameter('documentNumber', i) as string;
						const response = await fortnoxApiRequest.call(
							this,
							'PUT',
							`/3/invoices/${documentNumber}/cancel`,
						);
						responseData = response.Invoice as IDataObject;
					}

					if (operation === 'credit') {
						const documentNumber = this.getNodeParameter('documentNumber', i) as string;
						const response = await fortnoxApiRequest.call(
							this,
							'PUT',
							`/3/invoices/${documentNumber}/credit`,
						);
						responseData = response.Invoice as IDataObject;
					}

					if (operation === 'send') {
						const documentNumber = this.getNodeParameter('documentNumber', i) as string;
						// IMPORTANT: Fortnox email endpoint uses GET, not POST
						const response = await fortnoxApiRequest.call(
							this,
							'GET',
							`/3/invoices/${documentNumber}/email`,
						);
						responseData = response.Invoice as IDataObject;
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: (error as Error).message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
					continue;
				}
				throw error;
			}
		}
		return [returnData];
	}
}
