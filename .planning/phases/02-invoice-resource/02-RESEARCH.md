# Phase 2: Invoice Resource - Research

**Researched:** 2026-02-27
**Domain:** Fortnox Invoice API, n8n programmatic node resource/operation pattern, pagination, error handling, rate limiting
**Confidence:** HIGH

## Summary

This phase transforms the minimal Fortnox node from Phase 1 into a full Invoice resource with 8 operations (create, get, list, update, bookkeep, cancel, credit, send email) plus three cross-cutting concerns (pagination, error handling, rate limiting) that will be reused by all subsequent resources in Phase 3.

The Fortnox Invoice API follows a RESTful pattern with a `GET/POST/PUT /3/invoices` base and action-specific endpoints (`/3/invoices/{id}/bookkeep`, `/3/invoices/{id}/cancel`, etc.). The list endpoint returns paginated results with `MetaInformation` containing `@CurrentPage`, `@TotalPages`, and `@TotalResources`. Errors are returned in a `{ ErrorInformation: { error, message, code } }` envelope with messages **primarily in Swedish**, requiring translation/mapping for English-speaking users. Rate limiting is 25 requests per 5 seconds per access-token, returning HTTP 429.

The n8n node pattern for this is well-established: a `GenericFunctions.ts` file provides `fortnoxApiRequest` and `fortnoxApiRequestAllItems` helpers that handle authentication, pagination, error wrapping, and rate-limit retry. The node's `description.properties` array defines Resource and Operation dropdowns, required fields, and an "Additional Fields" collection. The `execute()` method routes by resource+operation and delegates HTTP calls to the helpers.

**Primary recommendation:** Build a `GenericFunctions.ts` with API request and pagination helpers, define Invoice resource properties in a separate description file, implement all 8 operations in the node's `execute()` method, and add a Swedish-to-English error message mapping table for common Fortnox error codes.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INV-01 | User can create an invoice with line items, customer reference, due date, and currency | `POST /3/invoices` with JSON body `{ Invoice: { CustomerNumber, InvoiceRows, DueDate, Currency } }`. InvoiceRows is an array with ArticleNumber/AccountNumber + DeliveredQuantity. CustomerNumber is the only truly required field; omitted values use Fortnox defaults. Use `fixedCollection` type for InvoiceRows. |
| INV-02 | User can retrieve a single invoice by DocumentNumber | `GET /3/invoices/{DocumentNumber}`. Returns full invoice object wrapped in `{ Invoice: { ... } }` envelope. |
| INV-03 | User can list invoices with pagination and filters | `GET /3/invoices` with query params: `filter` (fullypaid, unpaid, unbooked, unpaidoverdue, cancelled), `fromdate`, `todate`, `page`, `limit` (default 100, max 500), `sortby`, `sortorder`. Response includes `MetaInformation` with `@TotalPages` and `@CurrentPage`. |
| INV-04 | User can update a draft (unbooked) invoice | `PUT /3/invoices/{DocumentNumber}` with partial JSON body. Only unbooked invoices can be updated (booked invoices return error). |
| INV-05 | User can bookkeep an invoice | `PUT /3/invoices/{DocumentNumber}/bookkeep` with empty body. Finalizes invoice in accounting. |
| INV-06 | User can cancel an invoice | `PUT /3/invoices/{DocumentNumber}/cancel` with empty body. |
| INV-07 | User can credit an invoice (creates linked credit note) | `PUT /3/invoices/{DocumentNumber}/credit` with empty body. Creates a new credit invoice linked to the original. |
| INV-08 | User can send an invoice via email | `GET /3/invoices/{DocumentNumber}/email`. Uses EmailInformation properties configured on the invoice for customization. |
| OPS-01 | All list operations support "Return All" toggle with automatic pagination | Fortnox uses page-based pagination with `MetaInformation.@TotalPages`. Helper function loops `page=1` to `@TotalPages`, accumulating results. n8n pattern: boolean `returnAll` toggle + `limit` field when false. |
| OPS-02 | Fortnox error messages are surfaced clearly with English context | Fortnox errors arrive in `{ ErrorInformation: { error, message, code } }` format with **Swedish messages** (e.g., "Kan inte hitta kontot", "Ogiltig parameter i anropet"). Need a mapping table for common codes to English + NodeApiError with `messageMapping` option. |
| OPS-03 | Rate limiting handled with retry and backoff on HTTP 429 | 25 req/5s per access-token. Returns HTTP 429 (changed from 503). No Retry-After header documented. Implement exponential backoff with 1s base delay, max 3 retries in the `fortnoxApiRequest` helper. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `n8n-workflow` | `*` (peer dep) | Types: `INodeType`, `IExecuteFunctions`, `NodeApiError`, `IHttpRequestOptions`, `NodeConnectionTypes` | Already installed from Phase 1; all node logic depends on these types |
| `@n8n/node-cli` | `*` (dev dep) | Build, lint, dev server | Already installed from Phase 1 |
| `typescript` | `5.9.2` | TypeScript compiler | Already installed from Phase 1 |

