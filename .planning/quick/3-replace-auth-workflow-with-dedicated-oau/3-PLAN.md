---
phase: quick-3
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/3-replace-auth-workflow-with-dedicated-oau/3-RESEARCH.md
  - nodes/FortnoxAuthStart/FortnoxAuthStart.node.ts
  - nodes/FortnoxAuthStart/fortnox.svg
  - nodes/FortnoxAuthStart/FortnoxAuthStart.node.json
  - nodes/FortnoxAuthCallback/FortnoxAuthCallback.node.ts
  - nodes/FortnoxAuthCallback/fortnox.svg
  - nodes/FortnoxAuthCallback/FortnoxAuthCallback.node.json
  - nodes/Fortnox/Fortnox.node.ts
  - nodes/Fortnox/GenericFunctions.ts
  - credentials/FortnoxApi.credentials.ts
  - package.json
autonomous: true
requirements: []

must_haves:
  truths:
    - "A research document exists explaining the recommended architecture for webhook-based OAuth nodes in n8n"
    - "FortnoxAuthStart node exists as a webhook trigger that redirects to Fortnox OAuth consent screen"
    - "FortnoxAuthCallback node exists as a webhook trigger that handles the OAuth callback and outputs TenantId + company data"
    - "FortnoxApi credentials only require clientId and clientSecret (tenantId removed)"
    - "Fortnox API node accepts tenantId as a node parameter and uses it for token requests"
    - "Fortnox API node automatically fetches fresh access tokens using client_credentials grant with the per-item tenantId"
  artifacts:
    - path: ".planning/quick/3-replace-auth-workflow-with-dedicated-oau/3-RESEARCH.md"
      provides: "Research document with recommended architecture"
      min_lines: 50
    - path: "nodes/FortnoxAuthStart/FortnoxAuthStart.node.ts"
      provides: "Webhook node that initiates OAuth consent flow"
      exports: ["FortnoxAuthStart"]
    - path: "nodes/FortnoxAuthCallback/FortnoxAuthCallback.node.ts"
      provides: "Webhook node that handles OAuth callback"
      exports: ["FortnoxAuthCallback"]
    - path: "credentials/FortnoxApi.credentials.ts"
      provides: "Simplified credentials with only clientId and clientSecret"
    - path: "nodes/Fortnox/Fortnox.node.ts"
      provides: "Updated Fortnox node with tenantId parameter"
  key_links:
    - from: "nodes/FortnoxAuthStart/FortnoxAuthStart.node.ts"
      to: "https://apps.fortnox.se/oauth-v1/auth"
      via: "redirect URL construction with state, scopes, account_type=service"
      pattern: "oauth-v1/auth"
    - from: "nodes/FortnoxAuthCallback/FortnoxAuthCallback.node.ts"
      to: "https://apps.fortnox.se/oauth-v1/token"
      via: "authorization_code exchange and JWT decode"
      pattern: "oauth-v1/token"
    - from: "nodes/Fortnox/GenericFunctions.ts"
      to: "https://apps.fortnox.se/oauth-v1/token"
      via: "client_credentials grant with tenantId from node parameter"
      pattern: "client_credentials"
---

<objective>
Replace the JSON workflow-based Fortnox OAuth consent flow with two dedicated n8n nodes (FortnoxAuthStart and FortnoxAuthCallback), and refactor the Fortnox API node so that tenantId is a per-node parameter instead of a credential field. This eliminates the need for users to manually import a workflow and configure sticky notes -- they just drop nodes into a canvas.

Purpose: Simplify the onboarding experience for agencies. Instead of importing a complex workflow JSON with manual App Settings configuration, users get first-class n8n nodes with proper credential pickers and parameter fields.

Output: Research document + two new webhook trigger nodes + updated credentials + updated Fortnox API node.
</objective>

<execution_context>
@/Users/adamnoren/.claude/get-shit-done/workflows/execute-plan.md
@/Users/adamnoren/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@credentials/FortnoxApi.credentials.ts
@nodes/Fortnox/Fortnox.node.ts
@nodes/Fortnox/GenericFunctions.ts
@workflows/fortnox-consent-onboarding.json
@package.json
@tsconfig.json

<interfaces>
<!-- Key types and contracts from n8n-workflow that the executor needs -->

