# Project Research Summary

**Project:** n8n-nodes-fortnox
**Domain:** n8n community node for Fortnox accounting API (Swedish SaaS)
**Researched:** 2026-02-27
**Confidence:** HIGH (stack, features, pitfalls verified against official sources; auth pattern MEDIUM)

## Executive Summary

This project builds an n8n community node package that lets automation workflows interact with the Fortnox accounting API. The scope is a TypeScript npm package following n8n's declarative node pattern, covering the four core Fortnox resources (Invoices, Customers, Articles, Orders) that represent 95% of real-world automation demand. Experts build this class of node by cloning the official `n8n-nodes-starter` template, implementing a custom `ICredentialType` for auth, and defining resources as declarative routing configuration rather than imperative `execute()` code. The result is a zero-runtime-dependency npm package that n8n discovers and loads automatically.

The single biggest technical challenge is Fortnox's non-standard authentication. Fortnox uses a two-phase model: a one-time OAuth authorization code flow captures client consent and extracts the numeric `TenantId`, then all ongoing API access uses a client credentials grant that requires a custom `TenantId` header — a pattern n8n's built-in OAuth2 credential type cannot handle. The correct approach is a fully custom `ICredentialType` with a `preAuthentication` method that mints short-lived access tokens on demand. There is a known reliability concern with `preAuthentication` in some n8n versions; if it proves unstable, the fallback is manual token management in the node's `execute()` method. This auth architecture must be decided in Phase 1 because everything downstream depends on it.

Key risks beyond auth: Fortnox returns error messages in Swedish with numeric error codes, requiring a translation/mapping layer; rate limits are 25 requests per 5 seconds per client-tenant pair, requiring backoff logic in batch operations; and scope additions require re-authorization (every client must re-consent), so the initial scope list must be comprehensive. The project is well-suited to the declarative node pattern because Fortnox is a standard REST API with predictable CRUD endpoints. The OAuth consent onboarding workflow — the agency-model differentiator — is deliberately kept separate from the node package itself, handled as a standalone n8n webhook workflow.

## Key Findings

### Recommended Stack

The stack is fully dictated by the n8n ecosystem. Clone the official `n8n-nodes-starter` template (Node.js 22+, TypeScript 5.9, ESLint 9 flat config, Prettier 3) and do not deviate from its tooling configuration. The `@n8n/node-cli` package provides build, dev server, and lint commands. The only peer dependency is `n8n-workflow` (^2.9.0), which provides all type interfaces. Critically, there are NO runtime dependencies — this is both a best practice and a hard requirement for n8n's node verification program.

**Core technologies:**
- `n8n-nodes-starter` template: Project scaffolding — clone and adapt rather than starting from scratch; all tooling pre-configured
- TypeScript 5.9 (strict mode): Language — required by n8n ecosystem; use the starter's tsconfig verbatim
- `n8n-workflow` ^2.9.0: Peer dependency — provides `INodeType`, `ICredentialType`, `INodeProperties`, and all n8n interfaces
- `@n8n/node-cli` ^0.21.0: Dev tooling — build, dev server with watch mode, lint; installed as devDependency
- Fortnox REST API v3: Target API — base URL `https://api.fortnox.se/3/`, well-documented with OpenAPI spec
- Custom `ICredentialType` + `preAuthentication`: Auth — Fortnox client credentials + TenantId header is non-standard; n8n built-in OAuth2 does not support it

See `/Users/adamnoren/n8n-nodes-fortnox/.planning/research/STACK.md` for full details including Fortnox API reference.

### Expected Features

Fortnox automations center on invoice lifecycle management. The CRUD operations for the four core resources are table stakes — any node missing them is unusable. Invoice action operations (bookkeep, cancel, credit, send) are expected by Swedish accounting users and differentiate this node from the generic Xero node (which has only 2 resources). The agency-model feature — a shareable OAuth consent link that captures TenantId without the client needing n8n access — is the primary differentiator for the stated use case.

