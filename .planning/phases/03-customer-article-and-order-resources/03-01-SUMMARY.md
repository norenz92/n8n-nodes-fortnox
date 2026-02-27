---
phase: 03-customer-article-and-order-resources
plan: 01
subsystem: api
tags: [n8n, fortnox, customer, article, INodeProperties, resource-description]

# Dependency graph
requires:
  - phase: 02-invoice-resource
    provides: InvoiceDescription.ts pattern (operations array, fields array, commonFields, filters)
provides:
  - CustomerDescription.ts with customerOperations and customerFields exports
  - ArticleDescription.ts with articleOperations and articleFields exports
  - commonCustomerFields shared array (56 writable fields)
  - commonArticleFields shared array (31 writable fields)
affects: [03-customer-article-and-order-resources]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "commonFields shared array pattern for Additional Fields and Update Fields"
    - "Resource description file pattern for simpler (non-line-item) resources"

key-files:
  created:
    - nodes/Fortnox/CustomerDescription.ts
    - nodes/Fortnox/ArticleDescription.ts
  modified: []

key-decisions:
  - "VAT Type options alphabetized by display name with SEVAT as default (most common Swedish use case)"
  - "Article Type options: STOCK/SERVICE with STOCK as default (inventory-oriented default)"

patterns-established:
  - "Simple resource description: operations + identifier + required create field + returnAll/limit + filters + additionalFields/updateFields with commonFields"

requirements-completed: [CUST-01, CUST-02, CUST-03, CUST-04, ART-01, ART-02, ART-03, ART-04, ART-05]

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 03 Plan 01: Customer and Article Description Summary

**Customer and Article resource description files with full Fortnox API field coverage (56 customer fields, 31 article fields) following InvoiceDescription.ts pattern**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T13:34:53Z
- **Completed:** 2026-02-27T13:37:13Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- CustomerDescription.ts with 5 operations (create/delete/get/getMany/update) and 56 writable fields
- ArticleDescription.ts with 5 operations (create/delete/get/getMany/update) and 31 writable fields
- Both files follow exact InvoiceDescription.ts conventions: Title Case, alphabetized options, valid defaults
- Read-only fields properly excluded (Country/DeliveryCountry/VisitingCountry for Customer; SalesPrice/StockValue/etc. for Article)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create CustomerDescription.ts with full field coverage** - `25fa993` (feat)
2. **Task 2: Create ArticleDescription.ts with full field coverage** - `8955876` (feat)

## Files Created/Modified
- `nodes/Fortnox/CustomerDescription.ts` - Customer resource operations, filters, and 56 writable field definitions
- `nodes/Fortnox/ArticleDescription.ts` - Article resource operations, filters, and 31 writable field definitions

## Decisions Made
- VAT Type options alphabetized by display name (EU Reversed VAT, EU VAT, Export, SE Reversed VAT, SE VAT) with SEVAT as default
- Article Type options: STOCK/SERVICE with STOCK as default (inventory-oriented default)
- HouseworkType kept as string type (not options) per research recommendation since enum values are not fully known

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CustomerDescription.ts and ArticleDescription.ts ready for wiring into Fortnox.node.ts in Plan 03
- Both files export operations and fields arrays matching the pattern used by InvoiceDescription.ts

## Self-Check: PASSED

- FOUND: nodes/Fortnox/CustomerDescription.ts
- FOUND: nodes/Fortnox/ArticleDescription.ts
- FOUND: 03-01-SUMMARY.md
- FOUND: commit 25fa993
- FOUND: commit 8955876

---
*Phase: 03-customer-article-and-order-resources*
*Completed: 2026-02-27*
