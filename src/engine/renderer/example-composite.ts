import type { ExamplePaint, GuideDefinition } from '../../domain/guide'
import type { ReadyScene } from '../../domain/scene'
import { loadImage } from './export-painting'

export interface ExampleOptions {
  /** Paint opaque paper and the scene's base wash under the tints. Off for the tracing layer. */
  paper: boolean
  /** Draw the line art on top. Off for the tracing layer, which sits under the real line art. */
  lineArt: boolean
}

/** Masks and art are shared by every step composite of a scene, so each URL is fetched once per page. */
const images = new Map<string, Promise<HTMLImageElement>>()
function cachedImage(url: string): Promise<HTMLImageElement> {
  let pending = images.get(url)
  if (!pending) {
    pending = loadImage(url)
    pending.catch(() => images.delete(url))
    images.set(url, pending)
  }
  return pending
}
/** Forgets loaded images, e.g. between tests that count loads or after a scene version changes. */
export function clearExampleImages() { images.clear() }

const makeCanvas = (width: number, height: number) => {
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  return canvas
}

/** Tints a white-on-transparent mask with one colour; the mask's alpha becomes the tint's coverage. */
function tintMask(layer: HTMLCanvasElement, mask: HTMLImageElement, paint: ExamplePaint) {
  const ctx = layer.getContext('2d')!
  ctx.globalCompositeOperation = 'source-over'
  ctx.clearRect(0, 0, layer.width, layer.height)
  ctx.drawImage(mask, 0, 0, layer.width, layer.height)
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = paint.color
  ctx.fillRect(0, 0, layer.width, layer.height)
}

/**
 * Composites the example painting from the scene's masks and the guide's per-step tints,
 * including steps 0..uptoStepIndex (inclusive). uptoStepIndex = steps.length - 1 is the finished example;
 * a negative index gives the untouched paper (and line art) with no tints.
 * Returns a canvas of the scene's logical size; mask and art images are cached by URL.
 */
export async function renderExample(scene: ReadyScene, guide: GuideDefinition, uptoStepIndex: number, options: ExampleOptions = { paper: true, lineArt: true }): Promise<HTMLCanvasElement> {
  const { width, height } = scene.canvasSize
  const steps = guide.steps.slice(0, Math.max(0, Math.min(uptoStepIndex, guide.steps.length - 1) + 1))
  const paints = steps.flatMap(step => step.example)
  const urls = new Set(paints.map(paint => paint.maskUrl))
  if (options.paper) urls.add(scene.assets.baseWashUrl)
  if (options.lineArt) urls.add(scene.assets.lineArtUrl)
  await Promise.all([...urls].map(cachedImage))

  const canvas = makeCanvas(width, height)
  const ctx = canvas.getContext('2d')!
  if (options.paper) {
    ctx.fillStyle = '#fcfaf3'; ctx.fillRect(0, 0, width, height)
    ctx.drawImage(await cachedImage(scene.assets.baseWashUrl), 0, 0, width, height)
  }
  const layer = makeCanvas(width, height)
  // A hair of blur softens the vector mask edges so tints read as washes rather than cut paper.
  const softEdges = 'filter' in ctx
  for (const paint of paints) {
    tintMask(layer, await cachedImage(paint.maskUrl), paint)
    ctx.save()
    ctx.globalCompositeOperation = paint.blend
    ctx.globalAlpha = paint.alpha
    if (softEdges) ctx.filter = 'blur(1.2px)'
    ctx.drawImage(layer, 0, 0)
    if (softEdges) ctx.filter = 'none'
    ctx.restore()
  }
  if (options.lineArt) ctx.drawImage(await cachedImage(scene.assets.lineArtUrl), 0, 0, width, height)
  return canvas
}