**Must have (table stakes):**
- Fortnox credential type (ClientId + ClientSecret + TenantId, auto-token) — nothing works without auth
- Customer: Create, Get, Get Many, Update — foundational; referenced by invoices and orders
- Article: Create, Get, Get Many, Update, Delete — required for invoice/order line items
- Invoice: Create, Get, Get Many, Update, Bookkeep, Cancel, Credit, Send — primary value driver; bookkeep is critical for Swedish accounting
- Order: Create, Get, Get Many, Update, Create Invoice, Cancel — second most common workflow pattern
- Pagination with "Return All" toggle — Fortnox defaults to 100 items (max 500); users need complete data
- Error handling with English messages — Fortnox errors are in Swedish with numeric codes; must translate

**Should have (differentiators):**
- OAuth consent onboarding workflow — agency-model enabler; shareable link captures TenantId without client having n8n access
- Supplier + Supplier Invoice CRUD — complete AP/AR automation; high value for bookkeeping agencies
- Offer: CRUD + Convert to Order/Invoice — full quote-to-cash pipeline
- Additional Fields pattern on all operations — expose optional Fortnox fields without cluttering base UI
- Date range and status filters on Get Many — critical for incremental sync workflows

**Defer (v2+):**
- Polling Trigger node — high complexity; users can use Schedule + Get Many with lastmodified as workaround
- Voucher/Journal entries — advanced accounting feature; add when agencies request it
- Company Information — nice-to-have; very low effort, add when convenient

See `/Users/adamnoren/n8n-nodes-fortnox/.planning/research/FEATURES.md` for full resource coverage map and comparison with QuickBooks/Xero nodes.

### Architecture Approach

The package follows the standard n8n community node structure: flat npm package with `credentials/` and `nodes/` directories registered via `package.json` metadata. Use declarative node style (routing-based configuration) rather than programmatic `execute()` — the Fortnox API is standard REST CRUD and maps cleanly to routing definitions. Each resource lives in its own `*Description.ts` file exporting operations and fields arrays that are spread into the main node's `properties`. Fortnox response wrapping (`{ "Invoice": {...} }` for singles, `{ "Invoices": [...] }` for lists) is handled with `postReceive rootProperty` in declarative routing. The OAuth consent onboarding flow is architecturally separate from the node package.

**Major components:**
1. `FortnoxApi.credentials.ts` — Stores ClientId, ClientSecret, TenantId; implements `preAuthentication` to fetch client_credentials access tokens; injects Bearer header into all requests
2. `Fortnox.node.ts` — Main node entry point; declarative style with `requestDefaults` pointing to `https://api.fortnox.se/3`; spreads resource description arrays
3. `resources/*Description.ts` — Per-resource operation and field definitions with declarative routing; self-contained modules
4. Separate OAuth consent workflow — Standalone n8n webhook workflow (not in the npm package) that handles initial authorization code flow, extracts TenantId, and creates per-client credentials

See `/Users/adamnoren/n8n-nodes-fortnox/.planning/research/ARCHITECTURE.md` for full patterns with TypeScript code examples.

### Critical Pitfalls

1. **Using n8n's built-in OAuth2Api for Fortnox auth** — Fortnox requires a custom `TenantId` header on token requests and uses client_credentials grant (not refresh tokens). n8n's OAuth2Api credential cannot accommodate this. Builds a fully custom `ICredentialType` with manual token management from the start. Confirmed by n8n GitHub issue #16857.

2. **Requesting insufficient scopes at initial consent** — Scope changes require clients to re-authorize from scratch. There is no "upgrade consent" path. Request ALL scopes needed for current and future resources upfront: `invoice`, `customer`, `article`, `order`, `companyinformation`, `supplier`, `supplierinvoice`, `offer`, `project`. A longer consent screen beats requiring re-authorization.

3. **Silent node registration failure** — If `package.json` `n8n.nodes` or `n8n.credentials` paths do not exactly match the compiled `dist/` output (wrong prefix, `.ts` instead of `.js`), the node installs via npm but never appears in n8n's UI with no error. Validate paths in CI from the first build.

