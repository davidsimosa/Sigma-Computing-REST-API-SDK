import { Semaphore } from './utils/semaphore';

export interface ThrottleRetryConfig {
  /**
   * Maximum number of retry attempts after the initial failure.
   * Set to `0` to disable retries entirely.
   * Defaults to `5`.
   */
  maxRetries?: number;
  /**
   * Base delay in milliseconds applied to the first retry.
   * Each subsequent attempt doubles this value (exponential backoff), capped
   * at `maxDelayMs`. Up to 2 seconds of random jitter is added on top.
   * Defaults to `1_000` (1 second).
   */
  baseDelayMs?: number;
  /**
   * Maximum value in milliseconds for the exponential component of the delay.
   * Jitter (up to 2 seconds) is added on top of this cap, so the actual
   * maximum delay per attempt is `maxDelayMs + 2_000`.
   * Defaults to `10_000` (10 seconds).
   */
  maxDelayMs?: number;
  /**
   * Maximum number of concurrent in-flight fetch calls allowed at any time.
   * Requests beyond this limit are queued and dispatched as slots free up.
   * Defaults to `50`.
   */
  maxConcurrentFetches?: number;
}

const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_BASE_DELAY_MS = 1_000;
const DEFAULT_MAX_DELAY_MS = 10_000;
const DEFAULT_MAX_CONCURRENT_FETCHES = 50;

const JITTER_MAX_MS = 2_000;

/**
 * Parses a `Retry-After` header value into milliseconds.
 * Handles both delta-seconds (e.g. "30") and HTTP-date formats
 * (e.g. "Sat, 28 Jun 2026 12:00:00 GMT") per RFC 9110.
 * Returns 0 for a null, zero, or unparseable value.
 *
 * @param header The raw `Retry-After` header value, or null.
 */
function parseRetryAfter(header: string | null): number {
  if (!header) return 0;
  const seconds = parseFloat(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds) * 1000;
  const dateMs = Date.parse(header);
  return Number.isFinite(dateMs) ? Math.max(0, dateMs - Date.now()) : 0;
}

/**
 * Computes the delay for a given retry attempt using exponential backoff
 * plus up to 2 seconds of random jitter.
 *
 * Formula: min(maxDelayMs, baseDelayMs * 2^exponent) + random(0, 2000)
 *
 * @param exponent Zero-based retry index used as the backoff exponent.
 * @param baseDelayMs Base delay in milliseconds before exponential scaling.
 * @param maxDelayMs Cap on the exponential component before jitter is added.
 */
function computeDelay(
  exponent: number,
  baseDelayMs: number,
  maxDelayMs: number,
): number {
  return (
    Math.min(baseDelayMs * Math.pow(2, exponent), maxDelayMs) +
    Math.random() * JITTER_MAX_MS
  );
}

export type ResilientFetch = (
  input: Request | string | URL,
  init?: RequestInit,
) => Promise<Response>;

/**
 * Wraps the global `fetch` function with automatic retry logic for
 * `429 Too Many Requests` responses using exponential backoff with jitter.
 * The `Retry-After` response header is respected as the minimum delay.
 * Concurrency is capped at `maxConcurrentFetches` (default 50): a slot is acquired
 * before the first attempt and held for the entire retry loop — including backoff
 * delays — so that a retrying request keeps its slot rather than releasing and
 * re-queuing on each attempt. Excess requests are queued and dispatched as slots free up.
 *
 * The returned function is intended to be passed as the `fetch` option to
 * `openapi-fetch`'s `createClient`, and also threaded into `createAuthMiddleware`
 * so that token fetches benefit from the same retry logic.
 */
export function createResilientFetch(
  config: ThrottleRetryConfig = {},
): ResilientFetch {
  const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = config.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = config.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const semaphore = new Semaphore(
    config.maxConcurrentFetches ?? DEFAULT_MAX_CONCURRENT_FETCHES,
  );

  return async function resilientFetch(
    input: Request | string | URL,
    init?: RequestInit,
  ): Promise<Response> {
    // When openapi-fetch passes a Request object as `input`, the body stream
    // is consumed after the first fetch call. Clone it upfront so each retry
    // can replay the full request including the body.
    const requestClone = input instanceof Request ? input.clone() : null;

    // Acquire a slot before the first attempt and hold it for the entire
    // retry loop — including backoff delays — so that a retrying request
    // keeps its concurrency slot rather than releasing and re-queuing on
    // each attempt.
    return semaphore.run(async () => {
      // Use a fresh clone of the original Request on every attempt so the
      // body stream is never marked as used.
      const makeFetchInput = (): Request | string | URL =>
        requestClone !== null ? requestClone.clone() : input;

      let response = await fetch(makeFetchInput(), init);

      for (
        let attempt = 1;
        attempt <= maxRetries && response.status === 429;
        attempt++
      ) {
        const backoffMs = computeDelay(attempt - 1, baseDelayMs, maxDelayMs);
        const retryAfterMs = parseRetryAfter(
          response.headers.get('Retry-After'),
        );
        const delayMs = Math.max(retryAfterMs, backoffMs);
        // Drain the 429 body so the connection is returned to the pool
        // before the backoff delay rather than being held until GC.
        // Fire-and-forget: errors are suppressed and we do not block the
        // retry loop on the drain completing.
        response.body?.cancel().catch(() => {});
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        response = await fetch(makeFetchInput(), init);
      }

      return response;
    });
  };
}
