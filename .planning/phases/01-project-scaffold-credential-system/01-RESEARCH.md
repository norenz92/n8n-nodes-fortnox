# Phase 1: Project Scaffold + Credential System - Research

**Researched:** 2026-02-27
**Domain:** n8n community node development, Fortnox API authentication (client credentials grant)
**Confidence:** HIGH

## Summary

This phase creates the npm package skeleton for `n8n-nodes-fortnox` and implements the Fortnox credential type with client credentials grant authentication. The n8n community node ecosystem has a well-established starter template (`n8n-nodes-starter`) that uses `@n8n/node-cli` for build tooling, TypeScript compilation, and ESLint/Prettier configuration. The credential system uses the `ICredentialType` interface with `preAuthentication` for token fetching and `IAuthenticateGeneric` for injecting Bearer tokens into requests.

Fortnox supports a **client credentials grant** flow specifically for **service accounts**. After initial OAuth consent (handled in Phase 4), the integrator can use `grant_type=client_credentials` with the `TenantId` header to obtain access tokens without managing refresh tokens. This is the ideal flow for server-to-server automation in n8n. The token endpoint is `POST https://apps.fortnox.se/oauth-v1/token`, tokens last 1 hour, and the company information endpoint (`GET /3/companyinformation`) returns `CompanyName` for credential validation.

**Primary recommendation:** Scaffold from the official `n8n-nodes-starter` template, implement credentials using the `preAuthentication` + expirable hidden field pattern (proven in Metabase credentials), and use the Fortnox client credentials grant with `TenantId` header for token acquisition.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Technical labels matching Fortnox API docs: "Client ID", "Client Secret", "Tenant ID"
- Each field has description/help text explaining where to find the value (e.g., "Found in Fortnox Developer Portal under your app settings")
- No external documentation links on the credential form -- help text is self-contained
- Client Secret field is masked (password input type)
- Field order: Client ID, Client Secret, Tenant ID
- Success message shows company name: "Connected to Acme AB"
- After successful auth, validate that requested scopes are actually granted for the tenant
- Missing scopes show as "success with warnings" -- auth works but warns which scopes are missing (e.g., "Connected to Acme AB. Warning: missing scopes: invoice, article")
- Scopes are configurable per credential (not hardcoded)
- Scope configuration is on the main credential form (not hidden in Advanced)
- Core scopes selected by default: invoice, customer, article, order, company info
- Additional/niche scopes (suppliers, offers, etc.) available but unchecked by default
- Display name: "Fortnox"
- Icon: Official Fortnox logo as SVG
- Category: "Finance & Accounting"

