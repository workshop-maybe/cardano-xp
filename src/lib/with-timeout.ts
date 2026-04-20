/**
 * Race a promise against a wall-clock timeout.
 *
 * Used by server pages that prefetch upstream data during SSR — we want a
 * bound on TTFB that's tighter than the gateway's own 10s AbortSignal so a
 * slow upstream doesn't stretch every landing render to ten seconds.
 *
 * Notes:
 * - The underlying promise is NOT cancelled on timeout (no AbortController
 *   is threaded through). Callers that care should use AbortSignal directly.
 * - `clearTimeout` runs in `.finally` so a won race doesn't leave a pending
 *   handle on the event loop.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = "operation",
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  return Promise.race([
    promise.finally(() => {
      if (timer) clearTimeout(timer);
    }),
    new Promise<T>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms,
      );
    }),
  ]);
}
