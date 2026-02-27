---
phase: 02-invoice-resource
plan: 01
subsystem: api
tags: [n8n, fortnox, generic-functions, rate-limit, pagination, error-handling, invoice, typescript]

# Dependency graph
requires:
  - phase: 01-01
    provides: npm package skeleton, FortnoxApi credential type with preAuthentication
  - phase: 01-02
    provides: Fortnox node with credential test, build pipeline
provides:
  - fortnoxApiRequest helper with rate-limit retry (exponential backoff on 429)
  - fortnoxApiRequestAllItems pagination helper using MetaInformation.@TotalPages
  - Swedish-to-English error translation for 10 common Fortnox error codes
  - Invoice resource with 8 operation definitions (bookkeep, cancel, create, credit, get, getMany, send, update)
  - Invoice field definitions including fixedCollection for InvoiceRows
affects: [02-02, 03-01, 03-02]

# Tech tracking
tech-stack:
  added: []
  patterns: [fortnoxApiRequest with 429 retry and exponential backoff, page-based pagination via MetaInformation, NodeApiError with English error mapping, fixedCollection for line items, returnAll toggle with limit fallback]

key-files:
  created:
    - nodes/Fortnox/GenericFunctions.ts
    - nodes/Fortnox/InvoiceDescription.ts
  modified: []

key-decisions:
  - "FortnoxApiError interface for typed error handling instead of any -- satisfies no-explicit-any lint rule"
  - "Title Case for all displayName values per n8n lint rules (not sentence case as plan originally specified)"
  - "Options type fields default to valid option values (not empty string) per n8n lint rule"
  - "Filters collection alphabetized by displayName per n8n lint rule"
  - "commonInvoiceFields shared array between Additional Fields and Update Fields to avoid duplication"

patterns-established:
  - "fortnoxApiRequest: centralized API helper with httpRequestWithAuthentication, 429 retry, and error translation"
  - "fortnoxApiRequestAllItems: page-based pagination loop reading MetaInformation.@TotalPages"
  - "FORTNOX_ERROR_MAP: Record<number, string> for Swedish-to-English error translation"
  - "invoiceRowFields: reusable fixedCollection row values for create and update operations"
  - "commonInvoiceFields: shared field definitions spread into both additionalFields and updateFields"

requirements-completed: [INV-01, INV-02, INV-03, INV-04, INV-05, INV-06, INV-07, INV-08, OPS-01, OPS-02, OPS-03]

# Metrics
duration: 4min
completed: 2026-02-27
---

# Phase 2 Plan 01: GenericFunctions + InvoiceDescription Summary

**Fortnox API request helper with rate-limit retry and Swedish-to-English error translation, plus Invoice resource with 8 operations and fixedCollection line items**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-27T12:26:10Z
- **Completed:** 2026-02-27T12:30:46Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- GenericFunctions.ts with fortnoxApiRequest (429 retry with exponential backoff) and fortnoxApiRequestAllItems (page-based pagination)
- Swedish-to-English error translation mapping 10 common Fortnox error codes via parseFortnoxError
- InvoiceDescription.ts with 8 alphabetically ordered operations and complete field definitions
- fixedCollection for InvoiceRows with ArticleNumber, AccountNumber, DeliveredQuantity, Description, Price
- getMany operation with returnAll toggle, limit field, and filters collection (status filter, date range, sort)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create GenericFunctions.ts with API request, pagination, and error helpers** - `60bc7f4` (feat)
2. **Task 2: Create InvoiceDescription.ts with all 8 operation definitions and field properties** - `b5143e3` (feat)

## Files Created/Modified
- `nodes/Fortnox/GenericFunctions.ts` - API request helper with rate-limit retry, pagination helper, error translation with 10 Fortnox error codes
- `nodes/Fortnox/InvoiceDescription.ts` - Invoice resource operations (8) and field definitions for all operations including fixedCollection for line items

## Decisions Made
- Used `FortnoxApiError` interface instead of `any` for error parameter typing -- satisfies `@typescript-eslint/no-explicit-any` lint rule while maintaining proper error property access
- Title Case for all displayName values per n8n lint requirement (plan originally specified sentence case)
- Options-type fields default to a valid option value instead of empty string per n8n lint rule (e.g., filter defaults to 'cancelled', language to 'SV', sortBy to 'DocumentNumber')
- Shared `commonInvoiceFields` array between Additional Fields (create) and Update Fields (update) to avoid code duplication
- Shared `invoiceRowFields` array between create and update invoice row definitions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Title Case required for displayName values**
- **Found during:** Task 2 (lint verification)
- **Issue:** Plan specified sentence case displayNames (e.g., 'Article number') but n8n lint rule `node-param-display-name-miscased` requires Title Case (e.g., 'Article Number')
- **Fix:** Changed all displayName values to Title Case
- **Files modified:** nodes/Fortnox/InvoiceDescription.ts
- **Committed in:** b5143e3

**2. [Rule 2 - Missing Critical] Options fields require valid default values**
- **Found during:** Task 2 (lint verification)
- **Issue:** Plan specified `default: ''` for options-type fields (filter, sortby, sortorder, InvoiceType, Language) but n8n lint rule `node-param-default-wrong-for-options` requires a valid option value
- **Fix:** Set defaults to valid option values (cancelled, DocumentNumber, ascending, INVOICE, SV)
- **Files modified:** nodes/Fortnox/InvoiceDescription.ts
- **Committed in:** b5143e3

**3. [Rule 2 - Missing Critical] Collection items must be alphabetically ordered**
- **Found during:** Task 2 (lint verification)
- **Issue:** Filters collection had items in logical grouping order but n8n lint rule `node-param-collection-type-unsorted-items` requires alphabetical order by displayName
- **Fix:** Reordered filters: Filter, From Date, Sort By, Sort Order, To Date
- **Files modified:** nodes/Fortnox/InvoiceDescription.ts
- **Committed in:** b5143e3

**4. [Rule 1 - Bug] no-explicit-any lint errors in GenericFunctions.ts**
- **Found during:** Task 2 (lint verification of full project)
- **Issue:** Three `any` types used in GenericFunctions.ts for error parameter, return type, and catch clause
- **Fix:** Created FortnoxApiError interface, changed return type to IDataObject, used type assertion in catch clause
- **Files modified:** nodes/Fortnox/GenericFunctions.ts
- **Committed in:** b5143e3

**5. [Rule 1 - Bug] MetaInformation property access type error**
- **Found during:** Task 2 (TypeScript compilation after lint fix)
- **Issue:** `response.MetaInformation?.['@TotalPages']` caused TS7053 because IDataObject value type doesn't have string index
- **Fix:** Cast MetaInformation to `IDataObject | undefined` before accessing `@TotalPages`
- **Files modified:** nodes/Fortnox/GenericFunctions.ts
- **Committed in:** b5143e3

---

**Total deviations:** 5 auto-fixed (2 bugs, 3 missing critical)
**Impact on plan:** All auto-fixes necessary for lint compliance and TypeScript compilation. No scope creep.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- GenericFunctions.ts ready for use by execute() method in Plan 02-02
- InvoiceDescription.ts ready to be imported and spread into Fortnox.node.ts properties array
- Both files export cleanly and can be consumed by the node implementation
- Error map and pagination helper will be reused by Phase 3 resources (Customer, Article, Order)
- Zero TypeScript errors, zero lint errors

## Self-Check: PASSED

All 2 created files verified present. Both task commits (60bc7f4, b5143e3) verified in git log.

---
*Phase: 02-invoice-resource*
*Completed: 2026-02-27*
