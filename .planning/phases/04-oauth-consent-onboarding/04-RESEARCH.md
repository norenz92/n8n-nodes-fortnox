# Phase 4: OAuth Consent Onboarding - Research

**Researched:** 2026-02-27
**Domain:** Fortnox OAuth2 Authorization Code Flow + n8n Workflow Template
**Confidence:** HIGH

## Summary

This phase delivers an n8n workflow template (JSON file) that implements a Fortnox OAuth consent flow for client self-service onboarding. The workflow uses two webhook endpoints: `/start` redirects clients to the Fortnox OAuth consent screen, and `/callback` receives the authorization code, exchanges it for an access token, decodes the JWT to extract the TenantId, verifies consent via `/3/companyinformation`, stores the result in an n8n Data Table, sends a Slack notification, and returns a styled HTML success page.

The Fortnox authorization code endpoint is `GET https://apps.fortnox.se/oauth-v1/auth` with parameters `client_id`, `redirect_uri`, `response_type=code`, `scope`, `state`, and `account_type=service`. The token exchange uses `POST https://apps.fortnox.se/oauth-v1/token` with Basic auth and `grant_type=authorization_code`. Critically, the TenantId is NOT in the token response body -- it must be extracted either by decoding the JWT access token (the `tenantId` claim in the payload) or by calling `/3/companyinformation` and reading the `DatabaseNumber` field. Since the existing credential type already uses `client_credentials` grant with a `TenantId` header, this workflow's purpose is purely to capture TenantId values from new clients.

**Primary recommendation:** Build the workflow as a self-contained JSON file in `/workflows` directory. Use n8n's Code node with `Buffer.from(token.split('.')[1], 'base64').toString()` for JWT decoding (no external libraries). Use the Data Table node for upsert storage. Use Respond to Webhook node with `respondWith: text` for HTML pages. Store CSRF state tokens using workflow static data with a TTL cleanup pattern.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Delivered as an **n8n workflow template** (JSON) bundled inside the npm package in a `/workflows` directory
- Two separate Webhook nodes: `/webhook/fortnox-consent/start` (initiates flow) and `/webhook/fortnox-consent/callback` (receives OAuth response)
- Fixed, human-readable webhook paths (not n8n-generated random IDs)
- Workflow references the existing **FortnoxApi credential** for ClientId and ClientSecret (TenantId field left blank/placeholder)
- Stateless: one shared /start URL works for any client -- agency shares the same link
- After token exchange, workflow calls `/3/companyinformation` to **verify consent** and retrieve the company name
- Redirect URI auto-detected from request Host header (no manual configuration)
- Captured TenantId stored in an **n8n table** with fields: TenantId, Company Name, Scopes Granted, Timestamp
- **Upsert** behavior: if same TenantId already exists, update the row (prevents duplicates)
- **Slack notification** sent when a new client completes consent (includes company name and TenantId)
- Agency **manually copies** TenantId from the n8n table to create a new FortnoxApi credential in n8n
- Client clicks /start link and gets **direct redirect** to Fortnox OAuth consent screen (no landing page)
- Success page: **styled HTML** showing "[Company Name] has been authorized. You can close this page."
- Error page: **styled HTML** with "Something went wrong. Please contact [Agency] for help." -- no technical details
- Minimal CSS: centered layout, readable font, green checkmark for success, red X for error
- OAuth flow uses **state parameter** with random token for CSRF protection (validated on callback)
- `account_type=service` included in authorization URL (required by Fortnox for service accounts)
- **Sticky notes** throughout the workflow explaining each step
- Setup instructions in sticky notes: 1) Register redirect_uri in Fortnox Developer Portal, 2) Activate workflow, 3) Share /start URL with clients

