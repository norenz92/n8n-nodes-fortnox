# Architecture Patterns

**Domain:** n8n community node for Fortnox accounting API
**Researched:** 2026-02-27

## Recommended Architecture

The package follows the standard n8n community node structure: a flat npm package with `credentials/` and `nodes/` directories, registered via `package.json` metadata. The Fortnox integration has a twist compared to typical community nodes: the auth flow is a two-phase design where an initial OAuth authorization code flow captures client consent and TenantId, then all subsequent API calls use client credentials (ClientId + ClientSecret + TenantId) to mint short-lived access tokens on demand.

```
n8n-nodes-fortnox/
  credentials/
    FortnoxApi.credentials.ts          # Custom credential type (client credentials + TenantId)
  nodes/
    Fortnox/
      Fortnox.node.ts                  # Main node (declarative style, multi-resource)
      FortnoxDescription.ts            # Resource/operation definitions (optional split)
      resources/
        InvoiceDescription.ts          # Invoice resource operations
        CustomerDescription.ts         # Customer resource operations
        ArticleDescription.ts          # Article resource operations
        OrderDescription.ts            # Order resource operations
  icons/
    fortnox.svg                        # Node icon (light/dark variants)
  package.json                         # n8n node/credential registration
  tsconfig.json                        # TypeScript config
  eslint.config.mjs                    # Linting config
```

**Confidence: HIGH** -- This structure is directly from the n8n-nodes-starter template and official n8n documentation.

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `FortnoxApi.credentials.ts` | Stores ClientId, ClientSecret, TenantId per credential instance. Implements `preAuthentication` to fetch client_credentials access tokens. Injects Bearer token into all outgoing requests. | Fortnox OAuth token endpoint (`apps.fortnox.se/oauth-v1/token`), n8n credential system |
| `Fortnox.node.ts` | Main node entry point. Declares available resources (Invoice, Customer, Article, Order) and references the credential type. Uses declarative style with `requestDefaults` pointing to Fortnox API. | n8n runtime, credential system, Fortnox REST API (`api.fortnox.se/3/`) |
| Resource descriptions (`*Description.ts`) | Define operations (create, get, update, list) and their routing (HTTP method, URL path, request body mappings) for each Fortnox resource. | Consumed by `Fortnox.node.ts` as imported properties |
| `package.json` (n8n section) | Registers the credential type and node type so n8n discovers them at install time. | n8n package loader |
| External: OAuth consent flow | Separate mechanism (n8n webhook workflow or standalone endpoint) that initiates `account_type=service` OAuth authorization code flow to capture TenantId for new clients. | Fortnox OAuth auth endpoint, user's browser, n8n credential store |

### Data Flow

**Phase 1: Client Onboarding (one-time per client)**

```
Client browser
  --> GET https://apps.fortnox.se/oauth-v1/auth
      ?client_id={ClientId}
      &redirect_uri={AgencyRedirectURL}
      &scope={all-needed-scopes}
      &state={clientIdentifier}
      &access_type=offline
      &response_type=code
      &account_type=service
  --> Fortnox login/consent screen
  --> Redirect to AgencyRedirectURL with ?code={AuthCode}&state={clientIdentifier}
  --> Agency backend exchanges AuthCode for tokens (to extract TenantId)
      POST https://apps.fortnox.se/oauth-v1/token
      Authorization: Basic base64(ClientId:ClientSecret)
      Body: grant_type=authorization_code&code={AuthCode}&redirect_uri={RedirectURI}
  --> Response includes access_token (JWT containing TenantId claim)
  --> Agency creates new n8n credential with ClientId + ClientSecret + TenantId
```

**Phase 2: Runtime API Calls (every workflow execution)**

```
n8n workflow triggers Fortnox node
  --> n8n loads FortnoxApi credential for this node
  --> preAuthentication fires:
      POST https://apps.fortnox.se/oauth-v1/token
      Authorization: Basic base64(ClientId:ClientSecret)
      TenantId: {stored TenantId}
      Body: grant_type=client_credentials&scope={scopes}
  --> Returns access_token (valid 1 hour)
  --> authenticate injects: Authorization: Bearer {access_token}
  --> Node makes declarative API call:
      GET/POST/PUT https://api.fortnox.se/3/{resource}/{id}
      Authorization: Bearer {access_token}
      Content-Type: application/json
  --> Response flows back into n8n workflow
```

