# Technology Stack

**Project:** n8n Community Node for Fortnox API
**Researched:** 2026-02-27

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| n8n-nodes-starter template | latest (master) | Project scaffolding | Official n8n starter template; includes all required tooling, linter config, TypeScript setup, and example patterns. Clone and adapt rather than starting from scratch. |
| TypeScript | 5.9.x | Language | Required by n8n ecosystem. The starter template enforces strict mode, `noImplicitAny`, `strictNullChecks`. Use the tsconfig.json from the starter verbatim. |
| n8n-workflow | ^2.9.0 | Peer dependency | Provides `INodeType`, `ICredentialType`, `INodeProperties`, `IAuthenticateGeneric`, and all n8n type interfaces. Listed as `peerDependency` in package.json, not a direct dependency. |
| Node.js | >= 22.0.0 | Runtime | n8n starter template requires Node.js v22+. Use this as minimum engine version. |

### Build & Development Tools

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @n8n/node-cli | ^0.21.0 | Build, dev server, lint | Official n8n CLI. Provides `npm run dev` (runs n8n with your node in watch mode), `npm run build` (TypeScript compilation), and the node linter. Installed as devDependency automatically. |
| ESLint | 9.32.x | Linting | Starter uses ESLint 9 flat config via `eslint.config.mjs` that imports from `@n8n/node-cli/eslint`. Do NOT write custom ESLint rules -- use the n8n-provided config as-is. |
| Prettier | 3.6.x | Formatting | Starter includes `.prettierrc.js`. Use as-is for consistency with n8n ecosystem. |
| release-it | 19.0.x | Version management | Handles npm publishing and version bumping. Included in starter template. |

### Fortnox API Integration

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Fortnox REST API v3 | v3 (stable) | Backend API | Base URL: `https://api.fortnox.se/3/`. RESTful JSON API with resources at `/3/invoices`, `/3/customers`, `/3/articles`, `/3/orders`. Well-documented with downloadable OpenAPI spec. |
| Fortnox OAuth v1 Token Endpoint | v1 | Authentication | `https://apps.fortnox.se/oauth-v1/token`. Supports both `authorization_code` and `client_credentials` grant types. Client credentials require `TenantId` header. |
| No external Fortnox SDK | -- | Direct HTTP calls | Use n8n's built-in `this.helpers.httpRequest()` instead of third-party libraries. The `@rantalainen/fortnox-api-client` (v1.1.1, last updated Jan 2024) is stale, does not support client credentials flow, and n8n community nodes should avoid external dependencies per n8n guidelines. |

### Authentication Stack

| Component | Implementation | Why |
|-----------|---------------|-----|
| Credential Type | Custom `ICredentialType` with `preAuthentication` | Fortnox client credentials flow requires: (1) Basic auth header from ClientId:ClientSecret, (2) `TenantId` header, (3) `grant_type=client_credentials` body. This is NOT standard OAuth2 that n8n's built-in OAuth2 credential can handle -- it needs the custom TenantId header per request. Use `preAuthentication` to fetch the access token, then `authenticate` of type `'generic'` to inject `Authorization: Bearer {token}` into API requests. |
| Token Management | `preAuthentication` method | Fetches access token from `https://apps.fortnox.se/oauth-v1/token` using client credentials + TenantId before each API call batch. Tokens expire after 3600 seconds (1 hour). No refresh tokens needed -- just re-request with client credentials. |
| Credential Test | `test` property on ICredentialType | Make a GET request to `https://api.fortnox.se/3/companyinformation` to verify credentials work. Lightweight endpoint that confirms auth + tenant access. |

### No Database Required

This is a stateless n8n community node package. All credential storage is handled by n8n's built-in encrypted credential system. No database, no state management, no external storage.

## Key n8n Node Patterns

### Programmatic Style (Recommended for this project)

Use **programmatic style** (`execute()` method), NOT declarative style. Rationale:

1. **Custom authentication flow**: The Fortnox client credentials + TenantId pattern requires manual token fetching before API calls. Declarative style's built-in routing cannot accommodate the custom `preAuthentication` token flow cleanly.
2. **Error handling**: Fortnox returns Swedish-language error messages in a custom format. Programmatic style allows custom error parsing and user-friendly error messages.
3. **Pagination**: Fortnox uses offset-based pagination (limit/offset params, default 100, max 500). Programmatic style gives full control over pagination loops.
4. **Rate limiting**: 300 req/min per client-id + tenant, 25 req/5s sliding window. Programmatic style allows implementing retry-after logic on 429 responses.

### File Structure

