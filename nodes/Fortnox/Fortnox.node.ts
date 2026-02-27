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

import { articleFields, articleOperations } from './ArticleDescription';
import { customerFields, customerOperations } from './CustomerDescription';
import { fortnoxApiRequest, fortnoxApiRequestAllItems } from './GenericFunctions';
import { invoiceFields, invoiceOperations } from './InvoiceDescription';
import { orderFields, orderOperations } from './OrderDescription';

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
						name: 'Article',
						value: 'article',
					},
					{
						name: 'Customer',
						value: 'customer',
					},
					{
						name: 'Invoice',
						value: 'invoice',
					},
					{
						name: 'Order',
						value: 'order',
					},
				],
				default: 'invoice',
			},
			...articleOperations,
			...articleFields,
			...customerOperations,
			...customerFields,
			...invoiceOperations,
			...invoiceFields,
			...orderOperations,
			...orderFields,
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

				if (resource === 'article') {
					if (operation === 'create') {
						const description = this.getNodeParameter('description', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const body: IDataObject = { Article: { Description: description } as IDataObject };
						const articleBody = body.Article as IDataObject;
						for (const key of Object.keys(additionalFields)) {
							if (additionalFields[key] !== '') {
								articleBody[key] = additionalFields[key];
							}
						}
						const response = await fortnoxApiRequest.call(this, 'POST', '/3/articles', body);
						responseData = response.Article as IDataObject;
					}

					if (operation === 'get') {
						const articleNumber = this.getNodeParameter('articleNumber', i) as string;
						const response = await fortnoxApiRequest.call(this, 'GET', `/3/articles/${articleNumber}`);
						responseData = response.Article as IDataObject;
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
								'/3/articles',
								'Articles',
								{},
								qs,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.limit = limit;
							const response = await fortnoxApiRequest.call(this, 'GET', '/3/articles', {}, qs);
							responseData = response.Articles as IDataObject[];
						}
					}

					if (operation === 'update') {
						const articleNumber = this.getNodeParameter('articleNumber', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						const body: IDataObject = { Article: {} as IDataObject };
						const articleBody = body.Article as IDataObject;
						for (const key of Object.keys(updateFields)) {
							if (updateFields[key] !== '') {
								articleBody[key] = updateFields[key];
							}
						}
						const response = await fortnoxApiRequest.call(
							this,
							'PUT',
							`/3/articles/${articleNumber}`,
							body,
						);
						responseData = response.Article as IDataObject;
					}

					if (operation === 'delete') {
						const articleNumber = this.getNodeParameter('articleNumber', i) as string;
						await fortnoxApiRequest.call(this, 'DELETE', `/3/articles/${articleNumber}`);
						responseData = { success: true } as IDataObject;
					}
				}

				if (resource === 'customer') {
					if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const body: IDataObject = { Customer: { Name: name } as IDataObject };
						const customerBody = body.Customer as IDataObject;
						for (const key of Object.keys(additionalFields)) {
							if (additionalFields[key] !== '') {
								customerBody[key] = additionalFields[key];
							}
						}
						const response = await fortnoxApiRequest.call(this, 'POST', '/3/customers', body);
						responseData = response.Customer as IDataObject;
					}

					if (operation === 'get') {
						const customerNumber = this.getNodeParameter('customerNumber', i) as string;
						const response = await fortnoxApiRequest.call(this, 'GET', `/3/customers/${customerNumber}`);
						responseData = response.Customer as IDataObject;
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
								'/3/customers',
								'Customers',
								{},
								qs,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.limit = limit;
							const response = await fortnoxApiRequest.call(this, 'GET', '/3/customers', {}, qs);
							responseData = response.Customers as IDataObject[];
						}
					}

					if (operation === 'update') {
						const customerNumber = this.getNodeParameter('customerNumber', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						const body: IDataObject = { Customer: {} as IDataObject };
						const customerBody = body.Customer as IDataObject;
						for (const key of Object.keys(updateFields)) {
							if (updateFields[key] !== '') {
								customerBody[key] = updateFields[key];
							}
						}
						const response = await fortnoxApiRequest.call(
							this,
							'PUT',
							`/3/customers/${customerNumber}`,
							body,
						);
						responseData = response.Customer as IDataObject;
					}

					if (operation === 'delete') {
						const customerNumber = this.getNodeParameter('customerNumber', i) as string;
						await fortnoxApiRequest.call(this, 'DELETE', `/3/customers/${customerNumber}`);
						responseData = { success: true } as IDataObject;
					}
				}

				if (resource === 'order') {
					if (operation === 'create') {
						const customerNumber = this.getNodeParameter('customerNumber', i) as string;
						const orderRows = this.getNodeParameter('orderRows', i) as IDataObject;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const body: IDataObject = {
							Order: { CustomerNumber: customerNumber } as IDataObject,
						};
						const orderBody = body.Order as IDataObject;
						if (orderRows.row) {
							orderBody.OrderRows = orderRows.row;
						}
						for (const key of Object.keys(additionalFields)) {
							if (additionalFields[key] !== '') {
								orderBody[key] = additionalFields[key];
							}
						}
						const response = await fortnoxApiRequest.call(this, 'POST', '/3/orders', body);
						responseData = response.Order as IDataObject;
					}

					if (operation === 'get') {
						const documentNumber = this.getNodeParameter('documentNumber', i) as string;
						const response = await fortnoxApiRequest.call(this, 'GET', `/3/orders/${documentNumber}`);
						responseData = response.Order as IDataObject;
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
								'/3/orders',
								'Orders',
								{},
								qs,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.limit = limit;
							const response = await fortnoxApiRequest.call(this, 'GET', '/3/orders', {}, qs);
							responseData = response.Orders as IDataObject[];
						}
					}

					if (operation === 'update') {
						const documentNumber = this.getNodeParameter('documentNumber', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						const body: IDataObject = { Order: {} as IDataObject };
						const orderBody = body.Order as IDataObject;
						// Handle OrderRows nested fixedCollection
						if (updateFields.OrderRows) {
							const rows = updateFields.OrderRows as IDataObject;
							orderBody.OrderRows = rows.row;
							delete updateFields.OrderRows;
						}
						for (const key of Object.keys(updateFields)) {
							if (updateFields[key] !== '') {
								orderBody[key] = updateFields[key];
							}
						}
						const response = await fortnoxApiRequest.call(
							this,
							'PUT',
							`/3/orders/${documentNumber}`,
							body,
						);
						responseData = response.Order as IDataObject;
					}

					if (operation === 'cancel') {
						const documentNumber = this.getNodeParameter('documentNumber', i) as string;
						const response = await fortnoxApiRequest.call(
							this,
							'PUT',
							`/3/orders/${documentNumber}/cancel`,
						);
						responseData = response.Order as IDataObject;
					}

					if (operation === 'createInvoice') {
						const documentNumber = this.getNodeParameter('documentNumber', i) as string;
						// IMPORTANT: createinvoice returns { Invoice: {...} }, NOT { Order: {...} }
						const response = await fortnoxApiRequest.call(
							this,
							'PUT',
							`/3/orders/${documentNumber}/createinvoice`,
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
