---
phase: 03-customer-article-and-order-resources
verified: 2026-02-27T14:00:00Z
status: passed
score: 18/18 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Create a customer in n8n, then create an order for that customer, then convert to invoice"
    expected: "Customer created, order document number returned, invoice created with the order's line items"
    why_human: "End-to-end workflow validation requires a live Fortnox account and running n8n instance"
  - test: "Select Article resource and verify Delete operation returns success indicator"
    expected: "Execution output shows { success: true } without crashing on empty API response body"
    why_human: "Requires live API call since Fortnox DELETE returns empty body - static analysis confirms the pattern but runtime must be confirmed"
---

# Phase 03: Customer, Article, and Order Resources Verification Report

**Phase Goal:** User can manage customers, articles, and orders in Fortnox workflows, completing the four core resources needed for end-to-end accounting automation
**Verified:** 2026-02-27T14:00:00Z
**Status:** passed
**Re-verification:** No - initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|---------|
| 1  | CustomerDescription.ts exports customerOperations and customerFields arrays | VERIFIED | File exists at `nodes/Fortnox/CustomerDescription.ts`, exports confirmed on lines 3 and 459 |
| 2  | Customer operations include create, delete, get, getMany, update | VERIFIED | All 5 operations present in customerOperations array (lines 14-45), default: 'getMany' |
| 3  | Customer create has Name as required top-level field, all other writable fields in Additional Fields | VERIFIED | Name field (required: true, displayOptions create only) at line 482; additionalFields collection at line 599 |
| 4  | Customer getMany has Return All toggle, Limit, and Filters collection with filter/lastmodified/sortby/sortorder | VERIFIED | returnAll (line 499), limit (line 517), filters collection with all 4 options (lines 539-593) |
| 5  | Customer commonCustomerFields shared array used by both Additional Fields and Update Fields | VERIFIED | `options: commonCustomerFields` (line 611) and `options: [...commonCustomerFields]` (line 629) |
| 6  | ArticleDescription.ts exports articleOperations and articleFields arrays | VERIFIED | File exists at `nodes/Fortnox/ArticleDescription.ts`, exports confirmed on lines 3 and 275 |
| 7  | Article operations include create, delete, get, getMany, update | VERIFIED | All 5 operations present in articleOperations array (lines 14-45), default: 'getMany' |
| 8  | Article create has Description as top-level required field, all other writable fields in Additional Fields | VERIFIED | Description field (required: true, displayOptions create only) at line 298; additionalFields collection at line 417 |
| 9  | Article getMany has Return All toggle, Limit, and Filters collection with filter/lastmodified/sortby/sortorder | VERIFIED | returnAll (line 316), limit (line 334), filters with articlenumber/quantityinstock/reservedquantity/stockvalue sortby options (lines 355-411) |
| 10 | SalesPrice is NOT included in writable article fields (read-only on Article endpoint) | VERIFIED | grep confirms SalesPrice, StockValue, DisposableQuantity, ReservedQuantity, SupplierName all absent from ArticleDescription.ts |
| 11 | OrderDescription.ts exports orderOperations and orderFields arrays | VERIFIED | File exists at `nodes/Fortnox/OrderDescription.ts`, exports confirmed on lines 3 and 448 |
| 12 | Order operations include create, get, getMany, update, cancel, createInvoice | VERIFIED | All 6 operations present in orderOperations array (lines 14-53), default: 'getMany' |
| 13 | Order create has CustomerNumber as required top-level field and OrderRows fixedCollection with OrderedQuantity and DeliveredQuantity | VERIFIED | CustomerNumber (required: true) at line 472; orderRows fixedCollection at line 488; OrderedQuantity (line 135) and DeliveredQuantity (line 83) in orderRowFields |
| 14 | Order getMany Filters include order-specific filter values (cancelled/expired/invoicecreated/invoicenotcreated) and fromdate/todate/lastmodified/sortby/sortorder | VERIFIED | All filter values confirmed at lines 568-628; distinct from Invoice filters |
| 15 | commonOrderFields shared array used by both Additional Fields and Update Fields | VERIFIED | `options: commonOrderFields` (line 645) and `options: [...commonOrderFields, ...]` (line 665) |
| 16 | Cancel and Create Invoice operations only require DocumentNumber | VERIFIED | documentNumber field displayOptions includes 'cancel' and 'createInvoice' (line 460); no additional parameters for these ops |
| 17 | User can select Customer, Article, or Order as a resource in the Fortnox node | VERIFIED | Resource selector in Fortnox.node.ts lines 48-65 has 4 options: Article, Customer, Invoice, Order (alphabetized) |
| 18 | Package builds and lints cleanly | VERIFIED | `npm run build` exits 0; `npm run lint` exits 0; tsc --noEmit produces no output (no errors) |

