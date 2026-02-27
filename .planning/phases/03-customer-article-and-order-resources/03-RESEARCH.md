# Phase 3: Customer, Article, and Order Resources - Research

**Researched:** 2026-02-27
**Domain:** Fortnox Customer/Article/Order API endpoints, n8n multi-resource node pattern, replicating Phase 2 infrastructure across three resources
**Confidence:** HIGH

## Summary

Phase 3 extends the Fortnox node with three new resources (Customer, Article, Order) following the exact patterns established in Phase 2 (Invoice). All cross-cutting concerns -- pagination via `fortnoxApiRequestAllItems`, rate limiting with exponential backoff, Swedish-to-English error translation, and the `continueOnFail()` pattern -- are already implemented in `GenericFunctions.ts` and require no modifications. The work is primarily creating three new `*Description.ts` files and adding resource routing branches in the `execute()` method.

Each resource follows a consistent Fortnox API pattern: `POST /3/{resource}` for create, `GET /3/{resource}/{id}` for get, `GET /3/{resource}` for list, `PUT /3/{resource}/{id}` for update, and resource-specific actions (delete for Customer/Article, cancel and createinvoice for Order). All responses use the same envelope pattern (`{ Customer: {...} }` / `{ Customers: [...] }`) with `MetaInformation` for pagination. The existing `fortnoxApiRequest` and `fortnoxApiRequestAllItems` helpers work unchanged -- only the endpoint path and resource key differ.

The main complexity is field coverage. The user decision mandates "full field coverage" -- all writable Fortnox API fields exposed. Customer has ~56 writable fields, Article has ~38 writable fields, and Order has ~30+ writable fields plus OrderRows (line items with ~18 fields each, mirroring InvoiceRows). The `commonFields` pattern from Invoice (shared between Additional Fields and Update Fields) should be replicated for each resource.

**Primary recommendation:** Create `CustomerDescription.ts`, `ArticleDescription.ts`, and `OrderDescription.ts` following the exact `InvoiceDescription.ts` pattern. Add resource routing in `Fortnox.node.ts`. Use the proven `commonFields` shared array pattern for each resource to avoid field duplication between create and update operations.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- All three resources use full field coverage -- expose all writable Fortnox API fields
- Primary/required fields as top-level parameters (e.g., CustomerNumber for get, Name for create)
- All other writable fields in Additional Fields (create) and Update Fields (update) collections
- Consistent with the Invoice pattern: required fields up top, optional fields in collections
- Customer operations: Create, Get, Get Many, Update, Delete (if Fortnox API supports it)
- Full field coverage -- all writable customer fields exposed as additional/update fields
- All Fortnox API filter parameters exposed for list operations
- All sort fields the API supports
- Article operations: Create, Get, Get Many, Update, Delete
- Full field coverage -- all writable article fields exposed as additional/update fields
- All Fortnox API filter parameters exposed for list operations
- All sort fields the API supports
- Order operations: Create, Get, Get Many, Update, Cancel, Create Invoice (convert order to invoice)
- Full field coverage -- all writable order fields exposed as additional/update fields
- Order-to-invoice conversion is a nice-to-have, not a core workflow -- include as a standard operation but not the primary use case
- All Fortnox API filter parameters and sort fields exposed for list operations
- Identical Return All toggle + Limit pattern as Invoice (proven in Phase 2)
- Default limit: 50 across all resources (consistent with invoices)
- Automatic pagination via fortnoxApiRequestAllItems when Return All is enabled
- Follow the exact pattern from InvoiceDescription.ts -- each resource gets its own *Description.ts file with operations array and fields array
- The execute() method in Fortnox.node.ts gets new resource branches following the same if/else pattern
- Resource selector in node properties expands from just Invoice to include Customer, Article, Order
- Expose ALL writable fields and ALL API-supported filters/sort options -- maximum flexibility for agency workflows

