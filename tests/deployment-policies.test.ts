import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import {
  deploymentPolicyFixture,
  deploymentPolicyListFixture,
  inodeDeploymentListFixture,
  tenantDeploymentListFixture,
  deployableTenantListFixture,
  POLICY_ID,
  WORKBOOK_ID,
  TENANT_ID,
} from './helpers/fixtures';

const sigma = createSigmaClient({
  baseUrl: BASE_URL,
  accessToken: 'test-token',
});

describe('DeploymentPoliciesResource', () => {
  describe('list', () => {
    it('returns a page of deployment policies', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/deploymentPolicies`, () =>
          HttpResponse.json(deploymentPolicyListFixture),
        ),
      );
      const result = await sigma.deploymentPolicies.list();
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].deploymentPolicyId).toBe(POLICY_ID);
    });
  });

  describe('listAll', () => {
    it('returns all deployment policies as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/deploymentPolicies`, () =>
          HttpResponse.json(deploymentPolicyListFixture),
        ),
      );
      const all = await sigma.deploymentPolicies.listAll().toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('posts to /v2/deploymentPolicies and returns the new policy', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE_URL}/v2/deploymentPolicies`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(deploymentPolicyFixture);
        }),
      );
      const result = await sigma.deploymentPolicies.create({
        name: 'My Policy',
      });
      expect(result.deploymentPolicyId).toBe(POLICY_ID);
      expect(capturedBody).toMatchObject({ name: 'My Policy' });
    });
  });

  describe('get', () => {
    it('fetches a deployment policy by ID', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/deploymentPolicies/${POLICY_ID}`, () =>
          HttpResponse.json(deploymentPolicyFixture),
        ),
      );
      const result = await sigma.deploymentPolicies.get(POLICY_ID);
      expect(result.deploymentPolicyId).toBe(POLICY_ID);
    });
  });

  describe('archive', () => {
    it('archives (deletes) a deployment policy', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(`${BASE_URL}/v2/deploymentPolicies/${POLICY_ID}`, () => {
          deleteCalled = true;
          return HttpResponse.json({ deploymentPolicyId: POLICY_ID });
        }),
      );
      await sigma.deploymentPolicies.archive(POLICY_ID);
      expect(deleteCalled).toBe(true);
    });
  });

  describe('listInodesForDeployment', () => {
    it('fetches inodes for a deployment policy', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/deploymentPolicies/${POLICY_ID}/files`, () =>
          HttpResponse.json(inodeDeploymentListFixture),
        ),
      );
      const result =
        await sigma.deploymentPolicies.listInodesForDeployment(POLICY_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listInodesForDeploymentAll', () => {
    it('returns all inodes as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/deploymentPolicies/${POLICY_ID}/files`, () =>
          HttpResponse.json(inodeDeploymentListFixture),
        ),
      );
      const all = await sigma.deploymentPolicies
        .listInodesForDeploymentAll(POLICY_ID)
        .toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('addInodesToDeployment', () => {
    it('adds inodes to a deployment policy', async () => {
      server.use(
        http.post(`${BASE_URL}/v2/deploymentPolicies/${POLICY_ID}/files`, () =>
          HttpResponse.json(inodeDeploymentListFixture),
        ),
      );
      const result = await sigma.deploymentPolicies.addInodesToDeployment(
        POLICY_ID,
        {
          inodeIds: [WORKBOOK_ID],
        },
      );
      expect(result).toBeDefined();
    });
  });

  describe('removeInodesFromDeployment', () => {
    it('removes an inode from a deployment policy', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(
          `${BASE_URL}/v2/deploymentPolicies/${POLICY_ID}/files/${WORKBOOK_ID}`,
          () => {
            deleteCalled = true;
            return HttpResponse.json({});
          },
        ),
      );
      await sigma.deploymentPolicies.removeInodesFromDeployment(
        POLICY_ID,
        WORKBOOK_ID,
      );
      expect(deleteCalled).toBe(true);
    });
  });

  describe('listTenantsForDeployment', () => {
    it('fetches tenants for a deployment policy', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/deploymentPolicies/${POLICY_ID}/tenants`, () =>
          HttpResponse.json(tenantDeploymentListFixture),
        ),
      );
      const result =
        await sigma.deploymentPolicies.listTenantsForDeployment(POLICY_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listTenantsForDeploymentAll', () => {
    it('returns all policy tenants as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/deploymentPolicies/${POLICY_ID}/tenants`, () =>
          HttpResponse.json(tenantDeploymentListFixture),
        ),
      );
      const all = await sigma.deploymentPolicies
        .listTenantsForDeploymentAll(POLICY_ID)
        .toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('addTenantToDeployment', () => {
    it('adds a tenant to a deployment policy', async () => {
      server.use(
        http.post(
          `${BASE_URL}/v2/deploymentPolicies/${POLICY_ID}/tenants`,
          () => HttpResponse.json(tenantDeploymentListFixture),
        ),
      );
      const result = await sigma.deploymentPolicies.addTenantToDeployment(
        POLICY_ID,
        {
          tenantOrganizationId: TENANT_ID,
        },
      );
      expect(result).toBeDefined();
    });
  });

  describe('removeTenantFromDeployment', () => {
    it('removes a tenant from a deployment policy', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(
          `${BASE_URL}/v2/deploymentPolicies/${POLICY_ID}/tenants/${TENANT_ID}`,
          () => {
            deleteCalled = true;
            return HttpResponse.json({});
          },
        ),
      );
      await sigma.deploymentPolicies.removeTenantFromDeployment(
        POLICY_ID,
        TENANT_ID,
      );
      expect(deleteCalled).toBe(true);
    });
  });

  describe('listDeployableTenants', () => {
    it('fetches deployable tenants', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/deploymentPolicies/tenants`, () =>
          HttpResponse.json(deployableTenantListFixture),
        ),
      );
      const result = await sigma.deploymentPolicies.listDeployableTenants();
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listDeployableTenantsAll', () => {
    it('returns all deployable tenants as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/deploymentPolicies/tenants`, () =>
          HttpResponse.json(deployableTenantListFixture),
        ),
      );
      const all = await sigma.deploymentPolicies
        .listDeployableTenantsAll()
        .toArray();
      expect(all).toHaveLength(1);
    });
  });
});
