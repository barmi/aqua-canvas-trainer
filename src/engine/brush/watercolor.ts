import type { BrushSettings, PaintStroke, StrokeSample } from '../../domain/painting'

export const watercolorBrushVersion = 2
export const flatWashBrushVersion = 1

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

/** Stroke calls per flat wash; each is a full path stroke, so keep this small for the preview frame budget. */
export const flatWashPasses = 8

/**
 * Flat wash profile: the same path stroked `flatWashPasses` times, widest and palest first, so the edge
 * feathers along a smoothstep while the interior stays exactly `interior` however the path overlaps itself.
 * The opacity slider reads as coverage (pigment adds a little), so one pass of a guide preset lands on the
 * step's example tint instead of needing overlapping rows. `edge` is the fraction of the width that feathers
 * (both sides together) and grows with water.
 */
export function flatWashProfile(brush: Pick<BrushSettings, 'size' | 'water' | 'pigment' | 'opacity'>) {
  const edge = .12 + brush.water * .33
  const interior = brush.opacity * (.55 + brush.pigment * .45)
  const passes: { width: number; alpha: number }[] = []
  let previous = 0
  for (let k = 1; k <= flatWashPasses; k++) {
    const t = k / flatWashPasses
    const cumulative = interior * t * t * (3 - 2 * t)
    passes.push({ width: brush.size * (1 - edge * (k - 1) / (flatWashPasses - 1)), alpha: 1 - (1 - cumulative) / (1 - previous) })
    previous = cumulative
  }
  return { interior, edge, passes }
}

/** One smooth path through the samples: quadratic curves through segment midpoints; a single sample is a zero-length segment (a round-capped dot). */
function traceFlatPath(ctx: CanvasRenderingContext2D, samples: readonly StrokeSample[], width: number, height: number) {
  const x = (i: number) => samples[i].x * width, y = (i: number) => samples[i].y * height
  const last = samples.length - 1
  ctx.beginPath()
  ctx.moveTo(x(0), y(0))
  for (let i = 1; i < last; i++) ctx.quadraticCurveTo(x(i), y(i), (x(i) + x(i + 1)) / 2, (y(i) + y(i + 1)) / 2)
  ctx.lineTo(x(last), y(last))
}

/** Constant width, no texture, pressure ignored: a beginner gets predictable, even coverage. */
function paintFlatStroke(ctx: CanvasRenderingContext2D, stroke: PaintStroke) {
  if (!stroke.samples.length) return
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  traceFlatPath(ctx, stroke.samples, ctx.canvas.width, ctx.canvas.height)
  if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = stroke.brush.size
    ctx.globalAlpha = .7
    ctx.stroke()
  } else {
    ctx.globalCompositeOperation = 'multiply'
    ctx.strokeStyle = stroke.brush.color
    for (const pass of flatWashProfile(stroke.brush).passes) {
      ctx.lineWidth = pass.width
      ctx.globalAlpha = pass.alpha
      ctx.stroke()
    }
  }
  ctx.restore()
}

export function paintStroke(ctx: CanvasRenderingContext2D, stroke: PaintStroke) {
  if (stroke.brush.brushId === 'flat-wash') return paintFlatStroke(ctx, stroke)
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
