import type {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

const SUCCESS_HTML = (companyName: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Authorization Successful</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex; justify-content: center; align-items: center;
      min-height: 100vh; background: #f8f9fa; color: #333;
    }
    .container { text-align: center; padding: 2rem; max-width: 480px; }
    .icon { font-size: 4rem; margin-bottom: 1rem; color: #28a745; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; font-weight: 600; }
    p { color: #666; font-size: 1rem; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">&#10004;</div>
    <h1>${companyName} has been authorized</h1>
    <p>You can close this page.</p>
  </div>
</body>
</html>`;

const ERROR_HTML = (detail?: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Authorization Error</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex; justify-content: center; align-items: center;
      min-height: 100vh; background: #f8f9fa; color: #333;
    }
    .container { text-align: center; padding: 2rem; max-width: 480px; }
    .icon { font-size: 4rem; margin-bottom: 1rem; color: #dc3545; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; font-weight: 600; }
    p { color: #666; font-size: 1rem; line-height: 1.5; }
    .detail { margin-top: 1rem; padding: 1rem; background: #f1f1f1; border-radius: 6px; font-size: 0.85rem; color: #888; word-break: break-all; text-align: left; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">&#10008;</div>
    <h1>Something went wrong</h1>
    <p>Please contact your agency for help.</p>
    ${detail ? `<div class="detail">${detail}</div>` : ''}
  </div>
</body>
</html>`;

export class FortnoxAuthCallback implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Fortnox Auth Callback',
		name: 'fortnoxAuthCallback',
		icon: 'file:fortnox.svg',
		group: ['trigger'],
		version: 1,
		subtitle: 'OAuth callback handler',
		description:
			'Handles the Fortnox OAuth callback, exchanges the authorization code for a token, and outputs the tenantId and company information.',
		defaults: {
			name: 'Fortnox Auth Callback',
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
				path: 'callback',
				nodeType: 'webhook',
			},
		],
		properties: [],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const query = this.getQueryData() as IDataObject;
		const res = this.getResponseObject();

		// Handle error or missing code from Fortnox
		if (query.error || !query.code) {
			const detail = query.error
				? `Fortnox error: ${query.error} - ${query.error_description || 'no description'}`
				: 'No authorization code received from Fortnox';
			res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
			res.end(ERROR_HTML(detail));
			return { noWebhookResponse: true };
		}

		const code = query.code as string;

		try {
			const credentials = await this.getCredentials('fortnoxApi');
			const clientId = credentials.clientId as string;
			const clientSecret = credentials.clientSecret as string;

			// Reconstruct redirect_uri from the actual incoming request so it
			// matches exactly what was sent in the authorization request
			// (webhook-test vs webhook, etc.)
			const req = this.getRequestObject();
			const protocol = (req.headers['x-forwarded-proto'] as string) || 'https';
			const host = req.headers.host as string;
			const path = (req.originalUrl ?? req.url ?? '').split('?')[0];
			const webhookUrl = `${protocol}://${host}${path}`;

			const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
				'base64',
			);

			// Exchange authorization code for access token
			const tokenResponse = (await this.helpers.httpRequest({
				method: 'POST',
				url: 'https://apps.fortnox.se/oauth-v1/token',
				headers: {
					Authorization: `Basic ${basicAuth}`,
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: `grant_type=authorization_code&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(webhookUrl)}`,
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
			})) as { body: { access_token?: string; scope?: string; expires_in?: number; error?: string; error_description?: string }; statusCode: number };

			if (tokenResponse.statusCode >= 400) {
				const errBody = tokenResponse.body;
				throw new NodeOperationError(
					this.getNode(),
					`Token exchange failed (${tokenResponse.statusCode}): ${errBody.error || 'unknown'} - ${errBody.error_description || JSON.stringify(errBody)}. redirect_uri sent: ${webhookUrl}`,
				);
			}

			const tokenData = tokenResponse.body;

			if (!tokenData.access_token) {
				throw new NodeOperationError(
					this.getNode(),
					'Token exchange failed - no access_token in response',
				);
			}

			// Decode JWT to extract tenantId
			const parts = tokenData.access_token.split('.');
			if (parts.length !== 3) {
				throw new NodeOperationError(
					this.getNode(),
					'Invalid JWT format in access token',
				);
			}

			const payload = JSON.parse(
				Buffer.from(parts[1], 'base64').toString(),
			) as { tenantId?: string | number };

			if (!payload.tenantId) {
				throw new NodeOperationError(
					this.getNode(),
					'No tenantId claim found in JWT payload',
				);
			}

			const tenantId = String(payload.tenantId);

			// Verify consent by calling Company Information API
			let companyName = 'Unknown Company';
			try {
				const companyResponse = (await this.helpers.httpRequest({
					method: 'GET',
					url: 'https://api.fortnox.se/3/companyinformation',
					headers: {
						Authorization: `Bearer ${tokenData.access_token}`,
					},
				})) as { CompanyInformation?: { CompanyName?: string } };

				companyName =
					companyResponse.CompanyInformation?.CompanyName ?? 'Unknown Company';
			} catch {
				// Company info lookup failed; continue with unknown name
			}

			// Send success HTML to the client
			res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
			res.end(SUCCESS_HTML(companyName));

			// Return workflow data for downstream nodes
			return {
				noWebhookResponse: true,
				workflowData: [
					[
						{
							json: {
								tenantId,
								companyName,
								scopesGranted: tokenData.scope ?? '',
								timestamp: new Date().toISOString(),
							},
						},
					],
				],
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
			res.end(ERROR_HTML(message));
			return { noWebhookResponse: true };
		}
	}
}
