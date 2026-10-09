import type { PaintStroke } from '../../domain/painting'
import type { StrokeHistory } from '../history/history'
import { compositeWashLayer, continuesWash, isWetStroke, openWashStart, paintStroke, paintStrokes, paintWashGroup, paintWashLayer } from '../brush/watercolor'

/**
 * Keeps the committed painting and draws the in-progress stroke over it with the very same calls a commit makes,
 * so preview and commit are pixel-identical. A trailing wet wash group (see `paintStrokes`) is kept apart: `baked`
 * holds everything before it, `wash` its coverage mask, and `paint` (the committed picture) is baked + wash tinted
 * and composited once through `scratch`. Continuing the group re-renders only that composite; anything else bakes
 * the group first. `scratch` is also the one layer every replay reuses, so a rebuild allocates no canvas.
 */
export class WatercolorRenderer {
  private paint: HTMLCanvasElement
  private baked: HTMLCanvasElement
  private wash: HTMLCanvasElement
  private scratch: HTMLCanvasElement
  private previous: readonly PaintStroke[] = []
  /** Index in `previous` where the open wash group starts; `previous.length` when there is none. */
  private groupStart = 0
  private current: PaintStroke | null = null
  private frame = 0
  constructor(private canvas: HTMLCanvasElement) {
    const layer = () => { const element = document.createElement('canvas'); element.width = canvas.width; element.height = canvas.height; return element }
    this.paint = layer(); this.baked = layer(); this.wash = layer(); this.scratch = layer()
  }
  private context(canvas: HTMLCanvasElement) { return canvas.getContext('2d')! }
  private copy(target: HTMLCanvasElement, source: HTMLCanvasElement) {
    const ctx = this.context(target)
    ctx.clearRect(0, 0, target.width, target.height)
    ctx.drawImage(source, 0, 0)
  }
  private get group() { return this.previous.slice(this.groupStart) }
  private continuesGroup(stroke: PaintStroke) { return this.groupStart < this.previous.length && continuesWash(this.previous[this.previous.length - 1], stroke) }
  /** The committed picture after the open group changed: baked plus the wash mask, tinted through `scratch`, at the group's density. */
  private composeGroup() {
    this.copy(this.paint, this.baked)
    compositeWashLayer(this.context(this.paint), this.wash, this.previous[this.groupStart].brush, this.scratch)
  }
  private append(stroke: PaintStroke) {
    if (this.continuesGroup(stroke)) {
      this.previous = [...this.previous, stroke]
      paintWashLayer(this.context(this.wash), stroke)
      this.composeGroup()
      return
    }
    // The open group, if any, is already composited into `paint`, which therefore equals a fresh render so far.
    this.previous = [...this.previous, stroke]
    if (isWetStroke(stroke)) {
      this.copy(this.baked, this.paint)
      this.groupStart = this.previous.length - 1
      this.context(this.wash).clearRect(0, 0, this.wash.width, this.wash.height)
      paintWashLayer(this.context(this.wash), stroke)
      this.composeGroup()
    } else {
      this.groupStart = this.previous.length
      paintStroke(this.context(this.paint), stroke)
    }
  }
  private rebuild(active: readonly PaintStroke[]) {
    this.previous = active
    this.groupStart = openWashStart(active)
    const ctx = this.context(this.paint)
    ctx.clearRect(0, 0, this.paint.width, this.paint.height)
    paintStrokes(ctx, active.slice(0, this.groupStart), this.scratch)
    if (this.groupStart === active.length) return
    this.copy(this.baked, this.paint)
    this.context(this.wash).clearRect(0, 0, this.wash.width, this.wash.height)
    for (const stroke of this.group) paintWashLayer(this.context(this.wash), stroke)
    this.composeGroup()
  }
  setHistory(history: StrokeHistory) {
    const active = history.strokes.slice(0, history.cursor)
    const appendOnly = active.length >= this.previous.length && this.previous.every((stroke, i) => active[i] === stroke)
    if (appendOnly) for (const stroke of active.slice(this.previous.length)) this.append(stroke)
    else this.rebuild(active)
    this.current = null
    this.schedule()
  }
  showStroke(stroke: PaintStroke | null) { this.current = stroke; this.schedule() }
  private schedule() {
    if (this.frame) return
    this.frame = requestAnimationFrame(() => { this.frame = 0; this.draw() })
  }
  private draw() {
    const ctx = this.context(this.canvas)
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    if (this.current && this.continuesGroup(this.current)) {
      // The stroke joins the open wash: show baked + the union of the group's coverage and the stroke, as a commit
      // would. The union is built in `scratch` and tinted there in place; `wash` stays the committed mask.
      ctx.drawImage(this.baked, 0, 0)
      this.copy(this.scratch, this.wash)
      paintWashLayer(this.context(this.scratch), this.current)
      compositeWashLayer(ctx, this.scratch, this.previous[this.groupStart].brush)
      return
    }
    ctx.drawImage(this.paint, 0, 0)
    // Use the same blending over the committed copy as a finished stroke; a wet stroke starts its own layer.
    // Drawing on this copy also keeps eraser previews reversible.
    if (!this.current) return
    if (isWetStroke(this.current)) paintWashGroup(ctx, [this.current], this.scratch)
    else paintStroke(ctx, this.current)
  }
  destroy() { cancelAnimationFrame(this.frame) }
}
