// Builds the aligned SVG documents for one scene. Shared by generate, preview and verify scripts.
// All assets share the 1000 × 760 coordinate space; the paper frame is x 55–945, y 55–705.

export const CANVAS = { width: 1000, height: 760 }
export const FRAME = { x: 55, y: 55, width: 890, height: 650 }
export const INK = '#3d4842'
export const WEIGHTS = { heavy: 2.7, medium: 1.7, fine: 1.05 }
export const DIRECTIONS = ['upper-left', 'upper-right', 'left', 'right']

export const svg = (content, attrs = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="760" viewBox="0 0 1000 760" ${attrs}>${content}</svg>\n`

/**
 * Scene module contract (scripts/scenes/<id>.mjs exports `scene`):
 *   id, indoor, wash
 *   layers:  back-to-front [{ id, silhouette, lines: { heavy, medium, fine }, outline?: boolean, occludes?: boolean }]
 *            silhouette is a closed element string; lines are element strings. Each layer's lines are hidden
 *            behind the silhouettes of the layers after it, which gives hand-drawn hidden-line behaviour for free.
 *   regions: [{ id, label, material, wash, shape? | layers?: [layerId] }] masks for guides and the base wash
 *   shadows, longShadows?, facets: { left, right } authored per direction as before
 * Legacy scenes may use `details` instead of layers; region shapes are then stroked as outlines.
 */
export function normalize(input) {
  const art = { ...input }
  if (!art.id) throw new Error('Scene needs an id')
  art.layers = (art.layers ?? []).map(layer => ({ outline: true, occludes: true, lines: {}, ...layer }))
  const layerById = Object.fromEntries(art.layers.map(layer => [layer.id, layer]))
  art.regions = (art.regions ?? []).map(region => {
    const shape = region.shape ?? (region.layers ?? []).map(id => { if (!layerById[id]) throw new Error(`${art.id}: region ${region.id} references unknown layer ${id}`); return layerById[id].silhouette }).join('')
    if (!shape) throw new Error(`${art.id}: region ${region.id} has no shape`)
    return { ...region, shape }
  })
  if (new Set(art.regions.map(r => r.id)).size !== art.regions.length) throw new Error(`Duplicate region in ${art.id}`)
  art.shadows = art.shadows ?? {}
  for (const direction of DIRECTIONS) if (!art.shadows[direction]) throw new Error(`${art.id}: missing shadows.${direction}`)
  art.longShadows = { ...art.shadows, ...(art.longShadows ?? {}) }
  if (!art.facets?.left || !art.facets?.right) throw new Error(`${art.id}: facets.left and facets.right are required`)
  art.details = art.details ?? ''
  return art
}

const weightGroups = lines => Object.entries(WEIGHTS).map(([name, width]) => lines[name] ? `<g stroke-width="${width}">${lines[name]}</g>` : '').join('')

export function lineArtContent(art) {
  const open = `<g fill="none" stroke="${INK}" stroke-linecap="round" stroke-linejoin="round">`
  if (!art.layers.length) return `${open}<g stroke-width="${WEIGHTS.medium}">${art.regions.map(r => r.shape).join('')}${art.details}</g></g>`
  let defs = '', body = ''
  art.layers.forEach((layer, index) => {
    const front = art.layers.slice(index + 1).filter(l => l.occludes).map(l => l.silhouette).join('')
    const content = (layer.outline ? `<g stroke-width="${WEIGHTS.heavy}">${layer.silhouette}</g>` : '') + weightGroups(layer.lines)
    if (!content) return
    if (front) {
      defs += `<mask id="o${index}"><rect width="1000" height="760" fill="white"/><g fill="black" stroke="black" stroke-width="1.6">${front}</g></mask>`
      body += `<g mask="url(#o${index})">${content}</g>`
    } else body += content
  })
  return `${defs ? `<defs>${defs}</defs>` : ''}${open}${body}</g>`
}
export const washContent = art => `<rect x="${FRAME.x}" y="${FRAME.y}" width="${FRAME.width}" height="${FRAME.height}" rx="3" fill="${art.wash}" opacity=".28"/>` + art.regions.map(r => `<g fill="${r.wash}" opacity=".29" stroke="none">${r.shape}</g>`).join('')
export const maskContent = region => `<g fill="white" stroke="white" stroke-width="2">${region.shape}</g>`
const shadedSide = (art, direction) => direction.includes('left') ? art.facets.left : art.facets.right
const litSide = (art, direction) => direction.includes('left') ? art.facets.right : art.facets.left

export function sceneDocuments(art) {
  const line = lineArtContent(art), wash = washContent(art)
  const files = {
    'line-art.svg': svg(line),
    'base-wash.svg': svg(wash),
    'thumbnail.svg': svg(`<rect width="1000" height="760" fill="#fcfaf3"/>${wash}${line}`),
  }
  for (const region of art.regions) files[`masks/${region.id}.svg`] = svg(maskContent(region))
  for (const direction of DIRECTIONS) {
    files[`guides/${direction}-shadow.svg`] = svg(`<g fill="white">${art.shadows[direction]}${shadedSide(art, direction)}</g>`)
    files[`guides/${direction}-long-shadow.svg`] = svg(`<g fill="white">${art.longShadows[direction]}${shadedSide(art, direction)}</g>`)
    files[`guides/${direction}-highlight.svg`] = svg(`<g fill="white">${litSide(art, direction)}</g>`)
  }
  return files
}
/** Count of path commands in the line art: a cheap complexity signal used by verification. */
export const commandCount = content => (content.match(/[MLQCHVAZ]/gi) ?? []).length
