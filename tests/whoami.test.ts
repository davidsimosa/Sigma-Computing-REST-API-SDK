import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import { whoamiFixture } from './helpers/fixtures';

const sigma = createSigmaClient({
  baseUrl: BASE_URL,
  accessToken: 'test-token',
});

describe('WhoamiResource', () => {
  describe('get', () => {
    it('returns current user info', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/whoami`, () =>
          HttpResponse.json(whoamiFixture),
        ),
      );
      const result = await sigma.whoami.get();
      expect(result.userId).toBe(whoamiFixture.userId);
      expect(result.organizationId).toBeDefined();
    });

    it('attaches Authorization header', async () => {
      let capturedAuth: string | null = null;
      server.use(
        http.get(`${BASE_URL}/v2/whoami`, ({ request }) => {
          capturedAuth = request.headers.get('Authorization');
          return HttpResponse.json(whoamiFixture);
        }),
      );
      await sigma.whoami.get();
      expect(capturedAuth).toBe('Bearer test-token');
    });
  });
});
