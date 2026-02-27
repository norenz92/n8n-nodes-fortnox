# Feature Landscape

**Domain:** n8n community node for Fortnox accounting API integration
**Researched:** 2026-02-27

## Table Stakes

Features users expect. Missing = product feels incomplete.

### Core Resources (CRUD Operations)

These are the four resources explicitly called out in the project scope. Every Fortnox integration in the wild (Shopify connectors, Zapier-like tools, custom integrations) supports these. An n8n Fortnox node without them is useless.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Invoice: Create** | Primary use case -- automating invoice creation from orders, CRM events, or other triggers | Med | Must support line items (InvoiceRows), customer reference, due date, currency. Fortnox invoice payload is nested with rows array |
| **Invoice: Get** | Retrieve single invoice by DocumentNumber | Low | Straightforward GET /invoices/{DocumentNumber} |
| **Invoice: Get Many** | List/filter invoices with pagination | Med | Must handle Fortnox pagination (limit/offset, max 500 per page). Support filters: unpaid, unbooked, cancelled, etc. |
| **Invoice: Update** | Modify draft invoices before booking | Med | Only works on unbooked invoices. Must communicate this constraint clearly |
| **Invoice: Send** | Email/e-invoice sending | Low | PUT action endpoints for email, e-invoice, e-print |
| **Invoice: Bookkeep** | Finalize invoice in accounting | Low | PUT /invoices/{DocumentNumber}/bookkeep -- critical for Swedish accounting workflows |
| **Invoice: Cancel** | Cancel an invoice | Low | PUT action endpoint |
| **Invoice: Credit** | Create credit invoice | Low | PUT /invoices/{DocumentNumber}/credit -- creates linked credit note |
| **Customer: Create** | Register new customers in Fortnox | Med | Many optional fields. Core: CustomerNumber (auto or manual), Name, Email, Address fields |
| **Customer: Get** | Retrieve single customer | Low | GET /customers/{CustomerNumber} |
| **Customer: Get Many** | List customers with pagination | Med | Pagination + filter support. lastmodified parameter important for sync workflows |
| **Customer: Update** | Modify customer records | Low | PUT /customers/{CustomerNumber} |
| **Article: Create** | Add products/services to catalog | Med | ArticleNumber, Description, SalesPrice, PurchasePrice, Unit. Connects to price lists |
| **Article: Get** | Retrieve single article | Low | GET /articles/{ArticleNumber} |
| **Article: Get Many** | List articles with pagination | Med | Pagination support |
| **Article: Update** | Modify article details | Low | PUT /articles/{ArticleNumber} |
| **Article: Delete** | Remove article from catalog | Low | DELETE /articles/{ArticleNumber} |
| **Order: Create** | Create sales orders | Med | Similar nested structure to invoices with OrderRows. References Customer and Articles |
| **Order: Get** | Retrieve single order | Low | GET /orders/{DocumentNumber} |
| **Order: Get Many** | List orders with pagination | Med | Pagination + date range filters (fromdate/todate) |
| **Order: Update** | Modify order before conversion | Low | PUT /orders/{DocumentNumber} |
| **Order: Create Invoice** | Convert order to invoice | Low | PUT /orders/{DocumentNumber}/createinvoice -- high-value automation action |

### Authentication

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Fortnox credential type** | n8n requires a credential type for API authentication | Med | Must implement client credentials flow: ClientId + ClientSecret + TenantId. Token endpoint: apps.fortnox.se/oauth-v1/token with Basic auth header |
| **Per-client credentials** | Agency model requires separate credentials per client | Low | Each credential stores unique TenantId. Shared ClientId/ClientSecret across credentials is fine |
| **Automatic token refresh** | Access tokens expire after 1 hour | Med | Must request new token before/on expiry. No refresh tokens -- re-request using client credentials each time |

### Operational Essentials

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Pagination handling** | Fortnox defaults to 100 records, max 500. Users need all records | Med | n8n convention: "Return All" toggle that auto-paginates. Must respect rate limits while paginating |
| **Error handling with clear messages** | Fortnox returns specific error codes and messages | Med | Must surface Fortnox error messages (e.g., "Invoice is already booked") rather than generic HTTP errors |
| **Rate limit awareness** | 25 requests per 5 seconds per client+tenant | Med | Implement retry with backoff on HTTP 429. Critical for Get Many operations with pagination |

## Differentiators

Features that set product apart. Not expected (the Xero n8n node only has Contacts + Invoices), but valued.

