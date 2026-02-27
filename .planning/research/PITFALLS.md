# Domain Pitfalls

**Domain:** n8n community node for Fortnox API (Swedish accounting SaaS)
**Researched:** 2026-02-27

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Misunderstanding the Two-Phase Auth Flow (Consent vs. Token)

**What goes wrong:** Developers conflate the one-time OAuth authorization code flow (for capturing consent and TenantId) with the ongoing client credentials token flow (for API access). They try to build a standard OAuth2 credential type in n8n, which expects refresh tokens and a single-step flow. Fortnox's service account pattern is fundamentally different: authorization code creates consent, then client credentials + TenantId are used forever after. Trying to use n8n's built-in OAuth2 credential type will not work because it expects refresh token rotation, not a separate client_credentials grant with a custom TenantId header.

**Why it happens:** Most OAuth2 implementations follow the standard authorization code + refresh token pattern. Fortnox's `account_type=service` flow breaks this expectation by splitting "consent creation" from "token acquisition" into two completely separate mechanisms.

**Consequences:** Complete credential system rewrite. If you build on n8n's built-in OAuth2Api credential type, you will hit a wall when you realize it cannot send a TenantId header in token requests, cannot skip refresh token management, and cannot handle client_credentials grant type properly. There are documented n8n issues (#16857) where generic OAuth2 Client Credentials grant fails entirely.

**Prevention:** Build a fully custom `ICredentialType` with manual token management. Store ClientId, ClientSecret, and TenantId as credential properties. Implement the token request in the node's `execute` method or via the credential's `authenticate` method, making a direct POST to `https://apps.fortnox.se/oauth-v1/token` with Basic auth header and TenantId header. Do not extend or rely on n8n's built-in OAuth2 credential handling.

**Detection:** If you find yourself fighting n8n's OAuth2 flow to add custom headers or skip refresh tokens, you have taken the wrong path.

**Confidence:** HIGH -- verified against Fortnox official docs and n8n GitHub issues.

**Phase:** Must be resolved in the credential/auth phase (Phase 1). Everything depends on this.

---

### Pitfall 2: TenantId Capture Has No Built-in n8n Mechanism

**What goes wrong:** The OAuth authorization code flow returns a `code` parameter in the redirect callback. To get the TenantId, you must either (a) exchange the auth code for a JWT access token and decode the TenantId claim, (b) use Fortnox webhook events for "consent created", or (c) query `/3/companyinformation` after getting a temporary access token. None of these are things n8n's credential system supports natively. Developers realize mid-implementation that they have the consent but no way to capture and store the TenantId.

**Why it happens:** n8n's credential UI is designed for static fields (API key, secret, etc.) or standard OAuth flows. There is no built-in mechanism for "redirect user, capture callback data, extract a claim from a JWT, and store it as a credential field." The TenantId capture requires a custom workflow or external endpoint.

**Consequences:** Without TenantId, the client credentials flow cannot work at all. The entire per-client credential model breaks down. You end up needing to build a separate authorization workflow or webhook receiver outside the credential system.

**Prevention:** Design the TenantId capture as part of a separate onboarding workflow or n8n trigger node, not as part of the credential type itself. The approach should be: (1) agency creates a credential with ClientId + ClientSecret, (2) a separate n8n workflow handles the OAuth redirect, captures the auth code, exchanges it for a token, extracts TenantId from the JWT, and stores it back into a new credential instance. Alternatively, use Fortnox's consent webhook to receive TenantId automatically when a client authorizes.

**Detection:** If you are trying to add a "Connect" button to the credential form that handles the full OAuth redirect flow, you are overcomplicating it.

**Confidence:** HIGH -- verified against Fortnox authorization docs and n8n credential system architecture.

**Phase:** Must be architected in Phase 1 (Auth). The solution design determines the entire user experience.

---

### Pitfall 3: n8n Package.json Node Registration Silently Fails

