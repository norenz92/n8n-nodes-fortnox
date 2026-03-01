# Research: Webhook-Based OAuth Nodes for Fortnox Consent Onboarding

## 1. n8n Webhook Node Patterns

### IWebhookDescription Interface

From `n8n-workflow` types, webhook nodes declare their webhooks in `description.webhooks`:

```typescript
interface IWebhookDescription {
  httpMethod: IHttpRequestMethods | string;
  isFullPath?: boolean;
  name: WebhookType;        // 'default' | 'setup'
  path: string;
  responseMode?: WebhookResponseMode | string;
  responseData?: WebhookResponseData | string;
  restartWebhook?: boolean;
  nodeType?: 'webhook' | 'form' | 'mcp';
  ndvHideUrl?: string | boolean;
  ndvHideMethod?: string | boolean;
}
```

### How webhook() Returns HTTP Redirects

The `webhook()` method returns `IWebhookResponseData`:

```typescript
interface IWebhookResponseData {
  workflowData?: INodeExecutionData[][];
  webhookResponse?: any;
  noWebhookResponse?: boolean;
}
```

For redirects, two approaches:

**Approach A: Direct response manipulation (recommended)**
Use `this.getResponseObject()` to get the Express response and manually send a 302:
```typescript
const res = this.getResponseObject();
res.writeHead(302, { Location: authUrl });
res.end();
return { noWebhookResponse: true };
```

**Approach B: webhookResponse**
Return the redirect as `webhookResponse` -- but this is less reliable for redirects since n8n may wrap the response.

Approach A is preferred for OAuth redirects because it gives full control over the HTTP response.

### How restartWebhook Works

When `restartWebhook: true` is set on a webhook, after the `webhook()` method returns, n8n keeps the webhook registration alive and waits for another request. This is used for multi-step flows where a single node needs to handle multiple sequential HTTP requests (e.g., form submit -> redirect -> callback).

However, this creates complexity: the same node's `webhook()` method is called again, and it must differentiate between the initial request and the callback using query parameters or path differences.

### One Node vs Two Nodes

**One node with restartWebhook:** The node would handle GET /start (redirect to Fortnox) and then GET /callback (receive code). Problem: both hits go to the same `webhook()` method on the same path. The node would need to inspect query params to differentiate. Also, the Fortnox redirect_uri must point to the same webhook URL, which makes the path handling complex. The `path` in `IWebhookDescription` is fixed at definition time.

**Two separate nodes (recommended):** FortnoxAuthStart handles the redirect, FortnoxAuthCallback handles the callback. Each has its own webhook URL. The user connects FortnoxAuthCallback's webhook URL as the redirect_uri in FortnoxAuthStart (via a parameter). This is simpler, more explicit, and follows n8n conventions where each trigger node has a single purpose.

**Decision: Two separate nodes.** This avoids `restartWebhook` complexity and gives users clear, single-purpose triggers.

## 2. Analysis of Existing Consent Workflow

The workflow (`workflows/fortnox-consent-onboarding.json`) implements:

### Full OAuth Flow
1. **Start:** Client visits `/webhook/fortnox-consent/start`
2. **State generation:** `crypto.randomBytes(32).toString('hex')` for CSRF
3. **Auth URL construction:** `https://apps.fortnox.se/oauth-v1/auth` with params:
   - `client_id`, `redirect_uri`, `response_type=code`, `scope` (all 18), `state`, `account_type=service`
4. **State storage:** Data Table "Consent States" (state, createdAt, redirectUri)
5. **Redirect:** 302 to Fortnox authorization URL
6. **Callback:** Fortnox redirects to `/webhook/fortnox-consent/callback` with `code` and `state`
7. **State validation:** Lookup in Data Table, check age < 10 minutes
8. **Token exchange:** POST to `https://apps.fortnox.se/oauth-v1/token` with `grant_type=authorization_code`, Basic auth
9. **JWT decode:** `JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())` to extract `tenantId`
10. **Verification:** GET `https://api.fortnox.se/3/companyinformation` with Bearer token
11. **Storage:** Upsert to "Fortnox Consents" Data Table
12. **Notification:** Slack message with company details
13. **Success page:** HTML response to client

### All 18 Fortnox Scopes (per AUTH-08)
```
archive article assets bookkeeping companyinformation costcenter currency
customer invoice offer order price print project salary settings supplier supplierinvoice
```

### Key Implementation Details
- `account_type=service` is required for service accounts
- JWT payload contains `tenantId` claim (numeric string)
- Company Information API returns `CompanyInformation.CompanyName`
- CSRF state has 10-minute expiry
- Error handling shows friendly HTML error page to clients

