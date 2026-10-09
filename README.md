# Aqua Canvas Trainer

아이패드와 Apple Pencil로 풍경의 빛과 색을 연습하는 수채화 웹 앱입니다.
선화와 기본 바탕색이 있는 배경을 고르고, 광원의 종류·방향·시간대에 맞는
채색 가이드를 보며 직접 덧칠하는 경험을 목표로 합니다.

## 현재 단계

2026-10-09 기준 **프로젝트 구조와 설계 초안**을 준비한 상태입니다.

- React + TypeScript + Vite 실행 환경과 참고 영상 확인 화면
- 배경, 조명, 가이드, 연습 기록의 도메인 타입
- 영상 속 실내 장면을 포함한 배경 6종의 제작 계획
- 새벽·오전·오후·저녁·밤 조명 프리셋 데이터
- 다운로드한 참고 영상과 출처·파일 정보

실제 배경 이미지·마스크, 드로잉 엔진, 단계별 가이드 생성, 저장 기능,
PWA 설치·오프라인 기능은 이후 구현 대상입니다. 계획된 배경에는 아직
이미지 URL을 연결하지 않았습니다.

## 실행

Node.js `20.19+` 또는 `22.12+`와 npm이 필요합니다. 새 환경에는 Node.js LTS를 권장합니다.

```sh
npm ci
npm run dev
```

같은 네트워크의 아이패드에서 개발 화면을 확인하려면:

```sh
npm run dev:ipad
```

터미널에 표시되는 Network 주소를 아이패드 Safari에서 엽니다.
향후 Service Worker/PWA 검증은 HTTPS 개발 환경에서 진행합니다.

```sh
npm run typecheck
npm run build
npm run preview
```

## 구조

```text
docs/                   설계, 폴더 책임, 참고 자산 문서
public/assets/          URL로 제공할 영상·배경·붓·종이 자산
src/app/                앱 진입점과 화면 조합
src/content/            배경 카탈로그·조명 프리셋·참고 영상 메타데이터
src/domain/             배경·조명·가이드·그리기 데이터 계약
src/features/           배경 선택·조명 설정·가이드·작업 공간·작품 목록
src/engine/             입력·브러시·렌더링·작업 이력
src/platform/           브라우저 저장소와 PWA 연동
src/shared/             공통 UI
```

자세한 구조는 [폴더 구조](docs/folder-structure.md)를 참고하세요.

## 문서와 참고 영상

- [설계 문서 초안](docs/design-draft.md)
- [참고 자산 목록과 배경 제작 규칙](docs/asset-catalog.md)
- [참고 동영상](public/assets/references/videos/watercolor-plant-room.mp4)
- [영상 출처](https://x.com/gwamoleipstop/status/2108414480417972370)

참고 영상은 원본 MP4로 보관합니다. 영상에 보이는 장면을 연습용 배경으로
제작하는 작업은 선화·바탕색·영역 마스크를 나누어 진행할 예정입니다.