### Claude's Discretion
- Node description/subtitle text
- Error message specificity for credential test failures (based on Fortnox API error responses)
- Broader scope selection strategy (which non-core scopes to include as options)
- Exact help text wording for credential fields
- Token refresh timing and caching strategy

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | Fortnox credential type stores ClientId, ClientSecret, and TenantId per client | ICredentialType properties array with `string` and `password` types; field order and labels locked by user decisions |
| AUTH-02 | Credential uses client credentials grant to obtain access tokens from `apps.fortnox.se/oauth-v1/token` | Verified: Fortnox supports `grant_type=client_credentials` with Base64(ClientId:ClientSecret) as Basic auth + `TenantId` header. Returns `access_token` with 3600s TTL |
| AUTH-03 | Access tokens are automatically refreshed before expiry (1-hour TTL, no refresh tokens) | `preAuthentication` pattern with `expirable: true` hidden field; n8n re-calls `preAuthentication` when token expires. Metabase credential proves the pattern |
| AUTH-04 | Each client has their own n8n credential with unique TenantId | Each credential instance stores its own TenantId field; n8n credential system is inherently per-instance |
| AUTH-08 | All foreseeable Fortnox scopes requested upfront during consent | Scope selection UI on credential form; full scope list researched (23 scopes total). Core defaults + additional options pattern |
| COMP-01 | User can retrieve company information | `GET /3/companyinformation` returns `CompanyName`, `DatabaseNumber`, `OrganizationNumber` etc. Used for credential test validation |
| OPS-04 | Node follows n8n community node conventions | Starter template structure, `@n8n/node-cli` tooling, TypeScript, INodeType interface, programmatic style |
| OPS-05 | Package is publishable to npm as `n8n-nodes-fortnox` | `n8n-community-node-package` keyword, `files: ["dist"]`, proper `n8n` section in package.json |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `n8n-workflow` | `*` (peer dep) | Type definitions for ICredentialType, INodeType, etc. | Required peer dependency for all n8n community nodes |
| `@n8n/node-cli` | `*` (dev dep) | Build, lint, dev server, and release tooling | Official n8n CLI for community node development; replaces deprecated `n8n-node-dev` |
| `typescript` | `5.9.2` | TypeScript compiler | Version from current n8n-nodes-starter template |
| `eslint` | `9.32.0` | Code linting | Version from current n8n-nodes-starter; config imported from `@n8n/node-cli/eslint` |
| `prettier` | `3.6.2` | Code formatting | Version from current n8n-nodes-starter |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `release-it` | `^19.0.4` | npm publish workflow | For versioning and publishing to npm |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@n8n/node-cli` | Manual tsc + custom scripts | Lose dev server, metadata generation, lint config. No reason to avoid the official tool. |
| `preAuthentication` pattern | Manual token fetch in `execute()` | Loses automatic token caching/refresh. preAuthentication is the correct pattern if it works (verified in Metabase). |
| Programmatic node style | Declarative style | Declarative is simpler for pure HTTP API nodes but gives less control for complex auth. Phase 1 needs a minimal node; Phase 2+ will use programmatic for resource operations. |

**Installation:**
```bash
npm init -y
npm install --save-peer n8n-workflow
npm install --save-dev @n8n/node-cli typescript@5.9.2 eslint@9.32.0 prettier@3.6.2 release-it@^19.0.4
```

## Architecture Patterns

### Recommended Project Structure
```
n8n-nodes-fortnox/
├── credentials/
│   └── FortnoxApi.credentials.ts       # ICredentialType with preAuthentication
├── nodes/
│   └── Fortnox/
│       ├── Fortnox.node.ts              # INodeType (minimal for Phase 1)
│       ├── Fortnox.node.json            # Codex metadata (category, subcategories)
│       └── fortnox.svg                  # Fortnox logo icon
├── icons/                               # Shared icons (if light/dark variants)
├── .github/
│   └── workflows/                       # CI (optional for Phase 1)
├── .prettierrc.js                       # Prettier config (tabs, single quotes)
├── eslint.config.mjs                    # ESLint config (imports from @n8n/node-cli)
├── tsconfig.json                        # TypeScript config targeting ES2019
├── package.json                         # n8n community node package manifest
├── LICENSE.md
└── .gitignore
```

### Pattern 1: preAuthentication Token Fetching (from Metabase credential)
**What:** Use a hidden `expirable` field to cache the access token. n8n calls `preAuthentication` when the field is empty or expired, which fetches a new token. The `authenticate` property then injects the cached token as a Bearer header.
**When to use:** When the API uses short-lived tokens obtained via a separate token endpoint (exactly our case).
**Example:**
```typescript
// Source: https://github.com/n8n-io/n8n/blob/master/packages/nodes-base/credentials/MetabaseApi.credentials.ts
import type {
    IAuthenticateGeneric,
    ICredentialDataDecryptedObject,
    ICredentialTestRequest,
    ICredentialType,
    IHttpRequestHelper,
    INodeProperties,
} from 'n8n-workflow';

export class FortnoxApi implements ICredentialType {
    name = 'fortnoxApi';
    displayName = 'Fortnox API';
    properties: INodeProperties[] = [
        {
            displayName: 'Access Token',
            name: 'accessToken',
            type: 'hidden',
            typeOptions: { expirable: true },
            default: '',
        },
        // ... user-visible fields: clientId, clientSecret, tenantId, scopes
    ];

    async preAuthentication(
        this: IHttpRequestHelper,
        credentials: ICredentialDataDecryptedObject,
    ) {
        const clientId = credentials.clientId as string;
        const clientSecret = credentials.clientSecret as string;
        const tenantId = credentials.tenantId as string;
        const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        const response = await this.helpers.httpRequest({
            method: 'POST',
            url: 'https://apps.fortnox.se/oauth-v1/token',
            headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'TenantId': tenantId,
            },
            body: 'grant_type=client_credentials',
        });