### Claude's Discretion
- CustomerNumber on create: whether required or optional (based on Fortnox API behavior)
- ArticleNumber on create: whether required or optional (based on Fortnox API behavior)
- Order row field structure: mirror invoice rows or align with Fortnox order API specifics
- Order cancel implementation: follow Fortnox API pattern
- Article type handling (service vs product): include relevant fields based on API
- lastmodified filter inclusion per resource: include where API supports it

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CUST-01 | User can create a customer with name, email, and address fields | `POST /3/customers` with JSON body `{ Customer: { Name, Email, Address1, ... } }`. Name is the only required field. CustomerNumber is optional (auto-generated if omitted). ~56 writable fields available for Additional Fields collection. |
| CUST-02 | User can retrieve a single customer by CustomerNumber | `GET /3/customers/{CustomerNumber}`. Returns `{ Customer: { ... } }` envelope with full customer object. |
| CUST-03 | User can list customers with pagination and lastmodified filter | `GET /3/customers` with query params: `filter` (active, inactive), `lastmodified` (format: YYYY-MM-DD HH:MM), `sortby` (customernumber, name), `sortorder` (ascending, descending), `page`, `limit`. Response: `{ Customers: [...], MetaInformation: { @TotalPages, @CurrentPage } }`. |
| CUST-04 | User can update a customer record | `PUT /3/customers/{CustomerNumber}` with partial JSON body `{ Customer: { ...fields } }`. All writable fields can be updated. |
| ART-01 | User can create an article with ArticleNumber, description, and pricing | `POST /3/articles` with JSON body `{ Article: { Description, ... } }`. No required fields -- Description and ArticleNumber are both optional (ArticleNumber auto-generates if omitted). SalesPrice is read-only on the Article endpoint; pricing is managed via the `/3/prices` endpoint. PurchasePrice IS writable. |
| ART-02 | User can retrieve a single article by ArticleNumber | `GET /3/articles/{ArticleNumber}`. Returns `{ Article: { ... } }` envelope. |
| ART-03 | User can list articles with pagination | `GET /3/articles` with query params: `filter` (active, inactive), `lastmodified`, `sortby` (articlenumber, quantityinstock, reservedquantity, stockvalue), `sortorder`. Response: `{ Articles: [...], MetaInformation: {...} }`. |
| ART-04 | User can update an article | `PUT /3/articles/{ArticleNumber}` with partial JSON body `{ Article: { ...fields } }`. |
| ART-05 | User can delete an article | `DELETE /3/articles/{ArticleNumber}`. Returns empty response on success. |
| ORD-01 | User can create a sales order with line items and customer reference | `POST /3/orders` with JSON body `{ Order: { CustomerNumber, OrderRows: [...] } }`. CustomerNumber is required. OrderRows use fixedCollection pattern with fields: ArticleNumber, AccountNumber, OrderedQuantity, DeliveredQuantity, Description, Price, Discount, DiscountType, Unit, VAT. |
| ORD-02 | User can retrieve a single order by DocumentNumber | `GET /3/orders/{DocumentNumber}`. Returns `{ Order: { ... } }` envelope. |
| ORD-03 | User can list orders with pagination and filters (date range) | `GET /3/orders` with query params: `filter` (cancelled, expired, invoicecreated, invoicenotcreated), `fromdate`, `todate`, `lastmodified`, `sortby` (customername, customernumber, documentnumber, orderdate), `sortorder`. Response: `{ Orders: [...], MetaInformation: {...} }`. |
| ORD-04 | User can update an order | `PUT /3/orders/{DocumentNumber}` with partial JSON body `{ Order: { ...fields } }`. |
| ORD-05 | User can convert an order to an invoice | `PUT /3/orders/{DocumentNumber}/createinvoice` with empty body. Returns the created Invoice object. |
| ORD-06 | User can cancel an order | `PUT /3/orders/{DocumentNumber}/cancel` with empty body. Returns the updated Order object with `Cancelled: true`. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `n8n-workflow` | `*` (peer dep) | Types: `INodeType`, `IExecuteFunctions`, `INodeProperties`, `IDataObject` | Already installed; all node logic depends on these types |
| `typescript` | `5.9.2` | TypeScript compiler | Already installed from Phase 1 |

### Supporting
No new dependencies needed. All functionality reuses the existing `GenericFunctions.ts` helpers from Phase 2.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Three separate Description files | One large combined file | Separate files follow established pattern, are maintainable, and consistent with InvoiceDescription.ts |
| Full field enumerations in code | Dynamic field loading via loadOptions | loadOptions requires runtime API access; static fields are more reliable and show in n8n UI without credentials |

**Installation:**
```bash
# No new packages needed -- Phase 1+2 dependencies cover everything
```

## Architecture Patterns

### Recommended Project Structure
```
nodes/
└── Fortnox/
    ├── Fortnox.node.ts              # Main node: resource selector expanded, execute() with new branches
    ├── GenericFunctions.ts          # UNCHANGED from Phase 2
    ├── InvoiceDescription.ts        # UNCHANGED from Phase 2
    ├── CustomerDescription.ts       # NEW: customerOperations + customerFields
    ├── ArticleDescription.ts        # NEW: articleOperations + articleFields
    ├── OrderDescription.ts          # NEW: orderOperations + orderFields
    ├── Fortnox.node.json            # UNCHANGED
    └── fortnox.svg                  # UNCHANGED
```

### Pattern 1: Resource Description File Structure
**What:** Each resource gets its own TypeScript file exporting two arrays: `{resource}Operations` (the Operation dropdown) and `{resource}Fields` (all parameter definitions for that resource).
**When to use:** Every new resource added to the node.
**Example:**
```typescript
// CustomerDescription.ts -- follows exact InvoiceDescription.ts pattern
import type { INodeProperties } from 'n8n-workflow';

export const customerOperations: INodeProperties[] = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['customer'] } },
        options: [
            { name: 'Create', value: 'create', action: 'Create a customer', description: 'Create a new customer' },
            { name: 'Delete', value: 'delete', action: 'Delete a customer', description: 'Delete a customer' },
            { name: 'Get', value: 'get', action: 'Get a customer', description: 'Retrieve a customer by customer number' },
            { name: 'Get Many', value: 'getMany', action: 'Get many customers', description: 'List customers with optional filters' },
            { name: 'Update', value: 'update', action: 'Update a customer', description: 'Update a customer record' },
        ],
        default: 'getMany',
    },
];

export const customerFields: INodeProperties[] = [
    // A. CustomerNumber (shared by get, update, delete)
    // B. Name (required for create)
    // C. Return All toggle (getMany)
    // D. Limit (getMany when returnAll=false)
    // E. Filters collection (getMany)
    // F. Additional Fields collection (create)
    // G. Update Fields collection (update)
];
```

