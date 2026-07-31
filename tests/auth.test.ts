import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import { whoamiFixture, authTokenFixture } from './helpers/fixtures';

describe('Auth middleware', () => {
  describe('static access token', () => {
    it('attaches Bearer token to every request', async () => {
      const sigma = createSigmaClient({
        baseUrl: BASE_URL,
        accessToken: 'my-static-token',
      });
      let capturedAuth: string | null = null;
      server.use(
        http.get(`${BASE_URL}/v2/whoami`, ({ request }) => {
          capturedAuth = request.headers.get('Authorization');
          return HttpResponse.json(whoamiFixture);
        }),
      );
      await sigma.whoami.get();
      expect(capturedAuth).toBe('Bearer my-static-token');
    });
  });

  describe('OAuth2 client credentials', () => {
    it('fetches a token and attaches it before the first request', async () => {
      const sigma = createSigmaClient({
        baseUrl: BASE_URL,
        clientId: 'my-client-id',
        clientSecret: 'my-client-secret',
      });
      let tokenFetchCount = 0;
      let capturedAuth: string | null = null;
      server.use(
        http.post(`${BASE_URL}/v2/auth/token`, () => {
          tokenFetchCount++;
          return HttpResponse.json(authTokenFixture);
        }),
        http.get(`${BASE_URL}/v2/whoami`, ({ request }) => {
          capturedAuth = request.headers.get('Authorization');
          return HttpResponse.json(whoamiFixture);
        }),
      );
      await sigma.whoami.get();
      expect(tokenFetchCount).toBe(1);
      expect(capturedAuth).toBe(`Bearer ${authTokenFixture.access_token}`);
    });

    it('reuses a valid token for subsequent requests', async () => {
      const sigma = createSigmaClient({
        baseUrl: BASE_URL,
        clientId: 'my-client-id',
        clientSecret: 'my-client-secret',
      });
      let tokenFetchCount = 0;
      server.use(
        http.post(`${BASE_URL}/v2/auth/token`, () => {
          tokenFetchCount++;
          return HttpResponse.json({ ...authTokenFixture, expires_in: 3600 });
        }),
        http.get(`${BASE_URL}/v2/whoami`, () =>
          HttpResponse.json(whoamiFixture),
        ),
      );
      await sigma.whoami.get();
      await sigma.whoami.get();
      expect(tokenFetchCount).toBe(1);
    });
  });
});

describe('AuthResource', () => {
  const sigma = createSigmaClient({
    baseUrl: BASE_URL,
    accessToken: 'test-token',
  });

  describe('postToken', () => {
    it('posts to the token endpoint and returns token data', async () => {
      server.use(
        http.post(`${BASE_URL}/v2/auth/token`, () =>
          HttpResponse.json(authTokenFixture),
        ),
      );
      const result = await sigma.auth.postToken({
        grant_type: 'client_credentials',
      });
      expect(result.access_token).toBe(authTokenFixture.access_token);
    });
  });
});
