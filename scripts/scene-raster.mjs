// Rasterizes scene SVG documents with @napi-rs/canvas for previews and verification.
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { CANVAS, FRAME } from './scene-svg.mjs'

export const { width, height } = CANVAS
/** Ink or mask pixels are allowed inside the paper frame plus a 3px tolerance for round line caps. */
export const frameBox = { x0: FRAME.x - 3, y0: FRAME.y - 3, x1: FRAME.x + FRAME.width + 3, y1: FRAME.y + FRAME.height + 3 }

export async function renderSvg(content) {
  const image = await loadImage(Buffer.from(content))
  const canvas = createCanvas(width, height)
  canvas.getContext('2d').drawImage(image, 0, 0, width, height)
  return canvas
}
/** Counts pixels whose alpha exceeds the threshold, split into inside and outside the frame box. */
export function coverage(canvas, threshold = 40, box = frameBox) {
  const data = canvas.getContext('2d').getImageData(0, 0, width, height).data
  let inside = 0, outside = 0
  for (let i = 0; i < width * height; i++) {
    if (data[i * 4 + 3] <= threshold) continue
    const x = i % width, y = Math.floor(i / width)
    if (x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1) inside++; else outside++
  }
  return { inside, outside, percent: +(inside / (width * height) * 100).toFixed(2) }
}