### Pattern 2: Shared Common Fields Array (DRY)
**What:** Extract writable fields shared between create (Additional Fields) and update (Update Fields) into a `common*Fields` array, then spread into both collections. This is the proven pattern from InvoiceDescription.ts's `commonInvoiceFields`.
**When to use:** Every resource that has both create and update operations with overlapping optional fields.
**Example:**
```typescript
// Shared fields used in both Additional Fields and Update Fields
const commonCustomerFields: INodeProperties[] = [
    { displayName: 'Address Line 1', name: 'Address1', type: 'string', default: '', description: 'Customer address line 1' },
    { displayName: 'City', name: 'City', type: 'string', default: '', description: 'Customer city' },
    // ... all other writable fields alphabetized by displayName
];

// Additional Fields for create
{
    displayName: 'Additional Fields',
    name: 'additionalFields',
    type: 'collection',
    displayOptions: { show: { resource: ['customer'], operation: ['create'] } },
    options: commonCustomerFields,
}

// Update Fields includes common fields plus CustomerNumber change
{
    displayName: 'Update Fields',
    name: 'updateFields',
    type: 'collection',
    displayOptions: { show: { resource: ['customer'], operation: ['update'] } },
    options: [...commonCustomerFields],
}
```

### Pattern 3: Order Rows as fixedCollection (Mirrors Invoice Rows)
**What:** OrderRows use the same `fixedCollection` pattern as InvoiceRows but with Order-specific fields (`OrderedQuantity` in addition to `DeliveredQuantity`).
**When to use:** Order create and update operations.
**Example:**
```typescript
const orderRowFields: INodeProperties[] = [
    { displayName: 'Article Number', name: 'ArticleNumber', type: 'string', default: '' },
    { displayName: 'Account Number', name: 'AccountNumber', type: 'number', default: 0 },
    { displayName: 'Delivered Quantity', name: 'DeliveredQuantity', type: 'number', default: 1 },
    { displayName: 'Description', name: 'Description', type: 'string', default: '' },
    { displayName: 'Discount', name: 'Discount', type: 'number', default: 0 },
    { displayName: 'Discount Type', name: 'DiscountType', type: 'options',
      options: [{ name: 'Amount', value: 'AMOUNT' }, { name: 'Percent', value: 'PERCENT' }],
      default: 'PERCENT' },
    { displayName: 'Ordered Quantity', name: 'OrderedQuantity', type: 'number', default: 1 },
    { displayName: 'Price', name: 'Price', type: 'number', default: 0 },
    { displayName: 'Unit', name: 'Unit', type: 'string', default: '' },
];
```

### Pattern 4: Resource Selector Expansion
**What:** The Resource dropdown in `Fortnox.node.ts` adds three new options and imports the new Description arrays.
**When to use:** When adding new resources to the node.
**Example:**
```typescript
// Fortnox.node.ts -- expanded imports and properties
import { customerFields, customerOperations } from './CustomerDescription';
import { articleFields, articleOperations } from './ArticleDescription';
import { orderFields, orderOperations } from './OrderDescription';

properties: [
    {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
            { name: 'Article', value: 'article' },
            { name: 'Customer', value: 'customer' },
            { name: 'Invoice', value: 'invoice' },
            { name: 'Order', value: 'order' },
        ],
        default: 'invoice',
    },
    ...customerOperations,
    ...customerFields,
    ...invoiceOperations,
    ...invoiceFields,
    ...articleOperations,
    ...articleFields,
    ...orderOperations,
    ...orderFields,
],
```

### Anti-Patterns to Avoid
- **Modifying GenericFunctions.ts:** The helpers are resource-agnostic by design. Do not add resource-specific logic to them. Pass different endpoint paths and resource keys instead.
- **Duplicating field definitions between create and update:** Use the `commonFields` shared array pattern. Only add fields unique to update (like changing the primary key reference) separately.
- **Forgetting to alphabetize options in collections:** n8n lint rule requires options within collections to be alphabetized by `displayName`. The Invoice implementation already follows this.
- **Using empty string as default for `type: 'options'` fields:** n8n lint requires options-type fields to default to a valid option value, not empty string. Use the first option value as default.
- **Inconsistent operation naming:** Follow the exact pattern: `name: 'Get Many'`, `value: 'getMany'`, `action: 'Get many {resources}'`. The Invoice implementation is the reference.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| API request with auth and retry | New request function | `fortnoxApiRequest` from GenericFunctions.ts | Already built, tested, handles 429 retry, error translation |
| Pagination for list endpoints | Custom pagination per resource | `fortnoxApiRequestAllItems` with resource key parameter | Generic helper works for all resources; just pass 'Customers', 'Articles', or 'Orders' |
| Error message translation | Per-resource error handling | `parseFortnoxError` in GenericFunctions.ts | Same error envelope across all Fortnox endpoints |
| Delete operation return handling | Custom response parser | Check for empty response, return `{ success: true }` | Fortnox DELETE returns empty body; handle consistently |
| Order-to-invoice response wrapping | Custom invoice unwrapping | Extract from `response.Invoice` (not `response.Order`) | The createinvoice action returns an Invoice object, not an Order |

**Key insight:** Phase 2 built all the reusable infrastructure. Phase 3 is purely additive -- new Description files and new execute() branches. No changes to GenericFunctions.ts or existing InvoiceDescription.ts.

## Common Pitfalls

### Pitfall 1: CustomerNumber and ArticleNumber Auto-Generation
**What goes wrong:** Making CustomerNumber or ArticleNumber required on create when Fortnox auto-generates them if omitted.
**Why it happens:** Assuming these are required because they are the primary identifier for get/update/delete operations.
**How to avoid:** Make CustomerNumber and ArticleNumber optional on create (in Additional Fields, not as top-level required parameters). Only `Name` is required for Customer create. Article create has no required fields (Description is recommended but not required). Document that Fortnox auto-generates the number if not provided.
**Warning signs:** Users unable to create customers/articles without manually specifying a number.

