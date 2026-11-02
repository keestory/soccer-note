# Soccer Note 일일 지표 원천 인계

관측일: 2026-11-02. 노션 데이터셋·그래프·일일 자동화는 상위 작업의 데이터 담당자가 소유한다. 이 작업에서 자동화, 신규 추적 서비스, 자격 증명 또는 권한을 추가하지 않았다.

## 연결과 실제 관측 상태

| 항목 | 식별 / 상태 |
| --- | --- |
| GitHub | `keestory/soccer-note`, 기본 브랜치 `main` |
| Vercel | 프로젝트 `prj_8MtXlwcx0NzpWAZQjGUuFTL4HHAL`, 팀 `team_jr2EoWExoCNDX3AFRs9fZxKh`; 기존 연결로 프로젝트·배포 정보 읽기 가능 |
| 운영 웹 | `https://soccer-note-hazel.vercel.app` |
| Supabase | 최신 시스템 문서 및 2026-11-02 운영 공개 JS 번들에서 대조한 프로젝트 `qfbfkgbqmeqgwnbdphlm`; 공개 root HTTP 200 확인 |
| Supabase 관리 연결 | `get_project(qfbfkgbqmeqgwnbdphlm)` 요청이 MCP -32600 `You do not have permission to perform this action`으로 거부됨. 프로젝트 메타데이터·테이블·RLS·집계는 실서버에서 검증하지 못함 |
| 실제 유저/사업 수치 | 이번 작업에서는 읽지 않았음. 접근 불가를 0으로 바꾸면 안 됨 |

거부된 조회를 반복하거나 다른 계정/키로 우회하지 않았다. 아래는 저장소 소스에 근거한 집계 가능성으로, 실제 테이블 배포나 행 존재의 증거가 아니다.

## 원천과 가능한 집계

| 원천 | 시간 / 관계 | 가능한 신호 | 한계 |
| --- | --- | --- | --- |
| `auth.users`, `profiles` | `created_at`; 사용자 ID 연결 | 신규 가입 계정 수 | 기존 admin endpoint는 `listUsers()` 페이지를 순회하지 않아 그 배열 길이를 전체 사용자 수로 쓰면 안 됨 |
| `teams` | `created_at`, `user_id`, 제거 상태 | 생성 팀 수, 팀 기반 초기 활성화 | 생성만으로 실제 사용이라고 볼 수 없음 |
| `team_members` | `joined_at`, `status`, 제거 상태 | 승인된 소속 수 | 여러 팀 중복·탈퇴·상태 전환의 과거 이력 없음 |
| `players` | `created_at`, `team_id` | 등록 선수 수, 기록 준비 팀 수 | 실제 사용자 계정 수가 아니며 선수 개인정보 원문을 보고하지 않음 |
| `matches` → `quarters` → `quarter_records` | `match_date`는 DATE; 기록은 `created_at`, `updated_at` | 선수 기록이 있는 경기/팀, 기록 생성 활동일 | 최소 1개 선수 쿼터 행을 기준으로 함. 0골 기록도 유효함. 참석만 있는 경기는 제외. 상태/날짜 판단이 화면별로 달라 완료 경기라고 단정하지 않음 |
| `match_attendees` | 경기·선수 관계 | 참석 등록이 있는 경기 | 기록 완료/실제 출전 증거가 아님 |
| `training_sessions`, `training_attendees` | `training_date` DATE와 생성 시간 | 훈련 계획·참석 등록 수 | 실제 훈련 수행을 자동 입증하지 않음 |
| notifications / receipts | 생성·전달·읽음·확인 시각 | 알림 전달/확인 | 토큰별 행이 같은 사용자를 중복할 수 있음. 사용자율은 `(notification_id,user_id)` 중복 제거 및 분모 필요 |
| community posts/applications | 생성 및 상태 | 모집·신청 수 | 실제 경기 성사·매출과 다름 |
| Vercel 배포·런타임 | 배포 timestamp, 상태, 커밋 | 릴리스/빌드 실패, 서버 요청 오류 | 브라우저가 Supabase에 직접 저장하므로 전체 저장 시도·실패는 Vercel 로그에 잡히지 않음 |

