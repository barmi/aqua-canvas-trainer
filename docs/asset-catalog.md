# 참고 자산과 배경 제작 규칙

## 등록된 참고 영상

| 항목 | 값 |
| --- | --- |
| 자산 ID | `watercolor-plant-room` |
| 저장 위치 | `public/assets/references/videos/watercolor-plant-room.mp4` |
| 기본 개발 URL | `/assets/references/videos/watercolor-plant-room.mp4` |
| 출처 | [X 게시물](https://x.com/gwamoleipstop/status/2108414480417972370) |
| 게시 계정 | `gwamoleipstop` |
| 영상에서 확인한 표기 | `MochiYun` |
| 등록일 | 2026-10-09 |
| 형식 | MP4, H.264 영상 + AAC 오디오 |
| 해상도 | 720 × 1280 |
| 재생 시간 | 47.763447초 |
| 크기 | 5,860,139 bytes (약 5.9 MB) |
| SHA-256 | `356ac93b0bbd7bb5999b5365bc337184e7eedfd8610569d764e831c87a74261e` |

다운로드한 MP4를 재인코딩 없이 복사했다. 게시 계정과 영상 내 표기는
별도 정보로 기록하며 동일한 저작자라고 단정하지 않는다. 이 외부 참고
영상에는 프로젝트 코드의 MIT 라이선스를 자동으로 적용하지 않는다.

앱의 경로·출처 정보는 `src/content/references.ts`에 있다. 영상은 JavaScript에
번들링하지 않고 정적 파일로 제공하며, `<video controls playsInline
preload="metadata">`로 사용자의 재생 동작에 따라 읽는다.

## 제작할 배경의 자산 규칙

배경 ID는 카탈로그와 폴더 이름에서 동일하게 사용한다.
다음은 **향후 자산 배치 예시**이며 현재 영상만 등록되어 있다.

```text
public/assets/scenes/reference-plant-room/
├── line-art.svg
├── base-wash.png
├── thumbnail.webp
├── masks/
│   ├── chair-front.png
│   ├── chair-back.png
│   ├── plants.png
│   └── floor.png
└── guides/
    ├── afternoon-upper-right-shadow.png
    └── afternoon-upper-right-highlight.png
```

1. 선화와 바탕색을 같은 정면 구도와 논리 크기로 제작한다.
2. 영역 마스크는 같은 크기의 투명 PNG 또는 SVG로 만든다.
3. 영역 ID와 마스크 경로를 `SceneRegion`에 등록한다.
4. 지원할 방향과 조명 조합의 그림자·밝은 면 안내를 작성한다.
5. 가이드에 팔레트·순서·이유·흰 부분 보존 안내를 연결한다.
6. 실제 파일 존재, 좌표 일치, 가이드 참조를 검증한 후 `ready`로 바꾼다.

영상에서 프레임을 추출하더라도 손·붓·원근 왜곡이 남아 있는 프레임은
그대로 연습용 배경으로 등록하지 않는다. 참고 영상과 앱에서 사용할
정리된 배경 자산은 서로 다른 항목으로 관리한다.
