# sigma-computing-rest-api-sdk

> TypeScript SDK for the [Sigma Computing REST API](https://help.sigmacomputing.com/reference)

[![npm version](https://img.shields.io/npm/v/sigma-computing-rest-api-sdk)](https://www.npmjs.com/package/sigma-computing-rest-api-sdk)
[![license](https://img.shields.io/npm/l/sigma-computing-rest-api-sdk)](LICENSE)
[![node](https://img.shields.io/node/v/sigma-computing-rest-api-sdk)](https://nodejs.org)

**Key features:**
- Full TypeScript types for every request parameter, request body, and response — generated directly from the official OpenAPI spec
- Auto-pagination with async iteration and `.toArray()` helpers
- OAuth2 client credentials flow with automatic token fetch and refresh
- Built-in 429 retry with exponential backoff, jitter, and `Retry-After` header support
- Concurrency limiting to avoid overwhelming the API
- Hydrated response objects with sub-resource accessors (e.g. `workbook.pages.listAll()`)

## Installation

```bash
npm install sigma-computing-rest-api-sdk
```

## Quick Start

### With OAuth2 client credentials (recommended)

Tokens are fetched and refreshed automatically.

```typescript
import { createSigmaClient } from 'sigma-computing-rest-api-sdk';

const sigma = createSigmaClient({
  baseUrl: 'https://api.sigmacomputing.com',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
});

// List all workbooks
const workbooks = await sigma.workbooks.listAll().toArray();
for (const wb of workbooks) {
  console.log(wb.name, wb.workbookId);
}

// Get a single workbook
const workbook = await sigma.workbooks.get('workbook-id');

// Create a workbook
const newWorkbook = await sigma.workbooks.create({
  name: 'My Workbook',
  folderId: 'folder-id',
});
```

### With a static access token

```typescript
import { createSigmaClient } from 'sigma-computing-rest-api-sdk';

const sigma = createSigmaClient({
  baseUrl: 'https://api.sigmacomputing.com',
  accessToken: 'your-access-token',
});

const me = await sigma.whoami.get();
console.log(me);
```

## Usage Examples

### Members

```typescript
// Create a member — the returned object has sub-resource accessors
const member = await sigma.members.create({
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  memberType: 'viewer',
});

// Access sub-resources directly on the member
const teams = await member.teams.listAll().toArray();
const files = await member.accessibleInodes.listAll().toArray();
const favorites = await member.favoriteInodes.listAll().toArray();
const recent = await member.recentInodes.listAll().toArray();

// Update and delete still use the top-level resource
await sigma.members.update(member.memberId, { firstName: 'Janet' });
await sigma.members.delete(member.memberId);
```

### Workbooks

```typescript
// Get a workbook — the returned object has sub-resource accessors
const workbook = await sigma.workbooks.get('workbook-id');

// Navigate pages and elements via sub-resources
const pages = await workbook.pages.listAll().toArray();
const elements = await pages[0].elements.listAll().toArray();

// Elements also have sub-resources
const columns = await elements[0].columns.listAll().toArray();
const lineage = await elements[0].lineages.list();

// Tags, schedules, and other sub-resources
// Note: accessor is "tagsResource" (not "tags") because the workbook response
// already has a "tags" field — see "Sub-resource accessor naming" below.
const tags = await workbook.tagsResource.listAll().toArray();
const schedules = await workbook.schedules.listAll().toArray();

// Actions directly on the workbook
const copy = await workbook.copy({
  destinationFolderId: 'folder-id',
  name: 'Copy of Workbook',
});

await workbook.export({
  elementId: 'element-id',
  format: { type: 'csv' },
});
```

### Teams

```typescript
// Create a team — the returned object has sub-resource accessors
const team = await sigma.teams.create({ name: 'Data Team' });

// Manage team members via sub-resources
// Note: accessor is "membersResource" (not "members") because the team response
// already has a "members" field — see "Sub-resource accessor naming" below.
const members = await team.membersResource.listAll().toArray();
await team.membersResource.update({ add: ['member-id-1', 'member-id-2'] });

// Access user attribute assignments
const assignments = await team.userAttributeAssignments.listAll().toArray();
```

### Grants

> **SDK patch — `urlId` field:** The Sigma grants API returns a URL slug in the
> `inodeId` response field instead of a UUID for all inode types (workbooks,
> folders, data models, etc.). This SDK renames that field to `urlId` to make
> the intent explicit and removes the raw `inodeId` from the response.
> See [`FIELD_ALIASES`](scripts/lib/response-patching.ts) and the
> [API Patches & Workarounds](#api-patches--workarounds) section for details.

```typescript
// Grant a member view access to a workbook
const grant = await sigma.grants.upsert({
  inodeId: 'workbook-id',
  grantee: { memberId: 'member-id' },
  permission: 'view',
});
console.log(grant.urlId); // URL slug, e.g. "bNwrAShCgMseowjZ8mMmD"
// grant.inodeId is NOT present — use grant.urlId instead

// Grant a team edit access to a folder
await sigma.grants.upsert({
  inodeId: 'folder-id',
  grantee: { teamId: 'team-id' },
  permission: 'edit',
});

// List all grants on a specific inode (workbook, folder, workspace, etc.)
const grants = await sigma.grants.listAll({ inodeId: 'workbook-id' }).toArray();
for (const g of grants) {
  console.log(g.urlId); // URL slug for the inode
}

// List all grants for a specific member
const memberGrants = await sigma.grants
  .listAll({ userId: 'member-id' })
  .toArray();

// List only directly-granted permissions (exclude inherited)
const directGrants = await sigma.grants
  .listAll({
    inodeId: 'workbook-id',
    directGrantsOnly: true,
  })
  .toArray();

// Get a single grant by ID
const fetchedGrant = await sigma.grants.get('grant-id');

// Delete a grant (revoke access)
await sigma.grants.delete('grant-id');

// Revoke all grants on a workbook
const allGrants = await sigma.grants
  .listAll({ inodeId: 'workbook-id' })
  .toArray();
for (const g of allGrants) {
  await sigma.grants.delete(g.grantId);
}
```

### Connections

```typescript
// Get a connection — the returned object has sub-resource accessors
const connection = await sigma.connections.get('connection-id');

// Test, list grants, and sync paths via sub-resources
await connection.test();
const grants = await connection.grants.listAll().toArray();
await connection.syncPath({ path: ['DATABASE', 'SCHEMA', 'TABLE'] });
```

### Data Models

```typescript
// Get a data model — the returned object has sub-resource accessors
const dataModel = await sigma.dataModels.get('data-model-id');

// Explore columns, elements, and sources via sub-resources
const columns = await dataModel.columns.listAll().toArray();
const elements = await dataModel.elements.listAll().toArray();
const sources = await dataModel.sources.listAll().toArray();

// Tags and lineage
// Note: accessor is "tagsResource" (not "tags") because the data model response
// already has a "tags" field — see "Sub-resource accessor naming" below.
const tags = await dataModel.tagsResource.listAll().toArray();
const lineage = await dataModel.lineageTrees.listAll().toArray();

// Get and update the data model spec
const spec = await dataModel.getSpec();
await dataModel.updateSpec({
  spec: {/* ... */},
});

// Swap sources
await dataModel.swapSources({
  sourceMapping: [{ fromId: 'old-source-id', toId: 'new-source-id' }],
});
```

## Pagination

List endpoints return paginated responses. The SDK provides several ways to work with them, from simplest to most flexible.

### `listAll().toArray()` — get everything as a flat array

The simplest approach. Fetches all pages behind the scenes and returns a flat array of entries:

```typescript
const allWorkbooks = await sigma.workbooks.listAll().toArray();
console.log(`Found ${allWorkbooks.length} workbooks total`);

// Pass an abort signal to cap long-running fetches
const controller = new AbortController();
setTimeout(() => controller.abort(), 30_000);
const allMembers = await sigma.members.listAll().toArray({
  signal: controller.signal,
});
```

### `list()` — fetch a single page

Use `list()` when you only need the first page or want manual control over pagination:

```typescript
const page = await sigma.workbooks.list({ limit: 50 });
for (const workbook of page.entries) {
  console.log(workbook.name);
}
```

### `listAll()` — iterate page by page

Use `listAll()` as an async generator when you need to process results page by page (e.g. to limit memory usage on very large collections):

```typescript
for await (const page of sigma.workbooks.listAll()) {
  for (const workbook of page.entries) {
    console.log(workbook.name);
  }
}
```

### `collectPages()` — collect all pages as an array of pages

A standalone utility that collects every page from a `listAll()` generator into an array, preserving the page structure:

```typescript
import { collectPages } from 'sigma-computing-rest-api-sdk';

const allPages = await collectPages(sigma.members.listAll());
const allMembers = allPages.flatMap((page) => page.entries);
console.log(`Found ${allMembers.length} members total`);
```

## Error Handling

All resource methods throw `SigmaApiError` on non-success responses:

```typescript
import { SigmaApiError } from 'sigma-computing-rest-api-sdk';

try {
  await sigma.workbooks.get('non-existent-id');
} catch (err) {
  if (err instanceof SigmaApiError) {
    console.error(`API error: ${err.message}`);
    console.error(`Code: ${err.code}`);
    console.error(`Request ID: ${err.requestId}`);
  }
}
```

## Throttle Retry (429 Handling)

The SDK automatically retries requests that receive a `429 Too Many Requests` response using exponential backoff with jitter. This is enabled by default with sensible settings and requires no configuration.

### Default behavior

| Setting                | Default   | Description                                                                  |
| ---------------------- | --------- | ---------------------------------------------------------------------------- |
| `maxRetries`           | `5`       | Maximum retry attempts after the initial request                             |
| `baseDelayMs`          | `1000ms`  | Starting delay; doubles with each attempt (exponential backoff)              |
| `maxDelayMs`           | `10000ms` | Cap on the exponential component of the delay                                |
| Jitter                 | 0–2000ms  | Random offset added on top of the capped delay per attempt                   |
| `maxConcurrentFetches` | `50`      | Maximum number of in-flight requests at any time; excess requests are queued |

The delay formula per attempt is: `min(maxDelayMs, baseDelayMs * 2^attempt) + random(0, 2000ms)`.

If the API responds with a `Retry-After` header, that value is used as the minimum delay for that attempt.

### Customizing the retry config

Pass `throttleRetry` to `createSigmaClient` to override the defaults:

```typescript
const sigma = createSigmaClient({
  baseUrl: 'https://api.sigmacomputing.com',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  throttleRetry: {
    maxRetries: 10, // more retries for high-throughput workloads
    baseDelayMs: 500, // start with a shorter delay
    maxDelayMs: 30_000, // allow longer delays at higher attempts
    maxConcurrentFetches: 25, // stricter concurrency limit
  },
});
```

### Disabling retries

Set `maxRetries` to `0` to disable retry behavior entirely:

```typescript
const sigma = createSigmaClient({
  baseUrl: 'https://api.sigmacomputing.com',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  throttleRetry: { maxRetries: 0 },
});
```

### Handling exhausted retries

If all retry attempts are exhausted, the SDK throws a `SigmaApiError` with `statusCode: 429`:

```typescript
import { SigmaApiError } from 'sigma-computing-rest-api-sdk';

try {
  await sigma.members.list();
} catch (err) {
  if (err instanceof SigmaApiError && err.statusCode === 429) {
    console.error('Rate limit exceeded after all retries');
  }
}
```

## API Regions

Pass the `baseUrl` matching your organization's cloud region:

| Cloud | Region           | Base URL                                  |
| ----- | ---------------- | ----------------------------------------- |
| GCP   | US               | `https://api.sigmacomputing.com`          |
| GCP   | KSA              | `https://api.sa.gcp.sigmacomputing.com`   |
| AWS   | US West          | `https://aws-api.sigmacomputing.com`      |
| AWS   | US East          | `https://api.us-a.aws.sigmacomputing.com` |
| AWS   | Canada           | `https://api.ca.aws.sigmacomputing.com`   |
| AWS   | Europe           | `https://api.eu.aws.sigmacomputing.com`   |
| AWS   | Australia / APAC | `https://api.au.aws.sigmacomputing.com`   |
| AWS   | UK               | `https://api.uk.aws.sigmacomputing.com`   |
| Azure | US               | `https://api.us.azure.sigmacomputing.com` |
| Azure | Europe           | `https://api.eu.azure.sigmacomputing.com` |
| Azure | Canada           | `https://api.ca.azure.sigmacomputing.com` |
| Azure | UK               | `https://api.uk.azure.sigmacomputing.com` |

## Raw Client Access

For advanced use cases, the underlying `openapi-fetch` client is available:

```typescript
const { data, error, response } = await sigma.raw.GET('/v2/workbooks', {
  params: { query: { limit: 10 } },
});
```

## Available Resources

| Property             | Resource               | Methods |
| -------------------- | ---------------------- | ------- |
| `accountTypes`       | Account types          | 4       |
| `allowedIps`         | IP allowlist (v3alpha) | 3       |
| `apiConnectors`      | API connectors         | 5       |
| `apiCredentials`     | API credentials        | 5       |
| `auth`               | Authentication tokens  | 1       |
| `connections`        | Database connections   | 22      |
| `credentials`        | Sigma API credentials  | 2       |
| `dataModels`         | Data models            | 16      |
| `datasets`           | Datasets               | 9       |
| `deploymentPolicies` | Deployment policies    | 11      |
| `favorites`          | Favorites              | 3       |
| `files`              | Files / inodes         | 5       |
| `grants`             | Permission grants      | 4       |
| `members`            | Organization members   | 11      |
| `organizations`      | Organization settings  | 1       |
| `query`              | Query downloads        | 1       |
| `reports`            | Reports                | 11      |
| `saml`               | SAML providers         | 7       |
| `sharedTemplates`    | Shared templates       | 3       |
| `sourceSwapPolicies` | Source swap policies   | 5       |
| `tags`               | Tags                   | 5       |
| `teams`              | Teams                  | 10      |
| `templates`          | Templates              | 4       |
| `tenants`            | Tenant organizations   | 9       |
| `translations`       | Translations           | 8       |
| `userAttributes`     | User attributes        | 16      |
| `webhooks`           | Webhooks               | 1       |
| `whoami`             | Current user           | 1       |
| `workbooks`          | Workbooks              | 54      |
| `workspaces`         | Workspaces             | 9       |

## API Patches & Workarounds

Some Sigma API endpoints have known bugs or inconsistencies that are corrected
transparently by this SDK. Patches are declared as `FIELD_ALIASES` in
`scripts/lib/response-patching.ts` and are applied automatically during code
generation in two places:

- **Types** — the aliased field replaces the original in the generated
  TypeScript interface, so consumers never see the raw (incorrect) field name.
- **Runtime** — the generated resource method renames the field at runtime and
  validates its format. If the upstream API changes (e.g. the bug is fixed),
  the validation throws a descriptive error pointing back to `FIELD_ALIASES`.

### Current patches

| Resource | Operations              | Original field | SDK field | Reason                                                                                                                                               |
| -------- | ----------------------- | -------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grants   | `list`, `upsert`, `get` | `inodeId`      | `urlId`   | Sigma returns a URL slug (e.g. `bNwrAShCgMseowjZ8mMmD`) instead of a UUID in this field for all inode types (workbooks, folders, data models, etc.). |

### Adding a new patch

Add an entry to `FIELD_ALIASES` in `scripts/lib/response-patching.ts`, then
run `npm run generate` to regenerate the affected resource file. The new field
will appear in the generated TypeScript types and be applied at runtime
automatically.

## Sub-resource Accessor Naming

Hydrated entries (returned by `get`, `create`, `update`, and `list`) have sub-resource accessors injected via `Object.assign`. Most accessors use the natural plural name of the sub-resource (e.g. `pages`, `elements`, `bookmarks`).

However, if the API response already contains a field with the same name as a sub-resource accessor, `Object.assign` would silently overwrite the response data. In those cases the accessor is renamed by appending `Resource`:

| Resource     | Collision | Accessor name     | Why                                                     |
| ------------ | --------- | ----------------- | ------------------------------------------------------- |
| `workbooks`  | `tags`    | `tagsResource`    | Workbook response includes `tags: [...]` (version tags) |
| `dataModels` | `tags`    | `tagsResource`    | Data model response includes `tags: [...]`              |
| `teams`      | `members` | `membersResource` | Team response includes `members: [...]` (member IDs)    |

The `Resource` suffix is a **fallback only** — it is not a general naming convention. All other sub-resource accessors use their natural name. If a future OpenAPI spec update introduces a new collision, the generator will automatically apply the same rename and the `npm run generate` output will indicate which accessor was affected.

## Development

```bash
# Install dependencies
npm install

# Regenerate types and resource files from the OpenAPI spec, then auto-format
npm run generate

# Run the full build pipeline:
# generate → format → lint → typecheck → test → bundle
npm run build

# Individual steps
npm run lint          # ESLint (src, tests, scripts, examples)
npm run lint:fix      # ESLint with auto-fix
npm run format        # Prettier (write)
npm run format:check  # Prettier (check only)
npm run typecheck     # tsc --noEmit
npm run test          # Vitest (single run)
npm run test:watch    # Vitest (watch mode)
npm run build:bundle  # tsup only (skip generate/lint/test)
```

## Contributing

Contributions are welcome! To get started:

1. Fork the repo and create a branch from `main`
2. Run `npm install` to install dependencies
3. Make your changes — if you're modifying the OpenAPI spec or codegen scripts, run `npm run generate` to regenerate the resource files
4. Run `npm run build` to verify the full pipeline passes (lint, typecheck, tests, bundle)
5. Open a pull request

Please keep PRs focused — one feature or fix per PR makes review much easier.

## License

MIT