4. **Swedish error messages passed through raw** — Fortnox errors are in Swedish with numeric codes (e.g., error 2000423). Build an error code mapping table with English translations and actionable hints for common codes (auth: 2000310/2000311, license: 2001103, scope: 2000663/2001101, validation: 2000106/2000108).

5. **Runtime dependencies blocking verification** — n8n's verified node program prohibits any runtime dependencies. Even `axios` or `he` (HTML encoding) will cause rejection. Use only `this.helpers.httpRequest()` for HTTP calls and implement any utilities (e.g., HTML encoding) as inline functions.

See `/Users/adamnoren/n8n-nodes-fortnox/.planning/research/PITFALLS.md` for all 15 pitfalls with detection and prevention strategies.

## Implications for Roadmap

Based on the dependency chain from research, a 5-phase structure is recommended. The critical constraint is that auth must work before any resource operations can be tested, and the declarative pattern should be proven on one resource before being replicated across all four.

### Phase 1: Project Scaffold + Credential System

**Rationale:** Everything depends on working authentication. The Fortnox two-phase auth model (consent capture vs. runtime token) is the highest-risk architectural decision in the project. Phase 1 must resolve it with a working, testable implementation before any resource work begins. Scope list must also be finalized here — it cannot be changed without client re-authorization.

**Delivers:** Working npm package skeleton; `FortnoxApi.credentials.ts` with `preAuthentication` token flow; credential test endpoint (`/3/companyinformation`); minimal node with one operation to validate end-to-end auth; GitHub Actions CI/CD pipeline with `--provenance` publish (required by May 2026); validated `package.json` registration paths.

**Addresses:** Credential type (FEATURES table stakes); automatic token refresh (FEATURES table stakes).

**Avoids:** Pitfall 1 (wrong OAuth2 approach), Pitfall 3 (silent registration failure), Pitfall 4 (token expiry), Pitfall 7 (insufficient scopes), Pitfall 14 (no provenance in publish), Pitfall 15 (runtime dependencies).

