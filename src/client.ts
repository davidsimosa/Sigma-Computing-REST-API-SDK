import createClient, { type Client } from 'openapi-fetch';
import type { paths } from './generated/openapi';
import {
  createAuthMiddleware,
  type AuthConfig,
  type ClientCredentialsAuth,
  type StaticTokenAuth,
} from './auth';
import { createResilientFetch, type ThrottleRetryConfig } from './retry';
import { AccountTypesResource } from './resources/account-types';
import { AllowedIpsResource } from './resources/allowed-ips';
import { ApiConnectorsResource } from './resources/api-connectors';
import { ApiCredentialsResource } from './resources/api-credentials';
import { AuthResource } from './resources/auth';
import { ConnectionsResource } from './resources/connections';
import { CredentialsResource } from './resources/credentials';
import { DataModelsResource } from './resources/data-models';
import { DatasetsResource } from './resources/datasets';
import { DeploymentPoliciesResource } from './resources/deployment-policies';
import { FavoritesResource } from './resources/favorites';
import { FilesResource } from './resources/files';
import { GrantsResource } from './resources/grants';
import { MembersResource } from './resources/members';
import { OrganizationsResource } from './resources/organizations';
import { QueryResource } from './resources/query';
import { ReportsResource } from './resources/reports';
import { SamlResource } from './resources/saml';
import { SharedTemplatesResource } from './resources/shared-templates';
import { SourceSwapPoliciesResource } from './resources/source-swap-policies';
import { TagsResource } from './resources/tags';
import { TeamsResource } from './resources/teams';
import { TemplatesResource } from './resources/templates';
import { TenantsResource } from './resources/tenants';
import { TranslationsResource } from './resources/translations';
import { UserAttributesResource } from './resources/user-attributes';
import { WebhooksResource } from './resources/webhooks';
import { WhoamiResource } from './resources/whoami';
import { WorkbooksResource } from './resources/workbooks';
import { WorkspacesResource } from './resources/workspaces';

/**
 * Known Sigma Computing API server URLs.
 * Use the one that matches the cloud region your organization is hosted in.
 */
export type SigmaServer =
  | 'https://api.sigmacomputing.com' // GCP (US)
  | 'https://api.sa.gcp.sigmacomputing.com' // GCP (KSA)
  | 'https://aws-api.sigmacomputing.com' // AWS US (West)
  | 'https://api.us-a.aws.sigmacomputing.com' // AWS US (East)
  | 'https://api.ca.aws.sigmacomputing.com' // AWS Canada
  | 'https://api.eu.aws.sigmacomputing.com' // AWS Europe
  | 'https://api.au.aws.sigmacomputing.com' // AWS Australia / APAC
  | 'https://api.uk.aws.sigmacomputing.com' // AWS UK
  | 'https://api.us.azure.sigmacomputing.com' // Azure US
  | 'https://api.eu.azure.sigmacomputing.com' // Azure Europe
  | 'https://api.ca.azure.sigmacomputing.com' // Azure Canada
  | 'https://api.uk.azure.sigmacomputing.com'; // Azure UK

/**
 * Configuration for creating a Sigma API client with a static access token.
 */
export interface SigmaClientConfigWithToken {
  /** The base URL of the Sigma API server for your region. */
  baseUrl: SigmaServer | (string & {});
  /** A pre-obtained access token. */
  accessToken: string;
  /** Retry configuration for 429 Too Many Requests responses. */
  throttleRetry?: ThrottleRetryConfig;
}

/**
 * Configuration for creating a Sigma API client with OAuth2 client credentials.
 * The client will automatically obtain and refresh access tokens.
 */
export interface SigmaClientConfigWithCredentials {
  /** The base URL of the Sigma API server for your region. */
  baseUrl: SigmaServer | (string & {});
  /** Your Sigma API client ID. */
  clientId: string;
  /** Your Sigma API client secret. */
  clientSecret: string;
  /** Retry configuration for 429 Too Many Requests responses. */
  throttleRetry?: ThrottleRetryConfig;
}

export type SigmaClientConfig =
  SigmaClientConfigWithToken | SigmaClientConfigWithCredentials;

/**
 * The Sigma Computing API client with resource-based access to all endpoints.
 */
