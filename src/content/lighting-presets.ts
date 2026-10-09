import type { LightingPreset } from '../domain/lighting'

/** Artist-authored starting values; not geographic or astronomical calculations. */
export const lightingPresets = [
  {
    id: 'dawn-soft',
    title: '새벽',
    learningFocus: '차가운 바탕 위로 옅은 분홍빛을 더하기',
    settings: {
      timeOfDay: 'dawn',
      primary: { kind: 'sky', azimuthDeg: 90, elevationDeg: 10, intensity: 0.3, color: '#EDC7D2', shadowSoftness: 0.9 },
      ambient: { color: '#AABBD5', intensity: 0.55 },
    },
  },
  {
    id: 'morning-window',
    title: '오전',
    learningFocus: '맑은 빛과 밝은 면의 여백 살리기',
    settings: {
      timeOfDay: 'morning',
      primary: { kind: 'window', azimuthDeg: 315, elevationDeg: 35, intensity: 0.65, color: '#FBE9AD', shadowSoftness: 0.4 },
      ambient: { color: '#DDE8F0', intensity: 0.35 },
    },
  },
  {
    id: 'afternoon-sun',
    title: '오후',
    learningFocus: '밝은 색면과 뚜렷한 그림자 나누기',
    settings: {
      timeOfDay: 'afternoon',
      primary: { kind: 'sun', azimuthDeg: 45, elevationDeg: 60, intensity: 0.9, color: '#FFF2CB', shadowSoftness: 0.2 },
      ambient: { color: '#C7DDE6', intensity: 0.3 },
    },
  },
  {
    id: 'evening-golden',
    title: '저녁',
    learningFocus: '주황빛과 길게 드리운 그림자 겹치기',
    settings: {
      timeOfDay: 'evening',
      primary: { kind: 'sun', azimuthDeg: 270, elevationDeg: 12, intensity: 0.55, color: '#F1B17B', shadowSoftness: 0.45 },
      ambient: { color: '#9C98BD', intensity: 0.3 },
    },
  },
  {
    id: 'night-lamp',
    title: '밤',
    learningFocus: '어두운 바탕과 작은 조명의 대비 만들기',
    settings: {
      timeOfDay: 'night',
      primary: { kind: 'lamp', azimuthDeg: 315, elevationDeg: 45, intensity: 0.7, color: '#F2CE94', shadowSoftness: 0.6 },
      ambient: { color: '#58658C', intensity: 0.15 },
    },
  },
] as const satisfies readonly LightingPreset[]
