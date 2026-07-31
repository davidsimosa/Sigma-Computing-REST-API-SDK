import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { collectPages } from '../src/pagination';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import { workbookFixture } from './helpers/fixtures';

const sigma = createSigmaClient({
  baseUrl: BASE_URL,
  accessToken: 'test-token',
});

const page1 = {
  entries: [{ ...workbookFixture, workbookId: 'wb-1', name: 'Workbook 1' }],
  nextPage: 'cursor-page-2',
  total: 2,
};
const page2 = {
  entries: [{ ...workbookFixture, workbookId: 'wb-2', name: 'Workbook 2' }],
  nextPage: null,
  total: 2,
};

describe('Pagination', () => {
  describe('list() — single page', () => {
    it('returns the first page of results', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks`, () => HttpResponse.json(page1)),
      );
      const result = await sigma.workbooks.list({ limit: 1 });
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].name).toBe('Workbook 1');
      expect(result.nextPage).toBe('cursor-page-2');
    });
  });

  describe('listAll().toArray() — collects all pages', () => {
    it('follows nextPage cursors and returns all entries as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks`, ({ request }) => {
          const url = new URL(request.url);
          const page = url.searchParams.get('page');
          return HttpResponse.json(page === 'cursor-page-2' ? page2 : page1);
        }),
      );
      const all = await sigma.workbooks.listAll().toArray();
      expect(all).toHaveLength(2);
      expect(all[0].name).toBe('Workbook 1');
      expect(all[1].name).toBe('Workbook 2');
    });

    it('stops when nextPage is null', async () => {
      let callCount = 0;
      server.use(
        http.get(`${BASE_URL}/v2/workbooks`, ({ request }) => {
          callCount++;
          const url = new URL(request.url);
          const page = url.searchParams.get('page');
          return HttpResponse.json(page === 'cursor-page-2' ? page2 : page1);
        }),
      );
      await sigma.workbooks.listAll().toArray();
      expect(callCount).toBe(2);
    });
  });

  describe('listAll() — async generator (page-by-page)', () => {
    it('yields each page individually', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks`, ({ request }) => {
          const url = new URL(request.url);
          const page = url.searchParams.get('page');
          return HttpResponse.json(page === 'cursor-page-2' ? page2 : page1);
        }),
      );
      const pages: (typeof page1)[] = [];
      for await (const page of sigma.workbooks.listAll()) {
        pages.push(page as unknown as typeof page1);
      }
      expect(pages).toHaveLength(2);
      expect(pages[0].entries[0].name).toBe('Workbook 1');
      expect(pages[1].entries[0].name).toBe('Workbook 2');
    });
  });

  describe('collectPages()', () => {
    it('collects all pages into an array preserving page structure', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks`, ({ request }) => {
          const url = new URL(request.url);
          const page = url.searchParams.get('page');
          return HttpResponse.json(page === 'cursor-page-2' ? page2 : page1);
        }),
      );
      const allPages = await collectPages(sigma.workbooks.listAll());
      expect(allPages).toHaveLength(2);
      expect(allPages[0].entries[0].name).toBe('Workbook 1');
      expect(allPages[1].entries[0].name).toBe('Workbook 2');
    });

    it('preserves nextPage on each page object', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks`, ({ request }) => {
          const url = new URL(request.url);
          const page = url.searchParams.get('page');
          return HttpResponse.json(page === 'cursor-page-2' ? page2 : page1);
        }),
      );
      const allPages = await collectPages(sigma.workbooks.listAll());
      expect(allPages[0].nextPage).toBe('cursor-page-2');
      expect(allPages[1].nextPage).toBeNull();
    });
  });

  describe('toArray() with AbortSignal', () => {
    it('aborts mid-pagination when signal fires', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks`, ({ request }) => {
          const url = new URL(request.url);
          const page = url.searchParams.get('page');
          return HttpResponse.json(page === 'cursor-page-2' ? page2 : page1);
        }),
      );
      const controller = new AbortController();
      controller.abort();
      await expect(
        sigma.workbooks.listAll().toArray({ signal: controller.signal }),
      ).rejects.toThrow();
    });
  });
});
