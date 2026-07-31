import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import {
  tagFixture,
  tagListFixture,
  tagWorkbookListFixture,
  TAG_ID,
} from './helpers/fixtures';

const sigma = createSigmaClient({
  baseUrl: BASE_URL,
  accessToken: 'test-token',
});

describe('TagsResource', () => {
  describe('list', () => {
    it('returns a page of tags', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/tags`, () =>
          HttpResponse.json(tagListFixture),
        ),
      );
      const result = await sigma.tags.list();
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].versionTagId).toBe(TAG_ID);
    });
  });

  describe('listAll', () => {
    it('returns all tags as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/tags`, () =>
          HttpResponse.json(tagListFixture),
        ),
      );
      const all = await sigma.tags.listAll().toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('posts to /v2/tags and returns the new tag', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE_URL}/v2/tags`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(tagFixture);
        }),
      );
      const result = await sigma.tags.create({ name: 'v1.0', color: 'cyan' });
      expect(result.versionTagId).toBe(TAG_ID);
      expect(capturedBody).toMatchObject({ name: 'v1.0' });
    });
  });

  describe('update', () => {
    it('patches a tag and returns updated data', async () => {
      const updated = { ...tagFixture, description: 'v2.0 release' };
      let capturedBody: unknown;
      server.use(
        http.patch(`${BASE_URL}/v2/tags/${TAG_ID}`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(updated);
        }),
      );
      const result = await sigma.tags.update(TAG_ID, {
        description: 'v2.0 release',
      });
      expect(result.versionTagId).toBe(TAG_ID);
      expect(capturedBody).toMatchObject({ description: 'v2.0 release' });
    });
  });

  describe('delete', () => {
    it('sends DELETE to /v2/tags/{tagId}', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(`${BASE_URL}/v2/tags/${TAG_ID}`, () => {
          deleteCalled = true;
          return HttpResponse.json({ tagId: TAG_ID });
        }),
      );
      await sigma.tags.delete(TAG_ID);
      expect(deleteCalled).toBe(true);
    });
  });

  describe('listWorkbooks', () => {
    it('fetches workbooks for a tag', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/tags/${TAG_ID}/workbooks`, () =>
          HttpResponse.json(tagWorkbookListFixture),
        ),
      );
      const result = await sigma.tags.listWorkbooks(TAG_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listWorkbooksAll', () => {
    it('returns all workbooks as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/tags/${TAG_ID}/workbooks`, () =>
          HttpResponse.json(tagWorkbookListFixture),
        ),
      );
      const all = await sigma.tags.listWorkbooksAll(TAG_ID).toArray();
      expect(all).toHaveLength(1);
    });
  });
});