### Claude's Discretion
- Scopes configuration: hardcoded vs configurable (pick what fits best)
- Whether to include `access_type=offline` in authorization URL (research Fortnox docs)
- State token storage mechanism (workflow static data, cache, etc.)
- Exact HTML/CSS for success and error pages
- Slack message format and content

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-05 | OAuth authorization code flow with `account_type=service` captures client consent and TenantId | Fortnox auth endpoint `GET https://apps.fortnox.se/oauth-v1/auth` with `account_type=service` parameter; token exchange at `POST https://apps.fortnox.se/oauth-v1/token` with `grant_type=authorization_code`; TenantId extracted from JWT access token payload claim or `/3/companyinformation` DatabaseNumber field |
| AUTH-06 | Shareable authorization endpoint that clients visit to initiate OAuth consent | Webhook node at `/webhook/fortnox-consent/start` constructs Fortnox authorization URL with client_id, redirect_uri (auto-detected from Host header), response_type=code, scope, state, account_type=service and returns 302 redirect |
| AUTH-07 | TenantId is extracted from OAuth response and stored in n8n credential automatically | TenantId decoded from JWT access token using Code node (`Buffer.from(token.split('.')[1], 'base64').toString()`); stored in n8n Data Table via upsert; agency manually copies to FortnoxApi credential (per user decision -- "automatically" here means captured without manual OAuth steps) |

</phase_requirements>

## Standard Stack

### Core
| Library/Node | Version | Purpose | Why Standard |
|-------------|---------|---------|--------------|
| n8n-nodes-base.webhook | v2 | Two HTTP endpoints (/start and /callback) | Native n8n trigger node; supports GET method, custom path, and response modes |
| n8n-nodes-base.respondToWebhook | v1 | Return HTML success/error pages to client browser | Supports `respondWith: text` which sends HTML with Content-Type: text/html |
| n8n-nodes-base.httpRequest | v4 | POST to Fortnox token exchange endpoint | Supports form-urlencoded body, custom headers, Basic auth |
| n8n-nodes-base.code | v2 | JWT decoding, state token generation, redirect URI construction | Node.js runtime with Buffer.from() for base64 JWT decoding |
| n8n-nodes-base.dataTable | v1 | Store TenantId, Company Name, Scopes, Timestamp | Built-in n8n persistent storage with upsert support |
| n8n-nodes-base.slack | v2 | Send notification when client completes consent | Standard n8n Slack integration |
| n8n-nodes-base.if | v2 | Branch on state validation success/failure, error handling | Standard conditional routing |
| n8n-nodes-base.stickyNote | v1 | Workflow documentation and setup instructions | Built-in workflow annotation |

### Supporting
| Library/Node | Version | Purpose | When to Use |
|-------------|---------|---------|-------------|
| n8n-nodes-base.set (Edit Fields) | v3 | Shape data between nodes | When restructuring fields for Data Table upsert or Slack message |
| n8n-nodes-base.crypto | v1 | Generate random state token | Alternative to Code node for UUID generation (Code node may be simpler) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Code node for JWT decode | n8n-nodes-base.jwt (Decode operation) | JWT node is cleaner but may not exist in all n8n versions; Code node with Buffer.from() is universally available |
| Data Table for state tokens | Workflow static data ($getWorkflowStaticData) | Static data has known reliability issues on n8n Cloud and under high-frequency executions; Data Table is more reliable but adds a second table |
| Respond to Webhook for HTML | Direct webhook response mode | Respond to Webhook gives full control over Content-Type, response code, and body; direct mode cannot return HTML |

**No npm installation needed.** This phase produces a JSON workflow file, not TypeScript code. All nodes used are built-in n8n core nodes.

## Architecture Patterns

### Recommended Project Structure
```
workflows/
  fortnox-consent-onboarding.json    # The complete workflow template
```

The workflow JSON is bundled in the npm package alongside the node. The `package.json` `files` array must include `"workflows"` to ship it.

