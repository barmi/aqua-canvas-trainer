import type { PaintStroke } from '../../domain/painting'
import type { StrokeHistory } from '../history/history'
import { paintStroke } from '../brush/watercolor'

export class WatercolorRenderer {
  private paint: HTMLCanvasElement
  private preview: HTMLCanvasElement
  private previous: readonly PaintStroke[] = []
  private current: PaintStroke | null = null
  private frame = 0
  constructor(private canvas: HTMLCanvasElement) {
    this.paint = document.createElement('canvas')
    this.preview = document.createElement('canvas')
    for (const layer of [this.paint, this.preview]) { layer.width = canvas.width; layer.height = canvas.height }
  }
  setHistory(history: StrokeHistory) {
    const active = history.strokes.slice(0, history.cursor)
    const ctx = this.paint.getContext('2d')!
    const appendOnly = active.length >= this.previous.length && this.previous.every((stroke, i) => active[i] === stroke)
    if (!appendOnly) ctx.clearRect(0, 0, this.paint.width, this.paint.height)
    for (const stroke of active.slice(appendOnly ? this.previous.length : 0)) paintStroke(ctx, stroke)
    this.previous = active
    this.current = null
    this.schedule()
  }
  showStroke(stroke: PaintStroke | null) { this.current = stroke; this.schedule() }
  private schedule() {
    if (this.frame) return
    this.frame = requestAnimationFrame(() => { this.frame = 0; this.draw() })
  }
  private draw() {
    const ctx = this.canvas.getContext('2d')!
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    ctx.drawImage(this.paint, 0, 0)
    if (this.current) {
      // Erase the composite copy, never the protected scene or committed layer.
      if (this.current.tool === 'eraser') paintStroke(ctx, this.current)
      else {
        const preview = this.preview.getContext('2d')!
        preview.clearRect(0, 0, this.preview.width, this.preview.height)
        paintStroke(preview, this.current)
        ctx.drawImage(this.preview, 0, 0)
      }
    }
  }
  destroy() { cancelAnimationFrame(this.frame) }
}
