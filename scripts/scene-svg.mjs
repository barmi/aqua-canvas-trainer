// Builds the aligned SVG documents for one scene. Shared by generate, preview and verify scripts.
// All assets share the 1000 × 760 coordinate space; the paper frame is x 55–945, y 55–705.

export const CANVAS = { width: 1000, height: 760 }
export const FRAME = { x: 55, y: 55, width: 890, height: 650 }
export const INK = '#3d4842'
export const WEIGHTS = { heavy: 2.7, medium: 1.7, fine: 1.05 }
export const DIRECTIONS = ['upper-left', 'upper-right', 'left', 'right']

// xlink:href is used on <use> because the Node renderer behind preview and verify ignores the plain href form.
export const svg = (content, attrs = '') => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1000" height="760" viewBox="0 0 1000 760" ${attrs}>${content}</svg>\n`

/**
 * Scene module contract (scripts/scenes/<id>.mjs exports `scene`):
 *   id, indoor, wash
 *   layers:  back-to-front [{ id, silhouette, lines: { heavy, medium, fine }, outline?: boolean, occludes?: boolean }]
 *            silhouette is a closed element string; lines are element strings. Each layer's lines are hidden
 *            behind the silhouettes of the layers after it, which gives hand-drawn hidden-line behaviour for free.
 *   regions: [{ id, label, material, wash, layers: [layerId] | shape }] masks for guides and the base wash.
 *            A region built from layers is likewise hidden behind later layers that are not part of it.
 *   guides?: [{ id, layers: [layerId] | shape }] named masks for authored step guides (e.g. the pots inside the
 *            plants region), written to guides/<id>.svg beside the per-direction shadow and highlight guides.
 *   shadows, longShadows?, facets: { left, right } authored per direction as before
 * Legacy scenes may use `details` instead of layers; region shapes are then stroked as outlines.
 */
export function normalize(input) {
  const art = { ...input }
  if (!art.id) throw new Error('Scene needs an id')
  art.layers = (art.layers ?? []).map(layer => ({ outline: true, occludes: true, lines: {}, ...layer }))
  if (new Set(art.layers.map(l => l.id)).size !== art.layers.length) throw new Error(`Duplicate layer id in ${art.id}`)
  const layerById = Object.fromEntries(art.layers.map(layer => [layer.id, layer]))
  const resolveShape = (item, kind) => {
    for (const id of item.layers ?? []) if (!layerById[id]) throw new Error(`${art.id}: ${kind} ${item.id} references unknown layer ${id}`)
    const shape = item.shape ?? (item.layers ?? []).map(id => layerById[id].silhouette).join('')
    if (!shape) throw new Error(`${art.id}: ${kind} ${item.id} has no shape`)
    return { ...item, shape, layers: item.shape ? undefined : item.layers }
  }
  art.regions = (art.regions ?? []).map(region => resolveShape(region, 'region'))
  if (new Set(art.regions.map(r => r.id)).size !== art.regions.length) throw new Error(`Duplicate region in ${art.id}`)
  art.guides = (art.guides ?? []).map(guide => resolveShape(guide, 'guide'))
  if (new Set(art.guides.map(g => g.id)).size !== art.guides.length) throw new Error(`Duplicate guide in ${art.id}`)
  for (const guide of art.guides) if (!/^[a-z][a-z0-9-]*$/.test(guide.id) || /-(shadow|long-shadow|highlight)$/.test(guide.id)) throw new Error(`${art.id}: guide id ${guide.id} must be a kebab-case name that does not end like a direction guide`)
  art.shadows = art.shadows ?? {}
  for (const direction of DIRECTIONS) if (!art.shadows[direction]) throw new Error(`${art.id}: missing shadows.${direction}`)
  art.longShadows = { ...art.shadows, ...(art.longShadows ?? {}) }
  if (!art.facets?.left || !art.facets?.right) throw new Error(`${art.id}: facets.left and facets.right are required`)
  art.details = art.details ?? ''
  return art
}

// ---------- shared building blocks: every silhouette is defined once as #s<index> and referenced ----------

const silhouetteDefs = (art, indices) => [...indices].sort((a, b) => a - b).map(i => `<g id="s${i}">${art.layers[i].silhouette}</g>`).join('')
const use = index => `<use xlink:href="#s${index}"/>`
const maskDef = (id, front) => `<mask id="${id}"><rect width="1000" height="760" fill="white"/><g fill="black" stroke="black" stroke-width="1.6">${front}</g></mask>`
/** Indices of the layers drawn in front of `index` that hide it, skipping the region's own layers. */
const occluders = (art, index, members = new Set()) => art.layers.map((layer, i) => i > index && layer.occludes && !members.has(layer.id) ? i : -1).filter(i => i >= 0)
const weightGroups = lines => Object.entries(WEIGHTS).map(([name, width]) => lines[name] ? `<g stroke-width="${width}">${lines[name]}</g>` : '').join('')

