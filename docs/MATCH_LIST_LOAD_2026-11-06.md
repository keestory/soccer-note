# 경기 목록의 조회 실패와 빈 기록 구분

상태: 제품 구현·독립 CQO/CDO/ops 리뷰·최종 QA·운영 배포 완료. 별도 허용된 클라우드의 공개 데스크톱 UI 검수 결과를 후속 기록했다. 이 실행기의 CONNECT403 제한과 실제 인증 목록 오류의 라이브 미검증은 유지한다. [작업 카드](https://app.notion.com/p/41066b33db7a8186a786eb5c683deddb), [실제 역할 협의](AGENT_DISCUSSIONS.md#2026-11-06-실제-5역할-협의--직접-찬양-추가와-기록-신뢰), [수정 전 재현](design-qa/2026-11-06-match-load/reproduction/README.md).

## 문제와 선택

기존 제품90398f1의 실제 빌드에서 운영 쓰기 없는 다섯 합성 조건을 비교했다. 캐시 없는 초기 팀 목록 조회500은 총 경기0·기록 없음으로 표시됐고 오류·명시적 재시도 안내가 없었다. 캐시가 있으면 이전 경기1건을 유지했으나 갱신 실패 안내가 없었다. 정상 빈 목록과 팀 전환 성공/실패 대조군은 별도로 확인했다. 최초 하네스의 예상 한국어 문구 오류와 수정 이력도 보존했다. 조사 완료는 제품 정상 판정이 아니다.

초기 실패에는 오류·재시도를 표시하고 미확인0경기 통계를 숨긴다. 캐시가 남은 실패에는 기존 기록을 유지하면서 최신 기록 미확인을 알린다. 재시도는 기존 `data.refresh`를 사용하고 버튼과 당겨서 새로고침의 중복 실행을 막는다. 현재 팀 조회 실패와 다른 팀 선택 실패를 구분하며, 계정/확정 팀 변경·화면 이탈 뒤 오래된 요청이 포커스나 진행 상태를 변경하지 않도록 제한한다.

상대·장소 검색은 실제 기록량·수요 근거가 부족해 보류한다. 기존36px 뒤로가기 링크는 이번 제품 diff와 무관한 후속 과제다. 전체 store/인증·DB/RLS/스키마·권한·API·의존성·계정·유료 옵션·계측은 변경하지 않는다. 작업 등급은S1. 인증 화면의 제한된 오류 UI이므로 discoverability/store_compliance/competitive_benchmark는 적용 제외이며, 변경된 컨트롤의 모바일·접근성은 검증한다.

## 기준과 경계

- 기준 원격/로컬 `372faf95816879cc0e930102e08fd45c94c0c077`, clean 작업 트리, 기존 [draft PR62](https://github.com/keestory/soccer-note/pull/62). 미커밋 사용자 변경은 없었다.
- 운영/복귀 소스 `90398f1822cddc665d3d18f26d7fc12cc46229c2`, 배포 `dpl_6rHZ5swbN8un8GuPp5nBsBYFRkSe`, 대표 alias의 READY/production 일치를 읽기 확인했다.
- 11월6일 현재 Hobby를 지원된 조회로 확인했다. [일반 초과 사용 제한](https://vercel.com/docs/plans/hobby), [Functions 포함량과 Hobby on-demand 미제공](https://vercel.com/docs/functions/usage-and-pricing)은 월 잔량·총청구액·호스트 모델 청구 미확인과 구분한다. 새 유료 옵션을 켜지 않으며 한도 거절 시 중단한다.
- 저장소 모델 CLI blocked/disabled와 이전 EROFS·DB·workflow·특수 rollbackCandidate·PR 본문 거절은 재시도하지 않는다. 호스트 역할 협의는 저장소 CLI나 비용 가드 실행 성공의 증거가 아니다.
- 모든 브라우저 데이터는 가상이며 실제 인증 쓰기·운영 DB/RLS·실기기·성장/피해 빈도·실제 복귀 전환은 검증하지 않는다. 운영 공개 UI는 별도 허용된 경로의 근거가 있을 때만 구분 기록한다.

## 실제 독립 설계 의견

CDO 네이마르는 기존 화면 안의 짧은 오류 카드 하나, 초기 실패의 통계 숨김, 캐시 실패의 이전 기록 명시,48px 이상 재시도 컨트롤을 권고했다. 재시도 시작 시 오류 플래그가 초기화되므로 진행 상태를 별도로 유지하고, 성공 뒤 포커스 이동은 요청한 화면 문맥에서만 수행하라고 지적했다. 긴 번역·320/390px·실패 재시도·화면 이탈을 검증 대상으로 정했다. 오류와 토스트를 중복 표시하지 않는다. 최종 리뷰·QA·릴리스 결과는 후속 기록한다.

## 최종 제품 소스와 정적 검증

제품 커밋은 `e7b50d5043149cbecbdfedb2760ff49fc1ecedc4`다. 제품 변경은 `src/app/matches/page.tsx`와 `src/lib/match-load-copy.ts` 두 파일이며 기존 store·권한·API 계약은 그대로다. 같은 커밋의 단위 **163개/20파일**, lint **오류0/기존경고49**, TypeScript, 프로덕션 build, diff-check를 통과했다. 로컬 빌드ID는 `Dpvc3wJRetRWag672znXw`다. 기존 빌드의 CSS·746 WOFF2만 임시 테스트 응답으로 재사용했고 새 설치나 호스팅 설정 변경은 없다. 로컬 합성 환경변수/빌드는 운영에 업로드하지 않는다.

독립 CQO는 진행 중 조회에 재시도가 합류하면 공유 promise rejection이 호출자까지 전파될 수 있음을 지적했다. 기존 loader의 오류 상태는 보존하면서 로컬 재시도에서 rejection을 처리하도록 보완했다. native disabled가 Chromium에서 버튼 포커스를 BODY로 옮기는 독립 DOM 관측도 받아 `aria-disabled`와 동기 in-flight 가드를 사용했다. 두 보완 뒤 최종 SHA/제품 blob 동일성을 확인한 CQO 리뷰의 남은 차단 finding은0이다.

CDO와 CQO는 초기 재시도 성공의 null→확정 팀 key 교체에서 강제 포커스를 생략하는 선택을 비차단으로 판단했다. 같은 확정 문맥에서는 버튼에 포커스가 남은 직접 재시도만 성공 후 제목으로 이동한다. 실패시 버튼 포커스를 유지하고 다른 화면·계정·팀으로 이전 요청의 포커스를 넘기지 않는다. 모든 재시도 성공의 제목 포커스나 실제 스크린리더 발화를 보장하지 않는다. 최종 브라우저 관측과 시각 검토는 별도 추가한다.

## 독립 합성 브라우저 QA

CQO 반다이크 역할의 별도 QA 작업자가 같은 제품 SHA/빌드에서 **21/21** 수용 시나리오를 첫 full run으로 통과했다(01:50:04 UTC 시작). 마지막 한 시나리오에 8개 언어와 fallback을 묶었다. 초기 팀/멤버십/경기 조회 실패, 캐시1건/0건, 동일 팀 갱신 실패, 정상 목록/빈값, 실제 브라우저 반복 클릭·키보드, 실패 후 재시도, 뒤로가기·늦은 응답·계정 교체·로그아웃, 팀 전환 성공/실패/취소,320/390px, 현지 날짜·수동 선택 smoke를 확인했다. 자동 조회 중 pull 재시도가 동일 요청에 합류한 뒤500이 되어도 unhandled rejection이 없었다.

모든 인증/API는 합성 fixture였고 **쓰기 시도0**이다. pageerror·예상 밖 요청/콘솔 오류·정리 경고0이며 의도한 HTTP500 로그27개는 별도 분류했다. 최초 결함 조사에서 잘못된 예상 한국어 문구를 고친 이력은 유지하며, 이번 첫 수용 검증의 통과와 구분한다. 실행 runner 원본과 실행 뒤 미사용 변수 두 개만 정리한 재사용 runner를 구분했다. 후자는 구문·ESLint 오류/경고0이며 별도 브라우저 재실행을 주장하지 않는다.

[전체 QA/전후 화면](design-qa/2026-11-06-match-load/README.md), [JSON](design-qa/2026-11-06-match-load/after/browser-results.json), [검증 manifest](design-qa/2026-11-06-match-load/verification.json)에 출처를 남겼다. 화면은 CSS viewport/DPR1이며 실기기·실제 스크린리더·인증 운영 조회/쓰기 성공을 뜻하지 않는다. 기존 독일어320px 4열 통계의 긴 라벨 밀집은 이번 변경 밖의 후속 관측이다.

## 복귀 계획과 독립 운영 검토

독립 ops 검토는 제품 SHA·빌드·파일 blob·검증 기록 사이의 모순을 발견하지 않았다. 조회 실패/캐시 상태 수정의 복귀는 기존 운영 소스 `90398f1822cddc665d3d18f26d7fc12cc46229c2` / 배포 `dpl_6rHZ5swbN8un8GuPp5nBsBYFRkSe`를 기존 프로젝트의 [정상 redeploy API](https://vercel.com/docs/rest-api/sdk/deployments/create-a-new-deployment)로 다시 배포하는 계획이다. `deploymentId`에 이전 배포를 지정하고 `target=production`, `withLatestCommit=false`로 유지한 후 반환된 SHA·READY·대표 alias를 다시 확인한다. 이전 READY/소스와 지원되는 API 계약을 확인한 범위이며 실제 복귀 전환이나 그 실행 권한을 시험하지 않았다. 특수 rollbackCandidate 거절을 재조회·우회한 것이 아니다.

CDO 네이마르는 최종 화면6장을 직접 열어 새 오류/재시도 UI의 심각한 잘림·겹침이 없음을 확인했다. 320px 한국어 포커스·긴 독일어,390px 초기/캐시/진행/정상 빈값을 확인했다. 캐시0건은 별도 이미지 없이 QA JSON으로만 확인했다. 독일어 기존 통계 라벨 밀집은 제품 diff 밖 후속으로 분리했고, 실제 스크린리더 발화·실기기·운영 UI는 검수하지 않았다.

## 운영 배포 결과 · 2026-11-06 01:56:54 UTC

- 제품/원격 소스: `e7b50d5043149cbecbdfedb2760ff49fc1ecedc4`. 기존 `codex/quarter-save-reliability`에 non-force push 후 원격 SHA를 확인했다. [PR62](https://github.com/keestory/soccer-note/pull/62)는 open/draft, base `main`이며 승인·병합·본문 갱신을 하지 않았다.
- 기존 프로젝트의 정상 Git 배포를 한 번 요청했다. `dpl_34sbWPaRDYuu3ex89SgSacFcf6xS`는 **production/READY**, ready `2026-11-06T01:56:54.579Z`, `aliasError=null`이며 정확한 제품 SHA와 일치한다. [고유 배포 URL](https://soccer-note-9egx8inx9-keestory91-6294s-projects.vercel.app), [대표 도메인](https://soccer-note-hazel.vercel.app)의 alias deployment ID가 동일하다.
- 제품 SHA의 GitHub combined status는 Vercel `success`였다. 이것을 추가 GitHub Actions/허용되지 않은 workflow 실행 성공으로 확대하지 않는다. 문서/QA 후속 커밋은 제품 코드 변경 없이 같은 브랜치에 기록하며 운영 재배포하지 않는다.
- 운영 배포의 최근10분 error/fatal 그룹 조회는 빈 표를 반환했다. 트래픽 유무·전체 오류 부재·실사용 성공의 증거가 아니다. 원문 로그/개인정보는 수집하지 않았다.
- 이 실행기의 기존 공개 URL CONNECT403을 반복하지 않았다. 따라서 **운영 SHA/READY/alias 확인**과 **합성 인증 UI21개 검증**을 구분한다. 실제 운영 공개 화면·인증 조회/쓰기·RLS·실기기·사용자 효과는 이번 작업에서 미검증이다. 별도 허용된 클라우드 공개 UI 관측이 있으면 문서 후속으로 추가할 수 있다.

[배포 manifest](design-qa/2026-11-06-match-load/production-deployment.json)에 안전한 메타데이터만 남겼다. 현재 Hobby·일반 한도 정책을 재확인했고 유료 옵션/추가 과금 경로·설정·환경변수·DB·보안은 변경하지 않았다. 월 잔량과 총청구0원은 확인하거나 보장하지 않는다. 새 권한 거절·할당량 거절·불확실 배포 결과는 발생하지 않았다. 기존 CLI/DB/특수 rollback 등의 차단은 그대로 유지된다.

## 별도 클라우드 공개 UI 검수 · 2026-11-06 02:03–02:04 UTC

출처는 조정자가 전달한 **별도 허용된 CUA 작업자의 실제 관측 요약**이다. 이 저장소 실행기가 공개 URL에 다시 접근하거나 검수를 재실행한 결과가 아니다. 조정자는 운영 소스 `e7b50d5043149cbecbdfedb2760ff49fc1ecedc4` / 배포 `dpl_34sbWPaRDYuu3ex89SgSacFcf6xS`의 READY·대표 alias 일치도 직접 재확인했다.

- [대표 도메인](https://soccer-note-hazel.vercel.app/)에서 온보딩3패널의 Next/Previous 이동, `/login` 렌더, 브라우저 뒤로가기의 온보딩 복귀를 관측했다.
- 1180×757 데스크톱 viewport에서 가로 넘침이나 화면 깨짐을 관측하지 않았다.
- 샘플 콘솔에는 확장프로그램 오류만 있었고 앱 출처 오류는 관측되지 않았다. 전체 오류 부재나 모든 경로의 정상 동작을 증명하지 않는다.
- 로그인·입력·제출·운영 쓰기는 모두0이다. 모바일·실제 인증 뒤 경기 목록/조회 실패·재시도는 라이브 미검증이며, 앞선 **합성21개 검증**과 구분한다.

이 후속은 문서 기록만 추가한다. 제품 코드·운영 배포·PR 승인/병합·Notion은 변경하지 않으며, 기존 CONNECT403이나 다른 거절 경로를 재시도하지 않는다.
