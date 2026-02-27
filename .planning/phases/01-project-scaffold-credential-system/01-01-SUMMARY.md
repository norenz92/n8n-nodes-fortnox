---
phase: 01-project-scaffold-credential-system
plan: 01
subsystem: auth
tags: [n8n, fortnox, oauth, client-credentials, typescript, credential-type]

# Dependency graph
requires: []
provides:
  - npm package skeleton with n8n community node conventions
  - FortnoxApi credential type with preAuthentication token flow
  - Scope selection UI with 18 Fortnox scopes and 5 core defaults
  - Bearer token injection via IAuthenticateGeneric
affects: [01-02, 02-01, 04-01]

# Tech tracking
tech-stack:
  added: [n8n-workflow, "@n8n/node-cli", typescript, eslint, prettier, release-it]
  patterns: [preAuthentication with expirable hidden field, client credentials grant, IAuthenticateGeneric Bearer injection]

key-files:
  created:
    - package.json
    - tsconfig.json
    - eslint.config.mjs
    - .prettierrc.js
    - .gitignore
    - LICENSE.md
    - credentials/FortnoxApi.credentials.ts
  modified: []

key-decisions:
  - "Used preAuthentication pattern (proven in Metabase) for automatic token caching with expirable hidden field"
  - "18 Fortnox scopes as multiOptions with 5 core defaults (companyinformation, invoice, customer, article, order)"
  - "URL-encoded string body with encodeURIComponent for scope parameter in token request"

patterns-established:
  - "preAuthentication + expirable hidden field: n8n automatically re-fetches tokens when expired"
  - "IAuthenticateGeneric with Bearer template: '=Bearer {{$credentials.accessToken}}'"
  - "n8n community node package structure: credentials/, nodes/, dist/ output"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-08, OPS-04, OPS-05]

# Metrics
duration: 3min
completed: 2026-02-27
---

# Phase 1 Plan 01: Project Scaffold + Credential Type Summary

**n8n community node package with Fortnox client credentials preAuthentication, expirable token caching, and 18-scope multiOptions selector**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-27T10:57:41Z
- **Completed:** 2026-02-27T11:01:03Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- npm package skeleton with correct n8n community node configuration, TypeScript compilation, and linting
- FortnoxApi credential type with preAuthentication sending client_credentials grant to Fortnox token endpoint
- Automatic token caching via expirable hidden field -- n8n re-fetches before 1-hour expiry
- Scope selection with 18 Fortnox API scopes and 5 core defaults pre-selected

## Task Commits

Each task was committed atomically:

1. **Task 1: Create npm package skeleton** - `34ca4d7` (feat)
2. **Task 2: Implement FortnoxApi credential type** - `095f591` (feat)

## Files Created/Modified
- `package.json` - npm package manifest with n8n-community-node-package keyword and n8n section
- `tsconfig.json` - TypeScript config targeting ES2019 with commonjs modules
- `eslint.config.mjs` - ESLint config importing from @n8n/node-cli
- `.prettierrc.js` - Prettier config with tabs, single quotes per n8n conventions
- `.gitignore` - Ignore rules for node_modules, dist, build artifacts
- `LICENSE.md` - MIT license
- `credentials/FortnoxApi.credentials.ts` - Fortnox credential type with preAuthentication, 5 properties, Bearer injection, and credential test

## Decisions Made
- Used preAuthentication pattern (proven in Metabase credentials) for automatic token caching with expirable hidden field
- 18 Fortnox scopes presented as multiOptions with 5 core defaults (companyinformation, invoice, customer, article, order)
- Body uses URL-encoded string with encodeURIComponent for scope parameter since scopes are space-separated
- Basic auth header constructed with Buffer.from Base64 encoding of ClientId:ClientSecret
- TenantId sent as separate header (not in body) per Fortnox API requirements

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Package skeleton and credential type ready for Plan 01-02 (Fortnox node with credential test feedback, icon, and build verification)
- preAuthentication pattern implemented; credential test will be enhanced with custom feedback in the node-level credentialTest (Plan 02)
- TypeScript compiles cleanly with all n8n-workflow types

## Self-Check: PASSED

All 7 created files verified present. Both task commits (34ca4d7, 095f591) verified in git log.

---
*Phase: 01-project-scaffold-credential-system*
*Completed: 2026-02-27*