```
n8n-nodes-fortnox/
  credentials/
    FortnoxApi.credentials.ts      # ICredentialType: ClientId, ClientSecret, TenantId
  nodes/
    Fortnox/
      Fortnox.node.ts              # Main node: INodeType with execute()
      FortnoxDescription.ts        # Resource/operation definitions (properties arrays)
      resources/
        InvoiceDescription.ts      # Invoice operations (create, get, getAll, update)
        CustomerDescription.ts     # Customer operations
        ArticleDescription.ts      # Article operations
        OrderDescription.ts        # Order operations
      GenericFunctions.ts          # Shared: token fetch, API request helper, pagination
  icons/
    fortnox.svg                    # Node icon (SVG format)
  package.json
  tsconfig.json
  eslint.config.mjs
  .prettierrc.js
```

### Package.json n8n Configuration

```json
{
  "name": "n8n-nodes-fortnox",
  "version": "0.1.0",
  "n8n": {
    "n8nNodesApiVersion": 1,
    "credentials": [
      "dist/credentials/FortnoxApi.credentials.js"
    ],
    "nodes": [
      "dist/nodes/Fortnox/Fortnox.node.js"
    ]
  },
  "keywords": [
    "n8n-community-node-package",
    "n8n",
    "fortnox",
    "accounting",
    "invoicing",
    "swedish"
  ],
  "peerDependencies": {
    "n8n-workflow": ">=1.0.0"
  }
}
```

## Fortnox API Reference

### Authentication Flow

1. **Initial consent (one-time per client)**: OAuth authorization code flow with `account_type=service` parameter. Client visits `https://apps.fortnox.se/oauth-v1/auth?client_id={ClientId}&redirect_uri={uri}&scope={scopes}&state={state}&access_type=offline&response_type=code&account_type=service`. After consent, exchange auth code for initial tokens to extract `TenantId`.

2. **Ongoing API access**: Client credentials grant. POST to `https://apps.fortnox.se/oauth-v1/token` with:
   - Header: `Authorization: Basic base64(ClientId:ClientSecret)`
   - Header: `Content-Type: application/x-www-form-urlencoded`
   - Header: `TenantId: {numeric_tenant_id}`
   - Body: `grant_type=client_credentials`
   - Response: `{ "access_token": "...", "expires_in": 3600, "token_type": "bearer", "scope": "..." }`

3. **API calls**: `Authorization: Bearer {access_token}` header on all requests to `https://api.fortnox.se/3/`.

### Key API Patterns

| Pattern | Details |
|---------|---------|
| Base URL | `https://api.fortnox.se/3/` |
| Format | JSON, resource wrapper objects (e.g., `{ "Invoice": { ... } }` for single, `{ "Invoices": [...] }` for lists) |
| Pagination | `?limit=100&offset=0` (default limit: 100, max: 500) |
| Sorting | `?sortby={field}&sortorder=ascending` |
| Filtering | `?filter=unpaid`, `?lastmodified=2024-01-01`, date ranges with `fromdate`/`todate` |
| Rate limit | 300 req/min per client-id + tenant (25 req/5s sliding window) |
| Error response | HTTP 429 on rate limit exceeded |

### Required Scopes

| Scope | Grants Access To |
|-------|-----------------|
| `invoice` | Invoices, Invoice Payments, Invoice Accruals, Contracts, Tax Reductions |
| `customer` | Customers |
| `article` | Articles, Article File Connections |
| `order` | Orders |
| `companyinformation` | Company Information (used for credential testing) |
| `settings` | Company Settings, Labels, Units, Payment Terms, etc. |

### Key Resource Endpoints

| Resource | List | Get | Create | Update |
|----------|------|-----|--------|--------|
| Invoices | `GET /3/invoices` | `GET /3/invoices/{id}` | `POST /3/invoices` | `PUT /3/invoices/{id}` |
| Customers | `GET /3/customers` | `GET /3/customers/{id}` | `POST /3/customers` | `PUT /3/customers/{id}` |
| Articles | `GET /3/articles` | `GET /3/articles/{id}` | `POST /3/articles` | `PUT /3/articles/{id}` |
| Orders | `GET /3/orders` | `GET /3/orders/{id}` | `POST /3/orders` | `PUT /3/orders/{id}` |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Project scaffolding | n8n-nodes-starter (clone) | `npm create @n8n/node` | Both work. The starter template gives a complete working example including the GithubIssues node as reference. Cloning and modifying is faster for experienced devs. The `create` command is better for first-timers who want guided setup. Either approach is valid. |
| Node style | Programmatic (execute method) | Declarative (routing config) | Declarative cannot handle custom preAuthentication token flow, custom error parsing, or Fortnox-specific pagination. Programmatic gives full control needed for Fortnox's non-standard patterns. |
| Fortnox SDK | Direct HTTP via n8n helpers | @rantalainen/fortnox-api-client | n8n community node guidelines discourage external dependencies. The Fortnox API is straightforward REST -- no SDK needed. The third-party client is stale (Jan 2024), does not support client credentials flow, and would add unnecessary bundle size. |
| Auth approach | Custom ICredentialType + preAuthentication | n8n built-in OAuth2 credential | n8n's OAuth2 credential type does not support the `TenantId` header required by Fortnox's client credentials flow. A custom credential type is required. |
| Auth approach | preAuthentication token fetch | Manual token fetch in execute() | preAuthentication is the n8n-idiomatic way to handle token acquisition before API calls. It integrates with n8n's credential lifecycle rather than doing ad-hoc token management in the node's execute method. |

