import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import { queryDownloadFixture, QUERY_ID } from './helpers/fixtures';

const sigma = createSigmaClient({
  baseUrl: BASE_URL,
  accessToken: 'test-token',
});

describe('QueryResource', () => {
  describe('download', () => {
    it('fetches a query download by queryId', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/query/${QUERY_ID}/download`, () =>
          HttpResponse.json(queryDownloadFixture),
        ),
      );
      const result = await sigma.query.download(QUERY_ID);
      expect(result).toBeDefined();
    });
  });
});
