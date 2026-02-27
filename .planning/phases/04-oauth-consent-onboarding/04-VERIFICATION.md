---
phase: 04-oauth-consent-onboarding
status: passed
verified: 2026-02-27
requirements_verified: [AUTH-05, AUTH-06, AUTH-07]
---

# Phase 4: OAuth Consent Onboarding - Verification

## Phase Goal
Clients can authorize their Fortnox account through a shareable link without ever needing n8n access, and the agency can immediately create credentials from the captured TenantId.

## Success Criteria Verification

### 1. Agency can generate a shareable URL that a client clicks to initiate Fortnox OAuth consent with account_type=service
**Status: PASSED**
- Webhook node "Client Visits Start URL" configured with path `fortnox-consent/start` and GET method
- Code node "Generate State and Auth URL" constructs authorization URL with `account_type=service` parameter
- URL includes all required OAuth params: client_id, redirect_uri, response_type=code, scope, state
- Respond to Webhook node returns 302 redirect to Fortnox authorization URL

### 2. After client completes consent, the TenantId is automatically extracted from the OAuth response and surfaced to the agency
**Status: PASSED**
- Webhook node "Fortnox OAuth Callback" receives authorization code at `/fortnox-consent/callback`
- HTTP Request node exchanges code for access token at `https://apps.fortnox.se/oauth-v1/token` with Basic auth
- Code node "Decode JWT and Extract TenantId" decodes JWT access token payload using `Buffer.from(base64)`
- Extracts `tenantId` claim from JWT payload
- HTTP Request verifies consent via `https://api.fortnox.se/3/companyinformation` to get company name
- Data Table upsert stores TenantId, Company Name, Scopes Granted, Timestamp in "Fortnox Consents" table
- Slack notification sends company name and TenantId to agency channel

### 3. Agency can create a working n8n credential from the captured TenantId without the client needing any technical knowledge or n8n access
**Status: PASSED**
- Client only interacts with the /start URL and Fortnox consent screen
- Client sees styled HTML success page with company name after authorization
- Client sees styled HTML error page if anything goes wrong
- TenantId stored in Data Table for agency to copy into FortnoxApi credential
- Sticky notes document the complete setup and usage flow

## Requirement Traceability

| Requirement | Description | Verified |
|-------------|-------------|----------|
| AUTH-05 | OAuth authorization code flow with account_type=service captures client consent and TenantId | YES - /start webhook constructs auth URL with account_type=service, /callback exchanges code and decodes JWT for TenantId |
| AUTH-06 | Shareable authorization endpoint that clients visit to initiate OAuth consent | YES - /webhook/fortnox-consent/start is a single URL agencies share with all clients |
| AUTH-07 | TenantId extracted from OAuth response and stored | YES - JWT decoded via Buffer.from base64, stored in Data Table via upsert |

## Must-Have Truths Verification

| Truth | Verified |
|-------|----------|
| Agency can share a single /webhook/fortnox-consent/start URL | YES |
| TenantId extracted from JWT access token and stored in Data Table | YES |
| Agency receives Slack notification with company name and TenantId | YES |
| Client sees styled HTML success page with company name | YES |
| Client sees styled HTML error page if anything goes wrong | YES |
| CSRF protection via state parameter | YES - Data Table storage with 10-min TTL |
| Workflow is self-documented with sticky notes | YES - 5 sticky notes |

## Artifact Verification

| Artifact | Path | Status |
|----------|------|--------|
| Workflow template | workflows/fortnox-consent-onboarding.json | EXISTS - 24 nodes, valid JSON |
| Package bundling | package.json files array | UPDATED - includes "workflows" |
| npm pack inclusion | npm pack --dry-run | CONFIRMED - workflow included |
| Build passes | npm run build | CONFIRMED |

## Automated Check Results

12/12 structural checks passed:
- Start webhook path: fortnox-consent/start
- Callback webhook path: fortnox-consent/callback
- account_type=service in authorization URL
- JWT decode with Buffer.from base64
- Data Table upsert with TenantId matching
- Slack notification node present
- HTML success page with checkmark and company name
- HTML error page with X mark and friendly message
- CSRF state token with 10-minute TTL
- Setup instructions sticky note (1 of 5)
- Company info verification at /3/companyinformation
- Token exchange at apps.fortnox.se/oauth-v1/token

## Verdict

**PASSED** - All 3 success criteria met, all 3 requirements verified, all 7 must-have truths confirmed, all 12 automated checks passed.