### Supporting
No new dependencies needed. All functionality is built using n8n-workflow helpers and standard TypeScript.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual page-based pagination loop | n8n `requestWithAuthenticationPaginated` | The built-in paginator uses `IRequestOptions` (deprecated) and link-header pagination; Fortnox uses page-number pagination with MetaInformation envelope. Manual loop is clearer and more reliable for this API. |
| Custom retry logic in GenericFunctions | n8n's built-in Retry On Fail setting | Retry On Fail is a workflow-level toggle, not programmatic. Custom retry in the helper gives consistent behavior without requiring users to configure workflow settings. |
| Swedish error passthrough | Error code-to-English mapping | Users would see "Kan inte hitta kontot" instead of "Account not found". English mapping is essential for usability. |

**Installation:**
```bash
# No new packages needed -- Phase 1 dependencies cover everything
```

## Architecture Patterns

### Recommended Project Structure
```
nodes/
└── Fortnox/
    ├── Fortnox.node.ts              # Main node class: description + execute()
    ├── Fortnox.node.json            # Codex metadata (already exists from Phase 1)
    ├── GenericFunctions.ts          # fortnoxApiRequest, fortnoxApiRequestAllItems, error helpers
    ├── InvoiceDescription.ts        # Invoice resource + operation property definitions
    └── fortnox.svg                  # Icon (already exists from Phase 1)
```

### Pattern 1: GenericFunctions Helper with Rate Limit Retry
**What:** A centralized API request helper that handles authentication, JSON envelope unwrapping, error translation, and rate-limit retry with exponential backoff.
**When to use:** Every API call from every resource goes through this function.
**Example:**
```typescript
// Source: Pattern derived from n8n-io/n8n GitHub, WooCommerce and GitHub GenericFunctions.ts
import type {
    IExecuteFunctions,
    ILoadOptionsFunctions,
    IHookFunctions,
    IHttpRequestMethods,
    IHttpRequestOptions,
    IDataObject,
    JsonObject,
} from 'n8n-workflow';
import { NodeApiError, sleep } from 'n8n-workflow';

const FORTNOX_API_BASE = 'https://api.fortnox.se';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export async function fortnoxApiRequest(
    this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
    method: IHttpRequestMethods,
    endpoint: string,
    body: IDataObject = {},
    qs: IDataObject = {},
): Promise<any> {
    const options: IHttpRequestOptions = {
        method,
        url: `${FORTNOX_API_BASE}${endpoint}`,
        qs,
        json: true,
    };

    if (Object.keys(body).length > 0) {
        options.body = body;
    }

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await this.helpers.httpRequestWithAuthentication.call(
                this,
                'fortnoxApi',
                options,
            );
        } catch (error: any) {
            // Rate limit: retry with exponential backoff
            if (error.httpCode === '429' && attempt < MAX_RETRIES) {
                const delay = BASE_DELAY_MS * Math.pow(2, attempt);
                await sleep(delay);
                continue;
            }
            // Translate Fortnox error envelope
            throw parseFortnoxError.call(this, error);
        }
    }
}

function parseFortnoxError(
    this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
    error: any,
): NodeApiError {
    const body = error.cause?.response?.body;
    if (body?.ErrorInformation) {
        const { message, code } = body.ErrorInformation;
        const englishMessage = FORTNOX_ERROR_MAP[code] || message;
        return new NodeApiError(this.getNode(), error as JsonObject, {
            message: englishMessage,
            description: `Fortnox error ${code}: ${message}`,
            httpCode: error.httpCode,
        });
    }
    return new NodeApiError(this.getNode(), error as JsonObject);
}

// Common Fortnox error codes with English translations
const FORTNOX_ERROR_MAP: Record<number, string> = {
    2000106: 'Value must be alphanumeric',
    2000108: 'Value must be numeric',
    2000134: 'Value must be a boolean',
    2000310: 'Invalid credentials',
    2000359: 'Value contains invalid characters',
    2000588: 'Invalid parameter in the request',
    2001304: 'Account not found',
    2001399: 'Invalid field name',
    2001101: 'No active license for the requested scope',
    1000003: 'System error -- contact Fortnox support',
};
```

