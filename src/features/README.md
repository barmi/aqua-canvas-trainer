# 사용자 기능

| 폴더 | 책임 |
| --- | --- |
| `scene-library/` | 배경 6종·난이도·목표·영상·오프라인 표시 |
| `lighting-controls/` | 지원 광원·4방향·5시간대 설정 |
| `guide-panel/` | 5단계 설명·팔레트·추천 붓·힌트·단계 이동 |
| `painting-workspace/` | 엔진·도구·왼손 배치·가이드 접기·PNG/JSON 내보내기 |
| `practice-library/` | 새 연습·목록·썸네일·이어 그리기·JSON 가져오기·삭제 |

UI는 `domain`과 `content`를 사용하고 입력·픽셀 처리는 `engine`에 맡깁니다.
`App`이 자동 저장과 세션 전환을 조합합니다. 연속 광원 각도, 자동 채점,
여러 작품을 동시에 비교하는 화면은 후속 범위입니다.