function lineArtParts(art) {
  let masks = '', body = ''
  art.layers.forEach((layer, index) => {
    const content = (layer.outline ? `<g stroke-width="${WEIGHTS.heavy}">${use(index)}</g>` : '') + weightGroups(layer.lines)
    if (!content) return
    const front = occluders(art, index)
    if (front.length) { masks += maskDef(`o${index}`, front.map(use).join('')); body += `<g mask="url(#o${index})">${content}</g>` } else body += content
  })
  return { masks, body: `<g fill="none" stroke="${INK}" stroke-linecap="round" stroke-linejoin="round">${body}</g>`, needed: new Set(art.layers.map((_, i) => i)) }
}
/** A region's paintable shape: its layers, each hidden behind later layers that do not belong to the region. */
function regionParts(art, region) {
  if (!region.layers) return { masks: '', body: region.shape, needed: new Set() }
  const members = new Set(region.layers), needed = new Set()
  let masks = '', body = ''
  for (const id of region.layers) {
    const index = art.layers.findIndex(layer => layer.id === id)
    const front = occluders(art, index, members)
    needed.add(index); front.forEach(i => needed.add(i))
    if (front.length) { const mid = `r-${region.id}-${index}`; masks += maskDef(mid, front.map(use).join('')); body += `<g mask="url(#${mid})">${use(index)}</g>` } else body += use(index)
  }
  return { masks, body, needed }
}
function washParts(art) {
  let masks = '', body = '', needed = new Set()
  for (const region of art.regions) {
    const parts = regionParts(art, region)
    masks += parts.masks; parts.needed.forEach(i => needed.add(i))
    body += `<g fill="${region.wash}" opacity=".29" stroke="none">${parts.body}</g>`
  }
  return { masks, body: `<rect x="${FRAME.x}" y="${FRAME.y}" width="${FRAME.width}" height="${FRAME.height}" rx="3" fill="${art.wash}" opacity=".28"/>${body}`, needed }
}
const defs = (art, needed, masks) => needed.size || masks ? `<defs>${silhouetteDefs(art, needed)}${masks}</defs>` : ''

export function lineArtContent(art) {
  if (!art.layers.length) return `<g fill="none" stroke="${INK}" stroke-linecap="round" stroke-linejoin="round"><g stroke-width="${WEIGHTS.medium}">${art.regions.map(r => r.shape).join('')}${art.details}</g></g>`
  const parts = lineArtParts(art)
  return `${defs(art, parts.needed, parts.masks)}${parts.body}`
}
export function washContent(art) {
  const parts = washParts(art)
  return `${defs(art, parts.needed, parts.masks)}${parts.body}`
}
export function maskContent(art, region) {
  const parts = regionParts(art, region)
  return `${defs(art, parts.needed, parts.masks)}<g fill="white" stroke="white" stroke-width="2">${parts.body}</g>`
}
export function thumbnailContent(art) {
  if (!art.layers.length) return `<rect width="1000" height="760" fill="#fcfaf3"/>${washContent(art)}${lineArtContent(art)}`
  const wash = washParts(art), line = lineArtParts(art)
  const needed = new Set([...wash.needed, ...line.needed])
  return `<rect width="1000" height="760" fill="#fcfaf3"/>${defs(art, needed, wash.masks + line.masks)}${wash.body}${line.body}`
}
const shadedSide = (art, direction) => direction.includes('left') ? art.facets.left : art.facets.right
const litSide = (art, direction) => direction.includes('left') ? art.facets.right : art.facets.left

export function sceneDocuments(art) {
  const files = {
    'line-art.svg': svg(lineArtContent(art)),
    'base-wash.svg': svg(washContent(art)),
    'thumbnail.svg': svg(thumbnailContent(art)),
  }
  for (const region of art.regions) files[`masks/${region.id}.svg`] = svg(maskContent(art, region))
  for (const guide of art.guides) files[`guides/${guide.id}.svg`] = svg(maskContent(art, guide))
  for (const direction of DIRECTIONS) {
    files[`guides/${direction}-shadow.svg`] = svg(`<g fill="white">${art.shadows[direction]}${shadedSide(art, direction)}</g>`)
    files[`guides/${direction}-long-shadow.svg`] = svg(`<g fill="white">${art.longShadows[direction]}${shadedSide(art, direction)}</g>`)
    files[`guides/${direction}-highlight.svg`] = svg(`<g fill="white">${litSide(art, direction)}</g>`)
  }
  return files
}
/** Count of path commands in the line art: a cheap complexity signal used by verification. */
export const commandCount = content => (content.match(/[MLQCHVAZ]/gi) ?? []).length
