import type { PaintStroke } from '../../domain/painting'

export const watercolorBrushVersion = 2

/** Keep the neutral .55 fallback unchanged while expanding the pen's range. */
export function pressureResponse(pressure: number) {
  const relative = Math.min(1, Math.max(0, pressure)) / .55
  return {
    radiusScale: .1 + .5075 * relative ** 1.6,
    opacityScale: .2 + .8 * relative ** 1.2,
  }
}

export function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state += 0x6D2B79F5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface Dab { x: number; y: number; radius: number; aspect: number; opacityScale: number }
export function strokeDabs(stroke: PaintStroke, width: number, height: number): Dab[] {
  const random = seededRandom(stroke.seed)
  const dabs: Dab[] = []
  // Saved v1 strokes retain their original rendering; only new brush strokes use v2.
  const enhancedPressure = stroke.brush.brushVersion === 2 && stroke.tool === 'brush'
  const radiusAt = (pressure: number) => stroke.brush.size * (enhancedPressure ? pressureResponse(pressure).radiusScale : .25 + pressure * .65)
  const add = (x: number, y: number, pressure: number, tilt: number) => {
    const r = radiusAt(pressure)
    dabs.push({ x: x + (random() - .5) * r * .12, y: y + (random() - .5) * r * .12, radius: r * (.9 + random() * .2), aspect: 1 + Math.abs(tilt) / 160, opacityScale: enhancedPressure ? pressureResponse(pressure).opacityScale : 1 })
  }
  const first = stroke.samples[0]
  if (!first) return dabs
  add(first.x * width, first.y * height, first.pressure, first.tiltX)
  for (let i = 1; i < stroke.samples.length; i++) {
    const a = stroke.samples[i-1], b = stroke.samples[i]
    const dx = (b.x - a.x) * width, dy = (b.y - a.y) * height
    const distance = Math.hypot(dx, dy)
    if (distance < 0.1) continue
    const steps = Math.ceil(distance / Math.max(1.5, radiusAt((a.pressure + b.pressure) / 2) * .35))
    for (let j = 1; j <= steps; j++) {
      const t = j / steps
      add((a.x + (b.x - a.x) * t) * width, (a.y + (b.y - a.y) * t) * height, a.pressure + (b.pressure - a.pressure) * t, a.tiltX + (b.tiltX - a.tiltX) * t)
    }
  }
  return dabs
}

export function paintStroke(ctx: CanvasRenderingContext2D, stroke: PaintStroke) {
  ctx.save()
  ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'multiply'
  ctx.fillStyle = stroke.tool === 'eraser' ? '#000000' : stroke.brush.color
  for (const dab of strokeDabs(stroke, ctx.canvas.width, ctx.canvas.height)) {
    ctx.save()
    ctx.translate(dab.x, dab.y)
    ctx.scale(dab.aspect, 1)
    ctx.globalAlpha = stroke.tool === 'eraser' ? .7 : stroke.brush.opacity * (.035 + stroke.brush.pigment * .17) * dab.opacityScale
    ctx.beginPath(); ctx.arc(0, 0, dab.radius, 0, Math.PI * 2); ctx.fill()
    if (stroke.tool !== 'eraser') {
      ctx.globalAlpha *= .38
      ctx.beginPath(); ctx.arc(0, 0, dab.radius * (.5 + stroke.brush.water * .35), 0, Math.PI * 2); ctx.fill()
      ctx.globalAlpha *= .7
      for (let k = 0; k < 5; k++) {
        const angle = k * 2.399 + stroke.seed % 19
        ctx.beginPath(); ctx.arc(Math.cos(angle) * dab.radius * .65, Math.sin(angle) * dab.radius * .65, Math.max(.7, dab.radius * .045), 0, Math.PI * 2); ctx.fill()
      }
    }
    ctx.restore()
  }
  ctx.restore()
}
