/**
 * Retry Utility with Exponential Backoff
 *
 * Provides robust retry logic for API calls with:
 * - Exponential backoff with jitter
 * - Configurable retry predicates
 * - Comprehensive logging
 * - Timeout protection
 */

export interface RetryOptions {
  maxRetries?: number;           // Maximum number of retry attempts (default: 3)
  baseDelayMs?: number;          // Initial delay in milliseconds (default: 1000)
  maxDelayMs?: number;           // Maximum delay in milliseconds (default: 30000)
  timeoutMs?: number;            // Timeout for each attempt in milliseconds (default: 90000)
  shouldRetry?: (error: any, attempt: number) => boolean; // Custom retry predicate
  onRetry?: (error: any, attempt: number, delayMs: number) => void; // Callback on retry
}

interface RetryState {
  attempt: number;
  startTime: number;
  lastError: any;
}

/**
 * Default retry predicate - retries on transient errors
 */
function defaultShouldRetry(error: any, attempt: number): boolean {
  // Don't retry if we've exhausted attempts
  if (attempt >= 3) return false;

  // Check for HTTP status codes that should be retried
  if (error.status || error.statusCode) {
    const status = error.status || error.statusCode;

    // Retry on server errors and specific client errors
    const retryableStatuses = [
      408, // Request Timeout
      429, // Too Many Requests (rate limit)
      500, // Internal Server Error
      502, // Bad Gateway
      503, // Service Unavailable
      504, // Gateway Timeout
    ];

    return retryableStatuses.includes(status);
  }

  // Retry on network errors
  if (error.message) {
    const retryableMessages = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNREFUSED',
      'timeout',
      'network',
      'fetch failed',
    ];

    return retryableMessages.some(msg =>
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  }

  // Don't retry by default
  return false;
}

/**
 * Calculate delay with exponential backoff and jitter
 *
 * Formula: min(maxDelay, baseDelay * 2^attempt) ± jitter
 * Jitter is ±20% randomization to prevent thundering herd
 */
function calculateDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number
): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, etc.
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

  // Add jitter: ±20% randomization
  const jitter = cappedDelay * 0.2 * (Math.random() * 2 - 1);

  return Math.round(cappedDelay + jitter);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn - Async function to retry
 * @param options - Retry configuration options
 * @returns Promise resolving to the function's result
 * @throws The last error if all retries are exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    timeoutMs = 90000,
    shouldRetry = defaultShouldRetry,
    onRetry,
  } = options;

  const state: RetryState = {
    attempt: 0,
    startTime: Date.now(),
    lastError: null,
  };

  while (state.attempt <= maxRetries) {
    try {
      // Add timeout protection
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
            timeoutMs
          )
        ),
      ]);

      // Success! Log if this was a retry
      if (state.attempt > 0) {
        const elapsed = Date.now() - state.startTime;
        console.log(`✅ Retry successful after ${state.attempt} attempts (${elapsed}ms total)`);
      }

      return result;
    } catch (error: any) {
      state.lastError = error;
      state.attempt++;

      // Check if we should retry
      if (!shouldRetry(error, state.attempt - 1)) {
        console.error(`❌ Non-retryable error or max retries reached:`, error.message || error);
        throw error;
      }

      // Calculate delay for next attempt
      const delayMs = calculateDelay(state.attempt - 1, baseDelayMs, maxDelayMs);

      // Log retry attempt
      console.warn(
        `⚠️  Attempt ${state.attempt}/${maxRetries + 1} failed. ` +
        `Retrying in ${delayMs}ms... ` +
        `Error: ${error.message || error}`
      );

      // Call retry callback if provided
      if (onRetry) {
        onRetry(error, state.attempt, delayMs);
      }

      // Wait before retrying
      await sleep(delayMs);
    }
  }

  // All retries exhausted
  const elapsed = Date.now() - state.startTime;
  console.error(
    `❌ All ${maxRetries + 1} attempts failed after ${elapsed}ms. ` +
    `Last error: ${state.lastError?.message || state.lastError}`
  );
  throw state.lastError;
}

/**
 * Create an AbortController with timeout
 *
 * @param timeoutMs - Timeout in milliseconds
 * @returns AbortController that will abort after timeout
 */
export function createTimeoutController(timeoutMs: number): AbortController {
  const controller = new AbortController();

  setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return controller;
}

/**
 * Check if an error is a rate limit error (429)
 */
export function isRateLimitError(error: any): boolean {
  return error?.status === 429 || error?.statusCode === 429;
}

/**
 * Check if an error is a server error (5xx)
 */
export function isServerError(error: any): boolean {
  const status = error?.status || error?.statusCode;
  return status >= 500 && status < 600;
}

/**
 * Check if an error is a client error (4xx)
 */
export function isClientError(error: any): boolean {
  const status = error?.status || error?.statusCode;
  return status >= 400 && status < 500;
}

/**
 * Extract meaningful error message from various error types
 */
export function getErrorMessage(error: any): string {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.error) return getErrorMessage(error.error);
  return 'Unknown error occurred';
}
