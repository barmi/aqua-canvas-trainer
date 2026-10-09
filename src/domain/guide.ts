import type { LightingSettings } from './lighting'

export type WatercolorTechnique =
  | 'flat-wash'
  | 'graded-wash'
  | 'wet-on-wet'
  | 'glazing'
  | 'dry-brush'
  | 'lifting'

export interface GuideStep {
  id: string
  title: string
  instruction: string
  rationale: string
  targetRegionIds: readonly string[]
  preserveWhiteRegionIds: readonly string[]
  technique: WatercolorTechnique
  palette: readonly { color: string; label: string; mixingNote: string }[]
  /** Relative brush settings, each 0–1; these are digital controls, not physical ratios. */
  suggestedBrush: { water: number; pigment: number; opacity: number }
  overlayUrl?: string
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
