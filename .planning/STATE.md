---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-01T11:38:27Z"
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 8
  completed_plans: 8
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-27)

**Core value:** Clients self-authorize Fortnox accounts through a simple link; agency immediately uses those credentials in n8n workflows to automate invoices, customers, articles, and orders.
**Current focus:** Phase 4 - OAuth Consent Onboarding (Complete)

## Current Position

Phase: 4 of 4 (OAuth Consent Onboarding)
Plan: 1 of 1 in current phase (COMPLETE)
Status: Phase 4 Complete -- All 1 plan executed
Last activity: 2026-03-10 - Completed quick task 5: Fix invoice creation - support item list and zero-price filter

Progress: [##########] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: 3min
- Total execution time: 0.42 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 2 | 7min | 3.5min |
| 2 | 2 | 6min | 3min |
| 3 | 3 | 8min | 2.7min |
| 4 | 1 | 4min | 4min |

**Recent Trend:**
- Last 5 plans: 2min, 2min, 2min, 4min, 4min
- Trend: Stable

*Updated after each plan completion*
| Phase 02 P01 | 4min | 2 tasks | 2 files |
| Phase 02 P02 | 2min | 2 tasks | 1 files |
| Phase 03 P01 | 2min | 2 tasks | 2 files |
| Phase 03 P02 | 2min | 1 tasks | 1 files |
| Phase 03 P03 | 4min | 2 tasks | 4 files |
| Phase 04 P01 | 4min | 2 tasks | 2 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 4-phase structure derived from 37 v1 requirements; v2 resources (Suppliers, Offers, Vouchers) deferred
- [Roadmap]: OAuth consent onboarding (Phase 4) separated from node package phases; depends only on Phase 1
- [01-01]: Used preAuthentication pattern (proven in Metabase) for automatic token caching with expirable hidden field
- [01-01]: 18 Fortnox scopes as multiOptions with 5 core defaults (companyinformation, invoice, customer, article, order)
- [01-01]: URL-encoded string body with encodeURIComponent for scope parameter in token request
- [01-02]: httpRequest via type assertion on ICredentialTestFunctions helpers (types limited but runtime has httpRequest)
- [01-02]: Separate SVG icon copies in nodes/ and credentials/ directories for lint compliance
- [01-02]: usableAsTool: true on node for AI agent compatibility per lint requirement
- [01-02]: NodeConnectionTypes.Main (plural) -- singular form is type-only in current n8n-workflow
- [02-01]: FortnoxApiError interface for typed error handling instead of any -- satisfies no-explicit-any lint rule
- [02-01]: Title Case for all displayName values per n8n lint rules (not sentence case)
- [02-01]: Options type fields default to valid option values (not empty string) per n8n lint rule
- [02-01]: commonInvoiceFields shared array between Additional Fields and Update Fields to avoid duplication
- [03-01]: commonCustomerFields shared array with 56 writable fields; commonArticleFields with 31 writable fields
- [03-01]: Article Type options STOCK/SERVICE with STOCK as default; HouseworkType as string (not options) per research
- [03-02]: OrderRows includes OrderedQuantity (default 1) and DeliveredQuantity (default 0) -- order-specific row fields
- [03-02]: Order filters distinct from Invoice: cancelled, expired, invoicecreated, invoicenotcreated
- [03-02]: commonOrderFields shared array with 39 writable order fields alphabetized by displayName
- [03-03]: Resource blocks ordered alphabetically in selector and execute(): article, customer, invoice, order
- [03-03]: Delete operations return { success: true } since Fortnox DELETE returns empty body
- [03-03]: Order createInvoice extracts response.Invoice (not response.Order) per Fortnox API behavior
- [04-01]: Duplicate App Settings node for callback branch -- /start and /callback are separate n8n executions
- [04-01]: All 18 Fortnox scopes hardcoded per AUTH-08 to avoid re-authorization
- [04-01]: Data Table for CSRF state storage (not workflow static data) for reliability on n8n Cloud
- [04-01]: Omitted access_type=offline -- consent only captures TenantId, client_credentials handles API access
- [quick-3]: Two-node OAuth approach (AuthStart + AuthCallback) instead of single restartWebhook node
- [quick-3]: Credentials simplified to clientId + clientSecret; tenantId moved to per-node parameter
- [quick-3]: Manual token management via Map cache in GenericFunctions replaces preAuthentication pattern
- [quick-3]: CSRF state not cross-validated between nodes; code exchange provides security
- [quick-5]: JSON rows (invoiceRowsJson) take priority over fixedCollection when both provided
- [quick-5]: excludeZeroPriceRows in commonInvoiceFields shared between create and update operations

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 1: RESOLVED -- preAuthentication pattern replaced with manual token fetch in GenericFunctions (quick-3)
- Phase 4: RESOLVED -- JWT decoding uses Buffer.from(token.split('.')[1], 'base64').toString() in Code node, no external libraries needed.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | publish to npm | 2026-02-27 | 8c0dda3 | [1-publish-to-npm](./quick/1-publish-to-npm/) |
| 2 | Add getAccessToken and Company Information resources | 2026-03-01 | 60fa26a | [2-add-getaccesstoken-and-getcompanyinforma](./quick/2-add-getaccesstoken-and-getcompanyinforma/) |
| 3 | Replace auth workflow with dedicated OAuth nodes | 2026-03-01 | 573e04e | [3-replace-auth-workflow-with-dedicated-oau](./quick/3-replace-auth-workflow-with-dedicated-oau/) |
| 4 | Add Fakturatext (Remarks) field to invoice | 2026-03-05 | 4fef8cac | [4-add-fakturatext-remarks-field-to-invoice](./quick/4-add-fakturatext-remarks-field-to-invoice/) |
| 5 | Fix invoice creation - support item list and zero-price filter | 2026-03-10 | 5cc4b98d | [5-fix-invoice-creation-support-item-list-l](./quick/5-fix-invoice-creation-support-item-list-l/) |

## Session Continuity

Last session: 2026-03-10
Stopped at: Completed quick task 5 (Fix invoice creation - support item list and zero-price filter)
Resume file: None
