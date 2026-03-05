---
status: awaiting_human_verify
trigger: "After OAuth authorization, the success message shows 'Unknown Company has been authorized' instead of the actual company name."
created: 2026-03-05T00:00:00Z
updated: 2026-03-05T00:00:00Z
---

## Current Focus

hypothesis: The client_credentials token request for company info uses credential scopes that may not include 'companyinformation', causing a silent 403
test: Review scope logic on line 191-192 and verify that companyinformation is always included
expecting: When companyinformation scope is ensured, the API call succeeds and returns the real company name
next_action: Fix scope logic to always include companyinformation for this specific lookup

## Symptoms

expected: After completing OAuth authorization, the response should show the actual company name, e.g. "Acme Corp has been authorized"
actual: The response shows "Unknown Company has been authorized"
errors: No errors - the authorization works, but the company name is not resolved
reproduction: Complete the OAuth authorization flow via the AuthCallback node
started: May have always been like this, or broke during quick-3 refactor

## Eliminated

## Evidence

- timestamp: 2026-03-05T00:01:00Z
  checked: FortnoxAuthCallback.node.ts lines 188-216
  found: Company name lookup uses a client_credentials token. The scope for this token is built from credentials.scopes (user-configured). If user did not select 'companyinformation' scope, the token lacks permission to call /3/companyinformation. The catch block on line 214 silently swallows the resulting error, leaving companyName as 'Unknown Company'.
  implication: This is the root cause. The scope logic on line 192 only falls back to 'companyinformation' when credScopes is empty. If credScopes has values but not companyinformation, the lookup fails silently.

- timestamp: 2026-03-05T00:02:00Z
  checked: FortnoxAuthStart.node.ts - scope handling
  found: AuthStart sends whatever scopes the user selected. If user didn't select companyinformation there, the authorization code token also won't have it. But the callback requests a separate client_credentials token anyway, so AuthStart scopes are not the direct issue -- the callback's scope building logic is.
  implication: Confirms the fix should be in the callback node's client_credentials scope logic.

## Resolution

root_cause: The client_credentials token used to look up company info uses the user's configured credential scopes. If those scopes don't include 'companyinformation', the API call fails silently (caught by empty catch block) and companyName defaults to 'Unknown Company'.
fix: Always request 'companyinformation' scope for the company info lookup token, regardless of user-configured scopes. Use a dedicated minimal scope string instead of the credential scopes.
verification: Build passes, lint clean. Needs human verification via actual OAuth flow.
files_changed:
  - nodes/FortnoxAuthCallback/FortnoxAuthCallback.node.ts