### Pitfall 2: SalesPrice is Read-Only on the Article Endpoint
**What goes wrong:** Users try to set SalesPrice when creating/updating an article, but the field is ignored or returns an error.
**Why it happens:** SalesPrice on the Article endpoint is read-only. Pricing is managed through the separate `/3/prices` endpoint with price lists. PurchasePrice IS writable on the Article endpoint.
**How to avoid:** Do NOT include SalesPrice in the writable fields for Article create/update. Include it as a note in the Description property description. PurchasePrice should be included as a writable field.
**Warning signs:** Users report that price changes are not being saved.

### Pitfall 3: Order CreateInvoice Returns an Invoice Object
**What goes wrong:** Code expects `response.Order` from the createinvoice action but the API returns `response.Invoice`.
**Why it happens:** The `/3/orders/{id}/createinvoice` action creates a new invoice from the order. The response contains the newly created invoice, not the order.
**How to avoid:** Extract the response using `response.Invoice` (not `response.Order`) for the createinvoice operation. This is the one exception where the response key does not match the resource being operated on.
**Warning signs:** Undefined data returned from the createinvoice operation.

### Pitfall 4: Customer Delete May Fail for Referenced Customers
**What goes wrong:** Deleting a customer that has invoices, orders, or other references fails with a Fortnox error.
**Why it happens:** Fortnox enforces referential integrity. Customers with existing documents cannot be deleted.
**How to avoid:** Document this constraint in the delete operation description: "Cannot delete customers that have invoices, orders, or other documents." The error will be caught by the existing error handler and translated.
**Warning signs:** Delete operations failing with Swedish error messages about references.

### Pitfall 5: Order Filters Differ from Invoice Filters
**What goes wrong:** Copying invoice filter values to the order filter options results in invalid filter values.
**Why it happens:** Invoice uses `fullypaid`, `unpaid`, `unbooked`, `unpaidoverdue`, `cancelled`. Order uses `cancelled`, `expired`, `invoicecreated`, `invoicenotcreated`. They are completely different sets.
**How to avoid:** Use the correct filter values for each resource. Do not share filter collections between resources.
**Warning signs:** API errors when applying filters to list operations.

### Pitfall 6: Delete Operations Return Empty Response Body
**What goes wrong:** Code tries to extract `response.Customer` or `response.Article` from a delete response and gets undefined.
**Why it happens:** Fortnox DELETE endpoints return an empty response body (HTTP 200/204 with no JSON).
**How to avoid:** For delete operations, return `{ success: true }` or the identifier that was deleted instead of trying to parse the response body.
**Warning signs:** Node returning null/undefined data after successful delete.

### Pitfall 7: lastmodified Filter Format Differs from Date Fields
**What goes wrong:** Using YYYY-MM-DD format for the lastmodified filter when it expects YYYY-MM-DD HH:MM.
**Why it happens:** Other date fields (fromdate, todate, OrderDate) use YYYY-MM-DD format, but lastmodified accepts a datetime string with hours and minutes.
**How to avoid:** Document the correct format in the field description: "Filter by last modified date (YYYY-MM-DD HH:MM)". Accept the datetime format for lastmodified specifically.
**Warning signs:** lastmodified filter returns unexpected results or all records.

## Code Examples

### Fortnox Customer Create Request
```typescript
// Source: https://api.fortnox.se/apidocs (Customers section)
// POST https://api.fortnox.se/3/customers
// Body:
{
    "Customer": {
        "Name": "Acme AB",
        "Email": "info@acme.se",
        "Address1": "Storgatan 1",
        "City": "Stockholm",
        "ZipCode": "111 22",
        "CountryCode": "SE",
        "Phone1": "08-123456",
        "OrganisationNumber": "556677-8899",
        "Currency": "SEK",
        "TermsOfPayment": "30"
    }
}
// Response: { Customer: { CustomerNumber: "1001", Name: "Acme AB", ... } }
// Note: CustomerNumber is auto-generated if not provided
```

### Fortnox Article Create Request
```typescript
// Source: https://api.fortnox.se/apidocs (Articles section)
// POST https://api.fortnox.se/3/articles
// Body:
{
    "Article": {
        "Description": "Consulting hour",
        "Type": "SERVICE",
        "Unit": "h",
        "PurchasePrice": 500,
        "SalesAccount": 3001,
        "VAT": 25
    }
}
// Response: { Article: { ArticleNumber: "1", Description: "Consulting hour", ... } }
// Note: ArticleNumber is auto-generated if not provided
// Note: SalesPrice is READ-ONLY here -- use /3/prices endpoint for pricing
```

### Fortnox Order Create Request
```typescript
// Source: https://api.fortnox.se/apidocs (Orders section)
// POST https://api.fortnox.se/3/orders
// Body:
{
    "Order": {
        "CustomerNumber": "1001",
        "OrderDate": "2026-02-27",
        "DeliveryDate": "2026-03-15",
        "OrderRows": [
            {
                "ArticleNumber": "1",
                "OrderedQuantity": 10,
                "DeliveredQuantity": 0
            },
            {
                "AccountNumber": 3000,
                "Description": "Custom service",
                "OrderedQuantity": 5,
                "Price": 1000
            }
        ],
        "OurReference": "John Doe",
        "YourReference": "Jane Smith",
        "Currency": "SEK"
    }
}
// Response: { Order: { DocumentNumber: 1, ... } }
```

