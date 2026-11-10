# 쿼터 전체 저장 독립 QA — 2026-11-02

판정: **로컬 변경 범위 PASS**. 실제 production build를 Chrome에서 실행하고, 모든 인증·Supabase·업로드 API를 합성 메모리 데이터로 가로채 검증했다. 운영 데이터 쓰기, 실제 사용자 성과 측정, 물리 기기 검증이 아니다.

## 재현

`node scripts/qa-quarter-save.mjs`

로컬 서버는 `http://127.0.0.1:3127`, 공개 빌드 설정은 `https://soccer-note-test.supabase.co`와 가상 anon key다. Playwright 경로는 `SOCCER_QA_PLAYWRIGHT`로 지정할 수 있다. 브라우저는 별도 빈 context를 사용하고 service worker를 차단한다. 같은 앱의 GET/HEAD 문서·정적 자산 외 요청은 가로채거나 차단한다.

배포 자산 검증은 정확히 `https://soccer-note-hazel.vercel.app`와 `SOCCER_QA_ALLOW_PRODUCTION_FIXTURE=1`을 함께 지정해야만 허용한다. 이 경우에도 실제 데이터 API에 연결하지 않으며 결과는 `production/`에 별도 저장한다. 초기 로컬 검증 이후의 배포 검증은 아래 부록에 구분했다.

## 검증 결과

최종 브라우저 시나리오 **8개 모두 통과**. 예기치 않은 console error 0, page error 0, 예상하지 않은 요청 0. 테스트가 의도적으로 주입한 HTTP 500/연결 실패는 별도로 기록했다.

1. 390px 지연 저장: 두 번 클릭해도 POST 1회, 저장 중 편집·pitch 키보드 이동 차단, 기존 ID 유지, 뒤로가기 확인 취소 후 트리거에 포커스 복귀.
2. Upsert 실패: 삭제 요청 0회, 기존 기록과 초안 유지, 실패한 동일 초안을 재시도해 완료, 완료 후 편집 가능.
3. 일부 성공 후 삭제 실패: 먼저 upsert한 기록은 보존하고 제거 의도를 유지, 재시도로 명시한 ID만 삭제, 편집 이후 서버에 추가된 다른 기록 보존.
4. 빈 배치: 마지막 선수 제거 저장 가능. 삭제 응답이 비어 있으면 완료로 오인하지 않고 실패 처리. 재시도 때도 불러오지 않은 기록을 삭제하지 않음.
5. 새 선수의 upsert 응답 유실: 서버에 합성 커밋 후 응답을 끊고 재시도해 한 행과 동일 ID 유지.
6. 미디어 업로드 지연: 업로드 중 전체 저장·편집 차단, 완료 후 URL을 다음 저장에 포함.
7. 교체 기록 지연: 교체 저장 중 전체 저장 차단, 확인된 교체 선수는 다음 전체 저장에 포함.
8. 독일어 320px: 긴 안내 줄바꿈, document scrollWidth 320 / innerWidth 320, 넘치는 요소 0, 주요 헤더 조작 높이 44px·56px.

## 발견·수정한 결함

최초 독일어 320px 검증에서 document scrollWidth가 412px였다. 포메이션 action 영역은 오른쪽 332.83px, 교체 추가 버튼은 411.95px까지 넘쳤다. 두 행의 wrapping/min-width 처리를 수정한 후 320px로 재검증했다. 음성 안내와 별개로 오류 본문 색상도 기존 red에서 기본 밝은 텍스트로 수정됐다. 최종 계산된 오류 본문 대비는 `rgb(245,245,239)` / `rgb(17,16,16)` 기준 **17.36:1**이다. 오류 의미는 빨간 경계와 alert 역할로 유지한다.

이탈 확인의 취소 동작은 실패 시 즉시 편집을 다시 허용한다는 오해가 없도록 “이 화면에 머무르기”로 바뀌었다. 실패한 저장은 알 수 없는 서버 커밋을 다른 초안으로 덮지 않도록 동일 초안 재시도 전까지 입력을 잠그는 계약이다.