### Pattern 2: Page-Based Pagination Helper
**What:** A helper that loops through all pages of a Fortnox list endpoint, reading `MetaInformation.@TotalPages` to know when to stop.
**When to use:** When the "Return All" toggle is enabled on any list operation.
**Example:**
```typescript
// Source: Pattern from n8n GitHub/WooCommerce GenericFunctions, adapted for Fortnox pagination
export async function fortnoxApiRequestAllItems(
    this: IExecuteFunctions | ILoadOptionsFunctions,
    method: IHttpRequestMethods,
    endpoint: string,
    resourceKey: string,       // e.g., 'Invoices'
    body: IDataObject = {},
    qs: IDataObject = {},
): Promise<IDataObject[]> {
    const returnData: IDataObject[] = [];
    qs.limit = 500; // max per page
    qs.page = 1;

    let totalPages: number;
    do {
        const response = await fortnoxApiRequest.call(this, method, endpoint, body, qs);
        returnData.push(...(response[resourceKey] as IDataObject[]));
        totalPages = response.MetaInformation?.['@TotalPages'] ?? 1;
        qs.page = (qs.page as number) + 1;
    } while ((qs.page as number) <= totalPages);

    return returnData;
}
```

### Pattern 3: Resource + Operation Routing in execute()
**What:** The `execute()` method reads the `resource` and `operation` parameters and routes to the appropriate API call using a nested if/switch pattern.
**When to use:** Standard pattern for all n8n programmatic nodes with multiple resources.
**Example:**
```typescript
// Source: n8n-io/n8n-docs programmatic-style-node.md
async execute(this: IExecuteFunctions) {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const resource = this.getNodeParameter('resource', 0);
    const operation = this.getNodeParameter('operation', 0);

    for (let i = 0; i < items.length; i++) {
        try {
            let responseData;

            if (resource === 'invoice') {
                if (operation === 'create') {
                    const customerNumber = this.getNodeParameter('customerNumber', i) as string;
                    const additionalFields = this.getNodeParameter('additionalFields', i);
                    const invoiceRows = this.getNodeParameter('invoiceRows', i) as IDataObject;
                    // ... build body, call fortnoxApiRequest
                }
                // ... other operations
            }

            const executionData = this.helpers.constructExecutionMetaData(
                this.helpers.returnJsonArray(responseData as IDataObject),
                { itemData: { item: i } },
            );
            returnData.push(...executionData);
        } catch (error) {
            if (this.continueOnFail()) {
                const executionData = this.helpers.constructExecutionMetaData(
                    this.helpers.returnJsonArray({ error: (error as Error).message }),
                    { itemData: { item: i } },
                );
                returnData.push(...executionData);
                continue;
            }
            throw error;
        }
    }
    return [returnData];
}
```

### Pattern 4: fixedCollection for Invoice Rows (Line Items)
**What:** Use n8n's `fixedCollection` property type to let users define an array of line items, each with ArticleNumber/AccountNumber, Description, DeliveredQuantity, and Price.
**When to use:** When the API accepts an array of objects (like InvoiceRows).
**Example:**
```typescript
// Source: n8n fixedCollection pattern from n8n-io/n8n-docs
{
    displayName: 'Invoice Rows',
    name: 'invoiceRows',
    type: 'fixedCollection',
    typeOptions: {
        multipleValues: true,
    },
    displayOptions: {
        show: {
            resource: ['invoice'],
            operation: ['create'],
        },
    },
    default: {},
    options: [
        {
            displayName: 'Row',
            name: 'row',
            values: [
                {
                    displayName: 'Article Number',
                    name: 'ArticleNumber',
                    type: 'string',
                    default: '',
                    description: 'Article number from Fortnox article register',
                },
                {
                    displayName: 'Account Number',
                    name: 'AccountNumber',
                    type: 'number',
                    default: 0,
                    description: 'Account number. Required if no ArticleNumber is provided.',
                },
                {
                    displayName: 'Delivered Quantity',
                    name: 'DeliveredQuantity',
                    type: 'number',
                    default: 1,
                },
                {
                    displayName: 'Description',
                    name: 'Description',
                    type: 'string',
                    default: '',
                },
                {
                    displayName: 'Price',
                    name: 'Price',
                    type: 'number',
                    default: 0,
                    description: 'Unit price excluding VAT',
                },
            ],
        },
    ],
    description: 'Line items for the invoice. Each row requires either an ArticleNumber or an AccountNumber.',
}
```

