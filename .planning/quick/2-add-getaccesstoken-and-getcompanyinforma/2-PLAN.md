---
phase: quick-2
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - nodes/Fortnox/Fortnox.node.ts
  - nodes/Fortnox/GenericFunctions.ts
autonomous: true
requirements: [QUICK-2]

must_haves:
  truths:
    - "User can select 'Access Token' resource and 'Get Access Token' operation"
    - "User can select 'Company Information' resource and 'Get Company Information' operation"
    - "Get Access Token returns the access_token string from the preAuthentication token endpoint"
    - "Get Company Information returns the CompanyInformation object from /3/companyinformation"
  artifacts:
    - path: "nodes/Fortnox/Fortnox.node.ts"
      provides: "Two new resources with operations in description.properties and execute()"
    - path: "nodes/Fortnox/GenericFunctions.ts"
      provides: "getAccessToken helper that calls the token endpoint using credential fields"
  key_links:
    - from: "Fortnox.node.ts execute() accessToken block"
      to: "GenericFunctions.ts getAccessToken()"
      via: "function import and call"
      pattern: "getAccessToken\\.call\\(this"
    - from: "Fortnox.node.ts execute() companyInformation block"
      to: "GenericFunctions.ts fortnoxApiRequest()"
      via: "existing helper"
      pattern: "fortnoxApiRequest\\.call.*companyinformation"
---

<objective>
Add two new resources to the Fortnox n8n node: "Access Token" and "Company Information".

- **Access Token** resource with a single "Get" operation: calls the Fortnox preAuthentication token endpoint (`POST https://apps.fortnox.se/oauth-v1/token`) using the credential's ClientId, ClientSecret, TenantId, and scopes, then returns the raw access_token. This lets workflows obtain a bearer token for use in HTTP Request nodes or external integrations.

- **Company Information** resource with a single "Get" operation: calls `GET /3/companyinformation` via the existing authenticated helper and returns the CompanyInformation object.

Purpose: Expose these two utility actions so users can retrieve tokens and company metadata directly from the Fortnox node without workarounds.
Output: Updated Fortnox.node.ts and GenericFunctions.ts with two new resources fully wired.
</objective>

<execution_context>
@/Users/adamnoren/.claude/get-shit-done/workflows/execute-plan.md
@/Users/adamnoren/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

<interfaces>
<!-- Key types and contracts the executor needs. -->

From nodes/Fortnox/GenericFunctions.ts:
```typescript
export async function fortnoxApiRequest(
  this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
  method: IHttpRequestMethods,
  endpoint: string,
  body: IDataObject = {},
  qs: IDataObject = {},
): Promise<IDataObject>
```

From credentials/FortnoxApi.credentials.ts (preAuthentication pattern to replicate for getAccessToken):
```typescript
async preAuthentication(
  this: IHttpRequestHelper,
  credentials: ICredentialDataDecryptedObject,
) {
  const clientId = credentials.clientId as string;
  const clientSecret = credentials.clientSecret as string;
  const tenantId = credentials.tenantId as string;
  const scopes = credentials.scopes as string[];
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const scopeString = scopes.join(' ');

  const response = await this.helpers.httpRequest({
    method: 'POST',
    url: 'https://apps.fortnox.se/oauth-v1/token',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      TenantId: tenantId,
    },
    body: `grant_type=client_credentials&scope=${encodeURIComponent(scopeString)}`,
  });

  return { accessToken: response.access_token };
}
```

Fortnox.node.ts resource selector pattern (alphabetical order per [03-03] decision):
```typescript
{
  displayName: 'Resource',
  name: 'resource',
  type: 'options',
  noDataExpression: true,
  options: [
    { name: 'Article', value: 'article' },
    { name: 'Customer', value: 'customer' },
    { name: 'Invoice', value: 'invoice' },
    { name: 'Order', value: 'order' },
  ],
  default: 'invoice',
}
```