        return { accessToken: response.access_token };
    }

    authenticate: IAuthenticateGeneric = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Bearer {{$credentials.accessToken}}',
            },
        },
    };

    test: ICredentialTestRequest = {
        request: {
            baseURL: 'https://api.fortnox.se',
            url: '/3/companyinformation',
        },
    };
}
```

### Pattern 2: Credential Test with Custom Feedback (node-level credentialTest)
**What:** Define a `credentialTest` method in the node's `methods` object to return custom success/error messages (e.g., "Connected to Acme AB").
**When to use:** When the simple `ICredentialTestRequest` on the credential type is insufficient (we need to parse the response and show the company name).
**Important caveat:** Node-level `credentialTest` methods require proper packaging (`n8n-node build` generates metadata). They DO NOT work when loading nodes from `~/.n8n/custom/` during development -- use `npm run dev` from `@n8n/node-cli` instead.
**Example:**
```typescript
// In Fortnox.node.ts
import type {
    ICredentialTestFunctions,
    ICredentialsDecrypted,
    INodeCredentialTestResult,
} from 'n8n-workflow';

// In the node class:
methods = {
    credentialTest: {
        async fortnoxApiTest(
            this: ICredentialTestFunctions,
            credential: ICredentialsDecrypted,
        ): Promise<INodeCredentialTestResult> {
            try {
                const response = await this.helpers.request({
                    method: 'GET',
                    uri: 'https://api.fortnox.se/3/companyinformation',
                    headers: {
                        Authorization: `Bearer ${credential.data!.accessToken}`,
                    },
                    json: true,
                });

                const companyName = response.CompanyInformation?.CompanyName;
                // Scope validation logic here...

                return {
                    status: 'OK',
                    message: `Connected to ${companyName}`,
                };
            } catch (error) {
                return {
                    status: 'Error',
                    message: `Authentication failed: ${error.message}`,
                };
            }
        },
    },
};