export interface SigmaClient {
  /** Account types and permissions. */
  accountTypes: AccountTypesResource;
  /** IP allowlist management (v3alpha). */
  allowedIps: AllowedIpsResource;
  /** API connectors for Call API actions. */
  apiConnectors: ApiConnectorsResource;
  /** API credentials for API connectors. */
  apiCredentials: ApiCredentialsResource;
  /** Authentication token management. */
  auth: AuthResource;
  /** Database connections. */
  connections: ConnectionsResource;
  /** API credential management. */
  credentials: CredentialsResource;
  /** Data models. */
  dataModels: DataModelsResource;
  /** Datasets. */
  datasets: DatasetsResource;
  /** Deployment policies. */
  deploymentPolicies: DeploymentPoliciesResource;
  /** Favorites management. */
  favorites: FavoritesResource;
  /** File/inode operations. */
  files: FilesResource;
  /** Permission grants. */
  grants: GrantsResource;
  /** Organization members. */
  members: MembersResource;
  /** Organization settings. */
  organizations: OrganizationsResource;
  /** Query downloads. */
  query: QueryResource;
  /** Reports. */
  reports: ReportsResource;
  /** SAML service provider management. */
  saml: SamlResource;
  /** Shared templates. */
  sharedTemplates: SharedTemplatesResource;
  /** Source swap policies. */
  sourceSwapPolicies: SourceSwapPoliciesResource;
  /** Tags. */
  tags: TagsResource;
  /** Teams. */
  teams: TeamsResource;
  /** Templates. */
  templates: TemplatesResource;
  /** Tenant (embedded) organizations. */
  tenants: TenantsResource;
  /** Organization translations. */
  translations: TranslationsResource;
  /** User attributes. */
  userAttributes: UserAttributesResource;
  /** Webhooks. */
  webhooks: WebhooksResource;
  /** Current user info. */
  whoami: WhoamiResource;
  /** Workbooks. */
  workbooks: WorkbooksResource;
  /** Workspaces. */
  workspaces: WorkspacesResource;
  /** The underlying openapi-fetch client for advanced/raw usage. */
  raw: Client<paths>;
}

/**
 * Creates a Sigma Computing API client with resource-based access.
 *
 * @example Static access token
 * ```ts
 * const sigma = createSigmaClient({
 *   baseUrl: "https://api.sigmacomputing.com",
 *   accessToken: "my-access-token",
 * });
 *
 * const workbooks = await sigma.workbooks.list({ limit: 50 });
 * ```
 *
 * @example Auto-managed OAuth2 credentials
 * ```ts
 * const sigma = createSigmaClient({
 *   baseUrl: "https://api.sigmacomputing.com",
 *   clientId: "my-client-id",
 *   clientSecret: "my-client-secret",
 * });
 *
 * const me = await sigma.whoami.get();
 * ```
 *
 * @example Custom throttle retry settings
 * ```ts
 * const sigma = createSigmaClient({
 *   baseUrl: "https://api.sigmacomputing.com",
 *   clientId: "my-client-id",
 *   clientSecret: "my-client-secret",
 *   throttleRetry: { maxRetries: 5, baseDelayMs: 500, maxDelayMs: 10_000, maxConcurrentFetches: 25 },
 * });
 * ```
 */
export function createSigmaClient(config: SigmaClientConfig): SigmaClient {
  const { baseUrl, throttleRetry, ...rest } = config;

  let normalizedBaseUrl = baseUrl;
  while (normalizedBaseUrl.endsWith('/')) {
    normalizedBaseUrl = normalizedBaseUrl.slice(0, -1);
  }

  const retryingFetch = createResilientFetch(throttleRetry);

  const httpClient = createClient<paths>({
    baseUrl: normalizedBaseUrl,
    fetch: retryingFetch,
  });

  let authConfig: AuthConfig;
  if ('accessToken' in rest) {
    authConfig = { accessToken: rest.accessToken } satisfies StaticTokenAuth;
  } else {
    authConfig = {
      clientId: rest.clientId,
      clientSecret: rest.clientSecret,
    } satisfies ClientCredentialsAuth;
  }

  httpClient.use(createAuthMiddleware(baseUrl, authConfig, retryingFetch));

  return {
    accountTypes: new AccountTypesResource(httpClient),
    allowedIps: new AllowedIpsResource(httpClient),
    apiConnectors: new ApiConnectorsResource(httpClient),
    apiCredentials: new ApiCredentialsResource(httpClient),
    auth: new AuthResource(httpClient),
    connections: new ConnectionsResource(httpClient),
    credentials: new CredentialsResource(httpClient),
    dataModels: new DataModelsResource(httpClient),
    datasets: new DatasetsResource(httpClient),
    deploymentPolicies: new DeploymentPoliciesResource(httpClient),
    favorites: new FavoritesResource(httpClient),
    files: new FilesResource(httpClient),
    grants: new GrantsResource(httpClient),
    members: new MembersResource(httpClient),
    organizations: new OrganizationsResource(httpClient),
    query: new QueryResource(httpClient),
    reports: new ReportsResource(httpClient),
    saml: new SamlResource(httpClient),
    sharedTemplates: new SharedTemplatesResource(httpClient),
    sourceSwapPolicies: new SourceSwapPoliciesResource(httpClient),
    tags: new TagsResource(httpClient),
    teams: new TeamsResource(httpClient),
    templates: new TemplatesResource(httpClient),
    tenants: new TenantsResource(httpClient),
    translations: new TranslationsResource(httpClient),
    userAttributes: new UserAttributesResource(httpClient),
    webhooks: new WebhooksResource(httpClient),
    whoami: new WhoamiResource(httpClient),
    workbooks: new WorkbooksResource(httpClient),
    workspaces: new WorkspacesResource(httpClient),
    raw: httpClient,
  };
}
