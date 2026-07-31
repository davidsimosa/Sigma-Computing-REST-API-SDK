// ---------------------------------------------------------------------------
// Shared types and constants for the resource code generator.
// ---------------------------------------------------------------------------

export interface OpenAPISpec {
  paths: Record<string, Record<string, OperationObject>>;
  tags?: { name: string; description?: string }[];
}

export interface OperationObject {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: ParameterObject[];
  requestBody?: {
    description?: string;
    content?: Record<string, { schema?: SchemaObject }>;
  };
  responses?: Record<
    string,
    { content?: Record<string, { schema?: SchemaObject }> }
  >;
}

export interface ParameterObject {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required?: boolean;
  description?: string;
  schema?: SchemaObject;
}

/** A loose representation of JSON Schema (enough for our codegen needs). */
export interface SchemaObject {
  type?: string | string[];
  description?: string;
  title?: string;
  format?: string;
  enum?: unknown[];
  items?: SchemaObject;
  properties?: Record<string, SchemaObject>;
  required?: string[];
  allOf?: SchemaObject[];
  oneOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  $ref?: string;
  additionalProperties?: boolean | SchemaObject;
  default?: unknown;
}

export interface OperationInfo {
  httpMethod: string; // GET, POST, PUT, PATCH, DELETE
  path: string;
  operationId: string;
  summary: string;
  description: string;
  pathParams: ParameterObject[];
  queryParams: ParameterObject[];
  hasBody: boolean;
  bodyContentType: string | null;
  bodySchema: SchemaObject | null;
  bodyDescription: string;
  hasResponse: boolean;
  responseCode: string; // "200" | "201" | "204" etc.
  responseSchema: SchemaObject | null;
}

export interface ResourceGroup {
  tag: string;
  className: string;
  propertyName: string;
  operations: (OperationInfo & { methodName: string; typePrefix: string })[];
}

/**
 * A group of sub-resource methods that share the same first path parameter
 * (the parent resource's primary ID). For example, on MembersResource,
 * `listTeams(memberId)` and `listTeamsAll(memberId)` form the "teams"
 * sub-resource group.
 */
export interface SubResourceGroup {
  /** camelCase accessor name, e.g. "teams", "bookmarks". May be renamed from
   * `originalAccessorName` to avoid colliding with a response property. */
  accessorName: string;
  /** The original (pre-collision-rename) accessor name used for method name
   * derivation, e.g. stripping "Tags" from "listTags" when the accessor was
   * renamed from "tags" to "tagsResource". */
  originalAccessorName: string;
  /** The first path param name shared by all methods, e.g. "memberId" */
  parentIdParam: string;
  /** Methods in this sub-resource group (base methods only, not *All) */
  methods: (OperationInfo & { methodName: string; typePrefix: string })[];
  /** Nested sub-resource groups (level 2+), keyed by the second path param */
  nested?: NestedSubResourceGroup[];
}

/**
 * A nested sub-resource group for methods with 2+ path params.
 * e.g. listElementColumns(workbookId, elementId) -> nested under "elements"
 * with accessor name "columns".
 */
export interface NestedSubResourceGroup {
  /** camelCase accessor name, e.g. "columns", "queries" */
  accessorName: string;
  /** The second path param name, e.g. "elementId" */
  nestedIdParam: string;
  /** Methods in this nested sub-resource group */
  methods: (OperationInfo & { methodName: string; typePrefix: string })[];
}

export const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

// ---------------------------------------------------------------------------
// Response patches config (spec/response-patches.json)
// ---------------------------------------------------------------------------

/**
 * Declares a field alias to inject into generated response types and return
 * values for a set of operations. The generated code will add `addField` to
 * the response type (copying its value from `fromField` at runtime).
 */
export interface FieldAlias {
  /** operationIds this alias applies to. */
  operationIds: string[];
  /** Name of the new field to add to the response. */
  addField: string;
  /** Name of the existing field whose value is copied into `addField`. */
  fromField: string;
  /** Human-readable explanation (emitted as a JSDoc comment). */
  description: string;
  /**
   * Optional regex pattern string that the renamed field value must match at
   * runtime.  When provided, the generated method throws a descriptive error
   * if the value does not match — e.g. if the upstream API bug is fixed and
   * the field starts returning a UUID instead of a slug.
   *
   * Keep in sync with the corresponding pattern constants in
   * `scripts/lib/response-patching.ts` and `tests/helpers/fixtures.ts`.
   *
   * Example: `"^[A-Za-z0-9]+$"`
   */
  validate?: string;
}

/**
 * Explicit overrides for operationIds that don't follow the standard
 * `verbResourceName` pattern (e.g. `filesList` instead of `listFiles`).
 *
 * When the key is a versioned operationId (e.g. `v2_1_listMembers` or
 * `v3alpha_*`), the value is used as-is with NO version suffix appended.
 * This lets us promote a newer-version endpoint to the clean canonical name
 * and demote the older endpoint to a `_v2`-suffixed name.
 */
