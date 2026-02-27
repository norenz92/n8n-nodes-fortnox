# Requirements: n8n Community Node for Fortnox API

**Defined:** 2026-02-27
**Core Value:** Clients can self-authorize their Fortnox accounts through a simple link, and the agency can immediately use those credentials in n8n workflows to automate invoices, customers, articles, and orders.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [x] **AUTH-01**: Fortnox credential type stores ClientId, ClientSecret, and TenantId per client
- [x] **AUTH-02**: Credential uses client credentials grant to obtain access tokens from `apps.fortnox.se/oauth-v1/token`
- [x] **AUTH-03**: Access tokens are automatically refreshed before expiry (1-hour TTL, no refresh tokens)
- [x] **AUTH-04**: Each client has their own n8n credential with unique TenantId
- [ ] **AUTH-05**: OAuth authorization code flow with `account_type=service` captures client consent and TenantId
- [ ] **AUTH-06**: Shareable authorization endpoint that clients visit to initiate OAuth consent
- [ ] **AUTH-07**: TenantId is extracted from OAuth response and stored in n8n credential automatically
- [x] **AUTH-08**: All foreseeable Fortnox scopes requested upfront during consent (to avoid re-authorization)

### Invoices

- [ ] **INV-01**: User can create an invoice with line items, customer reference, due date, and currency
- [ ] **INV-02**: User can retrieve a single invoice by DocumentNumber
- [ ] **INV-03**: User can list invoices with pagination and filters (unpaid, unbooked, cancelled, date range)
- [ ] **INV-04**: User can update a draft (unbooked) invoice
- [ ] **INV-05**: User can bookkeep an invoice (finalize in accounting)
- [ ] **INV-06**: User can cancel an invoice
- [ ] **INV-07**: User can credit an invoice (creates linked credit note)
- [ ] **INV-08**: User can send an invoice via email

### Customers

- [ ] **CUST-01**: User can create a customer with name, email, and address fields
- [ ] **CUST-02**: User can retrieve a single customer by CustomerNumber
- [ ] **CUST-03**: User can list customers with pagination and lastmodified filter
- [ ] **CUST-04**: User can update a customer record

### Articles

- [ ] **ART-01**: User can create an article with ArticleNumber, description, and pricing
- [ ] **ART-02**: User can retrieve a single article by ArticleNumber
- [ ] **ART-03**: User can list articles with pagination
- [ ] **ART-04**: User can update an article
- [ ] **ART-05**: User can delete an article

### Orders

- [ ] **ORD-01**: User can create a sales order with line items and customer reference
- [ ] **ORD-02**: User can retrieve a single order by DocumentNumber
- [ ] **ORD-03**: User can list orders with pagination and filters (date range)
- [ ] **ORD-04**: User can update an order
- [ ] **ORD-05**: User can convert an order to an invoice
- [ ] **ORD-06**: User can cancel an order

### Company Information

- [ ] **COMP-01**: User can retrieve company information (useful for credential validation and multi-tenant routing)

### Operational

- [ ] **OPS-01**: All list operations support "Return All" toggle with automatic pagination
- [ ] **OPS-02**: Fortnox error messages are surfaced clearly with English context
- [ ] **OPS-03**: Rate limiting (25 req/5s per client) handled with retry and backoff on HTTP 429
- [x] **OPS-04**: Node follows n8n community node conventions (TypeScript, proper descriptions, additional fields pattern)
- [x] **OPS-05**: Package is publishable to npm as `n8n-nodes-fortnox`

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Suppliers

- **SUPP-01**: User can create, get, list, and update suppliers
- **SUPP-02**: User can create, get, and list supplier invoices with bookkeep/cancel actions

### Offers

- **OFFR-01**: User can create, get, list, and update offers
- **OFFR-02**: User can convert offer to order or invoice

### Vouchers

- **VCHR-01**: User can create, get, and list vouchers (journal entries)

### Trigger

- **TRIG-01**: Polling trigger for new/updated invoices, customers, orders (using lastmodified)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Warehouse management (stock, production orders) | Extremely complex, rarely used by target audience |
| Employee/Payroll operations | Sensitive, regulated (Swedish tax law), high liability |
| Asset management (fixed assets) | Niche, almost never automated |
| Contract management | Low demand for automation |
| Archive/Inbox file management | Complex binary handling, orthogonal to core accounting |
| Customer-facing portal/dashboard | Shareable auth link is sufficient for agency model |
| Real-time webhooks/triggers | Fortnox does not offer webhooks -- use polling |
| All 60+ Fortnox resources | Focus on 4-8 that cover 95% of use cases |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 4 | Pending |
| AUTH-06 | Phase 4 | Pending |
| AUTH-07 | Phase 4 | Pending |
| AUTH-08 | Phase 1 | Complete |
| INV-01 | Phase 2 | Pending |
| INV-02 | Phase 2 | Pending |
| INV-03 | Phase 2 | Pending |
| INV-04 | Phase 2 | Pending |
| INV-05 | Phase 2 | Pending |
| INV-06 | Phase 2 | Pending |
| INV-07 | Phase 2 | Pending |
| INV-08 | Phase 2 | Pending |
| CUST-01 | Phase 3 | Pending |
| CUST-02 | Phase 3 | Pending |
| CUST-03 | Phase 3 | Pending |
| CUST-04 | Phase 3 | Pending |
| ART-01 | Phase 3 | Pending |
| ART-02 | Phase 3 | Pending |
| ART-03 | Phase 3 | Pending |
| ART-04 | Phase 3 | Pending |
| ART-05 | Phase 3 | Pending |
| ORD-01 | Phase 3 | Pending |
| ORD-02 | Phase 3 | Pending |
| ORD-03 | Phase 3 | Pending |
| ORD-04 | Phase 3 | Pending |
| ORD-05 | Phase 3 | Pending |
| ORD-06 | Phase 3 | Pending |
| COMP-01 | Phase 1 | Pending |
| OPS-01 | Phase 2 | Pending |
| OPS-02 | Phase 2 | Pending |
| OPS-03 | Phase 2 | Pending |
| OPS-04 | Phase 1 | Complete |
| OPS-05 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 37 total
- Mapped to phases: 37
- Unmapped: 0

---
*Requirements defined: 2026-02-27*
*Last updated: 2026-02-27 after roadmap creation*
