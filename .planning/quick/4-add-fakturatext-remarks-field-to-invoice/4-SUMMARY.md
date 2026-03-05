---
phase: quick-4
plan: 01
subsystem: api
tags: [fortnox, invoice, remarks, fakturatext]

requires:
  - phase: 02-resources
    provides: commonInvoiceFields pattern in InvoiceDescription.ts
provides:
  - Remarks (Fakturatext) field on invoice create and update operations
affects: []

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - nodes/Fortnox/InvoiceDescription.ts

key-decisions:
  - "Used typeOptions rows:4 for multiline textarea matching OrderDescription Remarks pattern"

patterns-established: []

requirements-completed: [QUICK-4]

duration: 1min
completed: 2026-03-05
---

# Quick Task 4: Add Fakturatext (Remarks) Field to Invoice Summary

**Remarks (Fakturatext) multiline field added to invoice create/update via commonInvoiceFields**

## Performance

- **Duration:** <1 min
- **Started:** 2026-03-05T09:25:18Z
- **Completed:** 2026-03-05T09:25:49Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added Remarks field to commonInvoiceFields array in InvoiceDescription.ts
- Field uses multiline textarea (rows: 4) for invoice text input
- Alphabetically positioned between Our Reference and Terms Of Payment
- Automatically available in both Create (Additional Fields) and Update (Update Fields)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Remarks field to commonInvoiceFields** - `4fef8cac` (feat)

## Files Created/Modified
- `nodes/Fortnox/InvoiceDescription.ts` - Added Remarks field to commonInvoiceFields

## Decisions Made
- Used `typeOptions: { rows: 4 }` for multiline textarea, matching the same pattern used in OrderDescription.ts Remarks field

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

---
*Quick Task: 4-add-fakturatext-remarks-field-to-invoice*
*Completed: 2026-03-05*
