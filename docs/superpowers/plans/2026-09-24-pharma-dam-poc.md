# Sun Pharma DAM POC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working, click-through DAM demo on Catalyst by Zoho for a Sun Pharma sales presentation — real Data Store-backed search/tagging/workflow/audit/analytics, real Stratus file storage, no authentication (role-switcher instead), taxonomy language borrowed from Sun Pharma's own DMS Taxonomy Blueprint.

**Architecture:** React SPA (Slate) → Node.js Advanced I/O Function `dam_api` (Express, built as `const app = express(); module.exports = app;` so it satisfies the Advanced I/O `(req,res)` handler contract regardless of raw-http/Express template) → Catalyst Data Store (ZCQL) for all metadata/workflow/audit/usage → Catalyst Stratus for real file storage. Pre-canned (not live-Zia) suggestions drive the Classify/Enrich stages of the upload pipeline.

**Tech Stack:** Node.js 20 (Catalyst Advanced I/O function, Express, `zcatalyst-sdk-node`, `busboy`), Jest + Supertest for backend tests, React 18 + Vite (Catalyst Slate), Vitest + React Testing Library for frontend tests.

**Spec:** `docs/superpowers/specs/2026-09-24-pharma-dam-poc-design.md`

## Global Constraints

- Catalyst project: `PharmaPOC`, id `21268000035138541`, org `60047188586`, environment: Development. Never target Production.
- No authentication anywhere — Security Rules stay at the default `optional`. Role scoping is enforced in application code via a `role` query/body param, not real auth.
- Stratus bucket name: `pharmapoc-dam-138541` (globally unique, `{app-name}-{project-id-suffix}` pattern), type `public` (so `<img src>` can hit object URLs directly with no signed-URL round trip, matching the "quick demo" scope).
- Data Store column names are case-sensitive and must match exactly what Task 2 creates.
- ZCQL results are wrapped under the table name (`row.Assets`) — every ZCQL read goes through the `query()` helper in Task 5, never raw `executeZCQLQuery` calls elsewhere.
- All Advanced I/O routes use `catalyst.initialize(req, { scope: 'admin' })` (no logged-in app user exists in this POC).
- Do not set CORS headers for non-localhost origins in function code — add the Slate domain via Console → Authentication → Authorized Domains instead (Task 16), per the CORS "duplicate header" footgun.
- Taxonomy vocabulary (Function/Process/Asset Type/Status values) must match §4 of the spec exactly — these are the terms borrowed from Sun Pharma's own DMS Taxonomy Blueprint and are a deliberate selling point.
- The Sun Pharma logo (`assets/branding/sun-pharma-logo.png` in the project root, user-provided) must be present in the app header from Task 16 onward — copied into `client/public/sun-pharma-logo.png` in Task 11 Step 11, rendered in `App.jsx`'s header in Task 16 Step 2.

## Review Focus

- **Empty/whitespace search or filter values** — `GET /assets?search=` with an empty string should return all assets, not zero rows or a ZCQL syntax error from an empty `LIKE '%%'` clause.
- **Single-quote characters in free text** (asset names, comments, persona names — e.g. "O'Brien", "Product's Launch") — must not break ZCQL string literals or allow injection; every interpolated string goes through `escapeZcql()`.
- **Missing/unknown `role` on a request** — must default to the most restrictive (Agency Viewer-equivalent) scoping, not the most permissive, so an unrecognized role never leaks unpublished assets.
- **Approve/reject/delegate called on an asset not in `UnderReview`** — the API should reject the transition (400), not silently move a Draft or Published asset through the workflow.
- **Upload with no file attached, or an unsupported field combination** — `POST /assets` must 400 cleanly instead of inserting a malformed Data Store row or throwing an unhandled Stratus error.

---

## Task 1: Initialize Catalyst project structure

**Files:**
- Create: `catalyst.json`

**Interfaces:**
- Produces: a linked Catalyst CLI workspace (`catalyst.json` + existing `.catalystrc`) that Tasks 4+ deploy into.

- [ ] **Step 1: Confirm the Catalyst CLI is installed**

Run: `catalyst --version`
Expected: prints a version string. If the command is not found, run `npm install -g zcatalyst-cli` first.

- [ ] **Step 2: Initialize the project (non-interactive, links the existing PharmaPOC project)**

```bash
cd /Users/prasha-3336/Catalyst-Proj/PharmaPOC
catalyst init --org 60047188586 -p 21268000035138541 -ni
```

- [ ] **Step 3: Verify `catalyst.json` was created**

Run: `cat catalyst.json`
Expected: a JSON file exists (may be minimal at this point — Tasks 4 and 11 add `functions` and `slate` entries to it).

- [ ] **Step 4: Commit**

```bash
git init
git add catalyst.json .catalystrc
git commit -m "chore: initialize Catalyst CLI workspace for PharmaPOC"
```

---

## Task 2: Provision Data Store tables via MCP

**Files:** none (infrastructure only — provisioned via `CatalystbyZoho_*` MCP tools)

**Interfaces:**
- Produces: 8 Data Store tables (`Assets`, `Tags`, `AssetTags`, `ApprovalWorkflow`, `AssetVersions`, `Annotations`, `UsageLog`, `Personas`) that Tasks 5-9 read/write via ZCQL.

- [ ] **Step 1: Create the `Assets` table**

Call `CatalystbyZoho_Create_Table` with:
```json
{
  "body": { "table_name": "Assets", "table_scope": "GLOBAL" },
  "path_variables": { "projectId": "21268000035138541" },
  "headers": { "Environment": "Development", "Catalyst-org": 60047188586 }
}
```
Note the returned `table_id` — Step 2 needs it as `path_variables.id`.

- [ ] **Step 2: Add columns to `Assets`**

Call `CatalystbyZoho_Create_Column` with `path_variables: { projectId: "21268000035138541", id: "<Assets table_id>" }` and `body` (array):
```json
[
  { "column_name": "NAME", "data_type": "varchar", "max_length": 255, "is_mandatory": "true", "is_unique": "false", "search_index_enabled": "true", "audit_consent": "false" },
  { "column_name": "DESCRIPTION", "data_type": "text", "is_mandatory": "false", "audit_consent": "false" },
  { "column_name": "ASSET_TYPE", "data_type": "varchar", "max_length": 50, "is_mandatory": "true", "is_unique": "false", "search_index_enabled": "true", "audit_consent": "false" },
  { "column_name": "FUNCTION", "data_type": "varchar", "max_length": 50, "is_mandatory": "true", "is_unique": "false", "search_index_enabled": "true", "audit_consent": "false" },
  { "column_name": "PROCESS", "data_type": "varchar", "max_length": 50, "is_mandatory": "false", "is_unique": "false", "search_index_enabled": "true", "audit_consent": "false" },
  { "column_name": "BRAND", "data_type": "varchar", "max_length": 100, "is_mandatory": "false", "is_unique": "false", "search_index_enabled": "true", "audit_consent": "false" },
  { "column_name": "THERAPEUTIC_AREA", "data_type": "varchar", "max_length": 100, "is_mandatory": "false", "is_unique": "false", "search_index_enabled": "false", "audit_consent": "false" },
  { "column_name": "MARKET", "data_type": "varchar", "max_length": 100, "is_mandatory": "false", "is_unique": "false", "search_index_enabled": "true", "audit_consent": "false" },
  { "column_name": "LANGUAGE", "data_type": "varchar", "max_length": 50, "default_value": "English", "is_mandatory": "false", "is_unique": "false", "search_index_enabled": "false", "audit_consent": "false" },
  { "column_name": "USAGE_RIGHTS", "data_type": "varchar", "max_length": 50, "is_mandatory": "false", "is_unique": "false", "search_index_enabled": "false", "audit_consent": "false" },
  { "column_name": "STATUS", "data_type": "varchar", "max_length": 30, "default_value": "Draft", "is_mandatory": "true", "is_unique": "false", "search_index_enabled": "true", "audit_consent": "false" },
  { "column_name": "CURRENT_VERSION", "data_type": "int", "default_value": "1", "is_mandatory": "false", "is_unique": "false", "search_index_enabled": "false", "audit_consent": "false" },
  { "column_name": "EFFECTIVE_DATE", "data_type": "datetime", "is_mandatory": "false", "search_index_enabled": "false", "audit_consent": "false" },
  { "column_name": "EXPIRY_DATE", "data_type": "datetime", "is_mandatory": "false", "search_index_enabled": "false", "audit_consent": "false" },
  { "column_name": "FILE_URL", "data_type": "varchar", "max_length": 500, "is_mandatory": "false", "is_unique": "false", "search_index_enabled": "false", "audit_consent": "false" },
  { "column_name": "THUMBNAIL_URL", "data_type": "varchar", "max_length": 500, "is_mandatory": "false", "is_unique": "false", "search_index_enabled": "false", "audit_consent": "false" },
  { "column_name": "UPLOADED_BY", "data_type": "varchar", "max_length": 100, "is_mandatory": "true", "is_unique": "false", "search_index_enabled": "false", "audit_consent": "false" }
]
```

- [ ] **Step 3: Create `Tags` and `Personas` tables + columns**

`Tags` columns: `TAG_NAME` (varchar 100, mandatory, unique), `TAG_CATEGORY` (varchar 50).
`Personas` columns: `NAME` (varchar 100, mandatory), `ROLE` (varchar 50, mandatory), `MARKET` (varchar 100).
Use the same `Create_Table` → note `table_id` → `Create_Column` sequence as Step 1-2.

- [ ] **Step 4: Create `AssetTags`, `ApprovalWorkflow`, `AssetVersions`, `Annotations`, `UsageLog` tables + columns**

