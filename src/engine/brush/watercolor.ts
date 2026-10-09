import type { BrushSettings, PaintStroke, StrokeSample } from '../../domain/painting'

/** v3: the eraser follows the preset's strength (농도) and the pen's pressure like a brush; v1 and v2 erasers keep their fixed .7 wipe. */
export const watercolorBrushVersion = 3
/** v2: the flat eraser lifts by the preset's strength instead of a fixed .7. */
export const flatWashBrushVersion = 2

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
  // Saved v1 strokes retain their original rendering; brush strokes use the v2 curve from v2 on, erasers only from v3.
  const enhancedPressure = stroke.brush.brushVersion >= (stroke.tool === 'eraser' ? 3 : 2)
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
const smoothstep = (t: number) => t * t * (3 - 2 * t)

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
    const cumulative = interior * smoothstep(k / flatWashPasses)
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
    // From v2 the strength slider is the fraction one pass lifts; saved v1 erasers keep their fixed wipe.
    ctx.globalAlpha = stroke.brush.brushVersion >= 2 ? stroke.brush.opacity : .7
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

/** A stroke that belongs to a wet wash: brush-tool flat wash with a wash id. Erasers and round strokes never do. */
export const isWetStroke = (stroke: PaintStroke) => stroke.tool === 'brush' && stroke.brush.brushId === 'flat-wash' && stroke.washId !== undefined

/** Two strokes continue the same wet wash when both are wet and carry the same id. */
export const continuesWash = (previous: PaintStroke | undefined, next: PaintStroke) => previous !== undefined && isWetStroke(previous) && isWetStroke(next) && previous.washId === next.washId

/** Index where the trailing wet wash group of `strokes` starts; `strokes.length` when the last stroke is not wet. */
export function openWashStart(strokes: readonly PaintStroke[]) {
  const last = strokes.length - 1
  if (last < 0 || !isWetStroke(strokes[last])) return strokes.length
  let start = last
  while (start > 0 && continuesWash(strokes[start - 1], strokes[start])) start--
  return start
}

/** A transparent canvas the size of `ctx`, from the DOM when there is one, else from the native canvas class of `ctx` (tests). */
export function createWashLayer(ctx: CanvasRenderingContext2D): HTMLCanvasElement {
  const { width, height } = ctx.canvas
  if (typeof document !== 'undefined') {
    const layer = document.createElement('canvas')
    layer.width = width; layer.height = height
    return layer
  }
  return new (ctx.canvas.constructor as new (width: number, height: number) => HTMLCanvasElement)(width, height)
}

/**
 * Widths and alphas that paint a stroke's coverage mask under 'lighter': pass k adds s_k − s_{k−1} of the same
 * smoothstep `flatWashProfile` compounds, so one stroke feathers identically, while overlapping feathers of
 * different strokes add up instead of blending as a + b − ab (which left pale seams between rows whose cores do
 * not touch). The last, narrowest pass adds a full 1 so the core is exactly 1 whatever 8-bit rounding the earlier
 * passes left behind. Opacity and pigment play no part: the mask carries coverage only.
 */
export function washMaskPasses(brush: Pick<BrushSettings, 'size' | 'water'>) {
  const { passes } = flatWashProfile({ ...brush, opacity: 1, pigment: 1 })
  let previous = 0
  return passes.map(({ width }, k) => {
    const coverage = smoothstep((k + 1) / flatWashPasses)
    const alpha = k === passes.length - 1 ? 1 : coverage - previous
    previous = coverage
    return { width, alpha }
  })
}

/**
 * Adds one wet stroke to a wash mask: the flat path with the feather of the stroke's own width and water, drawn in
 * white with `washMaskPasses` under 'lighter', so the mask's alpha is the union of coverage clamped at 1 wherever
 * strokes overlap. `compositeWashLayer` gives the mask the wash's colour and density. White keeps 'lighter' honest:
 * a coloured stroke would clamp its premultiplied channels independently of alpha and drift toward white.
 * The caller sets no state: the layer context is left as found.
 */
export function paintWashLayer(layer: CanvasRenderingContext2D, stroke: PaintStroke) {
  if (!stroke.samples.length) return
  layer.save()
  layer.lineCap = 'round'
  layer.lineJoin = 'round'
  layer.globalCompositeOperation = 'lighter'
  layer.strokeStyle = '#ffffff'
  traceFlatPath(layer, stroke.samples, layer.canvas.width, layer.canvas.height)
  for (const pass of washMaskPasses(stroke.brush)) {
    layer.lineWidth = pass.width
    layer.globalAlpha = pass.alpha
    layer.stroke()
  }
  layer.restore()
}

