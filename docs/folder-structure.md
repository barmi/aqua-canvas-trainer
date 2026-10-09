# 폴더 구조와 책임

현재 파일과, `.gitkeep`으로 준비한 확장 폴더를 함께 표시한다.
`public/assets`의 URL은 Vite의 `BASE_URL`을 기준으로 만든다.

```text
aqua-canvas-trainer/
├── README.md
├── LICENSE
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── docs/
│   ├── design-draft.md             제품·UX·기술 설계 초안
│   ├── folder-structure.md         폴더별 책임
│   └── asset-catalog.md            참고 영상과 배경 자산 제작 규칙
├── public/
│   └── assets/
│       ├── references/
│       │   └── videos/
│       │       └── watercolor-plant-room.mp4
│       ├── scenes/                배경별 선화·바탕색·마스크·썸네일 (준비)
│       ├── brushes/               붓 질감 (준비)
│       └── papers/                종이 질감 (준비)
└── src/
    ├── main.tsx                   React 진입점
    ├── app/
    │   ├── App.tsx                현재: 개발 준비 및 참고 영상 화면
    │   └── styles.css             기본 반응형 스타일
    ├── domain/
    │   ├── scene.ts               PlannedScene / ReadyScene, 영역
    │   ├── lighting.ts            광원 종류·방향·시간대
    │   ├── guide.ts               가이드와 단계·기법·팔레트
    │   └── painting.ts            붓·스트로크·연습 세션
    ├── content/
    │   ├── README.md
    │   ├── scenes.catalog.ts      제작 예정 배경 6종
    │   ├── lighting-presets.ts    시간대 프리셋 5종
    │   ├── references.ts          영상 출처·URL·검증 정보
    │   └── guides/                장면별 실제 가이드 (준비)
    ├── features/
    │   ├── README.md
    │   ├── scene-library/         배경 선택 (준비)
    │   ├── lighting-controls/     광원·시간대 설정 (준비)
    │   ├── guide-panel/           단계별 채색 안내 (준비)
    │   ├── painting-workspace/    캔버스와 도구 UI (준비)
    │   └── practice-library/      저장한 연습 목록 (준비)
    ├── engine/
    │   ├── README.md
    │   ├── input/                 Pencil·터치 입력 (준비)
    │   ├── brush/                 붓·수분·안료 표현 (준비)
    │   ├── renderer/              레이어·합성·마스크 (준비)
    │   └── history/               undo/redo·재생 (준비)
    ├── platform/
    │   ├── README.md
    │   ├── storage/               IndexedDB·자동 저장 (준비)
    │   └── pwa/                   설치·오프라인 (준비)
    └── shared/
        └── ui/                    기능 간 공통 컴포넌트 (준비)
```

## 의존 관계

- `domain`: 데이터 계약만 정의한다. React, DOM, 저장소를 import하지 않는다.
- `content`: 도메인 타입을 만족하는 콘텐츠 데이터를 제공한다.
- `engine`: 도메인 타입을 사용하며 React 없이 입력·렌더링을 수행한다.
- `platform`: 브라우저 저장소와 Service Worker의 세부 동작을 격리한다.
- `features`: UI와 엔진·저장소를 연결한다.
- `app`: 화면들을 조합하고 전역 수명 주기를 관리한다.
- `shared/ui`: 여러 기능에 실제로 필요한 공통 UI가 생길 때 추가한다.

현재는 개발 준비 화면만 있어 라우터, 상태 관리 라이브러리, 백엔드,
서비스 워커 의존성을 추가하지 않았다. 기능 구현 시 필요한 범위에서 도입한다.

## 기능을 추가하는 예

새 배경을 만들 때는 `public/assets/scenes/<scene-id>/`에 자산을 두고
`content/scenes.catalog.ts`에 메타데이터를 등록한다. 실제 가이드는
`content/guides/`에 두고 `ReadyScene.guideIds`로 연결한다.

펜 입력은 `engine/input/`, 붓 표현은 `engine/brush/`에서 구현한다.
`features/painting-workspace/`가 두 엔진과 렌더러를 연결하며, 저장 버튼과
자동 저장은 `platform/storage/`의 저장소를 호출한다.

의미 있는 검증은 구현 모듈 가까이에 `*.test.ts`로 추가한다. 현재 폴더만
존재하는 기능을 위해 동작하지 않는 테스트나 빈 테스트 러너를 넣지 않는다.
