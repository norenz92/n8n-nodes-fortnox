# Roadmap: n8n Community Node for Fortnox API

## Overview

This roadmap delivers a complete n8n community node package for the Fortnox accounting API in four phases. Phase 1 establishes the project scaffold and solves the highest-risk problem: Fortnox's non-standard two-phase authentication. Phase 2 builds the Invoice resource end-to-end, proving the declarative node pattern and implementing cross-cutting concerns (pagination, error handling, rate limiting). Phase 3 replicates that proven pattern across Customer, Article, and Order resources. Phase 4 delivers the agency-model differentiator: a shareable OAuth consent flow that lets clients self-authorize without n8n access.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Project Scaffold + Credential System** - Working npm package skeleton with Fortnox client credentials auth and credential test endpoint
- [ ] **Phase 2: Invoice Resource** - Complete Invoice operations proving the declarative node pattern with pagination, error handling, and rate limiting
- [ ] **Phase 3: Customer, Article, and Order Resources** - Full CRUD and action operations for all remaining core resources using the proven pattern
- [ ] **Phase 4: OAuth Consent Onboarding** - Shareable authorization link for client self-service consent and automatic TenantId capture

## Phase Details

### Phase 1: Project Scaffold + Credential System
**Goal**: Agency can install the package in n8n, create a Fortnox credential with ClientId/ClientSecret/TenantId, and make an authenticated API call that returns real data
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-08, COMP-01, OPS-04, OPS-05
**Success Criteria** (what must be TRUE):
  1. Package installs in n8n and the Fortnox credential type appears in the credentials list
  2. User can create a credential with ClientId, ClientSecret, and TenantId fields, and each client gets their own credential
  3. Credential automatically obtains access tokens using client credentials grant and re-requests them before the 1-hour expiry
  4. Credential test button succeeds by calling the company information endpoint and returning the company name
  5. Package builds, lints, and is structured for npm publish with `n8n-community-node-package` keyword
**Plans**: 2 plans

Plans:
- [ ] 01-01-PLAN.md — Project scaffold and FortnoxApi credential type with preAuthentication token flow
- [ ] 01-02-PLAN.md — Fortnox node with credential test feedback, icon, and build verification

### Phase 2: Invoice Resource
**Goal**: User can automate the full invoice lifecycle -- create, read, list, update, bookkeep, cancel, credit, and send invoices -- with proper pagination, clear error messages, and rate limit resilience
**Depends on**: Phase 1
**Requirements**: INV-01, INV-02, INV-03, INV-04, INV-05, INV-06, INV-07, INV-08, OPS-01, OPS-02, OPS-03
**Success Criteria** (what must be TRUE):
  1. User can create an invoice with line items, customer reference, due date, and currency, and retrieve it back by DocumentNumber
  2. User can list invoices with filters (unpaid, unbooked, cancelled, date range) and "Return All" toggle that automatically paginates through all results
  3. User can advance an invoice through its lifecycle: update a draft, bookkeep it, send it via email, and cancel or credit it
  4. Fortnox errors are displayed in English with actionable context, not raw Swedish error messages
  5. Operations automatically retry with backoff when hitting the 25 req/5s rate limit
**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md — GenericFunctions.ts (API request with rate-limit retry, pagination, error translation) + InvoiceDescription.ts (8 operations, field definitions)
- [ ] 02-02-PLAN.md — Wire Invoice resource into Fortnox.node.ts execute() with all 8 operations and build verification

### Phase 3: Customer, Article, and Order Resources
**Goal**: User can manage customers, articles, and orders in Fortnox workflows, completing the four core resources needed for end-to-end accounting automation
**Depends on**: Phase 2
**Requirements**: CUST-01, CUST-02, CUST-03, CUST-04, ART-01, ART-02, ART-03, ART-04, ART-05, ORD-01, ORD-02, ORD-03, ORD-04, ORD-05, ORD-06
**Success Criteria** (what must be TRUE):
  1. User can create a customer with name, email, and address, then use that customer as a reference when creating invoices and orders
  2. User can create articles with pricing and use them as line items in invoices and orders
  3. User can create a sales order and convert it directly to an invoice
  4. All list operations support pagination with "Return All" toggle and relevant filters (lastmodified for customers, date range for orders)
  5. User can delete an article and cancel an order
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: OAuth Consent Onboarding
**Goal**: Clients can authorize their Fortnox account through a shareable link without ever needing n8n access, and the agency can immediately create credentials from the captured TenantId
**Depends on**: Phase 1
**Requirements**: AUTH-05, AUTH-06, AUTH-07
**Success Criteria** (what must be TRUE):
  1. Agency can generate a shareable URL that a client clicks to initiate Fortnox OAuth consent with account_type=service
  2. After client completes consent, the TenantId is automatically extracted from the OAuth response and surfaced to the agency
  3. Agency can create a working n8n credential from the captured TenantId without the client needing any technical knowledge or n8n access
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4
Note: Phase 4 depends on Phase 1 (not Phase 3). Phases 2-3 and Phase 4 could theoretically run in parallel, but sequential execution is recommended.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Project Scaffold + Credential System | 2/2 | Complete | 2026-02-27 |
| 2. Invoice Resource | 0/2 | Not started | - |
| 3. Customer, Article, and Order Resources | 0/TBD | Not started | - |
| 4. OAuth Consent Onboarding | 0/TBD | Not started | - |