**What goes wrong:** The community node builds and publishes successfully, but does not appear in n8n's node picker. Users install it and see nothing. The most common cause is incorrect or missing entries in the `package.json` `n8n` section -- specifically, the `n8n.nodes` and `n8n.credentials` arrays must point to the compiled `.js` files (in `dist/`), not the TypeScript source files.

**Why it happens:** The n8n documentation is sparse on this detail. The node registration relies on exact paths in `package.json`. The `n8n.nodes` array must contain paths like `"dist/nodes/Fortnox/Fortnox.node.js"`, and the `n8n.credentials` array must contain `"dist/credentials/FortnoxApi.credentials.js"`. A single typo, missing `dist/` prefix, or pointing to `.ts` instead of `.js` causes silent failure with no error message.

**Consequences:** The node installs via npm but never appears in n8n. Users report "it doesn't work" with no actionable error. Extremely frustrating to debug because there is no error log -- n8n simply ignores unresolvable entries.

**Prevention:** Use the n8n-node-dev CLI tool to scaffold the project. After every build, verify the compiled files exist at the exact paths listed in `package.json`. Add a CI check that validates all paths in `n8n.nodes` and `n8n.credentials` resolve to actual files in `dist/`. Test installation in a clean n8n instance before every release.

**Detection:** Node does not appear in n8n's search after installation. Check `package.json` paths against actual `dist/` contents.

**Confidence:** HIGH -- verified from multiple n8n community forum reports and official troubleshooting docs.

**Phase:** Build/packaging phase. Must be validated from the very first build.

---

### Pitfall 4: Token Expiry Handling in Workflow Execution Context

**What goes wrong:** Fortnox access tokens expire after 1 hour. In a long-running n8n workflow with multiple Fortnox nodes, the token obtained at the start may expire before the workflow completes. Unlike refresh token flows where n8n automatically refreshes, with client credentials you must manually detect 403/401 responses and re-request tokens.

**Why it happens:** Client credentials tokens are "stateless" -- you get a new one each time. But n8n's credential system caches credentials during workflow execution. If you fetch a token at credential load time and cache it, subsequent nodes in the same workflow reuse the stale token. This is especially problematic in workflows triggered by schedules that process many items.

**Consequences:** Workflows fail partway through with authentication errors. Users see intermittent failures that are hard to reproduce because they depend on workflow duration and timing.

**Prevention:** Implement token caching with TTL awareness. Store the token and its expiry timestamp. Before each API call, check if the token will expire within the next 5 minutes (buffer). If so, request a new token. Alternatively, request a fresh token for each API call (simple but adds latency). Given the scale is under 10 clients, the per-call approach is acceptable and much simpler.

**Detection:** Sporadic 401/403 errors in workflows that process many items or run for more than 45-50 minutes.

**Confidence:** MEDIUM -- based on Fortnox token expiry documentation (1 hour) and n8n execution patterns. The exact caching behavior of n8n's credential system during execution needs validation.

**Phase:** Credential implementation phase. Must be designed into the token acquisition logic from the start.

---

### Pitfall 5: Fortnox Error Messages Are in Swedish

**What goes wrong:** Fortnox API error responses return messages in Swedish (e.g., `"Kan inte hitta kontot."` for "Cannot find the account"). Developers who do not speak Swedish pass these messages through to n8n users without translation, creating a confusing experience. Additionally, error codes are numeric (e.g., 2000423) with no standard HTTP mapping -- the same HTTP 400 status code covers dozens of different business logic errors.

**Why it happens:** Fortnox is a Swedish product. Their API was designed for the Swedish market first. The error response structure `{"ErrorInformation": {"error": 1, "message": "...", "code": 2000423}}` uses Swedish messages and Fortnox-specific numeric codes.

**Consequences:** Users cannot understand or act on error messages. Support requests increase. Debugging becomes painful because you need to map numeric codes to descriptions using Fortnox's documentation.

