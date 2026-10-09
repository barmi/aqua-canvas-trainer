import { expect, test, vi } from 'vitest'
import { fetchWithRetry, isTransient } from '../../../scripts/site-fetch.mjs'

const response = (status, body = 'x') => new Response(status === 204 ? null : body, { status })
const harness = statuses => {
  const calls = []
  const fetchImpl = vi.fn(async (url, init) => {
    calls.push({ url: String(url), signal: init.signal, headers: init.headers })
    const next = statuses.shift()
    if (next instanceof Error) throw next
    return response(next)
  })
  const waits = []
  const sleep = vi.fn(async ms => { waits.push(ms) })
  return { fetchImpl, sleep, calls, waits }
}

test('recovers from 503 and 429 while the CDN settles, with exponential backoff and a fresh timeout per attempt', async () => {
  const { fetchImpl, sleep, calls, waits } = harness([503, 429, 200])
  const result = await fetchWithRetry('https://example.test/app/icon.png', { headers: { Range: 'bytes=0-31' } }, { fetchImpl, sleep, baseDelayMs: 1000 })
  expect(result.status).toBe(200)
  expect(calls).toHaveLength(3)
  expect(waits).toEqual([1000, 2000])
  expect(calls.every(call => call.signal instanceof AbortSignal && call.headers.Range === 'bytes=0-31')).toBe(true)
  expect(new Set(calls.map(call => call.signal)).size).toBe(3)
})

test('returns 404 and 403 immediately: a missing file is a real failure, not propagation', async () => {
  for (const status of [404, 403]) {
    const { fetchImpl, sleep, calls } = harness([status, 200])
    const result = await fetchWithRetry('https://example.test/app/', {}, { fetchImpl, sleep })
    expect(result.status).toBe(status)
    expect(calls).toHaveLength(1)
    expect(sleep).not.toHaveBeenCalled()
  }
})

test('retries network errors and gives up with the last response or error', async () => {
  const { fetchImpl, sleep, calls } = harness([new TypeError('fetch failed'), 200])
  expect((await fetchWithRetry('https://example.test/a', {}, { fetchImpl, sleep })).status).toBe(200)
  expect(calls).toHaveLength(2)

  const exhausted = harness([503, 503, 503])
  const onRetry = vi.fn()
  const last = await fetchWithRetry('https://example.test/b', {}, { ...exhausted, attempts: 3, onRetry })
  expect(last.status).toBe(503)
  expect(exhausted.calls).toHaveLength(3)
  expect(onRetry).toHaveBeenCalledTimes(2)
  expect(onRetry.mock.calls[1][0]).toMatchObject({ url: 'https://example.test/b', attempt: 2, wait: 4000, status: 503 })

  const failing = harness([new Error('down'), new Error('still down')])
  await expect(fetchWithRetry('https://example.test/c', {}, { ...failing, attempts: 2 })).rejects.toThrow('still down')
  await expect(fetchWithRetry('https://example.test/d', {}, { ...harness([]), attempts: 0 })).rejects.toThrow(RangeError)
})

test('stops early when the next wait would pass the deadline or the caller aborts', async () => {
  let clock = 1000
  const bounded = harness([503, 503, 503, 200])
  const result = await fetchWithRetry('https://example.test/e', {}, { ...bounded, baseDelayMs: 1000, deadline: 1000 + 3500, now: () => clock, sleep: async ms => { clock += ms; bounded.waits.push(ms) } })
  expect(result.status).toBe(503)
  expect(bounded.waits).toEqual([1000, 2000])
  expect(bounded.calls).toHaveLength(3)

  const controller = new AbortController()
  const aborted = harness([503, 200])
  const sleep = vi.fn(async () => { controller.abort() })
  const outcome = await fetchWithRetry('https://example.test/f', { signal: controller.signal }, { ...aborted, sleep, baseDelayMs: 1 })
  expect(outcome.status).toBe(503)
  expect(aborted.calls).toHaveLength(1)
})

test('caps the backoff and treats only edge hiccups as transient', async () => {
  const { fetchImpl, sleep, waits } = harness([503, 503, 503, 503, 200])
  await fetchWithRetry('https://example.test/g', {}, { fetchImpl, sleep, baseDelayMs: 8000, maxDelayMs: 20000 })
  expect(waits).toEqual([8000, 16000, 20000, 20000])
  expect([408, 425, 429, 500, 502, 503, 504].every(isTransient)).toBe(true)
  expect([200, 206, 301, 400, 401, 403, 404, 410].some(isTransient)).toBe(false)
})
