import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import {
  connectionFixture,
  connectionListFixture,
  connectionGrantFixture,
  connectionGrantListFixture,
  connectionPathFixture,
  connectionPathListFixture,
  connectionPathGrantFixture,
  connectionPathGrantListFixture,
  tableColumnListFixture,
  lookupConnectionFixture,
  testConnectionFixture,
  CONNECTION_ID,
  GRANT_ID,
  PATH_ID,
  MEMBER_ID,
} from './helpers/fixtures';

const sigma = createSigmaClient({
  baseUrl: BASE_URL,
  accessToken: 'test-token',
});

describe('ConnectionsResource', () => {
  describe('list', () => {
    it('returns a page of connections', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/connections`, () =>
          HttpResponse.json(connectionListFixture),
        ),
      );
      const result = await sigma.connections.list();
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].connectionId).toBe(CONNECTION_ID);
    });
  });

  describe('listAll', () => {
    it('returns all connections as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/connections`, () =>
          HttpResponse.json(connectionListFixture),
        ),
      );
      const all = await sigma.connections.listAll().toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('posts to /v2/connections and returns the new connection', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE_URL}/v2/connections`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(connectionFixture);
        }),
      );
      const result = await sigma.connections.create({
        name: 'My Connection',
        type: 'snowflake',
      } as never);
      expect(result.connectionId).toBe(CONNECTION_ID);
      expect(capturedBody).toMatchObject({ name: 'My Connection' });
    });
  });

  describe('get', () => {
    it('fetches a connection by ID', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/connections/${CONNECTION_ID}`, () =>
          HttpResponse.json(connectionFixture),
        ),
      );
      const result = await sigma.connections.get(CONNECTION_ID);
      expect(result.connectionId).toBe(CONNECTION_ID);
    });
  });

  describe('update', () => {
    it('puts an updated connection', async () => {
      let capturedBody: unknown;
      server.use(
        http.put(
          `${BASE_URL}/v2/connections/${CONNECTION_ID}`,
          async ({ request }) => {
            capturedBody = await request.json();
            return HttpResponse.json({ ...connectionFixture, name: 'Updated' });
          },
        ),
      );
      const result = await sigma.connections.update(CONNECTION_ID, {
        name: 'Updated',
      } as never);
      expect(result.name).toBe('Updated');
      expect(capturedBody).toMatchObject({ name: 'Updated' });
    });
  });

  describe('updateDeprecated', () => {
    it('patches a connection (deprecated)', async () => {
      server.use(
        http.patch(`${BASE_URL}/v2/connections/${CONNECTION_ID}`, () =>
          HttpResponse.json({ ...connectionFixture, name: 'Patched' }),
        ),
      );
      const result = await sigma.connections.updateDeprecated(CONNECTION_ID, {
        name: 'Patched',
      });
      expect(result.name).toBe('Patched');
    });
  });

  describe('delete', () => {
    it('deletes a connection', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(`${BASE_URL}/v2/connections/${CONNECTION_ID}`, () => {
          deleteCalled = true;
          return HttpResponse.json({ connectionId: CONNECTION_ID });
        }),
      );
      await sigma.connections.delete(CONNECTION_ID);
      expect(deleteCalled).toBe(true);
    });
  });

  describe('listGrants', () => {
    it('fetches grants for a connection', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/connections/${CONNECTION_ID}/grants`, () =>
          HttpResponse.json(connectionGrantListFixture),
        ),
      );
      const result = await sigma.connections.listGrants(CONNECTION_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listGrantsAll', () => {
    it('returns all connection grants as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/connections/${CONNECTION_ID}/grants`, () =>
          HttpResponse.json(connectionGrantListFixture),
        ),
      );
      const all = await sigma.connections
        .listGrantsAll(CONNECTION_ID)
        .toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('createGrant', () => {
    it('creates a grant on a connection', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(
          `${BASE_URL}/v2/connections/${CONNECTION_ID}/grants`,
          async ({ request }) => {
            capturedBody = await request.json();
            return HttpResponse.json(connectionGrantFixture);
          },
        ),
      );
      await sigma.connections.createGrant(CONNECTION_ID, {
        grants: [{ grantee: { memberId: MEMBER_ID }, permission: 'usage' }],
      });
      expect(capturedBody).toMatchObject({
        grants: [{ grantee: { memberId: MEMBER_ID } }],
      });
    });
  });

  describe('deleteGrant', () => {
    it('deletes a grant from a connection', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(
          `${BASE_URL}/v2/connections/${CONNECTION_ID}/grants/${GRANT_ID}`,
          () => {
            deleteCalled = true;
            return HttpResponse.json(connectionGrantFixture);
          },
        ),
      );
      await sigma.connections.deleteGrant(CONNECTION_ID, GRANT_ID);
      expect(deleteCalled).toBe(true);
    });
  });

  describe('syncPath', () => {
    it('syncs a connection path', async () => {
      server.use(
        http.post(`${BASE_URL}/v2/connections/${CONNECTION_ID}/sync`, () =>
          HttpResponse.json({ success: true }),
        ),
      );
      const result = await sigma.connections.syncPath(CONNECTION_ID, {
        path: ['MY_DB', 'PUBLIC'],
      });
      expect(result).toBeDefined();
    });
  });

  describe('test', () => {
    it('tests a connection', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/connections/${CONNECTION_ID}/test`, () =>
          HttpResponse.json(testConnectionFixture),
        ),
      );
      const result = await sigma.connections.test(CONNECTION_ID);
      expect(result).toBeDefined();
    });
  });

  describe('listPaths', () => {
    it('fetches paths for connections', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/connections/paths`, () =>
          HttpResponse.json(connectionPathListFixture),
        ),
      );
      const result = await sigma.connections.listPaths();
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listPathsAll', () => {
    it('returns all connection paths as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/connections/paths`, () =>
          HttpResponse.json(connectionPathListFixture),
        ),
      );
      const all = await sigma.connections.listPathsAll().toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('listPathGrants', () => {
    it('fetches grants for a connection path', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/connections/paths/${PATH_ID}/grants`, () =>
          HttpResponse.json(connectionPathGrantListFixture),
        ),
      );
      const result = await sigma.connections.listPathGrants(PATH_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listPathGrantsAll', () => {
    it('returns all path grants as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/connections/paths/${PATH_ID}/grants`, () =>
          HttpResponse.json(connectionPathGrantListFixture),
        ),
      );
      const all = await sigma.connections.listPathGrantsAll(PATH_ID).toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('createPathGrant', () => {
    it('creates a grant on a connection path', async () => {
      server.use(
        http.post(`${BASE_URL}/v2/connections/paths/${PATH_ID}/grants`, () =>
          HttpResponse.json(connectionPathGrantFixture),
        ),
      );
      const result = await sigma.connections.createPathGrant(PATH_ID, {
        grants: [{ grantee: { memberId: MEMBER_ID }, permission: 'usage' }],
      });
      expect(result).toBeDefined();
    });
  });

  describe('deletePathGrant', () => {
    it('deletes a grant from a connection path', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(
          `${BASE_URL}/v2/connections/paths/${PATH_ID}/grants/${GRANT_ID}`,
          () => {
            deleteCalled = true;
            return HttpResponse.json(connectionPathGrantFixture);
          },
        ),
      );
      await sigma.connections.deletePathGrant(PATH_ID, GRANT_ID);
      expect(deleteCalled).toBe(true);
    });
  });

  describe('getInodePath', () => {
    it('fetches the inode path for a connection', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/connections/paths/${CONNECTION_ID}`, () =>
          HttpResponse.json(connectionPathFixture),
        ),
      );
      const result = await sigma.connections.getInodePath(CONNECTION_ID);
      expect(result).toBeDefined();
    });
  });

  describe('listTableColumns', () => {
    it('fetches columns for a connection table', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/connections/tables/table-1/columns`, () =>
          HttpResponse.json(tableColumnListFixture),
        ),
      );
      const result = await sigma.connections.listTableColumns('table-1');
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('lookup', () => {
    it('looks up a connection path', async () => {
      server.use(
        http.post(`${BASE_URL}/v2/connection/${CONNECTION_ID}/lookup`, () =>
          HttpResponse.json(lookupConnectionFixture),
        ),
      );
      const result = await sigma.connections.lookup(CONNECTION_ID, {
        path: ['MY_DB', 'PUBLIC'],
      });
      expect(result).toBeDefined();
    });
  });

  describe('createV3Alpha', () => {
    it('creates a connection via v3alpha', async () => {
      server.use(
        http.post(`${BASE_URL}/v3alpha/connections`, () =>
          HttpResponse.json(connectionFixture),
        ),
      );
      const result = await sigma.connections.createV3Alpha({
        name: 'My Connection',
      } as never);
      expect(result).toBeDefined();
    });
  });

  describe('getV3Alpha', () => {
    it('fetches a connection via v3alpha', async () => {
      server.use(
        http.get(`${BASE_URL}/v3alpha/connections/${CONNECTION_ID}`, () =>
          HttpResponse.json(connectionFixture),
        ),
      );
      const result = await sigma.connections.getV3Alpha(CONNECTION_ID);
      expect(result).toBeDefined();
    });
  });

  describe('patchV3Alpha', () => {
    it('patches a connection via v3alpha', async () => {
      server.use(
        http.patch(`${BASE_URL}/v3alpha/connections/${CONNECTION_ID}`, () =>
          HttpResponse.json(connectionFixture),
        ),
      );
      const result = await sigma.connections.patchV3Alpha(CONNECTION_ID, {});
      expect(result).toBeDefined();
    });
  });

  describe('postDbtArtifacts', () => {
    it('uploads dbt artifacts as FormData', async () => {
      server.use(
        http.post(
          `${BASE_URL}/v2/connections/${CONNECTION_ID}/dbtArtifacts`,
          () => HttpResponse.json({}),
        ),
      );
      const formData = new FormData();
      formData.append(
        'artifacts',
        new Blob(['tar-content'], { type: 'application/gzip' }),
        'artifacts.tar.gz',
      );
      const result = await sigma.connections.postDbtArtifacts(
        CONNECTION_ID,
        formData,
      );
      expect(result).toBeDefined();
    });
  });
});