export const METHOD_NAME_OVERRIDES: Record<string, string> = {
  // files: reversed resourceVerb pattern
  filesList: 'list',
  filesCreate: 'create',
  filesGet: 'get',
  filesUpdate: 'update',
  filesDelete: 'delete',

  // source-swap-policies: redundant resource name in CRUD methods
  createSourceSwapPolicy: 'create',
  getSourceSwapPolicy: 'get',
  updateSourceSwapPolicy: 'update',
  deleteSourceSwapPolicy: 'delete',

  // deployment-policies: redundant "Deployment" in method names
  listDeployments: 'list',
  createDeployment: 'create',
  getDeployment: 'get',
  archiveDeployment: 'archive',

  // allowed-ips: redundant "IpAllowlistEntries" in v3alpha methods
  v3alpha_listIpAllowlistEntries: 'list',
  v3alpha_createIpAllowlistEntries: 'create',
  v3alpha_deleteIpAllowlistEntries: 'delete',

  // tags: "Version" left over after stripping "Tag"
  listVersionTag: 'list',
  createVersionTag: 'create',
  updateVersionTag: 'update',
  deleteVersionTag: 'delete',
  listWorkbooksForTag: 'listWorkbooks',

  // workbooks: post* -> create*, plural delete -> singular
  postWorkbookBookmarks: 'createBookmark',
  postWorkbookSchedule: 'createSchedule',
  deleteWorkbookBookmarks: 'deleteBookmark',
  deleteWorkbookEmbeds: 'deleteEmbed',
  deleteTaggedworkbook: 'untag',

  // shared-templates: verbose operationId leaking through
  listTemplatesSharedWithYou: 'listSharedWithYou',
  deleteExternalShare: 'deleteShare',
  acceptTemplateShare: 'acceptShare',

  // grants: endpoint creates or updates, so "upsert" is more accurate
  createGrant: 'upsert',

  // webhooks: method named after resource instead of a verb
  webhooks: 'send',

  // whoami: camelCase quirk
  whoAmI: 'get',

  // ---------------------------------------------------------------------------
  // v2 → v2.1 superseding: promote the GA v2.1 endpoint to the clean canonical
  // name and demote the older v2 endpoint to a `_v2`-suffixed name.
  //
  // The v2_1_* keys use the full operationId as the key so that deriveMethodName
  // returns the value exactly (no version suffix appended — see naming.ts).
  // ---------------------------------------------------------------------------

  // members: /v2.1/members supersedes /v2/members
  v2_1_listMembers: 'list', // GA endpoint gets the clean name
  listMembers: 'list_v2', // old v2 endpoint is demoted

  // teams: /v2.1/teams supersedes /v2/teams
  v2_1_listTeams: 'list', // GA endpoint gets the clean name
  listTeams: 'list_v2', // old v2 endpoint is demoted

  // workspaces: /v2.1/workspaces supersedes /v2/workspaces
  v2_1_listWorkspaces: 'list', // GA endpoint gets the clean name
  listWorkspaces: 'list_v2', // old v2 endpoint is demoted

  // workbooks: /v2.1/workbooks/{id}/materialization-schedules supersedes v2
  v2_1_listMaterializationSchedules: 'listMaterializationSchedules', // GA
  listMaterializationSchedules: 'listMaterializationSchedules_v2', // old v2

  // workbooks: /v2.1/workbooks/{id}/schedules supersedes v2
  v2_1_listWorkbookSchedules: 'listSchedules', // GA endpoint gets the clean name
  listWorkbookSchedules: 'listSchedules_v2', // old v2 endpoint is demoted

  // workbooks: getWorkbookSchema is deprecated (no v2.1 replacement yet)
  getWorkbookSchema: 'getSchema_deprecated',
};

/**
 * Explicit overrides for the `typePrefix` used to name generated TypeScript
 * types (Query, Body, Response interfaces) for a given operationId.
 *
 * This is needed when the canonical method name (from METHOD_NAME_OVERRIDES)
 * differs from what the automatic typePrefix derivation would produce.
 *
 * For example, `listMembers` (v2) is demoted to method `list_v2`, so its
 * types should be named `List_v2_Members*` rather than `ListMembers*`.
 * And `v2_1_listMembers` (v2.1 GA) is promoted to method `list`, so its
 * types should be named `ListMembers*`.
 */
export const TYPE_PREFIX_OVERRIDES: Record<string, string> = {
  // members
  listMembers: 'List_v2_Members',
  v2_1_listMembers: 'ListMembers',

  // teams
  listTeams: 'List_v2_Teams',
  v2_1_listTeams: 'ListTeams',

  // workspaces
  listWorkspaces: 'List_v2_Workspaces',
  v2_1_listWorkspaces: 'ListWorkspaces',

  // workbooks: materialization schedules
  listMaterializationSchedules: 'List_v2_MaterializationSchedules',
  v2_1_listMaterializationSchedules: 'ListMaterializationSchedules',

  // workbooks: schedules
  listWorkbookSchedules: 'List_v2_WorkbookSchedules',
  v2_1_listWorkbookSchedules: 'ListWorkbookSchedules',

  // workbooks: deprecated schema endpoint
  getWorkbookSchema: 'GetWorkbookSchema_deprecated_',

  // grants: method renamed to upsert, align type names accordingly
  createGrant: 'UpsertGrant',
};
