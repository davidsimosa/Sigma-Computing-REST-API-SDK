import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import {
  tenantFixture,
  tenantListFixture,
  deploymentCapabilityListFixture,
  workbookListFixture,
  TENANT_ID,
} from './helpers/fixtures';

const sigma = createSigmaClient({
  baseUrl: BASE_URL,
  accessToken: 'test-token',
});

describe('TenantsResource', () => {
  describe('list', () => {
    it('returns a page of tenants', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/tenants`, () =>
          HttpResponse.json(tenantListFixture),
        ),
      );
      const result = await sigma.tenants.list();
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]?.tenantOrganizationId).toBe(TENANT_ID);
    });
  });

  describe('listAll', () => {
    it('returns all tenants as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/tenants`, () =>
          HttpResponse.json(tenantListFixture),
        ),
      );
      const all = await sigma.tenants.listAll().toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('posts to /v2/tenants and returns the new tenant', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE_URL}/v2/tenants`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(tenantFixture);
        }),
      );
      const result = await sigma.tenants.create({ name: 'My Tenant' } as never);
      expect(result.tenantOrganizationId).toBe(TENANT_ID);
      expect(capturedBody).toMatchObject({ name: 'My Tenant' });
    });
  });

  describe('get', () => {
    it('fetches a tenant by ID', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/tenants/${TENANT_ID}`, () =>
          HttpResponse.json(tenantFixture),
        ),
      );
      const result = await sigma.tenants.get(TENANT_ID);
      expect(result.tenantOrganizationId).toBe(TENANT_ID);
    });
  });

  describe('patch', () => {
    it('patches a tenant and returns updated data', async () => {
      const updated = { ...tenantFixture, name: 'Updated Tenant' };
      server.use(
        http.patch(`${BASE_URL}/v2/tenants/${TENANT_ID}`, () =>
          HttpResponse.json(updated),
        ),
      );
      const result = await sigma.tenants.patch(TENANT_ID, {
        name: 'Updated Tenant',
      } as never);
      expect(result.tenantOrganizationId).toBe(TENANT_ID);
    });
  });

  describe('delete', () => {
    it('sends DELETE to /v2/tenants/{tenantOrganizationId}', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(`${BASE_URL}/v2/tenants/${TENANT_ID}`, () => {
          deleteCalled = true;
          return HttpResponse.json({ tenantOrganizationId: TENANT_ID });
        }),
      );
      await sigma.tenants.delete(TENANT_ID);
      expect(deleteCalled).toBe(true);
    });
  });

  describe('listDeploymentCapabilities', () => {
    it('fetches deployment capabilities for a tenant', async () => {
      server.use(
        http.get(
          `${BASE_URL}/v2/tenants/${TENANT_ID}/capabilities/deployments`,
          () => HttpResponse.json(deploymentCapabilityListFixture),
        ),
      );
      const result = await sigma.tenants.listDeploymentCapabilities(TENANT_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listDeploymentCapabilitiesAll', () => {
    it('returns all deployment capabilities as a flat array', async () => {
      server.use(
        http.get(
          `${BASE_URL}/v2/tenants/${TENANT_ID}/capabilities/deployments`,
          () => HttpResponse.json(deploymentCapabilityListFixture),
        ),
      );
      const all = await sigma.tenants
        .listDeploymentCapabilitiesAll(TENANT_ID)
        .toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('addDeploymentCapabilities', () => {
    it('adds deployment capabilities to a tenant', async () => {
      server.use(
        http.post(
          `${BASE_URL}/v2/tenants/${TENANT_ID}/capabilities/deployments:batchAdd`,
          () => HttpResponse.json(deploymentCapabilityListFixture),
        ),
      );
      const result = await sigma.tenants.addDeploymentCapabilities(TENANT_ID, {
        deployToTenantOrganizationIds: [],
      });
      expect(result).toBeDefined();
    });
  });

  describe('removeDeploymentCapabilities', () => {
    it('removes deployment capabilities from a tenant', async () => {
      server.use(
        http.post(
          `${BASE_URL}/v2/tenants/${TENANT_ID}/capabilities/deployments:batchRemove`,
          () => HttpResponse.json(deploymentCapabilityListFixture),
        ),
      );
      const result = await sigma.tenants.removeDeploymentCapabilities(
        TENANT_ID,
        { deployToTenantOrganizationIds: [] },
      );
      expect(result).toBeDefined();
    });
  });

  describe('getWorkbook', () => {
    it('fetches a workbook for a tenant', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/tenants/${TENANT_ID}/workbooks`, () =>
          HttpResponse.json(workbookListFixture),
        ),
      );
      const result = await sigma.tenants.getWorkbook(TENANT_ID);
      expect(result).toBeDefined();
    });
  });
});