Operation description pattern (from ArticleDescription.ts):
```typescript
export const articleOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['article'] } },
    options: [
      { name: 'Get', value: 'get', action: 'Get an article', description: '...' },
    ],
    default: 'getMany',
  },
];
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add getAccessToken helper to GenericFunctions.ts</name>
  <files>nodes/Fortnox/GenericFunctions.ts</files>
  <action>
Add a new exported async function `getAccessToken` to GenericFunctions.ts. This function replicates the token-fetching logic from the credential's preAuthentication method but runs in the execute context (IExecuteFunctions).

The function signature:
```typescript
export async function getAccessToken(
  this: IExecuteFunctions,
): Promise<IDataObject>
```

Implementation:
1. Get credentials via `this.getCredentials('fortnoxApi')` which returns the decrypted credential fields.
2. Extract `clientId`, `clientSecret`, `tenantId`, and `scopes` from the credentials object (same fields as in FortnoxApi.credentials.ts).
3. Build Basic auth header: `Buffer.from(\`${clientId}:${clientSecret}\`).toString('base64')`.
4. Build scope string: `(scopes as string[]).join(' ')`.
5. Call `this.helpers.httpRequest()` (NOT httpRequestWithAuthentication -- this is a raw token endpoint call, not an API call):
   - method: 'POST'
   - url: 'https://apps.fortnox.se/oauth-v1/token'
   - headers: { Authorization: `Basic ${basicAuth}`, 'Content-Type': 'application/x-www-form-urlencoded', TenantId: tenantId }
   - body: `grant_type=client_credentials&scope=${encodeURIComponent(scopeString)}`
6. Return the full response as IDataObject (contains access_token, token_type, expires_in, scope).

Add `IExecuteFunctions` to the existing n8n-workflow import if not already present (it is already imported). No other new imports needed.

Do NOT wrap in try/catch -- let errors propagate to the execute() error handler in Fortnox.node.ts.
  </action>
  <verify>Run `cd /Users/adamnoren/n8n-nodes-fortnox && npm run build` -- compiles with no errors. Verify getAccessToken is exported: `grep -n "export async function getAccessToken" nodes/Fortnox/GenericFunctions.ts`</verify>
  <done>getAccessToken function exported from GenericFunctions.ts, accepts IExecuteFunctions context, calls token endpoint using credential fields, returns token response as IDataObject.</done>
</task>

<task type="auto">
  <name>Task 2: Add Access Token and Company Information resources to Fortnox.node.ts</name>
  <files>nodes/Fortnox/Fortnox.node.ts</files>
  <action>
Modify Fortnox.node.ts to add two new resources with inline operation definitions (no separate Description files needed since each has only one operation with no fields).

**1. Update imports:**
Add `getAccessToken` to the import from `./GenericFunctions`.

**2. Add resources to the resource selector (alphabetical order per project convention):**
Insert into the options array so the final order is: Access Token, Article, Company Information, Customer, Invoice, Order.
```typescript
{ name: 'Access Token', value: 'accessToken' },
// ... article ...
{ name: 'Company Information', value: 'companyInformation' },
// ... customer, invoice, order ...
```
Keep `default: 'invoice'` unchanged.

**3. Add inline operation definitions in properties array (after the resource selector, before the spread of articleOperations):**

Access Token operation:
```typescript
{
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: { show: { resource: ['accessToken'] } },
  options: [
    {
      name: 'Get',
      value: 'get',
      action: 'Get an access token',
      description: 'Fetch a new access token using client credentials',
    },
  ],
  default: 'get',
},
```

Company Information operation:
```typescript
{
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: { show: { resource: ['companyInformation'] } },
  options: [
    {
      name: 'Get',
      value: 'get',
      action: 'Get company information',
      description: 'Retrieve company information from Fortnox',
    },
  ],
  default: 'get',
},
```

**4. Add execute() blocks (before the existing `if (resource === 'article')` block, alphabetical order):**

Access Token:
```typescript
if (resource === 'accessToken') {
  if (operation === 'get') {
    const response = await getAccessToken.call(this);
    responseData = response as IDataObject;
  }
}
```

Company Information (between accessToken and article blocks):
```typescript
if (resource === 'companyInformation') {
  if (operation === 'get') {
    const response = await fortnoxApiRequest.call(this, 'GET', '/3/companyinformation');
    responseData = response.CompanyInformation as IDataObject;
  }
}
```

**Important notes:**
- For Access Token: use `getAccessToken.call(this)` -- the `.call(this)` pattern is required to pass the IExecuteFunctions context, consistent with how fortnoxApiRequest is called.
- For Company Information: extract `response.CompanyInformation` (capital C, capital I) to return only the company info object, not the wrapper. This matches the Fortnox API response shape `{ CompanyInformation: { ... } }`.
- Title Case for all displayName values per n8n lint rules.
- Keep the `fortnoxApiRequestAllItems` import even though these new resources don't use it (other resources still do).
  </action>
  <verify>Run `cd /Users/adamnoren/n8n-nodes-fortnox && npm run build && npm run lint` -- both pass. Verify resources are present: `grep -n "'accessToken'\|'companyInformation'" nodes/Fortnox/Fortnox.node.ts`</verify>
  <done>
- Fortnox node has 6 resources in the selector: Access Token, Article, Company Information, Customer, Invoice, Order (alphabetical).
- Selecting "Access Token" > "Get" triggers getAccessToken and returns the token response.
- Selecting "Company Information" > "Get" calls /3/companyinformation and returns the CompanyInformation object.
- Build and lint pass cleanly.
  </done>
</task>

</tasks>

<verification>
1. `npm run build` compiles without errors
2. `npm run lint` passes without errors
3. Resource selector includes all 6 resources in alphabetical order
4. Both new execute() branches reference correct helpers (getAccessToken, fortnoxApiRequest)
</verification>

<success_criteria>
- Build succeeds with zero TypeScript errors
- Lint passes with zero warnings
- Fortnox node exposes "Access Token" and "Company Information" as selectable resources
- "Get Access Token" operation calls the token endpoint using credential fields and returns the token response
- "Get Company Information" operation calls /3/companyinformation and returns the CompanyInformation object
</success_criteria>

<output>
After completion, create `.planning/quick/2-add-getaccesstoken-and-getcompanyinforma/2-SUMMARY.md`
</output>