From n8n-workflow (INodeType with webhook support):
```typescript
export interface INodeType {
    description: INodeTypeDescription;
    webhook?(this: IWebhookFunctions): Promise<IWebhookResponseData>;
    webhookMethods?: {
        [name in WebhookType]?: {
            [method in WebhookSetupMethodNames]: (this: IHookFunctions) => Promise<boolean>;
        };
    };
}

export type WebhookType = 'default' | 'setup';

export interface IWebhookDescription {
    httpMethod: IHttpRequestMethods | string;
    isFullPath?: boolean;
    name: string;
    path: string;
    responseMode?: WebhookResponseMode | string;
    responseData?: WebhookResponseData | string;
    restartWebhook?: boolean;
    nodeType?: 'webhook' | 'form' | 'mcp';
}

export interface IWebhookResponseData {
    workflowData?: INodeExecutionData[][];
    webhookResponse?: any;
    noWebhookResponse?: boolean;
}

export interface IWebhookFunctions extends FunctionsBaseWithRequiredKeys<'getMode'> {
    getBodyData(): IDataObject;
    getHeaderData(): IncomingHttpHeaders;
    getNodeParameter(parameterName: string, fallbackValue?: any): NodeParameterValueType | object;
    getQueryData(): IDataObject;
    getRequestObject(): Request;
    getResponseObject(): Response;
    getWebhookName(): string;
    getNodeWebhookUrl(name: WebhookType): string | undefined;
    helpers: RequestHelperFunctions;
}
```

From current credentials (FortnoxApi.credentials.ts):
```typescript
// preAuthentication uses client_credentials grant with TenantId header
// authenticate uses Bearer token in Authorization header
// Currently has: accessToken (hidden/expirable), clientId, clientSecret, tenantId, scopes
```

