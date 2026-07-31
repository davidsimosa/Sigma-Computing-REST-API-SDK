import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import {
  sharedTemplateFixture,
  sharedTemplateListFixture,
  SHARE_ID,
  TEMPLATE_ID,
} from './helpers/fixtures';

const sigma = createSigmaClient({
  baseUrl: BASE_URL,
  accessToken: 'test-token',
});

describe('SharedTemplatesResource', () => {
  describe('deleteShare', () => {
    it('deletes a shared template', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(`${BASE_URL}/v2/shared_templates/${SHARE_ID}`, () => {
          deleteCalled = true;
          return HttpResponse.json(sharedTemplateFixture);
        }),
      );
      await sigma.sharedTemplates.deleteShare(SHARE_ID);
      expect(deleteCalled).toBe(true);
    });
  });

  describe('acceptShare', () => {
    it('accepts a shared template', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(
          `${BASE_URL}/v2/shared_templates/accept`,
          async ({ request }) => {
            capturedBody = await request.json();
            return HttpResponse.json({ templateId: TEMPLATE_ID });
          },
        ),
      );
      await sigma.sharedTemplates.acceptShare({
        shareId: SHARE_ID,
        destinationFolderId: 'folder-1',
      } as never);
      expect(capturedBody).toMatchObject({ shareId: SHARE_ID });
    });
  });

  describe('listSharedWithYou', () => {
    it('fetches templates shared with the current user', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/shared_templates/shared_with_you`, () =>
          HttpResponse.json(sharedTemplateListFixture),
        ),
      );
      const result = await sigma.sharedTemplates.listSharedWithYou();
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listSharedWithYouAll', () => {
    it('returns all shared templates as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/shared_templates/shared_with_you`, () =>
          HttpResponse.json(sharedTemplateListFixture),
        ),
      );
      const all = await sigma.sharedTemplates.listSharedWithYouAll().toArray();
      expect(all).toHaveLength(1);
    });
  });
});