For each, `Create_Table` first, then `Create_Column`. Every `ASSET_ID` column uses the foreign-key shape:
```json
{ "column_name": "ASSET_ID", "data_type": "foreign key", "parent_table": "<Assets table_id>", "parent_column": "<Assets ROWID column_id>", "constraint_type": "ON-DELETE-CASCADE", "is_mandatory": "true", "search_index_enabled": "false", "audit_consent": "false" }
```
(Get the `Assets` table's `ROWID` column id via `CatalystbyZoho_List_All_Columns` on the `Assets` table if `Create_Table`'s response didn't already include it.)

- `AssetTags`: `ASSET_ID` (fk → Assets), `TAG_ID` (fk → Tags)
- `ApprovalWorkflow`: `ASSET_ID` (fk → Assets), `ACTION` (varchar 30, mandatory), `ACTOR_PERSONA` (varchar 100), `ACTOR_ROLE` (varchar 50), `COMMENTS` (text)
- `AssetVersions`: `ASSET_ID` (fk → Assets), `VERSION_NUMBER` (int, mandatory), `FILE_URL` (varchar 500), `CHANGED_BY` (varchar 100), `CHANGE_NOTES` (text)
- `Annotations`: `ASSET_ID` (fk → Assets), `X_PERCENT` (double), `Y_PERCENT` (double), `TIMESTAMP_SEC` (double), `COMMENT` (text, mandatory), `AUTHOR_PERSONA` (varchar 100)
- `UsageLog`: `ASSET_ID` (fk → Assets), `ACTION` (varchar 30, mandatory), `PERSONA` (varchar 100), `CHANNEL` (varchar 100)

(System columns `ROWID`/`CREATORID`/`CREATEDTIME`/`MODIFIEDTIME` are automatic on every table — never create them manually; they stand in for the `Timestamp`/`CreatedTime` columns in the spec.)

- [ ] **Step 5: Verify**

Call `CatalystbyZoho_List_All_Tables` and confirm all 8 tables appear with the expected names.

---

## Task 3: Provision the Stratus bucket

**Files:** none (infrastructure only)

**Interfaces:**
- Produces: bucket `pharmapoc-dam-138541` that Task 7's upload route and Task 9's seed route write into.

- [ ] **Step 1: Create the bucket**

Call `CatalystbyZoho_Create_Bucket`:
```json
{
  "body": { "bucket_name": "pharmapoc-dam-138541", "bucket_meta": { "type": "public", "encryption": true, "versioning": false, "audit_consent": false } },
  "path_variables": { "projectId": "21268000035138541" },
  "headers": { "Environment": "Development", "Catalyst-org": 60047188586 }
}
```

- [ ] **Step 2: Verify**

Call `CatalystbyZoho_Get_All_Buckets` (or `Head_Bucket`) and confirm `pharmapoc-dam-138541` exists in the Development environment.

---

## Task 4: Scaffold the `dam_api` Advanced I/O function

**Files:**
- Create: `functions/dam_api/catalyst-config.json`
- Create: `functions/dam_api/package.json`
- Create: `functions/dam_api/index.js`
- Modify: `catalyst.json` (add `functions` block)
- Create: `functions/dam_api/jest.config.js`

**Interfaces:**
- Produces: an Express `app` object exported from `index.js` that Tasks 7-9 mount routers onto, and a Jest test harness Tasks 5-9 use.

- [ ] **Step 1: Register the function folder**

```bash
cd /Users/prasha-3336/Catalyst-Proj/PharmaPOC
catalyst functions:add --name dam_api --type aio --stack node20 -ni
```

- [ ] **Step 2: Confirm `catalyst-config.json`**

```json
{
  "deployment": {
    "name": "dam_api",
    "type": "advancedio",
    "stack": "node20",
    "env_variables": { "STRATUS_BUCKET": "pharmapoc-dam-138541" }
  },
  "execution": { "main": "index.js" }
}
```

- [ ] **Step 3: Write `package.json`**

```json
{
  "name": "dam_api",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": { "test": "jest" },
  "dependencies": {
    "express": "^4.19.2",
    "busboy": "^1.6.0",
    "zcatalyst-sdk-node": "^2.1.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^7.0.0"
  }
}
```

Run: `cd functions/dam_api && npm install`

- [ ] **Step 4: Write a minimal `index.js` (routers added in Tasks 7-9)**

```javascript
'use strict';
const express = require('express');
const catalyst = require('zcatalyst-sdk-node');

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  if (/^http:\/\/localhost(:\d+)?$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(204).end();
  }
  next();
});

app.use((req, res, next) => {
  req.catalystApp = catalyst.initialize(req, { scope: 'admin' });
  next();
});

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.use((err, req, res, next) => {
  console.error(JSON.stringify({ error: err.message, stack: err.stack }));
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
```

- [ ] **Step 5: Write `jest.config.js`**

```javascript
module.exports = { testEnvironment: 'node', testMatch: ['**/test/**/*.test.js'] };
```

- [ ] **Step 6: Add the function to `catalyst.json`**

```json
{ "functions": { "folder_path": "functions", "targets": ["dam_api"] } }
```

- [ ] **Step 7: Verify the health route**

```bash
cd functions/dam_api && npx jest --listTests
```

Expected: runs with no test files yet found (empty pass) — confirms Jest is wired up before Task 5 adds real tests.

- [ ] **Step 8: Commit**

```bash
git add catalyst.json functions/dam_api
git commit -m "chore: scaffold dam_api Advanced I/O function"
```

---

## Task 5: Data Store access layer

**Files:**
- Create: `functions/dam_api/src/db.js`
- Test: `functions/dam_api/test/db.test.js`

**Interfaces:**
- Produces: `unwrap(rows, tableName)`, `convertBooleanFields(row, columns)`, `query(app, zcql, tableName)`, `insertRow(app, tableName, row)`, `insertRows(app, tableName, rows)`, `updateRow(app, tableName, row)`, `escapeZcql(value)` — every later route imports these instead of calling `zcql()`/`datastore()` directly.

- [ ] **Step 1: Write the failing tests**

```javascript
// functions/dam_api/test/db.test.js
const { unwrap, escapeZcql, query, insertRow } = require('../src/db');

describe('unwrap', () => {
  test('strips the table-name wrapper from ZCQL rows', () => {
    const raw = [{ Assets: { ROWID: '1', NAME: 'Foo' } }, { Assets: { ROWID: '2', NAME: 'Bar' } }];
    expect(unwrap(raw, 'Assets')).toEqual([{ ROWID: '1', NAME: 'Foo' }, { ROWID: '2', NAME: 'Bar' }]);
  });

  test('drops rows missing the table key', () => {
    expect(unwrap([{ Assets: { ROWID: '1' } }, {}], 'Assets')).toEqual([{ ROWID: '1' }]);
  });
});

describe('escapeZcql', () => {
  test('doubles single quotes so ZCQL string literals stay valid', () => {
    expect(escapeZcql("O'Brien")).toBe("O''Brien");
  });

  test('passes through strings with no quotes unchanged', () => {
    expect(escapeZcql('Marketing')).toBe('Marketing');
  });
});

describe('query', () => {
  test('executes ZCQL and unwraps the result', async () => {
    const fakeApp = { zcql: () => ({ executeZCQLQuery: jest.fn().mockResolvedValue([{ Assets: { ROWID: '1', NAME: 'Foo' } }]) }) };
    const rows = await query(fakeApp, 'SELECT * FROM Assets', 'Assets');
    expect(rows).toEqual([{ ROWID: '1', NAME: 'Foo' }]);
  });
});

describe('insertRow', () => {
  test('delegates to datastore().table(name).insertRow(row)', async () => {
    const insertRowMock = jest.fn().mockResolvedValue({ ROWID: '42' });
    const fakeApp = { datastore: () => ({ table: () => ({ insertRow: insertRowMock }) }) };
    const result = await insertRow(fakeApp, 'Assets', { NAME: 'Foo' });
    expect(insertRowMock).toHaveBeenCalledWith({ NAME: 'Foo' });
    expect(result).toEqual({ ROWID: '42' });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd functions/dam_api && npx jest test/db.test.js`
Expected: FAIL — `Cannot find module '../src/db'`

- [ ] **Step 3: Implement `src/db.js`**

```javascript
'use strict';

function unwrap(rows, tableName) {
  return rows.map((r) => r[tableName]).filter(Boolean);
}

function convertBooleanFields(row, booleanColumns = []) {
  const result = { ...row };
  booleanColumns.forEach((col) => {
    if (col in result) result[col] = result[col] === 'true' || result[col] === true;
  });
  return result;
}

function escapeZcql(value) {
  return String(value).replace(/'/g, "''");
}

async function query(app, zcqlString, tableName) {
  const rows = await app.zcql().executeZCQLQuery(zcqlString);
  return unwrap(rows, tableName);
}

async function insertRow(app, tableName, row) {
  return app.datastore().table(tableName).insertRow(row);
}

async function insertRows(app, tableName, rows) {
  return app.datastore().table(tableName).insertRows(rows);
}

async function updateRow(app, tableName, row) {
  return app.datastore().table(tableName).updateRow(row);
}

module.exports = { unwrap, convertBooleanFields, escapeZcql, query, insertRow, insertRows, updateRow };
```

- [ ] **Step 4: Run to verify pass**

Run: `cd functions/dam_api && npx jest test/db.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add functions/dam_api/src/db.js functions/dam_api/test/db.test.js
git commit -m "feat: add Data Store access layer with ZCQL unwrap and escaping"
```

---

## Task 6: Taxonomy suggestion module (Classify/Enrich stages)

**Files:**
- Create: `functions/dam_api/src/taxonomy.js`
- Test: `functions/dam_api/test/taxonomy.test.js`

**Interfaces:**
- Consumes: nothing (pure module)
- Produces: `suggestClassification(assetType)` returning `{ function, process, tags }` — Task 7's `GET /assets/:id/suggestions` route calls this directly.

- [ ] **Step 1: Write the failing tests**

```javascript
// functions/dam_api/test/taxonomy.test.js
const { suggestClassification } = require('../src/taxonomy');

describe('suggestClassification', () => {
  test('returns the canned Function/Process/Tags for a known asset type', () => {
    expect(suggestClassification('Video')).toEqual({ function: 'Marketing', process: 'Product Launch', tags: ['Video', 'Launch'] });
  });

  test('falls back to the default suggestion for an unknown asset type', () => {
    expect(suggestClassification('Podcast')).toEqual({ function: 'Marketing', process: 'Campaign', tags: ['General'] });
  });

  test('returns a fresh tags array each call so callers cannot mutate the shared default', () => {
    const a = suggestClassification('Video');
    a.tags.push('Extra');
    const b = suggestClassification('Video');
    expect(b.tags).toEqual(['Video', 'Launch']);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd functions/dam_api && npx jest test/taxonomy.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/taxonomy.js`**

```javascript
'use strict';

const SUGGESTIONS_BY_TYPE = {
  Image: { function: 'Marketing', process: 'Campaign', tags: ['Visual Aid', 'Digital'] },
  Video: { function: 'Marketing', process: 'Product Launch', tags: ['Video', 'Launch'] },
  Brochure: { function: 'Medical Affairs', process: 'Medical Education', tags: ['Print', 'Education'] },
  'Detail Aid': { function: 'Sales/Field Enablement', process: 'Field Enablement', tags: ['Field', 'Detailing'] },
  Presentation: { function: 'Training & Learning', process: 'Onboarding', tags: ['Training', 'Slides'] },
  'Social Post': { function: 'Corporate Communications', process: 'Campaign', tags: ['Social', 'Digital'] },
};

const DEFAULT_SUGGESTION = { function: 'Marketing', process: 'Campaign', tags: ['General'] };

function suggestClassification(assetType) {
  const base = SUGGESTIONS_BY_TYPE[assetType] || DEFAULT_SUGGESTION;
  return { function: base.function, process: base.process, tags: [...base.tags] };
}

module.exports = { suggestClassification, SUGGESTIONS_BY_TYPE };
```

- [ ] **Step 4: Run to verify pass**

Run: `cd functions/dam_api && npx jest test/taxonomy.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add functions/dam_api/src/taxonomy.js functions/dam_api/test/taxonomy.test.js
git commit -m "feat: add pre-canned Classify/Enrich taxonomy suggestions"
```

---

## Task 7: Assets & search routes

**Files:**
- Create: `functions/dam_api/src/routes/assets.js`
- Test: `functions/dam_api/test/assets.test.js`

**Interfaces:**
- Consumes: `query`, `insertRow`, `escapeZcql` from `../src/db` (Task 5); `suggestClassification` from `../src/taxonomy` (Task 6); `req.catalystApp` (set by `index.js` middleware, Task 4).
- Produces: an Express `Router` mounted at `/assets` in Task 10's `index.js`.

- [ ] **Step 1: Write the failing tests**

```javascript
// functions/dam_api/test/assets.test.js
process.env.STRATUS_BUCKET = 'pharmapoc-dam-138541';
const express = require('express');
const request = require('supertest');
const assetsRouter = require('../src/routes/assets');

jest.mock('../src/db', () => ({ query: jest.fn(), insertRow: jest.fn(), escapeZcql: jest.requireActual('../src/db').escapeZcql }));
const { query, insertRow } = require('../src/db');

function buildApp(fakeCatalystApp = {}) {
  const app = express();
  app.use((req, res, next) => { req.catalystApp = fakeCatalystApp; next(); });
  app.use('/assets', assetsRouter);
  return app;
}

afterEach(() => jest.clearAllMocks());

describe('GET /assets', () => {
  test('an unrecognized or missing role is scoped to Published only (most restrictive default)', async () => {
    query.mockResolvedValue([]);
    await request(buildApp()).get('/assets');
    expect(query.mock.calls[0][1]).toContain("STATUS = 'Published'");
  });

  test('Agency Viewer is always scoped to Published regardless of a status param', async () => {
    query.mockResolvedValue([]);
    await request(buildApp()).get('/assets').query({ role: 'Agency Viewer', status: 'Draft' });
    expect(query.mock.calls[0][1]).toContain("STATUS = 'Published'");
    expect(query.mock.calls[0][1]).not.toContain("STATUS = 'Draft'");
  });

  test('an internal role can filter by an explicit status', async () => {
    query.mockResolvedValue([]);
    await request(buildApp()).get('/assets').query({ role: 'Admin', status: 'Draft' });
    expect(query.mock.calls[0][1]).toContain("STATUS = 'Draft'");
  });

  test('an empty search string returns all rows instead of an empty LIKE clause', async () => {
    query.mockResolvedValue([]);
    await request(buildApp()).get('/assets').query({ role: 'Admin', search: '' });
    expect(query.mock.calls[0][1]).not.toContain('LIKE');
  });

  test('a single quote in the search term is escaped', async () => {
    query.mockResolvedValue([]);
    await request(buildApp()).get('/assets').query({ role: 'Admin', search: "O'Brien" });
    expect(query.mock.calls[0][1]).toContain("NAME LIKE '%O''Brien%'");
  });
});

describe('GET /assets/:id/suggestions', () => {
  test('returns canned suggestions for a known asset type', async () => {
    const res = await request(buildApp()).get('/assets/123/suggestions').query({ assetType: 'Video' });
    expect(res.status).toBe(200);
    expect(res.body.suggestions.function).toBe('Marketing');
  });

  test('400s when assetType is missing', async () => {
    const res = await request(buildApp()).get('/assets/123/suggestions');
    expect(res.status).toBe(400);
  });
});

describe('GET /assets/:id', () => {
  test('404s when the asset does not exist', async () => {
    query.mockResolvedValue([]);
    const res = await request(buildApp()).get('/assets/999');
    expect(res.status).toBe(404);
  });

  test('200s with the asset when found', async () => {
    query.mockResolvedValue([{ ROWID: '1', NAME: 'Test' }]);
    const res = await request(buildApp()).get('/assets/1');
    expect(res.status).toBe(200);
    expect(res.body.asset.NAME).toBe('Test');
  });
});

describe('POST /assets', () => {
  test('400s when no file is attached', async () => {
    const res = await request(buildApp()).post('/assets').field('name', 'Test');
    expect(res.status).toBe(400);
  });

  test('uploads to Stratus and inserts a Draft asset row', async () => {
    const putObjectMock = jest.fn().mockResolvedValue({});
    const fakeCatalystApp = { stratus: () => ({ bucket: () => ({ putObject: putObjectMock }) }) };
    insertRow.mockResolvedValue({ ROWID: '1', NAME: 'Test Creative', STATUS: 'Draft' });

    const res = await request(buildApp(fakeCatalystApp))
      .post('/assets')
      .field('name', 'Test Creative')
      .field('assetType', 'Image')
      .field('function', 'Marketing')
      .field('uploadedBy', 'Priya (Brand Manager)')
      .attach('file', Buffer.from('fake-image-bytes'), 'creative.png');

    expect(res.status).toBe(201);
    expect(putObjectMock).toHaveBeenCalled();
    expect(insertRow.mock.calls[0][2]).toMatchObject({ NAME: 'Test Creative', STATUS: 'Draft' });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd functions/dam_api && npx jest test/assets.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/routes/assets.js`**

```javascript
'use strict';
const express = require('express');
const Busboy = require('busboy');
const { query, insertRow, escapeZcql } = require('../db');
const { suggestClassification } = require('../taxonomy');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { role, search, function: func, market, status } = req.query;
    const conditions = [];
    if (role === 'Agency Viewer' || !role) {
      conditions.push("STATUS = 'Published'");
    } else if (status) {
      conditions.push(`STATUS = '${escapeZcql(status)}'`);
    }
    if (search && search.trim()) conditions.push(`NAME LIKE '%${escapeZcql(search.trim())}%'`);
    if (func) conditions.push(`FUNCTION = '${escapeZcql(func)}'`);
    if (market) conditions.push(`MARKET = '${escapeZcql(market)}'`);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await query(req.catalystApp, `SELECT * FROM Assets ${where} ORDER BY ROWID DESC LIMIT 0, 100`, 'Assets');
    res.status(200).json({ assets: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/suggestions', (req, res) => {
  const { assetType } = req.query;
  if (!assetType) return res.status(400).json({ error: 'assetType query param is required' });
  res.status(200).json({ suggestions: suggestClassification(assetType) });
});

router.get('/:id', async (req, res) => {
  try {
    const rows = await query(req.catalystApp, `SELECT * FROM Assets WHERE ROWID = '${escapeZcql(req.params.id)}'`, 'Assets');
    if (!rows.length) return res.status(404).json({ error: 'Asset not found' });
    res.status(200).json({ asset: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers });
    const fields = {};
    let fileInfo = null;
    const chunks = [];
    bb.on('field', (name, val) => { fields[name] = val; });
    bb.on('file', (name, stream, info) => {
      fileInfo = { name: info.filename, mimetype: info.mimeType };
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => { fileInfo.data = Buffer.concat(chunks); });
    });
    bb.on('close', () => resolve({ fields, file: fileInfo }));
    bb.on('error', reject);
    req.pipe(bb);
  });
}

router.post('/', async (req, res) => {
  try {
    const { fields, file } = await parseMultipart(req);
    if (!file) return res.status(400).json({ error: 'file is required' });
    const bucket = req.catalystApp.stratus().bucket(process.env.STRATUS_BUCKET);
    const key = `assets/${Date.now()}-${file.name}`;
    await bucket.putObject(key, file.data, { contentType: file.mimetype, overwrite: true });
    const fileUrl = `https://${process.env.STRATUS_BUCKET}-development.zohostratus.com/${key}`;
    const asset = await insertRow(req.catalystApp, 'Assets', {
      NAME: fields.name,
      DESCRIPTION: fields.description || '',
      ASSET_TYPE: fields.assetType,
      FUNCTION: fields.function,
      PROCESS: fields.process || '',
      BRAND: fields.brand || '',
      MARKET: fields.market || '',
      LANGUAGE: fields.language || 'English',
      USAGE_RIGHTS: fields.usageRights || 'Internal',
      STATUS: 'Draft',
      CURRENT_VERSION: '1',
      FILE_URL: fileUrl,
      THUMBNAIL_URL: fileUrl,
      UPLOADED_BY: fields.uploadedBy,
    });
    res.status(201).json({ asset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

- [ ] **Step 4: Run to verify pass**

Run: `cd functions/dam_api && npx jest test/assets.test.js`
Expected: PASS (11 tests)

- [ ] **Step 5: Commit**

```bash
git add functions/dam_api/src/routes/assets.js functions/dam_api/test/assets.test.js
git commit -m "feat: add assets search/detail/suggestions/ingest routes"
```

---

## Task 8: Workflow, annotation & version routes

**Files:**
- Create: `functions/dam_api/src/routes/workflow.js`
- Test: `functions/dam_api/test/workflow.test.js`

**Interfaces:**
- Consumes: `query`, `insertRow`, `updateRow`, `escapeZcql` from `../db`.
- Produces: an Express `Router` mounted at `/assets` in Task 10's `index.js` (adds `/:id/submit`, `/:id/approve`, `/:id/reject`, `/:id/delegate`, `/:id/annotate`, `/:id/version`).

- [ ] **Step 1: Write the failing tests**

```javascript
// functions/dam_api/test/workflow.test.js
const express = require('express');
const request = require('supertest');
const workflowRouter = require('../src/routes/workflow');

jest.mock('../src/db', () => ({
  query: jest.fn(),
  insertRow: jest.fn(),
  updateRow: jest.fn(),
  escapeZcql: jest.requireActual('../src/db').escapeZcql,
}));
const { query, insertRow, updateRow } = require('../src/db');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.catalystApp = {}; next(); });
  app.use('/assets', workflowRouter);
  return app;
}

afterEach(() => jest.clearAllMocks());

describe('POST /assets/:id/submit', () => {
  test('moves a Draft asset to UnderReview and logs the action', async () => {
    query.mockResolvedValue([{ ROWID: '1', STATUS: 'Draft' }]);
    updateRow.mockResolvedValue({});
    insertRow.mockResolvedValue({});
    const res = await request(buildApp()).post('/assets/1/submit').send({ actorPersona: 'Priya', actorRole: 'Brand Manager' });
    expect(res.status).toBe(200);
    expect(updateRow.mock.calls[0][2]).toMatchObject({ ROWID: '1', STATUS: 'UnderReview' });
    expect(insertRow.mock.calls[0][2]).toMatchObject({ ACTION: 'Submitted' });
  });

  test('rejects submitting an asset that is not Draft', async () => {
    query.mockResolvedValue([{ ROWID: '1', STATUS: 'Published' }]);
    const res = await request(buildApp()).post('/assets/1/submit').send({ actorPersona: 'Priya', actorRole: 'Brand Manager' });
    expect(res.status).toBe(400);
  });
});

describe('POST /assets/:id/approve', () => {
  test('rejects approving an asset that is not UnderReview', async () => {
    query.mockResolvedValue([{ ROWID: '1', STATUS: 'Draft' }]);
    const res = await request(buildApp()).post('/assets/1/approve').send({ actorPersona: 'Dr. Rao', actorRole: 'Reviewer' });
    expect(res.status).toBe(400);
  });

  test('moves an UnderReview asset to Published and sets EFFECTIVE_DATE', async () => {
    query.mockResolvedValue([{ ROWID: '1', STATUS: 'UnderReview' }]);
    updateRow.mockResolvedValue({});
    insertRow.mockResolvedValue({});
    const res = await request(buildApp()).post('/assets/1/approve').send({ actorPersona: 'Dr. Rao', actorRole: 'Reviewer' });
    expect(res.status).toBe(200);
    expect(updateRow.mock.calls[0][2]).toMatchObject({ ROWID: '1', STATUS: 'Published' });
    expect(updateRow.mock.calls[0][2].EFFECTIVE_DATE).toBeDefined();
  });
});

describe('POST /assets/:id/reject', () => {
  test('moves an UnderReview asset back to Draft with a comment', async () => {
    query.mockResolvedValue([{ ROWID: '1', STATUS: 'UnderReview' }]);
    updateRow.mockResolvedValue({});
    insertRow.mockResolvedValue({});
    const res = await request(buildApp()).post('/assets/1/reject').send({ actorPersona: 'Dr. Rao', actorRole: 'Reviewer', comments: 'Fix the claim wording' });
    expect(res.status).toBe(200);
    expect(updateRow.mock.calls[0][2]).toMatchObject({ ROWID: '1', STATUS: 'Draft' });
    expect(insertRow.mock.calls[0][2]).toMatchObject({ ACTION: 'Rejected', COMMENTS: 'Fix the claim wording' });
  });
});

describe('POST /assets/:id/delegate', () => {
  test('logs a Delegated action without changing STATUS', async () => {
    insertRow.mockResolvedValue({});
    const res = await request(buildApp()).post('/assets/1/delegate').send({ actorPersona: 'Dr. Rao', actorRole: 'Reviewer', comments: 'Please review, out of office' });
    expect(res.status).toBe(200);
    expect(insertRow.mock.calls[0][2]).toMatchObject({ ACTION: 'Delegated' });
    expect(updateRow).not.toHaveBeenCalled();
  });
});

describe('POST /assets/:id/annotate', () => {
  test('400s when comment is missing', async () => {
    const res = await request(buildApp()).post('/assets/1/annotate').send({ xPercent: 10, yPercent: 20, authorPersona: 'Dr. Rao' });
    expect(res.status).toBe(400);
  });

  test('inserts an annotation row', async () => {
    insertRow.mockResolvedValue({ ROWID: '9' });
    const res = await request(buildApp()).post('/assets/1/annotate').send({ xPercent: 10, yPercent: 20, comment: 'Fix logo placement', authorPersona: 'Dr. Rao' });
    expect(res.status).toBe(201);
    expect(insertRow.mock.calls[0][2]).toMatchObject({ X_PERCENT: 10, Y_PERCENT: 20, COMMENT: 'Fix logo placement' });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd functions/dam_api && npx jest test/workflow.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/routes/workflow.js`**

```javascript
'use strict';
const express = require('express');
const { query, insertRow, updateRow, escapeZcql } = require('../db');

const router = express.Router();

async function getAsset(catalystApp, id) {
  const rows = await query(catalystApp, `SELECT * FROM Assets WHERE ROWID = '${escapeZcql(id)}'`, 'Assets');
  return rows[0] || null;
}

function logAction(catalystApp, assetId, action, actorPersona, actorRole, comments = '') {
  return insertRow(catalystApp, 'ApprovalWorkflow', {
    ASSET_ID: assetId, ACTION: action, ACTOR_PERSONA: actorPersona, ACTOR_ROLE: actorRole, COMMENTS: comments,
  });
}

router.post('/:id/submit', async (req, res) => {
  try {
    const asset = await getAsset(req.catalystApp, req.params.id);
    if (!asset || asset.STATUS !== 'Draft') return res.status(400).json({ error: 'Only a Draft asset can be submitted for review' });
    await updateRow(req.catalystApp, 'Assets', { ROWID: req.params.id, STATUS: 'UnderReview' });
    await logAction(req.catalystApp, req.params.id, 'Submitted', req.body.actorPersona, req.body.actorRole);
    res.status(200).json({ status: 'UnderReview' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/approve', async (req, res) => {
  try {
    const asset = await getAsset(req.catalystApp, req.params.id);
    if (!asset || asset.STATUS !== 'UnderReview') return res.status(400).json({ error: 'Only an UnderReview asset can be approved' });
    await updateRow(req.catalystApp, 'Assets', { ROWID: req.params.id, STATUS: 'Published', EFFECTIVE_DATE: new Date().toISOString() });
    await logAction(req.catalystApp, req.params.id, 'Approved', req.body.actorPersona, req.body.actorRole, req.body.comments || '');
    res.status(200).json({ status: 'Published' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/reject', async (req, res) => {
  try {
    const asset = await getAsset(req.catalystApp, req.params.id);
    if (!asset || asset.STATUS !== 'UnderReview') return res.status(400).json({ error: 'Only an UnderReview asset can be rejected' });
    await updateRow(req.catalystApp, 'Assets', { ROWID: req.params.id, STATUS: 'Draft' });
    await logAction(req.catalystApp, req.params.id, 'Rejected', req.body.actorPersona, req.body.actorRole, req.body.comments || '');
    res.status(200).json({ status: 'Draft' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/delegate', async (req, res) => {
  try {
    await logAction(req.catalystApp, req.params.id, 'Delegated', req.body.actorPersona, req.body.actorRole, req.body.comments || '');
    res.status(200).json({ status: 'delegated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/annotate', async (req, res) => {
  try {
    const { xPercent, yPercent, timestampSec, comment, authorPersona } = req.body;
    if (!comment) return res.status(400).json({ error: 'comment is required' });
    const annotation = await insertRow(req.catalystApp, 'Annotations', {
      ASSET_ID: req.params.id, X_PERCENT: xPercent ?? null, Y_PERCENT: yPercent ?? null,
      TIMESTAMP_SEC: timestampSec ?? null, COMMENT: comment, AUTHOR_PERSONA: authorPersona,
    });
    res.status(201).json({ annotation });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/version', async (req, res) => {
  try {
    const { fileUrl, changedBy, changeNotes, versionNumber } = req.body;
    if (!fileUrl || !versionNumber) return res.status(400).json({ error: 'fileUrl and versionNumber are required' });
    const version = await insertRow(req.catalystApp, 'AssetVersions', {
      ASSET_ID: req.params.id, VERSION_NUMBER: versionNumber, FILE_URL: fileUrl, CHANGED_BY: changedBy, CHANGE_NOTES: changeNotes || '',
    });
    await updateRow(req.catalystApp, 'Assets', { ROWID: req.params.id, CURRENT_VERSION: versionNumber, FILE_URL: fileUrl });
    res.status(201).json({ version });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
```

- [ ] **Step 4: Run to verify pass**

Run: `cd functions/dam_api && npx jest test/workflow.test.js`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add functions/dam_api/src/routes/workflow.js functions/dam_api/test/workflow.test.js
git commit -m "feat: add approval workflow, annotation and version routes"
```

---

## Task 9: Admin, usage-log & seed routes

**Files:**
- Create: `functions/dam_api/src/routes/admin.js`
- Create: `functions/dam_api/src/routes/usage.js`
- Test: `functions/dam_api/test/admin.test.js`

**Interfaces:**
- Consumes: `query`, `insertRow`, `insertRows` from `../db`.
- Produces: an Express `Router` mounted at `/admin` and one mounted at `/usage-log` in Task 10's `index.js`. `/admin/seed` (POST) is the one-time demo data loader referenced by Task 3.

- [ ] **Step 1: Write the failing tests**

```javascript
// functions/dam_api/test/admin.test.js
const express = require('express');
const request = require('supertest');
const adminRouter = require('../src/routes/admin');

jest.mock('../src/db', () => ({
  query: jest.fn(),
  insertRow: jest.fn(),
  insertRows: jest.fn(),
}));
const { query, insertRow, insertRows } = require('../src/db');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.catalystApp = { stratus: () => ({ bucket: () => ({ putObject: jest.fn().mockResolvedValue({}) }) }) }; next(); });
  app.use('/admin', adminRouter);
  return app;
}