## 3. FortnoxAuthStart Node Design

**Type:** Webhook trigger node (group: `['trigger']`)
**Credential:** `fortnoxApi` (clientId + clientSecret only)
**No inputs, one output** (main)

### Parameters
- `callbackUrl` (string, required): The webhook URL of the FortnoxAuthCallback node. User pastes this from the callback node's settings.
- `scopes` (multiOptions): All 18 Fortnox scopes. Defaults to all 18 (per AUTH-08 decision to avoid re-authorization).

### Webhook Definition
```typescript
webhooks: [{
  name: 'default' as const,
  httpMethod: 'GET',
  responseMode: 'onReceived',
  path: 'start',
  nodeType: 'webhook',
}]
```

### webhook() Implementation
1. Get credentials (clientId)
2. Get callbackUrl parameter
3. Get scopes parameter
4. Generate CSRF state: `crypto.randomBytes(32).toString('hex')`
5. Construct Fortnox auth URL with all params including `account_type=service`
6. Return 302 redirect via `res.writeHead(302, { Location: authUrl }); res.end()`
7. Return `{ noWebhookResponse: true }` -- no workflow data output (this is just a redirect)

### CSRF State
For the two-node approach, CSRF state validation is not possible between independent trigger nodes without shared storage (Data Table). Since we are replacing the workflow approach, and the user will still use a Data Table node downstream for storage, CSRF validation is **out of scope for the nodes themselves**. The nodes provide the OAuth flow mechanics; the user can add state validation in their workflow if desired.

Alternative: We can pass the state through without validation -- the authorization_code grant is already secured by the code exchange with client credentials. CSRF state is a defense-in-depth measure that adds complexity in the node context.

**Decision: Skip CSRF state validation.** The FortnoxAuthStart generates a state for Fortnox's benefit (required param), but the FortnoxAuthCallback does not validate it against a stored value. The code exchange itself provides security.

## 4. FortnoxAuthCallback Node Design

**Type:** Webhook trigger node (group: `['trigger']`)
**Credential:** `fortnoxApi` (clientId + clientSecret)
**No inputs, one output** (main)

### Parameters
None required -- all data comes from Fortnox query params.

### Webhook Definition
```typescript
webhooks: [{
  name: 'default' as const,
  httpMethod: 'GET',
  responseMode: 'onReceived',
  path: 'callback',
  nodeType: 'webhook',
}]
```

### webhook() Implementation
1. Get query params: `code`, `state`, `error`
2. If `error` present or no `code`: return error HTML page via `webhookResponse`
3. Get credentials (clientId, clientSecret)
4. Get this node's webhook URL to use as redirect_uri for the token exchange
5. Exchange code: POST `https://apps.fortnox.se/oauth-v1/token` with `grant_type=authorization_code&code={code}&redirect_uri={redirectUri}`, Basic auth header
6. Decode JWT: `JSON.parse(Buffer.from(access_token.split('.')[1], 'base64').toString())` to extract `tenantId`
7. Verify by calling `https://api.fortnox.se/3/companyinformation` with Bearer token
8. Return success HTML page via `webhookResponse`
9. Return `workflowData` with: `{ tenantId, companyName, scopesGranted, timestamp }`

### HTML Pages
- **Success:** Shows company name and "Authorization successful" message
- **Error:** Shows generic "Something went wrong" message

## 5. Credential and API Node Changes

### FortnoxApi Credentials (simplified)
**Keep:**
- `clientId` (string, required)
- `clientSecret` (string, password, required)

**Remove:**
- `tenantId` -- moves to Fortnox node parameter
- `scopes` -- hardcoded in GenericFunctions (all 18 per AUTH-08)
- `accessToken` (hidden/expirable) -- no longer needed since we manage tokens manually
- `preAuthentication` method -- token fetching moves to GenericFunctions
- `test` request -- cannot test without tenantId; remove entirely

**Keep:**
- `authenticate` -- still needed for `httpRequestWithAuthentication` to attach Bearer token

