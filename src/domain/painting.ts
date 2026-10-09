import type { LightingSettings } from './lighting'

export interface StrokeSample {
  /** Normalized canvas coordinates, 0–1 after inverse viewport transformation. */
  x: number
  y: number
  pressure: number
  tiltX: number
  tiltY: number
  /** Milliseconds since stroke start. */
  elapsedMs: number
}

/**
 * 'watercolor-round': textured round brush whose dabs accumulate; pressure changes width and pigment.
 * 'flat-wash': wide flat brush for even washes; one stroke covers uniformly however it overlaps itself.
 */
export type BrushId = 'watercolor-round' | 'flat-wash'

export interface BrushSettings {
  brushId: BrushId
  brushVersion: number
  color: string
  /** Logical canvas pixels, independent of display scale and devicePixelRatio. */
  size: number
  opacity: number
  water: number
  pigment: number
}

export interface PaintStroke {
  id: string
  layerId: string
  tool: 'brush' | 'eraser'
  brush: BrushSettings
  /** Seeded brush texture allows consistent replay, undo, and restoration. */
  seed: number
  samples: readonly StrokeSample[]
  /**
   * Flat-wash strokes painted into the same still-wet wash share an id and are composited as one layer:
   * their coverage is the union, so overlaps keep the same density until the wash dries. Only brush-tool
   * 'flat-wash' strokes carry it; consecutive strokes with the same id form the layer.
   */
  washId?: string
}

export interface PracticeSession {
  schemaVersion: 1
  id: string
  sceneId: string
  sceneVersion: number
  guide: { id: string; version: number; currentStepId: string } | null
  lighting: LightingSettings
  rendererVersion: string
  baseWashVisible: boolean
  createdAt: string
  updatedAt: string
  strokes: readonly PaintStroke[]
  /** Undo/redo cursor: only strokes before this index are active. */
  historyCursor: number
}
