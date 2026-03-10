---
phase: quick-5
plan: 1
subsystem: api
tags: [fortnox, invoice, json, n8n-node]

requires:
  - phase: 02-invoice-customer
    provides: Invoice create/update operations and InvoiceDescription fields
provides:
  - JSON array input for invoice rows (invoiceRowsJson parameter)
  - Zero-price row filtering toggle (excludeZeroPriceRows)
affects: [invoice]

tech-stack:
  added: []
  patterns: [dual-input normalization with JSON priority over fixedCollection]

key-files:
  created: []
  modified:
    - nodes/Fortnox/InvoiceDescription.ts
    - nodes/Fortnox/Fortnox.node.ts

key-decisions:
  - "JSON rows take priority over fixedCollection when both provided"
  - "excludeZeroPriceRows placed in commonInvoiceFields to share between create and update"
  - "NodeOperationError with itemIndex for invalid JSON input"

patterns-established:
  - "Dual-input pattern: JSON field + fixedCollection with JSON taking priority"

requirements-completed: [QUICK-5a, QUICK-5b]

duration: 2min
completed: 2026-03-10
---

# Quick Task 5: Fix Invoice Creation - Support Item List Summary

**JSON array input for dynamic invoice rows with zero-price row filtering toggle**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-10T13:34:43Z
- **Completed:** 2026-03-10T13:36:09Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added invoiceRowsJson parameter (type json) for passing dynamic row arrays from prior nodes
- Added excludeZeroPriceRows boolean toggle in Additional Fields and Update Fields
- JSON rows take priority over fixedCollection; both inputs remain functional
- Zero-price filtering works in both create and update operations
- Invalid JSON input produces clear NodeOperationError

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Invoice Rows JSON parameter and Exclude Zero Price toggle** - `d031e3ca` (feat)
2. **Task 2: Update invoice create/update execute logic** - `5cc4b98d` (feat)

## Files Created/Modified
- `nodes/Fortnox/InvoiceDescription.ts` - Added invoiceRowsJson field and excludeZeroPriceRows toggle in commonInvoiceFields
- `nodes/Fortnox/Fortnox.node.ts` - Dual-input row normalization, zero-price filtering, NodeOperationError import

## Decisions Made
- JSON rows take priority over fixedCollection when both are provided -- prevents confusion and supports dynamic use case
- excludeZeroPriceRows placed in commonInvoiceFields shared array so it appears in both create Additional Fields and update Update Fields
- Used NodeOperationError with itemIndex for clear error reporting on invalid JSON

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

---
*Quick Task: 5-fix-invoice-creation-support-item-list-l*
*Completed: 2026-03-10*
