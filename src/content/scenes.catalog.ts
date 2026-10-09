import type { PlannedScene } from '../domain/scene'

/** Production plan only. Add validated ReadyScene entries when assets and guides exist. */
export const sceneCatalog = [
  {
    id: 'reference-plant-room',
    title: '의자와 식물이 있는 실내',
    description: '참고 영상 속 장면. 노란 바탕색 위로 의자와 식물의 음영을 쌓습니다.',
    difficulty: 'intermediate',
    learningGoals: ['전체 바탕색', '겹칠하기', '가구의 그림자'],
    referenceId: 'watercolor-plant-room',
    status: 'planned',
  },
  {
    id: 'window-still-life',
    title: '창가의 정물',
    description: '컵과 화분, 천을 단순한 면으로 나누어 창문에서 들어오는 빛을 연습합니다.',
    difficulty: 'beginner',
    learningGoals: ['밝은 면 남기기', '부드러운 음영'],
    status: 'planned',
  },
  {
    id: 'cafe-corner',
    title: '카페의 한쪽 자리',
    description: '테이블과 의자를 중심으로 자연광과 따뜻한 실내등을 비교합니다.',
    difficulty: 'intermediate',
    learningGoals: ['광원 종류 비교', '따뜻한 색과 차가운 색'],
    status: 'planned',
  },
  {
    id: 'garden-path',
    title: '나무 사이의 정원길',
    description: '햇빛이 드는 길과 그늘을 나누고 나뭇잎의 번짐을 연습합니다.',
    difficulty: 'intermediate',
    learningGoals: ['젖은 종이의 번짐', '나무 그림자'],
    status: 'planned',
  },
  {
    id: 'lakeside',
    title: '호숫가 풍경',
    description: '단순한 하늘과 수면으로 새벽부터 밤까지의 색 변화를 연습합니다.',
    difficulty: 'beginner',
    learningGoals: ['그라데이션', '수면 반사', '시간대의 색'],
    status: 'planned',
  },
  {
    id: 'old-town-street',
    title: '작은 마을의 골목',
    description: '건물의 면과 긴 그림자를 이용해 낮은 저녁빛을 연습합니다.',
    difficulty: 'advanced',
    learningGoals: ['면별 명도', '긴 그림자', '원근감'],
    status: 'planned',
  },
] as const satisfies readonly PlannedScene[]