### Pattern 5: Return All Toggle with Limit Fallback
**What:** A boolean "Return All" toggle that, when enabled, automatically paginates through all results. When disabled, shows a "Limit" field.
**When to use:** Every list/getAll operation.
**Example:**
```typescript
// Source: Standard n8n pattern from multiple built-in nodes
{
    displayName: 'Return All',
    name: 'returnAll',
    type: 'boolean',
    displayOptions: {
        show: {
            resource: ['invoice'],
            operation: ['getMany'],
        },
    },
    default: false,
    description: 'Whether to return all results or only up to a given limit',
},
{
    displayName: 'Limit',
    name: 'limit',
    type: 'number',
    displayOptions: {
        show: {
            resource: ['invoice'],
            operation: ['getMany'],
            returnAll: [false],
        },
    },
    typeOptions: {
        minValue: 1,
        maxValue: 500,
    },
    default: 50,
    description: 'Max number of results to return',
},
```

### Anti-Patterns to Avoid
- **Putting all property definitions in the main node file:** Separate resource descriptions into their own files (e.g., `InvoiceDescription.ts`). The main node file should import and spread them into `properties`.
- **Ignoring the `continueOnFail()` pattern:** Every operation in the execute loop MUST check `continueOnFail()` in the catch block. Without it, one failed item stops processing all subsequent items.
- **Using `this.helpers.request()` (deprecated):** Always use `this.helpers.httpRequestWithAuthentication()`. The older method is deprecated.
- **Sending JSON body for action endpoints:** The bookkeep, cancel, credit, and email endpoints expect empty bodies (or no body). Sending `{}` as JSON can cause issues -- omit the body parameter entirely.
- **Hardcoding resource key extraction:** The Fortnox API wraps single-resource responses in `{ Invoice: { ... } }` and list responses in `{ Invoices: [ ... ] }`. The resource key differs between singular and plural. Make the key a parameter to the helper functions.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP authentication | Manual Bearer token injection | `httpRequestWithAuthentication('fortnoxApi', options)` | n8n handles token refresh via preAuthentication automatically |
| Rate limit retry | Custom setInterval/setTimeout queue | `sleep()` from n8n-workflow + retry loop in `fortnoxApiRequest` | n8n provides `sleep()` as a promisified delay; keep retry logic in one central helper |
| Error normalization | Custom error class | `NodeApiError` from n8n-workflow | n8n UI knows how to display NodeApiError with message, description, and httpCode |
| Pagination accumulation | Manual array concatenation with fetch | `fortnoxApiRequestAllItems` helper | One tested helper reused across all resources; consistent behavior |
| JSON response unwrapping | Per-operation response parsing | Central helper that extracts by resource key | Fortnox wraps all responses in `{ ResourceName: data }` -- extract once |
| Input validation for invoice rows | Custom validation logic | Fortnox API-side validation + English error mapping | Fortnox returns specific error codes (2000106, 2000108, etc.) that we translate; no need to duplicate validation |

**Key insight:** Phase 2 builds the reusable infrastructure (GenericFunctions.ts) that Phase 3 will depend on. Every decision here -- error format, pagination helper signature, property description patterns -- becomes the template for Customer, Article, and Order resources. Getting the abstractions right is more important than getting any single operation working.

## Common Pitfalls

### Pitfall 1: Swedish Error Messages Displayed to Users
**What goes wrong:** Users see "Kan inte hitta kontot" or "Ogiltig parameter i anropet" instead of English messages.
**Why it happens:** Fortnox API returns error messages in Swedish by default. The `ErrorInformation.message` field is always Swedish.
**How to avoid:** Map common `ErrorInformation.code` values to English strings in `GenericFunctions.ts`. For unmapped codes, pass through the Swedish message but prefix with the numeric code so users can search for help.
**Warning signs:** Non-Swedish users report confusing error messages in n8n workflow logs.