// In description.credentials:
credentials: [
    {
        name: 'fortnoxApi',
        required: true,
        testedBy: 'fortnoxApiTest',
    },
],
```

### Pattern 3: Scope Selection UI with Multiselect
**What:** Use n8n's `multiOptions` property type to present scopes as a checklist with defaults.
**When to use:** When users need to select from a predefined list with some items pre-selected.
**Example:**
```typescript
{
    displayName: 'Scopes',
    name: 'scopes',
    type: 'multiOptions',
    default: ['companyinformation', 'invoice', 'customer', 'article', 'order'],
    options: [
        { name: 'Company Information', value: 'companyinformation' },
        { name: 'Invoice', value: 'invoice' },
        { name: 'Customer', value: 'customer' },
        { name: 'Article', value: 'article' },
        { name: 'Order', value: 'order' },
        { name: 'Bookkeeping', value: 'bookkeeping' },
        { name: 'Supplier', value: 'supplier' },
        { name: 'Supplier Invoice', value: 'supplierinvoice' },
        { name: 'Offer', value: 'offer' },
        { name: 'Salary', value: 'salary' },
        { name: 'Cost Center', value: 'costcenter' },
        { name: 'Currency', value: 'currency' },
        { name: 'Price', value: 'price' },
        { name: 'Project', value: 'project' },
        { name: 'Settings', value: 'settings' },
        { name: 'Archive', value: 'archive' },
        { name: 'Print', value: 'print' },
        { name: 'Assets', value: 'assets' },
    ],
    description: 'Scopes to request when obtaining access tokens. Must match scopes granted during client consent.',
}
```

### Anti-Patterns to Avoid
- **Storing tokens in workflow data:** Always use credential fields with `expirable: true`. n8n handles encryption and lifecycle.
- **Hardcoding scopes:** Scopes must be configurable per credential (user decision).
- **Using `n8n-node-dev`:** Deprecated. Use `@n8n/node-cli` instead.
- **Putting credential test in `~/.n8n/custom/`:** Node-level `credentialTest` needs proper packaging. Use `npm run dev` for local testing.
- **Using `request` in preAuthentication:** Only `httpRequest` is available via `IHttpRequestHelper`. The older `request` method is not accessible in credential context.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Base64 encoding of client credentials | Custom encoding function | `Buffer.from().toString('base64')` | Node.js built-in, handles encoding correctly |
| Token caching and expiry | Custom timer/cache | n8n's `expirable: true` + `preAuthentication` | n8n manages the lifecycle, re-calls preAuthentication when needed |
| HTTP request plumbing | Raw `fetch` or `axios` | `this.helpers.httpRequest()` | n8n's helper handles proxy settings, SSL, and error normalization |
| Build tooling | Custom webpack/tsc config | `@n8n/node-cli` (`n8n-node build`) | Generates metadata, handles asset copying, enforces conventions |
| ESLint config | Custom rules | `import { config } from '@n8n/node-cli/eslint'` | Pre-configured rules for n8n node conventions |

**Key insight:** The n8n ecosystem provides official tooling for nearly every aspect of community node development. Fighting the conventions (custom build, custom lint, manual metadata) causes packaging and compatibility issues.

## Common Pitfalls

### Pitfall 1: preAuthentication httpRequest Failure
**What goes wrong:** The `preAuthentication` method's `httpRequest` call silently fails, leaving the token field empty.
**Why it happens:** Incorrect request format (wrong Content-Type, body encoding, or URL). The `httpRequest` helper in credential context has limited error surfacing.
**How to avoid:** Use `application/x-www-form-urlencoded` Content-Type with string body (not object). Test with exact curl equivalent first. Ensure the response is parsed correctly.
**Warning signs:** Token field stays empty, all API calls return 401.

### Pitfall 2: Credential Test Not Found
**What goes wrong:** n8n shows "No testing function found for this credential" when clicking the test button.
**Why it happens:** Node-level `credentialTest` methods require metadata generated by `n8n-node build`. Simple file copying or symlinking to `~/.n8n/custom/` skips this step.
**How to avoid:** Use `npm run dev` (which runs `n8n-node dev`) for local development. For production, install via npm. Never rely on `~/.n8n/custom/` for nodes with `credentialTest`.
**Warning signs:** Test button fails even though the credential fields are correct.

### Pitfall 3: package.json n8n Section Misconfiguration
**What goes wrong:** Node or credential doesn't appear in n8n after installation.
**Why it happens:** Paths in the `n8n.credentials` or `n8n.nodes` arrays don't match the actual compiled file paths in `dist/`.
**How to avoid:** Paths must be `dist/credentials/FortnoxApi.credentials.js` (not `.ts`, and must include `dist/` prefix). Verify after build that the files exist at those paths.
**Warning signs:** Package installs without errors but credential type doesn't show up.

### Pitfall 4: Fortnox Token Request Body Encoding
**What goes wrong:** Token endpoint returns 400 Bad Request.
**Why it happens:** Sending JSON body instead of URL-encoded form body, or missing the `TenantId` header.
**How to avoid:** Body must be a URL-encoded string: `grant_type=client_credentials&scope=companyinformation%20invoice%20customer%20article%20order`. The `TenantId` header is a separate numeric value, NOT part of the body.
**Warning signs:** 400 errors from `apps.fortnox.se/oauth-v1/token`.

### Pitfall 5: Scope Mismatch Between Request and Consent
**What goes wrong:** Token request succeeds but returns a subset of requested scopes, or fails entirely.
**Why it happens:** The `scope` parameter in the token request can only request scopes that were granted during the initial OAuth consent. Requesting scopes not in the consent will silently drop them.
**How to avoid:** Compare the `scope` field in the token response against what was requested. Surface missing scopes as warnings in the credential test (user decision).
**Warning signs:** API calls for certain resources return 403 despite valid token.

### Pitfall 6: Icon File Not Found
**What goes wrong:** Node shows a generic icon or build fails.
**Why it happens:** SVG file path in node description doesn't match actual file location. The `icon` property uses `'file:fortnox.svg'` which is relative to the node file's directory.
**How to avoid:** Place the SVG file in the same directory as the `.node.ts` file, or use the `{ light: 'file:path', dark: 'file:path' }` format for themed icons.
**Warning signs:** Missing icon in n8n UI, or build warnings about missing assets.

## Code Examples

Verified patterns from official sources:

### Fortnox Client Credentials Token Request
```typescript
// Source: https://www.fortnox.se/developer/authorization/get-access-token-using-client-credentials
// POST https://apps.fortnox.se/oauth-v1/token
// Headers:
//   Authorization: Basic {Base64(ClientId:ClientSecret)}
//   Content-Type: application/x-www-form-urlencoded
//   TenantId: {numeric tenant ID}
// Body: grant_type=client_credentials&scope=companyinformation invoice customer article order

// Response:
// {
//   "access_token": "xyz...",
//   "scope": "companyinformation invoice customer article order",
//   "expires_in": 3600,
//   "token_type": "bearer"
// }
```

### Fortnox Company Information Response
```typescript
// Source: https://developer.fortnox.se/documentation/resources/company-information/
// GET https://api.fortnox.se/3/companyinformation
// Headers:
//   Authorization: Bearer {access_token}

