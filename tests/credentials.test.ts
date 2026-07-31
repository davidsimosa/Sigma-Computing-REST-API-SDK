import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import { credentialsFixture, MEMBER_ID } from './helpers/fixtures';

const sigma = createSigmaClient({
  baseUrl: BASE_URL,
  accessToken: 'test-token',
});

describe('CredentialsResource', () => {
  describe('create', () => {
    it('posts to /v2/credentials and returns the new credentials', async () => {
      server.use(
        http.post(`${BASE_URL}/v2/credentials`, () =>
          HttpResponse.json(credentialsFixture),
        ),
      );
      const result = await sigma.credentials.create({
        ownerId: MEMBER_ID,
        name: 'My Credentials',
      });
      expect(result.clientId).toBe('cred-client-1');
    });
  });

  describe('delete', () => {
    it('deletes credentials by clientId', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(`${BASE_URL}/v2/credentials/cred-client-1`, () => {
          deleteCalled = true;
          return HttpResponse.json({ clientId: 'cred-client-1' });
        }),
      );
      await sigma.credentials.delete('cred-client-1');
      expect(deleteCalled).toBe(true);
    });
  });
});
