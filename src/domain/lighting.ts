export type TimeOfDay = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night'
export type LightKind = 'sun' | 'sky' | 'moon' | 'window' | 'lamp'

/** A teaching model for authored 2D scenes, rather than a physical light simulation. */
export interface PrimaryLight {
  kind: LightKind
  /** Direction toward the light on the canvas: 0 top, 90 right, 180 bottom, 270 left. */
  azimuthDeg: number
  /** 0 at the scene horizon, 90 overhead. */
  elevationDeg: number
  /** Relative intensity, 0–1. */
  intensity: number
  /** sRGB color, independent from any optional temperature annotation. */
  color: string
  /** Edge softness, 0–1. */
  shadowSoftness: number
}

export interface LightingSettings {
  timeOfDay: TimeOfDay
  primary: PrimaryLight
  ambient: { color: string; intensity: number }
}

export interface LightingPreset {
  id: string
  title: string
  learningFocus: string
  settings: LightingSettings
}
