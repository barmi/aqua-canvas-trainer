import { expect, test } from 'vitest'
import { commandCount, lineArtContent, normalize, sceneDocuments, svg } from '../../scripts/scene-svg.mjs'
import { coverage, renderSvg } from '../../scripts/scene-raster.mjs'
import { castD, hatchD, path, rectD, rng } from '../../scripts/scenes/helpers.mjs'

const minimal = (overrides = {}) => normalize({
  id: 'demo', indoor: true, wash: '#fff',
  layers: [
    { id: 'back', silhouette: path(rectD(55, 55, 890, 650)), lines: { fine: path(hatchD([[55, 55], [945, 55], [945, 705], [55, 705]], 0, 10)) } },
    { id: 'front', silhouette: `<circle cx="500" cy="380" r="120"/>`, lines: { medium: `<circle cx="500" cy="380" r="60"/>` } },
  ],
  regions: [{ id: 'wall', label: '벽', material: 'stone', wash: '#eee', layers: ['back'] }, { id: 'ball', label: '공', material: 'other', wash: '#ddd', layers: ['front'] }],
  shadows: { 'upper-left': path(castD([[420, 500], [580, 500]], 60, 40)), 'upper-right': path(castD([[420, 500], [580, 500]], -60, 40)), left: path(castD([[420, 500], [580, 500]], 90, 10)), right: path(castD([[420, 500], [580, 500]], -90, 10)) },
  facets: { left: path(rectD(560, 300, 40, 160)), right: path(rectD(400, 300, 40, 160)) },
  ...overrides,
})

test('front layers hide the lines of the layers behind them', async () => {
  const art = minimal()
  const canvas = await renderSvg(svg(lineArtContent(art)))
  const alpha = (x, y) => canvas.getContext('2d').getImageData(x, y, 1, 1).data[3]
  expect(alpha(200, 380)).toBeGreaterThan(40) // hatch line far from the ball (lines sit at y = 60, 70, …)
  expect(alpha(500, 380)).toBe(0) // the same hatch line is hidden inside the ball, between its rings
  expect(coverage(canvas).outside).toBe(0)
  expect(commandCount(lineArtContent(art))).toBeGreaterThan(60)
})

test('regions resolve from layers, guides are produced per direction, and the contract rejects gaps', () => {
  const files = sceneDocuments(minimal())
  expect(Object.keys(files).filter(name => name.startsWith('guides/'))).toHaveLength(12)
  expect(files['masks/ball.svg']).toContain('<circle cx="500" cy="380" r="120"/>')
  expect(files['guides/left-shadow.svg']).toContain('M560 300') // left light shades the right-hand facet
  expect(files['guides/left-highlight.svg']).toContain('M400 300')
  expect(() => minimal({ shadows: { left: ' ' } })).toThrow(/missing shadows/)
  expect(() => minimal({ regions: [{ id: 'x', label: 'x', material: 'other', wash: '#fff', layers: ['nope'] }] })).toThrow(/unknown layer/)
  expect(() => minimal({ facets: { left: ' ' } })).toThrow(/facets/)
})

test('seeded randomness is reproducible', () => {
  const a = rng(42), b = rng(42)
  expect([a(), a(), a()]).toEqual([b(), b(), b()])
  expect(hatchD([[0, 0], [100, 0], [100, 50], [0, 50]], 45, 10)).toBe(hatchD([[0, 0], [100, 0], [100, 50], [0, 50]], 45, 10))
})
