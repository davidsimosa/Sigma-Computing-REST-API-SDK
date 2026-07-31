import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import {
  dataModelFixture,
  dataModelListFixture,
  dataModelColumnListFixture,
  dataModelElementListFixture,
  dataModelSourceListFixture,
  dataModelTagListFixture,
  dataModelSpecFixture,
  lineageTreeFixture,
  materializationFixture,
  workbookMatScheduleListFixture,
  DATA_MODEL_ID,
  MATERIALIZATION_ID,
  TAG_ID,
} from './helpers/fixtures';

const sigma = createSigmaClient({
  baseUrl: BASE_URL,
  accessToken: 'test-token',
});

describe('DataModelsResource', () => {
  describe('list', () => {
    it('returns a page of data models', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/dataModels`, () =>
          HttpResponse.json(dataModelListFixture),
        ),
      );
      const result = await sigma.dataModels.list();
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].dataModelId).toBe(DATA_MODEL_ID);
    });
  });

  describe('listAll', () => {
    it('returns all data models as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/dataModels`, () =>
          HttpResponse.json(dataModelListFixture),
        ),
      );
      const all = await sigma.dataModels.listAll().toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('get', () => {
    it('fetches a data model by ID', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/dataModels/${DATA_MODEL_ID}`, () =>
          HttpResponse.json(dataModelFixture),
        ),
      );
      const result = await sigma.dataModels.get(DATA_MODEL_ID);
      expect(result.dataModelId).toBe(DATA_MODEL_ID);
    });
  });

  describe('materializeElement', () => {
    it('materializes a data model element', async () => {
      server.use(
        http.post(
          `${BASE_URL}/v2/dataModels/${DATA_MODEL_ID}:materialize`,
          () => HttpResponse.json(materializationFixture),
        ),
      );
      const result = await sigma.dataModels.materializeElement(
        DATA_MODEL_ID,
        {} as never,
      );
      expect(result).toBeDefined();
    });
  });

  describe('listColumns', () => {
    it('fetches columns for a data model', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/dataModels/${DATA_MODEL_ID}/columns`, () =>
          HttpResponse.json(dataModelColumnListFixture),
        ),
      );
      const result = await sigma.dataModels.listColumns(DATA_MODEL_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listColumnsAll', () => {
    it('returns all columns as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/dataModels/${DATA_MODEL_ID}/columns`, () =>
          HttpResponse.json(dataModelColumnListFixture),
        ),
      );
      const all = await sigma.dataModels
        .listColumnsAll(DATA_MODEL_ID)
        .toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('listElements', () => {
    it('fetches elements for a data model', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/dataModels/${DATA_MODEL_ID}/elements`, () =>
          HttpResponse.json(dataModelElementListFixture),
        ),
      );
      const result = await sigma.dataModels.listElements(DATA_MODEL_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listElementsAll', () => {
    it('returns all elements as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/dataModels/${DATA_MODEL_ID}/elements`, () =>
          HttpResponse.json(dataModelElementListFixture),
        ),
      );
      const all = await sigma.dataModels
        .listElementsAll(DATA_MODEL_ID)
        .toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('listLineageTree', () => {
    it('fetches lineage tree for a data model', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/dataModels/${DATA_MODEL_ID}/lineage`, () =>
          HttpResponse.json(lineageTreeFixture),
        ),
      );
      const result = await sigma.dataModels.listLineageTree(DATA_MODEL_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listLineageTreeAll', () => {
    it('returns all lineage entries as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/dataModels/${DATA_MODEL_ID}/lineage`, () =>
          HttpResponse.json(lineageTreeFixture),
        ),
      );
      const all = await sigma.dataModels
        .listLineageTreeAll(DATA_MODEL_ID)
        .toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('getMaterialization', () => {
    it('fetches a materialization by ID', async () => {
      server.use(
        http.get(
          `${BASE_URL}/v2/dataModels/${DATA_MODEL_ID}/materializations/${MATERIALIZATION_ID}`,
          () => HttpResponse.json(materializationFixture),
        ),
      );
      const result = await sigma.dataModels.getMaterialization(
        DATA_MODEL_ID,
        MATERIALIZATION_ID,
      );
      expect(result).toBeDefined();
    });
  });

  describe('listMaterializationSchedules', () => {
    it('fetches materialization schedules for a data model', async () => {
      server.use(
        http.get(
          `${BASE_URL}/v2/dataModels/${DATA_MODEL_ID}/materializationSchedules`,
          () => HttpResponse.json(workbookMatScheduleListFixture),
        ),
      );
      const result =
        await sigma.dataModels.listMaterializationSchedules(DATA_MODEL_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listMaterializationSchedulesAll', () => {
    it('returns all materialization schedules as a flat array', async () => {
      server.use(
        http.get(
          `${BASE_URL}/v2/dataModels/${DATA_MODEL_ID}/materializationSchedules`,
          () => HttpResponse.json(workbookMatScheduleListFixture),
        ),
      );
      const all = await sigma.dataModels
        .listMaterializationSchedulesAll(DATA_MODEL_ID)
        .toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('listSources', () => {
    it('fetches sources for a data model', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/dataModels/${DATA_MODEL_ID}/sources`, () =>
          HttpResponse.json(dataModelSourceListFixture),
        ),
      );
      const result = await sigma.dataModels.listSources(DATA_MODEL_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listSourcesAll', () => {
    it('returns all sources as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/dataModels/${DATA_MODEL_ID}/sources`, () =>
          HttpResponse.json(dataModelSourceListFixture),
        ),
      );
      const all = await sigma.dataModels
        .listSourcesAll(DATA_MODEL_ID)
        .toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('getSpec', () => {
    it('fetches the spec for a data model', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/dataModels/${DATA_MODEL_ID}/spec`, () =>
          HttpResponse.json(dataModelSpecFixture),
        ),
      );
      const result = await sigma.dataModels.getSpec(DATA_MODEL_ID);
      expect(result).toBeDefined();
    });
  });

  describe('updateSpec', () => {
    it('updates the spec for a data model', async () => {
      let capturedBody: unknown;
      server.use(
        http.put(
          `${BASE_URL}/v2/dataModels/${DATA_MODEL_ID}/spec`,
          async ({ request }) => {
            capturedBody = await request.json();
            return HttpResponse.json(dataModelSpecFixture);
          },
        ),
      );
      await sigma.dataModels.updateSpec(DATA_MODEL_ID, { spec: {} } as never);
      expect(capturedBody).toBeDefined();
    });
  });

  describe('swapSources', () => {
    it('swaps sources for a data model', async () => {
      server.use(
        http.post(
          `${BASE_URL}/v2/dataModels/${DATA_MODEL_ID}/swapSources`,
          () => HttpResponse.json({ success: true }),
        ),
      );
      const result = await sigma.dataModels.swapSources(DATA_MODEL_ID, {});
      expect(result).toBeDefined();
    });
  });

  describe('listTags', () => {
    it('fetches tags for a data model', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/dataModels/${DATA_MODEL_ID}/tags`, () =>
          HttpResponse.json(dataModelTagListFixture),
        ),
      );
      const result = await sigma.dataModels.listTags(DATA_MODEL_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listTagsAll', () => {
    it('returns all tags as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/dataModels/${DATA_MODEL_ID}/tags`, () =>
          HttpResponse.json(dataModelTagListFixture),
        ),
      );
      const all = await sigma.dataModels.listTagsAll(DATA_MODEL_ID).toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('createSpec', () => {
    it('creates a spec for a data model', async () => {
      server.use(
        http.post(`${BASE_URL}/v2/dataModels/spec`, () =>
          HttpResponse.json(dataModelSpecFixture),
        ),
      );
      const result = await sigma.dataModels.createSpec({ spec: {} } as never);
      expect(result).toBeDefined();
    });
  });

  describe('tag', () => {
    it('tags a data model', async () => {
      server.use(
        http.post(`${BASE_URL}/v2/dataModels/tag`, () =>
          HttpResponse.json({ tagId: 'tag-1' }),
        ),
      );
      const result = await sigma.dataModels.tag({
        dataModelId: DATA_MODEL_ID,
        tag: 'v1.0',
      });
      expect(result).toBeDefined();
    });
  });

  describe('sourceSwapV3Alpha', () => {
    it('swaps sources via v3alpha', async () => {
      server.use(
        http.post(
          `${BASE_URL}/v3alpha/dataModels/${DATA_MODEL_ID}:swapSources`,
          () => HttpResponse.json({ success: true }),
        ),
      );
      const result = await sigma.dataModels.sourceSwapV3Alpha(
        DATA_MODEL_ID,
        {} as never,
      );
      expect(result).toBeDefined();
    });
  });

  describe('hydration — tagsResource', () => {
    it('get: preserves the response tags field and exposes tagsResource accessor', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/dataModels/${DATA_MODEL_ID}`, () =>
          HttpResponse.json(dataModelFixture),
        ),
      );
      const dataModel = await sigma.dataModels.get(DATA_MODEL_ID);
      // The response field must survive hydration
      expect(dataModel.tags).toEqual([{ tagName: 'v1.0', tagId: TAG_ID }]);
      // The sub-resource accessor must exist under the renamed key
      expect(typeof dataModel.tagsResource).toBe('object');
      expect(typeof dataModel.tagsResource.list).toBe('function');
      expect(typeof dataModel.tagsResource.listAll).toBe('function');
    });

    it('tagsResource.list: fetches data model tags via the hydrated accessor', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/dataModels/${DATA_MODEL_ID}`, () =>
          HttpResponse.json(dataModelFixture),
        ),
        http.get(`${BASE_URL}/v2/dataModels/${DATA_MODEL_ID}/tags`, () =>
          HttpResponse.json(dataModelTagListFixture),
        ),
      );
      const dataModel = await sigma.dataModels.get(DATA_MODEL_ID);
      const result = await dataModel.tagsResource.list();
      expect(result.entries).toHaveLength(1);
    });

    it('tagsResource.listAll: auto-paginates via the hydrated accessor', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/dataModels/${DATA_MODEL_ID}`, () =>
          HttpResponse.json(dataModelFixture),
        ),
        http.get(`${BASE_URL}/v2/dataModels/${DATA_MODEL_ID}/tags`, () =>
          HttpResponse.json(dataModelTagListFixture),
        ),
      );
      const dataModel = await sigma.dataModels.get(DATA_MODEL_ID);
      const all = await dataModel.tagsResource.listAll().toArray();
      expect(all).toHaveLength(1);
    });

    it('list: preserves the response tags field on list entries', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/dataModels`, () =>
          HttpResponse.json({
            entries: [dataModelFixture],
            nextPage: null,
            total: 1,
          }),
        ),
      );
      const page = await sigma.dataModels.list();
      expect(page.entries[0].tags).toEqual([
        { tagName: 'v1.0', tagId: TAG_ID },
      ]);
      expect(typeof page.entries[0].tagsResource).toBe('object');
    });
  });
});