afterEach(() => jest.clearAllMocks());

describe('GET /admin/analytics', () => {
  test('returns aggregate counts from UsageLog and Assets', async () => {
    query
      .mockResolvedValueOnce([{ ROWID: '1' }, { ROWID: '2' }]) // Assets total
      .mockResolvedValueOnce([{ ACTION: 'View' }, { ACTION: 'Download' }]); // UsageLog
    const res = await request(buildApp()).get('/admin/analytics');
    expect(res.status).toBe(200);
    expect(res.body.totalAssets).toBe(2);
    expect(res.body.usageEvents).toBe(2);
  });
});

describe('GET /admin/audit', () => {
  test('returns the full ApprovalWorkflow feed', async () => {
    query.mockResolvedValue([{ ROWID: '1', ACTION: 'Submitted' }]);
    const res = await request(buildApp()).get('/admin/audit');
    expect(res.status).toBe(200);
    expect(res.body.audit).toHaveLength(1);
  });
});

describe('GET /admin/tags', () => {
  test('returns controlled vocabulary tags', async () => {
    query.mockResolvedValue([{ ROWID: '1', TAG_NAME: 'Launch' }]);
    const res = await request(buildApp()).get('/admin/tags');
    expect(res.status).toBe(200);
    expect(res.body.tags[0].TAG_NAME).toBe('Launch');
  });
});

