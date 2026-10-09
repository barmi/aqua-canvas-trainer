# 폴더 구조와 책임

2026-10-09 구현 상태입니다. 정적 자산 URL은 Vite `BASE_URL`을 기준으로 만듭니다.

```text
aqua-canvas-trainer/
├── README.md / package.json / package-lock.json
├── tsconfig.json / vite.config.ts / index.html
├── docs/
│   ├── design-draft.md             제품·UX·기술 설계
│   ├── implementation-plan.md      이슈별 진행표
│   ├── device-test-checklist.md    iPad/Pencil 수용 테스트
│   ├── folder-structure.md
│   └── asset-catalog.md
├── scripts/
│   ├── scene-art.mjs               6종 장면과 방향별 명암 원본
│   ├── generate-scenes.mjs         SVG·카탈로그·캐시 목록 생성
│   ├── verify-assets.mjs           파일·viewBox·영역 참조 검사
│   ├── generate-icons.mjs          PWA 아이콘 생성
│   ├── pwa-plugin.ts               빌드별 Service Worker 생성
│   └── verify-build.mjs            배포 파일·캐시 목록·아이콘 검사
├── public/
│   ├── manifest.webmanifest / favicon.svg / icons/
│   ├── scene-packs.json            장면별 파일 목록과 콘텐츠 해시
│   └── assets/
│       ├── references/videos/watercolor-plant-room.mp4
│       ├── scenes/<scene-id>/      선화·바탕색·썸네일·마스크·가이드
│       ├── brushes/               후속 래스터 붓 자산용
│       └── papers/                후속 종이 질감 자산용
└── src/
    ├── main.tsx
    ├── app/                       화면·세션·저장·오프라인 조합과 스타일
    ├── domain/                    scene·lighting·guide·painting 타입
    ├── content/
    │   ├── scenes.catalog.ts      배경 설명과 자산 연결
    │   ├── scenes.generated.ts    생성 파일; 직접 편집하지 않음
    │   ├── lighting-options.ts    지원 광원과 4방향
    │   ├── lighting-presets.ts    시간대별 시작 조명
    │   ├── references.ts          영상 출처·경로·파일 정보
    │   └── guides/                5단계 가이드 레시피
    ├── features/
    │   ├── scene-library/         배경 선택·오프라인 표시
    │   ├── lighting-controls/     시간대·광원·방향 설정
    │   ├── guide-panel/           단계·팔레트·추천 붓·힌트
    │   ├── painting-workspace/    캔버스·도구·내보내기·엔진 연결
    │   └── practice-library/      생성·목록·썸네일·가져오기
    ├── engine/
    │   ├── input/                 펜·터치·좌표·제스처
    │   ├── brush/                 시드 기반 Canvas 붓
    │   ├── renderer/              채색·rAF·PNG 합성
    │   └── history/               스트로크·undo/redo
    ├── platform/
    │   ├── storage/               JSON 검증·IndexedDB·자동 저장
    │   └── pwa/                   등록·캐시·업데이트·Worker 원본
    └── shared/
        ├── id.ts                  LAN HTTP에서도 쓸 수 있는 ID 생성
        └── ui/                    후속 공통 UI용
```

## 의존 관계

- `domain`: 타입 계약이며 React·DOM·저장소를 import하지 않습니다.
- `content`: 장면과 학습 레시피를 제공합니다.
- `engine`: React 없이 입력과 픽셀 처리를 담당합니다.
- `platform`: 저장소와 브라우저 수명 주기·캐시를 담당합니다.
- `features`: 화면과 엔진을 연결합니다.
- `app`: 세션·화면 전환과 플랫폼 상태를 조합합니다.

그림 원본은 `scripts/scene-art.mjs`, 설명·난이도는 `content/scenes.catalog.ts`,
채색 안내는 `content/guides/`에서 수정합니다. `npm run assets:generate`가
SVG·TS·오프라인 목록을 함께 갱신합니다. Worker는 빌드에서 `dist/sw.js`로
생성되며 개발 서버에서는 등록하지 않습니다. 테스트는 모듈 옆에 둡니다.
`.idea/` 등 IDE 설정과 `node_modules/`, `dist/`는 Git에서 제외합니다.
