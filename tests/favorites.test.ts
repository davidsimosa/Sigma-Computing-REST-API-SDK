import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import {
  favoriteFixture,
  favoriteListFixture,
  MEMBER_ID,
  FILE_ID,
} from './helpers/fixtures';

const sigma = createSigmaClient({
  baseUrl: BASE_URL,
  accessToken: 'test-token',
});

describe('FavoritesResource', () => {
  describe('add', () => {
    it('adds a favorite', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE_URL}/v2/favorites`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(favoriteFixture);
        }),
      );
      await sigma.favorites.add({ memberId: MEMBER_ID, inodeId: FILE_ID });
      expect(capturedBody).toMatchObject({
        memberId: MEMBER_ID,
        inodeId: FILE_ID,
      });
    });
  });

  describe('list', () => {
    it('fetches favorites for a member', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/favorites/member/${MEMBER_ID}`, () =>
          HttpResponse.json(favoriteListFixture),
        ),
      );
      const result = await sigma.favorites.list(MEMBER_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listAll', () => {
    it('returns all favorites as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/favorites/member/${MEMBER_ID}`, () =>
          HttpResponse.json(favoriteListFixture),
        ),
      );
      const all = await sigma.favorites.listAll(MEMBER_ID).toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('remove', () => {
    it('removes a favorite', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(
          `${BASE_URL}/v2/favorites/member/${MEMBER_ID}/file/${FILE_ID}`,
          () => {
            deleteCalled = true;
            return HttpResponse.json({ success: true });
          },
        ),
      );
      await sigma.favorites.remove(MEMBER_ID, FILE_ID);
      expect(deleteCalled).toBe(true);
    });
  });
});