### Pattern 1: Two-Webhook OAuth Flow
**What:** Two webhook nodes in the same workflow -- one initiates the OAuth flow (/start), the other receives the callback (/callback). The /start webhook constructs the authorization URL and responds with a 302 redirect. The /callback webhook processes the authorization code and responds with HTML.
**When to use:** Any OAuth consent flow where the redirect must go to the same n8n instance.
**Key details:**
- Webhook node `responseMode` must be set to `responseNode` (Using 'Respond to Webhook' Node) for both webhooks to allow custom responses
- /start webhook: GET method, responds with 302 redirect via Respond to Webhook node with redirect header
- /callback webhook: GET method (Fortnox redirects with query params), processes code and state, responds with HTML

### Pattern 2: Redirect URI Auto-Detection
**What:** Extract the Host header from the incoming /start request and construct the callback redirect_uri dynamically.
**When to use:** When the workflow must work on any n8n instance without manual URL configuration.
**Example (Code node):**
```javascript
// In /start Code node
const host = $json.headers.host;
const protocol = $json.headers['x-forwarded-proto'] || 'https';
const redirectUri = `${protocol}://${host}/webhook/fortnox-consent/callback`;
```
**Important:** Use `x-forwarded-proto` header when n8n is behind a reverse proxy (common in production). Fall back to `https`.

### Pattern 3: CSRF State Token with Data Table
**What:** Generate a random state token on /start, store it in a Data Table with a timestamp, pass it in the OAuth state parameter, then validate on /callback by looking up the token in the Data Table and checking it hasn't expired.
**When to use:** When CSRF protection is needed across two separate webhook executions.
**Why not static data:** Workflow static data (`$getWorkflowStaticData`) has known reliability issues -- data sometimes fails to persist between production executions, especially on n8n Cloud. A Data Table is more reliable.
**Example (Code node for /start):**
```javascript
// Generate random state token
const crypto = require('crypto');
const state = crypto.randomBytes(32).toString('hex');
return [{ json: { state, createdAt: new Date().toISOString() } }];
```
**Validation (Code node for /callback):**
```javascript
const receivedState = $json.query.state;
const storedStates = $input.all(); // From Data Table lookup
const match = storedStates.find(s => s.json.state === receivedState);
if (!match) throw new Error('Invalid state parameter');
// Check TTL (10 minutes max)
const age = Date.now() - new Date(match.json.createdAt).getTime();
if (age > 10 * 60 * 1000) throw new Error('State token expired');
```

### Pattern 4: JWT TenantId Extraction
**What:** Decode the Fortnox access token (a JWT) to extract the TenantId claim without signature verification.
**When to use:** After the token exchange, to obtain the TenantId.
**Example (Code node):**
```javascript
const accessToken = $json.access_token;
const payload = JSON.parse(
  Buffer.from(accessToken.split('.')[1], 'base64').toString()
);
const tenantId = payload.tenantId;
return [{ json: { tenantId, accessToken, ...payload } }];
```
**Verification:** Also call `/3/companyinformation` with the access token to get the CompanyName and confirm `DatabaseNumber === tenantId`.

### Anti-Patterns to Avoid
- **Storing state in workflow static data:** Known reliability issues; use Data Table instead
- **Hardcoding redirect_uri:** Makes the workflow non-portable across n8n instances
- **Using refresh tokens:** The existing credential type uses `client_credentials` grant with TenantId header; refresh tokens from the authorization code flow are not needed and should be discarded
- **Skipping state parameter validation:** Enables CSRF attacks; always validate
- **Using `access_type=offline` in authorization URL:** NOT needed. The consent flow only captures TenantId; actual API access uses `client_credentials` grant which doesn't need refresh tokens. Including `access_type=offline` would request unnecessary refresh token capabilities.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Random token generation | Custom math-based random | `crypto.randomBytes(32).toString('hex')` in Code node | Cryptographically secure randomness |
| JWT decoding | Full JWT library | `Buffer.from(token.split('.')[1], 'base64').toString()` | No signature verification needed per Fortnox docs; no library dependency |
| HTML response pages | Complex template engine | Inline HTML string in Respond to Webhook node | Simple success/error pages don't need templating |
| Persistent storage | External database | n8n Data Table node with upsert | Built-in, no external dependencies |
| Notification delivery | Custom webhook/email | n8n Slack node | Agency already uses Slack per requirements |

**Key insight:** Everything in this workflow uses built-in n8n core nodes. Zero external dependencies. The workflow JSON must be self-contained and portable.

## Common Pitfalls

### Pitfall 1: iframe Sandbox on HTML Responses
**What goes wrong:** Since n8n v1.103.0, HTML returned by Respond to Webhook is wrapped in a sandboxed iframe. This breaks JavaScript, localStorage access, and relative URLs.
**Why it happens:** n8n added iframe sandboxing as a security measure to protect instance users.
**How to avoid:** Keep HTML pages purely static -- no JavaScript, no localStorage, no relative URLs. The success/error pages are simple informational displays, so this isn't a blocker. If the agency needs to disable sandboxing, set `N8N_INSECURE_DISABLE_WEBHOOK_IFRAME_SANDBOX=true`.
**Warning signs:** HTML page renders but interactive elements don't work; page appears in a smaller viewport.

### Pitfall 2: TenantId Not in Token Response Body
**What goes wrong:** Developer expects TenantId in the token exchange JSON response and doesn't find it.
**Why it happens:** Fortnox returns `access_token`, `refresh_token`, `scope`, `expires_in`, `token_type` in the response body. TenantId is embedded as a JWT claim inside the access_token, not as a separate field.
**How to avoid:** Always decode the JWT access token to extract TenantId. Double-verify by calling `/3/companyinformation` and checking `DatabaseNumber`.
**Warning signs:** Getting `undefined` for TenantId when reading response body directly.

### Pitfall 3: Missing `companyinformation` Scope
**What goes wrong:** The `/3/companyinformation` verification call returns 403 or scope error.
**Why it happens:** The `companyinformation` scope wasn't included in the authorization URL scope parameter.
**How to avoid:** Always include `companyinformation` in the scopes list (it's needed for the verification step and for the existing credential type's test request).
**Warning signs:** Token exchange succeeds but company info call fails.

### Pitfall 4: Redirect URI Mismatch
**What goes wrong:** Fortnox returns an error during the OAuth flow because the redirect_uri doesn't match.
**Why it happens:** The redirect_uri in the authorization request doesn't exactly match the one registered in the Fortnox Developer Portal, or the auto-detected URI uses `http://` when Fortnox expects `https://`.
**How to avoid:** Document clearly in sticky notes that the agency must register `https://<n8n-host>/webhook/fortnox-consent/callback` in the Fortnox Developer Portal. Use `x-forwarded-proto` header to detect HTTPS behind reverse proxies.
**Warning signs:** OAuth error during redirect, "redirect_uri mismatch" message.

