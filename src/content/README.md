# 콘텐츠 데이터

- `scenes.catalog.ts`: 자산이 준비된 6종의 설명·난이도·목표.
- `scenes.generated.ts`: 영역·경로·콘텐츠 해시·캐시 목록. 생성 파일입니다.
- `lighting-presets.ts`: 새벽·오전·오후·저녁·밤의 시작 조명.
- `lighting-options.ts`: 실내·야외와 시간대에 따른 지원 광원·4방향.
- `guides/resolve-guide.ts`: 장면·방향별 명암·시간대 팔레트로 만드는 5단계 가이드(버전 1).
  모든 단계는 추천 붓 전체 설정(`suggestedBrush`), 예시 그림의 색면(`example`), 한 줄 팁을 가집니다.
- `guides/reference-plant-room.ts`: 참고 영상 장면의 12단계 작성 가이드(버전 2). 워시 3단계와 바닥 그림자는 평붓,
  나머지는 둥근 붓이며 색은 시간대 팔레트에 재질 색(황토·초록·테라코타·나무·쿠션·도자기)을 섞어 만듭니다.
  잎·화분·쿠션·의자 나무틀은 장면 스크립트가 내보내는 이름 있는 가이드 마스크(`guides/leaves.svg` 등,
  `GuideContext.overlay(name)`)로 따로 물들입니다. 평붓 단계는 `flatWashProfile(suggestedBrush).interior`가
  예시의 모든 색면 농도와 .05 안에서 같아야 하며 `resolve-guide.test.ts`가 모든 조합에서 확인합니다.
- `guides/window-still-life.ts`: 창가 정물의 14단계 작성 가이드(버전 2). 바탕 → 벽 → 테이블 → 천 → 커튼 → 창밖 →
  찻주전자와 컵 → 레몬과 그릇 → 책과 창틀 → 허브와 유리병 → 그림자 → 물체 밑 그림자 → 밝은 면 → 디테일.
  워시 3단계·커튼·창밖·그림자(32, 낮은 빛은 44)는 평붓, 나머지는 둥근 붓입니다. 커튼과 창밖은 예시 농도가 달라
  단계를 나누고 각각 한 번 붓질에 맞춘 프리셋을 가지며, 비워 둘 유리 칸은 빛 방향(`litSide`)을 따라 안내하고
  흐린 하늘과 밤 실내등에서는 그 문장을 뺍니다. 벽 워시는 유리를 뺀 `guides/plaster.svg`를
  물들여 창문이 벽보다 밝게 남고, 유리(`glass`)·창틀(`sash`)·레몬(`lemons`)·그릇(`bowl`)·허브 잎과 화분
  (`herb-leaves`, `herb-pot`)·유리병과 유칼립투스(`vase-glass`, `eucalyptus`)를 이름 있는 가이드로 따로 칠합니다.
  밤에는 창밖이 남청색 밤하늘로 바뀝니다.
- 공통 5단계 가이드의 그림자 붓은 둥근 붓 34이고, 워시 팁은 마르기 전(1분 안)에는 겹쳐 칠해도 같은 농도라고 안내합니다.
  밝은 면 단계(`lifting`)는 지우개 12·세기 35%로 열리며 가이드 카드는 둥근 붓 대신 `지우개 · 크기 · 세기`를 보여 줍니다.
- `references.ts`: 영상 경로·출처·파일 정보.

예시 그림은 `src/engine/renderer/example-composite.ts`가 영역 마스크와 명암 오버레이를
각 단계의 색으로 물들여 합성합니다. 완성본은 마지막 단계까지, 단계별 예시는 그 단계까지 쌓은 결과이며
종이·선화를 끄면 캔버스 아래에 까는 따라 그리기 레이어가 됩니다. 새 장면에 작성 가이드를 더하려면
`resolveGuide`의 `authoredGuides`에 빌더를 등록하고 `resolve-guide.test.ts`가 마스크·붓 범위를 검사하게 둡니다.

SVG 원본은 `scripts/scenes/<id>.mjs`에 있습니다. `npm run assets:generate`로
이미지·TS·캐시 목록을 함께 갱신합니다. 방향별 명암은 직접 작성하며 그림자를
단순 회전하지 않습니다. 지원 조합 264개의 자산·가이드 참조를 테스트합니다.
