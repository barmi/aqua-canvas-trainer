import type { GuideDefinition } from '../../domain/guide'
import type { PracticeSession } from '../../domain/painting'
import type { ReadyScene } from '../../domain/scene'
import { createId } from '../../shared/id'

export function createPractice(scene: ReadyScene, guide: GuideDefinition): PracticeSession {
  const now = new Date().toISOString()
  return {schemaVersion:1,id:createId(),sceneId:scene.id,sceneVersion:scene.version,guide:{id:guide.id,version:guide.version,currentStepId:guide.steps[0].id},lighting:guide.lighting,rendererVersion:'watercolor-1',baseWashVisible:true,createdAt:now,updatedAt:now,strokes:[],historyCursor:0}
}
