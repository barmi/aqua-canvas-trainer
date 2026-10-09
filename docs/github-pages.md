# GitHub Pages 배포

공개 주소: [Aqua Canvas Trainer](https://barmi.github.io/aqua-canvas-trainer/)

관련 이슈: [#9](https://github.com/barmi/aqua-canvas-trainer/issues/9)

## 자동 배포

저장소의 Settings → Pages → Source를 **GitHub Actions**로 설정한다.
`.github/workflows/pages.yml`이 `main` 푸시 또는 수동 실행을 처리한다.

1. Node.js 24에서 `npm ci`로 잠금 파일에 맞게 설치한다.
2. 자동 테스트와 배경 자산 검사를 수행한다.
3. `npm run build:pages`로 `/aqua-canvas-trainer/` 경로에 맞춰 빌드한다.
4. `npm run build:verify:pages`로 배포 파일·manifest·캐시·컴파일된 URL을 확인한다.
5. `dist/`를 Pages artifact로 올리고 `github-pages` 환경에 배포한다.
6. 공개 HTTPS 주소의 빌드 커밋, JS/CSS·아이콘·121개 SVG·manifest·Worker·영상 응답을 확인한다.

배포 권한은 deploy job에만 부여한다. 별도 PAT나 배포 비밀값을 저장하지 않고
GitHub가 제공하는 작업 토큰과 OIDC를 사용한다. 외부 액션은 확인한 릴리스의
커밋 SHA로 고정한다. 동시에 여러 배포가 진행되지 않도록 직렬화한다.
build job의 검사가 실패하면 배포하지 않으며 이전 사이트는 유지한다.

## 로컬에서 배포 경로 확인

```sh
npm run build:pages
npm run build:verify:pages
npm run preview:pages
```

미리보기는 출력된 주소의 `/aqua-canvas-trainer/`에서 연다.
기존 `npm run dev`, `npm run dev:ipad`, `npm run build`는 루트 경로를 사용한다.
두 빌드는 같은 `dist/`를 사용하므로 마지막 빌드에 맞는 preview 명령을 실행한다.

배경과 영상 URL은 `BASE_URL`을 사용한다. manifest의 scope·start_url·아이콘은
manifest 위치에 상대적이며, Worker 등록·캐시는 저장소 하위 경로로 제한된다.
참고 영상은 앱 셸과 오프라인 캐시에서 계속 제외한다.

`build-info.json`에는 빌드 경로와 Actions의 `GITHUB_SHA`를 기록한다. 배포 확인
스크립트는 같은 커밋이 제공되는지 확인한 뒤 주요 자산을 검사한다. 로컬 빌드의
커밋 값은 `null`이며 동작에는 영향을 주지 않는다.

## 재배포와 오류 확인

- [Actions](https://github.com/barmi/aqua-canvas-trainer/actions/workflows/pages.yml)에서
  `Deploy to GitHub Pages` 실행 결과와 실패한 step의 로그를 확인한다.
- 같은 화면의 `Run workflow`에서 `main`을 선택해 재배포할 수 있다.
- Pages 설정이 꺼졌거나 변경되면 Source를 GitHub Actions로 되돌린다.
- 새 코드 배포는 `main`에 커밋·푸시한다. 배포 후 기존 앱의 `새 버전 사용` 안내를
  누르면 저장 확인 후 새 Worker와 앱으로 전환한다.
- HTTPS 응답만 다시 검사하려면 다음 명령을 사용한다. 이는 브라우저 UI·Pencil
  동작의 수용 테스트가 아니다.

```sh
node scripts/verify-site.mjs https://barmi.github.io/aqua-canvas-trainer/
```

## iPad 사용과 기존 연습 이전

iPad Safari에서 공개 HTTPS 주소를 연다. 홈 화면에 추가한 뒤 온라인에서 풍경을
열고 `오프라인 준비됨`을 기다린다. 그다음 비행기 모드에서 재실행해 준비한
풍경의 그리기·저장·복구를 확인한다. 설치·오프라인의 실제 기기 확인은
[실기기 체크리스트](device-test-checklist.md)를 따른다.

개발용 LAN 주소와 github.io 주소는 서로 다른 브라우저 저장소를 사용한다.
기존 연습을 옮기려면 개발 주소에서 `연습 파일 백업`으로 JSON을 저장한 뒤
공개 사이트의 `나의 연습 → 연습 파일 가져오기`로 연다. PNG는 편집 가능한
연습의 백업을 대신하지 않는다.

## 설정 근거

- [Vite의 GitHub Pages 배포 안내](https://vite.dev/guide/static-deploy.html#github-pages)
- [GitHub Pages의 사용자 정의 workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
