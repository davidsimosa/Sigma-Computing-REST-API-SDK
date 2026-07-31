import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { SigmaApiError } from '../src/errors';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import { WORKBOOK_ID } from './helpers/fixtures';

const sigma = createSigmaClient({
  baseUrl: BASE_URL,
  accessToken: 'test-token',
});

describe('SigmaApiError', () => {
  it('throws SigmaApiError on 404', async () => {
    server.use(
      http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}`, () =>
        HttpResponse.json(
          {
            message: 'Workbook not found',
            code: 'NOT_FOUND',
            requestId: 'req-123',
          },
          { status: 404 },
        ),
      ),
    );
    await expect(sigma.workbooks.get(WORKBOOK_ID)).rejects.toThrow(
      SigmaApiError,
    );
  });

  it('populates message from the error body', async () => {
    server.use(
      http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}`, () =>
        HttpResponse.json(
          {
            message: 'Workbook not found',
            code: 'NOT_FOUND',
            requestId: 'req-123',
          },
          { status: 404 },
        ),
      ),
    );
    try {
      await sigma.workbooks.get(WORKBOOK_ID);
    } catch (err) {
      expect(err).toBeInstanceOf(SigmaApiError);
      const apiErr = err as SigmaApiError;
      expect(apiErr.message).toBe('Workbook not found');
    }
  });

  it('populates code from the error body', async () => {
    server.use(
      http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}`, () =>
        HttpResponse.json(
          {
            message: 'Workbook not found',
            code: 'NOT_FOUND',
            requestId: 'req-123',
          },
          { status: 404 },
        ),
      ),
    );
    try {
      await sigma.workbooks.get(WORKBOOK_ID);
    } catch (err) {
      const apiErr = err as SigmaApiError;
      expect(apiErr.code).toBe('NOT_FOUND');
    }
  });

  it('populates requestId from the error body', async () => {
    server.use(
      http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}`, () =>
        HttpResponse.json(
          {
            message: 'Workbook not found',
            code: 'NOT_FOUND',
            requestId: 'req-123',
          },
          { status: 404 },
        ),
      ),
    );
    try {
      await sigma.workbooks.get(WORKBOOK_ID);
    } catch (err) {
      const apiErr = err as SigmaApiError;
      expect(apiErr.requestId).toBe('req-123');
    }
  });

  it('throws SigmaApiError on 403', async () => {
    server.use(
      http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}`, () =>
        HttpResponse.json(
          { message: 'Forbidden', code: 'FORBIDDEN', requestId: 'req-456' },
          { status: 403 },
        ),
      ),
    );
    await expect(sigma.workbooks.get(WORKBOOK_ID)).rejects.toThrow(
      SigmaApiError,
    );
  });

  it('throws SigmaApiError on 500', async () => {
    server.use(
      http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}`, () =>
        HttpResponse.json(
          {
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
            requestId: 'req-789',
          },
          { status: 500 },
        ),
      ),
    );
    await expect(sigma.workbooks.get(WORKBOOK_ID)).rejects.toThrow(
      SigmaApiError,
    );
  });

  it('is an instance of Error', async () => {
    server.use(
      http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}`, () =>
        HttpResponse.json({ message: 'Not found' }, { status: 404 }),
      ),
    );
    try {
      await sigma.workbooks.get(WORKBOOK_ID);
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(SigmaApiError);
    }
  });
});
