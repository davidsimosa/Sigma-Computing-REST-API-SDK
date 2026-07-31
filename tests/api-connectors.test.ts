import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import {
  apiConnectorFixture,
  apiConnectorListFixture,
  API_CONNECTOR_ID,
} from './helpers/fixtures';

const sigma = createSigmaClient({
  baseUrl: BASE_URL,
  accessToken: 'test-token',
});

describe('ApiConnectorsResource', () => {
  describe('list', () => {
    it('returns a page of API connectors', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/api-connectors`, () =>
          HttpResponse.json(apiConnectorListFixture),
        ),
      );
      const result = await sigma.apiConnectors.list();
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].apiConnectorId).toBe(API_CONNECTOR_ID);
    });
  });

  describe('listAll', () => {
    it('returns all API connectors as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/api-connectors`, () =>
          HttpResponse.json(apiConnectorListFixture),
        ),
      );
      const all = await sigma.apiConnectors.listAll().toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('posts to /v2/api-connectors and returns the new connector', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE_URL}/v2/api-connectors`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(apiConnectorFixture);
        }),
      );
      const result = await sigma.apiConnectors.create({
        name: 'My Connector',
        params: {
          method: 'GET',
          url: 'https://api.example.com/data',
          headers: [],
          pathParams: [],
          queryParams: [],
          body: '',
          bodyParams: [],
        },
      } as never);
      expect(result.apiConnectorId).toBe(API_CONNECTOR_ID);
      expect(capturedBody).toMatchObject({ name: 'My Connector' });
    });
  });

  describe('get', () => {
    it('fetches an API connector by ID', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/api-connectors/${API_CONNECTOR_ID}`, () =>
          HttpResponse.json(apiConnectorFixture),
        ),
      );
      const result = await sigma.apiConnectors.get(API_CONNECTOR_ID);
      expect(result.apiConnectorId).toBe(API_CONNECTOR_ID);
      expect(result.name).toBe('My Connector');
    });
  });

  describe('update', () => {
    it('patches an API connector', async () => {
      let capturedBody: unknown;
      server.use(
        http.patch(
          `${BASE_URL}/v2/api-connectors/${API_CONNECTOR_ID}`,
          async ({ request }) => {
            capturedBody = await request.json();
            return HttpResponse.json({
              ...apiConnectorFixture,
              name: 'Updated',
            });
          },
        ),
      );
      const result = await sigma.apiConnectors.update(API_CONNECTOR_ID, {
        name: 'Updated',
      });
      expect(result.name).toBe('Updated');
      expect(capturedBody).toMatchObject({ name: 'Updated' });
    });
  });

  describe('delete', () => {
    it('deletes an API connector', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(`${BASE_URL}/v2/api-connectors/${API_CONNECTOR_ID}`, () => {
          deleteCalled = true;
          return HttpResponse.json({ apiConnectorId: API_CONNECTOR_ID });
        }),
      );
      await sigma.apiConnectors.delete(API_CONNECTOR_ID);
      expect(deleteCalled).toBe(true);
    });
  });
});
