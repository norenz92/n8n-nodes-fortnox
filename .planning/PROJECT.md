# n8n Community Node for Fortnox API

## What This Is

An n8n community node package that integrates with the Fortnox accounting API, enabling an agency to connect multiple clients' Fortnox accounts and build automations for them. Clients authorize via a shareable link (OAuth consent flow), and the agency uses per-client credentials in n8n workflows without clients ever needing n8n access.

## Core Value

Clients can self-authorize their Fortnox accounts through a simple link, and the agency can immediately use those credentials in n8n workflows to automate invoices, customers, articles, and orders.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Fortnox credential type with ClientId, ClientSecret, and per-client TenantId
- [ ] OAuth authorization code flow (account_type=service) to capture client consent and TenantId
- [ ] Client credentials token flow using ClientId + ClientSecret + TenantId (no refresh tokens)
- [ ] Shareable authorization endpoint for clients to initiate OAuth consent
- [ ] Fortnox node with Invoice operations (create, read, update, list)
- [ ] Fortnox node with Customer operations (create, read, update, list)
- [ ] Fortnox node with Article/Product operations (create, read, update, list)
- [ ] Fortnox node with Order operations (create, read, update, list)
- [ ] Per-client credential storage — each client gets their own n8n credential
- [ ] Credentials selectable in Fortnox nodes after authorization

### Out of Scope

- Customer-facing portal or dashboard — clients only interact via auth link
- Multi-agency support — single agency with one Fortnox app
- Refresh token flow — using client credentials exclusively
- Mobile app or custom UI beyond the auth endpoint

## Context

- **Fortnox API**: Swedish accounting SaaS with REST API. Recently introduced client credentials for service accounts, eliminating refresh token management.
- **Auth flow**: Initial OAuth authorization code flow with `account_type=service` creates consent. After that, client credentials (ClientId + ClientSecret + TenantId) are used to get access tokens on demand (1-hour expiry, re-requestable).
- **Token endpoint**: `https://apps.fortnox.se/oauth-v1/token` with Basic auth header and TenantId header.
- **Agency setup**: One Fortnox developer app (shared ClientId/ClientSecret), per-client TenantId captured during consent flow.
- **Scale**: Under 10 clients currently. Design for simplicity, not massive scale.
- **n8n community nodes**: Published as npm packages, follow n8n's node development conventions (TypeScript, credential types, node descriptions).

## Constraints

- **Tech stack**: TypeScript, n8n community node SDK — must follow n8n node development patterns
- **Auth**: Must use Fortnox client credentials flow (no refresh tokens)
- **Distribution**: npm package installable in any n8n instance
- **Security**: Client credentials (ClientId/ClientSecret) must be stored securely in n8n's credential system

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Client credentials over refresh tokens | Simpler, no token expiry management, Fortnox recommends for service accounts | — Pending |
| Authorization via n8n mechanism (trigger/workflow) | Clients need a shareable link, no separate portal needed | — Pending |
| One credential per client | Each client has unique TenantId, keeps workflows isolated | — Pending |

---
*Last updated: 2026-02-27 after initialization*
