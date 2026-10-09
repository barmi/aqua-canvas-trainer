import type { GuideDefinition } from '../../domain/guide'
import { readyScenes } from '../scenes.catalog'
import { lightingPresets } from '../lighting-presets'

export const starterGuides: readonly GuideDefinition[] = readyScenes.map(scene => ({
  id: `${scene.id}-starter`, version: 1, sceneId: scene.id, sceneVersion: scene.version,
  lighting: lightingPresets[2].settings,
  steps: [{
    id: 'base-wash', title: '옅은 바탕색 관찰하기',
    instruction: '선화와 옅은 바탕색을 살펴보고 가장 밝게 남길 부분을 찾아보세요.',
    rationale: '밝은 부분을 처음부터 남겨야 투명한 수채화의 느낌을 살릴 수 있어요.',
    targetRegionIds: scene.regions.map(region => region.id), preserveWhiteRegionIds: [],
    technique: 'flat-wash',
    palette: [{ color: '#D6B65E', label: '옐로 오커', mixingNote: '물을 충분히 섞어 아주 옅게 시작하세요.' }],
    suggestedBrush: { water: 0.8, pigment: 0.25, opacity: 0.3 },
    completionHint: '바탕색을 살펴보고 칠할 면과 남길 면을 구분했나요?',
  }],
}))