**Research flag:** This phase needs validation of the `preAuthentication` pattern against the target n8n version. Known issues exist in community (n8n issue #16857, #11025). Have fallback ready: manual token fetch in `execute()`.

### Phase 2: Invoice Resource (Complete)

**Rationale:** Invoice is the highest-value single resource and the primary reason users automate Fortnox. Building it completely in Phase 2 validates the full declarative pattern end-to-end, including response unwrapping (`postReceive rootProperty`), pagination, rate limit handling, and Swedish error translation. The pattern proven here is replicated in Phase 3.

**Delivers:** Invoice: Create, Get, Get Many (with pagination + "Return All"), Update, Bookkeep, Cancel, Credit, Send. Pagination loop with `limit=500`. Retry backoff for HTTP 429. Error code mapping for common Fortnox error codes. `continueOnFail` support per n8n standards.

**Addresses:** Invoice operations (FEATURES table stakes); pagination handling; error handling; rate limit awareness.

**Avoids:** Pitfall 5 (Swedish errors), Pitfall 6 (rate limit handling), Pitfall 10 (pagination), Pitfall 11 (continueOnFail).

**Research flag:** Standard patterns — no additional research needed. Fortnox invoice API is well-documented; n8n declarative pattern is established.

### Phase 3: Customer, Article, Order Resources

**Rationale:** These three resources follow the same declarative pattern validated in Phase 2. They are bundled because they are interdependent (invoices reference customers and articles; orders convert to invoices) and the implementation is largely pattern replication.

**Delivers:** Customer: Create, Get, Get Many, Update. Article: Create, Get, Get Many, Update, Delete. Order: Create, Get, Get Many, Update, Create Invoice, Cancel. All with pagination, error handling, and `continueOnFail`.

**Addresses:** Customer, Article, Order operations (FEATURES table stakes); feature dependencies (Customer -> Invoice, Article -> Invoice, Order -> Invoice).

**Avoids:** Pitfall 12 (customer number reuse), Pitfall 13 (HTML encoding for Swedish characters).

**Research flag:** Standard patterns — minimal research needed. Same declarative pattern as Phase 2. Test HTML encoding behavior with Swedish text early in this phase.

### Phase 4: OAuth Consent Onboarding Workflow

**Rationale:** The agency-model differentiator — the shareable link that captures TenantId without clients needing n8n access — is architecturally separate from the node package. It lives as a standalone n8n webhook workflow (or minimal external endpoint). It is deferred to Phase 4 because the agency can manually create credentials with known TenantIds during development of Phases 1-3.

**Delivers:** Separate n8n webhook workflow (not in the npm package) that: (1) redirects clients to Fortnox `account_type=service` auth URL; (2) receives OAuth callback with authorization code; (3) exchanges code for token; (4) extracts TenantId from JWT; (5) outputs credential values for agency to create in n8n. Documented shareable link flow.

**Addresses:** OAuth consent flow (FEATURES differentiator); per-client credentials (FEATURES table stakes).

**Avoids:** Pitfall 2 (TenantId capture has no built-in mechanism), Anti-Pattern 4 (building consent flow into the node itself).

**Research flag:** This phase may need targeted research into n8n webhook workflow patterns and JWT decoding without external libraries. The Fortnox consent endpoint is well-documented; the n8n webhook workflow implementation is the unknown.

### Phase 5: Expanded Resources + Polish + Publish

**Rationale:** After the MVP is validated with real users, add the Phase 2+ resources (Suppliers, Supplier Invoices, Offers) that differentiate this node from existing accounting nodes. Polish error messages, documentation, and README. Publish to npm with GitHub Actions provenance.

**Delivers:** Supplier: Create, Get, Get Many, Update. Supplier Invoice: Create, Get, Get Many, Bookkeep, Cancel. Offer: Create, Get, Get Many, Update, Create Order, Create Invoice, Send. Additional Fields pattern on key operations. Published npm package with `n8n-community-node-package` keyword. Complete README with required Fortnox license documentation.

**Addresses:** Supplier/Supplier Invoice/Offer (FEATURES differentiators); npm publishing with provenance.

**Avoids:** Pitfall 8 (missing Fortnox licenses — document in README), Pitfall 14 (npm provenance).

**Research flag:** Supplier Invoice payload structure is more complex than core resources (account coding, cost centers). Light research on Fortnox supplier invoice API may be warranted. Standard n8n patterns apply.

### Phase Ordering Rationale

- Phase 1 first: Auth is the dependency of all dependencies. No resource can be tested without it. The non-standard Fortnox auth pattern is also the highest implementation risk.
- Phase 2 before Phase 3: Proves the full declarative pattern (routing, pagination, error handling, response unwrapping) on the most important resource before replicating it three more times.
- Phase 3 bundles Customer+Article+Order: These are functionally interdependent and follow identical implementation patterns. Bundling avoids repetitive phase structure.
- Phase 4 separate and deferred: The consent onboarding workflow is architecturally external to the node package and can be developed independently. Manual credential creation suffices during Phases 1-3.
- Phase 5 last: Expanded resources depend on the validated core pattern. Publishing should follow real user validation.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** `preAuthentication` pattern reliability in current n8n versions — community-documented issues need validation against target n8n version before committing to this approach vs. manual token management in `execute()`.
- **Phase 4:** n8n webhook workflow implementation for OAuth callback handling — how to decode JWT, extract TenantId, and surface credential values within an n8n workflow context.

Phases with standard patterns (skip research-phase):
- **Phase 2:** Fortnox Invoice API and n8n declarative routing are both well-documented. Established patterns apply directly.
- **Phase 3:** Same declarative pattern as Phase 2. Test HTML encoding early but no research needed.
- **Phase 5:** Supplier/Offer API is documented in Fortnox OpenAPI spec. Light review sufficient.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified from official n8n starter template and npm; Fortnox API endpoints verified from official developer docs |
| Features | HIGH | Core resources verified against Fortnox OpenAPI spec; comparisons against QuickBooks/Xero n8n nodes verified from official n8n docs |
| Architecture | HIGH (with one MEDIUM) | Declarative node structure and file layout verified from n8n starter + official docs; `preAuthentication` pattern is MEDIUM — community-documented with known quirks |
| Pitfalls | HIGH | Most pitfalls verified from official sources (Fortnox docs, n8n GitHub issues); 2 pitfalls MEDIUM based on community reports |

**Overall confidence:** HIGH

### Gaps to Address

- **`preAuthentication` reliability:** Known community issues (#16857, #11025) with `httpRequest` in `preAuthentication` context. Validate against target n8n version in Phase 1. Have fallback strategy (manual token fetch in `execute()`) designed before starting implementation.
- **HTML encoding scope:** Fortnox docs state "HTML encoded UTF-8" but it is ambiguous whether this means HTML entities in JSON or UTF-8 encoding in HTTP transport. Test with Swedish characters (a, a, o) early in Phase 3 implementation.
- **TenantId from JWT:** Fortnox says TenantId is in the JWT access token from the authorization code exchange. The exact JWT claim name needs confirmation during Phase 4. Alternatively, the `/3/companyinformation` endpoint may return it more reliably.
- **npm provenance requirement timing:** n8n is requiring provenance for community nodes starting May 2026. Set up GitHub Actions publish workflow in Phase 1 to avoid last-minute issues.
- **Scope for Supplier/Offer:** Phase 5 adds resources requiring `supplier`, `supplierinvoice`, and `offer` scopes. These must be included in the Phase 1 scope list to avoid forcing existing clients to re-authorize.

## Sources

### Primary (HIGH confidence)
- [n8n-nodes-starter template](https://github.com/n8n-io/n8n-nodes-starter) — Stack versions, file structure, package.json format
- [n8n Community Nodes Build Guide](https://docs.n8n.io/integrations/community-nodes/build-community-nodes/) — Architecture patterns, registration
- [n8n Declarative Node Docs](https://docs.n8n.io/integrations/creating-nodes/build/reference/node-base-files/declarative-style-parameters/) — Routing configuration, postReceive
- [Fortnox Developer Portal](https://www.fortnox.se/developer) — API overview, guides, rate limits
- [Fortnox Authorization Docs](https://www.fortnox.se/developer/authorization) — Two-phase auth flow, TenantId, token endpoint
- [Fortnox Client Credentials Flow](https://www.fortnox.se/developer/authorization/get-access-token-using-client-credentials) — Token request format, headers
- [Fortnox API Docs (Swagger)](https://api.fortnox.se/apidocs) — All resource endpoints, request/response schemas
- [Fortnox Rate Limits](https://www.fortnox.se/developer/guides-and-good-to-know/rate-limits-for-fortnox-api) — 300 req/min, 25/5s sliding window
- [Fortnox Scopes](https://www.fortnox.se/developer/guides-and-good-to-know/scopes) — Required scopes per resource
- [Fortnox Error Codes](https://www.fortnox.se/developer/guides-and-good-to-know/errors) — Swedish error messages, numeric codes
- [n8n Verification Guidelines](https://docs.n8n.io/integrations/creating-nodes/build/reference/verification-guidelines/) — Zero runtime dependencies requirement
- [n8n Submit Community Nodes](https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/) — May 2026 provenance requirement
- [n8n GitHub Issue #16857](https://github.com/n8n-io/n8n/issues/16857) — OAuth2 client credentials failure confirmation

### Secondary (MEDIUM confidence)
- [n8n community: preAuthentication issues](https://community.n8n.io/t/custom-node-credentials-preauthentication-method-doesnt-execute-http-request/27808) — Known quirks in preAuthentication pattern
- [Client credentials OAuth in n8n (John Tuckner)](https://johntuckner.me/posts/client_credentials_n8n/) — Workaround patterns for custom token flows
- [n8n credential system (DeepWiki)](https://deepwiki.com/n8n-io/n8n/4.5-credential-system) — Internal credential lifecycle

### Tertiary (LOW confidence)
- [Zwapgrid Fortnox Integration Guide](https://www.zwapgrid.com/post/how-to-build-fortnox-integration-with-api-1) — Integration patterns, needs validation

---
*Research completed: 2026-02-27*
*Ready for roadmap: yes*
