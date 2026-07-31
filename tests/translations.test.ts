import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import { translationFixture, localeListFixture } from './helpers/fixtures';

const sigma = createSigmaClient({
  baseUrl: BASE_URL,
  accessToken: 'test-token',
});

describe('TranslationsResource', () => {
  describe('listOrgLocales', () => {
    it('returns a page of organization locales', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/translations/organization`, () =>
          HttpResponse.json(localeListFixture),
        ),
      );
      const result = await sigma.translations.listOrgLocales();
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listOrgLocalesAll', () => {
    it('returns all locales as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/translations/organization`, () =>
          HttpResponse.json(localeListFixture),
        ),
      );
      const all = await sigma.translations.listOrgLocalesAll().toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('createOrg', () => {
    it('creates a locale for the organization', async () => {
      server.use(
        http.post(`${BASE_URL}/v2/translations/organization`, () =>
          HttpResponse.json(translationFixture),
        ),
      );
      const result = await sigma.translations.createOrg({
        lng: 'es',
        translations: {},
      });
      expect(result).toBeDefined();
    });
  });

  describe('getOrg', () => {
    it('fetches a locale by language code', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/translations/organization/es`, () =>
          HttpResponse.json(translationFixture),
        ),
      );
      const result = await sigma.translations.getOrg('es');
      expect(result.translations).toBeDefined();
    });
  });

  describe('updateOrg', () => {
    it('updates a locale', async () => {
      server.use(
        http.put(`${BASE_URL}/v2/translations/organization/es`, () =>
          HttpResponse.json(translationFixture),
        ),
      );
      const result = await sigma.translations.updateOrg('es', {
        translations: { hello: 'hola' },
      });
      expect(result).toBeDefined();
    });
  });

  describe('deleteOrg', () => {
    it('deletes a locale', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(`${BASE_URL}/v2/translations/organization/es`, () => {
          deleteCalled = true;
          return HttpResponse.json({ success: true });
        }),
      );
      await sigma.translations.deleteOrg('es');
      expect(deleteCalled).toBe(true);
    });
  });

  describe('getOrgWithVariant', () => {
    it('fetches a locale variant', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/translations/organization/es/formal`, () =>
          HttpResponse.json(translationFixture),
        ),
      );
      const result = await sigma.translations.getOrgWithVariant('es', 'formal');
      expect(result).toBeDefined();
    });
  });

  describe('updateOrgWithVariant', () => {
    it('updates a locale variant', async () => {
      server.use(
        http.put(`${BASE_URL}/v2/translations/organization/es/formal`, () =>
          HttpResponse.json(translationFixture),
        ),
      );
      const result = await sigma.translations.updateOrgWithVariant(
        'es',
        'formal',
        { translations: {} },
      );
      expect(result).toBeDefined();
    });
  });

  describe('deleteOrgWithVariant', () => {
    it('deletes a locale variant', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(
          `${BASE_URL}/v2/translations/organization/es/formal`,
          () => {
            deleteCalled = true;
            return HttpResponse.json({ success: true });
          },
        ),
      );
      await sigma.translations.deleteOrgWithVariant('es', 'formal');
      expect(deleteCalled).toBe(true);
    });
  });
});
