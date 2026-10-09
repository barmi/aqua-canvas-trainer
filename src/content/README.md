# 콘텐츠 데이터

- `scenes.catalog.ts`: 자산이 준비된 6종의 설명·난이도·목표.
- `scenes.generated.ts`: 영역·경로·콘텐츠 해시·캐시 목록. 생성 파일입니다.
- `lighting-presets.ts`: 새벽·오전·오후·저녁·밤의 시작 조명.
- `lighting-options.ts`: 실내·야외와 시간대에 따른 지원 광원·4방향.
- `guides/resolve-guide.ts`: 장면·방향별 명암·시간대 팔레트로 만드는 5단계 가이드.
- `references.ts`: 영상 경로·출처·파일 정보.

SVG 원본은 `scripts/scene-art.mjs`에 있습니다. `npm run assets:generate`로
이미지·TS·캐시 목록을 함께 갱신합니다. 방향별 명암은 직접 작성하며 그림자를
단순 회전하지 않습니다. 지원 조합 264개의 자산·가이드 참조를 테스트합니다.
