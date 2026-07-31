import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import {
  samlSpListFixture,
  samlCertFixture,
  samlCertListFixture,
  SAML_SP_ID,
  SAML_CERT_ID,
} from './helpers/fixtures';

const sigma = createSigmaClient({
  baseUrl: BASE_URL,
  accessToken: 'test-token',
});

describe('SamlResource', () => {
  describe('listServiceProviders', () => {
    it('returns a page of SAML service providers', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/saml/service-providers`, () =>
          HttpResponse.json(samlSpListFixture),
        ),
      );
      const result = await sigma.saml.listServiceProviders();
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].samlServiceProviderId).toBe(SAML_SP_ID);
    });
  });

  describe('listServiceProvidersAll', () => {
    it('returns all service providers as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/saml/service-providers`, () =>
          HttpResponse.json(samlSpListFixture),
        ),
      );
      const all = await sigma.saml.listServiceProvidersAll().toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('listServiceProviderCertificates', () => {
    it('fetches certificates for a SAML service provider', async () => {
      server.use(
        http.get(
          `${BASE_URL}/v2/saml/service-providers/${SAML_SP_ID}/certificates`,
          () => HttpResponse.json(samlCertListFixture),
        ),
      );
      const result =
        await sigma.saml.listServiceProviderCertificates(SAML_SP_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listServiceProviderCertificatesAll', () => {
    it('returns all certificates as a flat array', async () => {
      server.use(
        http.get(
          `${BASE_URL}/v2/saml/service-providers/${SAML_SP_ID}/certificates`,
          () => HttpResponse.json(samlCertListFixture),
        ),
      );
      const all = await sigma.saml
        .listServiceProviderCertificatesAll(SAML_SP_ID)
        .toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('createServiceProviderCertificate', () => {
    it('creates a certificate for a SAML service provider', async () => {
      server.use(
        http.post(
          `${BASE_URL}/v2/saml/service-providers/${SAML_SP_ID}/certificates`,
          () => HttpResponse.json(samlCertFixture),
        ),
      );
      const result = await sigma.saml.createServiceProviderCertificate(
        SAML_SP_ID,
        { certificate: 'cert-data' } as never,
      );
      expect(result.samlServiceProviderCertificateId).toBe(SAML_CERT_ID);
    });
  });

  describe('getServiceProviderCertificate', () => {
    it('fetches a specific certificate', async () => {
      server.use(
        http.get(
          `${BASE_URL}/v2/saml/service-providers/${SAML_SP_ID}/certificates/${SAML_CERT_ID}`,
          () => HttpResponse.json(samlCertFixture),
        ),
      );
      const result = await sigma.saml.getServiceProviderCertificate(
        SAML_SP_ID,
        SAML_CERT_ID,
      );
      expect(result.samlServiceProviderCertificateId).toBe(SAML_CERT_ID);
    });
  });

  describe('removeServiceProviderCertificate', () => {
    it('removes a certificate', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(
          `${BASE_URL}/v2/saml/service-providers/${SAML_SP_ID}/certificates/${SAML_CERT_ID}`,
          () => {
            deleteCalled = true;
            return HttpResponse.json(samlCertFixture);
          },
        ),
      );
      await sigma.saml.removeServiceProviderCertificate(
        SAML_SP_ID,
        SAML_CERT_ID,
      );
      expect(deleteCalled).toBe(true);
    });
  });

  describe('activateServiceProviderCertificate', () => {
    it('activates a certificate', async () => {
      server.use(
        http.post(
          `${BASE_URL}/v2/saml/service-providers/${SAML_SP_ID}/certificates/${SAML_CERT_ID}/activate`,
          () => HttpResponse.json(samlCertFixture),
        ),
      );
      const result = await sigma.saml.activateServiceProviderCertificate(
        SAML_SP_ID,
        SAML_CERT_ID,
        {},
      );
      expect(result).toBeDefined();
    });
  });

  describe('deactivateServiceProviderCertificate', () => {
    it('deactivates a certificate', async () => {
      server.use(
        http.post(
          `${BASE_URL}/v2/saml/service-providers/${SAML_SP_ID}/certificates/${SAML_CERT_ID}/deactivate`,
          () => HttpResponse.json(samlCertFixture),
        ),
      );
      const result = await sigma.saml.deactivateServiceProviderCertificate(
        SAML_SP_ID,
        SAML_CERT_ID,
        {},
      );
      expect(result).toBeDefined();
    });
  });
});