**Prevention:** Build an error mapping layer. For the most common error codes (auth failures 2000310/2000311, missing license 2001103, scope errors 2000663/2001101, validation errors 2000106/2000108), provide English translations and actionable hints in the `NodeApiError` message. For unknown codes, include both the original Swedish message and the error code number so users can look them up. Format: `"Fortnox error {code}: {english_translation} (Original: {swedish_message})"`.

**Detection:** Users reporting cryptic error messages or asking "what does this error mean?" in support.

**Confidence:** HIGH -- verified from Fortnox error documentation showing Swedish-language messages.

**Phase:** Node implementation phase. Build the error mapping table early and expand it as new errors are encountered.

## Moderate Pitfalls

### Pitfall 6: Rate Limiting Per Access Token, Not Per IP

**What goes wrong:** Developers assume rate limits are per-IP or per-application and build shared token pools or batch operations accordingly. Fortnox rate limits are 25 requests per 5 seconds (300/minute) per client-id AND tenant combination. Hitting the limit returns HTTP 429 with no `Retry-After` header. The sliding window means bursts are penalized until the average drops back to 25/5s.

**Why it happens:** Most APIs rate-limit by IP or API key. Fortnox's per-tenant rate limiting means each client has their own quota, which is actually favorable for multi-tenant setups but must be understood.

**Prevention:** Implement retry logic with exponential backoff for 429 responses. In n8n node context, use `NodeApiError` with the `httpCode: '429'` property so n8n's built-in retry mechanism can handle it. For bulk operations (like creating many invoices), add a deliberate delay between requests (200ms minimum) to stay under the 25/5s limit. The per-tenant isolation is actually good news for the agency model -- one client's heavy usage does not affect another's.

**Detection:** HTTP 429 responses during bulk operations or rapid sequential API calls.

**Confidence:** HIGH -- verified from Fortnox rate limits documentation.

**Phase:** Node implementation phase. Retry logic should be part of the HTTP request wrapper.

---

### Pitfall 7: Scope Changes Require New Authorization

**What goes wrong:** After initial release, you want to add a new Fortnox resource (e.g., Suppliers) that requires a new scope. Existing clients' consents do not include this scope. You cannot "upgrade" an existing consent -- the client must go through the authorization flow again with the new scope list.

**Why it happens:** Fortnox's consent model ties specific scopes to the authorization. The official FAQ states: "Adding/removing scopes requires creating new authorization codes to update Access-Token permissions." This means every scope change is a breaking change for existing clients.

**Prevention:** Request ALL scopes you will ever need upfront in the initial authorization. For this project, request at minimum: `invoice`, `customer`, `article`, `order`, `companyinformation`. Consider also requesting `supplier`, `supplierinvoice`, `offer`, `project`, and any other scopes you might plausibly add. The downside is a longer consent screen, but the upside is never needing re-authorization. Document which scopes are required and which are "future-proofing."

**Detection:** Adding a new resource to the node and discovering existing clients get "missing scope" errors (2000663 or 2001101).

**Confidence:** HIGH -- verified from Fortnox FAQ and authorization documentation.

**Phase:** Auth design phase (Phase 1). Scope list must be finalized before any client authorizes.

---

### Pitfall 8: Fortnox Requires Customer Licensing for API Access

**What goes wrong:** A client authorizes the integration, the TenantId is captured, tokens work, but API calls return error 2001103 ("API license missing") or 2001101 ("No active license for scope"). The client's Fortnox account does not have the required license tier to use the API for that resource.

**Why it happens:** Fortnox requires specific licenses for API access. For example, invoices require a "Kundfaktura" or "Order" license. Articles require an "Order" or "Kundfaktura" license. Clients on basic Fortnox plans may not have these. This is a Fortnox business requirement, not a technical limitation.

**Prevention:** Document the required Fortnox licenses clearly in the node's README and in the credential setup instructions. When the node encounters error codes 2001103 or 2001101, provide a clear error message explaining that the client needs to upgrade their Fortnox plan or activate the relevant module. Consider adding a "test connection" feature that calls `/3/companyinformation` (which has the lowest license requirements) to verify basic connectivity before attempting resource-specific operations.

