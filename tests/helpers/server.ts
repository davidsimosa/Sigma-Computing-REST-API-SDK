import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { afterEach } from 'vitest';

export { http, HttpResponse };

export const BASE_URL = 'https://api.sigmacomputing.com';

/**
 * Shared MSW server instance. Started once via vitest setupFiles and kept
 * alive for the entire test run. Each test file resets handlers in afterEach.
 */
export const server = setupServer();

// Reset handlers after each test to prevent handler leakage between tests.
// The server itself stays open for the entire test run (started in setupFiles).
afterEach(() => server.resetHandlers());
