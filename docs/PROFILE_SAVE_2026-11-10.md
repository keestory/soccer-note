# 프로필 이름 저장 결과 정합성 · 2026-11-10

작업: [WORK-33](https://app.notion.com/p/41466b33db7a813bbeaef52e80db83f7), 기존 [draft PR62](https://github.com/keestory/soccer-note/pull/62). [실제 역할 협의](AGENT_DISCUSSIONS.md#2026-11-10-실제-역할-협의--프로필-저장-결과와-재시도). 최종 제품 검증·preview READY 완료. 운영 배포 생성은 승인 검토에서 실행 전에 거절됐으며 운영은 기존 `0b04a960c616f19317759dd7c8e54da0509f4abd`다.

## 재현과 선택

01:13:40–01:13:46 UTC, 운영과 같은 제품 소스의 기존 production build `Neev93urkk1AiksttepRq`에서 실제 프로필 컴포넌트를 실행했다. 합성 인증 이름 변경은 성공했지만 profiles 저장이 500이면 전체 성공 toast가 표시되고, 새로고침 후 이전 profiles 이름이 나타났다. 정상 저장은 새 이름 유지, 인증 단계 실패는 실패 안내·profiles 쓰기 없음으로 대조했다. [3조건 원본 결과](design-qa/2026-11-10-profile-save/before/browser-results.json), [실행기](design-qa/2026-11-10-profile-save/before/runner.mjs.txt), [화면](design-qa/2026-11-10-profile-save/before/partial-save.png).

이것은 합성 실패 조건에서의 소비자 오인 재현이며 실사용 발생 빈도·영향 규모·성장 효과가 아니다. WORK13은 경기/참석 부분 저장 후속으로 보존하고 이번 프로필 범위는 WORK33으로 분리했다. WORK22 뒤로가기 접근성과 신규 제목 필터는 미채택이다. WORK26 App Store 시작 종료는 새 crash/출시 artifact 근거가 없어 별도 P0 Blocked이며 이 웹 수정이 해결한다는 근거는 없다.

## 구현 계약

- 인증 이름 변경과 profiles 저장을 성공·확정 거절·결과 불명으로 구분한다. 확인된 성공을 다시 보내지 않는다.
- 명시적 조회에서 요청한 이름이 확인되면 불명 결과를 확인할 수 있다. 불명 쓰기 뒤 불일치 또는 조회 실패는 미완료 증명이 아니므로 자동 재전송하지 않는다. 확정 거절 단계만 현재 계정/서버 상태를 확인한 뒤 명시적으로 재시도한다.
- 입력 B를 수정 중이면 늦은 A 응답이 B까지 저장됐다고 안내하지 않는다. 동기적 요청 잠금과 현재 계정/화면 검사를 적용한다.
- 독립 CQO는 설치된 Supabase SDK가 늦은 auth.updateUser A 응답을 저장해 B 세션을 A로 되돌리는 경합을 실제 SDK+합성 HTTP에서 재현했다. 프로필 요청에 한해 같은 기존 `/auth/v1/user` API를 현재 JWT로 호출하는 제한된 transport를 구현하고 독립 검토했다. 인증 설정·전역 클라이언트·공급자·새 자격증명·권한은 변경하지 않는다.
- 같은 탭의 새로고침/재진입 시 불명 결과가 사라져 다시 쓰이지 않도록 계정별 sessionStorage에 요청 이름·단계만 요청 전에 보존한다. 토큰·이메일은 기록하지 않으며 저장소 사용 불가 시 쓰기를 시작하지 않는다. 탭 종료·다른 기기·서버 전체 원자성/멱등성은 보장 범위가 아니다.

등급은 S2 제한 작업이다. 공개 검색/딥링크 변화가 없어 discoverability는 not-applicable, 신규 SDK/권한/스토어 제출이 없어 store_compliance는 not-applicable, 결정론적 오류 수정으로 competitive_benchmark는 not-applicable이다. 기존 개인정보·인증 경계에 대한 독립 보안 검토는 CQO와 함께 별도 확인한다. 실계정·실기기 검증은 수행하지 않는다.

## 검증 계획과 실행 경계

최종 동일 SHA lint/type/test/build, 실제 컴포넌트 합성 정상·각 단계 거절·응답 유실·조회 실패·명시 재시도·반복 클릭·입력 변경·이탈/복귀·새로고침·계정 전환·모바일/키보드·언어창 회귀를 검증한다. 모든 인증/DB 응답은 메모리 fixture이며 외부 요청은 차단한다. 실제 운영 쓰기는 하지 않는다. 독립 CQO의 지적·수정·최종 판정을 아래 실행 결과에 구분해 추가한다.

### 최초 검증과 독립 반론 이력

- 최초 로컬 build는 합성 서버 초기화에 필요한 `SUPABASE_SERVICE_ROLE_KEY` 더미 값 누락으로 실패했다. 실제 키를 읽거나 만들지 않고 fictional fixture 값을 추가한 뒤 build가 통과했다. [원본 로그](design-qa/2026-11-10-profile-save/initial-after/build-missing-fixture-key.log)를 보존했다. 제품 빌드 설정은 바꾸지 않았다.
- 초기 후보 build `co-HJrpDBE3AJvW_dcFn2`의 브라우저 32조건은 26통과/6실패였다. 3개 계정 전환은 테스트가 한글 메타데이터를 btoa에 직접 넣어 제품 경로에 도달하지 못했고, 2개는 같은 이름 저장 완료 뒤 비활성 버튼을 기다리는 기대값 오류, 1개는 저장소 복구 뒤 명시 재시도 버튼 대신 일반 저장을 기대한 오류였다. 실행기만 수정하고 [원본 결과](design-qa/2026-11-10-profile-save/initial-after/browser-results.json)와 화면을 보존했다. 이 실행 중 소스 보완이 진행됐으므로 최종 동일 SHA 수용 검증으로 사용하지 않는다.
- 독립 CQO의 실제 설치 SDK 재현에서 늦은 A auth 응답이 B 세션을 A로 덮었다. [합성 SDK 결과](design-qa/2026-11-10-profile-save/before/sdk-session-race.json), [실행기](design-qa/2026-11-10-profile-save/before/sdk-session-race.cjs.txt)를 보존했다. 같은 기존 endpoint의 요청 한정 transport를 선택한 근거이며 인증 설정 변경은 아니다.
- CQO는 초기 계정 로딩 중 전환 시 오래된 이름 노출, 저장 전 journal 보관 실패의 잘못된 불명 분류, 초기 조회 실패를 캐시 이름으로 대체하는 문제, 완료 journal 제거 실패 뒤 새 B 입력을 이전 A 요청으로 처리하는 문제를 지적했다. 구현자가 계정/세대 재확인·전송 전 보관 실패 처리·확인된 조회/실패 구분·완료 기록 정리를 보완했다.
- 조회 버튼이 실제 읽기만 수행할 때 저장 중이라고 안내하지 않도록 별도 문구를 요구했다. 읽기에서 같은 값이 관측되는 것은 현재 값 확인이며 특정 요청의 exactly-once 실행 증명이 아니다.
- 첫 커밋 `030a855be8b2de7d1d2b32bbdd986a1274ea4bf1`은 unit187·lint/type/build·언어창20·언어 저장소17을 통과했다. 프로필33조건은32통과/1실패였는데 같은 이름 완료 후 Save의 비활성을 요구한 테스트가 실제 no-op 동작 검증 전에 중단된 것이었다. 실행기를 실제 클릭/재제출 후 추가 쓰기0 확인으로 고쳤다. [후보 결과](design-qa/2026-11-10-profile-save/candidate-030a855/profile/browser-results.json)를 보존한다.
- 추가 CQO가 01:42:28–01:42:32 UTC 같은 후보의 실제 컴포넌트에서 A가 열어 둔 삭제·로그아웃·언어창이 B 계정 로딩 후에도 남는 것을 재현했다. 열기→합성 B 전환→취소만 실행했고 삭제·로그아웃 제출/운영 쓰기는 없었다. [실제 재현](design-qa/2026-11-10-profile-save/candidate-030a855/stale-sheets.json)을 보존했다. 계정 전환 시 세 창을 닫는 3줄만 추가한 제품 `1c2d861dd35a56f78770adf689c61c1a42ffbc32`를 최종 검증 후보로 사용한다.
- `1c2d861`은 프로필33·언어20·저장소17·독립 계정창3 및 전체 검사를 통과했지만, 01:48:25–01:48:26 UTC 추가 모바일 관측에서 320×568 독일어/긴 요청 이름의 실제 Tab 이동 후 Retry가 하단 메뉴에 가려졌다. 기존 33조건의 포커스·크기 assertion만으로 가림을 검증하지 못했다. [원본 관측](design-qa/2026-11-10-profile-save/candidate-1c2d861/keyboard-visibility/browser-results.json)의 pass는 관측 스크립트 완료이며 접근성 수용 통과가 아니다.
- 브라우저 내 CSS prototype 한 번으로 대상 버튼의 scroll margin 효과를 확인한 뒤, 기존 `--bottom-nav-h`와 safe-area 값을 쓰는 프로필 Save/Check/Retry의 세 style 속성만 추가했다. 공통 메뉴/전역 CSS/기존 상단 이름은 바꾸지 않았다. 제품 `45bb1e6ca3d049f7c4cafc31409901a5635e422d`의 기존 모바일5조건을 실제 Tab·메뉴 위 전체 가시성·중앙 hit test로 강화하고 같은33조건을 다시 검증한다. 이전 후보의 모바일 수용 판정은 이 보완 결과로 대체한다.

남은 기존 시각 한계: 320px에서 공백 없는 매우 긴 이름은 변경하지 않은 상단 이름 표시에서 잘린다. 새 상태 안내의 줄바꿈/복구 컨트롤 수용과 별개이며 전체 모바일 화면·접근성 완전 해결을 주장하지 않는다.

## 비용과 복귀 기준

Nov10 기존 프로젝트 팀 plan=hobby 재확인. [Hobby 공식 정책](https://vercel.com/docs/plans/hobby)의 일반 초과 사용 제한과 월 잔량·총청구 미확인을 구분한다. 기존 설치 npm/TypeScript/Vitest/Chromium/Playwright만 사용한다. 새 의존성·외부 유료 추론·유료 CI·turbo 빌드·요금제/환경변수 변경은 없다. 무료 포함 경로만 사용하고 한도 거절 또는 유료 옵션 필요 시 해당 단계에서 중단한다. 호스트 모델/청구 미확인은 무료 실행 증거가 아니다. 저장소 자동추론은 disabled/blocked 상태이며 실행하지 않는다.

복귀 기준 소스 `0b04a960c616f19317759dd7c8e54da0509f4abd`, 기존 production `dpl_5NxFUMTXVanGxGp3qbWHCT79Y22i`의 READY 및 대표 alias를 읽기 확인했다. 정상 기존 Git source 재배포가 복귀 계획이다. 실제 롤백 전환은 수행하지 않으며 특수 rollbackCandidate 거절은 재시도하지 않는다. 제품 최종 SHA·새 배포 결과는 검증 후 별도 기록한다.

## 최종 제품 검증

제품 **45bb1e6ca3d049f7c4cafc31409901a5635e422d**, 로컬 production build **l2Cv7chKDS6whg53DDLAz**. 이전 운영 대비 제품 파일은 `src/app/profile/page.tsx`, `src/lib/profile-name-save.ts`, `src/lib/profile-name-copy.ts` 세 개다. 패키지/의존성·전역 인증 설정·DB/RLS·네이티브 설정은 변경하지 않았다.

- Unit 187/187 (21 files), lint 0 errors/48 warnings, TypeScript 통과. [검증 요약](design-qa/2026-11-10-profile-save/verification.json)과 원본 로그를 보존했다.
- 로컬 webpack build는 compile/type 및 47/47 페이지 완료, BUILD_ID와 production 서버 READY로 완료를 확인했다. 실행기 transport가 잠시 끊겨 완료 프로세스의 exit receipt는 유실되었으므로 exitCode는 null로 기록했다. 같은 기존 클라우드가 running/connected임을 확인 후 재연결했으며 환경/권한/인증 변경은 없었다. 이후 lint/type/unit의 exit0는 직접 확인했다.
- 최종 프로필 **33/33**, 01:57:34.801–01:58:24.064 UTC, exit0. [실제 컴포넌트 결과](design-qa/2026-11-10-profile-save/after/browser-results.json). API/auth는 합성 메모리 응답이며 예상 밖 요청·쓰기·페이지 오류·route 오류·정리 경고는 0이다.
- 같은 최종 소스/빌드 언어창 **20/20** (02:03:00–34 UTC), 언어 저장소 **17/17** (02:02:41–02:03:07 UTC), 각각 exit0. 앞선 실행 결과 복사 경로가 이전 후보를 가리킨 것을 CQO가 발견하여 이 두 회귀만 재실행·복사 후 Nov9 역사 파일은 원복했다. 첫 재실행의 UI import 경로 누락은 제품 실행 전 실패이며 [로그](design-qa/2026-11-10-profile-save/initial-after/language-runner-path.log)에 보존했다. 기존 설치 Playwright 경로를 명시해 복구했고 새 도구를 설치하지 않았다.
- CQO 독립 계정 전환/기존 창 **3/3**, 01:57:39–43 UTC, [결과](design-qa/2026-11-10-profile-save/after/independent-sheets/results.json). 삭제·로그아웃 제출 없이 열기/전환/취소만 확인했다.
- 모바일5조건에 실제 Tab, 최소44px, 메뉴 위 전체 가시성, 중앙 hit test를 확인했다. 독일어320×568 Retry bottom340.5 < navTop492, centerHit=true. 스크린샷 직접 검토에서도 포커스 outline/버튼이 보였다. 이 근거가 이전 후보의 가림을 놓친 수용 판정을 대체한다.
- profiles 확정403 뒤 명시 재시도는 auth1/profile2, auth 확정403 뒤 재시도는 auth2/profile1. 응답 유실 뒤 현재 값 확인은 auth1/profile1이며 자동 재전송하지 않았다. 저장된 A 재제출은 추가쓰기0, 새 B는 새 요청으로 분리했다. 이 수치는 합성 호출 횟수이며 운영 exactly-once 보장이 아니다.

현재 같은 SHA의 GitHub Vercel status=success, preview **dpl_CPh1Qt7Vwnhyy2UFpyXKfHL2g1GL READY**도 확인했다. [미리보기](https://soccer-note-4sfz9n6kq-keestory91-6294s-projects.vercel.app)는 호스팅 빌드 성공 근거이며 공개 화면/실계정 저장 검증 근거가 아니다.

실제 계정/API 쓰기·물리 기기/Safari/스크린리더·운영 프로필 상호작용·실제 복귀 전환·App Store 검증은 미실행이다. 같은 탭 복구만 제공하며 탭 종료/다른 기기 간 journal이나 서버 전체 원자성을 보장하지 않는다.

## 독립 최종 판정 및 운영 미배포

CQO 반다이크의 최종 독립 코드·국소 보안 검토는 45bb1e6의 소스/빌드/33+20+17+3 결과 및 모바일 보완 화면을 재열람해 남은 국소 검토 차단이 없다고 판정했다. PR approval은 제출하지 않았다. 이 판정은 실계정·서버 전체 원자성·App Store 검증을 포함하지 않는다.

**02:04:54 UTC 확인: 운영 배포는 미실행·승인 차단이다.** 기존 Vercel 프로젝트 `prj_8MtXlwcx0NzpWAZQjGUuFTL4HHAL`, target=production, 정확한 제품45bb1e6에 대한 생성 요청을 한 번 보냈다. 자동 승인 검토가 이 커밋의 운영 배포에 명시적 승인이 없다는 이유로 실행 전에 거절했다. 반복 자율 개발·배포 지시가 있었지만 검토기가 인정하지 않은 상태이며 도구 인수에 승인 근거를 덧붙이거나 다른 경로로 우회하지 않았다. 새 운영 배포 ID는 없고 같은 근거 재시도는 하지 않았다.

거절 후 읽기 조회에서45bb1e6은 기존 READY preview 한 건뿐이고, 대표 alias `https://soccer-note-hazel.vercel.app`는 여전히 `dpl_5NxFUMTXVanGxGp3qbWHCT79Y22i` / `0b04a960c616f19317759dd7c8e54da0509f4abd` production READY임을 확인했다. 따라서 이번 수정이 운영에 적용됐다고 기록하지 않는다. 기존 소스와 배포는 복귀점으로 남고 정상 Git source 재배포 계획은 문서화했지만 실제 복귀 실행 권한 검증 또는 전환은 하지 않았다.

다음 안전한 단계는 이 정확한 제품의 기존 웹 운영 배포에 대한 새 명시적 승인이다. 새 관련 승인과 알려진 미실행 상태가 함께 확인된 경우에만 같은 요청을 한 번 재검토한다. 기존 공개 UI CONNECT403은 반복하지 않았으며 새 운영 UI 검수·실제 인증/DB 쓰기·실기기·실제 롤백은 미실행이다. iOS App Store WORK26 P0는 별도 Blocked로 유지한다.

로그 보관 시 build 진행 표시의 줄 끝 공백/CR만 정규화했다. 검사 내용·실패·시각·판정은 변경하지 않았다.
