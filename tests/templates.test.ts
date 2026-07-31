import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import {
  templateFixture,
  templateListFixture,
  workbookFixture,
  TEMPLATE_ID,
} from './helpers/fixtures';

const sigma = createSigmaClient({
  baseUrl: BASE_URL,
  accessToken: 'test-token',
});

describe('TemplatesResource', () => {
  describe('list', () => {
    it('returns a page of templates', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/templates`, () =>
          HttpResponse.json(templateListFixture),
        ),
      );
      const result = await sigma.templates.list();
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].templateId).toBe(TEMPLATE_ID);
    });
  });

  describe('listAll', () => {
    it('returns all templates as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/templates`, () =>
          HttpResponse.json(templateListFixture),
        ),
      );
      const all = await sigma.templates.listAll().toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('get', () => {
    it('fetches a template by ID', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/templates/${TEMPLATE_ID}`, () =>
          HttpResponse.json(templateFixture),
        ),
      );
      const result = await sigma.templates.get(TEMPLATE_ID);
      expect(result.templateId).toBe(TEMPLATE_ID);
    });
  });

  describe('sourceSwap', () => {
    it('swaps sources for a template', async () => {
      server.use(
        http.post(`${BASE_URL}/v2/templates/${TEMPLATE_ID}/swapSources`, () =>
          HttpResponse.json({ success: true }),
        ),
      );
      const result = await sigma.templates.sourceSwap(TEMPLATE_ID, {});
      expect(result).toBeDefined();
    });
  });

  describe('saveWorkbookFrom', () => {
    it('saves a workbook from a template', async () => {
      server.use(
        http.post(`${BASE_URL}/v2/templates/save_workbook`, () =>
          HttpResponse.json(workbookFixture),
        ),
      );
      const result = await sigma.templates.saveWorkbookFrom({
        templateId: TEMPLATE_ID,
        name: 'My Workbook',
        folderId: 'folder-1',
      });
      expect(result).toBeDefined();
    });
  });
});
