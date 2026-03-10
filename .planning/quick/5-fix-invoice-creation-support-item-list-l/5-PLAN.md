---
phase: quick-5
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - nodes/Fortnox/InvoiceDescription.ts
  - nodes/Fortnox/Fortnox.node.ts
autonomous: true
requirements: [QUICK-5a, QUICK-5b]
must_haves:
  truths:
    - "Users can pass a JSON array of invoice row objects directly to Create Invoice"
    - "Users can still use the fixedCollection UI to manually add rows"
    - "Users can toggle a setting to filter out zero-price rows before sending to Fortnox"
  artifacts:
    - path: "nodes/Fortnox/InvoiceDescription.ts"
      provides: "Invoice Rows JSON parameter + Exclude Zero Price toggle"
      contains: "invoiceRowsJson"
    - path: "nodes/Fortnox/Fortnox.node.ts"
      provides: "Row normalization logic and zero-price filtering"
      contains: "excludeZeroPriceRows"
  key_links:
    - from: "nodes/Fortnox/Fortnox.node.ts"
      to: "nodes/Fortnox/InvoiceDescription.ts"
      via: "invoiceRowsJson parameter and excludeZeroPriceRows parameter"
      pattern: "getNodeParameter.*invoiceRowsJson|excludeZeroPriceRows"
---

<objective>
Fix two invoice creation corner cases: (1) support accepting a JSON array of invoice row items so users can dynamically build invoices from item lists in prior nodes, and (2) add a toggle to filter out zero-price rows.

Purpose: Users who loop through item lists in n8n cannot currently pass them as invoice rows without manual fixedCollection entry. This makes dynamic invoice creation from variable-length item lists impossible.
Output: Updated InvoiceDescription.ts and Fortnox.node.ts with JSON row input and zero-price filter.
</objective>

<execution_context>
@/Users/adamnoren/.claude/get-shit-done/workflows/execute-plan.md
@/Users/adamnoren/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@nodes/Fortnox/InvoiceDescription.ts
@nodes/Fortnox/Fortnox.node.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add Invoice Rows JSON parameter and Exclude Zero Price toggle to InvoiceDescription.ts</name>
  <files>nodes/Fortnox/InvoiceDescription.ts</files>
  <action>
In InvoiceDescription.ts, add TWO new fields to the `invoiceFields` array for the `create` operation:

1. **Invoice Rows (JSON)** parameter -- add AFTER the existing `invoiceRows` fixedCollection (after section C, before section D). This is a `string` type field that accepts a JSON expression:

```typescript
{
  displayName: 'Invoice Rows (JSON)',
  name: 'invoiceRowsJson',
  type: 'json',
  displayOptions: {
    show: {
      resource: ['invoice'],
      operation: ['create'],
    },
  },
  default: '',
  description: 'JSON array of invoice row objects. Each object can have: ArticleNumber, AccountNumber, DeliveredQuantity, Description, Price. Use this instead of the Invoice Rows field above when building rows dynamically from a list. Example: [{"ArticleNumber": "1001", "DeliveredQuantity": 2, "Price": 100}]',
}
```

2. **Exclude Zero Price Rows** boolean toggle -- add inside the `additionalFields` collection options (section G), inserted alphabetically between "Due Date" and "Freight":

```typescript
{
  displayName: 'Exclude Zero Price Rows',
  name: 'excludeZeroPriceRows',
  type: 'boolean',
  default: false,
  description: 'Whether to filter out invoice rows where Price is 0 before sending to Fortnox',
}
```

Add `excludeZeroPriceRows` into the `commonInvoiceFields` array (so it also appears in Update Fields). Insert it alphabetically -- it goes between "Due Date" and "Freight".
  </action>
  <verify>
    <automated>cd /Users/adamnoren/n8n-nodes-fortnox && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>InvoiceDescription.ts has invoiceRowsJson field and excludeZeroPriceRows toggle. TypeScript compiles without errors.</done>
</task>

<task type="auto">
  <name>Task 2: Update invoice create execute logic to handle JSON rows and zero-price filtering</name>
  <files>nodes/Fortnox/Fortnox.node.ts</files>
  <action>
In Fortnox.node.ts, modify the `resource === 'invoice' && operation === 'create'` block (lines ~148-173). Replace the current invoice row handling with logic that:

1. **Normalizes rows from EITHER source** -- read both `invoiceRows` (fixedCollection) and `invoiceRowsJson` (JSON string/array):

```typescript
const invoiceRows = this.getNodeParameter('invoiceRows', i) as IDataObject;
const invoiceRowsJson = this.getNodeParameter('invoiceRowsJson', i) as string | IDataObject[];
const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

// ... build body as before ...

// Normalize rows: JSON input takes priority over fixedCollection
let rows: IDataObject[] = [];
if (invoiceRowsJson) {
  if (typeof invoiceRowsJson === 'string' && invoiceRowsJson.trim() !== '') {
    rows = JSON.parse(invoiceRowsJson) as IDataObject[];
  } else if (Array.isArray(invoiceRowsJson)) {
    rows = invoiceRowsJson as IDataObject[];
  }
} else if (invoiceRows.row) {
  rows = invoiceRows.row as IDataObject[];
}
```

2. **Apply zero-price filter** if enabled:

```typescript
// Filter zero-price rows if enabled
const excludeZero = (additionalFields.excludeZeroPriceRows as boolean) || false;
if (excludeZero) {
  rows = rows.filter((row) => Number(row.Price) !== 0);
  delete additionalFields.excludeZeroPriceRows;
}
```

Note: Delete `excludeZeroPriceRows` from `additionalFields` BEFORE the loop that copies fields to the invoice body, since it is not a Fortnox API field.

3. **Set rows on body:**

```typescript
if (rows.length > 0) {
  invoiceBody.InvoiceRows = rows;
}
```

Also apply the same zero-price filter logic to the `update` operation block (lines ~209-237) where `updateFields.InvoiceRows` is handled -- after extracting `rows.row`, check for `excludeZeroPriceRows` in `updateFields` and filter if enabled, then delete the flag before the field copy loop.

IMPORTANT: Wrap the `JSON.parse` in a try/catch that throws a clear NodeOperationError: "Invalid JSON in Invoice Rows (JSON) field".
  </action>
  <verify>
    <automated>cd /Users/adamnoren/n8n-nodes-fortnox && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>
    - Passing a JSON array via invoiceRowsJson creates invoice rows correctly
    - Passing rows via fixedCollection UI still works (backward compatible)
    - excludeZeroPriceRows=true filters out rows with Price=0 in both create and update
    - Build succeeds with no errors
  </done>
</task>

</tasks>

<verification>
- `npm run build` completes without errors
- `npm run lint` passes (or has no new violations)
</verification>

<success_criteria>
- Users can pass a JSON array expression (e.g. `{{ $json.items }}`) to the Invoice Rows (JSON) field for dynamic row creation
- The existing fixedCollection Invoice Rows field still works for manual entry
- The Exclude Zero Price Rows toggle in Additional Fields filters out rows where Price is 0
- Both features work for create and update operations
- Build and lint pass
</success_criteria>

<output>
After completion, create `.planning/quick/5-fix-invoice-creation-support-item-list-l/5-SUMMARY.md`
</output>
