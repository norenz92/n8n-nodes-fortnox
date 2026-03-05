---
phase: quick-4
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - nodes/Fortnox/InvoiceDescription.ts
autonomous: true
requirements: [QUICK-4]
must_haves:
  truths:
    - "Remarks field available in invoice Create additional fields"
    - "Remarks field available in invoice Update fields"
    - "Remarks value sent to Fortnox API when set"
  artifacts:
    - path: "nodes/Fortnox/InvoiceDescription.ts"
      provides: "Remarks field in commonInvoiceFields"
      contains: "Remarks"
  key_links:
    - from: "nodes/Fortnox/InvoiceDescription.ts"
      to: "Fortnox API"
      via: "commonInvoiceFields shared between create and update"
      pattern: "name: 'Remarks'"
---

<objective>
Add the Fakturatext (Remarks) field to the invoice resource so users can set invoice text/remarks when creating or updating invoices.

Purpose: The Fortnox API supports a `Remarks` field on invoices (called "Fakturatext" in Swedish UI). This field is commonly used for invoice footer text or notes. It is currently missing from the node.
Output: Updated InvoiceDescription.ts with Remarks field in commonInvoiceFields.
</objective>

<execution_context>
@/Users/adamnoren/.claude/get-shit-done/workflows/execute-plan.md
@/Users/adamnoren/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@nodes/Fortnox/InvoiceDescription.ts
@nodes/Fortnox/OrderDescription.ts (reference for Remarks pattern)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add Remarks field to commonInvoiceFields</name>
  <files>nodes/Fortnox/InvoiceDescription.ts</files>
  <action>
Add a Remarks field entry to the `commonInvoiceFields` array in InvoiceDescription.ts. Insert it alphabetically between "Our Reference" (line ~172) and "Terms Of Payment" (line ~179):

```typescript
{
  displayName: 'Remarks',
  name: 'Remarks',
  type: 'string',
  typeOptions: {
    rows: 4,
  },
  default: '',
  description: 'Invoice text (Fakturatext) — appears on the printed invoice',
},
```

Use `typeOptions: { rows: 4 }` to render as a multiline textarea since remarks are typically multi-line text. This follows the same field name pattern as OrderDescription.ts (name: 'Remarks').

Since `commonInvoiceFields` is shared between Create (Additional Fields) and Update (Update Fields), both operations will automatically get the Remarks field.
  </action>
  <verify>
    <automated>cd /Users/adamnoren/n8n-nodes-fortnox && npx tsc --noEmit 2>&1 | head -20 && npm run lint 2>&1 | tail -10</automated>
  </verify>
  <done>Remarks field exists in commonInvoiceFields, alphabetically ordered, TypeScript compiles, lint passes</done>
</task>

</tasks>

<verification>
- `grep -n "Remarks" nodes/Fortnox/InvoiceDescription.ts` shows the new field
- `npx tsc --noEmit` compiles without errors
- `npm run lint` passes
</verification>

<success_criteria>
- Remarks field appears in invoice Create additional fields and Update fields
- Field uses multiline textarea (typeOptions rows)
- Description mentions Fakturatext for Swedish users
- No lint or type errors
</success_criteria>

<output>
After completion, create `.planning/quick/4-add-fakturatext-remarks-field-to-invoice/4-SUMMARY.md`
</output>