From current GenericFunctions.ts:
```typescript
export async function fortnoxApiRequest(
    this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
    method: IHttpRequestMethods, endpoint: string,
    body?: IDataObject, qs?: IDataObject
): Promise<IDataObject>;

export async function getAccessToken(this: IExecuteFunctions): Promise<IDataObject>;

export async function fortnoxApiRequestAllItems(
    this: IExecuteFunctions | ILoadOptionsFunctions,
    method: IHttpRequestMethods, endpoint: string, resourceKey: string,
    body?: IDataObject, qs?: IDataObject
): Promise<IDataObject[]>;
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Research n8n webhook node patterns and design the OAuth node architecture</name>
  <files>.planning/quick/3-replace-auth-workflow-with-dedicated-oau/3-RESEARCH.md</files>
  <action>
Research and document the recommended architecture for replacing the workflow-based OAuth flow with dedicated n8n nodes. The research should cover:

1. **Study n8n webhook node patterns** -- Examine how n8n's built-in webhook node and other community nodes implement the `INodeType.webhook()` method and `IWebhookDescription`. Look at examples in the n8n source code or npm packages that use `restartWebhook: true` for multi-step flows (e.g., form triggers, OAuth triggers). Key questions:
   - How does a webhook node return an HTTP redirect (302) to the caller? (via `webhookResponse` in `IWebhookResponseData`)
   - How does `restartWebhook: true` work for callback-style flows where the node needs to receive a second request?
   - Can a single node handle both `/start` and `/callback` paths, or do we need two separate nodes?

2. **Analyze the existing consent workflow** (`workflows/fortnox-consent-onboarding.json`) to extract:
   - The full OAuth flow: Start URL -> generate state -> redirect to Fortnox -> callback -> validate state -> exchange code -> decode JWT -> extract tenantId -> verify company info
   - CSRF state management via Data Table (is this needed in a node context, or can we use simpler in-memory/staticData?)
   - All 18 Fortnox scopes hardcoded per AUTH-08
   - The `account_type=service` parameter requirement
   - JWT decoding to extract tenantId from access token payload

3. **Design the FortnoxAuthStart node** -- A webhook trigger node that:
   - Uses FortnoxApi credentials (clientId + clientSecret only, no tenantId)
   - Has configurable fields for: redirect URL (auto-detected from webhook URL or manual override), scopes (multiOptions with all 18), any other relevant OAuth params
   - On webhook hit: generates CSRF state, constructs Fortnox auth URL with all params, returns 302 redirect
   - Uses `restartWebhook: true` pattern OR is a standalone node paired with FortnoxAuthCallback

4. **Design the FortnoxAuthCallback node** -- A webhook trigger node that:
   - Uses FortnoxApi credentials (same clientId + clientSecret)
   - On webhook hit: receives code + state from Fortnox, exchanges code for token, decodes JWT to get tenantId, calls Company Information API to verify + get company name
   - Outputs structured data: `{ tenantId, companyName, scopesGranted, timestamp }` -- ready to store in a Data Table node downstream

5. **Design the credential and API node changes**:
   - Remove `tenantId` and `scopes` from FortnoxApi credentials (keep only clientId, clientSecret, accessToken hidden/expirable)
   - Remove `preAuthentication` from credentials (token fetching moves to GenericFunctions)
   - Add `tenantId` as a required string parameter on the Fortnox API node
   - Add `scopes` as a multiOptions parameter on the Fortnox API node (or hardcode all 18 if simpler -- research which is better)
   - Update `fortnoxApiRequest` to manually fetch tokens using client_credentials grant with the per-node tenantId, caching tokens in memory with expiry tracking
   - Decide: should scopes be on the API node or on the credential? (User said credential should only have clientId/clientSecret, so scopes must move somewhere)

6. **Recommend the approach** with:
   - Whether to use one node or two nodes for the OAuth flow
   - How to handle CSRF state (staticData vs ephemeral vs not needed)
   - How to handle token caching in the API node (in-memory cache keyed by tenantId, with expiry)
   - File structure and registration in package.json
   - Any n8n lint rules that affect webhook/trigger nodes (nodeType, group, inputs/outputs, usableAsTool)

Write the research document to `.planning/quick/3-replace-auth-workflow-with-dedicated-oau/3-RESEARCH.md`.

Important: Actually explore the n8n-workflow type definitions in `node_modules/n8n-workflow/dist/cjs/interfaces.d.ts` and look for real examples of webhook node implementations. Do NOT guess at patterns -- verify them from the type system. Also search npm or GitHub for examples of n8n community nodes that implement webhook-based OAuth.
  </action>
  <verify>
File `.planning/quick/3-replace-auth-workflow-with-dedicated-oau/3-RESEARCH.md` exists, is at least 50 lines, and covers all 6 sections above. The recommended approach section provides a clear, implementable architecture.
  </verify>
  <done>Research document exists with clear architecture recommendation covering: two-node vs one-node decision, webhook method signatures, CSRF state approach, credential simplification, API node token management, and file structure.</done>
</task>

<task type="auto">
  <name>Task 2: Create FortnoxAuthStart and FortnoxAuthCallback webhook nodes</name>
  <files>
    nodes/FortnoxAuthStart/FortnoxAuthStart.node.ts
    nodes/FortnoxAuthStart/fortnox.svg
    nodes/FortnoxAuthStart/FortnoxAuthStart.node.json
    nodes/FortnoxAuthCallback/FortnoxAuthCallback.node.ts
    nodes/FortnoxAuthCallback/fortnox.svg
    nodes/FortnoxAuthCallback/FortnoxAuthCallback.node.json
  </files>
  <action>
Based on the research document from Task 1, implement the two OAuth webhook nodes.

**FortnoxAuthStart node** (`nodes/FortnoxAuthStart/FortnoxAuthStart.node.ts`):
- Implements `INodeType` with `webhook()` method
- `description.webhooks` array with `{ name: 'default', httpMethod: 'GET', responseMode: 'onReceived', path: 'start', restartWebhook: true }` (adjust based on research findings)
- Credential: `fortnoxApi` (clientId + clientSecret only)
- Parameters:
  - `scopes`: multiOptions with all 18 Fortnox scopes, defaults to the 5 core ones (companyinformation, invoice, customer, article, order)
  - `redirectUrl`: string, optional, description explains it auto-detects from callback webhook URL if left empty
- `webhook()` method:
  1. Gets credentials (clientId)
  2. Gets scopes from node parameter
  3. Generates random state token (crypto.randomBytes(32).toString('hex'))
  4. Stores state in workflow staticData (or approach from research)
  5. Constructs Fortnox authorization URL: `https://apps.fortnox.se/oauth-v1/auth?client_id={}&redirect_uri={}&response_type=code&scope={}&state={}&account_type=service`
  6. Returns `{ webhookResponse: redirect 302 to auth URL }` -- the response object approach for redirects (set Location header + 302 status)
  7. Does NOT return workflowData yet -- uses restartWebhook to wait for callback (if single-node approach from research)
