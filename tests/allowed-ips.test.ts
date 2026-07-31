import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import { ipAllowlistFixture } from './helpers/fixtures';

const sigma = createSigmaClient({
  baseUrl: BASE_URL,
  accessToken: 'test-token',
});

describe('AllowedIpsResource', () => {
  describe('listV3Alpha', () => {
    it('returns the IP allowlist', async () => {
      server.use(
        http.get(`${BASE_URL}/v3alpha/allowedIps`, () =>
          HttpResponse.json(ipAllowlistFixture),
        ),
      );
      const result = await sigma.allowedIps.listV3Alpha();
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('createV3Alpha', () => {
    it('batch-creates IP allowlist entries', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(
          `${BASE_URL}/v3alpha/allowedIps:batchCreate`,
          async ({ request }) => {
            capturedBody = await request.json();
            return HttpResponse.json(ipAllowlistFixture);
          },
        ),
      );
      await sigma.allowedIps.createV3Alpha({
        entries: [
          { ip: '192.168.1.0/24', scope: 'public-api', description: 'Office' },
        ],
      });
      expect(capturedBody).toMatchObject({
        entries: [{ ip: '192.168.1.0/24' }],
      });
    });
  });

  describe('deleteV3Alpha', () => {
    it('batch-deletes IP allowlist entries', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(
          `${BASE_URL}/v3alpha/allowedIps:batchDelete`,
          async ({ request }) => {
            capturedBody = await request.json();
            return HttpResponse.json({ success: true });
          },
        ),
      );
      await sigma.allowedIps.deleteV3Alpha({ ipAllowlistEntryIds: ['ip-1'] });
      expect(capturedBody).toMatchObject({ ipAllowlistEntryIds: ['ip-1'] });
    });
  });
});
