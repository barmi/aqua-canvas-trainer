import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { createCanvas, Image as NativeImage } from '@napi-rs/canvas'
import { readFileSync } from 'node:fs'
import { clearExampleImages, renderExample } from './example-composite'
import { readyScenes } from '../../content/scenes.catalog'
import { resolveGuide } from '../../content/guides/resolve-guide'

/** Image reads from public/ as the PNG export test does; every src assignment is recorded. */
function stubBrowser() {
  const urls: string[] = []
  class AssetImage {
    constructor() {
      const image = new NativeImage()
      const descriptor = Object.getOwnPropertyDescriptor(NativeImage.prototype, 'src')!
      Object.defineProperty(image, 'src', { set(value: string) { urls.push(value); descriptor.set!.call(image, readFileSync(`public${value}`)) } })
      return image
    }
  }
  vi.stubGlobal('Image', AssetImage)
  vi.stubGlobal('document', { createElement: () => createCanvas(1, 1) })
  return urls
}
const scene = readyScenes.find(value => value.id === 'reference-plant-room')!
const guide = resolveGuide(scene, 'afternoon', 'window', 'upper-right')
const pixel = (canvas: HTMLCanvasElement, x: number, y: number) => [...canvas.getContext('2d')!.getImageData(x, y, 1, 1).data]

beforeEach(() => clearExampleImages())
afterEach(() => vi.unstubAllGlobals())

test('each step adds tints on top of the paper and the finished example is the darkest', async () => {
  stubBrowser()
  const paper = await renderExample(scene, guide, -1)
  const first = await renderExample(scene, guide, 0)
  const finished = await renderExample(scene, guide, guide.steps.length - 1)
  expect(paper.width).toBe(scene.canvasSize.width); expect(paper.height).toBe(scene.canvasSize.height)
  expect(first.toDataURL()).not.toBe(paper.toDataURL())
  expect(finished.toDataURL()).not.toBe(first.toDataURL())
  expect(pixel(paper, 10, 10)).toEqual([252, 250, 243, 255])
  expect(pixel(first, 10, 10)).toEqual([252, 250, 243, 255])
  const wall = (canvas: HTMLCanvasElement) => pixel(canvas, 500, 150)
  expect(wall(first)[0] + wall(first)[1] + wall(first)[2]).toBeLessThan(wall(paper)[0] + wall(paper)[1] + wall(paper)[2])
  expect(wall(finished)[2]).toBeLessThan(wall(first)[2])
  expect(await renderExample(scene, guide, guide.steps.length + 5).then(canvas => canvas.toDataURL())).toBe(finished.toDataURL())
})
test('the tracing layer is transparent outside the tints and skips paper and line art', async () => {
  const urls = stubBrowser()
  const tracing = await renderExample(scene, guide, guide.steps.length - 1, { paper: false, lineArt: false })
  expect(pixel(tracing, 10, 10)[3]).toBe(0)
  expect(pixel(tracing, 500, 150)[3]).toBeGreaterThan(0)
  expect(urls.some(url => url.endsWith('line-art.svg') || url.endsWith('base-wash.svg'))).toBe(false)
  const cushion = pixel(tracing, 330, 400)
  expect(cushion[3]).toBeGreaterThan(0)
  expect(cushion[0]).toBeGreaterThan(cushion[2])
})
test('every mask, art and base wash URL is loaded once per page', async () => {
  const urls = stubBrowser()
  await renderExample(scene, guide, guide.steps.length - 1)
  await renderExample(scene, guide, 2)
  const wall = scene.regions.find(region => region.id === 'wall')!.maskUrl
  expect(guide.steps.flatMap(step => step.example).filter(paint => paint.maskUrl === wall).length).toBeGreaterThan(1)
  expect(urls.filter(url => url === wall)).toHaveLength(1)
  expect(new Set(urls).size).toBe(urls.length)
  expect(urls).toContain(scene.assets.lineArtUrl)
})
