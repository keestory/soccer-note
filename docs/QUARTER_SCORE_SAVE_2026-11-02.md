# 쿼터 점수 저장 실패의 잘못된 성공 처리 수정

기록 시각: 2026-11-02 13:29:51 UTC. 담당: 클라우드 구현 담당. 출발 커밋: `1c9340e8ff40ffa61a6fb85f2d073a72a7a4239b`. 범위: 실제 hosted 경영 검토 뒤 기존 핵심 흐름에서 입증한 결함 **1건**. 이는 경영 역할의 추가 발언이나 독립 코드 리뷰가 아니다.

## 재현한 피해

`src/app/match/[id]/page.tsx`의 쿼터 점수 저장은 `quarters`를 갱신한 뒤 `matches`의 경기 합계를 갱신한다. 두 번째 요청의 오류를 읽지 않아, 합계 저장이 실패해도 성공 메시지를 표시하고 편집창을 닫았다. 화면에는 새 합계가 표시되지만 다시 불러온 경기 합계는 이전 값일 수 있다.

클라우드 로컬 브라우저에서 390×844 viewport, 가상 경기의 1:0을 3:2로 변경하고 두 번째 요청만 500으로 실패시켰다. 수정 전에는 편집창이 닫혔고 합성 저장소에는 쿼터 3:2 / 경기 합계 1:0이 남았다. [수정 전 보고서](design-qa/2026-11-02-quarter-score/before/browser-results.json), [수정 전 화면](design-qa/2026-11-02-quarter-score/before/false-success-390.png).

## 최소 변경

- 두 쓰기의 명시적 오류와 예외를 같은 오류 경로에서 처리한다.
- 오류가 있으면 입력과 편집창을 유지해 사용자가 같은 점수를 재시도할 수 있다.
- 두 요청이 오류 없이 끝난 뒤 쿼터·합계의 화면 상태를 함께 갱신하고 성공 메시지를 표시한다.
- 기존 8개 언어의 저장 실패 문구를 사용한다. 새 기능·AI·DB/RLS·권한·스키마·의존성 변경은 없다.

Intake: S1 국소 저장 오류 처리. discoverability/store_compliance/competitive_benchmark는 적용 제외: 기존 비공개 화면의 오류 경로만 바꾸며 공개 콘텐츠·수집 데이터·SDK·스토어 제출·제품 포지셔닝은 바꾸지 않는다.

## 검증

- `npm test`: **138 tests / 19 files 통과**.
- TypeScript 검사 및 Webpack production build 통과, 47개 route 생성.
- `npm run lint`: **오류 0 / 기존 경고 49**, `git diff --check` 통과.
- 기존 테스트용 Fontsource mirror와 가짜 Supabase 설정으로 cloud-local production build를 실행했다. 새 서버는 3128 포트로 띄워 기존 QA 서버를 중단하지 않았다. 제품 폰트·호스팅 설정은 그대로다.
- 수정 후 브라우저 **3/3**: 쿼터 쓰기 실패, 합계 쓰기 실패, 합계가 저장된 뒤 응답 유실. 모두 입력 유지 → 같은 저장 재시도 → 다시 열기에서 합성 저장소의 3:2를 확인했다. 페이지 오류·예상 밖 요청·정리 경고는 0개이며 콘솔 오류 3개는 의도적으로 주입한 네트워크 실패다.

[수정 후 보고서](design-qa/2026-11-02-quarter-score/after/browser-results.json), [실패 후 입력 유지](design-qa/2026-11-02-quarter-score/after/failed-retry-390.png), [재시도 후 다시 열기](design-qa/2026-11-02-quarter-score/after/reopened-390.png). 재현 스크립트는 [qa-quarter-score.mjs](../scripts/qa-quarter-score.mjs)이며 기존 합성 fixture를 재사용한다. 수정 전 재현은 `--expect-defect`, 수정 후 검증은 해당 옵션 없이 실행한다.

## 실제 증거와 제한

브라우저는 실제 제품 코드를 실행하지만 인증·API·저장은 모두 메모리의 가상 데이터다. 실제 참여자 활성화·유지율·사용자 만족·운영 데이터 영속성·RLS 검증은 아니다. hosted 경영 토론은 실제였으며 [별도 provenance 기록](EXECUTIVE_AGENT_ROLLOUT.md)으로 구분한다. CLI는 재시도하지 않았다.

두 쓰기는 트랜잭션이 아니므로 실패 전에 첫 쓰기가 반영될 수 있다. 이 변경은 명시적인 API/네트워크 실패를 성공으로 숨기지 않는 수정이며, 서버의 0행 갱신 확인·다른 기기와의 동시 수정·전체 원자성을 보장하지 않는다. 실제 DB·OAuth·물리 기기는 미검증이다. UI를 확장하거나 다른 결함을 추가로 고치지 않고 이 한 건에서 조사 범위를 종료한다. 이번 변경은 기존 초안 PR에 게시하며 **운영 배포·PR 승인·병합은 하지 않는다**.
