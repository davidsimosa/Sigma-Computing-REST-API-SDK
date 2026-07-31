import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import {
  userAttributeFixture,
  userAttributeListFixture,
  uaTeamAssignmentListFixture,
  uaTenantAssignmentListFixture,
  uaUserAssignmentListFixture,
  UA_ID,
  TEAM_ID,
  TENANT_ID,
  MEMBER_ID,
} from './helpers/fixtures';

const sigma = createSigmaClient({
  baseUrl: BASE_URL,
  accessToken: 'test-token',
});

describe('UserAttributesResource', () => {
  describe('list', () => {
    it('returns a page of user attributes', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/user-attributes`, () =>
          HttpResponse.json(userAttributeListFixture),
        ),
      );
      const result = await sigma.userAttributes.list();
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].userAttributeId).toBe(UA_ID);
    });
  });

  describe('listAll', () => {
    it('returns all user attributes as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/user-attributes`, () =>
          HttpResponse.json(userAttributeListFixture),
        ),
      );
      const all = await sigma.userAttributes.listAll().toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('posts to /v2/user-attributes and returns the new attribute', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE_URL}/v2/user-attributes`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(userAttributeFixture);
        }),
      );
      const result = await sigma.userAttributes.create({ name: 'region' });
      expect(result.userAttributeId).toBe(UA_ID);
      expect(capturedBody).toMatchObject({ name: 'region' });
    });
  });

  describe('get', () => {
    it('fetches a user attribute by ID', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/user-attributes/${UA_ID}`, () =>
          HttpResponse.json(userAttributeFixture),
        ),
      );
      const result = await sigma.userAttributes.get(UA_ID);
      expect(result.userAttributeId).toBe(UA_ID);
    });
  });

  describe('delete', () => {
    it('sends DELETE to /v2/user-attributes/{userAttributeId}', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(`${BASE_URL}/v2/user-attributes/${UA_ID}`, () => {
          deleteCalled = true;
          return HttpResponse.json({ userAttributeId: UA_ID });
        }),
      );
      await sigma.userAttributes.delete(UA_ID);
      expect(deleteCalled).toBe(true);
    });
  });

  describe('listTeamAssignments', () => {
    it('fetches team assignments for a user attribute', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/user-attributes/${UA_ID}/teams`, () =>
          HttpResponse.json(uaTeamAssignmentListFixture),
        ),
      );
      const result = await sigma.userAttributes.listTeamAssignments(UA_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listTeamAssignmentsAll', () => {
    it('returns all team assignments as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/user-attributes/${UA_ID}/teams`, () =>
          HttpResponse.json(uaTeamAssignmentListFixture),
        ),
      );
      const all = await sigma.userAttributes
        .listTeamAssignmentsAll(UA_ID)
        .toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('setForTeams', () => {
    it('creates team assignments for a user attribute', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(
          `${BASE_URL}/v2/user-attributes/${UA_ID}/teams`,
          async ({ request }) => {
            capturedBody = await request.json();
            return HttpResponse.json(uaTeamAssignmentListFixture);
          },
        ),
      );
      await sigma.userAttributes.setForTeams(UA_ID, {
        assignments: [{ teamId: TEAM_ID, value: 'us-east' }],
      } as never);
      expect(capturedBody).toMatchObject({
        assignments: [{ teamId: TEAM_ID }],
      });
    });
  });

  describe('updateForTeams', () => {
    it('updates team assignments for a user attribute', async () => {
      server.use(
        http.patch(`${BASE_URL}/v2/user-attributes/${UA_ID}/teams`, () =>
          HttpResponse.json(uaTeamAssignmentListFixture),
        ),
      );
      const result = await sigma.userAttributes.updateForTeams(UA_ID, {
        assignments: [{ teamId: TEAM_ID, value: 'us-west' }],
      } as never);
      expect(result).toBeDefined();
    });
  });

  describe('deleteForTeam', () => {
    it('deletes a team assignment', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(
          `${BASE_URL}/v2/user-attributes/${UA_ID}/teams/${TEAM_ID}`,
          () => {
            deleteCalled = true;
            return HttpResponse.json({});
          },
        ),
      );
      await sigma.userAttributes.deleteForTeam(UA_ID, TEAM_ID);
      expect(deleteCalled).toBe(true);
    });
  });

  describe('listTenantAssignments', () => {
    it('fetches tenant assignments for a user attribute', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/user-attributes/${UA_ID}/tenants`, () =>
          HttpResponse.json(uaTenantAssignmentListFixture),
        ),
      );
      const result = await sigma.userAttributes.listTenantAssignments(UA_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listTenantAssignmentsAll', () => {
    it('returns all tenant assignments as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/user-attributes/${UA_ID}/tenants`, () =>
          HttpResponse.json(uaTenantAssignmentListFixture),
        ),
      );
      const all = await sigma.userAttributes
        .listTenantAssignmentsAll(UA_ID)
        .toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('setForTenants', () => {
    it('creates tenant assignments for a user attribute', async () => {
      server.use(
        http.post(`${BASE_URL}/v2/user-attributes/${UA_ID}/tenants`, () =>
          HttpResponse.json(uaTenantAssignmentListFixture),
        ),
      );
      const result = await sigma.userAttributes.setForTenants(UA_ID, {
        assignments: [{ tenantOrganizationId: TENANT_ID, value: 'us-east' }],
      } as never);
      expect(result).toBeDefined();
    });
  });

  describe('updateForTenants', () => {
    it('updates tenant assignments for a user attribute', async () => {
      server.use(
        http.patch(`${BASE_URL}/v2/user-attributes/${UA_ID}/tenants`, () =>
          HttpResponse.json(uaTenantAssignmentListFixture),
        ),
      );
      const result = await sigma.userAttributes.updateForTenants(UA_ID, {
        assignments: [{ tenantOrganizationId: TENANT_ID, value: 'us-west' }],
      } as never);
      expect(result).toBeDefined();
    });
  });

  describe('deleteForTenant', () => {
    it('deletes a tenant assignment', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(
          `${BASE_URL}/v2/user-attributes/${UA_ID}/tenants/${TENANT_ID}`,
          () => {
            deleteCalled = true;
            return HttpResponse.json({});
          },
        ),
      );
      await sigma.userAttributes.deleteForTenant(UA_ID, TENANT_ID);
      expect(deleteCalled).toBe(true);
    });
  });

  describe('listUserAssignments', () => {
    it('fetches user assignments for a user attribute', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/user-attributes/${UA_ID}/users`, () =>
          HttpResponse.json(uaUserAssignmentListFixture),
        ),
      );
      const result = await sigma.userAttributes.listUserAssignments(UA_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listUserAssignmentsAll', () => {
    it('returns all user assignments as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/user-attributes/${UA_ID}/users`, () =>
          HttpResponse.json(uaUserAssignmentListFixture),
        ),
      );
      const all = await sigma.userAttributes
        .listUserAssignmentsAll(UA_ID)
        .toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('setForUsers', () => {
    it('creates user assignments for a user attribute', async () => {
      server.use(
        http.post(`${BASE_URL}/v2/user-attributes/${UA_ID}/users`, () =>
          HttpResponse.json(uaUserAssignmentListFixture),
        ),
      );
      const result = await sigma.userAttributes.setForUsers(UA_ID, {
        assignments: [{ userId: MEMBER_ID, value: 'us-east' }],
      } as never);
      expect(result).toBeDefined();
    });
  });

  describe('updateForUsers', () => {
    it('updates user assignments for a user attribute', async () => {
      server.use(
        http.patch(`${BASE_URL}/v2/user-attributes/${UA_ID}/users`, () =>
          HttpResponse.json(uaUserAssignmentListFixture),
        ),
      );
      const result = await sigma.userAttributes.updateForUsers(UA_ID, {
        assignments: [{ userId: MEMBER_ID, value: 'us-west' }],
      } as never);
      expect(result).toBeDefined();
    });
  });

  describe('deleteForUser', () => {
    it('deletes a user assignment', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(
          `${BASE_URL}/v2/user-attributes/${UA_ID}/users/${MEMBER_ID}`,
          () => {
            deleteCalled = true;
            return HttpResponse.json({});
          },
        ),
      );
      await sigma.userAttributes.deleteForUser(UA_ID, MEMBER_ID);
      expect(deleteCalled).toBe(true);
    });
  });
});