### Fortnox Order Action Endpoints
```typescript
// Source: https://api.fortnox.se/apidocs (Orders section), verified via Go SDK
// Cancel:          PUT /3/orders/{DocumentNumber}/cancel         (empty body) -> { Order: {...} }
// Create Invoice:  PUT /3/orders/{DocumentNumber}/createinvoice  (empty body) -> { Invoice: {...} }
// Send Email:      GET /3/orders/{DocumentNumber}/email          (no body)
// Mark Sent:       PUT /3/orders/{DocumentNumber}/sent           (empty body)
```

### Fortnox Customer List Response
```json
// GET https://api.fortnox.se/3/customers?filter=active&sortby=customernumber&sortorder=ascending
{
    "Customers": [
        {
            "@url": "https://api.fortnox.se/3/customers/1001",
            "Address1": "Storgatan 1",
            "City": "Stockholm",
            "CustomerNumber": "1001",
            "Email": "info@acme.se",
            "Name": "Acme AB",
            "OrganisationNumber": "556677-8899",
            "Phone": "08-123456",
            "ZipCode": "111 22"
        }
    ],
    "MetaInformation": {
        "@CurrentPage": 1,
        "@TotalPages": 1,
        "@TotalResources": 1
    }
}
```

### Execute Method Pattern for New Resources
```typescript
// Replicating the proven Invoice pattern for Customer
if (resource === 'customer') {
    if (operation === 'create') {
        const name = this.getNodeParameter('name', i) as string;
        const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
        const body: IDataObject = { Customer: { Name: name } as IDataObject };
        const customerBody = body.Customer as IDataObject;
        for (const key of Object.keys(additionalFields)) {
            if (additionalFields[key] !== '') {
                customerBody[key] = additionalFields[key];
            }
        }
        const response = await fortnoxApiRequest.call(this, 'POST', '/3/customers', body);
        responseData = response.Customer as IDataObject;
    }
    if (operation === 'get') {
        const customerNumber = this.getNodeParameter('customerNumber', i) as string;
        const response = await fortnoxApiRequest.call(this, 'GET', `/3/customers/${customerNumber}`);
        responseData = response.Customer as IDataObject;
    }
    if (operation === 'getMany') {
        const returnAll = this.getNodeParameter('returnAll', i) as boolean;
        const filters = this.getNodeParameter('filters', i) as IDataObject;
        const qs: IDataObject = {};
        for (const key of Object.keys(filters)) {
            if (filters[key] !== '') { qs[key] = filters[key]; }
        }
        if (returnAll) {
            responseData = await fortnoxApiRequestAllItems.call(this, 'GET', '/3/customers', 'Customers', {}, qs);
        } else {
            const limit = this.getNodeParameter('limit', i) as number;
            qs.limit = limit;
            const response = await fortnoxApiRequest.call(this, 'GET', '/3/customers', {}, qs);
            responseData = response.Customers as IDataObject[];
        }
    }
    if (operation === 'update') {
        const customerNumber = this.getNodeParameter('customerNumber', i) as string;
        const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
        const body: IDataObject = { Customer: {} as IDataObject };
        const customerBody = body.Customer as IDataObject;
        for (const key of Object.keys(updateFields)) {
            if (updateFields[key] !== '') { customerBody[key] = updateFields[key]; }
        }
        const response = await fortnoxApiRequest.call(this, 'PUT', `/3/customers/${customerNumber}`, body);
        responseData = response.Customer as IDataObject;
    }
    if (operation === 'delete') {
        await fortnoxApiRequest.call(this, 'DELETE', `/3/customers/${customerNumber}`);
        responseData = { success: true } as IDataObject;
    }
}
```

## Fortnox API Field Reference

### Customer Writable Fields (for Additional Fields / Update Fields)
All alphabetized by field name as they should appear in the n8n UI:

| Field Name | API Key | Type | Description |
|------------|---------|------|-------------|
| Active | Active | boolean | Whether customer is active |
| Address Line 1 | Address1 | string | Customer address line 1 |
| Address Line 2 | Address2 | string | Customer address line 2 |
| City | City | string | Customer city |
| Comments | Comments | string | Comments about the customer |
| Cost Center | CostCenter | string | Default cost center |
| Country Code | CountryCode | string | Two-letter country code (e.g., SE) |
| Currency | Currency | string | Default currency code (e.g., SEK) |
| Customer Number | CustomerNumber | string | Unique identifier (auto-generated if omitted on create) |
| Delivery Address Line 1 | DeliveryAddress1 | string | Delivery address line 1 |
| Delivery Address Line 2 | DeliveryAddress2 | string | Delivery address line 2 |
| Delivery City | DeliveryCity | string | Delivery city |
| Delivery Country Code | DeliveryCountryCode | string | Delivery country code |
| Delivery Fax | DeliveryFax | string | Delivery fax number |
| Delivery Name | DeliveryName | string | Delivery recipient name |
| Delivery Phone 1 | DeliveryPhone1 | string | Delivery phone number |
| Delivery Phone 2 | DeliveryPhone2 | string | Delivery phone number 2 |
| Delivery Zip Code | DeliveryZipCode | string | Delivery postal code |
| Email | Email | string | Primary email |
| Email Invoice | EmailInvoice | string | Email for invoices |
| Email Invoice BCC | EmailInvoiceBCC | string | BCC for invoice emails |
| Email Invoice CC | EmailInvoiceCC | string | CC for invoice emails |
| Email Offer | EmailOffer | string | Email for offers |
| Email Offer BCC | EmailOfferBCC | string | BCC for offer emails |
| Email Offer CC | EmailOfferCC | string | CC for offer emails |
| Email Order | EmailOrder | string | Email for orders |
| Email Order BCC | EmailOrderBCC | string | BCC for order emails |
| Email Order CC | EmailOrderCC | string | CC for order emails |
| Fax | Fax | string | Fax number |
| GLN | GLN | string | Global Location Number |
| GLN Delivery | GLNDelivery | string | Delivery GLN |
| Invoice Administration Fee | InvoiceAdministrationFee | number | Default admin fee |
| Invoice Discount | InvoiceDiscount | number | Default invoice discount |
| Invoice Freight | InvoiceFreight | number | Default freight charge |
| Invoice Remark | InvoiceRemark | string | Default invoice remark |
| Organisation Number | OrganisationNumber | string | Company registration number |
| Our Reference | OurReference | string | Internal reference |
| Phone 1 | Phone1 | string | Primary phone |
| Phone 2 | Phone2 | string | Secondary phone |
| Price List | PriceList | string | Default price list code |
| Project | Project | string | Default project code |
| Sales Account | SalesAccount | number | Default sales account |
| Show Price VAT Included | ShowPriceVATIncluded | boolean | Whether to show VAT-inclusive prices |
| Terms Of Delivery | TermsOfDelivery | string | Default delivery terms code |
| Terms Of Payment | TermsOfPayment | string | Default payment terms code |
| Type | Type | options (PRIVATE/COMPANY) | Customer type |
| VAT Number | VATNumber | string | VAT registration number |
| VAT Type | VATType | options (SEVAT/SEREVERSEDVAT/EUREVERSEDVAT/EUVAT/EXPORT) | VAT type |
| Visiting Address | VisitingAddress | string | Visiting address |
| Visiting City | VisitingCity | string | Visiting city |
| Visiting Country Code | VisitingCountryCode | string | Visiting country code |
| Visiting Zip Code | VisitingZipCode | string | Visiting postal code |
| WWW | WWW | string | Website URL |
| Way Of Delivery | WayOfDelivery | string | Default delivery method code |
| Your Reference | YourReference | string | Customer's reference |
| Zip Code | ZipCode | string | Postal code |

