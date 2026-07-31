import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import {
  workspaceFixture,
  workspaceListFixture,
  workspaceGrantFixture,
  workspaceGrantListFixture,
  WORKSPACE_ID,
  GRANT_ID,
  MEMBER_ID,
} from './helpers/fixtures';

const sigma = createSigmaClient({
  baseUrl: BASE_URL,
  accessToken: 'test-token',
});

describe('WorkspacesResource', () => {
  describe('list', () => {
    it('returns a page of workspaces (v2.1)', async () => {
      server.use(
        http.get(`${BASE_URL}/v2.1/workspaces`, () =>
          HttpResponse.json(workspaceListFixture),
        ),
      );
      const result = await sigma.workspaces.list();
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].workspaceId).toBe(WORKSPACE_ID);
    });
  });

  describe('listAll', () => {
    it('returns all workspaces as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2.1/workspaces`, () =>
          HttpResponse.json(workspaceListFixture),
        ),
      );
      const all = await sigma.workspaces.listAll().toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('posts to /v2/workspaces and returns the new workspace', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE_URL}/v2/workspaces`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(workspaceFixture);
        }),
      );
      const result = await sigma.workspaces.create({ name: 'My Workspace' });
      expect((result as { workspaceId: string }).workspaceId).toBe(
        WORKSPACE_ID,
      );
      expect(capturedBody).toMatchObject({ name: 'My Workspace' });
    });
  });

  describe('get', () => {
    it('fetches a workspace by ID', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workspaces/${WORKSPACE_ID}`, () =>
          HttpResponse.json(workspaceFixture),
        ),
      );
      const result = await sigma.workspaces.get(WORKSPACE_ID);
      expect(result.workspaceId).toBe(WORKSPACE_ID);
    });
  });

  describe('update', () => {
    it('patches a workspace and returns updated data', async () => {
      const updated = { ...workspaceFixture, name: 'Updated Workspace' };
      let capturedBody: unknown;
      server.use(
        http.patch(
          `${BASE_URL}/v2/workspaces/${WORKSPACE_ID}`,
          async ({ request }) => {
            capturedBody = await request.json();
            return HttpResponse.json(updated);
          },
        ),
      );
      const result = await sigma.workspaces.update(WORKSPACE_ID, {
        name: 'Updated Workspace',
      });
      expect(result.name).toBe('Updated Workspace');
      expect(capturedBody).toMatchObject({ name: 'Updated Workspace' });
    });
  });

  describe('delete', () => {
    it('sends DELETE to /v2/workspaces/{workspaceId}', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(`${BASE_URL}/v2/workspaces/${WORKSPACE_ID}`, () => {
          deleteCalled = true;
          return HttpResponse.json({ workspaceId: WORKSPACE_ID });
        }),
      );
      await sigma.workspaces.delete(WORKSPACE_ID);
      expect(deleteCalled).toBe(true);
    });
  });

  describe('listGrants', () => {
    it('fetches grants for a workspace', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workspaces/${WORKSPACE_ID}/grants`, () =>
          HttpResponse.json(workspaceGrantListFixture),
        ),
      );
      const result = await sigma.workspaces.listGrants(WORKSPACE_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listGrantsAll', () => {
    it('returns all workspace grants as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workspaces/${WORKSPACE_ID}/grants`, () =>
          HttpResponse.json(workspaceGrantListFixture),
        ),
      );
      const all = await sigma.workspaces.listGrantsAll(WORKSPACE_ID).toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('createGrant', () => {
    it('creates a grant on a workspace', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(
          `${BASE_URL}/v2/workspaces/${WORKSPACE_ID}/grants`,
          async ({ request }) => {
            capturedBody = await request.json();
            return HttpResponse.json(workspaceGrantFixture);
          },
        ),
      );
      await sigma.workspaces.createGrant(WORKSPACE_ID, {
        grants: [{ grantee: { memberId: MEMBER_ID }, permission: 'view' }],
      });
      expect(capturedBody).toMatchObject({
        grants: [{ grantee: { memberId: MEMBER_ID } }],
      });
    });
  });

  describe('deleteGrant', () => {
    it('deletes a grant from a workspace', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(
          `${BASE_URL}/v2/workspaces/${WORKSPACE_ID}/grants/${GRANT_ID}`,
          () => {
            deleteCalled = true;
            return HttpResponse.json(workspaceGrantFixture);
          },
        ),
      );
      await sigma.workspaces.deleteGrant(WORKSPACE_ID, GRANT_ID);
      expect(deleteCalled).toBe(true);
    });
  });

  describe('list_v2', () => {
    it('returns a page of workspaces (v2)', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workspaces`, () =>
          HttpResponse.json(workspaceListFixture),
        ),
      );
      const result = await sigma.workspaces.list_v2();
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('list_v2All', () => {
    it('returns all workspaces from the v2 endpoint as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workspaces`, () =>
          HttpResponse.json(workspaceListFixture),
        ),
      );
      const all = await sigma.workspaces.list_v2All().toArray();
      expect(all).toHaveLength(1);
    });
  });
});