## Installation

```bash
# Clone the starter template
git clone https://github.com/n8n-io/n8n-nodes-starter.git n8n-nodes-fortnox
cd n8n-nodes-fortnox

# Install dependencies (installs @n8n/node-cli, eslint, prettier, typescript, release-it)
npm install

# Development (starts n8n with your node, watches for changes)
npm run dev

# Build
npm run build

# Lint
npm run lint

# Publish
npm publish
```

## Confidence Assessment

| Decision | Confidence | Basis |
|----------|------------|-------|
| n8n-nodes-starter template | HIGH | Official n8n repo, verified against current master branch package.json |
| TypeScript 5.9.x, ESLint 9.x, Prettier 3.x | HIGH | Verified from starter template package.json (raw GitHub fetch) |
| @n8n/node-cli 0.21.0 | HIGH | Verified via npm search, published 6 hours before research |
| n8n-workflow 2.9.0 as peer dep | HIGH | Verified via npm, latest version confirmed |
| Node.js >= 22 | HIGH | Confirmed in starter template documentation |
| Programmatic over declarative style | MEDIUM | Based on analysis of auth requirements; declarative may work with workarounds but programmatic is clearly safer for non-standard auth |
| preAuthentication for token management | MEDIUM | Pattern confirmed in n8n community forums and n8n source credentials. Some community reports of inconsistencies with `httpRequest` in preAuthentication context -- may need fallback to manual token fetch in execute(). Flag for implementation validation. |
| Fortnox API v3 base URL and endpoints | HIGH | Verified via official Fortnox developer documentation |
| Fortnox client credentials flow | HIGH | Verified from official Fortnox developer docs: endpoint, headers (TenantId), grant_type, response format |
| Fortnox rate limits (300/min, 25/5s) | HIGH | Verified from official Fortnox developer rate limit documentation |
| Fortnox scopes | HIGH | Verified from official Fortnox developer scopes page |
| No external Fortnox SDK | HIGH | n8n guidelines discourage external deps; existing JS clients are stale and don't support client credentials |
| n8n publishing (May 2026 provenance requirement) | MEDIUM | Found in search results about upcoming requirement; verify closer to publish date |

## Sources

- [n8n Community Nodes - Build Guide](https://docs.n8n.io/integrations/community-nodes/build-community-nodes/) - Official n8n documentation
- [n8n-nodes-starter GitHub](https://github.com/n8n-io/n8n-nodes-starter) - Official starter template, package.json verified
- [n8n Credential Files Reference](https://github.com/n8n-io/n8n-docs/blob/main/docs/integrations/creating-nodes/build/reference/credentials-files.md) - ICredentialType documentation
- [n8n GithubApi.credentials.ts](https://github.com/n8n-io/n8n/blob/master/packages/nodes-base/credentials/GithubApi.credentials.ts) - Reference credential implementation
- [@n8n/node-cli npm](https://www.npmjs.com/package/@n8n/node-cli) - v0.21.0, official CLI
- [n8n-workflow npm](https://www.npmjs.com/package/n8n-workflow) - v2.9.0, peer dependency
- [Fortnox Developer Portal](https://www.fortnox.se/developer) - Official developer documentation
- [Fortnox Authorization](https://www.fortnox.se/developer/authorization) - OAuth2 flow documentation
- [Fortnox Get Access Token](https://www.fortnox.se/developer/authorization/get-access-token) - Token endpoint details
- [Fortnox Client Credentials](https://www.fortnox.se/developer/authorization/get-access-token-using-client-credentials) - Client credentials grant type with TenantId header
- [Fortnox Scopes](https://www.fortnox.se/developer/guides-and-good-to-know/scopes) - Complete scope list
- [Fortnox Rate Limits](https://www.fortnox.se/developer/guides-and-good-to-know/rate-limits-for-fortnox-api) - 300 req/min, sliding window
- [Fortnox Parameters](https://www.fortnox.se/developer/guides-and-good-to-know/parameters) - Pagination, sorting, filtering
- [Fortnox API Docs (Swagger)](https://api.fortnox.se/apidocs) - OpenAPI specification available for download
- [Fortnox Integration Checklist](https://www.fortnox.se/developer/checklist) - Required steps for building integrations
- [n8n preAuthentication discussion](https://community.n8n.io/t/custom-node-credentials-preauthentication-method-doesnt-execute-http-request/27808) - Community insights on preAuthentication pattern
- [n8n Submit Community Nodes](https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/) - Publishing requirements including May 2026 provenance mandate