**Confidence: HIGH for the Fortnox auth flow** (verified against official Fortnox developer docs). **MEDIUM for preAuthentication pattern** (community-documented, not officially detailed, but is the established n8n pattern for custom token flows).

## Patterns to Follow

### Pattern 1: Declarative Node Style with Multi-Resource Design

**What:** Use n8n's declarative (routing-based) node style instead of programmatic `execute()` method. Define resources and operations as configuration objects with routing that maps directly to Fortnox REST endpoints.

**When:** Always for REST API integrations. The Fortnox API is a standard REST API with predictable CRUD endpoints.

**Why:** Declarative style is officially recommended by n8n, significantly reduces boilerplate, handles request/response automatically, and is more future-proof. Per n8n docs: "the declarative/low-code style is the recommended approach for building nodes that interact with HTTP APIs."

**Example:**

```typescript
// Fortnox.node.ts
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { invoiceOperations, invoiceFields } from './resources/InvoiceDescription';
import { customerOperations, customerFields } from './resources/CustomerDescription';

export class Fortnox implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Fortnox',
    name: 'fortnox',
    icon: 'file:fortnox.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Interact with Fortnox accounting API',
    defaults: { name: 'Fortnox' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'fortnoxApi',
        required: true,
      },
    ],
    requestDefaults: {
      baseURL: 'https://api.fortnox.se/3',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    },
    properties: [
      // Resource selector
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Invoice', value: 'invoice' },
          { name: 'Customer', value: 'customer' },
          { name: 'Article', value: 'article' },
          { name: 'Order', value: 'order' },
        ],
        default: 'invoice',
      },
      // Operations and fields per resource
      ...invoiceOperations,
      ...invoiceFields,
      ...customerOperations,
      ...customerFields,
      // ... more resources
    ],
  };
}
```

**Confidence: HIGH** -- This pattern is directly from n8n official docs and starter template.

### Pattern 2: Custom Credential with preAuthentication for Client Credentials Token

**What:** Implement an `ICredentialType` that uses the `preAuthentication` lifecycle hook to fetch client_credentials access tokens before each API request. Store ClientId, ClientSecret, and TenantId as credential properties. The `preAuthentication` method makes a POST to the Fortnox token endpoint and returns the access_token, which is then injected via the `authenticate` property.

**When:** For any API that uses client_credentials grant type where n8n does not have native support. Fortnox's pattern (Basic auth + TenantId header + client_credentials body) is non-standard enough that the built-in OAuth2 credential cannot handle it.

**Example:**

```typescript
// FortnoxApi.credentials.ts
import type {
  IAuthenticateGeneric,
  ICredentialType,
  INodeProperties,
  ICredentialDataDecryptedObject,
  IHttpRequestHelper,
} from 'n8n-workflow';

export class FortnoxApi implements ICredentialType {
  name = 'fortnoxApi';
  displayName = 'Fortnox API';
  documentationUrl = 'https://www.fortnox.se/developer/authorization';
  icon = { light: 'file:fortnox.svg', dark: 'file:fortnox.svg' } as const;

  properties: INodeProperties[] = [
    {
      displayName: 'Client ID',
      name: 'clientId',
      type: 'string',
      default: '',
      required: true,
    },
    {
      displayName: 'Client Secret',
      name: 'clientSecret',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
    },
    {
      displayName: 'Tenant ID',
      name: 'tenantId',
      type: 'string',
      default: '',
      required: true,
      description: 'The Fortnox Tenant ID for the client company',
    },
    // Hidden field for the expirable token
    {
      displayName: 'Access Token',
      name: 'accessToken',
      type: 'hidden',
      typeOptions: { expirable: true },
      default: '',
    },
  ];

  // preAuthentication fetches a fresh token using client_credentials
  async preAuthentication(
    this: IHttpRequestHelper,
    credentials: ICredentialDataDecryptedObject,
  ) {
    const basicAuth = Buffer.from(
      `${credentials.clientId}:${credentials.clientSecret}`,
    ).toString('base64');

    const response = await this.helpers.httpRequest({
      method: 'POST',
      url: 'https://apps.fortnox.se/oauth-v1/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
        TenantId: String(credentials.tenantId),
      },
      body: 'grant_type=client_credentials',
    });

    return { accessToken: response.access_token };
  }

  // authenticate injects the token as Bearer header
  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '=Bearer {{$credentials.accessToken}}',
      },
    },
  };
}
```

