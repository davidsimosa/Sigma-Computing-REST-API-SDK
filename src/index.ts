// Client
export { createSigmaClient } from './client';
export type {
  SigmaClient,
  SigmaClientConfig,
  SigmaClientConfigWithToken,
  SigmaClientConfigWithCredentials,
  SigmaServer,
} from './client';

// Errors
export { SigmaApiError } from './errors';

// Throttle retry
export type { ThrottleRetryConfig } from './retry';

// Auth types
export type {
  AuthConfig,
  StaticTokenAuth,
  ClientCredentialsAuth,
} from './auth';

// Pagination utilities
export { collectPages, PaginatedAsyncGenerator } from './pagination';
export type {
  DeepReadonly,
  PagePaginatedResponse,
  TokenPaginatedResponse,
} from './pagination';

// Resource classes, query/body interfaces, and response types
export * from './resources';

// Generated types -- re-export for consumers who need low-level access
export type { paths, operations, components } from './generated/openapi';
