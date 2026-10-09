import type { BrushSettings, PaintStroke, StrokeSample } from '../../domain/painting'
import { canvasPoint, pointerPressure, zoomAt } from './coordinates'
import type { Viewport } from './coordinates'
import { createId } from '../../shared/id'

export type PaintTool = 'brush' | 'eraser' | 'pan'
interface Settings { brush: BrushSettings; tool: PaintTool; viewport: Viewport }
interface Callbacks {
  settings: () => Settings
  preview: (stroke: PaintStroke | null) => void
  complete: (stroke: PaintStroke) => void
  viewport: (view: Viewport) => void
}
export function attachPaintingInput(stage: HTMLElement, canvas: HTMLCanvasElement, callbacks: Callbacks) {
  let active: { id: number; started: number; stroke: PaintStroke; samples: StrokeSample[] } | null = null
  const touches = new Map<number, { x: number; y: number }>()
  let gesture: { midpoint: { x: number; y: number }; distance: number; viewport: Viewport } | null = null
  let pan: { id: number; x: number; y: number; viewport: Viewport } | null = null
  const finish = () => {
    if (active) { const stroke = active.stroke; active = null; callbacks.complete(stroke) }
    callbacks.preview(null)
  }
  const pair = () => {
    const [a, b] = [...touches.values()]
    if (!a || !b) return null
    return { midpoint: { x: (a.x+b.x)/2, y: (a.y+b.y)/2 }, distance: Math.max(1, Math.hypot(b.x-a.x, b.y-a.y)) }
  }
  const sample = (event: PointerEvent) => {
    if (!active) return
    const point = canvasPoint({ x: event.clientX, y: event.clientY }, canvas.getBoundingClientRect())
    active.samples.push({ ...point, pressure: pointerPressure(event.pointerType, event.pressure), tiltX: event.tiltX || 0, tiltY: event.tiltY || 0, elapsedMs: Math.max(0, event.timeStamp - active.started) })
    callbacks.preview(active.stroke)
  }
  const down = (event: PointerEvent) => {
    if (event.pointerType === 'touch') {
      if (active) return
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY })
      stage.setPointerCapture(event.pointerId)
      const data = pair()
      if (data) { gesture = { ...data, viewport: callbacks.settings().viewport }; pan = null }
      else if (callbacks.settings().tool === 'pan') pan = { id: event.pointerId, x: event.clientX, y: event.clientY, viewport: callbacks.settings().viewport }
      return
    }
    if (active || event.button !== 0) return
    const settings = callbacks.settings()
    const rect = canvas.getBoundingClientRect()
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return
    stage.setPointerCapture(event.pointerId)
    if (settings.tool === 'pan') { pan = { id: event.pointerId, x: event.clientX, y: event.clientY, viewport: settings.viewport }; return }
    touches.clear(); gesture = null; pan = null
    const samples: StrokeSample[] = []
    active = { id: event.pointerId, started: event.timeStamp, samples, stroke: { id: createId(), layerId: 'paint', tool: settings.tool, brush: { ...settings.brush }, seed: crypto.getRandomValues(new Uint32Array(1))[0], samples } }
    sample(event)
    event.preventDefault()
  }
  const move = (event: PointerEvent) => {
    if (active?.id === event.pointerId) {
      const coalesced = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : []
      for (const point of coalesced.length ? coalesced : [event]) sample(point)
      event.preventDefault(); return
    }
    if (active) return
    if (touches.has(event.pointerId)) touches.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const data = pair()
    if (gesture && data) {
      const rect = stage.getBoundingClientRect()
      const anchor = { x: gesture.midpoint.x - rect.left - rect.width/2, y: gesture.midpoint.y - rect.top - rect.height/2 }
      const next = zoomAt(gesture.viewport, data.distance/gesture.distance, anchor)
      callbacks.viewport({ ...next, x: next.x + data.midpoint.x - gesture.midpoint.x, y: next.y + data.midpoint.y - gesture.midpoint.y })
    } else if (pan?.id === event.pointerId) callbacks.viewport({ ...pan.viewport, x: pan.viewport.x + event.clientX-pan.x, y: pan.viewport.y + event.clientY-pan.y })
  }
  const up = (event: PointerEvent) => {
    if (active?.id === event.pointerId) finish()
    touches.delete(event.pointerId); gesture = null
    if (pan?.id === event.pointerId) pan = null
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId)
  }
  const wheel = (event: WheelEvent) => {
    if (!event.ctrlKey || active) return
    event.preventDefault()
    const rect = stage.getBoundingClientRect()
    callbacks.viewport(zoomAt(callbacks.settings().viewport, Math.exp(-event.deltaY*.005), { x: event.clientX-rect.left-rect.width/2, y: event.clientY-rect.top-rect.height/2 }))
  }
  const blur = () => { finish(); touches.clear(); gesture = null; pan = null }
  stage.addEventListener('pointerdown', down)
  stage.addEventListener('pointermove', move)
  for (const name of ['pointerup','pointercancel','lostpointercapture']) stage.addEventListener(name, up as EventListener)
  stage.addEventListener('wheel', wheel, { passive: false })
  window.addEventListener('blur', blur)
  document.addEventListener('visibilitychange', blur)
  return () => {
    stage.removeEventListener('pointerdown', down); stage.removeEventListener('pointermove', move)
    for (const name of ['pointerup','pointercancel','lostpointercapture']) stage.removeEventListener(name, up as EventListener)
    stage.removeEventListener('wheel', wheel); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', blur)
  }
}