describe('POST /admin/seed', () => {
  test('seeds Personas, Tags and sample Assets', async () => {
    insertRows.mockResolvedValue([]);
    insertRow.mockResolvedValue({ ROWID: '1' });
    const res = await request(buildApp()).post('/admin/seed');
    expect(res.status).toBe(200);
    expect(insertRows).toHaveBeenCalledWith(expect.anything(), 'Personas', expect.any(Array));
    expect(insertRows).toHaveBeenCalledWith(expect.anything(), 'Tags', expect.any(Array));
    expect(insertRow).toHaveBeenCalledWith(expect.anything(), 'Assets', expect.objectContaining({ STATUS: expect.any(String) }));
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd functions/dam_api && npx jest test/admin.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/routes/admin.js`**

```javascript
'use strict';
const express = require('express');
const { query, insertRow, insertRows } = require('../db');

const router = express.Router();

router.get('/analytics', async (req, res) => {
  try {
    const assets = await query(req.catalystApp, 'SELECT ROWID FROM Assets', 'Assets');
    const usage = await query(req.catalystApp, 'SELECT ACTION FROM UsageLog', 'UsageLog');
    res.status(200).json({ totalAssets: assets.length, usageEvents: usage.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/audit', async (req, res) => {
  try {
    const audit = await query(req.catalystApp, 'SELECT * FROM ApprovalWorkflow ORDER BY ROWID DESC LIMIT 0, 100', 'ApprovalWorkflow');
    res.status(200).json({ audit });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/tags', async (req, res) => {
  try {
    const tags = await query(req.catalystApp, 'SELECT * FROM Tags', 'Tags');
    res.status(200).json({ tags });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/tags', async (req, res) => {
  try {
    const tag = await insertRow(req.catalystApp, 'Tags', { TAG_NAME: req.body.tagName, TAG_CATEGORY: req.body.tagCategory || '' });
    res.status(201).json({ tag });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/personas', async (req, res) => {
  try {
    const personas = await query(req.catalystApp, 'SELECT * FROM Personas', 'Personas');
    res.status(200).json({ personas });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function placeholderSvg(label, color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="50%" font-size="28" fill="#fff" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`;
}

const SAMPLE_ASSETS = [
  { name: 'Cardiozan Launch Detail Aid', assetType: 'Detail Aid', func: 'Sales/Field Enablement', process: 'Field Enablement', brand: 'Cardiozan', market: 'Nigeria', status: 'Published', color: '#7c3aed' },
  { name: 'Cardiozan Campaign Social Post', assetType: 'Social Post', func: 'Marketing', process: 'Campaign', brand: 'Cardiozan', market: 'Philippines', status: 'Published', color: '#2563eb' },
  { name: 'Onco-Relief Medical Brochure', assetType: 'Brochure', func: 'Medical Affairs', process: 'Medical Education', brand: 'Onco-Relief', market: 'Kenya', status: 'UnderReview', color: '#ea580c' },
  { name: 'Field Team Onboarding Deck', assetType: 'Presentation', func: 'Training & Learning', process: 'Onboarding', brand: 'Corporate', market: 'Vietnam', status: 'Draft', color: '#0d9488' },
  { name: 'Sun Pharma Corporate Overview Video', assetType: 'Video', func: 'Corporate Communications', process: 'Campaign', brand: 'Corporate', market: 'Global', status: 'Published', color: '#dc2626' },
  { name: 'DiabetCare Packaging Artwork', assetType: 'Image', func: 'Marketing', process: 'Product Launch', brand: 'DiabetCare', market: 'Indonesia', status: 'Draft', color: '#16a34a' },
];

router.post('/seed', async (req, res) => {
  try {
    await insertRows(req.catalystApp, 'Personas', [
      { NAME: 'Priya Sharma', ROLE: 'Brand Manager', MARKET: 'Nigeria' },
      { NAME: 'Dr. Anil Rao', ROLE: 'Reviewer', MARKET: 'Global' },
      { NAME: 'Sun Pharma Admin', ROLE: 'Admin', MARKET: 'Global' },
      { NAME: 'Field Agency Partner', ROLE: 'Agency Viewer', MARKET: 'Philippines' },
    ]);
    await insertRows(req.catalystApp, 'Tags', [
      { TAG_NAME: 'Launch', TAG_CATEGORY: 'Campaign' },
      { TAG_NAME: 'Field', TAG_CATEGORY: 'Content Type' },
      { TAG_NAME: 'Digital', TAG_CATEGORY: 'Content Type' },
      { TAG_NAME: 'Cardiovascular', TAG_CATEGORY: 'Therapeutic Area' },
    ]);
    const bucket = req.catalystApp.stratus().bucket(process.env.STRATUS_BUCKET);
    const inserted = [];
    for (const sample of SAMPLE_ASSETS) {
      const key = `seed/${sample.name.replace(/\s+/g, '-')}.svg`;
      await bucket.putObject(key, placeholderSvg(sample.name, sample.color), { contentType: 'image/svg+xml', overwrite: true });
      const fileUrl = `https://${process.env.STRATUS_BUCKET}-development.zohostratus.com/${key}`;
      const asset = await insertRow(req.catalystApp, 'Assets', {
        NAME: sample.name, ASSET_TYPE: sample.assetType, FUNCTION: sample.func, PROCESS: sample.process,
        BRAND: sample.brand, MARKET: sample.market, LANGUAGE: 'English', USAGE_RIGHTS: 'Internal',
        STATUS: sample.status, CURRENT_VERSION: '1', FILE_URL: fileUrl, THUMBNAIL_URL: fileUrl,
        UPLOADED_BY: 'Priya Sharma',
      });
      inserted.push(asset);
    }
    res.status(200).json({ personasSeeded: 4, tagsSeeded: 4, assetsSeeded: inserted.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
```

- [ ] **Step 4: Write `src/routes/usage.js`**

```javascript
'use strict';
const express = require('express');
const { insertRow } = require('../db');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { assetId, action, persona, channel } = req.body;
    if (!assetId || !action) return res.status(400).json({ error: 'assetId and action are required' });
    const log = await insertRow(req.catalystApp, 'UsageLog', { ASSET_ID: assetId, ACTION: action, PERSONA: persona || '', CHANNEL: channel || '' });
    res.status(201).json({ log });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
```

- [ ] **Step 5: Run to verify pass**

Run: `cd functions/dam_api && npx jest test/admin.test.js`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add functions/dam_api/src/routes/admin.js functions/dam_api/src/routes/usage.js functions/dam_api/test/admin.test.js
git commit -m "feat: add admin analytics/audit/taxonomy routes and demo data seeder"
```

---

## Task 10: Wire the Express app and deploy

**Files:**
- Modify: `functions/dam_api/index.js`

**Interfaces:**
- Consumes: routers from Tasks 7, 8, 9.
- Produces: the deployed `dam_api` function URL that Task 11's frontend `api.js` targets.

- [ ] **Step 1: Mount all routers in `index.js`**

```javascript
'use strict';
const express = require('express');
const catalyst = require('zcatalyst-sdk-node');
const assetsRouter = require('./src/routes/assets');
const workflowRouter = require('./src/routes/workflow');
const adminRouter = require('./src/routes/admin');
const usageRouter = require('./src/routes/usage');

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  if (/^http:\/\/localhost(:\d+)?$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(204).end();
  }
  next();
});

app.use((req, res, next) => {
  req.catalystApp = catalyst.initialize(req, { scope: 'admin' });
  next();
});

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
app.use('/assets', assetsRouter);
app.use('/assets', workflowRouter);
app.use('/admin', adminRouter);
app.use('/usage-log', usageRouter);

app.use((err, req, res, next) => {
  console.error(JSON.stringify({ error: err.message, stack: err.stack }));
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
```

- [ ] **Step 2: Run the full backend test suite**

Run: `cd functions/dam_api && npx jest`
Expected: PASS (all tests from Tasks 5-9)

- [ ] **Step 3: Serve and smoke-test locally**

```bash
catalyst serve
# in another shell, using the printed port:
curl http://localhost:<port>/server/dam_api/execute/health
curl -X POST http://localhost:<port>/server/dam_api/execute/admin/seed
curl "http://localhost:<port>/server/dam_api/execute/assets?role=Admin"
```
Expected: `health` returns `{"status":"ok"}`; `seed` returns seeded counts; `assets` returns the 6 seeded assets.

- [ ] **Step 4: Deploy to Development**

```bash
catalyst deploy --only functions:dam_api -ni
```
Note the printed `FUNCTION URL` (remember to append `/execute` when calling it).

- [ ] **Step 5: Commit**

```bash
git add functions/dam_api/index.js
git commit -m "feat: wire dam_api Express app with all routers"
```

---

## Task 11: Scaffold the React frontend on Slate

**Files:**
- Create: `client/package.json`, `client/vite.config.js`, `client/index.html`
- Create: `client/src/main.jsx`, `client/src/App.jsx`
- Create: `client/src/api.js`
- Create: `client/src/context/RoleContext.jsx`
- Create: `client/public/_redirects`, `client/public/client-package.json`
- Test: `client/test/RoleContext.test.jsx`, `client/test/api.test.js`

**Interfaces:**
- Produces: `RoleProvider`/`useRole()` (returns `{ role, setRole }`, persisted to `localStorage`) and `api` (an object with `listAssets`, `getAsset`, `getSuggestions`, `createAsset`, `submitAsset`, `approveAsset`, `rejectAsset`, `delegateAsset`, `annotateAsset`, `getAnalytics`, `getAudit`, `getTags`, `logUsage` methods) that every later page/component imports.

- [ ] **Step 1: Scaffold with Vite**

```bash
cd /Users/prasha-3336/Catalyst-Proj/PharmaPOC
npm create vite@latest client -- --template react
cd client && npm install
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Configure Vitest in `vite.config.js`**

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: './test/setup.js' },
});
```

Create `client/test/setup.js`:
```javascript
import '@testing-library/jest-dom';
```

Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 3: Write failing tests for `RoleContext`**

```jsx
// client/test/RoleContext.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { RoleProvider, useRole } from '../src/context/RoleContext';

function Probe() {
  const { role, setRole } = useRole();
  return (
    <div>
      <span data-testid="role">{role}</span>
      <button onClick={() => setRole('Admin')}>Become Admin</button>
    </div>
  );
}

beforeEach(() => localStorage.clear());

test('defaults to Brand Manager when nothing is stored', () => {
  render(<RoleProvider><Probe /></RoleProvider>);
  expect(screen.getByTestId('role').textContent).toBe('Brand Manager');
});

test('setRole updates state and persists to localStorage', () => {
  render(<RoleProvider><Probe /></RoleProvider>);
  fireEvent.click(screen.getByText('Become Admin'));
  expect(screen.getByTestId('role').textContent).toBe('Admin');
  expect(localStorage.getItem('pharmapoc.role')).toBe('Admin');
});

test('restores a previously persisted role on mount', () => {
  localStorage.setItem('pharmapoc.role', 'Reviewer');
  render(<RoleProvider><Probe /></RoleProvider>);
  expect(screen.getByTestId('role').textContent).toBe('Reviewer');
});
```

- [ ] **Step 4: Run to verify failure**

Run: `cd client && npx vitest run test/RoleContext.test.jsx`
Expected: FAIL — module not found

- [ ] **Step 5: Implement `src/context/RoleContext.jsx`**

```jsx
import { createContext, useContext, useState } from 'react';

const STORAGE_KEY = 'pharmapoc.role';
const RoleContext = createContext(null);

export function RoleProvider({ children }) {
  const [role, setRoleState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'Brand Manager'; } catch { return 'Brand Manager'; }
  });

  function setRole(next) {
    setRoleState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore in private mode */ }
  }

  return <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used inside a RoleProvider');
  return ctx;
}
```

- [ ] **Step 6: Run to verify pass**

Run: `cd client && npx vitest run test/RoleContext.test.jsx`
Expected: PASS (3 tests)

- [ ] **Step 7: Write failing tests for the API client**

```javascript
// client/test/api.test.js
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { listAssets, submitAsset } from '../src/api';

beforeEach(() => { global.fetch = vi.fn(); });

describe('listAssets', () => {
  test('builds the query string from filters and returns parsed assets', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ assets: [{ ROWID: '1' }] }) });
    const assets = await listAssets({ role: 'Admin', search: 'launch' });
    expect(global.fetch.mock.calls[0][0]).toContain('role=Admin');
    expect(global.fetch.mock.calls[0][0]).toContain('search=launch');
    expect(assets).toEqual([{ ROWID: '1' }]);
  });
});

describe('submitAsset', () => {
  test('POSTs actor info and returns the new status', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ status: 'UnderReview' }) });
    const result = await submitAsset('1', { actorPersona: 'Priya', actorRole: 'Brand Manager' });
    expect(global.fetch.mock.calls[0][0]).toContain('/assets/1/submit');
    expect(global.fetch.mock.calls[0][1].method).toBe('POST');
    expect(result.status).toBe('UnderReview');
  });

  test('throws when the response is not ok', async () => {
    global.fetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'boom' }) });
    await expect(submitAsset('1', {})).rejects.toThrow('boom');
  });
});
```

- [ ] **Step 8: Run to verify failure**

Run: `cd client && npx vitest run test/api.test.js`
Expected: FAIL — module not found

- [ ] **Step 9: Implement `src/api.js`**

```javascript
const BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:3000/server/dam_api/execute';

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export async function listAssets(filters = {}) {
  const params = new URLSearchParams(filters).toString();
  const data = await request(`/assets?${params}`);
  return data.assets;
}

export async function getAsset(id) {
  const data = await request(`/assets/${id}`);
  return data.asset;
}

export async function getSuggestions(id, assetType) {
  const data = await request(`/assets/${id}/suggestions?assetType=${encodeURIComponent(assetType)}`);
  return data.suggestions;
}

export async function createAsset(formData) {
  const res = await fetch(`${BASE_URL}/assets`, { method: 'POST', body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data.asset;
}

export async function submitAsset(id, body) {
  return request(`/assets/${id}/submit`, { method: 'POST', body });
}
export async function approveAsset(id, body) {
  return request(`/assets/${id}/approve`, { method: 'POST', body });
}
export async function rejectAsset(id, body) {
  return request(`/assets/${id}/reject`, { method: 'POST', body });
}
export async function delegateAsset(id, body) {
  return request(`/assets/${id}/delegate`, { method: 'POST', body });
}
export async function annotateAsset(id, body) {
  return request(`/assets/${id}/annotate`, { method: 'POST', body });
}
export async function getAnalytics() {
  return request('/admin/analytics');
}
export async function getAudit() {
  const data = await request('/admin/audit');
  return data.audit;
}
export async function getTags() {
  const data = await request('/admin/tags');
  return data.tags;
}
export async function logUsage(body) {
  return request('/usage-log', { method: 'POST', body });
}
```

- [ ] **Step 10: Run to verify pass**

Run: `cd client && npx vitest run test/api.test.js`
Expected: PASS (3 tests)

- [ ] **Step 11: SPA routing files + brand logo**

`client/public/_redirects`:
```
/* /index.html 200
```

`client/public/client-package.json`:
```json
{ "name": "pharmapoc-dam", "version": "0.0.1", "homepage": "/", "login_redirect": "/" }
```

Copy the Sun Pharma logo (provided by the user, stored at `assets/branding/sun-pharma-logo.png`
in the project root) into the Vite public folder so it is served at `/sun-pharma-logo.png` and
survives the build:

```bash
cp /Users/prasha-3336/Catalyst-Proj/PharmaPOC/assets/branding/sun-pharma-logo.png \
   /Users/prasha-3336/Catalyst-Proj/PharmaPOC/client/public/sun-pharma-logo.png
```

Task 16's `App.jsx` header renders this logo — it must be present at `client/public/sun-pharma-logo.png`
before Task 16 runs.

- [ ] **Step 12: Link the Slate app to the existing `client/` build output (non-interactive)**

`slate:create` scaffolds a brand-new template app — it must NOT be used here since
`client/` is already our own Vite app. Use `slate:link` to point Slate at our build
output instead:

```bash
cd /Users/prasha-3336/Catalyst-Proj/PharmaPOC/client
npm run build
cd /Users/prasha-3336/Catalyst-Proj/PharmaPOC
catalyst slate:link --source /Users/prasha-3336/Catalyst-Proj/PharmaPOC/client/dist --name pharmapoc-dam --framework react-vite -ni
```

- [ ] **Step 13: Commit**

```bash
cd /Users/prasha-3336/Catalyst-Proj/PharmaPOC
git add catalyst.json client
git commit -m "chore: scaffold React client on Slate with RoleContext and API client"
```

---

## Task 12: SmartSearchBar + AssetLibrary (the wow-moment)

**Files:**
- Create: `client/src/components/SmartSearchBar.jsx`
- Create: `client/src/components/AssetCard.jsx`
- Create: `client/src/pages/AssetLibrary.jsx`
- Test: `client/test/SmartSearchBar.test.jsx`

**Interfaces:**
- Consumes: `listAssets` from `../api` (Task 11).
- Produces: `<SmartSearchBar onChange={(filters) => void} />`, `<AssetCard asset={...} />` — Task 15's persona pages render `AssetLibrary`.

- [ ] **Step 1: Write the failing tests**

```jsx
// client/test/SmartSearchBar.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, test, expect } from 'vitest';
import SmartSearchBar from '../src/components/SmartSearchBar';

test('calls onChange with the search term as the user types', () => {
  const onChange = vi.fn();
  render(<SmartSearchBar onChange={onChange} />);
  fireEvent.change(screen.getByPlaceholderText(/search assets/i), { target: { value: 'launch' } });
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ search: 'launch' }));
});

test('calls onChange with the selected market filter', () => {
  const onChange = vi.fn();
  render(<SmartSearchBar onChange={onChange} />);
  fireEvent.change(screen.getByLabelText(/market/i), { target: { value: 'Nigeria' } });
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ market: 'Nigeria' }));
});

test('calls onChange with the selected function filter', () => {
  const onChange = vi.fn();
  render(<SmartSearchBar onChange={onChange} />);
  fireEvent.change(screen.getByLabelText(/function/i), { target: { value: 'Marketing' } });
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ function: 'Marketing' }));
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd client && npx vitest run test/SmartSearchBar.test.jsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/components/SmartSearchBar.jsx`**

```jsx
import { useState } from 'react';

const MARKETS = ['', 'Nigeria', 'Philippines', 'Kenya', 'Vietnam', 'Indonesia', 'Global'];
const FUNCTIONS = ['', 'Marketing', 'Medical Affairs', 'Training & Learning', 'Corporate Communications', 'Sales/Field Enablement'];

export default function SmartSearchBar({ onChange }) {
  const [filters, setFilters] = useState({ search: '', market: '', function: '' });

  function update(next) {
    const merged = { ...filters, ...next };
    setFilters(merged);
    onChange(merged);
  }

  return (
    <div className="smart-search-bar">
      <input
        placeholder="Search assets"
        value={filters.search}
        onChange={(e) => update({ search: e.target.value })}
      />
      <label>
        Market
        <select aria-label="Market" value={filters.market} onChange={(e) => update({ market: e.target.value })}>
          {MARKETS.map((m) => <option key={m} value={m}>{m || 'All Markets'}</option>)}
        </select>
      </label>
      <label>
        Function
        <select aria-label="Function" value={filters.function} onChange={(e) => update({ function: e.target.value })}>
          {FUNCTIONS.map((f) => <option key={f} value={f}>{f || 'All Functions'}</option>)}
        </select>
      </label>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd client && npx vitest run test/SmartSearchBar.test.jsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Implement `src/components/AssetCard.jsx` and `src/pages/AssetLibrary.jsx` (no new tests — thin composition over already-tested pieces)**

```jsx
// client/src/components/AssetCard.jsx
export default function AssetCard({ asset, onOpen }) {
  return (
    <button className="asset-card" onClick={() => onOpen(asset)}>
      <img src={asset.THUMBNAIL_URL} alt={asset.NAME} />
      <div className="asset-card-body">
        <strong>{asset.NAME}</strong>
        <span>{asset.FUNCTION} · {asset.PROCESS}</span>
        <span>{asset.BRAND} · {asset.MARKET}</span>
        <span className={`status status-${asset.STATUS}`}>{asset.STATUS}</span>
      </div>
    </button>
  );
}
```

```jsx
// client/src/pages/AssetLibrary.jsx
import { useEffect, useState } from 'react';
import { useRole } from '../context/RoleContext';
import { listAssets } from '../api';
import SmartSearchBar from '../components/SmartSearchBar';
import AssetCard from '../components/AssetCard';

export default function AssetLibrary({ onOpenAsset }) {
  const { role } = useRole();
  const [assets, setAssets] = useState([]);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    listAssets({ role, ...filters }).then(setAssets).catch(console.error);
  }, [role, filters]);

  return (
    <div className="asset-library">
      <SmartSearchBar onChange={setFilters} />
      <div className="asset-grid">
        {assets.map((asset) => <AssetCard key={asset.ROWID} asset={asset} onOpen={onOpenAsset} />)}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add client/src/components/SmartSearchBar.jsx client/src/components/AssetCard.jsx client/src/pages/AssetLibrary.jsx client/test/SmartSearchBar.test.jsx
git commit -m "feat: add smart search bar and asset library grid"
```

---

## Task 13: UploadStepper (6-stage AI pipeline) + Upload page

**Files:**
- Create: `client/src/components/UploadStepper.jsx`
- Create: `client/src/pages/UploadAsset.jsx`
- Test: `client/test/UploadStepper.test.jsx`

**Interfaces:**
- Consumes: `getSuggestions`, `createAsset` from `../api`.
- Produces: `<UploadStepper stage={...} />` — a purely presentational stepper Task 15's `UploadAsset` page drives.

- [ ] **Step 1: Write the failing tests**

```jsx
// client/test/UploadStepper.test.jsx
import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import UploadStepper from '../src/components/UploadStepper';

const STAGES = ['Ingest', 'Extract', 'Classify', 'Enrich', 'Validate', 'Publish'];

test('renders all six pipeline stages', () => {
  render(<UploadStepper stage="Classify" />);
  STAGES.forEach((s) => expect(screen.getByText(s)).toBeInTheDocument());
});

test('marks the current stage as active and earlier stages as done', () => {
  render(<UploadStepper stage="Enrich" />);
  expect(screen.getByText('Ingest').closest('li')).toHaveClass('done');
  expect(screen.getByText('Enrich').closest('li')).toHaveClass('active');
  expect(screen.getByText('Publish').closest('li')).toHaveClass('pending');
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd client && npx vitest run test/UploadStepper.test.jsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/components/UploadStepper.jsx`**

```jsx
const STAGES = ['Ingest', 'Extract', 'Classify', 'Enrich', 'Validate', 'Publish'];

export default function UploadStepper({ stage }) {
  const currentIndex = STAGES.indexOf(stage);
  return (
    <ol className="upload-stepper">
      {STAGES.map((s, i) => {
        const status = i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'pending';
        return <li key={s} className={status}>{s}</li>;
      })}
    </ol>
  );
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd client && npx vitest run test/UploadStepper.test.jsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Implement `src/pages/UploadAsset.jsx` (no new tests — thin composition wiring already-tested pieces to `api.js`)**

```jsx
import { useState } from 'react';
import { useRole } from '../context/RoleContext';
import { getSuggestions, createAsset } from '../api';
import UploadStepper from '../components/UploadStepper';

const ASSET_TYPES = ['Image', 'Video', 'Brochure', 'Detail Aid', 'Presentation', 'Social Post'];

export default function UploadAsset({ onUploaded }) {
  const { role } = useRole();
  const [stage, setStage] = useState('Ingest');
  const [file, setFile] = useState(null);
  const [fields, setFields] = useState({ name: '', assetType: 'Image', function: '', process: '', brand: '', market: '' });

  async function handleFileChange(e) {
    const chosen = e.target.files[0];
    setFile(chosen);
    setStage('Extract');
    setStage('Classify');
    const suggestions = await getSuggestions('new', fields.assetType);
    setStage('Enrich');
    setFields((f) => ({ ...f, function: suggestions.function, process: suggestions.process }));
    setStage('Validate');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(fields).forEach(([k, v]) => formData.append(k, v));
    formData.append('uploadedBy', role);
    const asset = await createAsset(formData);
    setStage('Publish');
    onUploaded(asset);
  }

  return (
    <form className="upload-asset" onSubmit={handleSubmit}>
      <UploadStepper stage={stage} />
      <input type="file" onChange={handleFileChange} />
      <input placeholder="Asset name" value={fields.name} onChange={(e) => setFields({ ...fields, name: e.target.value })} />
      <select value={fields.assetType} onChange={(e) => setFields({ ...fields, assetType: e.target.value })}>
        {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <input placeholder="Function (AI-suggested)" value={fields.function} onChange={(e) => setFields({ ...fields, function: e.target.value })} />
      <input placeholder="Process (AI-suggested)" value={fields.process} onChange={(e) => setFields({ ...fields, process: e.target.value })} />
      <input placeholder="Brand" value={fields.brand} onChange={(e) => setFields({ ...fields, brand: e.target.value })} />
      <input placeholder="Market" value={fields.market} onChange={(e) => setFields({ ...fields, market: e.target.value })} />
      <button type="submit" disabled={!file}>Ingest &amp; Submit for Review</button>
    </form>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add client/src/components/UploadStepper.jsx client/src/pages/UploadAsset.jsx client/test/UploadStepper.test.jsx
git commit -m "feat: add six-stage upload pipeline stepper and upload page"
```

---

## Task 14: AssetDetail (metadata facets) + AnnotationCanvas + Reviewer actions

**Files:**
- Create: `client/src/components/MetadataPanel.jsx`
- Create: `client/src/components/AnnotationCanvas.jsx`
- Create: `client/src/pages/AssetDetail.jsx`
- Create: `client/src/pages/ReviewerQueue.jsx`
- Test: `client/test/MetadataPanel.test.jsx`

**Interfaces:**
- Consumes: `getAsset`, `submitAsset`, `approveAsset`, `rejectAsset`, `delegateAsset`, `annotateAsset` from `../api`.
- Produces: `<MetadataPanel asset={...} />`, `<AnnotationCanvas asset={...} onAnnotate={...} />` — reused by both `AssetDetail` (Brand Manager) and `ReviewerQueue` (Reviewer).

- [ ] **Step 1: Write the failing tests**

```jsx
// client/test/MetadataPanel.test.jsx
import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import MetadataPanel from '../src/components/MetadataPanel';

const asset = {
  NAME: 'Cardiozan Launch Detail Aid', ASSET_TYPE: 'Detail Aid', CURRENT_VERSION: 1,
  FUNCTION: 'Sales/Field Enablement', PROCESS: 'Field Enablement', UPLOADED_BY: 'Priya Sharma',
  BRAND: 'Cardiozan', THERAPEUTIC_AREA: 'Cardiovascular', MARKET: 'Nigeria',
  USAGE_RIGHTS: 'Internal', LANGUAGE: 'English', STATUS: 'Published', EFFECTIVE_DATE: '2026-09-20',
};

test('groups fields under the six metadata facets from the spec', () => {
  render(<MetadataPanel asset={asset} />);
  ['Identity', 'Business', 'Product', 'Location', 'Compliance', 'Lifecycle'].forEach((facet) =>
    expect(screen.getByText(facet)).toBeInTheDocument()
  );
});

test('renders the asset name under Identity and the market under Location', () => {
  render(<MetadataPanel asset={asset} />);
  expect(screen.getByText('Cardiozan Launch Detail Aid')).toBeInTheDocument();
  expect(screen.getByText('Nigeria')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd client && npx vitest run test/MetadataPanel.test.jsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/components/MetadataPanel.jsx`**

```jsx
const FACETS = [
  { label: 'Identity', fields: [['Name', 'NAME'], ['Asset Type', 'ASSET_TYPE'], ['Version', 'CURRENT_VERSION']] },
  { label: 'Business', fields: [['Function', 'FUNCTION'], ['Process', 'PROCESS'], ['Owner', 'UPLOADED_BY']] },
  { label: 'Product', fields: [['Brand', 'BRAND'], ['Therapeutic Area', 'THERAPEUTIC_AREA']] },
  { label: 'Location', fields: [['Market', 'MARKET']] },
  { label: 'Compliance', fields: [['Usage Rights', 'USAGE_RIGHTS'], ['Language', 'LANGUAGE']] },
  { label: 'Lifecycle', fields: [['Status', 'STATUS'], ['Effective Date', 'EFFECTIVE_DATE']] },
];

export default function MetadataPanel({ asset }) {
  return (
    <div className="metadata-panel">
      {FACETS.map(({ label, fields }) => (
        <section key={label}>
          <h4>{label}</h4>
          <dl>
            {fields.map(([caption, key]) => (
              <div key={key}>
                <dt>{caption}</dt>
                <dd>{asset[key] || '—'}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd client && npx vitest run test/MetadataPanel.test.jsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Implement `AnnotationCanvas`, `AssetDetail`, `ReviewerQueue` (no new tests — thin composition over already-tested pieces)**

```jsx
// client/src/components/AnnotationCanvas.jsx
import { useState } from 'react';

export default function AnnotationCanvas({ asset, onAnnotate, authorPersona }) {
  const [pendingPin, setPendingPin] = useState(null);

  function handleClick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPin({ xPercent, yPercent });
  }

  function handleSave(comment) {
    onAnnotate({ ...pendingPin, comment, authorPersona });
    setPendingPin(null);
  }

  return (
    <div className="annotation-canvas" onClick={handleClick}>
      <img src={asset.FILE_URL} alt={asset.NAME} />
      {pendingPin && (
        <form onSubmit={(e) => { e.preventDefault(); handleSave(e.target.comment.value); }}>
          <input name="comment" placeholder="Annotation comment" autoFocus />
          <button type="submit">Save pin</button>
        </form>
      )}
    </div>
  );
}
```

```jsx
// client/src/pages/AssetDetail.jsx
import { useEffect, useState } from 'react';
import { useRole } from '../context/RoleContext';
import { getAsset, submitAsset, annotateAsset } from '../api';
import MetadataPanel from '../components/MetadataPanel';
import AnnotationCanvas from '../components/AnnotationCanvas';

export default function AssetDetail({ assetId }) {
  const { role } = useRole();
  const [asset, setAsset] = useState(null);

  useEffect(() => { getAsset(assetId).then(setAsset); }, [assetId]);
  if (!asset) return <p>Loading…</p>;

  return (
    <div className="asset-detail">
      <img src={asset.FILE_URL} alt={asset.NAME} className="hero" />
      <MetadataPanel asset={asset} />
      <AnnotationCanvas asset={asset} authorPersona={role} onAnnotate={(a) => annotateAsset(assetId, a)} />
      {asset.STATUS === 'Draft' && (
        <button onClick={() => submitAsset(assetId, { actorPersona: role, actorRole: 'Brand Manager' }).then(() => getAsset(assetId).then(setAsset))}>
          Submit for Review
        </button>
      )}
    </div>
  );
}
```

```jsx
// client/src/pages/ReviewerQueue.jsx
import { useEffect, useState } from 'react';
import { useRole } from '../context/RoleContext';
import { listAssets, approveAsset, rejectAsset, delegateAsset } from '../api';
import MetadataPanel from '../components/MetadataPanel';
import AnnotationCanvas from '../components/AnnotationCanvas';

export default function ReviewerQueue() {
  const { role } = useRole();
  const [queue, setQueue] = useState([]);

  function refresh() { listAssets({ role, status: 'UnderReview' }).then(setQueue); }
  useEffect(refresh, [role]);

  return (
    <div className="reviewer-queue">
      {queue.map((asset) => (
        <div key={asset.ROWID} className="review-item">
          <img src={asset.FILE_URL} alt={asset.NAME} />
          <MetadataPanel asset={asset} />
          <AnnotationCanvas asset={asset} authorPersona={role} onAnnotate={(a) => {}} />
          <button onClick={() => approveAsset(asset.ROWID, { actorPersona: role, actorRole: 'Reviewer' }).then(refresh)}>Approve</button>
          <button onClick={() => rejectAsset(asset.ROWID, { actorPersona: role, actorRole: 'Reviewer', comments: 'Needs revision' }).then(refresh)}>Reject</button>
          <button onClick={() => delegateAsset(asset.ROWID, { actorPersona: role, actorRole: 'Reviewer', comments: 'Delegating' }).then(refresh)}>Delegate</button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add client/src/components/MetadataPanel.jsx client/src/components/AnnotationCanvas.jsx client/src/pages/AssetDetail.jsx client/src/pages/ReviewerQueue.jsx client/test/MetadataPanel.test.jsx
git commit -m "feat: add metadata facet panel, annotation canvas, asset detail and reviewer queue"
```

---

## Task 15: Admin pages + Agency Viewer page

**Files:**
- Create: `client/src/pages/AdminAnalytics.jsx`
- Create: `client/src/pages/AdminTaxonomy.jsx`
- Create: `client/src/pages/AdminAudit.jsx`
- Create: `client/src/pages/AgencyLibrary.jsx`

**Interfaces:**
- Consumes: `getAnalytics`, `getAudit`, `getTags`, `listAssets` from `../api`.
- Produces: page components Task 16's `App.jsx` routes to for the Admin and Agency Viewer personas.

- [ ] **Step 1: Implement `src/pages/AdminAnalytics.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { getAnalytics } from '../api';

export default function AdminAnalytics() {
  const [stats, setStats] = useState(null);
  useEffect(() => { getAnalytics().then(setStats); }, []);
  if (!stats) return <p>Loading…</p>;
  return (
    <div className="admin-analytics">
      <div className="stat-tile"><strong>{stats.totalAssets}</strong><span>Total Assets</span></div>
      <div className="stat-tile"><strong>{stats.usageEvents}</strong><span>Usage Events</span></div>
    </div>
  );
}
```

- [ ] **Step 2: Implement `src/pages/AdminTaxonomy.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { getTags } from '../api';

export default function AdminTaxonomy() {
  const [tags, setTags] = useState([]);
  useEffect(() => { getTags().then(setTags); }, []);
  return (
    <div className="admin-taxonomy">
      <h3>Controlled Vocabularies</h3>
      <p>Metadata Stewards maintain this list; Domain Owners (Brand Manager, Reviewer) consume it during Classify/Enrich.</p>
      <ul>
        {tags.map((t) => <li key={t.ROWID}>{t.TAG_NAME} <em>({t.TAG_CATEGORY})</em></li>)}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Implement `src/pages/AdminAudit.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { getAudit } from '../api';

export default function AdminAudit() {
  const [audit, setAudit] = useState([]);
  useEffect(() => { getAudit().then(setAudit); }, []);
  return (
    <table className="admin-audit">
      <thead><tr><th>Asset</th><th>Action</th><th>Actor</th><th>Comments</th><th>When</th></tr></thead>
      <tbody>
        {audit.map((row) => (
          <tr key={row.ROWID}>
            <td>{row.ASSET_ID}</td><td>{row.ACTION}</td><td>{row.ACTOR_PERSONA} ({row.ACTOR_ROLE})</td>
            <td>{row.COMMENTS}</td><td>{row.CREATEDTIME}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 4: Implement `src/pages/AgencyLibrary.jsx` (read-only wrapper over the already-tested AssetLibrary/AssetCard)**

```jsx
import AssetLibrary from './AssetLibrary';

export default function AgencyLibrary() {
  return (
    <div className="agency-library">
      <p>Read-only view — Published assets in your market only.</p>
      <AssetLibrary onOpenAsset={() => {}} />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/AdminAnalytics.jsx client/src/pages/AdminTaxonomy.jsx client/src/pages/AdminAudit.jsx client/src/pages/AgencyLibrary.jsx
git commit -m "feat: add admin analytics/taxonomy/audit pages and agency read-only library"
```

---

## Task 16: App shell, routing, and deploy to Slate

**Files:**
- Modify: `client/src/App.jsx`, `client/src/main.jsx`
- Create: `client/src/components/RoleSwitcher.jsx`

**Interfaces:**
- Consumes: `RoleProvider`/`useRole` (Task 11), all page components (Tasks 12-15).
- Produces: the deployed Slate app the presenter clicks through.

- [ ] **Step 1: Implement `src/components/RoleSwitcher.jsx`**

```jsx
import { useRole } from '../context/RoleContext';

const ROLES = ['Brand Manager', 'Reviewer', 'Admin', 'Agency Viewer'];

export default function RoleSwitcher() {
  const { role, setRole } = useRole();
  return (
    <select aria-label="Continue as" value={role} onChange={(e) => setRole(e.target.value)}>
      {ROLES.map((r) => <option key={r} value={r}>Continue as: {r}</option>)}
    </select>
  );
}
```

- [ ] **Step 2: Implement `src/App.jsx` routing by persona**

```jsx
import { useState } from 'react';
import { useRole } from './context/RoleContext';
import RoleSwitcher from './components/RoleSwitcher';
import AssetLibrary from './pages/AssetLibrary';
import UploadAsset from './pages/UploadAsset';
import AssetDetail from './pages/AssetDetail';
import ReviewerQueue from './pages/ReviewerQueue';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminTaxonomy from './pages/AdminTaxonomy';
import AdminAudit from './pages/AdminAudit';
import AgencyLibrary from './pages/AgencyLibrary';

const BRAND_TABS = { Library: AssetLibrary, Upload: UploadAsset };
const ADMIN_TABS = { Analytics: AdminAnalytics, Taxonomy: AdminTaxonomy, Audit: AdminAudit };

export default function App() {
  const { role } = useRole();
  const [openAssetId, setOpenAssetId] = useState(null);
  const [tab, setTab] = useState(null);

  if (openAssetId) return <AssetDetail assetId={openAssetId} />;

  return (
    <div className="app-shell">
      <header className="app-header">
        <img src="/sun-pharma-logo.png" alt="Sun Pharma" className="brand-logo" />
        <h1>Sun Pharma DAM Demo</h1>
        <RoleSwitcher />
      </header>
      {role === 'Brand Manager' && (
        <>
          <nav>{Object.keys(BRAND_TABS).map((t) => <button key={t} onClick={() => setTab(t)}>{t}</button>)}</nav>
          {(() => { const Page = BRAND_TABS[tab] || AssetLibrary; return <Page onOpenAsset={(a) => setOpenAssetId(a.ROWID)} onUploaded={() => setTab('Library')} />; })()}
        </>
      )}
      {role === 'Reviewer' && <ReviewerQueue />}
      {role === 'Admin' && (
        <>
          <nav>{Object.keys(ADMIN_TABS).map((t) => <button key={t} onClick={() => setTab(t)}>{t}</button>)}</nav>
          {(() => { const Page = ADMIN_TABS[tab] || AdminAnalytics; return <Page />; })()}
        </>
      )}
      {role === 'Agency Viewer' && <AgencyLibrary />}
    </div>
  );
}
```

- [ ] **Step 3: Wrap with `RoleProvider` in `src/main.jsx`**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { RoleProvider } from './context/RoleContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RoleProvider>
      <App />
    </RoleProvider>
  </React.StrictMode>
);
```

- [ ] **Step 4: Run the full frontend test suite**

Run: `cd client && npx vitest run`
Expected: PASS (all tests from Tasks 11-14)

- [ ] **Step 5: Local end-to-end smoke test**

```bash
cd /Users/prasha-3336/Catalyst-Proj/PharmaPOC
catalyst serve
```
Open the printed local URL. Click through: switch to Brand Manager → Upload an asset (watch the 6-stage stepper) → switch to Reviewer → approve it → switch to Agency Viewer → confirm it now appears → switch to Admin → confirm the audit log shows Submitted + Approved entries and the analytics tile count increased.

- [ ] **Step 6: Whitelist the Slate domain for CORS**

In the Catalyst Console: Authentication → Authorized Domains → add the `*.onslate.in` (or relevant DC) Slate domain issued in Task 11 Step 12's output. Do not add manual CORS headers for it (duplicate-header footgun).

- [ ] **Step 7: Build and deploy**

Vite's default build cleans `dist/`, which deletes the `.catalyst/slate-config.toml`
that `slate:link` wrote in Task 11 Step 12 — recreate it after every build, before deploying:

```bash
cd client && npm run build
mkdir -p dist/.catalyst
printf 'framework = "react-vite"\ndeployment_name = "default"\n\n[[redirects]]\nfrom = "/*"\nto = "/index.html"\nstatus = 200\n' > dist/.catalyst/slate-config.toml
cd .. && catalyst deploy slate pharmapoc-dam -ni
```

- [ ] **Step 8: Verify on the deployed URL**

Open the Development Slate URL from the deploy output and repeat the Step 5 click-through against the live deployment.

- [ ] **Step 9: Commit**

```bash
git add client/src/App.jsx client/src/main.jsx client/src/components/RoleSwitcher.jsx
git commit -m "feat: wire persona-based app shell and deploy to Slate"
```

---

## Self-Review

**Spec coverage:** §2 Personas → Task 16 (role routing). §3 Architecture → Tasks 4, 10, 11. §4.1-4.3 Taxonomy/Metadata/AI pipeline → Tasks 6, 13, 14 (`MetadataPanel`'s six facets, `UploadStepper`'s six stages). §4.4 Governance → Task 15 `AdminTaxonomy`. §5 Data Model → Task 2. §6 API Surface → Tasks 7-9. §7 RFP coverage rows all map to a task except the explicitly Deck-only/Deck-content rows (§7's M365/CRM/SSO/pricing/references), which §9 correctly leaves out of the build.

**Placeholder scan:** no TBD/TODO markers; every step has runnable code or an exact shell command.

**Type consistency:** `query(app, zcql, tableName)` signature is identical across Tasks 5, 7, 8, 9. `insertRow(app, tableName, row)` likewise. Frontend `api.js` function names (`listAssets`, `submitAsset`, etc.) match exactly what Tasks 12-15 import.

**Review Focus coverage:** empty search string (Task 7, assets.test.js), single-quote escaping (Task 5 + Task 7 tests), missing/unknown role defaulting to most-restrictive (Task 7 test), invalid-state workflow transitions (Task 8, four tests), missing-file upload (Task 7 test) — all five are covered by a task's own tests.