### Pitfall 5: State Token Race Condition
**What goes wrong:** Multiple clients authorizing simultaneously could cause state validation issues if using a simple key-value store.
**Why it happens:** Each /start creates a state token, and each /callback must validate the correct one.
**How to avoid:** Store each state token as a separate row in the Data Table (keyed by the token value itself). Look up by exact match on callback. Clean up expired tokens periodically or on each /start.
**Warning signs:** Valid clients getting "invalid state" errors intermittently.

### Pitfall 6: Authorization Code 10-Minute Expiry
**What goes wrong:** Client takes too long on the Fortnox consent screen, code expires.
**Why it happens:** Fortnox authorization codes expire after 10 minutes.
**How to avoid:** The workflow can't prevent this, but the error page should be user-friendly: "Something went wrong. Please contact [Agency] for help." with no technical details. The agency can simply share the /start link again.
**Warning signs:** Token exchange returns an error about invalid/expired code.

## Code Examples

### Complete /start Webhook Flow (Code Node)
```javascript
// Generate state token and construct Fortnox authorization URL
const crypto = require('crypto');

const state = crypto.randomBytes(32).toString('hex');
const host = $json.headers.host;
const protocol = $json.headers['x-forwarded-proto'] || 'https';
const redirectUri = `${protocol}://${host}/webhook/fortnox-consent/callback`;

