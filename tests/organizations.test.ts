import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import { ORG_ID } from './helpers/fixtures';

const sigma = createSigmaClient({
  baseUrl: BASE_URL,
  accessToken: 'test-token',
});

describe('OrganizationsResource', () => {
  describe('updateSettings', () => {
    it('patches organization settings and returns the updated settings', async () => {
      let capturedBody: unknown;
      server.use(
        http.patch(
          `${BASE_URL}/v2/organizations/settings`,
          async ({ request }) => {
            capturedBody = await request.json();
            return HttpResponse.json({
              organizationId: ORG_ID,
              timezone: 'America/New_York',
            });
          },
        ),
      );
      const result = await sigma.organizations.updateSettings({
        timezone: 'America/New_York',
      });
      expect(result.organizationId).toBe(ORG_ID);
      expect(result.timezone).toBe('America/New_York');
      expect(capturedBody).toMatchObject({ timezone: 'America/New_York' });
    });
  });
});
