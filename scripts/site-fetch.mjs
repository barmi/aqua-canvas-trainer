// fetch with retries for checking a freshly published static site.
import { setTimeout as delay } from 'node:timers/promises'

/**
 * Responses a GitHub Pages edge can briefly return while a deployment propagates or under load.
 * 404 is deliberately absent: the Pages CDN caches 404s and ignores query strings, so a retry
 * would only re-read the cached miss; a 404 is therefore reported as a missing file at once.
 */
export const transientStatuses = new Set([408, 425, 429, 500, 502, 503, 504])
export const isTransient = status => transientStatuses.has(status)

/**
 * Fetches `url`, retrying transient failures with exponential backoff: network errors, timeouts and the
 * statuses above. Any other response, including 404 and 403, is returned at once. After the last attempt,
 * or when the next wait would pass `deadline` (an absolute Date.now() timestamp), a transient response is
 * returned so the caller reports its status, and a thrown error is rethrown. A caller-provided init.signal
 * is honoured alongside the per-attempt timeout and stops further attempts once aborted.
 */
export async function fetchWithRetry(url, init = {}, { attempts = 6, baseDelayMs = 2000, maxDelayMs = 20000, timeoutMs = 20000, deadline = Infinity, fetchImpl = globalThis.fetch, sleep = delay, now = Date.now, onRetry } = {}) {
  if (!(attempts >= 1)) throw new RangeError('attempts must be at least 1')
  for (let attempt = 1; ; attempt++) {
    const timeout = AbortSignal.timeout(timeoutMs)
    const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout
    let outcome
    try {
      const response = await fetchImpl(url, { ...init, signal })
      if (!isTransient(response.status)) return response
      outcome = { response, error: Error(`HTTP ${response.status}`), status: response.status }
    } catch (error) {
      outcome = { error }
    }
    const wait = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1))
    const settle = () => { if (outcome.response) return outcome.response; throw outcome.error }
    if (attempt === attempts || init.signal?.aborted || now() + wait > deadline) return settle()
    await outcome.response?.arrayBuffer().catch(() => undefined)
    onRetry?.({ url: String(url), attempt, wait, status: outcome.status, error: outcome.error })
    await sleep(wait)
    if (init.signal?.aborted) return settle()
  }
}
