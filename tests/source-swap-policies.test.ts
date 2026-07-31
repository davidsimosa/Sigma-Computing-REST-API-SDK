import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import {
  sourceSwapPolicyFixture,
  sourceSwapPolicyListFixture,
  SWAP_POLICY_ID,
} from './helpers/fixtures';

const sigma = createSigmaClient({
  baseUrl: BASE_URL,
  accessToken: 'test-token',
});

describe('SourceSwapPoliciesResource', () => {
  describe('list', () => {
    it('returns a page of source swap policies', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/sourceSwapPolicies`, () =>
          HttpResponse.json(sourceSwapPolicyListFixture),
        ),
      );
      const result = await sigma.sourceSwapPolicies.list();
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].policyId).toBe(SWAP_POLICY_ID);
    });
  });

  describe('listAll', () => {
    it('returns all source swap policies as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/sourceSwapPolicies`, () =>
          HttpResponse.json(sourceSwapPolicyListFixture),
        ),
      );
      const all = await sigma.sourceSwapPolicies.listAll().toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('posts to /v2/sourceSwapPolicies and returns the new policy', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE_URL}/v2/sourceSwapPolicies`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sourceSwapPolicyFixture);
        }),
      );
      const result = await sigma.sourceSwapPolicies.create({
        name: 'My Swap Policy',
      } as never);
      expect(result.policyId).toBe(SWAP_POLICY_ID);
      expect(capturedBody).toMatchObject({ name: 'My Swap Policy' });
    });
  });

  describe('get', () => {
    it('fetches a source swap policy by ID', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/sourceSwapPolicies/${SWAP_POLICY_ID}`, () =>
          HttpResponse.json(sourceSwapPolicyFixture),
        ),
      );
      const result = await sigma.sourceSwapPolicies.get(SWAP_POLICY_ID);
      expect(result.policyId).toBe(SWAP_POLICY_ID);
    });
  });

  describe('update', () => {
    it('patches a source swap policy', async () => {
      const updated = { ...sourceSwapPolicyFixture, name: 'Updated Policy' };
      server.use(
        http.patch(`${BASE_URL}/v2/sourceSwapPolicies/${SWAP_POLICY_ID}`, () =>
          HttpResponse.json(updated),
        ),
      );
      const result = await sigma.sourceSwapPolicies.update(SWAP_POLICY_ID, {
        name: 'Updated Policy',
      });
      expect(result.policyId).toBe(SWAP_POLICY_ID);
    });
  });

  describe('delete', () => {
    it('deletes a source swap policy', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(
          `${BASE_URL}/v2/sourceSwapPolicies/${SWAP_POLICY_ID}`,
          () => {
            deleteCalled = true;
            return HttpResponse.json({ policyId: SWAP_POLICY_ID });
          },
        ),
      );
      await sigma.sourceSwapPolicies.delete(SWAP_POLICY_ID);
      expect(deleteCalled).toBe(true);
    });
  });
});
