import type { LightKind, TimeOfDay } from '../domain/lighting'
import { sceneAssets } from './scenes.generated'

export const directions = [
  { id:'upper-left', label:'좌상단', arrow:'↖', angle:315 },
  { id:'upper-right', label:'우상단', arrow:'↗', angle:45 },
  { id:'left', label:'왼쪽', arrow:'←', angle:270 },
  { id:'right', label:'오른쪽', arrow:'→', angle:90 },
] as const
export type LightDirection = typeof directions[number]['id']
export const timeLabels: Record<TimeOfDay,string> = { dawn:'새벽', morning:'오전', afternoon:'오후', evening:'저녁', night:'밤' }
export const lightLabels: Record<LightKind,string> = { sun:'햇빛',sky:'흐린 하늘',moon:'달빛',window:'창문 빛',lamp:'실내등' }
export const isIndoorScene = (id: string) => sceneAssets[id as keyof typeof sceneAssets]?.indoor ?? false
export function supportedLightKinds(sceneId: string, time: TimeOfDay): readonly LightKind[] {
  return isIndoorScene(sceneId) ? (time === 'night' ? ['lamp'] : ['window','sky','lamp']) : (time === 'night' ? ['moon'] : ['sun','sky'])
}
export const guideId = (sceneId: string, time: TimeOfDay, kind: LightKind, direction: LightDirection) => `${sceneId}-${time}-${kind}-${direction}`
export const guideIdsForScene = (sceneId: string) => (Object.keys(timeLabels) as TimeOfDay[]).flatMap(time => supportedLightKinds(sceneId,time).flatMap(kind => directions.map(direction => guideId(sceneId,time,kind,direction.id))))
