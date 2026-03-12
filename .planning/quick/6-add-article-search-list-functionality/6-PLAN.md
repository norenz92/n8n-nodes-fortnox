---
phase: quick-6
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - nodes/Fortnox/ArticleDescription.ts
autonomous: true
requirements: [QUICK-6]

must_haves:
  truths:
    - "User can search articles by article number, description, EAN, manufacturer, manufacturer article number, and supplier number via getMany filters"
    - "Search filters use LIKE matching consistent with customer resource pattern"
    - "Existing getMany functionality (returnAll, limit, filter, lastmodified, sortby, sortorder) continues to work unchanged"
  artifacts:
    - path: "nodes/Fortnox/ArticleDescription.ts"
      provides: "Article search filter fields in getMany filters collection"
      contains: "articlenumber"
  key_links:
    - from: "nodes/Fortnox/ArticleDescription.ts"
      to: "nodes/Fortnox/Fortnox.node.ts"
      via: "articleFields export consumed by Fortnox.node.ts execute() getMany block"
      pattern: "qs\\[key\\] = filters\\[key\\]"
---

<objective>
Add search/filter query parameters to the Article getMany operation so users can search articles by article number, description, EAN, manufacturer, manufacturer article number, and supplier number.

Purpose: The Fortnox `/3/articles` API supports LIKE-match search parameters (articlenumber, description, ean, manufacturer, manufacturerartno, supplier) but the current node only exposes filter, lastmodified, sortby, and sortorder. Adding these enables users to find specific articles without fetching all and filtering client-side.

Output: Updated ArticleDescription.ts with additional filter options in the getMany filters collection. No changes needed to Fortnox.node.ts since the existing generic `qs[key] = filters[key]` loop already passes all filter values as query string parameters.
</objective>

<execution_context>
@/Users/adamnoren/.claude/get-shit-done/workflows/execute-plan.md
@/Users/adamnoren/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@nodes/Fortnox/ArticleDescription.ts
@nodes/Fortnox/Fortnox.node.ts (lines 341-365 — article getMany execute block)
@nodes/Fortnox/CustomerDescription.ts (lines 550-630 — customer search filters as reference pattern)

<interfaces>
<!-- The execute() block in Fortnox.node.ts already handles article getMany generically: -->
```typescript
// From Fortnox.node.ts lines 341-364
if (operation === 'getMany') {
    const returnAll = this.getNodeParameter('returnAll', i) as boolean;
    const filters = this.getNodeParameter('filters', i) as IDataObject;
    const qs: IDataObject = {};
    for (const key of Object.keys(filters)) {
        if (filters[key] !== '') {
            qs[key] = filters[key];
        }
    }
    // ... pagination logic
}
```
<!-- Filter option `name` values become query string parameter names automatically. -->
<!-- So adding { name: 'articlenumber', ... } to the filters collection will send ?articlenumber=value to the API. -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add article search filter parameters to getMany filters collection</name>
  <files>nodes/Fortnox/ArticleDescription.ts</files>
  <action>
In ArticleDescription.ts, add the following search filter options to the existing `Filters` collection (section E, the `options` array inside the filters field). Insert them in alphabetical order by displayName, interleaved with the existing options (filter, lastmodified, sortby, sortorder).

Add these new filter options before the existing 'Filter' option (since they come first alphabetically):

1. `{ displayName: 'Article Number', name: 'articlenumber', type: 'string', default: '', description: 'Search articles by article number (LIKE match)' }`
2. `{ displayName: 'Description', name: 'description', type: 'string', default: '', description: 'Search articles by description (LIKE match)' }`
3. `{ displayName: 'EAN', name: 'ean', type: 'string', default: '', description: 'Search articles by EAN barcode (LIKE match)' }`

After the existing 'Filter' option, before 'Last Modified':
4. (no new items here — Filter and Last Modified are already adjacent alphabetically)

After 'Last Modified', before 'Sort By':
5. `{ displayName: 'Manufacturer', name: 'manufacturer', type: 'string', default: '', description: 'Search articles by manufacturer name (LIKE match)' }`
6. `{ displayName: 'Manufacturer Article Number', name: 'manufacturerartno', type: 'string', default: '', description: 'Search articles by manufacturer article number (LIKE match)' }`

After 'Sort Order' (at the end):
7. `{ displayName: 'Supplier Number', name: 'supplier', type: 'string', default: '', description: 'Search articles by supplier number (LIKE match)' }`

Final alphabetical order of all filter options should be:
Article Number, Description, EAN, Filter, Last Modified, Manufacturer, Manufacturer Article Number, Sort By, Sort Order, Supplier Number

No changes to Fortnox.node.ts needed — the generic `qs[key] = filters[key]` loop already passes any filter values as query parameters to the Fortnox API.
  </action>
  <verify>
    <automated>cd /Users/adamnoren/n8n-nodes-fortnox && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>Article getMany filters collection contains articlenumber, description, ean, manufacturer, manufacturerartno, and supplier search fields. TypeScript compiles without errors. All filter names match Fortnox API query parameter names exactly.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes (no type errors)
- `npm run lint` passes (no lint violations)
- ArticleDescription.ts filters collection has 10 options total (6 new + 4 existing) in alphabetical order by displayName
</verification>

<success_criteria>
- Article getMany operation exposes search by: article number, description, EAN, manufacturer, manufacturer article number, supplier number
- All new filter `name` values match Fortnox API query parameter names exactly (lowercase)
- Existing filters (filter, lastmodified, sortby, sortorder) unchanged
- TypeScript compiles, lint passes
</success_criteria>

<output>
After completion, create `.planning/quick/6-add-article-search-list-functionality/6-SUMMARY.md`
</output>
