---
phase: publish-to-npm
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [package.json]
autonomous: false
requirements: [PUBLISH-01]
must_haves:
  truths:
    - "Package n8n-nodes-fortnox is published on npm registry"
    - "Package installs correctly via npm install n8n-nodes-fortnox"
    - "Package contains compiled dist/ with credentials and node JS files"
  artifacts:
    - path: "package.json"
      provides: "Package metadata with repository, homepage, correct version"
  key_links:
    - from: "package.json"
      to: "npm registry"
      via: "n8n-node release (wraps release-it)"
      pattern: "npm publish"
---

<objective>
Publish n8n-nodes-fortnox to npm so it can be installed as an n8n community node.

Purpose: Make the Fortnox node discoverable and installable by n8n users worldwide via the community nodes UI.
Output: Published npm package at https://www.npmjs.com/package/n8n-nodes-fortnox
</objective>

<execution_context>
@/Users/adamnoren/.claude/get-shit-done/workflows/execute-plan.md
@/Users/adamnoren/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@package.json
</context>

<tasks>

<task type="auto">
  <name>Task 1: Prepare package.json metadata for npm publish</name>
  <files>package.json</files>
  <action>
Update package.json to add fields required/recommended for npm publishing:

1. Add `"repository"` field:
   ```json
   "repository": {
     "type": "git",
     "url": "https://github.com/norenz92/n8n-nodes-fortnox.git"
   }
   ```

2. Add `"homepage"` field:
   ```json
   "homepage": "https://github.com/norenz92/n8n-nodes-fortnox"
   ```

3. Add `"bugs"` field:
   ```json
   "bugs": {
     "url": "https://github.com/norenz92/n8n-nodes-fortnox/issues"
   }
   ```

Do NOT change: name, version, description, keywords, license, author, files, scripts, n8n, peerDependencies, or devDependencies.
  </action>
  <verify>node -e "const p = require('./package.json'); console.assert(p.repository, 'missing repository'); console.assert(p.homepage, 'missing homepage'); console.assert(p.bugs, 'missing bugs'); console.log('OK');"</verify>
  <done>package.json has repository, homepage, and bugs fields pointing to GitHub repo</done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 2: Authenticate with npm and publish</name>
  <what-built>Package metadata is ready for publishing. The project uses `n8n-node release` which wraps release-it to handle versioning and npm publish.</what-built>
  <how-to-verify>
The user is currently NOT logged in to npm (npm whoami returns 401).

Steps to publish:

1. Log in to npm:
   ```bash
   npm login
   ```
   Follow the browser-based auth flow.

2. Verify login:
   ```bash
   npm whoami
   ```
   Should show your npm username.

3. Rebuild to ensure dist/ is fresh:
   ```bash
   npm run build
   ```

4. Do a dry-run to see what will be published:
   ```bash
   npm pack --dry-run
   ```
   Verify only dist/ files are included (package.json `"files": ["dist"]` handles this).

5. Publish using the n8n release command:
   ```bash
   npm run release
   ```
   This runs `n8n-node release` which uses release-it under the hood. It will prompt for version bump (patch/minor/major), create a git tag, and publish to npm.

   Alternatively, for a first publish without release-it prompts:
   ```bash
   npm publish --access public
   ```
   Note: `prepublishOnly` will run `n8n-node prerelease` which blocks direct `npm publish` -- use `npm run release` instead.

6. Verify publication:
   ```bash
   npm view n8n-nodes-fortnox
   ```
  </how-to-verify>
  <resume-signal>Confirm the package is published by sharing `npm view n8n-nodes-fortnox` output, or describe any issues encountered.</resume-signal>
</task>

</tasks>

<verification>
- `npm view n8n-nodes-fortnox` returns package info from registry
- Package version matches what was published
- `npm pack --dry-run` shows only dist/ contents
</verification>

<success_criteria>
- n8n-nodes-fortnox is live on npmjs.com
- Package is installable via n8n community nodes UI or `npm install n8n-nodes-fortnox`
</success_criteria>

<output>
After completion, create `.planning/quick/1-publish-to-npm/1-SUMMARY.md`
</output>
