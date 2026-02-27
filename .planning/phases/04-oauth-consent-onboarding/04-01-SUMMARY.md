---
phase: 04-oauth-consent-onboarding
plan: 01
subsystem: auth
tags: [oauth, fortnox, n8n-workflow, jwt, webhook, consent, csrf]

# Dependency graph
requires:
  - phase: 01-credentials-and-node-scaffold
    provides: FortnoxApi credential type with clientId, clientSecret, tenantId fields and preAuthentication pattern
provides:
  - Complete n8n workflow template for Fortnox OAuth consent onboarding
  - TenantId capture via JWT decode from authorization code flow
  - Self-service client onboarding link for agencies
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Two-webhook OAuth flow pattern (start + callback in same workflow)
    - CSRF state token via n8n Data Table with TTL validation
    - JWT decode without external libraries (Buffer.from base64)
    - Redirect URI auto-detection from Host header

key-files:
  created:
    - workflows/fortnox-consent-onboarding.json
  modified:
    - package.json

key-decisions:
  - "Duplicate App Settings node for callback branch -- n8n executes /start and /callback as separate workflow runs, so $('App Settings') reference only works within same execution"
  - "Hardcoded all 18 Fortnox scopes per AUTH-08 -- simplifies workflow, agency can edit JSON if fewer scopes needed"
  - "Data Table for CSRF state storage instead of workflow static data -- more reliable, especially on n8n Cloud"
  - "continueErrorOutput on Code nodes routes errors to friendly HTML error page"
  - "Omitted access_type=offline -- consent only captures TenantId, actual API access uses client_credentials grant"

patterns-established:
  - "n8n workflow template pattern: portable JSON with sticky note setup instructions"
  - "OAuth consent capture pattern: /start redirect -> /callback token exchange -> JWT decode -> Data Table upsert"

requirements-completed: [AUTH-05, AUTH-06, AUTH-07]

# Metrics
duration: 4min
completed: 2026-02-27
---

# Phase 4 Plan 1: OAuth Consent Onboarding Workflow Summary

**Portable n8n workflow template for Fortnox OAuth consent onboarding with JWT TenantId extraction, Data Table storage, Slack notification, and styled HTML response pages**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-27T14:30:44Z
- **Completed:** 2026-02-27T14:35:09Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Complete 24-node n8n workflow with /start and /callback webhook branches
- CSRF state parameter protection with Data Table storage and 10-minute TTL validation
- JWT access token decoding to extract TenantId without external libraries
- Company info verification via Fortnox API confirms consent and retrieves company name
- Upsert storage in Fortnox Consents Data Table prevents duplicate rows
- Slack notification with company name and TenantId on successful consent
- Styled HTML success and error pages (static, iframe-sandbox safe)
- 5 sticky notes with complete setup instructions
- Workflow bundled in npm package via updated files array

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the complete OAuth consent onboarding workflow JSON** - `e07e9b3` (feat)
2. **Task 2: Bundle workflow in npm package and verify** - `cc85d25` (chore)

## Files Created/Modified
- `workflows/fortnox-consent-onboarding.json` - Complete 24-node n8n workflow template for OAuth consent onboarding
- `package.json` - Added "workflows" to files array for npm distribution

## Decisions Made
- Duplicated App Settings node for callback branch because /start and /callback execute as separate n8n workflow runs -- the Set node must exist in each execution path
- Used continueErrorOutput on Code nodes (Validate Callback Params, Verify State Token, Decode JWT) to route errors to the HTML error page instead of crashing the workflow
- Hardcoded all 18 Fortnox scopes in the authorization URL to avoid re-authorization per AUTH-08

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added duplicate App Settings node for callback branch**
- **Found during:** Task 1 (Workflow JSON creation)
- **Issue:** Plan specified single App Settings node, but /start and /callback are separate n8n executions -- `$('App Settings')` only works within the same execution context
- **Fix:** Added "App Settings1" node in the callback branch wired between Fortnox OAuth Callback and Validate Callback Params; updated Build Auth Header to reference App Settings1
- **Files modified:** workflows/fortnox-consent-onboarding.json
- **Verification:** Workflow JSON validates, all node references are consistent within their execution branches
- **Committed in:** e07e9b3 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix for workflow correctness. Without this, the callback branch would fail at runtime when referencing the /start branch's App Settings node.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. The workflow template is self-documented via sticky notes.

## Next Phase Readiness
- Phase 4 is the final phase in the v1.0 milestone
- All 4 phases complete: credentials, invoices, customer/article/order resources, and OAuth consent onboarding
- Ready for milestone completion

---
*Phase: 04-oauth-consent-onboarding*
*Completed: 2026-02-27*