### Additional Resources

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Supplier: CRUD** | Complete procure-to-pay automation. Agencies managing AP and AR need this | Med | GET/POST/PUT /suppliers. No DELETE available in Fortnox API |
| **Supplier Invoice: Create/Get/List** | Automate purchase invoice entry -- high-value for agencies handling bookkeeping | High | Complex payload with rows, account coding. Bookkeep/cancel/credit actions available |
| **Offer: CRUD + Convert** | Full quote-to-cash pipeline: Offer -> Order -> Invoice | Med | Create, list, update, convert to order, convert to invoice. Good workflow enabler |
| **Voucher: Create/Get/List** | Direct journal entry creation for custom bookkeeping automations | Med | Requires VoucherSeries and FinancialYear. Important for advanced accounting workflows |
| **Company Information: Get** | Quick access to company details for multi-tenant management | Low | Read-only. Useful for credential validation and workflow routing |

### Advanced Operations

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Invoice: Print/Preview** | Generate PDF output for downstream processing (email, archive) | Low | Returns PDF binary data. Useful in document management workflows |
| **Order: Send Email** | Send order confirmations directly from workflow | Low | PUT action endpoint |
| **Order: Cancel** | Cancel orders programmatically | Low | PUT action endpoint |
| **Additional Fields pattern** | Expose all optional Fortnox fields without cluttering the UI | Med | n8n convention: "Additional Fields" collection for optional parameters. Critical for power users |
| **Filter support on Get Many** | Fortnox has resource-specific filters (e.g., invoices: unpaid, unbooked, cancelled) | Med | Expose as dropdown options. Combine with lastmodified for incremental sync |
| **Date range filtering** | Filter by fromdate/todate on invoices, orders, offers, vouchers | Low | Available on key resources. Important for reporting workflows |
| **Sort control** | sortby + sortorder parameters | Low | Expose on Get Many operations for user control over result ordering |

### Workflow Enablers

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **OAuth consent trigger/workflow** | Clients authorize via shareable link without n8n access | High | Core to the agency model. Needs a webhook/trigger that captures TenantId from OAuth callback and creates credentials. This is the "magic" of the project |
| **Fortnox Trigger Node (polling)** | React to new/updated invoices, customers, orders | High | Use lastmodified parameter to poll for changes. Fortnox has no webhooks, so polling is the only option. Enables reactive workflows |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Full warehouse management (stock, production orders, purchase orders)** | Extremely complex resource set with dozens of nested operations. Warehouse module is optional in Fortnox and rarely used by the target audience (small agencies) | Use HTTP Request node for the rare warehouse API call. Document how to authenticate with the Fortnox credential type via HTTP Request node |
| **Employee/Payroll operations** | Payroll is sensitive, regulated (Swedish tax law), and rarely automated by external integrations. High liability, low demand | Out of scope. Payroll integrations need dedicated compliance review |
| **Asset management (fixed assets)** | Niche accounting feature. Complex depreciation logic. Almost never automated | Leave for HTTP Request node |
| **Contract management** | Fortnox contracts are subscription billing features. Low demand for automation via n8n | Leave for HTTP Request node |
| **Archive/Inbox file management** | File upload/download to Fortnox document management. Orthogonal to core accounting workflows | Could be added later as a differentiator, but not MVP. Complex binary handling |
| **All 60+ Fortnox resources** | Fortnox API has an enormous surface area. Building nodes for everything would take months and most would never be used | Focus on the 4-8 resources that cover 95% of use cases. Document HTTP Request node pattern for the rest |
| **Custom UI/Portal for client onboarding** | Project scope explicitly excludes customer-facing portals | Shareable authorization link is sufficient for the agency model |
| **Webhook/real-time triggers** | Fortnox does not offer webhooks or event subscriptions | Use polling trigger with lastmodified parameter instead |

## Feature Dependencies

```
Authentication (Credential Type) -> All resource operations (everything requires valid auth)

Customer: Create -> Invoice: Create (invoices reference CustomerNumber)
Customer: Create -> Order: Create (orders reference CustomerNumber)
Article: Create -> Invoice: Create (invoice rows reference ArticleNumber)
Article: Create -> Order: Create (order rows reference ArticleNumber)

Order: Create -> Order: Create Invoice (must have order to convert)
Offer: Create -> Offer: Create Order (must have offer to convert)
Offer: Create -> Offer: Create Invoice (must have offer to convert)

Pagination handling -> All Get Many operations
Rate limit handling -> All operations (but critical for Get Many)
Error handling -> All operations

OAuth consent flow -> Per-client credential creation (agency model enabler)

Polling Trigger -> Get Many with lastmodified filter (trigger depends on list + filter)
```

## MVP Recommendation

Prioritize in this order:

1. **Fortnox credential type with client credentials flow** -- nothing works without auth
2. **Customer: Create, Get, Get Many, Update** -- foundational resource, referenced by invoices and orders
3. **Article: Create, Get, Get Many, Update, Delete** -- referenced by invoice/order rows
4. **Invoice: Create, Get, Get Many, Update, Bookkeep, Cancel, Credit, Send** -- the primary value driver. Most Fortnox automations center on invoices
5. **Order: Create, Get, Get Many, Update, Create Invoice, Cancel** -- second most common workflow: order -> invoice conversion
6. **Pagination and error handling** -- must work correctly for production use
7. **OAuth consent workflow for client onboarding** -- the agency-model differentiator

