import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import { webhookResponseFixture, WORKBOOK_ID } from './helpers/fixtures';

const sigma = createSigmaClient({
  baseUrl: BASE_URL,
  accessToken: 'test-token',
});

describe('WebhooksResource', () => {
  describe('send', () => {
    it('sends a webhook for a workbook sequence', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(
          `${BASE_URL}/v2/webhooks/${WORKBOOK_ID}/seq-1`,
          async ({ request }) => {
            capturedBody = await request.json();
            return HttpResponse.json(webhookResponseFixture);
          },
        ),
      );
      const result = await sigma.webhooks.send(WORKBOOK_ID, 'seq-1', {});
      expect(result).toBeDefined();
      expect(capturedBody).toBeDefined();
    });
  });
});
