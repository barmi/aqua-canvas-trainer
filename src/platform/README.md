# 브라우저 플랫폼 연동

- `storage/`: IndexedDB 저장소, 데이터 버전, 자동 저장, 복구, 내보내기.
- `pwa/`: manifest, Service Worker 등록, 캐시 버전, 오프라인 콘텐츠 관리.

현재는 폴더만 준비했습니다. manifest/Service Worker를 등록하지 않았으며
오프라인 사용을 보장하지 않습니다. 참고 영상은 초기 캐시에 넣지 않고
별도 요청으로 읽는 것을 기본 정책으로 설계합니다.