// Response:
// {
//   "CompanyInformation": {
//     "Address": "Bollv\u00e4gen",
//     "City": "V\u00e4xj\u00f6",
//     "CountryCode": "SE",
//     "DatabaseNumber": 654896,
//     "CompanyName": "Fortnox",
//     "OrganizationNumber": "556469-6291",
//     "VisitAddress": "",
//     "VisitCity": "",
//     "VisitCountryCode": "",
//     "VisitZipCode": "",
//     "ZipCode": "35246"
//   }
// }
// Note: DatabaseNumber IS the TenantId
```

### n8n Community Node package.json
```json
// Source: https://github.com/n8n-io/n8n-nodes-starter/blob/master/package.json
{
    "name": "n8n-nodes-fortnox",
    "version": "0.1.0",
    "description": "n8n community node for Fortnox accounting API",
    "keywords": ["n8n-community-node-package"],
    "license": "MIT",
    "author": { "name": "", "email": "" },
    "repository": { "type": "git", "url": "" },
    "scripts": {
        "build": "n8n-node build",
        "build:watch": "tsc --watch",
        "dev": "n8n-node dev",
        "lint": "n8n-node lint",
        "lint:fix": "n8n-node lint --fix",
        "release": "n8n-node release",
        "prepublishOnly": "n8n-node prerelease"
    },
    "files": ["dist"],
    "n8n": {
        "n8nNodesApiVersion": 1,
        "strict": true,
        "credentials": [
            "dist/credentials/FortnoxApi.credentials.js"
        ],
        "nodes": [
            "dist/nodes/Fortnox/Fortnox.node.js"
        ]
    },
    "devDependencies": {
        "@n8n/node-cli": "*",
        "eslint": "9.32.0",
        "prettier": "3.6.2",
        "release-it": "^19.0.4",
        "typescript": "5.9.2"
    },
    "peerDependencies": {
        "n8n-workflow": "*"
    }
}
```

### n8n INodeCredentialTestResult Pattern
```typescript
// Source: https://github.com/n8n-io/n8n/blob/master/packages/nodes-base/nodes/HomeAssistant/HomeAssistant.node.ts
// Return format for credential test functions:
return {
    status: 'OK',      // or 'Error'
    message: 'Connected to Acme AB',  // shown to user
};

