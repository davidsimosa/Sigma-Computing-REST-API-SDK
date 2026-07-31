/**
 * Shared response fixture objects used across all test files.
 * Each fixture satisfies the minimal shape required by the SDK's response types.
 */
import { GRANTS_SLUG_PATTERN_STR } from '../../scripts/lib/response-patching.js';

// ---------------------------------------------------------------------------
// Common primitives
// ---------------------------------------------------------------------------
export const NOW = '2024-01-01T00:00:00.000Z';
export const ORG_ID = 'org-1';
export const MEMBER_ID = 'member-1';
export const TEAM_ID = 'team-1';
export const WORKBOOK_ID = 'workbook-1';
/** Slug format returned by the Sigma grants API in the inodeId field. */
export const WORKBOOK_URL_ID = 'bNwrAShCgMseowjZ8mMmD';

/**
 * Matches the URL slug format Sigma returns in the grants API `inodeId` field.
 * Derived from {@link GRANTS_SLUG_PATTERN_STR} in scripts/lib/response-patching.ts.
 */
export const SLUG_PATTERN = new RegExp(GRANTS_SLUG_PATTERN_STR);
/** Matches a standard UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx). */
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const WORKSPACE_ID = 'workspace-1';
export const CONNECTION_ID = 'connection-1';
export const DATA_MODEL_ID = 'data-model-1';
export const DATASET_ID = 'dataset-1';
export const GRANT_ID = 'grant-1';
export const FILE_ID = 'file-1';
export const TAG_ID = 'tag-1';
export const REPORT_ID = 'report-1';
export const TENANT_ID = 'tenant-1';
export const TEMPLATE_ID = 'template-1';
export const POLICY_ID = 'policy-1';
export const UA_ID = 'ua-1';
export const PAGE_ID = 'page-1';
export const ELEMENT_ID = 'element-1';
export const SCHEDULE_ID = 'schedule-1';
export const BOOKMARK_ID = 'bookmark-1';
export const EMBED_ID = 'embed-1';
export const QUERY_ID = 'query-1';
export const PATH_ID = 'path-1';
export const SAML_SP_ID = 'saml-sp-1';
export const SAML_CERT_ID = 'saml-cert-1';
export const SHARE_ID = 'share-1';
export const SWAP_POLICY_ID = 'swap-policy-1';
export const ACCOUNT_TYPE_ID = 'account-type-1';
export const MATERIALIZATION_ID = 'mat-1';
export const MAT_SCHEDULE_ID = 'mat-sched-1';

// ---------------------------------------------------------------------------
// Member fixture
// ---------------------------------------------------------------------------
export const memberFixture = {
  organizationId: ORG_ID,
  memberId: MEMBER_ID,
  memberType: 'viewer',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  profileImgUrl: null,
  createdBy: MEMBER_ID,
  updatedBy: MEMBER_ID,
  createdAt: NOW,
  updatedAt: NOW,
  homeFolderId: 'folder-1',
  userKind: 'internal',
};

