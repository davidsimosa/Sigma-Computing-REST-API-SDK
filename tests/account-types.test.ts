import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import {
  accountTypeFixture,
  accountTypeListFixture,
  accountTypePermissionsFixture,
  ACCOUNT_TYPE_ID,
} from './helpers/fixtures';

const sigma = createSigmaClient({
  baseUrl: BASE_URL,
  accessToken: 'test-token',
});

describe('AccountTypesResource', () => {
  describe('list', () => {
    it('returns a page of account types', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/accountTypes`, () =>
          HttpResponse.json(accountTypeListFixture),
        ),
      );
      const result = await sigma.accountTypes.list();
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].accountTypeId).toBe(ACCOUNT_TYPE_ID);
    });
  });

  describe('listAll', () => {
    it('returns all account types as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/accountTypes`, () =>
          HttpResponse.json(accountTypeListFixture),
        ),
      );
      const all = await sigma.accountTypes.listAll().toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('posts to /v2/accountTypes and returns the new account type', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE_URL}/v2/accountTypes`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(accountTypeFixture);
        }),
      );
      const result = await sigma.accountTypes.create({
        name: 'Custom Viewer',
      } as never);
      expect(result.accountTypeId).toBe(ACCOUNT_TYPE_ID);
      expect(capturedBody).toMatchObject({ name: 'Custom Viewer' });
    });
  });

  describe('delete', () => {
    it('deletes an account type', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(`${BASE_URL}/v2/accountTypes/${ACCOUNT_TYPE_ID}`, () => {
          deleteCalled = true;
          return HttpResponse.json({ accountTypeId: ACCOUNT_TYPE_ID });
        }),
      );
      await sigma.accountTypes.delete(ACCOUNT_TYPE_ID);
      expect(deleteCalled).toBe(true);
    });
  });

  describe('listPermissions', () => {
    it('fetches permissions for an account type as a bare array', async () => {
      server.use(
        http.get(
          `${BASE_URL}/v2/accountTypes/${ACCOUNT_TYPE_ID}/permissions`,
          () => HttpResponse.json(accountTypePermissionsFixture),
        ),
      );
      const result = await sigma.accountTypes.listPermissions(ACCOUNT_TYPE_ID);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('returns permission and description fields', async () => {
      server.use(
        http.get(
          `${BASE_URL}/v2/accountTypes/${ACCOUNT_TYPE_ID}/permissions`,
          () => HttpResponse.json(accountTypePermissionsFixture),
        ),
      );
      const result = await sigma.accountTypes.listPermissions(ACCOUNT_TYPE_ID);
      expect(result[0].permission).toBe('view');
      expect(result[0].description).toBeDefined();
    });
  });
});