// Scopes: all 18 from the credential type (request all upfront per AUTH-08)
const scopes = [
  'archive', 'article', 'assets', 'bookkeeping', 'companyinformation',
  'costcenter', 'currency', 'customer', 'invoice', 'offer',
  'order', 'price', 'print', 'project', 'salary',
  'settings', 'supplier', 'supplierinvoice'
].join(' ');

const clientId = $json.credential_clientId; // From FortnoxApi credential

const authUrl = new URL('https://apps.fortnox.se/oauth-v1/auth');
authUrl.searchParams.set('client_id', clientId);
authUrl.searchParams.set('redirect_uri', redirectUri);
authUrl.searchParams.set('scope', scopes);
authUrl.searchParams.set('state', state);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('account_type', 'service');

return [{
  json: {
    authorizationUrl: authUrl.toString(),
    state,
    redirectUri,
    createdAt: new Date().toISOString()
  }
}];
```

### Token Exchange (HTTP Request Node Config)
```json
{
  "name": "Exchange Code for Token",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "https://apps.fortnox.se/oauth-v1/token",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpBasicAuth",
    "sendBody": true,
    "contentType": "form-urlencoded",
    "bodyParameters": {
      "parameters": [
        { "name": "grant_type", "value": "authorization_code" },
        { "name": "code", "value": "={{ $json.query.code }}" },
        { "name": "redirect_uri", "value": "={{ $json.redirectUri }}" }
      ]
    }
  }
}
```
Note: Basic auth credentials (ClientId:ClientSecret) come from the FortnoxApi credential. The workflow needs to extract these from the credential and pass them as Basic auth header. This may require a Code node to construct the header manually since the workflow JSON references a credential, not a predefined HTTP Basic Auth credential.

### JWT TenantId Extraction (Code Node)
```javascript
// Decode JWT access token to extract TenantId
const accessToken = $json.access_token;
const parts = accessToken.split('.');
if (parts.length !== 3) {
  throw new Error('Invalid JWT format in access token');
}
const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
return [{
  json: {
    tenantId: String(payload.tenantId),
    accessToken,
    scope: $json.scope,
    expiresIn: $json.expires_in
  }
}];
```

### Company Info Verification (HTTP Request Node)
```json
{
  "name": "Verify Consent",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "GET",
    "url": "https://api.fortnox.se/3/companyinformation",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        { "name": "Authorization", "value": "=Bearer {{ $json.accessToken }}" }
      ]
    }
  }
}
```

### Success HTML Page
```html
<!DOCTYPE html>
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
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    .success { color: #28a745; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; font-weight: 600; }
    p { color: #666; font-size: 1rem; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon success">&#10004;</div>
    <h1>{{COMPANY_NAME}} has been authorized</h1>
    <p>You can close this page.</p>
  </div>
</body>
</html>
```

### Error HTML Page
```html
<!DOCTYPE html>
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
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    .error { color: #dc3545; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; font-weight: 600; }
    p { color: #666; font-size: 1rem; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon error">&#10008;</div>
    <h1>Something went wrong</h1>
    <p>Please contact your agency for help.</p>
  </div>
</body>
</html>
```

### Sticky Note (Setup Instructions)
```json
{
  "parameters": {
    "content": "## Fortnox Consent Onboarding\n\n### Setup Instructions\n1. **Register redirect URI** in Fortnox Developer Portal:\n   `https://<your-n8n-host>/webhook/fortnox-consent/callback`\n2. **Connect FortnoxApi credential** to the workflow (ClientId + ClientSecret from your Fortnox app)\n3. **Connect Slack credential** (optional, for notifications)\n4. **Activate this workflow**\n5. **Share this link** with clients:\n   `https://<your-n8n-host>/webhook/fortnox-consent/start`\n\n### How it works\nClients click the link, authorize on Fortnox, and their TenantId is captured in the Data Table below. Copy the TenantId to create a new FortnoxApi credential in n8n.",
    "width": 560,
    "height": 380,
    "color": 4
  },
  "name": "Setup Instructions",
  "type": "n8n-nodes-base.stickyNote",
  "typeVersion": 1,
  "position": [100, 60]
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Refresh token flow for Fortnox | Client credentials with TenantId | 2024 | No need for `access_type=offline`; consent only captures TenantId |
| Fortnox legacy API-Key auth | OAuth2 with JWT access tokens | 2023 | TenantId available as JWT claim |
| n8n external database for storage | n8n Data Tables (built-in) | 2025 | No external database dependency |
| Plain HTML webhook responses | Sandboxed iframe HTML responses | n8n v1.103.0 (2024) | HTML is sandboxed; keep pages static, no JS needed |

**Deprecated/outdated:**
- `access_type=offline` in Fortnox authorization URL: Not needed when using client_credentials grant. The consent flow only needs to capture TenantId; the existing credential type handles token acquisition via client_credentials.
- Fortnox legacy API-Key activation: Replaced by OAuth2 flow.

## Discretion Recommendations

### Scopes: Hardcode all 18 scopes
**Recommendation:** Hardcode all 18 Fortnox scopes in the authorization URL. The credential type already defines all 18 scopes as options with 5 defaults. Per AUTH-08, "all foreseeable Fortnox scopes requested upfront during consent (to avoid re-authorization)." Making this configurable in a workflow template adds complexity for no benefit -- the agency can edit the JSON if they want fewer scopes.
**Confidence:** HIGH -- aligns with AUTH-08 requirement and simplifies the workflow.

### access_type=offline: Do NOT include
**Recommendation:** Omit `access_type=offline` from the authorization URL. The existing credential type uses `client_credentials` grant which gets fresh access tokens using ClientId + ClientSecret + TenantId. Refresh tokens are unnecessary and would add unused complexity. The consent flow only needs to capture the TenantId.
**Confidence:** HIGH -- verified against existing FortnoxApi.credentials.ts implementation.

### State token storage: Data Table (not static data)
**Recommendation:** Use a second Data Table ("Consent States") to store CSRF state tokens with timestamps. Workflow static data (`$getWorkflowStaticData`) has documented reliability issues -- data sometimes fails to persist between executions, especially on n8n Cloud. A Data Table is persistent and reliable. Clean up expired tokens (older than 10 minutes) on each /start invocation.
**Confidence:** MEDIUM -- Data Table is more reliable than static data, but adds a second table. If the user prefers simplicity, a Code node can generate a signed state token (HMAC with ClientSecret as key) that encodes timestamp, eliminating the need for any storage. This self-validating approach is a viable alternative.

### HTML/CSS: Minimal, static, no JavaScript
**Recommendation:** Use the HTML examples in the Code Examples section. Keep it purely static -- no JavaScript, no external resources, no relative URLs. This avoids all iframe sandbox issues.
**Confidence:** HIGH -- the iframe sandbox in n8n v1.103.0+ doesn't affect purely static HTML.

### Slack message format
**Recommendation:** Use a simple text message with Block Kit formatting for readability:
```
:white_check_mark: New Fortnox Consent
*Company:* {{companyName}}
*TenantId:* {{tenantId}}
*Scopes:* {{scopes}}
*Time:* {{timestamp}}
```
**Confidence:** HIGH -- standard Slack message formatting.

## Open Questions

1. **Credential field access in workflow**
   - What we know: The workflow references a FortnoxApi credential for ClientId and ClientSecret
   - What's unclear: How to read credential fields (ClientId, ClientSecret) from within a Code node in the workflow template. n8n may not expose credential fields to workflow expressions directly.
   - Recommendation: Research whether `$credentials.fortnoxApi.clientId` works in Code nodes. Alternative: Use an HTTP Request node with the credential attached and extract the Basic auth header, or hardcode a placeholder that the user fills in via sticky note instructions.

2. **Data Table creation in workflow template**
   - What we know: Data Tables exist within the n8n instance, not within the workflow JSON
   - What's unclear: Whether a workflow template can reference a Data Table that doesn't exist yet, or if the agency must create the table manually before importing
   - Recommendation: Add sticky note instructions to create the Data Table with specified columns before activating the workflow. The Data Table node may auto-create or prompt.

3. **Webhook path registration**
   - What we know: n8n webhooks use the `path` parameter, and the `webhookId` is used for production URL routing
   - What's unclear: Whether fixed paths like `fortnox-consent/start` work reliably across n8n versions, or if the webhookId must be set
   - Recommendation: Set both `path` and `webhookId` in the JSON to ensure consistent behavior.

4. **Fortnox JWT claim name**
   - What we know: Fortnox docs say "tenantId is available as its own claim within the token payload"
   - What's unclear: The exact claim key name (e.g., `tenantId`, `tenant_id`, `tid`, or something else)
   - Recommendation: During implementation, decode a real Fortnox JWT to confirm the claim name. Fallback: use `/3/companyinformation` DatabaseNumber as the definitive source and treat JWT decoding as optimization.

## Sources

### Primary (HIGH confidence)
- Fortnox Authorization Code Flow: https://www.fortnox.se/developer/authorization/get-authorization-code -- auth endpoint, parameters, response format
- Fortnox Token Exchange: https://www.fortnox.se/developer/authorization/get-access-token -- token endpoint, Basic auth, response fields
- Fortnox Client Credentials: https://www.fortnox.se/developer/authorization/get-access-token-using-client-credentials -- TenantId header requirement
- Fortnox Blog (Service Accounts): https://www.fortnox.se/developer/blog/say-goodbye-to-refresh-tokens- -- JWT TenantId claim, webhook events, DatabaseNumber == TenantId
- Fortnox Scopes: https://www.fortnox.se/developer/guides-and-good-to-know/scopes -- complete scope list
- n8n Webhook Node Docs: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/ -- path configuration, response modes
- n8n Respond to Webhook Docs: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook/ -- text response type, HTML support
- n8n Data Table Docs: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.datatable/ -- upsert operation, column types
- Context7 /n8n-io/n8n-docs -- webhook configuration, workflow JSON structure, response handling
- Existing FortnoxApi.credentials.ts in this project -- credential fields, preAuthentication with client_credentials

### Secondary (MEDIUM confidence)
- n8n Community: iframe sandbox workarounds -- https://community.n8n.io/t/how-can-i-disable-iframe-sandbox-for-html-webhook-response/189790
- n8n Community: workflow static data reliability -- https://community.n8n.io/t/workflow-static-data-not-persisting-between-production-executions/255097
- n8n Community: JWT decoding in Code node -- https://community.n8n.io/t/decoding-jwt-body-from-webhooks/8542

### Tertiary (LOW confidence)
- Exact Fortnox JWT claim name for TenantId -- Fortnox docs say "tenantId" is a claim but don't specify the exact key name; needs validation with real token

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all nodes are built-in n8n core nodes, well-documented
- Architecture: HIGH -- OAuth authorization code flow is well-understood; Fortnox endpoints verified from official docs
- Pitfalls: HIGH -- iframe sandbox, TenantId extraction, and state management all verified from multiple sources
- Fortnox JWT claim name: LOW -- official docs mention the claim exists but don't specify exact key; needs validation

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable domain; Fortnox OAuth and n8n core nodes change infrequently)
