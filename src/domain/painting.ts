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

export interface BrushSettings {
  brushId: string
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