**Read-only fields (not in Additional/Update Fields):** Country, DeliveryCountry, VisitingCountry (plain-text country names derived from CountryCode)

### Customer Filters and Sort Fields
| Parameter | Values |
|-----------|--------|
| filter | `active`, `inactive` |
| sortby | `customernumber`, `name` |
| sortorder | `ascending`, `descending` |
| lastmodified | datetime string (YYYY-MM-DD HH:MM) |

### Article Writable Fields (for Additional Fields / Update Fields)

| Field Name | API Key | Type | Description |
|------------|---------|------|-------------|
| Active | Active | boolean | Whether article is active |
| Article Number | ArticleNumber | string | Unique identifier (auto-generated if omitted) |
| Bulky | Bulky | boolean | Whether article is bulky (affects shipping) |
| Construction Account | ConstructionAccount | number | Construction account number |
| Depth | Depth | number | Article depth (mm) |
| Description | Description | string | Article description |
| EAN | EAN | string | EAN barcode number |
| EU Account | EUAccount | number | EU sales account |
| EU VAT Account | EUVATAccount | number | EU VAT account |
| Expired | Expired | boolean | Whether article is expired |
| Export Account | ExportAccount | number | Export sales account |
| Height | Height | number | Article height (mm) |
| Housework | Housework | boolean | ROT/RUT housework article |
| Housework Type | HouseworkType | options | Type of housework |
| Manufacturer | Manufacturer | string | Manufacturer name |
| Manufacturer Article Number | ManufacturerArticleNumber | string | Manufacturer's article number |
| Note | Note | string | Internal note |
| Purchase Account | PurchaseAccount | number | Purchase account number |
| Purchase Price | PurchasePrice | number | Purchase price |
| Quantity In Stock | QuantityInStock | number | Current stock quantity |
| Sales Account | SalesAccount | number | Sales revenue account |
| Stock Goods | StockGoods | boolean | Whether article is stocked |
| Stock Place | StockPlace | string | Location in warehouse |
| Stock Warning | StockWarning | number | Low stock warning level |
| Supplier Number | SupplierNumber | string | Supplier reference |
| Type | Type | options (STOCK/SERVICE) | Article type |
| Unit | Unit | string | Unit of measure (e.g., pcs, h, kg) |
| VAT | VAT | number | VAT percentage |
| Webshop Article | WebshopArticle | boolean | Whether visible in webshop |
| Weight | Weight | number | Article weight (g) |
| Width | Width | number | Article width (mm) |

**Read-only fields:** DisposableQuantity, ReservedQuantity, SalesPrice, StockValue, SupplierName

### Article Filters and Sort Fields
| Parameter | Values |
|-----------|--------|
| filter | `active`, `inactive` |
| sortby | `articlenumber`, `quantityinstock`, `reservedquantity`, `stockvalue` |
| sortorder | `ascending`, `descending` |
| lastmodified | datetime string (YYYY-MM-DD HH:MM) |

### Order Writable Fields (for Additional Fields / Update Fields)

