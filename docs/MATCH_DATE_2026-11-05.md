# 새 경기의 현지 날짜 기본값

상태: 2026-11-05 02:16 UTC 운영 배포 완료. 합성 QA와 운영 메타데이터 검증을 구분하며, 공개 UI는 기존 연결 제한으로 미검증이다. [작업 카드](https://app.notion.com/p/40f66b33db7a81698851ca52dc557c1f), [실제 다섯 역할 협의](AGENT_DISCUSSIONS.md#2026-11-05-실제-5역할-협의--날짜와-저장-안내), [수정 전 재현](design-qa/2026-11-05-match-date-reproduction/README.md).

## 문제와 작은 수정

새 경기 입력의 기본 날짜는 UTC 문자열을 사용했다. 실제 합성 브라우저에서 KST 11월5일00:30에는 11월4일, LA 11월4일17:30에는 11월5일을 표시했다. UTC·일반 시간 네 대조군은 일치했고 수동 선택은 여섯 조건 모두 유지됐다. 피해 빈도·실사용 성과는 미확인이다.

기존 `match-date`가 경기 목록에서 사용하는 현지 달력 날짜 표현을 `localMatchDate`로 추출해 새 경기의 초기값에 재사용한다. 초기화는 한 번만 하므로 다른 입력이나 재렌더가 사용자의 날짜를 덮지 않는다. 목록의 분류 표현·timestamp 비교·기존 날짜 데이터·서버 저장 계약·권한은 바꾸지 않는다. 팀/경기장 시간대 정책, 훈련/커뮤니티 날짜, 상대·장소 재사용 기능도 이번 범위가 아니다.

S1의 상대·장소 재사용은 기존 경기 상세에서 시작할 때 이동 한 단계를 줄일 수 있지만, 홈/목록에서는 이전 경기 선택이 추가된다. 이 소스 비교는 실제 시간 절약·수요 증거가 아니며 조정자가 이번에는 보류했다. S2는 날짜식 계산뿐 아니라 실제 입력 UI에서 재현되어 작은 수정으로 선택됐다.

작업 등급 S1. discoverability/store_compliance/competitive_benchmark는 적용 제외: 기존 인증 입력의 날짜 초기화만 바꾸고 공개 경로·SDK·권한·시장 판단을 추가하지 않는다. 모바일 웹과 기존 생성 흐름은 별도 합성 QA 대상이며 실기기/스토어 검증으로 확대하지 않는다.

## 기준·검증 경계

- 기준 remote/HEAD `54e18d11571b7b0b77e32fee61061e546d90d443`, [기존 draft PR #62](https://github.com/keestory/soccer-note/pull/62). 실제 토론 문서와 재현 파일의 미커밋 작업만 있었고 이를 보존했다.
- 기준 운영/복귀 소스 `41a4958e8cb46319ed168534edaa999b7fce3cf4`, 배포 `dpl_B2QxxnmFRfSsdsbBoSmfYzzVzdha`, [대표 alias](https://soccer-note-hazel.vercel.app) 일치를 다시 확인했다.
- 현재 Hobby를 지원된 읽기로 확인했다. [Hobby 일반 한도](https://vercel.com/docs/plans/hobby)와 [Functions 포함량 정책](https://vercel.com/docs/functions/usage-and-pricing)의 초과 사용 제한을 월 잔량 불명과 구분한다. 유료 옵션·새 서비스·자격증명·권한·DB/RLS 변경은 없다. 월 잔량·총청구액·호스트 네이티브 모델 청구는 미확인이다.
- 기존 설치된 브라우저와 캐시 빌드의 Noto Sans KR/Bebas Neue CSS·746 WOFF2 파일을 임시 테스트 응답으로 재사용한다. 새 의존성 설치나 호스팅 폰트 설정 변경이 없으며, 합성 환경변수/빌드는 운영에 업로드하지 않는다.
- 저장소 모델 CLI와 기존 거절된 billing/rollbackCandidate/DB/workflow 경로는 재시도하지 않는다. 실제 호스트 협의와 저장소 실행 가드 성공은 다르다.

아래 최종 소스 SHA의 lint/type/test/build·독립 CQO 코드 리뷰와 시간대·월/연/윤일 경계·수동 선택·모바일·키보드·반복 클릭·실패 재시도·쓰기 전 뒤로가기·기존 생성 흐름 검증을 완료했다. 정상적인 이전 deployment 재배포(`withLatestCommit=false`)는 복귀 계획이며 실제 전환은 시험하지 않는다.

## 최종 소스와 독립 리뷰

제품 소스 `90398f1822cddc665d3d18f26d7fc12cc46229c2`의 제품 diff는 `src/lib/match-date.ts`와 `src/app/match/new/page.tsx` 두 파일이다. 기존 예정 판정의 로컬 날짜 표현을 그대로 추출했고 네 개 단위 경계 사례를 추가했다. **테스트 163개/20파일**, TypeScript, 프로덕션 빌드, lint **오류0/기존경고49**, diff-check를 통과했다. 로컬 빌드 ID는 `RhpQn8IX3tuCX7iF2qVF6`이다.

독립 CQO 반다이크는 동일 SHA/제품·단위테스트 blob을 확인하고 새로 도입된 차단 문제를 발견하지 못했다. 수동 선택을 덮는 effect를 추가하지 않았으며 생성 payload·권한·기존 기록은 불변이다. 서버와 브라우저 날짜가 다른 직접 진입의 hydration은 실제 브라우저 QA로 확인하도록 요청했다. 이 리뷰를 브라우저나 운영 저장 성공으로 대신하지 않는다.

## 최종 합성 브라우저 결과

동일 제품 SHA/빌드에서 독립 CQO QA **18/18**이 첫 acceptance 실행에 통과했다. KST/LA/UTC 경계·대조군, 월/연/윤일 경계, 수동 날짜 선택 후 다른 필드 편집/+24시간/재렌더, 직접 진입, 정상 생성, 실제 더블 클릭/대기 중 비활성화, 확정된 저장 전 실패 후 입력 유지·재시도, 전송 전 닫기/뒤로가기, 320/390px 라벨·키보드·레이아웃을 확인했다. [전체 결과와 전후 화면](design-qa/2026-11-05-match-date/README.md), [검증 매니페스트](design-qa/2026-11-05-match-date/verification.json)에 정확한 사례가 있다.

합성 POST는 총5회이며 가상 저장4회·의도한 저장 전500실패1회다. 운영 DB 요청은 없었다. 예상한500 외 콘솔 오류·페이지 오류·예상 밖 요청·정리 실패는0이다. 직접 문서 진입 후 준비된 hydrated input은 서버 날짜와 다른 브라우저의 현지 날짜를 표시했으며, 최초 SSR HTML/첫 페인트는 별도 캡처하지 않았다. 응답 유실 뒤 재시도 멱등성이나 무중복 보장을 검증한 것은 아니다.

실제 계산된 입력 글꼴16px·높이44px와 모바일 가로 넘침 없음을 확인했다. 기존 뒤로가기 링크의 접근 가능한 이름 부재·36×36px는 이번 날짜 diff가 만들지 않은 후속 과제로 보존한다. 물리 기기·스크린리더·전체 접근성 준수나 실제 사용자 성과로 확대하지 않는다. 구현/QA 중 추가 제품 수정은 없었고, 독립 리뷰가 요청한 직접 진입 경계는 위 두 사례로 확인했다.

## 운영 배포와 복귀

- 제품 커밋 **`90398f1822cddc665d3d18f26d7fc12cc46229c2`**을 기존 `codex/quarter-save-reliability` 원격에 push한 뒤, 연결된 GitHub 소스의 정확한 SHA를 기존 Vercel 프로젝트에 일반 production 배포했다. 로컬 합성 빌드나 테스트 환경변수를 업로드하지 않았다.
- 배포 **`dpl_6rHZ5swbN8un8GuPp5nBsBYFRkSe`**, **2026-11-05 02:16:28 UTC READY/production**. [고유 배포](https://soccer-note-4xgcprxa3-keestory91-6294s-projects.vercel.app)와 [대표 서비스](https://soccer-note-hazel.vercel.app)의 alias가 동일 배포를 가리키며 Git metadata의 정확한 SHA와 GitHub Vercel success를 읽기 확인했다. [정제된 배포 근거](design-qa/2026-11-05-match-date/production-deployment.json).
- [PR #62](https://github.com/keestory/soccer-note/pull/62)는 main 대상 open/draft, 승인·병합 없음이다. 기존 거절된 PR 본문 수정은 재시도하지 않았다. 후속 문서·QA 커밋은 제품 diff 없이 검증 기록만 추가하며 운영에 재배포하지 않는다.
- 신규 배포의 production error/fatal 로그를 level로 묶어 최근10분 읽기 조회했을 때 반환된 그룹은 없었다. 트래픽 존재·모든 오류 부재·운영 저장 성공의 증거는 아니다. 공개 화면은 기존 CONNECT403 접근 제한에 새 근거가 없어 **미실행**이며 재시도·우회하지 않았다. 이번 운영 검증은 READY/SHA/alias/CI/그룹 로그 범위다.
- 복귀 소스는 **`41a4958e8cb46319ed168534edaa999b7fce3cf4`**, 기존 READY 배포 **`dpl_B2QxxnmFRfSsdsbBoSmfYzzVzdha`**, [이전 고유 URL](https://soccer-note-9qxbfl09j-keestory91-6294s-projects.vercel.app)이다. 일반 [deployment API](https://vercel.com/docs/rest-api/sdk/deployments/create-a-new-deployment)에서 해당 `deploymentId`, `target=production`, `withLatestCommit=false`로 재배포하는 지원 경로를 확인했다. 실행 시 이전 SHA/READY/대표 alias를 다시 검증해야 한다. **실제 복귀 전환은 수행하지 않았고**, 특수 rollbackCandidate 접근 거절은 그대로 유지했다.

현재 Hobby의 일반 배포/Functions 초과 사용 제한 정책 안에서 유료 옵션·업그레이드·새 계정이나 API 없이 배포했고 이번 실행에서 한도 오류는 없었다. 이는 월 잔량 충분·총비용0·향후 무제한 가용성의 증거가 아니다. 기존 저장소 모델 CLI, DB/RLS·보안·권한·스키마·운영 데이터·과거 경기 날짜는 변경하지 않았다. 신규 사용자 실험·대외 발신·실기기 검증은 미실행이다.
