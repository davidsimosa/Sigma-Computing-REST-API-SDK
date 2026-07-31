/**
 * Error thrown when the Sigma API returns a non-success response.
 */
export class SigmaApiError extends Error {
  /** API error code (e.g. "not_found", "unauthorized"). */
  code?: string;
  /** Request ID for debugging with Sigma support. */
  requestId?: string;
  /** HTTP status code of the response. */
  statusCode: number;

  constructor(
    error: { message?: string; code?: string; requestId?: string },
    response: { status: number },
  ) {
    super(error.message ?? 'Sigma API error');
    this.name = 'SigmaApiError';
    this.code = error.code ?? String(response.status);
    this.requestId = error.requestId;
    this.statusCode = response.status;
  }
}