| Field Name | API Key | Type | Description |
|------------|---------|------|-------------|
| Administration Fee | AdministrationFee | number | Administration fee amount |
| Address Line 1 | Address1 | string | Billing address line 1 |
| Address Line 2 | Address2 | string | Billing address line 2 |
| City | City | string | Billing city |
| Comments | Comments | string | Order comments |
| Copy Remarks | CopyRemarks | boolean | Copy remarks to invoice |
| Cost Center | CostCenter | string | Cost center code |
| Country | Country | string | Billing country |
| Currency | Currency | string | Currency code (e.g., SEK) |
| Currency Rate | CurrencyRate | number | Exchange rate |
| Currency Unit | CurrencyUnit | number | Currency unit |
| Customer Name | CustomerName | string | Customer display name |
| Delivery Address Line 1 | DeliveryAddress1 | string | Delivery address line 1 |
| Delivery Address Line 2 | DeliveryAddress2 | string | Delivery address line 2 |
| Delivery City | DeliveryCity | string | Delivery city |
| Delivery Country | DeliveryCountry | string | Delivery country |
| Delivery Date | DeliveryDate | string | Delivery date (YYYY-MM-DD) |
| Delivery Name | DeliveryName | string | Delivery recipient name |
| Delivery Zip Code | DeliveryZipCode | string | Delivery postal code |
| External Invoice Reference 1 | ExternalInvoiceReference1 | string | External reference 1 |
| External Invoice Reference 2 | ExternalInvoiceReference2 | string | External reference 2 |
| Freight | Freight | number | Freight amount |
| Language | Language | options (SV/EN) | Order language |
| Not Completed | NotCompleted | boolean | Whether order is not fully completed |
| Order Date | OrderDate | string | Order date (YYYY-MM-DD) |
| Our Reference | OurReference | string | Internal reference |
| Phone 1 | Phone1 | string | Phone number |
| Phone 2 | Phone2 | string | Phone number 2 |
| Price List | PriceList | string | Price list code |
| Print Template | PrintTemplate | string | Print template name |
| Project | Project | string | Project code |
| Remarks | Remarks | string | Order remarks |
| Terms Of Delivery | TermsOfDelivery | string | Delivery terms code |
| Terms Of Payment | TermsOfPayment | string | Payment terms code |
| VAT Included | VATIncluded | boolean | Whether prices include VAT |
| Way Of Delivery | WayOfDelivery | string | Delivery method code |
| Your Order Number | YourOrderNumber | string | Customer's order number |
| Your Reference | YourReference | string | Customer's reference |
| Zip Code | ZipCode | string | Billing postal code |

**Read-only fields:** AdministrationFeeVAT, BasisTaxReduction, Cancelled, ContributionPercent, ContributionValue, FreightVAT, Gross, HouseWork, InvoiceReference, Net, OfferReference, OrderType, OrganisationNumber, RoundOff, Sent, TaxReduction, Total, TotalToPay, TotalVAT, WarehouseReady

### Order Row Fields (for fixedCollection)

| Field Name | API Key | Type | Writable | Description |
|------------|---------|------|----------|-------------|
| Account Number | AccountNumber | number | Yes | Revenue account (required if no ArticleNumber) |
| Article Number | ArticleNumber | string | Yes | Article from register |
| Cost Center | CostCenter | string | Yes | Row cost center |
| Delivered Quantity | DeliveredQuantity | number | Yes | Quantity delivered |
| Description | Description | string | Yes | Line item description |
| Discount | Discount | number | Yes | Discount value |
| Discount Type | DiscountType | options | Yes | PERCENT or AMOUNT |
| Housework | HouseWork | boolean | Yes | ROT/RUT housework |
| Housework Hours To Report | HouseWorkHoursToReport | number | Yes | Hours for housework |
| Housework Type | HouseWorkType | options | Yes | Housework type |
| Ordered Quantity | OrderedQuantity | number | Yes | Quantity ordered |
| Price | Price | number | Yes | Unit price |
| Project | Project | string | Yes | Row project code |
| Unit | Unit | string | Yes | Unit of measure |
| VAT | VAT | number | Yes | VAT percentage |

**Read-only row fields:** ContributionPercent, ContributionValue, Total

### Order Filters and Sort Fields
| Parameter | Values |
|-----------|--------|
| filter | `cancelled`, `expired`, `invoicecreated`, `invoicenotcreated` |
| sortby | `customername`, `customernumber`, `documentnumber`, `orderdate` |
| sortorder | `ascending`, `descending` |
| fromdate | date string (YYYY-MM-DD) |
| todate | date string (YYYY-MM-DD) |
| lastmodified | datetime string (YYYY-MM-DD HH:MM) |

## Discretion Recommendations

Based on research findings, here are recommendations for areas left to Claude's discretion:

### CustomerNumber on Create: OPTIONAL
**Recommendation:** Make CustomerNumber optional (include in Additional Fields, not as a top-level required field). Only `Name` should be the top-level required parameter. Fortnox auto-generates CustomerNumber if not provided.
**Confidence:** HIGH -- verified via Go SDK struct and .NET SDK behavior showing CustomerNumber is not marked as required for create.

### ArticleNumber on Create: OPTIONAL
**Recommendation:** Make ArticleNumber optional (include in Additional Fields). No fields are strictly required for Article create, but Description should be the top-level required field as it is the most useful identifier. ArticleNumber auto-generates if omitted.
**Confidence:** HIGH -- verified via .NET SDK showing no [Required] attributes on Article.

### Order Row Field Structure: ALIGN WITH FORTNOX ORDER API
**Recommendation:** Mirror the InvoiceRow pattern but add `OrderedQuantity` (specific to orders). Key fields: ArticleNumber, AccountNumber, OrderedQuantity, DeliveredQuantity, Description, Price, Discount, DiscountType, Unit. The row structure is very similar to InvoiceRows but OrderedQuantity is the primary quantity field for orders.
**Confidence:** HIGH -- verified from .NET SDK OrderRow.cs and Go SDK OrderRow struct.

### Order Cancel Implementation: PUT with empty body
**Recommendation:** `PUT /3/orders/{DocumentNumber}/cancel` with empty body, same pattern as invoice cancel. Returns the Order object with `Cancelled: true`.
**Confidence:** HIGH -- verified from API docs listing and Go SDK.

