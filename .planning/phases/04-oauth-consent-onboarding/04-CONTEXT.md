# Phase 4: OAuth Consent Onboarding - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Shareable OAuth consent flow for client self-service Fortnox authorization. Clients click a link, authorize on Fortnox, and the agency gets the TenantId needed to create n8n credentials. No new Fortnox resources or operations — this is purely the onboarding mechanism.

</domain>

<decisions>
## Implementation Decisions

### Flow delivery mechanism
- Delivered as an **n8n workflow template** (JSON) bundled inside the npm package in a `/workflows` directory
- Two separate Webhook nodes: `/webhook/fortnox-consent/start` (initiates flow) and `/webhook/fortnox-consent/callback` (receives OAuth response)
- Fixed, human-readable webhook paths (not n8n-generated random IDs)
- Workflow references the existing **FortnoxApi credential** for ClientId and ClientSecret (TenantId field left blank/placeholder)
- Stateless: one shared /start URL works for any client — agency shares the same link
- After token exchange, workflow calls `/3/companyinformation` to **verify consent** and retrieve the company name
- Redirect URI auto-detected from request Host header (no manual configuration)

### TenantId capture & handoff
- Captured TenantId stored in an **n8n table** with fields: TenantId, Company Name, Scopes Granted, Timestamp
- **Upsert** behavior: if same TenantId already exists, update the row (prevents duplicates)
- **Slack notification** sent when a new client completes consent (includes company name and TenantId)
- Agency **manually copies** TenantId from the n8n table to create a new FortnoxApi credential in n8n

### Client-facing experience
- Client clicks /start link and gets **direct redirect** to Fortnox OAuth consent screen (no landing page)
- Success page: **styled HTML** showing "[Company Name] has been authorized. You can close this page."
- Error page: **styled HTML** with "Something went wrong. Please contact [Agency] for help." — no technical details
- Minimal CSS: centered layout, readable font, green checkmark for success, red X for error

### Shareable URL design
- OAuth flow uses **state parameter** with random token for CSRF protection (validated on callback)
- `account_type=service` included in authorization URL (required by Fortnox for service accounts)

### Workflow documentation
- **Sticky notes** throughout the workflow explaining each step
- Setup instructions in sticky notes: 1) Register redirect_uri in Fortnox Developer Portal, 2) Activate workflow, 3) Share /start URL with clients

### Claude's Discretion
- Scopes configuration: hardcoded vs configurable (pick what fits best)
- Whether to include `access_type=offline` in authorization URL (research Fortnox docs)
- State token storage mechanism (workflow static data, cache, etc.)
- Exact HTML/CSS for success and error pages
- Slack message format and content

</decisions>

<specifics>
## Specific Ideas

- The workflow should feel self-contained: agency imports it, reads the sticky notes, activates it, and they're ready to onboard clients
- TenantId is the key deliverable — everything else in the OAuth response is secondary
- The existing credential type (FortnoxApi.credentials.ts) stays as-is; this workflow feeds it TenantIds

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-oauth-consent-onboarding*
*Context gathered: 2026-02-27*