- Copy `nodes/Fortnox/fortnox.svg` to `nodes/FortnoxAuthStart/fortnox.svg`
- Create `FortnoxAuthStart.node.json` with codex metadata (category: "Finance & Accounting")
- displayName: "Fortnox Auth Start"
- group: ['trigger']
- n8n lint requirements: Title Case displayName, NodeConnectionTypes.Main for outputs, no inputs (it's a trigger)

**FortnoxAuthCallback node** (`nodes/FortnoxAuthCallback/FortnoxAuthCallback.node.ts`):
- Implements `INodeType` with `webhook()` method
- `description.webhooks` array with `{ name: 'default', httpMethod: 'GET', responseMode: 'onReceived', path: 'callback' }`
- Credential: `fortnoxApi` (clientId + clientSecret)
- Parameters: none required (everything comes from query params)
- `webhook()` method:
  1. Gets query params: code, state (and error if consent denied)
  2. If error param present: return error HTML page to user (like the workflow's Show Error Page)
  3. Gets credentials (clientId, clientSecret)
  4. Exchanges authorization code for token: POST to `https://apps.fortnox.se/oauth-v1/token` with `grant_type=authorization_code&code={}&redirect_uri={}`, Basic auth header
  5. Decodes JWT access token: `JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())` to extract `tenantId`
  6. Verifies by calling `https://api.fortnox.se/3/companyinformation` with Bearer token to get company name
  7. Returns success HTML page to the client browser (via webhookResponse)
  8. Returns workflowData with: `{ tenantId, companyName, scopesGranted, timestamp }` for downstream nodes (e.g., store in Data Table)
- Copy `nodes/Fortnox/fortnox.svg` to `nodes/FortnoxAuthCallback/fortnox.svg`
- Create `FortnoxAuthCallback.node.json` with codex metadata
- displayName: "Fortnox Auth Callback"
- group: ['trigger']
- n8n lint requirements: same as above

Important implementation notes:
- Use `this.getResponseObject()` and `this.getRequestObject()` in the webhook method to handle HTTP responses
- For the redirect in AuthStart: set `res.setHeader('Location', authUrl); res.status(302).end();` and return `{ noWebhookResponse: true }` (since we're handling the response ourselves) -- OR use the `webhookResponse` pattern from research
- The redirect URL for the callback must be the FortnoxAuthCallback node's webhook URL. The user will need to configure this or it must be documented. Consider adding a `callbackUrl` parameter on the AuthStart node where the user pastes the FortnoxAuthCallback webhook URL.
- Both nodes should handle errors gracefully and return user-friendly HTML error pages
  </action>
  <verify>
Run `npx tsc --noEmit` -- no type errors. Both node files exist with proper exports. The `fortnox.svg` is copied to both directories.
  </verify>
  <done>FortnoxAuthStart and FortnoxAuthCallback nodes exist, compile without errors, and implement the webhook-based OAuth flow. AuthStart redirects to Fortnox. AuthCallback exchanges code, decodes JWT, returns tenantId + company data as workflow output.</done>
</task>

<task type="auto">
  <name>Task 3: Refactor credentials, Fortnox API node, and package.json registration</name>
  <files>
    credentials/FortnoxApi.credentials.ts
    nodes/Fortnox/GenericFunctions.ts
    nodes/Fortnox/Fortnox.node.ts
    package.json
  </files>
  <action>
Refactor the credential type, API request functions, and main Fortnox node to move tenantId from credentials to node parameters, and register the new nodes in package.json.

**1. Simplify FortnoxApi credentials** (`credentials/FortnoxApi.credentials.ts`):
- Remove the `tenantId` property from `properties` array
- Remove the `scopes` multiOptions property from `properties` array
- Remove the `preAuthentication` method entirely (token management moves to GenericFunctions)
- Keep: `accessToken` (hidden, expirable), `clientId`, `clientSecret`
- Keep: `authenticate` (Bearer token from accessToken)
- Update `test` to be simpler or remove it (since we can't test without tenantId in credentials). Replace with a basic test that just verifies the clientId/clientSecret are non-empty, OR remove the test credential method entirely and rely on the node-level credential test in Fortnox.node.ts

**2. Update GenericFunctions.ts** (`nodes/Fortnox/GenericFunctions.ts`):
- Add a token cache: `const tokenCache = new Map<string, { token: string; expiresAt: number }>();` at module level
- Add a `getTokenForTenant` function that:
  - Accepts `this: IExecuteFunctions`, `tenantId: string`
  - Checks cache for valid token (not expired, with 60-second buffer)
  - If cache miss/expired: calls `https://apps.fortnox.se/oauth-v1/token` with `grant_type=client_credentials`, Basic auth from credentials, TenantId header, and all 18 scopes hardcoded (per AUTH-08 decision)
  - Caches the new token with `Date.now() + (expires_in * 1000)` expiry
  - Returns the access_token string
- Update `fortnoxApiRequest` to:
  - Accept tenantId as a parameter (or read it from `this.getNodeParameter('tenantId', itemIndex)`)
  - Instead of using `httpRequestWithAuthentication` (which relies on preAuthentication), use `this.helpers.httpRequest` directly with a manually fetched Bearer token from `getTokenForTenant`
  - Keep the rate-limit retry logic
  - Keep the Fortnox error translation
- Update `fortnoxApiRequestAllItems` to match the new signature
- Update `getAccessToken` function to accept tenantId parameter instead of reading from credentials
- Remove imports that are no longer needed

**3. Update Fortnox.node.ts** (`nodes/Fortnox/Fortnox.node.ts`):
- Add `tenantId` as a required string parameter in `description.properties`, positioned right after the Resource selector:
  ```typescript
  {
      displayName: 'Tenant ID',
      name: 'tenantId',
      type: 'string',
      default: '',
      required: true,
      description: 'The numeric tenant identifier for the Fortnox company. Obtained from the Fortnox Auth Callback node during OAuth consent onboarding.',
  }
  ```
- Remove the `fortnoxApiTest` credential test from `methods.credentialTest` (or update it to work without tenantId -- the credential itself can no longer be tested without a tenantId)
- Remove `testedBy: 'fortnoxApiTest'` from the credentials config in description
- Update all `fortnoxApiRequest.call(this, ...)` calls to pass the tenantId (either update the function signature or have it read from node parameters internally)
- Update `getAccessToken.call(this)` to pass tenantId
- Keep all existing resource/operation logic unchanged

**4. Register new nodes in package.json**:
- Add to `n8n.nodes` array:
  - `"dist/nodes/FortnoxAuthStart/FortnoxAuthStart.node.js"`
  - `"dist/nodes/FortnoxAuthCallback/FortnoxAuthCallback.node.js"`
- Keep existing `"dist/nodes/Fortnox/Fortnox.node.js"`

**5. Optionally keep or remove the workflow file**:
- The `workflows/fortnox-consent-onboarding.json` can be kept as a legacy reference or removed. Since the user wants to replace the workflow approach, add a note in a TODO comment but do NOT delete the file in this task (let the user decide).

Important: The `accessToken` hidden field with `expirable: true` in credentials may still be useful if n8n's built-in token caching mechanism works with the simplified credential. Research in Task 1 should clarify whether to keep it or whether the manual cache in GenericFunctions is sufficient. If keeping both would cause conflicts, remove the accessToken from credentials and rely entirely on the GenericFunctions cache.
  </action>
  <verify>
Run `npx tsc --noEmit` -- no type errors. Run `npm run lint` -- no lint errors. Verify package.json lists all 3 nodes. Verify credentials file has NO tenantId or scopes properties. Verify Fortnox.node.ts HAS a tenantId parameter.
  </verify>
  <done>
Credentials simplified to clientId + clientSecret only. Fortnox API node has tenantId as a required parameter. GenericFunctions handles token fetching with in-memory caching. All 3 nodes registered in package.json. `npx tsc --noEmit` and `npm run lint` pass.
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with zero errors
2. `npm run lint` passes (or only has pre-existing warnings)
3. `npm run build` succeeds and produces dist/ output for all 3 nodes + credentials
4. package.json `n8n.nodes` array contains all 3 node paths
5. credentials/FortnoxApi.credentials.ts has only clientId and clientSecret as user-visible fields
6. nodes/Fortnox/Fortnox.node.ts has tenantId as a required parameter
7. Both FortnoxAuthStart and FortnoxAuthCallback nodes exist with webhook() methods
8. Research document exists with clear architecture recommendation
</verification>

<success_criteria>
- The old workflow-based approach is replaced by two dedicated webhook nodes
- Users can drag-and-drop FortnoxAuthStart and FortnoxAuthCallback into a workflow canvas
- FortnoxAuthStart redirects clients to Fortnox OAuth consent screen
- FortnoxAuthCallback receives the callback, exchanges code, and outputs tenantId + company data
- Fortnox API node works with tenantId as a node parameter (not credential field)
- Token management is automatic with caching in GenericFunctions
- All code compiles and passes linting
</success_criteria>

<output>
After completion, create `.planning/quick/3-replace-auth-workflow-with-dedicated-oau/3-SUMMARY.md`
</output>