**Detection:** API calls failing with license-related error codes despite valid authentication.

**Confidence:** HIGH -- verified from Fortnox scopes documentation and FAQ.

**Phase:** Documentation and error handling phase. Must be addressed before client onboarding.

---

### Pitfall 9: Using `httpRequestWithAuthentication` Instead of Manual Token Injection

**What goes wrong:** n8n provides `httpRequestWithAuthentication` and `requestWithAuthentication` helper methods for making authenticated API calls. Developers assume these methods work interchangeably for custom credential types. They do not. `httpRequestWithAuthentication` may not properly invoke the custom `authenticate` method on credentials, causing silent authentication failures. Community reports confirm this causes "Credentials not found" errors or missing headers.

**Why it happens:** n8n has two request methods with subtle differences. `requestWithAuthentication` uses the older `request` library and properly invokes credential authentication. `httpRequestWithAuthentication` uses the newer `axios`-based implementation but has documented issues with custom credential types, especially for non-standard auth flows.

**Prevention:** For the Fortnox node, implement token management directly in the node's `execute` method rather than relying on credential-level `authenticate` methods. Fetch the token by making a direct HTTP call to the Fortnox token endpoint, then add the `Authorization: Bearer {token}` header to all subsequent API calls manually. This gives you full control over the token lifecycle and avoids framework-level authentication bugs.

**Detection:** Authentication works in credential test but fails during workflow execution, or vice versa.