**Confidence: MEDIUM** -- The `preAuthentication` + `expirable` pattern is documented in community discussions and used by other community nodes, but has known quirks (e.g., `httpRequest` vs `request` helper). The Fortnox token endpoint specifics are HIGH confidence (verified against official docs).

### Pattern 3: Resource Description Files as Separate Modules

**What:** Split each resource's operations and field definitions into separate TypeScript files. The main node file imports and spreads them into the `properties` array.

**When:** Always for multi-resource nodes. Keeps each resource self-contained and the main node file clean.

**Example:**

```typescript
// resources/InvoiceDescription.ts
import type { INodeProperties } from 'n8n-workflow';

export const invoiceOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: { resource: ['invoice'] },
    },
    options: [
      {
        name: 'Create',
        value: 'create',
        description: 'Create an invoice',
        routing: {
          request: {
            method: 'POST',
            url: '/invoices',
          },
        },
        action: 'Create an invoice',
      },
      {
        name: 'Get',
        value: 'get',
        description: 'Get an invoice',
        routing: {
          request: {
            method: 'GET',
            url: '=/invoices/{{$parameter["invoiceNumber"]}}',
          },
        },
        action: 'Get an invoice',
      },
      // ... update, list operations
    ],
    default: 'get',
  },
];

export const invoiceFields: INodeProperties[] = [
  {
    displayName: 'Invoice Number',
    name: 'invoiceNumber',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['invoice'],
        operation: ['get', 'update'],
      },
    },
    default: '',
    description: 'The number of the invoice',
  },
  // ... more fields
];
```

**Confidence: HIGH** -- This is the standard pattern used in n8n-nodes-base built-in nodes.

### Pattern 4: package.json Registration

**What:** The `n8n` section in package.json registers credential types and node types by their compiled JavaScript paths. Keywords must include `n8n-community-node-package`.

**Example:**

```json
{
  "name": "n8n-nodes-fortnox",
  "version": "0.1.0",
  "license": "MIT",
  "keywords": ["n8n-community-node-package"],
  "n8n": {
    "n8nNodesApiVersion": 1,
    "credentials": [
      "dist/credentials/FortnoxApi.credentials.js"
    ],
    "nodes": [
      "dist/nodes/Fortnox/Fortnox.node.js"
    ]
  },
  "scripts": {
    "build": "n8n-node build",
    "dev": "n8n-node dev",
    "lint": "n8n-node lint",
    "release": "n8n-node release"
  },
  "devDependencies": {
    "@n8n/node-cli": "latest",
    "typescript": "~5.9.0"
  },
  "peerDependencies": {
    "n8n-workflow": "*"
  }
}
```

**Confidence: HIGH** -- Directly from n8n-nodes-starter template and official docs.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Using Programmatic Style for REST CRUD Operations

**What:** Writing an `execute()` method that manually constructs HTTP requests for standard CRUD operations against Fortnox endpoints.

**Why bad:** Massive boilerplate. Must manually handle input items, build request options, parse responses, handle errors, and manage pagination. The declarative style handles all of this through routing configuration.