- 최종 기계 결과: [browser-results.json](browser-results.json)
- 수정 전 실제 결함: [negative-responsive.json](negative-responsive.json), [negative-de-320.png](negative-de-320.png)
- 수정 후: [failed-de-320.png](failed-de-320.png), [failed-390.png](failed-390.png)
- 저장 상태: [pending-390.png](pending-390.png), [saved-390.png](saved-390.png)

## 코드 검토와 남은 한계

저장 helper는 유지할 행의 확인된 upsert 이후 불러온 baseline의 명시적 제거 ID만 쿼터와 함께 삭제한다. 완전한 삭제 응답을 받지 못하면 fail closed하고, 부분적으로 확인된 ID만 로컬 baseline에 반영한다. 화면은 동일 작업 ref와 route generation으로 비동기 작업의 중복·오래된 응답을 막고, 저장 후 전체 재조회 대신 ID를 반영한다. 캐시 반영은 선택 팀·경기·쿼터 범위에 한정된다.

여러 HTTP 요청을 한 DB 트랜잭션으로 만들지는 않는다. 다른 기기의 동시 편집 충돌 해결, 실제 Supabase RLS/고유 제약 배포 상태, 실제 업로드·OAuth·교체 쓰기, 물리 iOS/Android 기기는 검증하지 않았다. 삭제가 실제 완료됐으나 응답이 유실되면 재시도도 확정하지 못할 수 있으며, 사용자는 저장된 기록을 확인하려고 편집 화면을 다시 열어야 한다. 브라우저 새로고침/강제 종료 이후 초안 복구를 보장하지 않는다. 화면 reader는 실제 음성 기기로 검증하지 않았고 DOM 역할·live 상태·키보드 포커스만 확인했다.

## 배포 자산 QA 부록

2026-11-02 배포 후, 메인 에이전트가 Vercel 조회로 확인한 다음 배포와 alias를 대상으로 동일한 8개 합성 시나리오를 실행했다.

- 배포: `dpl_HkBWcMRogdKBvCHYiZ9AkirvHLXC`
- 제품 커밋: `8ea82a495c0846bc36fccca2607eab88048911b1`
- 주소: `https://soccer-note-hazel.vercel.app`
- 실행: `SOCCER_QA_BASE_URL=https://soccer-note-hazel.vercel.app SOCCER_QA_ALLOW_PRODUCTION_FIXTURE=1 node scripts/qa-quarter-save.mjs`

결과는 **8/8 PASS**, page error 0, 예기치 않은 console error 0, 예기치 않은 요청 0, 최종 브라우저 종료 경고 0이다. [배포 브라우저 결과](production/browser-results.json)와 [독일어 320px 실패 상태](production/failed-de-320.png), [390px 실패 상태](production/failed-390.png), [저장 진행](production/pending-390.png), [저장 완료](production/saved-390.png)를 별도로 남겼다. 운영 화면 자산의 실제 동작을 검증했으며, Supabase·인증·업로드·교체 데이터 요청은 전부 합성 응답으로 대체했다. 이 결과는 운영 DB의 실제 쓰기나 RLS 통과를 증명하지 않는다.

첫 배포 검증 시도는 마지막 캡처 후 브라우저 종료가 지연되어 완성된 결과로 집계하지 않았다. 해당 QA 프로세스만 종료하고, 하네스가 각 시나리오 결과를 먼저 저장하며 context/browser 종료를 5초로 제한하도록 보완했다. 동일한 8개 시나리오를 다시 실행한 최종 결과가 위 PASS다. 하네스의 전체 PASS는 정확히 8개 완료를 요구하며, 종료 경고는 제품 동작 결과와 별도로 기록한다. 배포된 제품 코드는 변경하지 않았다.
