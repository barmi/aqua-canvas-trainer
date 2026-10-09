# 구현 진행표

설계 초안을 아래 GitHub 이슈 단위로 구현한다. 각 작업은 검증 후 별도
커밋으로 `main`에 푸시한다. 실제 기기의 확인과 자동 검증은 구분한다.

- [x] [#1 배경 3종과 선택 라이브러리](https://github.com/barmi/aqua-canvas-trainer/issues/1)
- [x] [#2 Pencil 수채화 엔진과 작업 공간](https://github.com/barmi/aqua-canvas-trainer/issues/2)
- [x] [#3 조명·방향·시간대별 가이드](https://github.com/barmi/aqua-canvas-trainer/issues/3)
- [x] [#4 자동 저장·복구·목록·내보내기](https://github.com/barmi/aqua-canvas-trainer/issues/4)
- [x] [#5 카페·정원·골목 확장](https://github.com/barmi/aqua-canvas-trainer/issues/5)
- [x] [#6 PWA·오프라인·iPad 레이아웃](https://github.com/barmi/aqua-canvas-trainer/issues/6)
- [x] [#7 iPad/Pencil 실기기 수용 테스트](https://github.com/barmi/aqua-canvas-trainer/issues/7)
- [x] [#8 Apple Pencil 필압 응답 확대](https://github.com/barmi/aqua-canvas-trainer/issues/8)
- [x] [#10 참고 영상 수준의 상세 배경 선화](https://github.com/barmi/aqua-canvas-trainer/issues/10)
- [x] [#13 초보자용 단계별 가이드: 평붓 워시, 추천 붓 자동 적용, 단계 결과·완성 예시](https://github.com/barmi/aqua-canvas-trainer/issues/13)
- [x] [#15 Pages 배포 검증의 CDN 전파 중 503 간헐 실패](https://github.com/barmi/aqua-canvas-trainer/issues/15)
- [x] [#17 젖은 워시와 밝은 면·그림자 붓 크기 조정](https://github.com/barmi/aqua-canvas-trainer/issues/17)
- [x] [#18 창가의 정물 12단계 초보자 가이드](https://github.com/barmi/aqua-canvas-trainer/issues/18)

초기 자산은 영역과 좌표를 정확히 맞출 수 있는 직접 작성한 SVG로 제작한다.
첫 실내 장면은 영상에서 관찰한 의자·식물·노란 워시를 바탕으로 정면
구도를 새로 정리한 연습용 해석이며 영상 프레임의 복제는 아니다.

2026-10-09 #10에서 기호 수준이던 6종 선화를 참고 영상의 펜 드로잉 밀도로
다시 그렸다. 장면 원본을 `scripts/scenes/<id>.mjs`로 나누고, 앞 물체가 뒤 선을
가리는 레이어 구조와 굵기 3단계, 장면별 미리보기와 복잡도·범위 검증을 더했다.
이전 선화 기준의 저장 연습은 장면 버전 2에서 열리지 않고 저장소에 남는다.

소프트웨어 검증은 입력·좌표·붓 재생·이력·지원 조합·저장·PNG·격리된 DOM
흐름·Service Worker 이벤트를 다룬다. 정적 SVG 139개와 배포 캐시 목록을
별도로 검사한다. 실제 브라우저 자동화는 도구의 로컬 URL 정책으로 실행하지
못했다. 실기기 결과는 아래 사용자 수용 기록을 따른다.
[실기기 체크리스트](device-test-checklist.md)에 남은 수용 조건을 기록한다.

2026-10-09 사용자가 실제 iPad/Pencil에서 안내된 1–7번 기본 동작의 정상을
보고했다. #7을 사용자 요청으로 종료하고, 압력에 따른 차이가 작다는 개선은
[#8](https://github.com/barmi/aqua-canvas-trainer/issues/8)에 분리했다.
기기 세부 정보·정량 성능·HTTPS PWA 설치·오프라인 결과는 제공되지 않았다.

- [x] [#8 Pencil 필압 두께·농도 차이 확대](https://github.com/barmi/aqua-canvas-trainer/issues/8)

새 붓 버전에서 두께와 안료를 함께 변화시키고 기존 작품은 이전 붓 버전으로
재생한다. [필압 개선 설계·비교·재확인 방법](pressure-response.md)에 기록한다.
자동 검증은 테스트 30개와 타입·빌드·배포 파일 검사이며 수정 후 기기 체감은
사용자 재확인 대상이다.

- [x] [#9 GitHub Pages 자동 배포와 github.io 경로](https://github.com/barmi/aqua-canvas-trainer/issues/9)

전용 빌드·미리보기, main 자동 배포, 빌드 커밋과 공개 자산의 HTTP 검사를 추가했다.
[배포·재배포·연습 이전 방법](github-pages.md)에 절차를 기록한다.