Defer:
- **Supplier/Supplier Invoice**: Add after MVP validates. High value but doubles the resource count
- **Offer**: Add after Order is solid -- similar structure, less commonly automated
- **Voucher**: Advanced accounting feature. Add when agencies request it
- **Polling Trigger Node**: High complexity. Add as phase 2 after core CRUD is stable. Users can use Schedule Trigger + Get Many with lastmodified as a workaround
- **Company Information**: Nice-to-have, add when convenient (very low effort)

## Fortnox API Resource Coverage Map

For reference, here is how the full Fortnox API maps to our prioritization:

| Priority | Resource | Operations | Phase |
|----------|----------|------------|-------|
| P0 (MVP) | Customers | Create, Get, Get Many, Update | 1 |
| P0 (MVP) | Articles | Create, Get, Get Many, Update, Delete | 1 |
| P0 (MVP) | Invoices | Create, Get, Get Many, Update, Bookkeep, Cancel, Credit, Send | 1 |
| P0 (MVP) | Orders | Create, Get, Get Many, Update, Create Invoice, Cancel | 1 |
| P1 | Suppliers | Create, Get, Get Many, Update | 2 |
| P1 | Supplier Invoices | Create, Get, Get Many, Bookkeep, Cancel | 2 |
| P1 | Offers | Create, Get, Get Many, Update, Create Order, Create Invoice, Send | 2 |
| P2 | Vouchers | Create, Get, Get Many | 3 |
| P2 | Company Information | Get | 3 |
| P2 | Accounts | Get, Get Many | 3 |
| P2 | Cost Centers | Get, Get Many | 3 |
| P2 | Projects | Get, Get Many | 3 |
| P3 | Polling Trigger | New/Updated Invoices, Customers, Orders | 3+ |
| -- | Warehouse, Payroll, Assets, Contracts | -- | Never (use HTTP Request) |

## n8n Accounting Node Comparison

For context, here is what comparable n8n accounting nodes support:

| Feature | QuickBooks (built-in) | Xero (built-in) | This Node (proposed MVP) |
|---------|----------------------|-----------------|--------------------------|
| Customers/Contacts | CRUD + Get Many | CRUD + Get Many | CRUD + Get Many |
| Invoices | CRUD + Send + Void + Get Many | CRUD + Get Many | CRUD + Bookkeep + Cancel + Credit + Send + Get Many |
| Articles/Items | CRUD + Get Many | -- | CRUD + Get Many |
| Orders | -- | -- | CRUD + Create Invoice + Get Many |
| Bills/Supplier Invoices | CRUD + Get Many | -- | Phase 2 |
| Estimates/Offers | CRUD + Send + Get Many | -- | Phase 2 |
| Vendors/Suppliers | Get + Get Many | -- | Phase 2 |
| Employees | CRUD + Get Many | -- | Never |
| Payments | CRUD + Send + Void + Get Many | -- | Could add |
| Vouchers/Journals | -- | -- | Phase 3 |
| **Total resources** | **10** | **2** | **4 (MVP), 7 (Phase 2)** |

The proposed MVP already matches or exceeds the Xero node and covers the most critical QuickBooks resources. By Phase 2, it would be one of the most comprehensive accounting nodes in the n8n ecosystem.

## Sources

- Fortnox API Documentation (official): https://api.fortnox.se/apidocs -- HIGH confidence (primary source for all resource/endpoint data)
- Fortnox Developer Portal: https://www.fortnox.se/developer -- HIGH confidence (rate limits, parameters, auth flow)
- Fortnox Rate Limits Guide: https://www.fortnox.se/developer/guides-and-good-to-know/rate-limits-for-fortnox-api -- HIGH confidence
- Fortnox Parameters Guide: https://www.fortnox.se/developer/guides-and-good-to-know/parameters -- HIGH confidence (pagination, filtering, sorting)
- n8n QuickBooks Node Docs: https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.quickbooks/ -- HIGH confidence (benchmark for accounting node features)
- n8n Xero Node Docs: https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.xero/ -- HIGH confidence (benchmark for minimal accounting node)
- Sveasoft Fortnox Integration Services: https://www.sveasoft.se/en/services/fortnox-integration -- MEDIUM confidence (common use cases)
- Maesn Fortnox API Integration Guide: https://www.maesn.com/blogs/fortnox-api-integration -- MEDIUM confidence (integration patterns)
- @rantalainen/fortnox-api-client npm: https://github.com/rantalainen/fortnox-api-client -- MEDIUM confidence (existing TypeScript client reference)
