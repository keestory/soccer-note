# 새 경기의 현지 날짜 기본값

상태: 구현 완료, 최종 검증·배포 대기. [작업 카드](https://app.notion.com/p/40f66b33db7a81698851ca52dc557c1f), [실제 다섯 역할 협의](AGENT_DISCUSSIONS.md#2026-11-05-실제-5역할-협의--날짜와-저장-안내), [수정 전 재현](design-qa/2026-11-05-match-date-reproduction/README.md).

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

최종 소스 SHA의 lint/type/test/build·독립 CQO 코드 리뷰, 시간대·월/연/윤일 경계·수동 선택·모바일·키보드·반복 클릭·실패 재시도·쓰기 전 뒤로가기·기존 생성 흐름을 검증한 뒤 결과를 추가한다. 정상적인 이전 deployment 재배포(`withLatestCommit=false`)는 복귀 계획이며 실제 전환은 시험하지 않는다.