**Instead:** Use declarative routing. Only drop into programmatic `execute()` for operations that need data transformation the declarative system cannot handle (unlikely for Fortnox's standard REST API).

### Anti-Pattern 2: Extending oAuth2Api for Fortnox Auth

**What:** Creating a credential that `extends = ['oAuth2Api']` to try to use n8n's built-in OAuth2 flow for Fortnox.

**Why bad:** Fortnox's client credentials flow requires a custom `TenantId` header on the token request, which n8n's built-in OAuth2 credential does not support. The built-in OAuth2 also expects to manage refresh tokens, which Fortnox client credentials flow does not use. Trying to shoehorn this into oAuth2Api will cause frustrating mismatches.

**Instead:** Implement a standalone `ICredentialType` with `preAuthentication` that directly calls the Fortnox token endpoint with the correct headers and body format.

### Anti-Pattern 3: Storing Access Tokens in Credentials Manually

**What:** Having users paste access tokens into credential fields, or storing tokens that expire without automatic refresh.

**Why bad:** Fortnox access tokens expire after 1 hour. Manual token management defeats the purpose of automation. Users would need to constantly update credentials.

**Instead:** Use `preAuthentication` with `typeOptions: { expirable: true }` on a hidden token field. This automatically fetches fresh tokens before they expire and caches them.

### Anti-Pattern 4: Building the OAuth Consent Flow Into the Node Itself

**What:** Trying to implement the initial OAuth authorization code flow (for capturing TenantId) as part of the credential type or node type.

**Why bad:** The initial consent flow is a one-time interactive browser-based flow. n8n's credential system is designed for non-interactive authentication. Mixing a browser redirect flow into the credential type creates a poor UX and architectural confusion.

**Instead:** Handle the initial consent flow as a separate concern -- either a standalone n8n webhook workflow that captures the auth code and creates credentials, or a simple external script/endpoint. The credential type only needs to know ClientId, ClientSecret, and TenantId (the outputs of the consent flow).

## Key Architecture Decisions

### Decision 1: Programmatic vs Declarative

**Recommendation: Declarative (routing-based)**

The Fortnox API is a straightforward REST API with predictable CRUD endpoints. Declarative style maps perfectly to this:

- `GET /invoices` maps to a list operation with `routing: { request: { method: 'GET', url: '/invoices' } }`
- `POST /invoices` maps to a create operation
- Each resource is a separate configuration section

The only scenario requiring programmatic code would be if Fortnox responses need significant transformation. The Fortnox API wraps responses in a root object (e.g., `{ "Invoice": { ... } }` for single items, `{ "Invoices": [...] }` for lists), which can be handled declaratively using `output.postReceive` with `rootProperty`.

**Fallback consideration:** If `preAuthentication` proves unreliable for the credential type (there are known community reports of issues), a hybrid approach is possible: programmatic `execute()` that handles token fetching inline. But try declarative first.

### Decision 2: OAuth Consent Flow Architecture

**Recommendation: Separate n8n webhook workflow**

The initial OAuth consent flow for capturing TenantId should NOT be built into the node package. Instead:

1. Create a separate n8n workflow with a Webhook trigger node
2. The webhook URL becomes the shareable link for clients
3. When a client visits, redirect them to Fortnox auth URL
4. On callback, exchange the auth code for tokens, extract TenantId
5. Store the result (manually create an n8n credential, or log it for the agency to create)

This separation keeps the community node package focused on API operations and avoids mixing one-time setup with runtime execution.

**Alternative:** A standalone Express/Hono server outside n8n. Simpler code, but requires separate deployment.

### Decision 3: One Credential Type vs Multiple

**Recommendation: One credential type (FortnoxApi)**

A single credential type with ClientId, ClientSecret, and TenantId fields. Each client gets their own credential instance with a unique TenantId. The agency's ClientId and ClientSecret are the same across all credentials (since they have one Fortnox app), but each credential instance stores the per-client TenantId.

Users can name credentials descriptively (e.g., "Fortnox - Acme Corp") and select the appropriate one per workflow.

### Decision 4: Fortnox Response Wrapping

**Recommendation: Handle with postReceive in declarative routing**

The Fortnox API wraps responses in named root objects:
- Single item: `{ "Invoice": { "InvoiceNumber": "1", ... } }`
- List: `{ "Invoices": [ { ... }, { ... } ] }`

Use the `output.postReceive` with `rootProperty` to unwrap automatically:

```typescript
routing: {
  request: { method: 'GET', url: '/invoices' },
  output: {
    postReceive: [
      { type: 'rootProperty', properties: { property: 'Invoices' } },
    ],
  },
},
```

## Suggested Build Order

The build order follows dependency chains. Each phase produces a testable artifact.

```
Phase 1: Project Scaffold + Credential Type
  |-- package.json with n8n registration
  |-- FortnoxApi.credentials.ts with preAuthentication
  |-- Minimal Fortnox.node.ts (one resource, one operation)
  |-- Can test: credential creation, token fetching, single API call
  |
Phase 2: Invoice Resource (complete)
  |-- InvoiceDescription.ts with all operations (create, get, update, list)
  |-- Field definitions for invoice properties
  |-- Can test: full invoice CRUD via n8n workflows
  |
Phase 3: Customer + Article + Order Resources
  |-- CustomerDescription.ts
  |-- ArticleDescription.ts
  |-- OrderDescription.ts
  |-- Can test: all four resources with full CRUD
  |
Phase 4: OAuth Consent Flow (separate workflow/endpoint)
  |-- Webhook workflow or external endpoint
  |-- Auth code exchange and TenantId capture
  |-- Can test: end-to-end client onboarding
  |
Phase 5: Polish + Publish
  |-- Error handling refinements
  |-- Icon, documentation, README
  |-- npm publish with n8n-community-node-package keyword
```

**Why this order:**
- Phase 1 must come first because everything depends on the credential type and project scaffold. You cannot test anything without a working auth flow.
- Phase 2 (Invoice) is the highest-value single resource and validates the declarative pattern end-to-end.
- Phase 3 follows the same pattern as Phase 2, so it is mostly replication.
- Phase 4 (OAuth consent) is deliberately last because it is architecturally separate from the node package and can be developed independently. The agency can manually create credentials with known TenantIds during development.
- Phase 5 is packaging and polish.

## Scalability Considerations

| Concern | At 5 clients | At 50 clients | At 500 clients |
|---------|------------|-------------|--------------|
| Credential management | Manual per-client credentials, manageable | Many credentials to manage, consider naming conventions | Unwieldy in n8n UI. Would need API-based credential management |
| Token requests | Each workflow execution fetches a token. Minimal impact. | Token caching via `expirable` property keeps this efficient | Rate limit awareness needed (25 req/5 sec per token) |
| OAuth consent flow | Manual onboarding, webhook workflow sufficient | Still manageable with webhook workflow | Would benefit from automated credential creation (not available in community nodes) |
| Fortnox API rate limits | 25 req/5 sec per access token. No concern | Multiple concurrent workflows per client could hit limits | Need per-client request throttling. Consider queuing |

**Design for simplicity at <10 clients** (per PROJECT.md). The architecture supports growth without rewrites, but operational scaling beyond ~50 clients would need tooling outside the node package.

## Sources

### Official Documentation (HIGH confidence)
- [n8n: Building community nodes](https://docs.n8n.io/integrations/community-nodes/build-community-nodes/)
- [n8n: Creating nodes overview](https://docs.n8n.io/integrations/creating-nodes/overview/)
- [n8n: Declarative-style parameters](https://docs.n8n.io/integrations/creating-nodes/build/reference/node-base-files/declarative-style-parameters/)
- [n8n: Choose node building style](https://docs.n8n.io/integrations/creating-nodes/plan/choose-node-method/)
- [n8n: Node base file structure](https://docs.n8n.io/integrations/creating-nodes/build/reference/node-base-files/structure/)
- [n8n-nodes-starter template](https://github.com/n8n-io/n8n-nodes-starter)
- [Fortnox: Authorization overview](https://www.fortnox.se/developer/authorization)
- [Fortnox: Get authorization code](https://www.fortnox.se/developer/authorization/get-authorization-code)
- [Fortnox: Get access token using client credentials](https://www.fortnox.se/developer/authorization/get-access-token-using-client-credentials)
- [Fortnox: Developer checklist](https://www.fortnox.se/developer/checklist)
- [Fortnox: API docs (Swagger)](https://apps.fortnox.se/apidocs)

### Community/Secondary Sources (MEDIUM confidence)
- [n8n credential system (DeepWiki)](https://deepwiki.com/n8n-io/n8n/4.5-credential-system)
- [n8n community: OAuth2 for custom nodes](https://community.n8n.io/t/oauth-2-for-custom-nodes-n8n/19114)
- [n8n community: preAuthentication issues](https://community.n8n.io/t/custom-node-credentials-preauthentication-method-doesnt-execute-http-request/27808)
- [n8n community: Custom OAuth2 implementation](https://community.n8n.io/t/custom-node-oauth2-implementation/42382)
- [Client credentials OAuth in n8n (John Tuckner)](https://johntuckner.me/posts/client_credentials_n8n/)
- [n8n AsanaApi credential (GitHub)](https://github.com/n8n-io/n8n/blob/master/packages/nodes-base/credentials/AsanaApi.credentials.ts)