### Pitfall 2: Rate Limit Cascade During Pagination
**What goes wrong:** A "Return All" operation that paginates through hundreds of pages triggers rate limiting, and without retry logic, the entire operation fails partway through.
**Why it happens:** At 500 items per page, fetching 5000 invoices requires 10 sequential requests. At max speed this takes <1 second, easily exceeding 25 req/5s.
**How to avoid:** The retry logic in `fortnoxApiRequest` handles 429 responses automatically. Consider adding a small delay between pagination requests (200ms) to proactively avoid hitting limits during bulk fetches.
**Warning signs:** Intermittent failures on large datasets, especially when multiple workflows run simultaneously.

### Pitfall 3: Updating Booked Invoices Returns Error
**What goes wrong:** User tries to update an invoice and gets an error about the document being finalized/released.
**Why it happens:** Fortnox only allows updates to unbooked (draft) invoices. Once bookkeeping is done, the invoice is immutable. The error code is `cannot_modify_released_document`.
**How to avoid:** Document this clearly in the operation description: "Only unbooked (draft) invoices can be updated." Consider adding a note in the error handler specifically for this code.
**Warning signs:** Error "cannot_modify_released_document" or Swedish equivalent.

### Pitfall 4: Invoice Rows Require ArticleNumber OR AccountNumber
**What goes wrong:** Creating an invoice with rows that have neither ArticleNumber nor AccountNumber returns a Fortnox validation error.
**Why it happens:** Fortnox requires at least one of these fields to know which account to post the revenue to.
**How to avoid:** Document in the field description: "Each row requires either an ArticleNumber or an AccountNumber." Fortnox will return a specific error code if neither is provided -- ensure the English mapping covers this.
**Warning signs:** Validation errors when creating invoices with incomplete row data.

### Pitfall 5: Email Endpoint Uses GET, Not POST
**What goes wrong:** Sending an invoice via email with `POST /3/invoices/{id}/email` returns 405 Method Not Allowed.
**Why it happens:** The email endpoint is `GET /3/invoices/{id}/email`, which is unusual. It triggers the email send as a side effect of a GET request.
**How to avoid:** Use the correct HTTP method as documented. Document this in code comments for maintainability.
**Warning signs:** 405 errors on the send email operation.

