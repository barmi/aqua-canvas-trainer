# 구현 진행표

설계 초안을 아래 GitHub 이슈 단위로 구현한다. 각 작업은 검증 후 별도
커밋으로 `main`에 푸시한다. 실제 기기의 확인과 자동 검증은 구분한다.

- [x] [#1 배경 3종과 선택 라이브러리](https://github.com/barmi/aqua-canvas-trainer/issues/1)
- [x] [#2 Pencil 수채화 엔진과 작업 공간](https://github.com/barmi/aqua-canvas-trainer/issues/2)
- [x] [#3 조명·방향·시간대별 가이드](https://github.com/barmi/aqua-canvas-trainer/issues/3)
- [x] [#4 자동 저장·복구·목록·내보내기](https://github.com/barmi/aqua-canvas-trainer/issues/4)
- [x] [#5 카페·정원·골목 확장](https://github.com/barmi/aqua-canvas-trainer/issues/5)
- [x] [#6 PWA·오프라인·iPad 레이아웃](https://github.com/barmi/aqua-canvas-trainer/issues/6)
- [ ] [#7 iPad/Pencil 실기기 수용 테스트](https://github.com/barmi/aqua-canvas-trainer/issues/7)

초기 자산은 영역과 좌표를 정확히 맞출 수 있는 직접 작성한 SVG로 제작한다.
첫 실내 장면은 영상에서 관찰한 의자·식물·노란 워시를 바탕으로 정면
구도를 새로 정리한 연습용 해석이며 영상 프레임의 복제는 아니다.

소프트웨어 검증은 입력·좌표·붓 재생·이력·지원 조합·저장·PNG·격리된 DOM
흐름·Service Worker 이벤트를 다룬다. 정적 SVG 121개와 배포 캐시 목록을
별도로 검사한다. 실제 브라우저 자동화는 도구의 로컬 URL 정책으로 실행하지
못했고 실제 iPad/Pencil도 아직 검증하지 않았다.
[실기기 체크리스트](device-test-checklist.md)에 남은 수용 조건을 기록한다.
