import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import { fileFixture, fileListFixture, FILE_ID } from './helpers/fixtures';

const sigma = createSigmaClient({
  baseUrl: BASE_URL,
  accessToken: 'test-token',
});

describe('FilesResource', () => {
  describe('list', () => {
    it('returns a page of files', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/files`, () =>
          HttpResponse.json(fileListFixture),
        ),
      );
      const result = await sigma.files.list();
      const entries = Array.from(result.entries);
      expect(entries).toHaveLength(1);
      const entry = entries[0];
      expect('id' in entry && entry.id).toBe(FILE_ID);
    });
  });

  describe('listAll', () => {
    it('returns all files as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/files`, () =>
          HttpResponse.json(fileListFixture),
        ),
      );
      const all = await sigma.files.listAll().toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('posts to /v2/files and returns the new file', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE_URL}/v2/files`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(fileFixture);
        }),
      );
      const result = await sigma.files.create({
        name: 'My File',
        type: 'folder',
      });
      expect(result.id).toBe(FILE_ID);
      expect(capturedBody).toMatchObject({ name: 'My File' });
    });
  });

  describe('get', () => {
    it('fetches a file by ID', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/files/${FILE_ID}`, () =>
          HttpResponse.json(fileFixture),
        ),
      );
      const result = await sigma.files.get(FILE_ID);
      expect(result.id).toBe(FILE_ID);
      expect(result.name).toBe('My File');
    });
  });

  describe('update', () => {
    it('patches a file and returns updated data', async () => {
      const updated = { ...fileFixture, name: 'Updated File' };
      let capturedBody: unknown;
      server.use(
        http.patch(`${BASE_URL}/v2/files/${FILE_ID}`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(updated);
        }),
      );
      const result = await sigma.files.update(FILE_ID, {
        name: 'Updated File',
      });
      expect(result.name).toBe('Updated File');
      expect(capturedBody).toMatchObject({ name: 'Updated File' });
    });
  });

  describe('delete', () => {
    it('sends DELETE to /v2/files/{inodeId}', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(`${BASE_URL}/v2/files/${FILE_ID}`, () => {
          deleteCalled = true;
          return HttpResponse.json({ id: FILE_ID });
        }),
      );
      await sigma.files.delete(FILE_ID);
      expect(deleteCalled).toBe(true);
    });
  });
});
