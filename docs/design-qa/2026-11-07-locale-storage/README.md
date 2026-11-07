# 언어 저장소 예외 QA

[작업](https://app.notion.com/p/41166b33db7a815ea9caf1100b497e5c) · [릴리스 및 한계](../../LOCALE_STORAGE_2026-11-07.md)

- `before/browser-results.json`: 실제 이전 production 빌드에서 실패 4조건을 재현. pass는 재현 성공이다.
- `after/browser-results.json`: 제품 acffd57의 실제 로컬 production 빌드, 17조건 통과.
- `before/*.png`, `after/*.png`: 합성 화면. fixture 계정/이름만 사용했다. 실제 사용자 데이터는 없다.
- 실행기: `scripts/qa-locale-storage.mjs`. 브라우저 엔진은 기존 설치 Chromium/Playwright를 사용했고 설치나 외부 서비스를 추가하지 않았다.

로컬 production 서버를 `127.0.0.1:3128`에 실행한 뒤 기존 Playwright 모듈 위치를 `SOCCER_QA_PLAYWRIGHT`로 지정해 `node scripts/qa-locale-storage.mjs`를 실행한다. 이전 빌드를 조사할 때만 `SOCCER_QA_PHASE=before`를 사용한다. localhost 외 네트워크는 전부 가로채며 API 쓰기 시도는 차단하고 실패로 처리한다. 외부 서비스/운영 DB 테스트 실행기로 사용하지 않는다.

속성 접근 자체, getItem 읽기, setItem 쓰기를 별도로 주입한다. 주입 hit 배열은 문서 새로고침 시 초기화되므로 최종 빈 배열은 예외 미발생을 의미하지 않는다. pageerror와 화면·저장 값·복구 대조를 함께 읽는다. 소스 commit/blob·빌드 ID와 실행기 blob은 결과 JSON에 있다.

모바일은 320/390px Chromium 합성 viewport다. Enter 선택, 44px 이상 선택 항목과 일부 넘침을 확인했으나 실제 스크린리더/기기·언어 시트 전체 접근성 검사는 아니다. 일부 온보딩 캡처는 기존 진입 애니메이션 중 프레임이다. 브라우저 컴포넌트 통과가 iOS 프로세스 종료 해결, App Store 전달, 운영 인증 저장을 증명하지 않는다.
