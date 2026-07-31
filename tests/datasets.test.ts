import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import {
  datasetFixture,
  datasetListFixture,
  datasetGrantFixture,
  datasetGrantListFixture,
  datasetMaterializationListFixture,
  datasetSourcesFixture,
  materializationFixture,
  DATASET_ID,
  GRANT_ID,
  MEMBER_ID,
} from './helpers/fixtures';

const sigma = createSigmaClient({
  baseUrl: BASE_URL,
  accessToken: 'test-token',
});

describe('DatasetsResource', () => {
  describe('list', () => {
    it('returns a page of datasets', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/datasets`, () =>
          HttpResponse.json(datasetListFixture),
        ),
      );
      const result = await sigma.datasets.list();
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].datasetId).toBe(DATASET_ID);
    });
  });

  describe('listAll', () => {
    it('returns all datasets as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/datasets`, () =>
          HttpResponse.json(datasetListFixture),
        ),
      );
      const all = await sigma.datasets.listAll().toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('get', () => {
    it('fetches a dataset by ID', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/datasets/${DATASET_ID}`, () =>
          HttpResponse.json(datasetFixture),
        ),
      );
      const result = await sigma.datasets.get(DATASET_ID);
      expect(result.datasetId).toBe(DATASET_ID);
    });
  });

  describe('listGrants', () => {
    it('fetches grants for a dataset', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/datasets/${DATASET_ID}/grants`, () =>
          HttpResponse.json(datasetGrantListFixture),
        ),
      );
      const result = await sigma.datasets.listGrants(DATASET_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listGrantsAll', () => {
    it('returns all dataset grants as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/datasets/${DATASET_ID}/grants`, () =>
          HttpResponse.json(datasetGrantListFixture),
        ),
      );
      const all = await sigma.datasets.listGrantsAll(DATASET_ID).toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('createGrant', () => {
    it('creates a grant on a dataset', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(
          `${BASE_URL}/v2/datasets/${DATASET_ID}/grants`,
          async ({ request }) => {
            capturedBody = await request.json();
            return HttpResponse.json(datasetGrantFixture);
          },
        ),
      );
      await sigma.datasets.createGrant(DATASET_ID, {
        grants: [{ grantee: { memberId: MEMBER_ID }, permission: 'view' }],
      });
      expect(capturedBody).toMatchObject({
        grants: [{ grantee: { memberId: MEMBER_ID } }],
      });
    });
  });

  describe('deleteGrant', () => {
    it('deletes a grant from a dataset', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(
          `${BASE_URL}/v2/datasets/${DATASET_ID}/grants/${GRANT_ID}`,
          () => {
            deleteCalled = true;
            return HttpResponse.json(datasetGrantFixture);
          },
        ),
      );
      await sigma.datasets.deleteGrant(DATASET_ID, GRANT_ID);
      expect(deleteCalled).toBe(true);
    });
  });

  describe('listMaterializations', () => {
    it('fetches materializations for a dataset', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/datasets/${DATASET_ID}/materialization`, () =>
          HttpResponse.json(datasetMaterializationListFixture),
        ),
      );
      const result = await sigma.datasets.listMaterializations(DATASET_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listMaterializationsAll', () => {
    it('returns all materializations as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/datasets/${DATASET_ID}/materialization`, () =>
          HttpResponse.json(datasetMaterializationListFixture),
        ),
      );
      const all = await sigma.datasets
        .listMaterializationsAll(DATASET_ID)
        .toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('materialize', () => {
    it('materializes a dataset', async () => {
      server.use(
        http.post(`${BASE_URL}/v2/datasets/${DATASET_ID}/materialization`, () =>
          HttpResponse.json(materializationFixture),
        ),
      );
      const result = await sigma.datasets.materialize(DATASET_ID, {});
      expect(result).toBeDefined();
    });
  });

  describe('migrateToDataModel', () => {
    it('migrates a dataset to a data model', async () => {
      server.use(
        http.post(`${BASE_URL}/v2/datasets/${DATASET_ID}/migrate`, () =>
          HttpResponse.json({ dataModelId: 'dm-1' }),
        ),
      );
      const result = await sigma.datasets.migrateToDataModel(DATASET_ID, {
        shouldUpdateReferences: false,
      });
      expect(result).toBeDefined();
    });
  });

  describe('listSources', () => {
    it('fetches sources for a dataset as a bare array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/datasets/${DATASET_ID}/sources`, () =>
          HttpResponse.json(datasetSourcesFixture),
        ),
      );
      const result = await sigma.datasets.listSources(DATASET_ID);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('allows narrowing to dataset and table variants', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/datasets/${DATASET_ID}/sources`, () =>
          HttpResponse.json(datasetSourcesFixture),
        ),
      );
      const result = await sigma.datasets.listSources(DATASET_ID);
      const datasetSource = result.find((s) => s.type === 'dataset');
      const tableSource = result.find((s) => s.type === 'table');
      expect(datasetSource).toBeDefined();
      expect(tableSource).toBeDefined();
      if (datasetSource?.type === 'dataset') {
        expect(datasetSource.inodeId).toBeDefined();
      }
    });
  });
});