/**
 * Lays a coverage mask over the painting once as the wash: the mask is copied into `tint` (or tinted in place when
 * `tint` is omitted, which consumes the mask), filled with the colour of `brush` under 'source-in' so only the
 * mask's alpha remains, then multiplied onto `ctx` at the interior density of `brush` (the wash's first stroke).
 */
export function compositeWashLayer(ctx: CanvasRenderingContext2D, mask: HTMLCanvasElement, brush: PaintStroke['brush'], tint: HTMLCanvasElement = mask) {
  const tintCtx = tint.getContext('2d')!
  if (tint !== mask) {
    tintCtx.clearRect(0, 0, tint.width, tint.height)
    tintCtx.drawImage(mask, 0, 0)
  }
  tintCtx.save()
  tintCtx.globalCompositeOperation = 'source-in'
  tintCtx.fillStyle = brush.color
  tintCtx.fillRect(0, 0, tint.width, tint.height)
  tintCtx.restore()
  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  ctx.globalAlpha = flatWashProfile(brush).interior
  ctx.drawImage(tint, 0, 0)
  ctx.restore()
}

/**
 * Paints a wet wash group as one layer: every stroke is drawn into `layer` (a fresh canvas unless one is passed, which
 * is cleared first) by `paintWashLayer`, then the mask is tinted in place and multiplied onto `ctx` once at the
 * interior density of the first stroke's brush. Overlapping interiors therefore keep the single-stroke density, as
 * still-wet watercolour does, instead of darkening like the separate multiply passes of `paintStroke`. The group's
 * colour and density are those of its first stroke; each stroke keeps its own width and feather.
 */
export function paintWashGroup(ctx: CanvasRenderingContext2D, group: readonly PaintStroke[], layer = createWashLayer(ctx)) {
  if (!group.length) return
  const layerCtx = layer.getContext('2d')!
  layerCtx.clearRect(0, 0, layer.width, layer.height)
  for (const stroke of group) paintWashLayer(layerCtx, stroke)
  compositeWashLayer(ctx, layer, group[0].brush)
}

/**
 * Paints strokes in order. A run of consecutive wet strokes (brush-tool 'flat-wash' with the same defined `washId`)
 * is one wash group rendered by `paintWashGroup`; every other stroke, including wet-looking strokes without a wash id,
 * round strokes and erasers, goes through `paintStroke` unchanged. A round stroke or eraser between two wet strokes
 * ends the group, so the strokes after it form a new layer even with the same id. Every group reuses `layer`, created
 * lazily when none is passed, so replaying a long history allocates at most one full-size canvas.
 */
export function paintStrokes(ctx: CanvasRenderingContext2D, strokes: readonly PaintStroke[], layer?: HTMLCanvasElement) {
  for (let i = 0; i < strokes.length;) {
    const stroke = strokes[i]
    if (!isWetStroke(stroke)) { paintStroke(ctx, stroke); i++; continue }
    let end = i + 1
    while (end < strokes.length && continuesWash(strokes[end - 1], strokes[end])) end++
    layer ??= createWashLayer(ctx)
    paintWashGroup(ctx, strokes.slice(i, end), layer)
    i = end
  }
}

export function paintStroke(ctx: CanvasRenderingContext2D, stroke: PaintStroke) {
  if (stroke.brush.brushId === 'flat-wash') return paintFlatStroke(ctx, stroke)
  const eraser = stroke.tool === 'eraser'
  // A v3 eraser lifts by the preset's strength (농도) per dab and follows pressure through `strokeDabs`; older
  // saved erasers keep their fixed .7 wipe (their dabs carry opacityScale 1).
  const dabAlpha = eraser ? (stroke.brush.brushVersion >= 3 ? .7 * stroke.brush.opacity : .7) : stroke.brush.opacity * (.035 + stroke.brush.pigment * .17)
  ctx.save()
  ctx.globalCompositeOperation = eraser ? 'destination-out' : 'multiply'
  ctx.fillStyle = eraser ? '#000000' : stroke.brush.color
  for (const dab of strokeDabs(stroke, ctx.canvas.width, ctx.canvas.height)) {
    ctx.save()
    ctx.translate(dab.x, dab.y)
    ctx.scale(dab.aspect, 1)
    ctx.globalAlpha = dabAlpha * dab.opacityScale
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
