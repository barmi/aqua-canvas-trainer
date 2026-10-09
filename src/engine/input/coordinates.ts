export interface Viewport { scale: number; x: number; y: number }
export const initialViewport: Viewport = { scale: 1, x: 0, y: 0 }
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function canvasPoint(client: { x: number; y: number }, rect: { left: number; top: number; width: number; height: number }) {
  return { x: clamp((client.x - rect.left) / rect.width, 0, 1), y: clamp((client.y - rect.top) / rect.height, 0, 1) }
}

/** Anchor is relative to the stage center; CSS transform-origin is center. */
export function zoomAt(view: Viewport, factor: number, anchor = { x: 0, y: 0 }): Viewport {
  const scale = clamp(view.scale * factor, 0.65, 4)
  const ratio = scale / view.scale
  return { scale, x: anchor.x - (anchor.x - view.x) * ratio, y: anchor.y - (anchor.y - view.y) * ratio }
}

export function pointerPressure(type: string, pressure: number) {
  return type === 'pen' && pressure > 0 ? clamp(pressure, 0.03, 1) : 0.55
}
