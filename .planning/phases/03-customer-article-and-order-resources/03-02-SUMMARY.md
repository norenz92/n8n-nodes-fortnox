---
phase: 03-customer-article-and-order-resources
plan: 02
subsystem: api
tags: [n8n, fortnox, order, fixedCollection, INodeProperties]

# Dependency graph
requires:
  - phase: 02-invoice-resource
    provides: InvoiceDescription.ts pattern for operations, rows, and fields
provides:
  - OrderDescription.ts with orderOperations and orderFields exports
  - OrderRows fixedCollection with 15 writable row fields
  - commonOrderFields shared array with 39 writable order fields
  - Order-specific getMany filters (cancelled, expired, invoicecreated, invoicenotcreated)
affects: [03-03 wiring plan, order API execution logic]

# Tech tracking
tech-stack:
  added: []
  patterns: [orderRowFields reusable array, commonOrderFields shared between create/update]

key-files:
  created:
    - nodes/Fortnox/OrderDescription.ts
  modified: []

key-decisions:
  - "OrderRows includes OrderedQuantity (default 1) and DeliveredQuantity (default 0) -- order-specific fields not in InvoiceRows"
  - "15 row fields including Discount, DiscountType, HouseWork, HouseWorkHoursToReport, HouseWorkType, Project, Unit, VAT"
  - "Order filters distinct from Invoice: cancelled, expired, invoicecreated, invoicenotcreated (vs fullypaid, unpaid, unbooked)"
  - "lastmodified filter added for Orders (not present in Invoice filters)"

patterns-established:
  - "Order resource follows same structure as Invoice: operations array + fields array with shared common fields"
  - "Action operations (cancel, createInvoice) require only DocumentNumber -- no additional parameters"

requirements-completed: [ORD-01, ORD-02, ORD-03, ORD-04, ORD-05, ORD-06]

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 3 Plan 2: Order Description Summary

**OrderDescription.ts with 6 operations, 15 order row fields (including OrderedQuantity), and 39 writable common fields for full Fortnox Order API coverage**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T13:34:51Z
- **Completed:** 2026-02-27T13:36:36Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created OrderDescription.ts with 6 operations: cancel, create, createInvoice, get, getMany, update
- OrderRows fixedCollection with 15 writable row fields including OrderedQuantity and DeliveredQuantity
- 39 writable commonOrderFields shared between Additional Fields (create) and Update Fields (update)
- Order-specific getMany filters: cancelled, expired, invoicecreated, invoicenotcreated
- Filters include fromdate, todate, lastmodified, sortby (customername/customernumber/documentnumber/orderdate), sortorder

## Task Commits

Each task was committed atomically:

1. **Task 1: Create OrderDescription.ts with operations, OrderRows, and full field coverage** - `7e59c0e` (feat)

## Files Created/Modified
- `nodes/Fortnox/OrderDescription.ts` - Order resource operations and field definitions with OrderRows fixedCollection

## Decisions Made
- OrderRows includes OrderedQuantity (default 1) and DeliveredQuantity (default 0) as order-specific row fields not present in InvoiceRows
- 15 row fields total including Discount/DiscountType, HouseWork fields, Project, Unit, VAT
- Order filters are entirely distinct from Invoice filters (cancelled/expired/invoicecreated/invoicenotcreated vs fullypaid/unpaid/unbooked)
- Added lastmodified filter for Orders (present in Order API but not in Invoice filters)
- Cancel and createInvoice operations require only DocumentNumber with no additional parameters

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- OrderDescription.ts ready for wiring into Fortnox.node.ts in Plan 03
- Exports orderOperations and orderFields arrays for import

## Self-Check: PASSED

- FOUND: nodes/Fortnox/OrderDescription.ts
- FOUND: 03-02-SUMMARY.md
- FOUND: commit 7e59c0e

---
*Phase: 03-customer-article-and-order-resources*
*Completed: 2026-02-27*
