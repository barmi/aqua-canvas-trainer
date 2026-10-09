import type { PaintStroke } from '../../domain/painting'

export interface StrokeHistory { strokes: readonly PaintStroke[]; cursor: number }
export const emptyHistory = (): StrokeHistory => ({ strokes: [], cursor: 0 })
export const appendStroke = (history: StrokeHistory, stroke: PaintStroke): StrokeHistory => ({
  strokes: [...history.strokes.slice(0, history.cursor), stroke], cursor: history.cursor + 1,
})
export const undo = (history: StrokeHistory): StrokeHistory => ({ ...history, cursor: Math.max(0, history.cursor - 1) })
export const redo = (history: StrokeHistory): StrokeHistory => ({ ...history, cursor: Math.min(history.strokes.length, history.cursor + 1) })