### Article Type Handling: Include as Options Field
**Recommendation:** Include `Type` as an options field with values `STOCK` (physical product) and `SERVICE` (service). This determines whether stock tracking fields apply.
**Confidence:** MEDIUM -- values derived from .NET SDK `ArticleType` enum. Verify at runtime.

### lastmodified Filter: Include for ALL THREE RESOURCES
**Recommendation:** Include `lastmodified` in the Filters collection for Customer, Article, and Order list operations. It is a global parameter supported across most Fortnox endpoints.
**Confidence:** HIGH -- verified from Fortnox Parameters documentation stating lastmodified works globally.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SalesPrice writable on Article | SalesPrice read-only on Article, use /3/prices endpoint | Recent Fortnox change | Do not include SalesPrice in Article writable fields; document this limitation |
| Fortnox API v2 with access-token header | Fortnox API v3 with Bearer auth | Years ago | v3 is the only supported version |

**Deprecated/outdated:**
- Old developer docs at `developer.fortnox.se/documentation/resources/*` now redirect to `www.fortnox.se/developer`. Use `api.fortnox.se/apidocs` for current reference.
- SalesPrice as a writable Article field: Now read-only. Use the separate Prices endpoint for price management (out of scope for this phase).

## Open Questions

1. **Exact HouseworkType Enum Values for Articles and Order Rows**
   - What we know: The .NET SDK has a `HouseworkType` enum used by both Article and OrderRow entities. It includes values for Swedish ROT/RUT tax deductions.
   - What's unclear: The exact enum values (e.g., CONSTRUCTION, ELECTRICITY, CLEANING, etc.) were not fully enumerated in research.
   - Recommendation: Include HouseworkType as a string field rather than options field. Users who need ROT/RUT can enter the appropriate value. This avoids risk of incomplete enum. **Confidence: LOW** -- needs runtime validation.

2. **Customer DefaultDeliveryTypes and DefaultTemplates Sub-Objects**
   - What we know: These are nested objects with properties like Invoice, Offer, Order (for delivery types) and CashInvoice, Invoice, Offer, Order (for templates).
   - What's unclear: Whether these nested objects should be exposed as individual fields or as JSON input.
   - Recommendation: Skip these nested objects in the initial implementation. They are rarely used in agency automation workflows. Can be added later if needed. **Confidence: MEDIUM**.

3. **Delete Response HTTP Status Code**
   - What we know: Fortnox DELETE returns an empty response body. The HTTP status code should be 200 or 204.
   - What's unclear: Whether `fortnoxApiRequest` handles empty responses correctly or if it will throw a JSON parse error.
   - Recommendation: Test delete operations during implementation. If empty body causes issues, add an `ignoreHttpStatusErrors` option or handle the empty response case in the helper. The existing helper's `json: true` option may handle this gracefully. **Confidence: MEDIUM** -- needs runtime validation.

## Sources

### Primary (HIGH confidence)
- [Fortnox API Documentation](https://api.fortnox.se/apidocs) - Endpoint structure for customers, articles, orders; action endpoints confirmed
- [Fortnox Developer: Parameters](https://www.fortnox.se/developer/guides-and-good-to-know/parameters) - Global query params (lastmodified, fromdate, todate, sortby, sortorder, limit, page)
- [softwerkab/fortnox-csharp-api-sdk](https://github.com/softwerkab/fortnox-csharp-api-sdk) - Official .NET SDK with complete entity definitions, read-only/writable field designations, filter enums, sort enums
- [thats4fun/go-fortnox](https://pkg.go.dev/github.com/thats4fun/go-fortnox) - Complete Go struct definitions for Customer (61 fields), Article (35 fields), Order (50+ fields), OrderRow (22 fields)
- Existing codebase: `InvoiceDescription.ts`, `GenericFunctions.ts`, `Fortnox.node.ts` -- proven patterns for Description files, execute routing, API helpers

### Secondary (MEDIUM confidence)
- [Fortnox Developer: Articles](https://developer.fortnox.se/documentation/resources/articles/) - Confirmed endpoint paths and basic behavior (redirects to new docs site)
- [Fortnox Developer: Orders](https://developer.fortnox.se/documentation/resources/orders/) - Confirmed action endpoints (cancel, createinvoice, email, sent)
- [Fortnox Developer: Customers](https://developer.fortnox.se/documentation/resources/customers/) - Confirmed CRUD + DELETE endpoint exists

### Tertiary (LOW confidence)
- SalesPrice read-only change: Inferred from .NET SDK `[ReadOnly]` attribute and Fortnox blog post about pricing changes. Needs runtime verification to confirm current behavior.
- HouseworkType enum values: Not fully enumerated in research. String field recommended as safe fallback.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies; reuses Phase 1+2 stack entirely
- Architecture: HIGH - Exact replication of proven InvoiceDescription.ts pattern across three resources
- Field coverage: HIGH - Cross-referenced between Go SDK, .NET SDK, and Fortnox API docs for writable/read-only designations
- Filters and sorts: HIGH - Verified via .NET SDK Filter and Sort enum definitions
- Pitfalls: HIGH - Based on field-level analysis and cross-API comparison (Invoice vs Customer vs Article vs Order)
- Action endpoints: HIGH - Confirmed via API docs and Go SDK for cancel and createinvoice
- Open questions: MEDIUM - Minor edge cases (HouseworkType values, delete response handling) that can be resolved during implementation

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable domain; Fortnox API v3 and n8n node patterns are mature)
