export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

interface SceneMetadata {
  id: string
  title: string
  description: string
  difficulty: Difficulty
  learningGoals: readonly string[]
  referenceId?: string
}

export interface SceneRegion {
  id: string
  label: string
  material: 'paper' | 'wood' | 'fabric' | 'foliage' | 'water' | 'stone' | 'ceramic' | 'other'
  /** Canvas-space mask, aligned with the line art and base wash. */
  maskUrl: string
}

export interface PlannedScene extends SceneMetadata {
  status: 'planned'
}

export interface ReadyScene extends SceneMetadata {
  status: 'ready'
  version: number
  canvasSize: { width: number; height: number }
  assets: {
    lineArtUrl: string
    baseWashUrl: string
    thumbnailUrl: string
  }
  regions: readonly SceneRegion[]
  guideIds: readonly string[]
}

/** A planned scene has no paintable assets; only ready scenes enter the workspace. */
export type Scene = PlannedScene | ReadyScene
