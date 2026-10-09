import type { LightingSettings } from './lighting'
import type { BrushId } from './painting'

export type WatercolorTechnique =
  | 'flat-wash'
  | 'graded-wash'
  | 'wet-on-wet'
  | 'glazing'
  | 'dry-brush'
  | 'lifting'

/** The complete brush a step recommends; the workspace applies it (plus the first palette colour) when the step opens. */
export interface BrushPreset {
  brushId: BrushId
  /** Logical canvas pixels, 2–120. */
  size: number
  /** Relative digital controls, each 0–1; these are not physical ratios. */
  water: number
  pigment: number
  opacity: number
}

/**
 * One tinted mask of the example painting. Masks are the scene's region masks or guide overlays
 * (white shapes on transparency); the composite tints them with `color` and blends them in order.
 */
export interface ExamplePaint {
  maskUrl: string
  color: string
  /** 0–1 coverage of this tint; washes are pale, shadows and glazes stronger. */
  alpha: number
  /** multiply darkens like a transparent wash; screen lightens for lit faces and window light. */
  blend: 'multiply' | 'screen'
}

export interface GuideStep {
  id: string
  title: string
  /** One or two short sentences a beginner can follow. */
  instruction: string
  rationale: string
  /** Optional one-line tip shown with the brush, e.g. how to hold or move it. */
  tip?: string
  targetRegionIds: readonly string[]
  preserveWhiteRegionIds: readonly string[]
  technique: WatercolorTechnique
  palette: readonly { color: string; label: string; mixingNote: string }[]
  suggestedBrush: BrushPreset
  overlayUrl?: string
  /** What this step adds to the example painting; empty for detail-only steps. */
  example: readonly ExamplePaint[]
  completionHint: string
}

export interface GuideDefinition {
  id: string
  version: number
  sceneId: string
  sceneVersion: number
  /** An authored guide applies to this exact lighting configuration. */
  lighting: LightingSettings
  steps: readonly GuideStep[]
  exampleUrl?: string
}
