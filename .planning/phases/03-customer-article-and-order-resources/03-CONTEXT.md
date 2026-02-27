# Phase 3: Customer, Article, and Order Resources - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Full CRUD and action operations for Customer, Article, and Order resources using the proven Invoice pattern from Phase 2. Cross-cutting concerns (pagination, error handling, rate limiting) are already solved. This phase replicates that pattern across three new resources, each getting its own Description file and execute logic.

</domain>

<decisions>
## Implementation Decisions

### Field coverage approach
- All three resources use full field coverage — expose all writable Fortnox API fields
- Primary/required fields as top-level parameters (e.g., CustomerNumber for get, Name for create)
- All other writable fields in Additional Fields (create) and Update Fields (update) collections
- Consistent with the Invoice pattern: required fields up top, optional fields in collections

### Customer resource
- Operations: Create, Get, Get Many, Update, Delete (if Fortnox API supports it)
- Full field coverage — all writable customer fields exposed as additional/update fields
- All Fortnox API filter parameters exposed for list operations
- All sort fields the API supports

### Article resource
- Operations: Create, Get, Get Many, Update, Delete
- Full field coverage — all writable article fields exposed as additional/update fields
- All Fortnox API filter parameters exposed for list operations
- All sort fields the API supports

### Order resource
- Operations: Create, Get, Get Many, Update, Cancel, Create Invoice (convert order to invoice)
- Full field coverage — all writable order fields exposed as additional/update fields
- Order-to-invoice conversion is a nice-to-have, not a core workflow — include as a standard operation but not the primary use case
- All Fortnox API filter parameters and sort fields exposed for list operations

### Pagination and defaults
- Identical Return All toggle + Limit pattern as Invoice (proven in Phase 2)
- Default limit: 50 across all resources (consistent with invoices)
- Automatic pagination via fortnoxApiRequestAllItems when Return All is enabled

### Claude's Discretion
- CustomerNumber on create: whether required or optional (based on Fortnox API behavior)
- ArticleNumber on create: whether required or optional (based on Fortnox API behavior)
- Order row field structure: mirror invoice rows or align with Fortnox order API specifics
- Order cancel implementation: follow Fortnox API pattern
- Article type handling (service vs product): include relevant fields based on API
- lastmodified filter inclusion per resource: include where API supports it

</decisions>

<specifics>
## Specific Ideas

- Follow the exact pattern from InvoiceDescription.ts — each resource gets its own *Description.ts file with operations array and fields array
- The execute() method in Fortnox.node.ts gets new resource branches following the same if/else pattern
- Resource selector in node properties expands from just Invoice to include Customer, Article, Order
- Expose ALL writable fields and ALL API-supported filters/sort options — maximum flexibility for agency workflows

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-customer-article-and-order-resources*
*Context gathered: 2026-02-27*