코드 근거: `supabase/migrations/001_initial_schema.sql`, `002_team_members.sql`, `005_team_join_approval.sql`, `009_match_attendees.sql`, `013_training_sessions.sql`, `016_match_status.sql`, 알림 migration 012/018/020, community migration 021, `src/app/api/admin/data/route.ts`.

운동/건강 관련 migration 017의 원시 건강값은 사업 그래프에서 제외한다. 결제·매출·비용 원장, 분석 SDK 또는 저장 시도/실패 이벤트는 검토한 소스에서 찾지 못했다. Vercel/Supabase 과금 콘솔의 실제 비용은 별도 허용된 집계 원천이 확인되기 전까지 미확인이다. 매출·CAC·LTV·비용·전환율을 0으로 기록하지 않는다.

## 활성·반복 사용과 과거 집계

- **활성 팀 대리 지표:** 보고 기간에 선수 쿼터 기록을 새로 만든 팀 수. 현재 저장소만으로 실제 활동 사용자나 수정자의 신원을 추정하지 않는다.
- **핵심 가치 행동:** 최소 하나의 선수 쿼터 기록을 보유한 경기 수. 실제 경기 기록 완료와 동일한 정의가 아니다. 명시적인 완료 상태/필수 기록 기준이 정해지면 별도 지표로 버전 관리한다.
- **반복 사용 대리 지표:** 서로 다른 주/날짜의 기록 보유 경기가 반복되는 팀. 경기 날짜 기반 이용 패턴과 실제 입력일 기반 활동 패턴은 분리한다.
- **과거 일별 가능:** 남아 있는 행의 `created_at` 기준 신규 가입/팀/선수/기록 생성 수. 삭제된 행과 과거 변경 이력은 복원할 수 없다.
- **과거 일별 불가:** `updated_at`은 최신 수정만 남으므로 세션, DAU/WAU, 시도 수, 저장 실패율, 정확한 D1/D7 유지율을 복원할 수 없다.
- **릴리스 단절:** 종전 전체 저장은 기록을 삭제·재삽입했다. 이번 ID 보존 변경 이후 `quarter_records.created_at` 기반 생성 수의 의미가 달라지므로 전후 추이를 같은 정의로 비교하지 않는다.

## 내부·테스트 제외

`scripts/create-demo-account.ts`에는 데모 계정 선언이 있지만 검토한 스키마에는 일관된 `is_demo/is_test` 표시가 없다. 데모 사용자/팀의 영속 ID를 허용된 비공개 원천에서 확인한 뒤 exclusion 집합을 관리해야 한다. 보고서에 계정명/이메일을 싣거나 이름의 부분 일치로 실제 사용자를 제거하지 않는다. 로스터 seed 스크립트가 있다는 사실만으로 그 팀을 테스트로 판정하지 않는다. 실제 데모 행의 존재는 미검증이다.

`/design-system`, `/screenshots/*`는 가상 QA surface다. 트래픽 집계 원천이 있다면 해당 경로를 구분한다. 합성 테스트의 성공률이나 QA 접속을 사용자 성과로 계산하지 않는다.

## 노션 일일 데이터 계약 제안

`report_day`, `reporting_timezone`, `observed_at_utc`, `metric_key`, `definition_version`, `value(nullable)`, `numerator`, `denominator`, `source`, `exclusion_coverage`, `data_status`, `limitation`을 남긴다. 현재 전달된 사용자 시간대는 `Etc/UTC`이며, 실제 보고 시간대가 바뀌면 명시적으로 기록한다. `TIMESTAMPTZ` 집계 경계와 DATE 경기 일정을 섞지 않는다.

접근 거부는 `value=null`, `data_status=blocked`로 남기고 그래프를 0으로 연결하지 않는다. 표본이 작을 때는 절대 건수와 분모를 함께 표시하며 변화율·통계적 성과 주장을 피한다. 유효한 원천이 확보되면 먼저 신규 계정/팀, 기록 보유 경기/팀, 반복 기록 팀의 개수부터 누적한다.
