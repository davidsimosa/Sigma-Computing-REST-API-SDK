import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import {
  apiCredentialFixture,
  apiCredentialListFixture,
  API_CREDENTIAL_ID,
} from './helpers/fixtures';

const sigma = createSigmaClient({
  baseUrl: BASE_URL,
  accessToken: 'test-token',
});

describe('ApiCredentialsResource', () => {
  describe('list', () => {
    it('returns a page of API credentials', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/api-credentials`, () =>
          HttpResponse.json(apiCredentialListFixture),
        ),
      );
      const result = await sigma.apiCredentials.list();
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].apiCredentialId).toBe(API_CREDENTIAL_ID);
    });
  });

  describe('listAll', () => {
    it('returns all API credentials as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/api-credentials`, () =>
          HttpResponse.json(apiCredentialListFixture),
        ),
      );
      const all = await sigma.apiCredentials.listAll().toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('posts to /v2/api-credentials and returns the new credential', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE_URL}/v2/api-credentials`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(apiCredentialFixture);
        }),
      );
      const result = await sigma.apiCredentials.create({
        name: 'My Credential',
        allowlist: ['*.example.com'],
        credential: { authMethod: 'bearer', bearer: { token: 'secret' } },
      } as never);
      expect(result.apiCredentialId).toBe(API_CREDENTIAL_ID);
      expect(capturedBody).toMatchObject({ name: 'My Credential' });
    });
  });

  describe('get', () => {
    it('fetches an API credential by ID', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/api-credentials/${API_CREDENTIAL_ID}`, () =>
          HttpResponse.json(apiCredentialFixture),
        ),
      );
      const result = await sigma.apiCredentials.get(API_CREDENTIAL_ID);
      expect(result.apiCredentialId).toBe(API_CREDENTIAL_ID);
      expect(result.name).toBe('My Credential');
    });
  });

  describe('update', () => {
    it('patches an API credential', async () => {
      let capturedBody: unknown;
      server.use(
        http.patch(
          `${BASE_URL}/v2/api-credentials/${API_CREDENTIAL_ID}`,
          async ({ request }) => {
            capturedBody = await request.json();
            return HttpResponse.json({
              ...apiCredentialFixture,
              name: 'Updated',
            });
          },
        ),
      );
      const result = await sigma.apiCredentials.update(API_CREDENTIAL_ID, {
        name: 'Updated',
      });
      expect(result.name).toBe('Updated');
      expect(capturedBody).toMatchObject({ name: 'Updated' });
    });
  });

  describe('delete', () => {
    it('deletes an API credential', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(
          `${BASE_URL}/v2/api-credentials/${API_CREDENTIAL_ID}`,
          () => {
            deleteCalled = true;
            return HttpResponse.json({ apiCredentialId: API_CREDENTIAL_ID });
          },
        ),
      );
      await sigma.apiCredentials.delete(API_CREDENTIAL_ID);
      expect(deleteCalled).toBe(true);
    });
  });
});
