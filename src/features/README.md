# 사용자 기능

아래 폴더는 이후 구현할 기능의 경계입니다. 현재는 구현을 포함하지 않습니다.

| 폴더 | 책임 |
| --- | --- |
| `scene-library/` | 배경 목록, 난이도, 배경 미리보기와 선택 |
| `lighting-controls/` | 광원 종류, 방향, 높이, 시간대, 지원 조합 표시 |
| `guide-panel/` | 단계 순서, 팔레트, 붓 설정, 영역 안내, 완료 체크 |
| `painting-workspace/` | 캔버스와 도구 패널, 레이어 표시, 엔진 연결 |
| `practice-library/` | 저장한 연습 목록, 이어 그리기, PNG/프로젝트 내보내기 |

UI는 `domain`과 `content`의 데이터를 사용하고, 입력과 픽셀 처리는
`engine`에 맡깁니다. 저장은 `platform/storage`를 통해 수행합니다.
