/** LAN development on iPad may use HTTP, where randomUUID is unavailable. */
export const createId = () => typeof crypto.randomUUID === 'function'
  ? crypto.randomUUID()
  : Array.from(crypto.getRandomValues(new Uint8Array(16)), value => value.toString(16).padStart(2, '0')).join('')