**Decision on accessToken hidden field:** Remove it. Since tenantId is now per-node (not per-credential), the preAuthentication pattern cannot work (it doesn't know which tenantId to use). Token management moves entirely to GenericFunctions with a manual cache.

However, removing `authenticate` and `accessToken` means `httpRequestWithAuthentication` won't work as-is. The `fortnoxApiRequest` function currently uses `this.helpers.httpRequestWithAuthentication('fortnoxApi', options)`. Since we're removing preAuthentication and the hidden accessToken, we need to switch to `this.helpers.httpRequest` with manually attached Bearer tokens.

### GenericFunctions Changes

**New: Token cache**
```typescript
const tokenCache = new Map<string, { token: string; expiresAt: number }>();
```
Module-level Map keyed by `tenantId`. Each entry stores the access_token and its expiry timestamp (with 60-second buffer).

**New: getTokenForTenant()**
```typescript
async function getTokenForTenant(
  this: IExecuteFunctions,
  tenantId: string,
): Promise<string>
```
- Check cache for valid (non-expired) token
- If miss: POST to `https://apps.fortnox.se/oauth-v1/token` with `grant_type=client_credentials`, Basic auth from credentials, TenantId header, all 18 scopes
- Cache result with `Date.now() + (expires_in * 1000) - 60000` (60s buffer)
- Return access_token string

**Updated: fortnoxApiRequest()**
- Reads `tenantId` from `this.getNodeParameter('tenantId', 0)` (all items use same tenant)
- Calls `getTokenForTenant` to get a fresh/cached Bearer token
- Uses `this.helpers.httpRequest` directly instead of `httpRequestWithAuthentication`
- Attaches `Authorization: Bearer {token}` header manually
- Keeps rate-limit retry logic and error translation

**Updated: getAccessToken()**
- Reads tenantId from node parameter instead of credentials
- Reads scopes hardcoded (all 18) instead of from credentials

**Updated: fortnoxApiRequestAllItems()**
- No signature change needed -- it delegates to `fortnoxApiRequest` which handles tenantId internally

### Fortnox.node.ts Changes
- Add `tenantId` parameter (string, required) after Resource selector
- Remove `testedBy: 'fortnoxApiTest'` from credentials config
- Remove `methods.credentialTest.fortnoxApiTest` entirely
- All `fortnoxApiRequest.call(this, ...)` calls remain unchanged (tenantId read internally)

## 6. Recommended Approach

### Architecture Summary
- **Two separate webhook trigger nodes:** FortnoxAuthStart (redirect) and FortnoxAuthCallback (code exchange + JWT decode)
- **CSRF state:** Generated but not cross-validated between nodes (security via code exchange)
- **Token caching:** Module-level Map in GenericFunctions, keyed by tenantId, with expiry tracking
- **Credentials:** Only clientId + clientSecret (no tenantId, scopes, accessToken, or preAuthentication)
- **Fortnox API node:** tenantId as required string parameter, scopes hardcoded in GenericFunctions

### File Structure
```
nodes/
  FortnoxAuthStart/
    FortnoxAuthStart.node.ts      (webhook trigger)
    FortnoxAuthStart.node.json    (codex metadata)
    fortnox.svg                   (copy of icon)
  FortnoxAuthCallback/
    FortnoxAuthCallback.node.ts   (webhook trigger)
    FortnoxAuthCallback.node.json (codex metadata)
    fortnox.svg                   (copy of icon)
  Fortnox/
    Fortnox.node.ts               (updated: tenantId param, no credentialTest)
    GenericFunctions.ts           (updated: token cache, manual Bearer)
    ...existing description files...
credentials/
  FortnoxApi.credentials.ts       (simplified: clientId + clientSecret only)
```

### package.json Registration
```json
"nodes": [
  "dist/nodes/Fortnox/Fortnox.node.js",
  "dist/nodes/FortnoxAuthStart/FortnoxAuthStart.node.js",
  "dist/nodes/FortnoxAuthCallback/FortnoxAuthCallback.node.js"
]
```

### n8n Lint Rules for Webhook/Trigger Nodes
- `displayName` must be Title Case
- `group: ['trigger']` for trigger nodes
- No `inputs` (or empty inputs array) -- trigger nodes have no inputs
- `outputs: [NodeConnectionTypes.Main]`
- `usableAsTool: true` is optional for trigger nodes (usually false for triggers, since they are not invocable by AI agents)
- Node JSON codex must have valid categories and resource mappings

### Token Caching Strategy
The in-memory Map is sufficient for single-process n8n instances. For n8n Cloud (multi-process), each worker fetches its own token on first use, which is acceptable since client_credentials tokens are cheap to obtain and the cache prevents repeated calls within a single execution.

Cache key: tenantId string
Cache value: `{ token: string; expiresAt: number }`
Expiry buffer: 60 seconds before actual expiry
Cache clearing: Not needed (Map entries are overwritten on re-fetch)