// Error format:
return {
    status: 'Error',
    message: 'Authentication failed: Invalid credentials',
};
```

### tsconfig.json for n8n Community Nodes
```json
// Source: https://github.com/n8n-io/n8n-nodes-starter/blob/master/tsconfig.json
{
    "compilerOptions": {
        "strict": true,
        "module": "commonjs",
        "moduleResolution": "node",
        "target": "es2019",
        "lib": ["es2019", "es2020", "es2022.error"],
        "removeComments": true,
        "useUnknownInCatchVariables": false,
        "forceConsistentCasingInFileNames": true,
        "noImplicitAny": true,
        "noImplicitReturns": true,
        "noUnusedLocals": true,
        "strictNullChecks": true,
        "preserveConstEnums": true,
        "esModuleInterop": true,
        "resolveJsonModule": true,
        "incremental": true,
        "declaration": true,
        "sourceMap": true,
        "skipLibCheck": true,
        "outDir": "./dist/"
    },
    "include": ["credentials/**/*", "nodes/**/*", "nodes/**/*.json", "package.json"]
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `n8n-node-dev` package | `@n8n/node-cli` package | 2024 | New CLI with `n8n-node build/dev/lint/release` commands |
| `NodeConnectionType.Main` string literal | `NodeConnectionTypes.Main` enum | n8n 1.x | Use enum import from `n8n-workflow` |
| `this.helpers.request()` (deprecated) | `this.helpers.httpRequest()` | n8n 0.x to 1.x | httpRequest is the modern helper; request still works but is legacy |
| Fortnox legacy Access-Token header auth | Fortnox OAuth2 (authorization code + client credentials) | 2021-2022 | Old API key auth removed; must use OAuth2 |

**Deprecated/outdated:**
- `n8n-node-dev`: Replaced by `@n8n/node-cli`. Do not use.
- Fortnox "Access-Token" header auth: Completely removed. OAuth2 only.
- `this.helpers.request()`: Still functional but `this.helpers.httpRequest()` is preferred.

## Open Questions

1. **preAuthentication Reliability in Current n8n Versions**
   - What we know: The Metabase credential uses this pattern in production and is part of n8n core. A community forum post from 2023 reported issues, but the Metabase example works.
   - What's unclear: Whether there are edge cases with the `expirable` field timing (does n8n refresh proactively before expiry, or only after a 401?).
   - Recommendation: Implement with `preAuthentication` as primary approach. If issues arise during testing, fallback to manual token management in the node's `execute()` method. The Metabase pattern is HIGH confidence as it ships with n8n.

2. **Scope Validation in Credential Test**
   - What we know: The token response includes a `scope` field listing granted scopes. We can compare requested vs. granted.
   - What's unclear: Whether `INodeCredentialTestResult` with `status: 'OK'` but a warning in the `message` is the right UX pattern for "success with warnings." n8n may display this differently than expected.
   - Recommendation: Return `status: 'OK'` with a message like `"Connected to Acme AB. Warning: missing scopes: invoice, article"`. Test the UX during development.

3. **Scope Parameter Encoding in Token Request**
   - What we know: Fortnox docs show `scope=companyinformation article` (space-separated). URL encoding would make this `scope=companyinformation%20article`.
   - What's unclear: Whether `httpRequest` with `application/x-www-form-urlencoded` auto-encodes spaces, or if we need to manually encode.
   - Recommendation: Build the body string manually with proper URL encoding. Test with a minimal scope first (`companyinformation`).

4. **Fortnox Logo SVG Availability**
   - What we know: The user decided to use the official Fortnox logo as SVG.
   - What's unclear: Licensing terms for using the Fortnox logo in a community node package.
   - Recommendation: Create or obtain the Fortnox "F" logo mark as a simplified SVG suitable for 60x60px display. Check Fortnox brand guidelines if available.

## Sources

### Primary (HIGH confidence)
- [Fortnox Developer: Client Credentials Token](https://www.fortnox.se/developer/authorization/get-access-token-using-client-credentials) - Token endpoint, headers, body format, response format
- [Fortnox Developer: Service Accounts](https://www.fortnox.se/developer/blog/service-accounts) - Service account setup, `account_type=service` parameter
- [Fortnox Developer: Scopes](https://www.fortnox.se/developer/guides-and-good-to-know/scopes) - Complete scope list (23 scopes)
- [Fortnox Developer: Authorization](https://www.fortnox.se/developer/authorization) - OAuth2 overview, token TTL (1 hour), refresh token (45 days)
- [Fortnox Developer: Company Information](https://developer.fortnox.se/documentation/resources/company-information/) - Response format with CompanyName field
- [n8n-io/n8n: MetabaseApi.credentials.ts](https://github.com/n8n-io/n8n/blob/master/packages/nodes-base/credentials/MetabaseApi.credentials.ts) - preAuthentication pattern with expirable token
- [n8n-io/n8n-nodes-starter](https://github.com/n8n-io/n8n-nodes-starter) - Official community node starter template
- [n8n-io/n8n-docs: Credentials files reference](https://github.com/n8n-io/n8n-docs/blob/main/docs/integrations/creating-nodes/build/reference/credentials-files.md) - ICredentialType interface
- [n8n-io/n8n: HomeAssistant.node.ts](https://github.com/n8n-io/n8n/blob/master/packages/nodes-base/nodes/HomeAssistant/HomeAssistant.node.ts) - INodeCredentialTestResult pattern (status + message)
- Context7 `/n8n-io/n8n-docs` - Community node package.json, credential structure, httpRequestWithAuthentication

### Secondary (MEDIUM confidence)
- [n8n Community: preAuthentication issue](https://community.n8n.io/t/custom-node-credentials-preauthentication-method-doesnt-execute-http-request/27808) - Known issues with preAuthentication (resolved by correct request format)
- [n8n Community: credentialTest in custom nodes](https://community.n8n.io/t/bug-cant-use-credentialtest-method-in-custom-node/94069) - Packaging requirement for node-level credentialTest
- [n8n Docs: Using the n8n-node tool](https://docs.n8n.io/integrations/creating-nodes/build/n8n-node/) - @n8n/node-cli commands
- [DeepWiki: n8n Credential System](https://deepwiki.com/n8n-io/n8n/4.5-credential-system) - Credential resolution, token caching overview

### Tertiary (LOW confidence)
- Fortnox logo SVG: No official source found; needs to be created or obtained from Fortnox brand assets

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official n8n-nodes-starter template is well-documented and current
- Architecture: HIGH - preAuthentication pattern verified in Metabase (ships with n8n core), Fortnox client credentials endpoint verified in official docs
- Pitfalls: HIGH - Multiple community reports of specific issues; verified against official sources
- Fortnox API: HIGH - Official developer documentation is comprehensive and current
- Credential test UX: MEDIUM - INodeCredentialTestResult structure verified, but "success with warnings" UX pattern is untested

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable domain; n8n starter template and Fortnox API unlikely to change)
