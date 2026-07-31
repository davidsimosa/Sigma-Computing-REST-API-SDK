import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import {
  grantFixture,
  grantListFixture,
  GRANT_ID,
  MEMBER_ID,
  TEAM_ID,
  WORKBOOK_ID,
  WORKBOOK_URL_ID,
  SLUG_PATTERN,
  UUID_PATTERN,
} from './helpers/fixtures';

const sigma = createSigmaClient({
  baseUrl: BASE_URL,
  accessToken: 'test-token',
});

describe('GrantsResource', () => {
  describe('list', () => {
    it('returns a page of grants', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/grants`, () =>
          HttpResponse.json(grantListFixture),
        ),
      );
      const result = await sigma.grants.list();
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].grantId).toBe(GRANT_ID);
    });

    it('entry.urlId is a slug (not a UUID)', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/grants`, () =>
          HttpResponse.json(grantListFixture),
        ),
      );
      const result = await sigma.grants.list();
      const urlId = result.entries[0].urlId;
      expect(urlId).toBe(WORKBOOK_URL_ID);
      expect(SLUG_PATTERN.test(urlId)).toBe(true);
      expect(UUID_PATTERN.test(urlId)).toBe(false);
    });

    it('filters by inodeId', async () => {
      let capturedUrl: string | null = null;
      server.use(
        http.get(`${BASE_URL}/v2/grants`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(grantListFixture);
        }),
      );
      await sigma.grants.list({ inodeId: WORKBOOK_ID });
      expect(capturedUrl).toContain(`inodeId=${WORKBOOK_ID}`);
    });

    it('filters by userId', async () => {
      let capturedUrl: string | null = null;
      server.use(
        http.get(`${BASE_URL}/v2/grants`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(grantListFixture);
        }),
      );
      await sigma.grants.list({ userId: MEMBER_ID });
      expect(capturedUrl).toContain(`userId=${MEMBER_ID}`);
    });

    it('filters by teamId', async () => {
      let capturedUrl: string | null = null;
      server.use(
        http.get(`${BASE_URL}/v2/grants`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(grantListFixture);
        }),
      );
      await sigma.grants.list({ teamId: TEAM_ID });
      expect(capturedUrl).toContain(`teamId=${TEAM_ID}`);
    });

    it('supports directGrantsOnly filter', async () => {
      let capturedUrl: string | null = null;
      server.use(
        http.get(`${BASE_URL}/v2/grants`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(grantListFixture);
        }),
      );
      await sigma.grants.list({ inodeId: WORKBOOK_ID, directGrantsOnly: true });
      expect(capturedUrl).toContain('directGrantsOnly=true');
    });
  });

  describe('listAll', () => {
    it('returns all grants as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/grants`, () =>
          HttpResponse.json(grantListFixture),
        ),
      );
      const all = await sigma.grants
        .listAll({ inodeId: WORKBOOK_ID })
        .toArray();
      expect(all).toHaveLength(1);
      expect(all[0].grantId).toBe(GRANT_ID);
    });

    it('follows pagination cursors', async () => {
      const page1 = {
        entries: [{ ...grantFixture, grantId: 'grant-1' }],
        nextPage: 'cursor-2',
        total: 2,
      };
      const page2 = {
        entries: [{ ...grantFixture, grantId: 'grant-2' }],
        nextPage: null,
        total: 2,
      };
      server.use(
        http.get(`${BASE_URL}/v2/grants`, ({ request }) => {
          const url = new URL(request.url);
          return HttpResponse.json(
            url.searchParams.get('page') === 'cursor-2' ? page2 : page1,
          );
        }),
      );
      const all = await sigma.grants
        .listAll({ inodeId: WORKBOOK_ID })
        .toArray();
      expect(all).toHaveLength(2);
    });
  });

  describe('upsert', () => {
    it('grants a member view access to a workbook', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE_URL}/v2/grants`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(grantFixture);
        }),
      );
      const result = await sigma.grants.upsert({
        inodeId: WORKBOOK_ID,
        grantee: { memberId: MEMBER_ID },
        permission: 'view',
      });
      expect(result.grantId).toBe(GRANT_ID);
      expect(capturedBody).toMatchObject({
        inodeId: WORKBOOK_ID,
        grantee: { memberId: MEMBER_ID },
        permission: 'view',
      });
    });

    it('urlId is a slug (not a UUID)', async () => {
      server.use(
        http.post(`${BASE_URL}/v2/grants`, () =>
          HttpResponse.json(grantFixture),
        ),
      );
      const result = await sigma.grants.upsert({
        inodeId: WORKBOOK_ID,
        grantee: { memberId: MEMBER_ID },
        permission: 'view',
      });
      expect(result.urlId).toBe(WORKBOOK_URL_ID);
      expect(SLUG_PATTERN.test(result.urlId)).toBe(true);
      expect(UUID_PATTERN.test(result.urlId)).toBe(false);
    });

    it('grants a team edit access', async () => {
      const teamGrant = {
        ...grantFixture,
        memberId: null,
        teamId: TEAM_ID,
        permission: 'edit' as const,
      };
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE_URL}/v2/grants`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(teamGrant);
        }),
      );
      const result = await sigma.grants.upsert({
        inodeId: WORKBOOK_ID,
        grantee: { teamId: TEAM_ID },
        permission: 'edit',
      });
      expect(result.teamId).toBe(TEAM_ID);
      expect(capturedBody).toMatchObject({ grantee: { teamId: TEAM_ID } });
    });
  });

  describe('get', () => {
    it('fetches a grant by ID', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/grants/${GRANT_ID}`, () =>
          HttpResponse.json(grantFixture),
        ),
      );
      const result = await sigma.grants.get(GRANT_ID);
      expect(result.grantId).toBe(GRANT_ID);
      expect(result.permission).toBe('view');
    });

    it('urlId is a slug (not a UUID)', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/grants/${GRANT_ID}`, () =>
          HttpResponse.json(grantFixture),
        ),
      );
      const result = await sigma.grants.get(GRANT_ID);
      expect(result.urlId).toBe(WORKBOOK_URL_ID);
      expect(SLUG_PATTERN.test(result.urlId)).toBe(true);
      expect(UUID_PATTERN.test(result.urlId)).toBe(false);
    });
  });

  describe('delete', () => {
    it('sends DELETE to /v2/grants/{grantId}', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(`${BASE_URL}/v2/grants/${GRANT_ID}`, () => {
          deleteCalled = true;
          return HttpResponse.json(grantFixture);
        }),
      );
      await sigma.grants.delete(GRANT_ID);
      expect(deleteCalled).toBe(true);
    });

    it('urlId is a slug (not a UUID)', async () => {
      server.use(
        http.delete(`${BASE_URL}/v2/grants/${GRANT_ID}`, () =>
          HttpResponse.json(grantFixture),
        ),
      );
      const result = await sigma.grants.delete(GRANT_ID);
      expect(result.urlId).toBe(WORKBOOK_URL_ID);
      expect(SLUG_PATTERN.test(result.urlId)).toBe(true);
      expect(UUID_PATTERN.test(result.urlId)).toBe(false);
    });

    it('bulk-revoke pattern: deletes all grants on a workbook', async () => {
      const grants = [
        { ...grantFixture, grantId: 'grant-a' },
        { ...grantFixture, grantId: 'grant-b' },
      ];
      const deletedIds: string[] = [];
      server.use(
        http.get(`${BASE_URL}/v2/grants`, () =>
          HttpResponse.json({ entries: grants, nextPage: null, total: 2 }),
        ),
        http.delete(`${BASE_URL}/v2/grants/:grantId`, ({ params }) => {
          deletedIds.push(params.grantId as string);
          return HttpResponse.json(grantFixture);
        }),
      );
      const allGrants = await sigma.grants
        .listAll({ inodeId: WORKBOOK_ID })
        .toArray();
      for (const g of allGrants) {
        await sigma.grants.delete(g.grantId);
      }
      expect(deletedIds).toEqual(['grant-a', 'grant-b']);
    });
  });
});
