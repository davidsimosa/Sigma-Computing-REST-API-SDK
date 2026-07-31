import { describe, it, expect, vi, afterEach } from 'vitest';
import { createSigmaClient } from '../src/client';
import { SigmaApiError } from '../src/errors';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import { WORKBOOK_ID } from './helpers/fixtures';

const SUCCESS_WORKBOOK = {
  workbookId: WORKBOOK_ID,
  workbookUrlId: 'url-id',
  name: 'Test',
  path: '/test',
  description: '',
  latestVersion: 1,
  badge: null,
  isArchived: false,
  ownerId: 'owner',
  createdBy: 'owner',
  updatedBy: 'owner',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('retry middleware', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('retries on 429 and succeeds when a later attempt returns 200', async () => {
    vi.useFakeTimers();
    let callCount = 0;
    server.use(
      http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}`, () => {
        callCount++;
        if (callCount < 3) {
          return HttpResponse.json({}, { status: 429 });
        }
        return HttpResponse.json(SUCCESS_WORKBOOK, { status: 200 });
      }),
    );

    const sigma = createSigmaClient({
      baseUrl: BASE_URL,
      accessToken: 'test-token',
      throttleRetry: { maxRetries: 3, baseDelayMs: 0, maxDelayMs: 0 },
    });

    const promise = sigma.workbooks.get(WORKBOOK_ID);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(callCount).toBe(3);
    expect(result.workbookId).toBe(WORKBOOK_ID);
  });

  it('throws SigmaApiError with status 429 after exhausting all retries', async () => {
    vi.useFakeTimers();
    server.use(
      http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}`, () =>
        HttpResponse.json({}, { status: 429 }),
      ),
    );

    const sigma = createSigmaClient({
      baseUrl: BASE_URL,
      accessToken: 'test-token',
      throttleRetry: { maxRetries: 2, baseDelayMs: 0, maxDelayMs: 0 },
    });

    // Attach the error handler before advancing timers so the rejection is
    // never unhandled, even if it fires during runAllTimersAsync.
    let error: unknown;
    const promise = sigma.workbooks.get(WORKBOOK_ID).catch((e: unknown) => {
      error = e;
    });
    await vi.runAllTimersAsync();
    await promise;

    expect(error).toBeInstanceOf(SigmaApiError);
    expect(error).toMatchObject({ statusCode: 429 });
  });

  it('does not retry on non-429 errors', async () => {
    let callCount = 0;
    server.use(
      http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}`, () => {
        callCount++;
        return HttpResponse.json(
          { message: 'Not found', code: 'NOT_FOUND', requestId: 'req-1' },
          { status: 404 },
        );
      }),
    );

    const sigma = createSigmaClient({
      baseUrl: BASE_URL,
      accessToken: 'test-token',
      throttleRetry: { maxRetries: 3, baseDelayMs: 0, maxDelayMs: 0 },
    });

    let error: unknown;
    try {
      await sigma.workbooks.get(WORKBOOK_ID);
    } catch (e) {
      error = e;
    }

    expect(error).toMatchObject({ statusCode: 404 });
    expect(callCount).toBe(1);
  });

  it('respects Retry-After delta-seconds header', async () => {
    vi.useFakeTimers();
    let callCount = 0;
    const delays: number[] = [];

    server.use(
      http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}`, () => {
        callCount++;
        if (callCount === 1) {
          return HttpResponse.json(
            {},
            { status: 429, headers: { 'Retry-After': '2' } },
          );
        }
        return HttpResponse.json(SUCCESS_WORKBOOK, { status: 200 });
      }),
    );

    const originalSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(
      (fn, delay, ...args) => {
        delays.push(delay as number);
        return originalSetTimeout(fn, 0, ...args);
      },
    );

    const sigma = createSigmaClient({
      baseUrl: BASE_URL,
      accessToken: 'test-token',
      throttleRetry: { maxRetries: 3, baseDelayMs: 0, maxDelayMs: 0 },
    });

    const promise = sigma.workbooks.get(WORKBOOK_ID);
    await vi.runAllTimersAsync();
    await promise;

    // The delay used should be at least the Retry-After value (2000ms)
    expect(delays.some((d) => d >= 2000)).toBe(true);
  });

  it('respects Retry-After HTTP-date header', async () => {
    vi.useFakeTimers();
    let callCount = 0;
    const delays: number[] = [];

    // HTTP-date 5 seconds in the future
    const retryDate = new Date(Date.now() + 5_000).toUTCString();

    server.use(
      http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}`, () => {
        callCount++;
        if (callCount === 1) {
          return HttpResponse.json(
            {},
            { status: 429, headers: { 'Retry-After': retryDate } },
          );
        }
        return HttpResponse.json(SUCCESS_WORKBOOK, { status: 200 });
      }),
    );

    const originalSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(
      (fn, delay, ...args) => {
        delays.push(delay as number);
        return originalSetTimeout(fn, 0, ...args);
      },
    );

    const sigma = createSigmaClient({
      baseUrl: BASE_URL,
      accessToken: 'test-token',
      throttleRetry: { maxRetries: 3, baseDelayMs: 0, maxDelayMs: 0 },
    });

    const promise = sigma.workbooks.get(WORKBOOK_ID);
    await vi.runAllTimersAsync();
    await promise;

    // The delay should reflect the ~5s HTTP-date offset
    expect(delays.some((d) => d >= 4_000)).toBe(true);
  });

  it('falls back to backoff when Retry-After is unparseable', async () => {
    vi.useFakeTimers();
    let callCount = 0;

    server.use(
      http.get(`${BASE_URL}/v2/workbooks/${WORKBOOK_ID}`, () => {
        callCount++;
        if (callCount === 1) {
          return HttpResponse.json(
            {},
            { status: 429, headers: { 'Retry-After': 'not-a-valid-value' } },
          );
        }
        return HttpResponse.json(SUCCESS_WORKBOOK, { status: 200 });
      }),
    );

    const sigma = createSigmaClient({
      baseUrl: BASE_URL,
      accessToken: 'test-token',
      throttleRetry: { maxRetries: 3, baseDelayMs: 0, maxDelayMs: 0 },
    });

    const promise = sigma.workbooks.get(WORKBOOK_ID);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.workbookId).toBe(WORKBOOK_ID);
    expect(callCount).toBe(2);
  });

  it('retries POST requests with a body without throwing bodyUsed error', async () => {
    vi.useFakeTimers();
    let callCount = 0;

    server.use(
      http.post(`${BASE_URL}/v2/workbooks`, () => {
        callCount++;
        if (callCount < 2) {
          return HttpResponse.json({}, { status: 429 });
        }
        return HttpResponse.json(SUCCESS_WORKBOOK, { status: 200 });
      }),
    );

    const sigma = createSigmaClient({
      baseUrl: BASE_URL,
      accessToken: 'test-token',
      throttleRetry: { maxRetries: 3, baseDelayMs: 0, maxDelayMs: 0 },
    });

    const promise = sigma.workbooks.create({
      name: 'New Workbook',
      folderId: 'folder-id',
    });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(callCount).toBe(2);
    expect(result.workbookId).toBe(WORKBOOK_ID);
  });
});
