# Phase 1: Project Scaffold + Credential System - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Working npm package skeleton (`n8n-nodes-fortnox`) with Fortnox client credentials authentication. Users can install in n8n, create a credential with Client ID/Client Secret/Tenant ID, configure scopes, and verify the connection by testing against the company information endpoint. No resource operations — those are Phase 2+.

</domain>

<decisions>
## Implementation Decisions

### Credential form design
- Technical labels matching Fortnox API docs: "Client ID", "Client Secret", "Tenant ID"
- Each field has description/help text explaining where to find the value (e.g., "Found in Fortnox Developer Portal under your app settings")
- No external documentation links on the credential form — help text is self-contained
- Client Secret field is masked (password input type)
- Field order: Client ID, Client Secret, Tenant ID

### Credential test feedback
- Success message shows company name: "Connected to Acme AB"
- After successful auth, validate that requested scopes are actually granted for the tenant
- Missing scopes show as "success with warnings" — auth works but warns which scopes are missing (e.g., "Connected to Acme AB. Warning: missing scopes: invoice, article")
- Error message specificity is at Claude's discretion based on what Fortnox's API actually returns in error responses

### Scope selection strategy
- Scopes are configurable per credential (not hardcoded)
- Scope configuration is on the main credential form (not hidden in Advanced)
- Core scopes selected by default: invoice, customer, article, order, company info
- Additional/niche scopes (suppliers, offers, etc.) available but unchecked by default

### Node identity in n8n
- Display name: "Fortnox"
- Icon: Official Fortnox logo as SVG
- Category: "Finance & Accounting"

### Claude's Discretion
- Node description/subtitle text
- Error message specificity for credential test failures (based on Fortnox API error responses)
- Broader scope selection strategy (which non-core scopes to include as options)
- Exact help text wording for credential fields
- Token refresh timing and caching strategy

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-project-scaffold-credential-system*
*Context gathered: 2026-02-27*