**Score:** 18/18 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `nodes/Fortnox/CustomerDescription.ts` | Customer resource operations and field definitions | VERIFIED | 632 lines, exports customerOperations + customerFields, 56 commonCustomerFields |
| `nodes/Fortnox/ArticleDescription.ts` | Article resource operations and field definitions | VERIFIED | 449 lines, exports articleOperations + articleFields, 31 commonArticleFields |
| `nodes/Fortnox/OrderDescription.ts` | Order resource operations and field definitions with OrderRows | VERIFIED | 687 lines, exports orderOperations + orderFields, 15 orderRowFields, 39 commonOrderFields |
| `nodes/Fortnox/Fortnox.node.ts` | Main node with all 4 resources wired into execute() | VERIFIED | 563 lines, all 4 resource blocks present with complete operation branches |
| `dist/nodes/Fortnox/CustomerDescription.js` | Compiled output | VERIFIED | Present in dist/ alongside .d.ts and .js.map |
| `dist/nodes/Fortnox/ArticleDescription.js` | Compiled output | VERIFIED | Present in dist/ alongside .d.ts and .js.map |
| `dist/nodes/Fortnox/OrderDescription.js` | Compiled output | VERIFIED | Present in dist/ alongside .d.ts and .js.map |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `Fortnox.node.ts` | `CustomerDescription.ts` | `import { customerFields, customerOperations }` | WIRED | Line 15: `import { customerFields, customerOperations } from './CustomerDescription'` |
| `Fortnox.node.ts` | `ArticleDescription.ts` | `import { articleFields, articleOperations }` | WIRED | Line 14: `import { articleFields, articleOperations } from './ArticleDescription'` |
| `Fortnox.node.ts` | `OrderDescription.ts` | `import { orderFields, orderOperations }` | WIRED | Line 18: `import { orderFields, orderOperations } from './OrderDescription'` |
| `Fortnox.node.ts` | `GenericFunctions.ts` | `fortnoxApiRequest / fortnoxApiRequestAllItems` | WIRED | Line 16: import confirmed; used throughout all resource blocks |
| `CustomerDescription.ts` | `n8n-workflow INodeProperties` | `import type` | WIRED | Line 1: `import type { INodeProperties } from 'n8n-workflow'` |
| `ArticleDescription.ts` | `n8n-workflow INodeProperties` | `import type` | WIRED | Line 1: `import type { INodeProperties } from 'n8n-workflow'` |
| `OrderDescription.ts` | `n8n-workflow INodeProperties` | `import type` | WIRED | Line 1: `import type { INodeProperties } from 'n8n-workflow'` |
| Order `createInvoice` execute | `response.Invoice` | extract from correct key | WIRED | Fortnox.node.ts line 539: `responseData = response.Invoice as IDataObject` (not response.Order) |
| Customer/Article `delete` execute | `{ success: true }` | return for empty body | WIRED | Lines 366 (article) and 439 (customer): `responseData = { success: true } as IDataObject` |

---

### Requirements Coverage

