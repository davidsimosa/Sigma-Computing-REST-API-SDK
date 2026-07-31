import type { Middleware } from 'openapi-fetch';
import { SigmaApiError } from './errors';
import type { ResilientFetch } from './retry';

/**
 * Configuration for static bearer token authentication.
 */
export interface StaticTokenAuth {
  accessToken: string;
}

/**
 * Configuration for OAuth2 client credentials authentication.
 * The SDK will automatically fetch and refresh access tokens.
 */
export interface ClientCredentialsAuth {
  clientId: string;
  clientSecret: string;
}

export type AuthConfig = StaticTokenAuth | ClientCredentialsAuth;

function isClientCredentials(
  config: AuthConfig,
): config is ClientCredentialsAuth {
  return 'clientId' in config && 'clientSecret' in config;
}

interface TokenState {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Fetches an access token using client credentials (Basic Auth).
 */
async function fetchToken(
  baseUrl: string,
  clientId: string,
  clientSecret: string,
  fetchFn: ResilientFetch = fetch,
): Promise<TokenState> {
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const response = await fetchFn(`${baseUrl}/v2/auth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new SigmaApiError(
      {
        message: `Failed to fetch access token: ${response.status} ${response.statusText} - ${body}`,
      },
      response,
    );
  }

  const data = (await response.json()) as TokenResponse;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    // Expire 60s early to avoid edge-case failures
    expiresAt: Date.now() + data.expires_in * 1000 - 60_000,
  };
}

/**
 * Refreshes an access token using a refresh token.
 */
async function refreshToken(
  baseUrl: string,
  clientId: string,
  clientSecret: string,
  currentRefreshToken: string,
  fetchFn: ResilientFetch = fetch,
): Promise<TokenState> {
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const response = await fetchFn(`${baseUrl}/v2/auth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: currentRefreshToken,
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Refresh token is invalid or expired — fetch a fresh token from scratch.
      return fetchToken(baseUrl, clientId, clientSecret, fetchFn);
    }
    const body = await response.text();
    throw new SigmaApiError(
      {
        message: `Failed to refresh access token: ${response.status} ${response.statusText} - ${body}`,
      },
      response,
    );
  }

  const data = (await response.json()) as TokenResponse;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000 - 60_000,
  };
}

/**
 * Creates an openapi-fetch middleware that attaches Bearer token auth.
 *
 * - If `accessToken` is provided, uses it as a static token.
 * - If `clientId` + `clientSecret` are provided, automatically fetches
 *   and refreshes OAuth2 tokens.
 *
 * The token endpoint (`/v2/auth/token`) is excluded from auth injection
 * to prevent recursive auth loops.
 */
export function createAuthMiddleware(
  baseUrl: string,
  config: AuthConfig,
  fetchFn: ResilientFetch = fetch,
): Middleware {
  if (!isClientCredentials(config)) {
    // Static token: simple header injection
    return {
      onRequest({ request }) {
        request.headers.set('Authorization', `Bearer ${config.accessToken}`);
        return request;
      },
    };
  }

  // Client credentials: auto token management
  const { clientId, clientSecret } = config;
  let tokenState: TokenState | null = null;
  let pendingTokenRequest: Promise<TokenState> | null = null;

  async function getValidToken(): Promise<string> {
    // If we have a valid (non-expired) token, return it
    if (tokenState && Date.now() < tokenState.expiresAt) {
      return tokenState.accessToken;
    }

    // Deduplicate concurrent token requests
    if (pendingTokenRequest) {
      const state = await pendingTokenRequest;
      return state.accessToken;
    }

    try {
      if (tokenState) {
        // We have an expired token -- try refreshing
        pendingTokenRequest = refreshToken(
          baseUrl,
          clientId,
          clientSecret,
          tokenState.refreshToken,
          fetchFn,
        );
      } else {
        // No token at all -- initial fetch
        pendingTokenRequest = fetchToken(
          baseUrl,
          clientId,
          clientSecret,
          fetchFn,
        );
      }

      tokenState = await pendingTokenRequest;
      return tokenState.accessToken;
    } finally {
      pendingTokenRequest = null;
    }
  }

  return {
    async onRequest({ request }) {
      // Don't inject auth for the token endpoint itself
      const url = new URL(request.url);
      if (url.pathname === '/v2/auth/token') {
        return request;
      }

      const token = await getValidToken();
      request.headers.set('Authorization', `Bearer ${token}`);
      return request;
    },
  };
}