### Pitfall 6: fixedCollection Default Value Bug in Community Nodes
**What goes wrong:** Invoice rows with default values don't save correctly in the n8n UI.
**Why it happens:** There is a known n8n issue (#19607) where fixedCollection fields with default values can behave unexpectedly in community nodes.
**How to avoid:** Test the fixedCollection UI thoroughly. Use minimal defaults (empty strings, 0 for numbers). If the issue manifests, use `type: 'collection'` as a fallback.
**Warning signs:** Default values appearing in saved workflows but not in the UI, or values not persisting.

### Pitfall 7: Fortnox List Response Envelope Differs from Single-Item
**What goes wrong:** Code that expects `response.Invoice` for both get-one and get-many fails because list returns `response.Invoices` (plural).
**Why it happens:** Fortnox uses `{ Invoice: {...} }` for single items and `{ Invoices: [...] }` for lists. The key name changes.
**How to avoid:** Use explicit resource keys: `'Invoice'` for get/create/update, `'Invoices'` for list. Pass the key as a parameter to helper functions.
**Warning signs:** Undefined results when accessing the wrong key.

## Code Examples

Verified patterns from official sources:

### Fortnox Create Invoice Request
```typescript
// Source: https://apps.fortnox.se/apidocs (Invoices section)
// POST https://api.fortnox.se/3/invoices
// Headers: Authorization: Bearer {token}
// Body:
{
    "Invoice": {
        "CustomerNumber": "100",
        "DueDate": "2026-03-30",
        "Currency": "SEK",
        "InvoiceRows": [
            {
                "ArticleNumber": "66892",
                "DeliveredQuantity": "10.00"
            },
            {
                "AccountNumber": 3000,
                "DeliveredQuantity": "5.00",
                "Price": 100,
                "Description": "Consulting services"
            }
        ]
    }
}
// Response: { Invoice: { DocumentNumber: 1, ... (full invoice object) } }
```

### Fortnox List Invoices Response
```json
// Source: https://apps.fortnox.se/apidocs (Invoices list)
// GET https://api.fortnox.se/3/invoices?filter=unpaid&page=1&limit=100
{
    "Invoices": [
        {
            "@url": "https://api.fortnox.se/3/invoices/1",
            "Balance": 1250,
            "Booked": false,
            "Cancelled": false,
            "CostCenter": "",
            "Currency": "SEK",
            "CurrencyRate": "1",
            "CurrencyUnit": 1,
            "CustomerName": "Kund AB",
            "CustomerNumber": "100",
            "DocumentNumber": "1",
            "DueDate": "2026-03-30",
            "ExternalInvoiceReference1": "",
            "ExternalInvoiceReference2": "",
            "InvoiceDate": "2026-02-27",
            "InvoiceType": "INVOICE",
            "OCR": "133",
            "Project": "",
            "Sent": false,
            "TermsOfPayment": "30",
            "Total": 1250,
            "WayOfDelivery": ""
        }
    ],
    "MetaInformation": {
        "@CurrentPage": 1,
        "@TotalPages": 3,
        "@TotalResources": 203
    }
}
```

### Fortnox Error Response
```json
// Source: https://www.fortnox.se/developer/guides-and-good-to-know/errors
// Any failed request returns:
{
    "ErrorInformation": {
        "error": 1,
        "message": "Kan inte hitta kontot.",
        "code": 2000423
    }
}
// HTTP status: 400, 403, 404, or 500
```

### Fortnox Invoice Action Endpoints
```typescript
// Source: https://apps.fortnox.se/apidocs (Invoices section)
// Bookkeep:   PUT  /3/invoices/{DocumentNumber}/bookkeep   (empty body)
// Cancel:     PUT  /3/invoices/{DocumentNumber}/cancel      (empty body)
// Credit:     PUT  /3/invoices/{DocumentNumber}/credit      (empty body)
// Send email: GET  /3/invoices/{DocumentNumber}/email       (no body)
// Mark sent:  PUT  /3/invoices/{DocumentNumber}/sent        (empty body)
```

### n8n Node Property Structure for Resource + Operation
```typescript
// Source: n8n-io/n8n-docs code-standards.md + programmatic-style-node.md
// InvoiceDescription.ts exports:
export const invoiceOperations: INodeProperties[] = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['invoice'] } },
        options: [
            { name: 'Create', value: 'create', action: 'Create an invoice', description: 'Create a new invoice' },
            { name: 'Get', value: 'get', action: 'Get an invoice', description: 'Retrieve an invoice by document number' },
            { name: 'Get Many', value: 'getMany', action: 'Get many invoices', description: 'List invoices with optional filters' },
            { name: 'Update', value: 'update', action: 'Update an invoice', description: 'Update a draft (unbooked) invoice' },
            { name: 'Bookkeep', value: 'bookkeep', action: 'Bookkeep an invoice', description: 'Finalize an invoice in accounting' },
            { name: 'Cancel', value: 'cancel', action: 'Cancel an invoice', description: 'Cancel an invoice' },
            { name: 'Credit', value: 'credit', action: 'Credit an invoice', description: 'Create a credit note for an invoice' },
            { name: 'Send', value: 'send', action: 'Send an invoice', description: 'Send an invoice via email' },
        ],
        default: 'getMany',
    },
];

export const invoiceFields: INodeProperties[] = [
    // DocumentNumber field (used by get, update, bookkeep, cancel, credit, send)
    {
        displayName: 'Document Number',
        name: 'documentNumber',
        type: 'string',
        required: true,
        displayOptions: {
            show: { resource: ['invoice'], operation: ['get', 'update', 'bookkeep', 'cancel', 'credit', 'send'] },
        },
        default: '',
        description: 'The invoice document number in Fortnox',
    },
    // CustomerNumber (required for create)
    // InvoiceRows (fixedCollection for create)
    // Return All toggle (getMany)
    // Limit (getMany, when returnAll=false)
    // Filters collection (getMany)
    // Additional Fields collection (create, update)
];
```

### Fortnox Invoice Fields Reference

**Editable fields (for Create/Update Additional Fields):**
- Address1, Address2, City, ZipCode, Country
- Comments, Remarks
- CostCenter, Project
- Currency, CurrencyRate, CurrencyUnit
- DeliveryAddress1, DeliveryAddress2, DeliveryCity, DeliveryCountry, DeliveryName, DeliveryZipCode, DeliveryDate
- DueDate, InvoiceDate
- EmailInformation (EmailAddressFrom, EmailAddressTo, EmailSubject, EmailBody)
- EUQuarterlyReport
- Freight
- InvoiceType (INVOICE, CASH, CREDIT)
- Language (SV, EN)
- OurReference, YourReference, YourOrderNumber
- PaymentWay
- Phone1, Phone2
- PriceList, PrintTemplate
- TermsOfDelivery, TermsOfPayment
- VATIncluded
- WayOfDelivery

**Read-only fields (returned but not settable):**
- Balance, BasisTaxReduction, Booked, Cancelled, Credit
- ContributionPercent, ContributionValue
- FreightVAT, Gross, HouseWork
- LastRemindDate, Net, NoxFinans
- OfferReference, OrderReference, OrganisationNumber
- Reminders, RoundOff, Sent
- TaxReduction, Total, TotalToPay, TotalVAT
- VoucherNumber, VoucherSeries, VoucherYear

**List filter values (for `filter` query param):**
- `fullypaid` -- Fully paid invoices
- `unpaid` -- Unpaid invoices
- `unbooked` -- Unbooked (draft) invoices
- `unpaidoverdue` -- Unpaid and past due date
- `cancelled` -- Cancelled invoices

**Sortable fields:** CustomerName, CustomerNumber, DocumentNumber, OCR, Total

**InvoiceRow fields:**
- ArticleNumber (string) -- Links to article register
- AccountNumber (number) -- Revenue account, required if no ArticleNumber
- DeliveredQuantity (number) -- Quantity delivered/invoiced
- Description (string) -- Line item description
- Price (number) -- Unit price excluding VAT
- Discount (number) -- Discount percentage
- DiscountType (string) -- PERCENT or AMOUNT
- CostCenter (string) -- Cost center for the row
- Project (string) -- Project for the row
- Unit (string) -- Unit of measure (e.g., "pcs", "hours")
- VAT (number) -- VAT percentage

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `this.helpers.request()` with `IRequestOptions` | `this.helpers.httpRequestWithAuthentication()` with `IHttpRequestOptions` | n8n 1.x | httpRequest is the modern helper; must use for new nodes |
| `resolveWithFullResponse: true` for pagination headers | Page-number based pagination with response body metadata | N/A (API-specific) | Fortnox uses `MetaInformation` in the response body, not HTTP headers for pagination |
| Fortnox HTTP 503 for rate limiting | HTTP 429 (Too Many Requests) | 2023-2024 | Changed from 503 to standard 429; retry logic should check for 429 |

**Deprecated/outdated:**
- `this.helpers.request()`: Deprecated in favor of `this.helpers.httpRequest()` and `this.helpers.httpRequestWithAuthentication()`.
- `this.helpers.requestWithAuthentication()`: Also deprecated; use `httpRequestWithAuthentication()`.
- Fortnox 503 rate limit response: Changed to 429. Code should handle both for backwards compatibility, but 429 is the current status.

## Open Questions

1. **Exact Error Response Body Access Path in NodeApiError**
   - What we know: `httpRequestWithAuthentication` throws errors with the response body available somewhere in the error object. NodeApiError accepts `JsonObject` as the error response.
   - What's unclear: The exact property path to access the Fortnox `ErrorInformation` envelope from the caught error object. Is it `error.cause?.response?.body`, `error.response?.body`, or `error.body`? This depends on n8n's internal error wrapping.
   - Recommendation: Log the full error object during development to determine the exact path. Start with `error.cause?.response?.body?.ErrorInformation` and adjust. The `parseXml: false` option (default) should ensure JSON parsing. **Confidence: MEDIUM** -- needs runtime validation.

2. **sleep() Import from n8n-workflow** -- RESOLVED
   - **Confirmed:** `sleep` and `sleepWithAbort` are both exported from `n8n-workflow` (verified in `node_modules/n8n-workflow/dist/cjs/utils.d.ts`). Import as `import { sleep } from 'n8n-workflow';`. Signature: `sleep(ms: number): Promise<void>`. Also available: `sleepWithAbort(ms: number, abortSignal?: AbortSignal): Promise<void>` which could be used with `this.getExecutionCancelSignal()` for cancellable retries. **Confidence: HIGH**.

3. **fixedCollection Behavior in Community Nodes**
   - What we know: There is a known issue (#19607) with fixedCollection fields and default values in community nodes. The core n8n team has acknowledged it.
   - What's unclear: Whether this affects our use case (InvoiceRows). The issue may only apply to specific configurations.
   - Recommendation: Test thoroughly during development. If fixedCollection causes issues, fall back to a `json` type field where users paste invoice row JSON directly. **Confidence: MEDIUM**.

4. **httpRequestWithAuthentication Error Object Shape**
   - What we know: When the API returns a 4xx/5xx status, `httpRequestWithAuthentication` throws an error. The credential's `authenticate` property (Bearer token) is automatically applied.
   - What's unclear: Whether the error includes the original response body in a predictable location, and whether `ignoreHttpStatusErrors: true` would be a better approach (catch the raw response, check status, handle manually).
   - Recommendation: Start with the standard try/catch approach. If error body access is problematic, consider using `ignoreHttpStatusErrors: true` and manual status code checking in `fortnoxApiRequest`. **Confidence: MEDIUM**.

## Sources

### Primary (HIGH confidence)
- [Fortnox API Documentation](https://apps.fortnox.se/apidocs) - Invoice endpoints, field schemas, action endpoints
- [Fortnox Developer: Parameters](https://www.fortnox.se/developer/guides-and-good-to-know/parameters) - Pagination (page/limit/offset), filtering, sorting
- [Fortnox Developer: Rate Limits](https://www.fortnox.se/developer/guides-and-good-to-know/rate-limits-for-fortnox-api) - 25 req/5s per access-token, HTTP 429, sliding window
- [Fortnox Developer: Errors](https://www.fortnox.se/developer/guides-and-good-to-know/errors) - Error codes, Swedish messages, ErrorInformation envelope
- [Fortnox Developer: Responses](https://www.fortnox.se/developer/guides-and-good-to-know/responses) - Response envelope format, HTTP status codes
- [n8n-io/n8n-docs: Programmatic Style Node](https://github.com/n8n-io/n8n-docs/blob/main/docs/integrations/creating-nodes/build/programmatic-style-node.md) - Resource/Operation pattern, execute() structure, additionalFields pattern
- [n8n-io/n8n-docs: Code Standards](https://github.com/n8n-io/n8n-docs/blob/main/docs/integrations/creating-nodes/build/reference/code-standards.md) - Resource and Operation property definitions
- [n8n-io/n8n-docs: Error Handling](https://github.com/n8n-io/n8n-docs/blob/main/docs/integrations/creating-nodes/build/reference/error-handling.md) - NodeApiError constructor
- [n8n-workflow types](local: node_modules/n8n-workflow/dist/cjs/interfaces.d.ts) - IHttpRequestOptions, RequestHelperFunctions, NodeApiError, IExecuteFunctions
- [byrnedo/go-fortnox](https://github.com/byrnedo/go-fortnox/blob/master/invoices.go) - Complete InvoiceFull struct with all Fortnox invoice fields
- [hmphu/fortnox Invoice.php](https://github.com/hmphu/fortnox/blob/master/src/models/Invoice.php) - Required fields (CustomerNumber only), read-only fields, searchable/sortable fields

### Secondary (MEDIUM confidence)
- [n8n-io/n8n: GitHub GenericFunctions.ts](https://github.com/n8n-io/n8n/blob/master/packages/nodes-base/nodes/Github/GenericFunctions.ts) - githubApiRequest pattern, pagination with page++, NodeApiError wrapping
- [n8n-io/n8n: WooCommerce GenericFunctions.ts](https://github.com/n8n-io/n8n/blob/master/packages/nodes-base/nodes/WooCommerce/GenericFunctions.ts) - woocommerceApiRequestAllItems pattern, requestWithAuthentication
- Context7 `/n8n-io/n8n-docs` - Node execution pattern, additionalFields collection, NodeApiError usage
- [Fortnox Developer: Finance Invoice Best Practices](https://www.fortnox.se/developer/guides-and-good-to-know/best-practices/finance-invoice) - Invoice requirements for Fortnox Finans (specialized, not core)

### Tertiary (LOW confidence)
- [n8n GitHub Issue #19607](https://github.com/n8n-io/n8n/issues/19607) - fixedCollection default values bug in community nodes (needs runtime testing)
- Fortnox Retry-After header presence: Not documented; may or may not be included in 429 responses (needs runtime testing)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies; reuses Phase 1 stack entirely
- Architecture: HIGH - GenericFunctions helper pattern is well-established across dozens of n8n built-in nodes; Fortnox API is well-documented REST
- Fortnox Invoice API: HIGH - Official docs verified, cross-referenced with multiple third-party client libraries
- Pagination: HIGH - Fortnox MetaInformation pagination is clearly documented with page/limit/totalPages
- Error handling: HIGH for format knowledge, MEDIUM for implementation details (error object path needs runtime testing)
- Rate limiting: HIGH for limits and status code, MEDIUM for retry implementation (sleep() availability, error body access)
- Pitfalls: HIGH - Based on official docs, known n8n issues, and cross-referenced community reports

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable domain; Fortnox API v3 and n8n node patterns are mature)