All 15 requirement IDs declared across plans for this phase are addressed:

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|---------|
| CUST-01 | User can create a customer with name, email, and address fields | SATISFIED | Customer create operation: Name required, email + address in additionalFields (commonCustomerFields) |
| CUST-02 | User can retrieve a single customer by CustomerNumber | SATISFIED | Customer get operation: `GET /3/customers/${customerNumber}`, returns response.Customer |
| CUST-03 | User can list customers with pagination and lastmodified filter | SATISFIED | Customer getMany: returnAll toggle, limit, filters.lastmodified, fortnoxApiRequestAllItems for all-pages |
| CUST-04 | User can update a customer record | SATISFIED | Customer update operation: `PUT /3/customers/${customerNumber}`, updateFields collection wired |
| ART-01 | User can create an article with ArticleNumber, description, and pricing | SATISFIED | Article create: Description required, ArticleNumber + PurchasePrice in additionalFields |
| ART-02 | User can retrieve a single article by ArticleNumber | SATISFIED | Article get operation: `GET /3/articles/${articleNumber}`, returns response.Article |
| ART-03 | User can list articles with pagination | SATISFIED | Article getMany: returnAll toggle, limit, fortnoxApiRequestAllItems for all-pages |
| ART-04 | User can update an article | SATISFIED | Article update operation: `PUT /3/articles/${articleNumber}`, updateFields collection wired |
| ART-05 | User can delete an article | SATISFIED | Article delete: `DELETE /3/articles/${articleNumber}`, returns { success: true } |
| ORD-01 | User can create a sales order with line items and customer reference | SATISFIED | Order create: CustomerNumber required, OrderRows fixedCollection with 15 row fields |
| ORD-02 | User can retrieve a single order by DocumentNumber | SATISFIED | Order get: `GET /3/orders/${documentNumber}`, returns response.Order |
| ORD-03 | User can list orders with pagination and filters (date range) | SATISFIED | Order getMany: returnAll, limit, fromdate/todate/lastmodified filters, fortnoxApiRequestAllItems |
| ORD-04 | User can update an order | SATISFIED | Order update: `PUT /3/orders/${documentNumber}`, handles nested OrderRows fixedCollection |
| ORD-05 | User can convert an order to an invoice | SATISFIED | Order createInvoice: `PUT /3/orders/${documentNumber}/createinvoice`, returns response.Invoice |
| ORD-06 | User can cancel an order | SATISFIED | Order cancel: `PUT /3/orders/${documentNumber}/cancel`, returns response.Order |

**Orphaned requirements check:** No additional IDs for Phase 3 found in REQUIREMENTS.md beyond those declared.

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| All Description files | `placeholder:` in collection definitions | Info | Legitimate n8n UI property (e.g., "Add Filter", "Add Field") - not a stub indicator |

No stub implementations, TODO comments, empty handlers, or missing database connections found.

---

### Human Verification Required

#### 1. End-to-End Workflow: Customer to Order to Invoice

**Test:** In n8n, create a workflow: (1) Create Customer resource with a name, (2) Use returned CustomerNumber to Create Order with a line item, (3) Use returned DocumentNumber to Create Invoice from the order
**Expected:** Each step returns a populated JSON object; the final step returns an Invoice object (not an Order object)
**Why human:** Requires a live Fortnox account with valid credentials and a running n8n instance. The createInvoice-to-response.Invoice wiring is verified statically but runtime confirmation matters.

#### 2. Delete Returns Success Indicator

**Test:** In n8n, create an Article then delete it by ArticleNumber. Inspect the execution output.
**Expected:** Output JSON shows `{ "success": true }` without a node error or empty result
**Why human:** Fortnox DELETE endpoints return empty HTTP bodies. The `{ success: true }` pattern is verified in code but depends on GenericFunctions handling the empty body gracefully at runtime.

---

### Summary

Phase 03 achieves its goal. All four core resources (Invoice from Phase 2, plus Customer, Article, Order from this phase) are fully operational:

- **CustomerDescription.ts**: 632 lines, 5 operations, 56 writable fields in commonCustomerFields, proper read-only exclusions (no Country/DeliveryCountry/VisitingCountry as writable fields)
- **ArticleDescription.ts**: 449 lines, 5 operations, 31 writable fields, SalesPrice correctly excluded
- **OrderDescription.ts**: 687 lines, 6 operations (including cancel and createInvoice), 15 order row fields with OrderedQuantity/DeliveredQuantity, 39 common order fields, correct order-specific filter values
- **Fortnox.node.ts**: All three new resources wired: imports, resource selector (4 options alphabetized), property spreads, and complete execute() branches for all 16 operations
- TypeScript compiles without errors, lint passes with exit code 0, dist/ contains all compiled output

The createInvoice operation correctly extracts `response.Invoice` (not `response.Order`), and both Customer and Article delete operations return `{ success: true }` for the empty Fortnox API response body. The end-to-end accounting automation workflow (Customer -> Article -> Order -> Invoice) is now structurally complete and ready for live validation.

---

_Verified: 2026-02-27T14:00:00Z_
_Verifier: Claude (gsd-verifier)_
