import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import {
  workbookFixture,
  workbookListFixture,
  pageListFixture,
  elementListFixture,
  columnListFixture,
  bookmarkFixture,
  bookmarkListFixture,
  scheduleFixture,
  scheduleListFixture,
  embedListFixture,
  embedFixture,
  grantFixture,
  lineageTreeFixture,
  controlListFixture,
  workbookQueryListFixture,
  versionHistoryListFixture,
  workbookSourcesFixture,
  workbookSchemaFixture,
  workbookMatScheduleListFixture,
  elementQueryFixture,
  materializationFixture,
  workbookTagListFixture,
  taggedBookmarkListFixture,
  tagFixture,
  workbookSpecFixture,
  WORKBOOK_ID,
  PAGE_ID,
  ELEMENT_ID,
  BOOKMARK_ID,
  SCHEDULE_ID,
  EMBED_ID,
  GRANT_ID,
  TAG_ID,
  MEMBER_ID,
  MATERIALIZATION_ID,
} from './helpers/fixtures';

const sigma = createSigmaClient({
  baseUrl: BASE_URL,
  accessToken: 'test-token',
});

describe('WorkbooksResource', () => {
  describe('list', () => {
    it('returns a page of workbooks', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks`, () =>
          HttpResponse.json(workbookListFixture),
        ),
      );
      const result = await sigma.workbooks.list();
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].workbookId).toBe(WORKBOOK_ID);
    });
  });

  describe('listAll', () => {
    it('returns all workbooks as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks`, () =>
          HttpResponse.json(workbookListFixture),
        ),
      );
      const all = await sigma.workbooks.listAll().toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('posts to /v2/workbooks and returns the new workbook', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE_URL}/v2/workbooks`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(workbookFixture);
        }),
      );
      const result = await sigma.workbooks.create({
        name: 'My Workbook',
        folderId: 'folder-1',
      });
      expect(result.workbookId).toBe(WORKBOOK_ID);
      expect(capturedBody).toMatchObject({ name: 'My Workbook' });
    });
  });

  describe('get', () => {
    it('fetches a workbook by ID', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}`, () =>
          HttpResponse.json(workbookFixture),
        ),
      );
      const result = await sigma.workbooks.get(WORKBOOK_ID);
      expect(result.workbookId).toBe(WORKBOOK_ID);
      expect(result.name).toBe('My Workbook');
    });
  });

  describe('listBookmarks', () => {
    it('fetches bookmarks for a workbook', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/bookmarks`, () =>
          HttpResponse.json(bookmarkListFixture),
        ),
      );
      const result = await sigma.workbooks.listBookmarks(WORKBOOK_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listBookmarksAll', () => {
    it('returns all bookmarks as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/bookmarks`, () =>
          HttpResponse.json(bookmarkListFixture),
        ),
      );
      const all = await sigma.workbooks.listBookmarksAll(WORKBOOK_ID).toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('createBookmark', () => {
    it('posts a new bookmark', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(
          `${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/bookmarks`,
          async ({ request }) => {
            capturedBody = await request.json();
            return HttpResponse.json(bookmarkFixture);
          },
        ),
      );
      await sigma.workbooks.createBookmark(WORKBOOK_ID, {
        name: 'My Bookmark',
        workbookVersion: 1,
        isShared: false,
        exploreKey: 'key-1',
      });
      expect(capturedBody).toMatchObject({ name: 'My Bookmark' });
    });
  });

  describe('getBookmark', () => {
    it('fetches a bookmark by ID', async () => {
      server.use(
        http.get(
          `${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/bookmarks/${BOOKMARK_ID}`,
          () => HttpResponse.json(bookmarkFixture),
        ),
      );
      const result = await sigma.workbooks.getBookmark(
        WORKBOOK_ID,
        BOOKMARK_ID,
      );
      expect(result.bookmarkId).toBe(BOOKMARK_ID);
    });
  });

  describe('updateBookmark', () => {
    it('patches a bookmark', async () => {
      server.use(
        http.patch(
          `${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/bookmarks/${BOOKMARK_ID}`,
          () => HttpResponse.json({ ...bookmarkFixture, name: 'Updated' }),
        ),
      );
      const result = await sigma.workbooks.updateBookmark(
        WORKBOOK_ID,
        BOOKMARK_ID,
        { name: 'Updated' },
      );
      expect(result.name).toBe('Updated');
    });
  });

  describe('deleteBookmark', () => {
    it('deletes a bookmark', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(
          `${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/bookmarks/${BOOKMARK_ID}`,
          () => {
            deleteCalled = true;
            return HttpResponse.json(bookmarkFixture);
          },
        ),
      );
      await sigma.workbooks.deleteBookmark(WORKBOOK_ID, BOOKMARK_ID);
      expect(deleteCalled).toBe(true);
    });
  });

  describe('listColumns', () => {
    it('fetches columns for a workbook', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/columns`, () =>
          HttpResponse.json(columnListFixture),
        ),
      );
      const result = await sigma.workbooks.listColumns(WORKBOOK_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listColumnsAll', () => {
    it('returns all columns as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/columns`, () =>
          HttpResponse.json(columnListFixture),
        ),
      );
      const all = await sigma.workbooks.listColumnsAll(WORKBOOK_ID).toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('listControls', () => {
    it('fetches controls for a workbook', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/controls`, () =>
          HttpResponse.json(controlListFixture),
        ),
      );
      const result = await sigma.workbooks.listControls(WORKBOOK_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listControlsAll', () => {
    it('returns all controls as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/controls`, () =>
          HttpResponse.json(controlListFixture),
        ),
      );
      const all = await sigma.workbooks.listControlsAll(WORKBOOK_ID).toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('copy', () => {
    it('copies a workbook', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(
          `${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/copy`,
          async ({ request }) => {
            capturedBody = await request.json();
            return HttpResponse.json({
              ...workbookFixture,
              workbookId: 'wb-copy-1',
            });
          },
        ),
      );
      await sigma.workbooks.copy(WORKBOOK_ID, {
        destinationFolderId: 'folder-1',
        name: 'Copy',
      });
      expect(capturedBody).toMatchObject({ name: 'Copy' });
    });
  });

  describe('listElements', () => {
    it('fetches elements for a workbook', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/elements`, () =>
          HttpResponse.json(elementListFixture),
        ),
      );
      const result = await sigma.workbooks.listElements(WORKBOOK_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listElementsAll', () => {
    it('returns all elements as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/elements`, () =>
          HttpResponse.json(elementListFixture),
        ),
      );
      const all = await sigma.workbooks.listElementsAll(WORKBOOK_ID).toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('listElementColumns', () => {
    it('fetches columns for a workbook element', async () => {
      server.use(
        http.get(
          `${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/elements/${ELEMENT_ID}/columns`,
          () => HttpResponse.json(columnListFixture),
        ),
      );
      const result = await sigma.workbooks.listElementColumns(
        WORKBOOK_ID,
        ELEMENT_ID,
      );
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listElementColumnsAll', () => {
    it('returns all element columns as a flat array', async () => {
      server.use(
        http.get(
          `${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/elements/${ELEMENT_ID}/columns`,
          () => HttpResponse.json(columnListFixture),
        ),
      );
      const all = await sigma.workbooks
        .listElementColumnsAll(WORKBOOK_ID, ELEMENT_ID)
        .toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('getElementQuery', () => {
    it('fetches the query for a workbook element', async () => {
      server.use(
        http.get(
          `${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/elements/${ELEMENT_ID}/query`,
          () => HttpResponse.json(elementQueryFixture),
        ),
      );
      const result = await sigma.workbooks.getElementQuery(
        WORKBOOK_ID,
        ELEMENT_ID,
      );
      expect(result.elementId).toBe(ELEMENT_ID);
    });
  });

  describe('listEmbeds', () => {
    it('fetches embeds for a workbook', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/embeds`, () =>
          HttpResponse.json(embedListFixture),
        ),
      );
      const result = await sigma.workbooks.listEmbeds(WORKBOOK_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listEmbedsAll', () => {
    it('returns all embeds as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/embeds`, () =>
          HttpResponse.json(embedListFixture),
        ),
      );
      const all = await sigma.workbooks.listEmbedsAll(WORKBOOK_ID).toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('createEmbed', () => {
    it('creates an embed for a workbook', async () => {
      server.use(
        http.post(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/embeds`, () =>
          HttpResponse.json(embedFixture),
        ),
      );
      const result = await sigma.workbooks.createEmbed(WORKBOOK_ID, {
        embedType: 'public',
        sourceType: 'workbook',
      });
      expect(result.embedId).toBe(EMBED_ID);
    });
  });

  describe('deleteEmbed', () => {
    it('deletes an embed', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(
          `${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/embeds/${EMBED_ID}`,
          () => {
            deleteCalled = true;
            return HttpResponse.json(embedFixture);
          },
        ),
      );
      await sigma.workbooks.deleteEmbed(WORKBOOK_ID, EMBED_ID);
      expect(deleteCalled).toBe(true);
    });
  });

  describe('export', () => {
    it('exports a workbook', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(
          `${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/export`,
          async ({ request }) => {
            capturedBody = await request.json();
            return HttpResponse.json({ exportId: 'export-1' });
          },
        ),
      );
      await sigma.workbooks.export(WORKBOOK_ID, {
        elementId: ELEMENT_ID,
        format: { type: 'csv' },
      });
      expect(capturedBody).toMatchObject({ elementId: ELEMENT_ID });
    });
  });

  describe('createGrant', () => {
    it('creates a grant on a workbook', async () => {
      server.use(
        http.post(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/grants`, () =>
          HttpResponse.json(grantFixture),
        ),
      );
      const result = await sigma.workbooks.createGrant(WORKBOOK_ID, {
        grants: [{ grantee: { memberId: MEMBER_ID }, permission: 'view' }],
      });
      expect(result.grantId).toBe(GRANT_ID);
    });
  });

  describe('deleteGrant', () => {
    it('deletes a grant from a workbook', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(
          `${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/grants/${GRANT_ID}`,
          () => {
            deleteCalled = true;
            return HttpResponse.json(grantFixture);
          },
        ),
      );
      await sigma.workbooks.deleteGrant(WORKBOOK_ID, GRANT_ID);
      expect(deleteCalled).toBe(true);
    });
  });

  describe('listLineageTree', () => {
    it('fetches lineage tree for a workbook', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/lineage`, () =>
          HttpResponse.json(lineageTreeFixture),
        ),
      );
      const result = await sigma.workbooks.listLineageTree(WORKBOOK_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listLineageTreeAll', () => {
    it('returns all lineage tree entries as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/lineage`, () =>
          HttpResponse.json(lineageTreeFixture),
        ),
      );
      const all = await sigma.workbooks
        .listLineageTreeAll(WORKBOOK_ID)
        .toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('listLineage', () => {
    it('fetches lineage for a workbook element', async () => {
      server.use(
        http.get(
          `${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/lineage/elements/${ELEMENT_ID}`,
          () => HttpResponse.json({ entries: [] }),
        ),
      );
      const result = await sigma.workbooks.listLineage(WORKBOOK_ID, ELEMENT_ID);
      expect(result).toBeDefined();
    });
  });

  describe('listMaterializationSchedules_v2', () => {
    it('fetches materialization schedules (v2)', async () => {
      server.use(
        http.get(
          `${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/materialization-schedules`,
          () => HttpResponse.json(workbookMatScheduleListFixture),
        ),
      );
      const result =
        await sigma.workbooks.listMaterializationSchedules_v2(WORKBOOK_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listMaterializationSchedules_v2All', () => {
    it('returns all materialization schedules from the v2 endpoint as a flat array', async () => {
      server.use(
        http.get(
          `${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/materialization-schedules`,
          () => HttpResponse.json(workbookMatScheduleListFixture),
        ),
      );
      const all = await sigma.workbooks
        .listMaterializationSchedules_v2All(WORKBOOK_ID)
        .toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('materializeElement', () => {
    it('materializes a workbook element', async () => {
      server.use(
        http.post(
          `${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/materializations`,
          () => HttpResponse.json(materializationFixture),
        ),
      );
      const result = await sigma.workbooks.materializeElement(WORKBOOK_ID, {
        sheetId: ELEMENT_ID,
      });
      expect(result.materializationId).toBe(MATERIALIZATION_ID);
    });
  });

  describe('getMaterialization', () => {
    it('fetches a materialization by ID', async () => {
      server.use(
        http.get(
          `${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/materializations/${MATERIALIZATION_ID}`,
          () => HttpResponse.json(materializationFixture),
        ),
      );
      const result = await sigma.workbooks.getMaterialization(
        WORKBOOK_ID,
        MATERIALIZATION_ID,
      );
      expect(result.materializationId).toBe(MATERIALIZATION_ID);
    });
  });

  describe('listPages', () => {
    it('fetches pages for a workbook', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/pages`, () =>
          HttpResponse.json(pageListFixture),
        ),
      );
      const result = await sigma.workbooks.listPages(WORKBOOK_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listPagesAll', () => {
    it('returns all pages as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/pages`, () =>
          HttpResponse.json(pageListFixture),
        ),
      );
      const all = await sigma.workbooks.listPagesAll(WORKBOOK_ID).toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('listPageElements', () => {
    it('fetches elements for a workbook page', async () => {
      server.use(
        http.get(
          `${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/pages/${PAGE_ID}/elements`,
          () => HttpResponse.json(elementListFixture),
        ),
      );
      const result = await sigma.workbooks.listPageElements(
        WORKBOOK_ID,
        PAGE_ID,
      );
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listPageElementsAll', () => {
    it('returns all page elements as a flat array', async () => {
      server.use(
        http.get(
          `${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/pages/${PAGE_ID}/elements`,
          () => HttpResponse.json(elementListFixture),
        ),
      );
      const all = await sigma.workbooks
        .listPageElementsAll(WORKBOOK_ID, PAGE_ID)
        .toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('listQueries', () => {
    it('fetches queries for a workbook', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/queries`, () =>
          HttpResponse.json(workbookQueryListFixture),
        ),
      );
      const result = await sigma.workbooks.listQueries(WORKBOOK_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listQueriesAll', () => {
    it('returns all queries as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/queries`, () =>
          HttpResponse.json(workbookQueryListFixture),
        ),
      );
      const all = await sigma.workbooks.listQueriesAll(WORKBOOK_ID).toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('saveTemplateFrom', () => {
    it('saves a template from a workbook', async () => {
      server.use(
        http.post(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/saveTemplate`, () =>
          HttpResponse.json({ templateId: 'tmpl-1' }),
        ),
      );
      const result = await sigma.workbooks.saveTemplateFrom(WORKBOOK_ID, {
        name: 'My Template',
      });
      expect(result).toBeDefined();
    });
  });

  describe('listSchedules', () => {
    it('fetches schedules for a workbook (v2.1)', async () => {
      server.use(
        http.get(`${BASE_URL}/v2.1/workbooks/${WORKBOOK_ID}/schedules`, () =>
          HttpResponse.json(scheduleListFixture),
        ),
      );
      const result = await sigma.workbooks.listSchedules(WORKBOOK_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listSchedules_v2', () => {
    it('fetches schedules for a workbook (v2)', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/schedules`, () =>
          HttpResponse.json(scheduleListFixture),
        ),
      );
      const result = await sigma.workbooks.listSchedules_v2(WORKBOOK_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listSchedules_v2All', () => {
    it('returns all schedules from the v2 endpoint as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/schedules`, () =>
          HttpResponse.json(scheduleListFixture),
        ),
      );
      const all = await sigma.workbooks
        .listSchedules_v2All(WORKBOOK_ID)
        .toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('createSchedule', () => {
    it('creates a schedule for a workbook', async () => {
      server.use(
        http.post(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/schedules`, () =>
          HttpResponse.json(scheduleFixture),
        ),
      );
      const result = await sigma.workbooks.createSchedule(WORKBOOK_ID, {
        name: 'Daily',
      } as never);
      expect(result.scheduledNotificationId).toBe(SCHEDULE_ID);
    });
  });

  describe('updateSchedule', () => {
    it('patches a schedule', async () => {
      server.use(
        http.patch(
          `${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/schedules/${SCHEDULE_ID}`,
          () => HttpResponse.json({ ...scheduleFixture, name: 'Weekly' }),
        ),
      );
      const result = await sigma.workbooks.updateSchedule(
        WORKBOOK_ID,
        SCHEDULE_ID,
        { name: 'Weekly' } as never,
      );
      expect(result.scheduledNotificationId).toBe(SCHEDULE_ID);
    });
  });

  describe('deleteSchedule', () => {
    it('deletes a schedule', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(
          `${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/schedules/${SCHEDULE_ID}`,
          () => {
            deleteCalled = true;
            return HttpResponse.json(scheduleFixture);
          },
        ),
      );
      await sigma.workbooks.deleteSchedule(WORKBOOK_ID, SCHEDULE_ID);
      expect(deleteCalled).toBe(true);
    });
  });

  describe('getSchema_deprecated', () => {
    it('fetches the workbook schema', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/schema`, () =>
          HttpResponse.json(workbookSchemaFixture),
        ),
      );
      const result = await sigma.workbooks.getSchema_deprecated(WORKBOOK_ID);
      expect(result).toBeDefined();
    });
  });

  describe('send', () => {
    it('sends a workbook', async () => {
      server.use(
        http.post(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/send`, () =>
          HttpResponse.json({ success: true }),
        ),
      );
      const result = await sigma.workbooks.send(WORKBOOK_ID, {} as never);
      expect(result).toBeDefined();
    });
  });

  describe('shareCrossOrg', () => {
    it('shares a workbook cross-org', async () => {
      server.use(
        http.post(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/shareCrossOrg`, () =>
          HttpResponse.json({ shareId: 'share-1' }),
        ),
      );
      const result = await sigma.workbooks.shareCrossOrg(WORKBOOK_ID, {
        orgSlugs: ['org-2'],
      });
      expect(result).toBeDefined();
    });
  });

  describe('listSources', () => {
    it('fetches sources for a workbook as a bare array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/sources`, () =>
          HttpResponse.json(workbookSourcesFixture),
        ),
      );
      const result = await sigma.workbooks.listSources(WORKBOOK_ID);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(4);
    });

    it('returns all source type variants including custom-sql', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/sources`, () =>
          HttpResponse.json(workbookSourcesFixture),
        ),
      );
      const result = await sigma.workbooks.listSources(WORKBOOK_ID);
      const types = result.map((s) => s.type);
      expect(types).toContain('data-model');
      expect(types).toContain('dataset');
      expect(types).toContain('table');
      expect(types).toContain('custom-sql');
    });

    it('allows narrowing to custom-sql variant', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/sources`, () =>
          HttpResponse.json(workbookSourcesFixture),
        ),
      );
      const result = await sigma.workbooks.listSources(WORKBOOK_ID);
      const customSql = result.find((s) => s.type === 'custom-sql');
      expect(customSql).toBeDefined();
      if (customSql?.type === 'custom-sql') {
        expect(customSql.connectionId).toBeDefined();
        expect(customSql.definition).toBeDefined();
        expect(customSql.customSqlId).toBeDefined();
      }
    });
  });

  describe('sourceSwap', () => {
    it('swaps sources for a workbook', async () => {
      server.use(
        http.post(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/swapSources`, () =>
          HttpResponse.json({ success: true }),
        ),
      );
      const result = await sigma.workbooks.sourceSwap(WORKBOOK_ID, {});
      expect(result).toBeDefined();
    });
  });

  describe('copyTagged', () => {
    it('copies a tagged workbook', async () => {
      server.use(
        http.post(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/tag/v1.0/copy`, () =>
          HttpResponse.json(workbookFixture),
        ),
      );
      const result = await sigma.workbooks.copyTagged(WORKBOOK_ID, 'v1.0', {
        destinationFolderId: 'folder-1',
        name: 'Copy',
      });
      expect(result).toBeDefined();
    });
  });

  describe('listTags', () => {
    it('fetches tags for a workbook', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/tags`, () =>
          HttpResponse.json(workbookTagListFixture),
        ),
      );
      const result = await sigma.workbooks.listTags(WORKBOOK_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listTagsAll', () => {
    it('returns all tags as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/tags`, () =>
          HttpResponse.json(workbookTagListFixture),
        ),
      );
      const all = await sigma.workbooks.listTagsAll(WORKBOOK_ID).toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('untag', () => {
    it('removes a tag from a workbook', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(
          `${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/tags/${TAG_ID}`,
          () => {
            deleteCalled = true;
            return HttpResponse.json(tagFixture);
          },
        ),
      );
      await sigma.workbooks.untag(WORKBOOK_ID, TAG_ID);
      expect(deleteCalled).toBe(true);
    });
  });

  describe('listTaggedBookmarks', () => {
    it('fetches bookmarks for a tagged workbook', async () => {
      server.use(
        http.get(
          `${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/tags/v1.0/bookmarks`,
          () => HttpResponse.json(taggedBookmarkListFixture),
        ),
      );
      const result = await sigma.workbooks.listTaggedBookmarks(
        WORKBOOK_ID,
        'v1.0',
      );
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('createTaggedBookmark', () => {
    it('creates a bookmark on a tagged workbook', async () => {
      server.use(
        http.post(
          `${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/tags/v1.0/bookmarks/`,
          () => HttpResponse.json({ bookmarkId: BOOKMARK_ID }),
        ),
      );
      const result = await sigma.workbooks.createTaggedBookmark(
        WORKBOOK_ID,
        'v1.0',
        {
          name: 'My Bookmark',
          workbookVersion: 1,
          isShared: false,
          exploreKey: 'key-1',
        },
      );
      expect(result).toBeDefined();
    });
  });

  describe('getTaggedBookmark', () => {
    it('fetches a bookmark on a tagged workbook', async () => {
      server.use(
        http.get(
          `${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/tags/v1.0/bookmarks/${BOOKMARK_ID}`,
          () => HttpResponse.json({ bookmarkId: BOOKMARK_ID }),
        ),
      );
      const result = await sigma.workbooks.getTaggedBookmark(
        WORKBOOK_ID,
        'v1.0',
        BOOKMARK_ID,
      );
      expect(result).toBeDefined();
    });
  });

  describe('updateTaggedBookmark', () => {
    it('updates a bookmark on a tagged workbook', async () => {
      server.use(
        http.patch(
          `${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/tags/v1.0/bookmarks/${BOOKMARK_ID}`,
          () => HttpResponse.json({ bookmarkId: BOOKMARK_ID, name: 'Updated' }),
        ),
      );
      const result = await sigma.workbooks.updateTaggedBookmark(
        WORKBOOK_ID,
        'v1.0',
        BOOKMARK_ID,
        { name: 'Updated' },
      );
      expect(result).toBeDefined();
    });
  });

  describe('deleteTaggedBookmark', () => {
    it('deletes a bookmark on a tagged workbook', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(
          `${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/tags/v1.0/bookmarks/${BOOKMARK_ID}`,
          () => {
            deleteCalled = true;
            return HttpResponse.json({});
          },
        ),
      );
      await sigma.workbooks.deleteTaggedBookmark(
        WORKBOOK_ID,
        'v1.0',
        BOOKMARK_ID,
      );
      expect(deleteCalled).toBe(true);
    });
  });

  describe('listVersionHistory', () => {
    it('fetches version history for a workbook', async () => {
      server.use(
        http.get(
          `${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/version-history`,
          () => HttpResponse.json(versionHistoryListFixture),
        ),
      );
      const result = await sigma.workbooks.listVersionHistory(WORKBOOK_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listVersionHistoryAll', () => {
    it('returns all version history entries as a flat array', async () => {
      server.use(
        http.get(
          `${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/version-history`,
          () => HttpResponse.json(versionHistoryListFixture),
        ),
      );
      const all = await sigma.workbooks
        .listVersionHistoryAll(WORKBOOK_ID)
        .toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('tag', () => {
    it('tags a workbook', async () => {
      server.use(
        http.post(`${BASE_URL}/v2/workbooks/tag`, () =>
          HttpResponse.json(tagFixture),
        ),
      );
      const result = await sigma.workbooks.tag({
        workbookId: WORKBOOK_ID,
        tag: 'v1.0',
      });
      expect(result).toBeDefined();
    });
  });

  describe('listMaterializationSchedules', () => {
    it('fetches materialization schedules (v2.1)', async () => {
      server.use(
        http.get(
          `${BASE_URL}/v2.1/workbooks/${WORKBOOK_ID}/materialization-schedules`,
          () => HttpResponse.json(workbookMatScheduleListFixture),
        ),
      );
      const result =
        await sigma.workbooks.listMaterializationSchedules(WORKBOOK_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listSchedulesAll', () => {
    it('returns all schedules as a flat array (v2.1)', async () => {
      server.use(
        http.get(`${BASE_URL}/v2.1/workbooks/${WORKBOOK_ID}/schedules`, () =>
          HttpResponse.json(scheduleListFixture),
        ),
      );
      const all = await sigma.workbooks.listSchedulesAll(WORKBOOK_ID).toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('sourceSwapV3Alpha', () => {
    it('swaps sources using v3alpha endpoint', async () => {
      server.use(
        http.post(
          `${BASE_URL}/v3alpha/workbooks/${WORKBOOK_ID}:swapSources`,
          () => HttpResponse.json({ success: true }),
        ),
      );
      const result = await sigma.workbooks.sourceSwapV3Alpha(WORKBOOK_ID, {
        sourceMapping: [],
      });
      expect(result).toBeDefined();
    });
  });

  describe('getSpec', () => {
    it('fetches the code representation of a workbook', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/spec`, () =>
          HttpResponse.json(workbookSpecFixture),
        ),
      );
      const result = await sigma.workbooks.getSpec(WORKBOOK_ID);
      expect(result).toBeDefined();
    });
  });

  describe('updateSpec', () => {
    it('replaces a workbook from a code representation', async () => {
      let capturedBody: unknown;
      server.use(
        http.put(
          `${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/spec`,
          async ({ request }) => {
            capturedBody = await request.json();
            return HttpResponse.json(workbookSpecFixture);
          },
        ),
      );
      const result = await sigma.workbooks.updateSpec(WORKBOOK_ID, {
        pages: [],
      } as never);
      expect(result).toBeDefined();
      expect(capturedBody).toMatchObject({ pages: [] });
    });
  });

  describe('createSpec', () => {
    it('creates a new workbook from a code representation', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE_URL}/v2/workbooks/spec`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(workbookSpecFixture);
        }),
      );
      const result = await sigma.workbooks.createSpec({
        folderId: 'folder-1',
        pages: [],
      } as never);
      expect(result).toBeDefined();
      expect(capturedBody).toMatchObject({ folderId: 'folder-1' });
    });
  });

  describe('hydration — tagsResource', () => {
    it('get: preserves the response tags field and exposes tagsResource accessor', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}`, () =>
          HttpResponse.json(workbookFixture),
        ),
      );
      const workbook = await sigma.workbooks.get(WORKBOOK_ID);
      // The response field must survive hydration
      expect(workbook.tags).toEqual([{ tagName: 'v1.0', tagId: TAG_ID }]);
      // The sub-resource accessor must exist under the renamed key
      expect(typeof workbook.tagsResource).toBe('object');
      expect(typeof workbook.tagsResource.list).toBe('function');
      expect(typeof workbook.tagsResource.listAll).toBe('function');
    });

    it('tagsResource.list: fetches workbook tags via the hydrated accessor', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}`, () =>
          HttpResponse.json(workbookFixture),
        ),
        http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/tags`, () =>
          HttpResponse.json(workbookTagListFixture),
        ),
      );
      const workbook = await sigma.workbooks.get(WORKBOOK_ID);
      const result = await workbook.tagsResource.list();
      expect(result.entries).toHaveLength(1);
    });

    it('tagsResource.listAll: auto-paginates via the hydrated accessor', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}`, () =>
          HttpResponse.json(workbookFixture),
        ),
        http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}/tags`, () =>
          HttpResponse.json(workbookTagListFixture),
        ),
      );
      const workbook = await sigma.workbooks.get(WORKBOOK_ID);
      const all = await workbook.tagsResource.listAll().toArray();
      expect(all).toHaveLength(1);
    });

    it('list: preserves the response tags field on list entries', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/workbooks`, () =>
          HttpResponse.json({
            entries: [workbookFixture],
            nextPage: null,
            total: 1,
          }),
        ),
      );
      const page = await sigma.workbooks.list();
      expect(page.entries[0].tags).toEqual([
        { tagName: 'v1.0', tagId: TAG_ID },
      ]);
      expect(typeof page.entries[0].tagsResource).toBe('object');
    });
  });
});
