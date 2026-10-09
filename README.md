# Aqua Canvas Trainer

아이패드와 Apple Pencil로 빛과 색을 연습하는 수채화 웹 앱입니다.
선화와 옅은 바탕색에서 시작해 설명, 팔레트, 밝은 면과 그림자 힌트를
보며 직접 칠합니다. 계정이나 서버 없이 기기에 연습을 저장합니다.

## 구현된 기능

- 배경 6종: 의자와 식물이 있는 실내, 창가 정물, 호숫가, 카페, 정원길, 골목
- 새벽·오전·오후·저녁·밤, 장면별 광원, 4방향의 지원 조합 264개
- 바탕 → 큰 색면 → 그림자 → 겹칠하기 → 디테일의 5단계 가이드
- 필압·기울기, 수분·안료·농도, 지우개, 실행 취소·다시 실행
- 펜·마우스 채색과 두 손가락 확대·이동, 손가락 채색 방지
- IndexedDB 자동 저장, 이어 그리기, PNG와 편집 가능한 JSON 백업·가져오기
- 왼손 배치, 가이드 접기, 반응형 패널, PWA와 선택한 풍경의 오프라인 준비
- 참고 영상 재생. 영상은 앱 초기 캐시에서 제외합니다.

영상 속 실내 배경은 의자·식물·노란 워시를 참고해 직접 작성한 SVG입니다.
원본 프레임을 그대로 복제한 그림은 아닙니다. 붓은 Canvas 2D의 투명한
겹칠하기 표현이며 실제 물과 안료의 유체 시뮬레이션은 후속 범위입니다.

## 실행

Node.js `22.12+`와 npm이 필요합니다.

```sh
npm ci
npm run dev
```

같은 네트워크의 아이패드 Safari에서 개발 화면을 열려면:

```sh
npm run dev:ipad
```

터미널에 표시되는 Network 주소를 엽니다. 기존 WebStorm 프로젝트에는
`dev:ipad` npm 실행 구성이 등록되어 있습니다. `.idea/` 등 IDE 설정은
Git에서 제외하므로 새 체크아웃에서는 npm 구성의 스크립트를 `dev:ipad`로 지정합니다.

## 연습 방법

1. 풍경을 선택하고 시간대·광원·방향을 고릅니다.
2. 단계의 설명을 읽고 추천 붓 설정이나 팔레트 색을 선택합니다.
3. Pencil 또는 마우스로 칠합니다. 손가락 두 개로 확대·이동할 수 있습니다.
4. 가이드의 표시·투명도를 조절하며 다음 단계로 진행합니다.
5. `나의 연습`에서 이어 그리거나 작업 공간에서 PNG와 연습 파일을 저장합니다.

빛을 바꾸면 기존 연습을 보관하고 새 연습을 시작합니다. 지우개는 채색만
지우며 선화와 바탕색을 보호합니다. PNG에는 가이드가 포함되지 않습니다.
자동 저장은 이 브라우저의 저장 공간을 사용합니다. 중요한 연습은 JSON으로
백업하세요. 다른 기기에서는 `연습 파일 가져오기`로 이어 그립니다.
가져오기는 16 MB 이하의 현재 버전 JSON을 지원합니다.

## PWA와 오프라인

```sh
npm run build
npm run build:verify
npm run preview
```

PWA는 프로덕션 빌드의 HTTPS 주소 또는 개발 컴퓨터의 localhost에서 동작합니다.
`dev:ipad`의 LAN HTTP 주소는 그리기 확인용입니다. iPad 설치·오프라인 확인에는
프로덕션 빌드를 HTTPS 정적 호스팅으로 제공해야 합니다.

온라인에서 풍경을 열고 `오프라인 준비됨`을 확인한 뒤 연결 없이 연습합니다.
앱 셸과 선택한 풍경의 선화·바탕색·마스크·가이드를 버전별로 캐시합니다.
참고 영상은 오프라인 대상에서 제외합니다. 새 버전 안내를 누르면 완료된
연습의 저장을 확인한 뒤 새 앱으로 전환합니다.

## 검증과 콘텐츠 제작

```sh
npm run test
npm run assets:verify
npm run build
npm run build:verify
```

자동 검증은 입력·좌표·이력·시드 재생·가이드 조합·JSON·IndexedDB·PNG 합성,
격리된 React 화면 흐름, Service Worker 이벤트를 다룹니다. jsdom 테스트는
실제 Safari나 Apple Pencil의 검증을 대신하지 않습니다. 사용자의 iPad/Pencil 기본 동작 확인으로
[#7](https://github.com/barmi/aqua-canvas-trainer/issues/7)을 종료했습니다. 필압 체감 개선은
[#8](https://github.com/barmi/aqua-canvas-trainer/issues/8)로 분리했으며 HTTPS 설치·오프라인은 추가 확인 대상입니다.
[실기기 체크리스트](docs/device-test-checklist.md)에 절차와 기록표가 있습니다.

SVG 원본은 `scripts/scene-art.mjs`에서 편집하고 다음 명령으로 재생성합니다.
장면 자산을 바꿀 때 생성된 TS와 오프라인 목록도 함께 커밋합니다.

```sh
npm run assets:generate
npm run assets:verify
npm run icons:generate
```

## 구조와 문서

```text
scripts/                장면·아이콘 생성과 빌드 검증
public/assets/          참고 영상과 배경별 SVG 자산
src/app/                화면 조합과 스타일
src/content/            배경 카탈로그와 조명별 가이드 레시피
src/domain/             배경·조명·가이드·스트로크 데이터 계약
src/features/           배경 선택·조명 설정·가이드·작업 공간·연습 목록
src/engine/             포인터 입력·붓·렌더링·이력·PNG 합성
src/platform/           IndexedDB 자동 저장과 PWA 캐시
```

- [구현 진행표와 GitHub 이슈](docs/implementation-plan.md)
- [설계 문서](docs/design-draft.md)
- [폴더 구조](docs/folder-structure.md)
- [자산 목록과 제작 규칙](docs/asset-catalog.md)
- [참고 영상](public/assets/references/videos/watercolor-plant-room.mp4) · [출처](https://x.com/gwamoleipstop/status/2108414480417972370)

외부 참고 영상은 프로젝트의 MIT 라이선스에 포함하지 않습니다.
