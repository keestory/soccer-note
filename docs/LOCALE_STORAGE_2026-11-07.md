# 언어 설정 저장소 예외 · 2026-11-07

[작업 카드](https://app.notion.com/p/41166b33db7a815ea9caf1100b497e5c) · [실제 역할 협의](AGENT_DISCUSSIONS.md#2026-11-07-실제-5역할-협의--언어-설정-저장소-예외)

## 범위와 재현

기준 소스는 `576f6b6c9dfc5d7ac6b7d60407a077cd8a4ac9f9`, 이전 운영 제품은 `e7b50d5043149cbecbdfedb2760ff49fc1ecedc4`다. 기존 빌드 `Dpvc3wJRetRWag672znXw`와 실제 I18nProvider·온보딩·프로필 언어 선택창에서 네 가지 합성 조건을 재현했다. 원본 실행기와 JSON·화면을 이번에는 저장했다. 모든 외부 요청은 가로채며 운영 데이터 접근·쓰기와 인증 제출은 없었다.

- 초기 localStorage 속성 접근 또는 언어 키 getItem이 SecurityError를 던지면 웹 오류 화면이 나타났다.
- 정상 진입 뒤 속성 접근 또는 언어 키 setItem을 실패시키면 선택한 언어는 React 상태에 반영되지만 예외가 전파되어 언어 선택창이 닫히지 않았다. 저장된 이전 언어는 유지됐다.
- `before`의 pass는 결함 재현 성공을 뜻하며 정상 동작 통과가 아니다. [수정 전 결과](design-qa/2026-11-07-locale-storage/before/browser-results.json).

이 실패는 웹 합성 조건이다. App Store의 실제 기기에서 동일한 예외나 프로세스 종료를 관측한 것이 아니다. [WORK-26 조사](IOS_LAUNCH_INVESTIGATION_2026-11-06.md)는 계속 Blocked·미배포다.

## 제품 변경

제품 커밋: `acffd57b509cacdffac4b200796a272d7537f44e`. 제품 파일은 `src/lib/i18n/context.tsx` 하나다. 언어 읽기 예외에는 기존 브라우저 언어 fallback을 사용하고, 쓰기 예외는 현재 React 세션 언어를 유지한다. 정상 저장 값과 언어 매핑은 바꾸지 않았다. 저장 실패 후 새로고침하면 이전 저장 값이 남을 수 있으며 영속 저장 성공을 보장하지 않는다.

`scripts/qa-locale-storage.mjs`는 실제 로컬 production 빌드를 구동하는 합성 검증 실행기다. 보조 함수 모형으로 컴포넌트를 대체하지 않는다. 제품 의존성·인증·전역 저장소·DB/RLS·네이티브 파일 변경은 없다.

## 최종 제품 SHA의 검증

- lint: 오류 0, 기존 경고 49.
- type: `npx --no-install tsc --noEmit` 통과.
- unit: 20개 파일, 163개 테스트 통과.
- build: `npm run build -- --webpack` 통과, 빌드 `UmXl9FMQnF3RfRtRo9BCp`.
- browser: 실제 I18nProvider·온보딩·프로필 경로 **17/17** 통과. [결과](design-qa/2026-11-07-locale-storage/after/browser-results.json), [실행기](../scripts/qa-locale-storage.mjs).
- 속성 getter/getItem 시작 실패, getter/setItem 선택 실패, 유효 언어 8종, 누락·잘못된 값·지원 밖 브라우저 언어, 정상 저장/새로고침, 반복 선택, 저장 복구 후 재선택·새로고침, 취소·뒤로가기, 키보드 Enter 선택을 검증했다. 쓰기 예외 후에도 초기 프로필이 열리고 현재 언어가 바뀌며 선택창이 닫힘을 확인했다.
- 320×844·390×844 합성 화면. 선택 항목 높이 44px 이상, 문서 lang 갱신, 320px 프로필 가로 넘침 없음. 실제 스크린리더·실기기·포괄적 접근성 적합성은 미검증이다. 기존 언어 시트의 modal 의미·포커스 관리와 뒤로가기 링크는 변경하지 않았다.
- 최종 브라우저 미처리 page exception 0, 예상 밖 요청 0, API 쓰기 시도 0. 실제 운영 인증·저장 성공이나 성장 효과를 뜻하지 않는다.

로컬 환경 복원 뒤 첫 build는 테스트용 server key 누락으로 page-data 수집에서 실패했다. 실제 키를 조회하지 않고 기존 합성 server key를 명시한 다음 통과했다. Google Fonts 응답은 이전 빌드에 이미 있던 746개 WOFF2와 CSS를 임시 경로에서 재사용했다. 새 설치·호스팅 환경 변경은 없다. 이 로컬 font 대체는 Vercel 운영 빌드에 적용하지 않는다.

## 비용·배포·복귀 경계

기존 팀·Soccer Note 프로젝트가 Hobby임을 지원된 조회로 재확인했다. [Hobby 정책](https://vercel.com/docs/plans/hobby)과 [Functions 정책](https://vercel.com/docs/functions/usage-and-pricing)상 이번 일반 경로의 초과 사용은 제한 대상이며 Hobby 주문형 Functions 과금 항목은 없다. 월 잔여량·총청구와 호스트 네이티브 모델/청구는 미확인이다. 유료 옵션·새 계정/키·CLI 추론을 추가하지 않는다. 한도 거절이 발생하면 중단한다.

복귀점은 기존 READY production `dpl_34sbWPaRDYuu3ex89SgSacFcf6xS` / `e7b50d5043149cbecbdfedb2760ff49fc1ecedc4`다. 이전 source와 READY 상태를 조회했고, [정상 create-deployment 계약](https://vercel.com/docs/rest-api/sdk/deployments/create-a-new-deployment)의 `deploymentId`, `target=production`, `withLatestCommit=false`로 이전 소스를 재배포하는 계획을 유지한다. 실제 복귀 실행·그 실행 권한 성공을 시험한 것은 아니다. 특수 rollbackCandidate 거절 경로는 재조회하지 않았다.

## 독립 CQO 검토

CQO 반다이크가 제품 커밋, 실제 컴포넌트 경로와 runner·소스 blob·빌드 ID·전후 JSON 및 화면 3장을 읽고 출시를 막는 코드 결함이 없다고 보고했다. try 범위가 속성 접근과 메서드 실행을 함께 감싸며 상태 갱신 뒤 저장 실패가 선택창 닫힘을 막지 않음을 확인했다. 별도 검사를 재실행하거나 PR approval을 제출한 것은 아니다.

비차단 지적 두 가지를 반영한다. runner의 `hits`는 새로고침 때 초기화되므로 최종 빈 배열을 예외 미발생 증거로 쓰지 않는다. 수정 전 예외 관측, 실패 중 기존 저장 값과 세션 언어의 차이, 복구 후 저장 대조로 판단한다. 접근성은 Enter 선택·선택 항목 크기·좁은 화면 범위이며 기존 시트의 Tab 순환/Escape/포커스 복귀/스크린리더까지 통과했다고 주장하지 않는다. 온보딩 캡처는 기존 진입 애니메이션 중 프레임을 포함하므로 정적 색상 대비 적합성 증거로 사용하지 않는다. 추가 제품 수정이나 전체 회귀 재실행을 요구하는 finding은 없었다.

## 원격 결과와 운영 배포 차단

원격 `codex/quarter-save-reliability`에 제품 `acffd57b509cacdffac4b200796a272d7537f44e`를 push했다. PR62는 open/draft이며 해당 SHA의 Vercel 상태 검사는 success다. 이 상태 검사는 운영 반영이나 네이티브 검증을 뜻하지 않는다. 승인·병합·거절된 PR 본문 수정은 하지 않았다.

01:25–01:26 UTC, 기존 Soccer Note 프로젝트에 해당 Git SHA의 production deployment 생성 요청을 한 번 제출했으나 **자동 승인 검토가 거절했다**. 사유는 이번 운영 릴리스에 대한 명시적인 사용자 승인 근거가 인정되지 않았다는 것이다. 응답은 오류/거절이며 새 배포 ID는 발급되지 않았다. **denied / not executed**로 기록하고 같은 요청을 재시도하거나 다른 경로로 우회하지 않았다.

01:26:01 UTC 재조회에서 대표 alias `soccer-note-hazel.vercel.app`는 계속 기존 `dpl_34sbWPaRDYuu3ex89SgSacFcf6xS`를 가리켰다. 제품 운영 SHA는 `e7b50d5043149cbecbdfedb2760ff49fc1ecedc4`로 유지된다. 이번 수정의 운영 공개 UI 검증은 미실행이며, 이전 CONNECT403 경로를 반복하지 않았다. 실제 iPhone/App Store 전달, 운영 인증 쓰기와 복귀 전환도 미검증이다.

이 시점의 결론은 **구현·독립 리뷰·합성 QA·원격 반영 완료 / 운영 배포 승인 차단**이었다. 다음 후속의 승인·실행 결과와 구분하며 이 최초 거절 이력을 보존한다. WORK-26의 App Store 종료 원인 미확정 및 차단 상태와 별개다.

## 새로운 승인 근거에 따른 단일 후속 시도

조정자가 기존 두 제품의 반복 개발·검증·배포와 무료 요금/할당량 조건을 명시한 사용자 자동화 원문을 추가 전달했다. 이전의 일반적인 승인 요약과 달리 배포 범위를 직접 확인할 수 있는 새 근거로 판단했다. 최초 요청의 명시적 거절·배포 ID 미발급 및 현재 alias의 이전 배포 유지를 확인한 다음, 같은 제품 SHA와 동일 프로젝트/production 요청을 한 번만 다시 제출했다. 승인 근거를 배포 요청 인자에 넣거나 다른 경로로 우회하지 않았다.

직전 읽기 점검에서 Hobby, 이전 배포 READY, 깨끗한 작업 트리, 원격 문서 SHA `a641b8265f8704527bed72233f96e2a3a03271b9`, 검증 제품 이후 제품/실행기 무변경을 확인했다. 해당 문서 SHA의 Vercel 검사도 success였다. 제품 QA와 복귀 소스가 바뀌지 않아 동일 테스트를 불필요하게 반복하지 않았다.

새 요청은 접수됐으며 ID는 `dpl_9fY9Rv4VNjhuD1seXTnbApE4x98k`, 제품 SHA는 `acffd57b509cacdffac4b200796a272d7537f44e`, target은 production이다. 아래 최종 상태에서 READY·대표 alias 확인과 공개 UI 직접 관측을 구분한다.

### 최종 운영 확인

- Production deployment: `dpl_9fY9Rv4VNjhuD1seXTnbApE4x98k`, **READY**, `aliasError=null`.
- 정확한 Git SHA: `acffd57b509cacdffac4b200796a272d7537f44e`.
- 대표 URL: https://soccer-note-hazel.vercel.app
- 배포 URL: https://soccer-note-6p1qi9h0i-keestory91-6294s-projects.vercel.app
- READY 시각: 2026-11-07 01:31:35.329 UTC. 01:32 UTC 지원된 조회에서 배포 SHA/READY와 대표 alias가 위 배포 ID를 가리키는 것을 각각 확인했다.

추가 요청은 하지 않았다. 총 production 생성 요청 두 번 중 최초는 미실행 거절, 새 근거에 따른 단일 후속 요청만 실행됐다. 새 유료 옵션·환경 설정·권한·DB·네이티브 빌드 변경은 없다. 이전 운영 source/deployment를 통한 정상 재배포 복귀 계획은 위와 같다. 실제 복귀 전환은 실행하지 않았다.

이 작업자의 운영 검증은 **배포 메타데이터와 alias 조회**까지다. 기존 executor 공개 UI CONNECT403을 재시도하거나 우회하지 않았다. 이 시점에는 직접 공개 UI 관측이 없었으며, 아래에 별도 허용된 검수 경로에서 전달받은 후속 결과를 구분해 기록한다. 실제 인증 언어 선택/운영 쓰기·iPhone·App Store 전달은 합성 QA와 구분해 미검증으로 남긴다. WORK-26 종료 문제 해결·완화로 표현하지 않는다.

### 별도 클라우드 공개 UI 관측 · 01:35–01:36 UTC

출처는 조정자가 전달한 별도 허용된 클라우드 브라우저 작업자의 2026-11-07 01:35–01:36 UTC 관측 요약이다. 해당 작업자가 자신의 탭에서 대표 운영 도메인을 확인했으며, 이 코드 작업자가 같은 검수를 재실행한 것이 아니다.

- 한국어 온보딩 렌더, Next 1→2→3 및 Back 3→2→1이 정상 동작했다.
- 로그인 화면이 정상 렌더됐다. 인증 입력·로그인·운영 쓰기는 수행하지 않았다.
- 관측한 console에는 확장기능 metadata 오류만 있었고 앱 출처 오류는 관측되지 않았다. 이는 모든 오류가 없다는 증거는 아니다.
- 온보딩/로그인에는 언어 컨트롤이 없어 언어 변경·저장소 실패를 live에서 검증하지 못했다. 해당 기능의 성공 근거는 위 로컬 실제 컴포넌트 합성 QA와 구분한다.
- viewport 설정 도구가 제공되지 않아 데스크톱만 관측했다. 360px 모바일 또는 실제 기기 검증이 아니다.
- 브라우저 화면은 커밋 SHA를 증명하지 않는다. 조정자의 별도 Vercel 재조회가 제품 `acffd57b509cacdffac4b200796a272d7537f44e`와 production READY·대표 alias를 확인한 근거다.

이 후속은 문서 기록만 추가한 것이며 제품 수정·운영 재배포·PR 본문 변경·승인·병합을 수행하지 않았다. 현재 결론은 **국소 웹 수정·독립 검토·합성 QA·정확한 운영 SHA/READY/alias 및 제한된 공개 진입 화면 관측 완료**다. 실제 인증 언어 변경·저장소 실패 live 검증, 실기기·App Store 전달·운영 쓰기·실제 롤백은 미검증으로 남으며 WORK-26은 계속 Blocked다.