**Confidence:** MEDIUM -- based on multiple community reports (issues #16857, #11025, forum posts). The exact current behavior may have been fixed in recent n8n versions. Validate against your target n8n version.

**Phase:** Node implementation phase. Decide the request pattern early and stick with it.

---

### Pitfall 10: Pagination Not Matching Fortnox's Offset-Based Pattern

**What goes wrong:** Fortnox uses page-based pagination with a maximum of 500 items per page (`?limit=500&page=1`). Developers either forget pagination entirely (returning only the first 100 items, the default page size) or implement cursor-based pagination which Fortnox does not support. The "Get All" operation silently returns incomplete data.

**Why it happens:** Many modern APIs use cursor-based pagination. Fortnox uses simple page numbers. Additionally, the default page size is 100, so small test datasets never reveal the pagination bug -- it only appears in production with real client data.

**Prevention:** For every "List" / "Get All" operation, implement a loop that increments the page number until the response returns fewer items than the requested limit. Set limit=500 (the maximum) for efficiency. Expose a "Return All" toggle in the n8n UI that defaults to `false` with a configurable limit, matching n8n's standard patterns for list operations. Always test with datasets exceeding 500 items.

**Detection:** Users reporting "missing" records. List operations returning exactly 100 items when more exist.

**Confidence:** HIGH -- verified from Fortnox API documentation and common API integration patterns.

**Phase:** Node implementation phase. Pagination must be built into every list operation from the start.

---

### Pitfall 11: Not Implementing `continueOnFail` Pattern

**What goes wrong:** When a single item in a batch fails (e.g., creating 50 invoices and one has invalid data), the entire workflow execution stops. In n8n, nodes should support the `continueOnFail` option so users can choose whether to stop on error or continue processing remaining items.

**Why it happens:** Developers wrap the entire execute method in a single try/catch. Instead, each item should be processed individually with its own error handling.

**Prevention:** In the `execute` method, iterate over input items individually. Wrap each item's processing in its own try/catch. When an error occurs:
- If `this.continueOnFail()` returns true, add the error to the output with `{ json: { error: message }, pairedItem: { item: index } }`
- If false, throw a `NodeApiError` or `NodeOperationError`

This follows n8n's standard pattern and gives users control over error behavior.

**Detection:** Users unable to process batches because one bad item kills the entire workflow.

**Confidence:** HIGH -- standard n8n development pattern documented in official guides.

**Phase:** Node implementation phase. Must be implemented from the first operation.

## Minor Pitfalls

### Pitfall 12: Fortnox Customer Numbers Are Not Reusable After Deletion

**What goes wrong:** When creating customers, developers might try to reuse a customer number from a previously deleted customer. Fortnox reserves customer numbers permanently -- even after deletion, the number cannot be reassigned. Error code 2000637 ("Customer number already used") is returned.

**Prevention:** Let Fortnox auto-assign customer numbers (omit the CustomerNumber field in create requests) or implement a numbering strategy that never recycles. Document this behavior in the node's operation descriptions.

**Confidence:** HIGH -- documented error code in Fortnox API.

**Phase:** Node implementation phase.

---

### Pitfall 13: HTML Encoding Requirement for Text Fields

**What goes wrong:** Fortnox requires all text data to be HTML-encoded. Swedish characters (a, a, o) and special characters must be properly encoded in requests. Sending raw UTF-8 without HTML encoding causes character corruption or validation errors (2000359).

**Prevention:** Apply HTML encoding to all string fields before sending to the Fortnox API. Use a library like `he` (HTML entities) or Node.js built-in encoding. Verify encoding by testing with Swedish text like "Faktura for Alvsjokoncernen" (with proper Swedish characters).

**Confidence:** MEDIUM -- Fortnox docs state "All data in the requests and responses shall be HTML encoded and using UTF-8 encoding." The exact encoding behavior needs validation -- it may mean the API expects HTML entities in JSON payloads, or it may refer only to XML format (which Fortnox also supports). Test this early.

**Phase:** Node implementation phase. Build encoding into the request layer.

---

### Pitfall 14: npm Publishing Without Provenance After May 2026

**What goes wrong:** Starting May 1, 2026, n8n requires ALL community nodes to be published using a GitHub Action with provenance statements. Publishing directly via `npm publish` from a local machine will result in the node being rejected or unlisted.

**Prevention:** Set up a GitHub Actions workflow from day one that handles `npm publish` with the `--provenance` flag. Use the standard npm publish action with `id-token: write` permission. This is a hard requirement -- not a nice-to-have.

**Detection:** Node published but not appearing in n8n's community node directory after May 2026.

**Confidence:** MEDIUM -- based on n8n community node documentation mentioning the May 2026 deadline. Verify the exact requirements closer to the deadline.

**Phase:** CI/CD and publishing phase.

---

### Pitfall 15: Verified Node Rejection Due to Runtime Dependencies

**What goes wrong:** If you later want to get the node verified for n8n Cloud, verified community nodes are not allowed to use ANY runtime dependencies. Only dev dependencies for building are permitted. Using a library like `axios` or `he` at runtime will cause rejection.

**Prevention:** Use only n8n's built-in HTTP request helpers (`this.helpers.httpRequest` or `this.helpers.request`) for HTTP calls. For HTML encoding, implement a minimal utility function inline rather than importing a library. Design the architecture to be dependency-free from the start, even if you do not plan to seek verification immediately.

**Detection:** Verification request rejected with "runtime dependencies not allowed" message.

**Confidence:** HIGH -- explicitly stated in n8n verification guidelines.

**Phase:** Architecture phase. The zero-dependency constraint must inform all technical decisions.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Auth/Credentials | Pitfall 1: Trying to use n8n's built-in OAuth2 | Build fully custom ICredentialType with manual token management |
| Auth/Credentials | Pitfall 2: No mechanism for TenantId capture | Design onboarding workflow or webhook receiver separately |
| Auth/Credentials | Pitfall 7: Insufficient scopes requested | Request all foreseeable scopes upfront |
| Auth/Credentials | Pitfall 4: Token caching without TTL | Implement per-call token fetch or TTL-aware caching |
| Node Implementation | Pitfall 5: Swedish error messages | Build error code mapping table with English translations |
| Node Implementation | Pitfall 6: Hitting rate limits in batch ops | Implement backoff + deliberate pacing (200ms between calls) |
| Node Implementation | Pitfall 9: Wrong request helper method | Use manual token injection, not framework auth methods |
| Node Implementation | Pitfall 10: Missing or broken pagination | Implement page-based loop with limit=500 for all list ops |
| Node Implementation | Pitfall 11: No continueOnFail support | Per-item try/catch in execute method |
| Node Implementation | Pitfall 13: Character encoding issues | Test with Swedish text, apply HTML encoding to string fields |
| Packaging/Publishing | Pitfall 3: Node not appearing after install | Validate package.json paths against dist/ contents in CI |
| Packaging/Publishing | Pitfall 14: No provenance in npm publish | GitHub Actions CI/CD with --provenance flag from day one |
| Architecture | Pitfall 15: Runtime dependencies block verification | Zero runtime dependencies from the start |
| Client Onboarding | Pitfall 8: Missing Fortnox licenses | Clear documentation of required license tiers |

## Sources

- [Fortnox Client Credentials Authorization](https://www.fortnox.se/developer/authorization/get-access-token-using-client-credentials) -- HIGH confidence
- [Fortnox Authorization Code Flow](https://www.fortnox.se/developer/authorization/get-authorization-code) -- HIGH confidence
- [Fortnox Developer FAQ](https://www.fortnox.se/developer/faq) -- HIGH confidence
- [Fortnox Rate Limits](https://www.fortnox.se/developer/guides-and-good-to-know/rate-limits-for-fortnox-api) -- HIGH confidence
- [Fortnox Error Codes](https://www.fortnox.se/developer/guides-and-good-to-know/errors) -- HIGH confidence
- [Fortnox Response Format](https://www.fortnox.se/developer/guides-and-good-to-know/responses) -- HIGH confidence
- [Fortnox Scopes](https://www.fortnox.se/developer/guides-and-good-to-know/scopes) -- HIGH confidence
- [Fortnox Encoding](https://www.fortnox.se/developer/guides-and-good-to-know/formats-and-encoding) -- HIGH confidence
- [Fortnox Developer Checklist](https://www.fortnox.se/developer/checklist) -- HIGH confidence
- [n8n Building Community Nodes](https://docs.n8n.io/integrations/community-nodes/build-community-nodes/) -- HIGH confidence
- [n8n Community Node Risks](https://docs.n8n.io/integrations/community-nodes/risks/) -- HIGH confidence
- [n8n Verification Guidelines](https://docs.n8n.io/integrations/creating-nodes/build/reference/verification-guidelines/) -- HIGH confidence
- [n8n Node Starter Template](https://github.com/n8n-io/n8n-nodes-starter) -- HIGH confidence
- [n8n Generic OAuth2 Client Credentials Issue #16857](https://github.com/n8n-io/n8n/issues/16857) -- HIGH confidence
- [n8n OAuth2 HTTP Request Tool Issue #11025](https://github.com/n8n-io/n8n/issues/11025) -- HIGH confidence
- [n8n preAuthentication Issues](https://community.n8n.io/t/custom-node-credentials-preauthentication-method-doesnt-execute-http-request/27808) -- MEDIUM confidence
- [n8n authenticate Method Problems](https://community.n8n.io/t/problem-with-authenticate-method-for-custom-node/28309) -- MEDIUM confidence
- [n8n Credential System (DeepWiki)](https://deepwiki.com/n8n-io/n8n/4.5-credential-system) -- MEDIUM confidence
- [n8n Submit Community Nodes](https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/) -- HIGH confidence
- [Fortnox Client Credentials Blog Post](https://www.fortnox.se/developer/blog/say-goodbye-to-refresh-tokens-) -- HIGH confidence
- [Zwapgrid Fortnox Integration Guide](https://www.zwapgrid.com/post/how-to-build-fortnox-integration-with-api-1) -- LOW confidence