export const memberListFixture = {
  entries: [memberFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Team fixture
// ---------------------------------------------------------------------------
export const teamFixture = {
  organizationId: ORG_ID,
  teamId: TEAM_ID,
  name: 'Data Team',
  description: null,
  createdBy: MEMBER_ID,
  updatedBy: MEMBER_ID,
  createdAt: NOW,
  updatedAt: NOW,
  // members is a real response field — must not be overwritten by the
  // membersResource sub-resource accessor during hydration
  members: [MEMBER_ID],
};

export const teamListFixture = {
  entries: [teamFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Workbook fixture
// ---------------------------------------------------------------------------
export const workbookFixture = {
  workbookId: WORKBOOK_ID,
  workbookUrlId: 'wb-url-1',
  name: 'My Workbook',
  description: null,
  createdBy: MEMBER_ID,
  updatedBy: MEMBER_ID,
  createdAt: NOW,
  updatedAt: NOW,
  path: '/My Documents',
  latestVersion: 1,
  isArchived: false,
  ownerId: MEMBER_ID,
  badge: null,
  // tags is a real response field — must not be overwritten by the
  // tagsResource sub-resource accessor during hydration
  tags: [{ tagName: 'v1.0', tagId: TAG_ID }],
};

export const workbookListFixture = {
  entries: [workbookFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Grant fixture
// ---------------------------------------------------------------------------
// The Sigma grants API returns the URL slug (not the UUID) in the inodeId
// field. The SDK renames this to urlId and removes inodeId from the response.
export const grantFixture = {
  grantId: GRANT_ID,
  inodeId: WORKBOOK_URL_ID,
  organizationId: ORG_ID,
  memberId: MEMBER_ID,
  teamId: null,
  permission: 'view' as const,
  createdBy: MEMBER_ID,
  updatedBy: MEMBER_ID,
  createdAt: NOW,
  updatedAt: NOW,
  inodeType: 'workbook' as const,
};

export const grantListFixture = {
  entries: [grantFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Connection fixture
// ---------------------------------------------------------------------------
export const connectionFixture = {
  connectionId: CONNECTION_ID,
  organizationId: ORG_ID,
  name: 'My Connection',
  type: 'snowflake',
  createdBy: MEMBER_ID,
  updatedBy: MEMBER_ID,
  createdAt: NOW,
  updatedAt: NOW,
  isArchived: false,
  lastActiveAt: NOW,
  account: 'my-account',
};

export const connectionListFixture = {
  entries: [connectionFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Data model fixture
// ---------------------------------------------------------------------------
export const dataModelFixture = {
  dataModelId: DATA_MODEL_ID,
  organizationId: ORG_ID,
  name: 'My Data Model',
  createdBy: MEMBER_ID,
  updatedBy: MEMBER_ID,
  createdAt: NOW,
  updatedAt: NOW,
  isArchived: false,
  path: '/My Documents',
  // tags is a real response field — must not be overwritten by the
  // tagsResource sub-resource accessor during hydration
  tags: [{ tagName: 'v1.0', tagId: TAG_ID }],
};

export const dataModelListFixture = {
  entries: [dataModelFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Dataset fixture
// ---------------------------------------------------------------------------
export const datasetFixture = {
  datasetId: DATASET_ID,
  organizationId: ORG_ID,
  name: 'My Dataset',
  createdBy: MEMBER_ID,
  updatedBy: MEMBER_ID,
  createdAt: NOW,
  updatedAt: NOW,
  isArchived: false,
};

export const datasetListFixture = {
  entries: [datasetFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// File fixture
// ---------------------------------------------------------------------------
export const fileFixture = {
  id: FILE_ID,
  urlId: 'file-url-1',
  name: 'My File',
  type: 'workbook' as const,
  parentId: 'folder-1',
  parentUrlId: 'folder-url-1',
  path: '/My Documents',
  badge: null,
  isArchived: false,
  createdBy: MEMBER_ID,
  updatedBy: MEMBER_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

export const fileListFixture = {
  entries: [fileFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Workspace fixture
// ---------------------------------------------------------------------------
export const workspaceFixture = {
  workspaceId: WORKSPACE_ID,
  organizationId: ORG_ID,
  name: 'My Workspace',
  description: null,
  createdBy: MEMBER_ID,
  updatedBy: MEMBER_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

export const workspaceListFixture = {
  entries: [workspaceFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Tag fixture
// ---------------------------------------------------------------------------
export const tagFixture = {
  tagId: TAG_ID,
  versionTagId: TAG_ID,
  organizationId: ORG_ID,
  name: 'v1.0',
  description: null,
  createdBy: MEMBER_ID,
  updatedBy: MEMBER_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

export const tagListFixture = {
  entries: [tagFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Report fixture
// ---------------------------------------------------------------------------
export const reportFixture = {
  reportId: REPORT_ID,
  organizationId: ORG_ID,
  name: 'My Report',
  createdBy: MEMBER_ID,
  updatedBy: MEMBER_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

export const reportListFixture = {
  entries: [reportFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Tenant fixture
// ---------------------------------------------------------------------------
export const tenantFixture = {
  tenantOrganizationId: TENANT_ID,
  organizationId: ORG_ID,
  name: 'My Tenant',
  createdBy: MEMBER_ID,
  updatedBy: MEMBER_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

export const tenantListFixture = {
  entries: [tenantFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Template fixture
// ---------------------------------------------------------------------------
export const templateFixture = {
  templateId: TEMPLATE_ID,
  organizationId: ORG_ID,
  name: 'My Template',
  createdBy: MEMBER_ID,
  updatedBy: MEMBER_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

export const templateListFixture = {
  entries: [templateFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Deployment policy fixture
// ---------------------------------------------------------------------------
export const deploymentPolicyFixture = {
  deploymentPolicyId: POLICY_ID,
  organizationId: ORG_ID,
  name: 'My Policy',
  createdBy: MEMBER_ID,
  updatedBy: MEMBER_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

export const deploymentPolicyListFixture = {
  entries: [deploymentPolicyFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// User attribute fixture
// ---------------------------------------------------------------------------
export const userAttributeFixture = {
  userAttributeId: UA_ID,
  organizationId: ORG_ID,
  name: 'region',
  type: 'text',
  defaultValue: null,
  createdBy: MEMBER_ID,
  updatedBy: MEMBER_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

export const userAttributeListFixture = {
  entries: [userAttributeFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Account type fixture
// ---------------------------------------------------------------------------
export const accountTypeFixture = {
  accountTypeId: ACCOUNT_TYPE_ID,
  accountTypeName: 'Custom Viewer',
  description: 'A custom viewer account type',
  isCustom: true,
};

export const accountTypeListFixture = {
  entries: [accountTypeFixture],
  nextPageToken: undefined,
};

// ---------------------------------------------------------------------------
// Page / element / column fixtures (workbook sub-resources)
// ---------------------------------------------------------------------------
export const pageFixture = {
  pageId: PAGE_ID,
  workbookId: WORKBOOK_ID,
  name: 'Page 1',
  createdAt: NOW,
  updatedAt: NOW,
};

export const pageListFixture = {
  entries: [pageFixture],
  nextPage: null,
  total: 1,
};

export const elementFixture = {
  elementId: ELEMENT_ID,
  workbookId: WORKBOOK_ID,
  pageId: PAGE_ID,
  name: 'Table 1',
  type: 'table',
  createdAt: NOW,
  updatedAt: NOW,
};

export const elementListFixture = {
  entries: [elementFixture],
  nextPage: null,
  total: 1,
};

export const columnFixture = {
  columnId: 'col-1',
  name: 'Revenue',
  type: 'number',
};

export const columnListFixture = {
  entries: [columnFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Schedule fixture
// ---------------------------------------------------------------------------
export const scheduleFixture = {
  scheduledNotificationId: SCHEDULE_ID,
  workbookId: WORKBOOK_ID,
  schedule: { cronSpec: '0 9 * * *', timezone: 'UTC' },
  configV2: {
    title: 'Daily Export',
    messageBody: '',
    notificationAttachments: [],
    target: [],
  },
  createdBy: MEMBER_ID,
  updatedBy: MEMBER_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

export const scheduleListFixture = {
  entries: [scheduleFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Bookmark fixture
// ---------------------------------------------------------------------------
export const bookmarkFixture = {
  bookmarkId: BOOKMARK_ID,
  workbookId: WORKBOOK_ID,
  name: 'My Bookmark',
  createdBy: MEMBER_ID,
  updatedBy: MEMBER_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

export const bookmarkListFixture = {
  entries: [bookmarkFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Embed fixture
// ---------------------------------------------------------------------------
export const embedFixture = {
  embedId: EMBED_ID,
  workbookId: WORKBOOK_ID,
  name: 'My Embed',
  createdBy: MEMBER_ID,
  updatedBy: MEMBER_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

export const embedListFixture = {
  entries: [embedFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Connection path fixture
// ---------------------------------------------------------------------------
export const connectionPathFixture = {
  connectionPathId: PATH_ID,
  connectionId: CONNECTION_ID,
  path: ['MY_DB', 'PUBLIC', 'MY_TABLE'],
  createdAt: NOW,
  updatedAt: NOW,
};

export const connectionPathListFixture = {
  entries: [connectionPathFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// SAML fixture
// ---------------------------------------------------------------------------
export const samlSpFixture = {
  samlServiceProviderId: SAML_SP_ID,
  organizationId: ORG_ID,
  name: 'My SAML SP',
  createdAt: NOW,
  updatedAt: NOW,
};

export const samlSpListFixture = {
  entries: [samlSpFixture],
  nextPage: null,
  total: 1,
};

export const samlCertFixture = {
  samlServiceProviderCertificateId: SAML_CERT_ID,
  samlServiceProviderId: SAML_SP_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

export const samlCertListFixture = {
  entries: [samlCertFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Source swap policy fixture
// ---------------------------------------------------------------------------
export const sourceSwapPolicyFixture = {
  policyId: SWAP_POLICY_ID,
  organizationId: ORG_ID,
  name: 'My Swap Policy',
  createdBy: MEMBER_ID,
  updatedBy: MEMBER_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

export const sourceSwapPolicyListFixture = {
  entries: [sourceSwapPolicyFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Materialization fixture
// ---------------------------------------------------------------------------
export const materializationFixture = {
  materializationId: MATERIALIZATION_ID,
  status: 'completed',
  createdAt: NOW,
  updatedAt: NOW,
};

export const matScheduleFixture = {
  scheduleId: MAT_SCHEDULE_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

export const matScheduleListFixture = {
  entries: [matScheduleFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Whoami fixture
// ---------------------------------------------------------------------------
export const whoamiFixture = {
  userId: MEMBER_ID,
  organizationId: ORG_ID,
};

// ---------------------------------------------------------------------------
// Favorites fixture
// ---------------------------------------------------------------------------
export const favoriteFixture = {
  inodeId: WORKBOOK_ID,
  memberId: MEMBER_ID,
  createdAt: NOW,
};

export const favoriteListFixture = {
  entries: [favoriteFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Inode fixture (accessible / recent / favorite inodes)
// ---------------------------------------------------------------------------
export const inodeFixture = {
  id: FILE_ID,
  urlId: 'file-url-1',
  name: 'My Workbook',
  type: 'workbook' as const,
  parentId: 'folder-1',
  parentUrlId: 'folder-url-1',
  permission: 'view' as const,
  path: '/My Documents',
  badge: null,
  isArchived: false,
  createdBy: MEMBER_ID,
  updatedBy: MEMBER_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

export const inodeListFixture = {
  entries: [inodeFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Translation fixture
// ---------------------------------------------------------------------------
export const translationFixture = {
  lng: 'es',
  translations: { hello: 'hola' },
};

export const localeListFixture = {
  entries: [{ lng: 'es' }],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Credentials fixture
// ---------------------------------------------------------------------------
export const credentialsFixture = {
  clientId: 'cred-client-1',
  clientSecret: 'cred-secret-1',
  createdAt: NOW,
};

// ---------------------------------------------------------------------------
// Query download fixture
// ---------------------------------------------------------------------------
export const queryDownloadFixture = {
  queryId: QUERY_ID,
  status: 'completed',
  url: 'https://example.com/download',
};

// ---------------------------------------------------------------------------
// Webhook fixture
// ---------------------------------------------------------------------------
export const webhookResponseFixture = {
  success: true,
};

// ---------------------------------------------------------------------------
// Shared template fixture
// ---------------------------------------------------------------------------
export const sharedTemplateFixture = {
  shareId: SHARE_ID,
  templateId: TEMPLATE_ID,
  organizationId: ORG_ID,
  createdAt: NOW,
};

export const sharedTemplateListFixture = {
  entries: [sharedTemplateFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// IP allowlist fixture
// ---------------------------------------------------------------------------
export const ipAllowlistFixture = {
  entries: [{ id: 'ip-1', cidr: '192.168.1.0/24', description: 'Office' }],
  nextPageToken: null,
};

// ---------------------------------------------------------------------------
// Auth token fixture
// ---------------------------------------------------------------------------
export const authTokenFixture = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  token_type: 'Bearer',
  expires_in: 3600,
};

// ---------------------------------------------------------------------------
// Lineage fixture
// ---------------------------------------------------------------------------
export const lineageFixture = {
  entries: [{ nodeId: 'node-1', type: 'workbook' }],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Source fixture
// ---------------------------------------------------------------------------
export const sourceFixture = {
  entries: [{ sourceId: 'src-1', name: 'My Source', type: 'connection' }],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Data model spec fixture
// ---------------------------------------------------------------------------
export const dataModelSpecFixture = {
  spec: { version: '1', elements: [] },
};

// ---------------------------------------------------------------------------
// Team member fixture
// ---------------------------------------------------------------------------
export const teamMemberListFixture = {
  entries: [{ memberId: MEMBER_ID, teamId: TEAM_ID }],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// User attribute assignment fixtures
// ---------------------------------------------------------------------------
export const uaTeamAssignmentListFixture = {
  entries: [{ userAttributeId: UA_ID, teamId: TEAM_ID, value: 'us-east' }],
  nextPage: null,
  total: 1,
};

export const uaTenantAssignmentListFixture = {
  entries: [
    {
      userAttributeId: UA_ID,
      tenantOrganizationId: TENANT_ID,
      value: 'us-east',
    },
  ],
  nextPage: null,
  total: 1,
};

export const uaUserAssignmentListFixture = {
  entries: [{ userAttributeId: UA_ID, userId: MEMBER_ID, value: 'us-east' }],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Deployment capability fixture
// ---------------------------------------------------------------------------
export const deploymentCapabilityListFixture = {
  entries: [{ capability: 'workbooks' }],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Inode deployment fixture
// ---------------------------------------------------------------------------
export const inodeDeploymentListFixture = {
  entries: [{ inodeId: WORKBOOK_ID, deploymentPolicyId: POLICY_ID }],
  nextPage: null,
  total: 1,
};

export const tenantDeploymentListFixture = {
  entries: [{ tenantOrganizationId: TENANT_ID, deploymentPolicyId: POLICY_ID }],
  nextPage: null,
  total: 1,
};

export const deployableTenantListFixture = {
  entries: [tenantFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Connection grant fixture
// ---------------------------------------------------------------------------
export const connectionGrantFixture = {
  grantId: GRANT_ID,
  connectionId: CONNECTION_ID,
  organizationId: ORG_ID,
  memberId: MEMBER_ID,
  teamId: null,
  permission: 'usage' as const,
  createdAt: NOW,
  updatedAt: NOW,
};

export const connectionGrantListFixture = {
  entries: [connectionGrantFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Connection path grant fixture
// ---------------------------------------------------------------------------
export const connectionPathGrantFixture = {
  grantId: GRANT_ID,
  connectionPathId: PATH_ID,
  organizationId: ORG_ID,
  memberId: MEMBER_ID,
  teamId: null,
  permission: 'usage' as const,
  createdAt: NOW,
  updatedAt: NOW,
};

export const connectionPathGrantListFixture = {
  entries: [connectionPathGrantFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Table column fixture
// ---------------------------------------------------------------------------
export const tableColumnListFixture = {
  entries: [{ columnId: 'col-1', name: 'id', type: 'number' }],
  nextPageToken: null,
};

// ---------------------------------------------------------------------------
// Workspace grant fixture
// ---------------------------------------------------------------------------
export const workspaceGrantFixture = {
  grantId: GRANT_ID,
  workspaceId: WORKSPACE_ID,
  organizationId: ORG_ID,
  memberId: MEMBER_ID,
  teamId: null,
  permission: 'view' as const,
  createdAt: NOW,
  updatedAt: NOW,
};

export const workspaceGrantListFixture = {
  entries: [workspaceGrantFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Dataset grant fixture
// ---------------------------------------------------------------------------
export const datasetGrantFixture = {
  grantId: GRANT_ID,
  datasetId: DATASET_ID,
  organizationId: ORG_ID,
  memberId: MEMBER_ID,
  teamId: null,
  permission: 'view' as const,
  createdAt: NOW,
  updatedAt: NOW,
};

export const datasetGrantListFixture = {
  entries: [datasetGrantFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Workbook grant fixture
// ---------------------------------------------------------------------------
export const workbookGrantFixture = {
  grantId: GRANT_ID,
  inodeId: WORKBOOK_ID,
  organizationId: ORG_ID,
  memberId: MEMBER_ID,
  teamId: null,
  permission: 'view' as const,
  createdAt: NOW,
  updatedAt: NOW,
  inodeType: 'workbook' as const,
};

// ---------------------------------------------------------------------------
// Account type permissions fixture
// ---------------------------------------------------------------------------
export const accountTypePermissionsFixture = [
  { permission: 'view', description: 'Can view content' },
  { permission: 'edit', description: 'Can edit content' },
];

// ---------------------------------------------------------------------------
// Report schedule fixture
// ---------------------------------------------------------------------------
export const reportScheduleFixture = {
  scheduledNotificationId: SCHEDULE_ID,
  reportId: REPORT_ID,
  schedule: { cronSpec: '0 9 * * *', timezone: 'UTC' },
  configV2: {
    title: 'Daily Report',
    messageBody: '',
    notificationAttachments: [],
    target: [],
  },
  createdBy: MEMBER_ID,
  updatedBy: MEMBER_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

export const reportScheduleListFixture = {
  entries: [reportScheduleFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Member schedule fixture
// ---------------------------------------------------------------------------
export const memberScheduleListFixture = {
  entries: [scheduleFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Member teams fixture
// ---------------------------------------------------------------------------
export const memberTeamListFixture = {
  entries: [teamFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Team UA assignments fixture
// ---------------------------------------------------------------------------
export const teamUaAssignmentListFixture = {
  entries: [{ userAttributeId: UA_ID, teamId: TEAM_ID, value: 'us-east' }],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Controls / queries fixtures
// ---------------------------------------------------------------------------
export const controlListFixture = {
  entries: [{ controlId: 'ctrl-1', name: 'Date Filter' }],
  nextPage: null,
  total: 1,
};

export const workbookQueryListFixture = {
  entries: [{ queryId: QUERY_ID, elementId: ELEMENT_ID }],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Version history fixture
// ---------------------------------------------------------------------------
export const versionHistoryListFixture = {
  entries: [{ version: 1, createdAt: NOW, createdBy: MEMBER_ID }],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Workbook sources fixture
// ---------------------------------------------------------------------------
export const workbookSourcesFixture = [
  {
    type: 'data-model' as const,
    dataModelId: 'dm-1',
    elementIds: ['el-1', 'el-2'],
    versionTagId: 'tag-1',
  },
  { type: 'dataset' as const, inodeId: 'inode-1' },
  { type: 'table' as const, inodeId: 'inode-2' },
  {
    type: 'custom-sql' as const,
    connectionId: CONNECTION_ID,
    definition: 'SELECT 1',
    customSqlId: 'csql-1',
  },
];

// ---------------------------------------------------------------------------
// Workbook schema (deprecated) fixture
// ---------------------------------------------------------------------------
export const workbookSchemaFixture = {
  schema: {},
};

// ---------------------------------------------------------------------------
// Materialization schedule fixture (workbook)
// ---------------------------------------------------------------------------
export const workbookMatScheduleListFixture = {
  entries: [matScheduleFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Element query fixture
// ---------------------------------------------------------------------------
export const elementQueryFixture = {
  elementId: ELEMENT_ID,
  sql: 'SELECT 1',
};

// ---------------------------------------------------------------------------
// Lineage tree fixture
// ---------------------------------------------------------------------------
export const lineageTreeFixture = {
  entries: [{ nodeId: 'node-1', type: 'workbook', name: 'My Workbook' }],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Data model columns fixture
// ---------------------------------------------------------------------------
export const dataModelColumnListFixture = {
  entries: [{ columnId: 'col-1', name: 'Revenue', type: 'number' }],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Data model elements fixture
// ---------------------------------------------------------------------------
export const dataModelElementListFixture = {
  entries: [{ elementId: ELEMENT_ID, name: 'Revenue Table' }],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Data model sources fixture
// ---------------------------------------------------------------------------
export const dataModelSourceListFixture = {
  entries: [{ sourceId: 'src-1', name: 'My Connection' }],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Data model tags fixture
// ---------------------------------------------------------------------------
export const dataModelTagListFixture = {
  entries: [tagFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Dataset materialization fixture
// ---------------------------------------------------------------------------
export const datasetMaterializationListFixture = {
  entries: [materializationFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Dataset sources fixture
// ---------------------------------------------------------------------------
export const datasetSourcesFixture = [
  { type: 'dataset' as const, inodeId: 'inode-1' },
  { type: 'table' as const, inodeId: 'inode-2' },
];

// ---------------------------------------------------------------------------
// Tag workbooks fixture
// ---------------------------------------------------------------------------
export const tagWorkbookListFixture = {
  entries: [workbookFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Workbook tags fixture
// ---------------------------------------------------------------------------
export const workbookTagListFixture = {
  entries: [tagFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Workbook tagged bookmarks fixture
// ---------------------------------------------------------------------------
export const taggedBookmarkListFixture = {
  entries: [bookmarkFixture],
  nextPage: null,
  total: 1,
};

// ---------------------------------------------------------------------------
// Report sources fixture
// ---------------------------------------------------------------------------
export const reportSourcesFixture = [
  {
    type: 'data-model' as const,
    dataModelId: 'dm-1',
    elementIds: ['el-1'],
  },
  {
    type: 'custom-sql' as const,
    connectionId: CONNECTION_ID,
    definition: 'SELECT 2',
    customSqlId: 'csql-2',
  },
];

// ---------------------------------------------------------------------------
// Tenant workbook fixture
// ---------------------------------------------------------------------------
export const tenantWorkbookFixture = {
  workbookId: WORKBOOK_ID,
  name: 'Tenant Workbook',
};

// ---------------------------------------------------------------------------
// Lookup connection fixture
// ---------------------------------------------------------------------------
export const lookupConnectionFixture = {
  connectionId: CONNECTION_ID,
  path: ['MY_DB', 'PUBLIC', 'MY_TABLE'],
};

// ---------------------------------------------------------------------------
// Connection inode path fixture
// ---------------------------------------------------------------------------
export const connectionInodePathFixture = {
  connectionPathId: PATH_ID,
  connectionId: CONNECTION_ID,
  path: ['MY_DB', 'PUBLIC'],
};

// ---------------------------------------------------------------------------
// Sync path fixture
// ---------------------------------------------------------------------------
export const syncPathFixture = {
  success: true,
};

// ---------------------------------------------------------------------------
// Test connection fixture
// ---------------------------------------------------------------------------
export const testConnectionFixture = {
  success: true,
};

// ---------------------------------------------------------------------------
// API connector fixtures
// ---------------------------------------------------------------------------
export const API_CONNECTOR_ID = 'api-connector-1';
export const API_CREDENTIAL_ID = 'api-credential-1';

export const apiConnectorFixture = {
  apiConnectorId: API_CONNECTOR_ID,
  name: 'My Connector',
  description: 'A test connector',
  params: {
    method: 'GET',
    url: 'https://api.example.com/data',
    headers: [],
    pathParams: [],
    queryParams: [],
    body: '',
    bodyParams: [],
  },
  config: {
    timeout: { requestSec: 30 },
    retry: { maxRetries: 3, retryableStatusCodes: [429, 503] },
    redirects: { maxRedirects: 5 },
    rateLimit: { maxRequestsPerWindow: 100 },
  },
  authId: null,
  createdBy: MEMBER_ID,
  updatedBy: MEMBER_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

export const apiConnectorListFixture = {
  entries: [
    {
      apiConnectorId: API_CONNECTOR_ID,
      name: 'My Connector',
      description: 'A test connector',
    },
  ],
  nextPageToken: undefined,
};

// ---------------------------------------------------------------------------
// API credential fixtures
// ---------------------------------------------------------------------------
export const apiCredentialFixture = {
  apiCredentialId: API_CREDENTIAL_ID,
  name: 'My Credential',
  authMethod: 'bearer',
  allowlist: ['*.example.com'],
  credential: { authMethod: 'bearer' },
  createdBy: MEMBER_ID,
  updatedBy: MEMBER_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

export const apiCredentialListFixture = {
  entries: [
    {
      apiCredentialId: API_CREDENTIAL_ID,
      name: 'My Credential',
      authMethod: 'bearer',
      allowlist: ['*.example.com'],
    },
  ],
  nextPageToken: undefined,
};

// ---------------------------------------------------------------------------
// Workbook spec fixture
// ---------------------------------------------------------------------------
export const workbookSpecFixture = {
  workbookId: WORKBOOK_ID,
  spec: 'pages:\n  - name: Page 1\n',
};
