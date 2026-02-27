import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, sleep } from 'n8n-workflow';

const FORTNOX_API_BASE = 'https://api.fortnox.se';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/**
 * Common Fortnox error codes mapped to English translations.
 * Fortnox returns error messages in Swedish by default.
 */
const FORTNOX_ERROR_MAP: Record<number, string> = {
	1000003: 'System error -- contact Fortnox support',
	2000106: 'Value must be alphanumeric',
	2000108: 'Value must be numeric',
	2000134: 'Value must be a boolean',
	2000310: 'Invalid credentials',
	2000359: 'Value contains invalid characters',
	2000588: 'Invalid parameter in the request',
	2001101: 'No active license for the requested scope',
	2001304: 'Account not found',
	2001399: 'Invalid field name',
};

/**
 * Parse a Fortnox error response and return a NodeApiError with an
 * English translation of the error message when available.
 */
function parseFortnoxError(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	error: any,
): NodeApiError {
	// Try multiple paths to find the Fortnox ErrorInformation envelope
	const errorInfo =
		error.cause?.response?.body?.ErrorInformation ??
		error.body?.ErrorInformation ??
		error.description?.ErrorInformation;

	if (errorInfo) {
		const { message, code } = errorInfo as { message: string; code: number };
		const englishMessage = FORTNOX_ERROR_MAP[code] ?? message;
		return new NodeApiError(this.getNode(), error as JsonObject, {
			message: englishMessage,
			description: `Fortnox error ${code}: ${message}`,
			httpCode: error.httpCode,
		});
	}

	return new NodeApiError(this.getNode(), error as JsonObject);
}

/**
 * Send an authenticated request to the Fortnox API with automatic
 * rate-limit retry using exponential backoff on HTTP 429 responses.
 */
export async function fortnoxApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<any> {
	const options: IHttpRequestOptions = {
		method,
		url: `${FORTNOX_API_BASE}${endpoint}`,
		qs,
		json: true,
	};

	// Only set body if it has keys -- action endpoints (bookkeep, cancel,
	// credit) need empty bodies and should NOT send {}
	if (Object.keys(body).length > 0) {
		options.body = body;
	}

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		try {
			return await this.helpers.httpRequestWithAuthentication.call(
				this,
				'fortnoxApi',
				options,
			);
		} catch (error: any) {
			// Rate limit: retry with exponential backoff
			if (error.httpCode === '429' && attempt < MAX_RETRIES) {
				const delay = BASE_DELAY_MS * Math.pow(2, attempt);
				await sleep(delay);
				continue;
			}

			// Translate Fortnox error envelope to English
			throw parseFortnoxError.call(this, error);
		}
	}
}

/**
 * Paginate through all pages of a Fortnox list endpoint using
 * MetaInformation.@TotalPages, accumulating all results.
 */
export async function fortnoxApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	resourceKey: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<IDataObject[]> {
	const returnData: IDataObject[] = [];
	qs.limit = 500; // Fortnox max per page
	qs.page = 1;

	let totalPages: number;
	do {
		const response = await fortnoxApiRequest.call(
			this,
			method,
			endpoint,
			body,
			qs,
		);
		const items = response[resourceKey] as IDataObject[] | undefined;
		if (items) {
			returnData.push(...items);
		}
		totalPages =
			(response.MetaInformation?.['@TotalPages'] as number | undefined) ?? 1;
		qs.page = (qs.page as number) + 1;
	} while ((qs.page as number) <= totalPages);

	return returnData;
}
