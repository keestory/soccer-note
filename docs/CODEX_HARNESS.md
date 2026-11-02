# Soccer Note Codex Harness

Soccer Note의 기본 에이전트 시스템은 Codex 네이티브 멀티에이전트 설정을 사용한다. 라우팅의 핵심은 **기본 호출 0개, 조건이 맞을 때만 전문 에이전트 추가**다.

## 실행

저장소 루트에서 Codex를 시작한다.

```bash
codex
```

비대화형 작업과 독립 리뷰는 다음처럼 실행한다.

```bash
codex exec -C . "AGENTS.md의 조건부 라우팅으로 로그인 오류를 진단하고 수정해줘"
codex -C . review --uncommitted
```

Codex는 `AGENTS.md`, `.codex/config.toml`, `.codex/agents/*.toml`을 읽는다. CLI에서는 `/agent`로 실행 중인 에이전트 스레드를 확인한다.

## 모델 정책

- `gpt-5.6-luna`: 문서 정비처럼 빠르고 반복적인 좁은 작업
- `gpt-5.6-terra`: 제품 정의, 시장·사업·마케팅, 일반 리뷰, QA, 운영
- `gpt-5.6-sol`: 전략, 복잡한 구현·계획, 보안처럼 깊은 추론이 필요한 작업
- `gpt-6-astra`: UI/UX 설계 판단은 high, 비가역 출시나 전문가 충돌 에스컬레이션은 xhigh

각 커스텀 역할의 모델은 TOML에 고정한다. 저장소 탐색과 명확한 소규모 위임은 Codex 내장 `explorer`와 `worker`를 필요할 때만 사용한다.

## 신규 서비스의 표준 경로

```text
Research
  → Business Planning + Strategy
  → Product Gate
  → UX/UI Design System + Tech Architecture + Discoverability + Store impact + Measurement
  → Build-ready Gate
  → Coding → QA → Fix → Re-QA
  → Independent Review
  → Release Readiness
  → Staged Release → Live Verification → Learn
```

이 경로는 단순 waterfall이 아니다.

- Business Planning과 Strategy는 같은 시장 근거를 받아 병렬 검토한다.
- UX/UI와 Tech Architecture는 승인된 product brief를 기준으로 병렬 진행한다.
- GTM은 Product Gate 직후 초안을 시작하고, review된 실제 제품을 기준으로 최종화한다.
- QA 또는 review가 실패하면 한 명의 `engineer`에게 돌아가며, 수정 후 영향 범위 QA와 필요한 re-review를 수행한다.
- Release는 배포 버튼이 아니라 버전·대상·롤백·모니터링·live smoke까지 포함한다.
- 출시 후 `analyst`가 합의된 관측 기간과 기준으로 iterate/hold/expand/pause/rollback 판단을 만든다.
- 신규 제품·중요한 사용자 여정은 `market_researcher`의 현재 차트 근거 뒤 `competitive_pattern_researcher`가 제품·UX·디자인 패턴을 비교한다. 순위는 성공 증명이 아니며 결과는 `Adopt / Adapt / Avoid / Test`로 분류한다.
- 모든 작업은 discoverability, store compliance, competitive benchmark 적용 여부를 먼저 판정하지만 영향이 없는 S0·내부 변경에는 전문 에이전트를 호출하지 않는다.
- 공개 검색·콘텐츠·딥링크 영향이 있으면 `discoverability`, 모바일 스토어 정책 영향이 있으면 `store_compliance`를 Solution과 Release 게이트에 추가한다.

`architect`는 기술 경계·계약·ADR을, `planner`는 승인된 설계를 구현 순서와 vertical slice로 바꾸는 일을 맡는다. 둘은 책임이 다르며 복잡한 작업에서만 함께 호출한다. `gtm_lead`는 marketing·business development·analytics·ops 입력을 하나의 launch plan으로 통합한다.

## 호출 예시

단순 수정은 하위 에이전트를 요구하지 않는다.

```text
이 문구 오류는 S0으로 처리해줘. 메인 에이전트가 직접 최소 수정하고 관련 검증만 실행해줘.
```

여러 계층 기능도 필요한 역할만 선택한다.

```text
이 기능은 요구사항이 모호하고 UI와 API가 함께 바뀐다.
product_manager와 ui_ux의 읽기 전용 검토를 병렬로 받은 뒤 결과를 통합하고,
planner가 필요하다고 판단될 때만 계획을 추가해줘. engineer 한 명이 구현한 뒤 qa가 검증해줘.
```

신규 서비스는 최신 시장 근거가 먼저지만 모든 사업 역할을 자동 호출하지 않는다.

```text
한국 앱스토어 비즈니스 카테고리의 2026년 현재 시장을 먼저 조사해줘.
이번 결정에 필요한 strategy와 marketing만 병렬로 검토하고, 수익화·제휴 질문이 있을 때만
business_development를 추가해줘. architect와 ui_ux는 필요한 경우 병렬로 검토하고,
gtm_lead는 Product Gate 이후 launch plan을 시작해줘. 구현 후에는 위험 기준에 따라 reviewer/security/ops를 선택해줘.
```

공개 웹·앱과 모바일 제출이 함께 있는 제품은 다음처럼 요청한다.

```text
현재 한국 앱스토어 차트와 직접·인접 제품을 조사하고 competitive_pattern_researcher가
제품/온보딩/신뢰/수익화/리텐션/디자인 패턴을 비교해줘. 그대로 복제하지 말고
Adopt/Adapt/Avoid/Test로 분류해줘. discoverability가 SEO/AEO/GEO와 Universal/App Links
계약을 만들고, store_compliance가 Apple/Google requirement matrix를 만든 뒤 구현에 반영해줘.
QA 후 실제 렌더링과 제출할 IPA/AAB·현재 콘솔 상태까지 각각 재검증해줘.
```

상세 기준은 [`DISCOVERABILITY.md`](./DISCOVERABILITY.md),
네이버가 범위에 있으면 [`NAVER_DISCOVERABILITY.md`](./NAVER_DISCOVERABILITY.md),
[`STORE_COMPLIANCE.md`](./STORE_COMPLIANCE.md),
[`COMPETITIVE_RESEARCH.md`](./COMPETITIVE_RESEARCH.md)를 따른다.

## 호출하지 않는 기본값

- 문구·주석·명확한 설정 변경: PM, planner, QA, reviewer 생략 가능
- 이미 위치가 확인된 코드: `explorer` 생략
- 낮은 위험의 국소 변경: `reviewer` 생략
- 보안 경계가 없는 변경: `security_reviewer` 생략
- 실제 배포가 없는 로컬 구현: `ops` 생략
- 일반 작업: `release_council` 금지
- 내부 변경: 적용 판정은 남기되 `discoverability`, `store_compliance`, `competitive_pattern_researcher` 자동 호출 금지

상세 조건과 작업 등급은 루트 `AGENTS.md`를 따른다.

## 마이그레이션 경계

기존 Python 오케스트레이터는 `claude -p --agent` 호출을 전제로 한다. Codex 커스텀 에이전트는 부모 Codex 세션이 생성하는 설정 레이어이므로 가상의 `codex --agent` 명령으로 치환하지 않는다.

현재는 Codex 네이티브 설정이 기본이며 기존 Claude 실행 코드는 참고·호환용이다. Python 외부 오케스트레이션까지 바꾸려면 별도 단계에서 Codex App Server 또는 SDK 어댑터와 실행 동등성 테스트를 추가한다.

## 검증

### 토론 기록 계약

2026-11-02 이번 별칭 지정 이후의 신규 협업부터 다음 표시명을 사용한다. 같은 날 이전 발언에도 소급하지 않는다. 실제 축구선수의 참여·견해·보증을 뜻하지 않는 역할 별칭이다. 내부 에이전트 ID, 모델, sandbox, 호출 조건, 독립 검토 책임은 바꾸지 않는다.

| 표시명 | 책임 | 연결할 기존 역할 |
| --- | --- | --- |
| CEO 메시 | 사업·최종 판단 | 메인 통합 담당, `strategy`, `business_development` |
| CPO 모드리치 | 제품 기획 | `product_manager`, `planner`, `market_researcher` |
| CTO 데브라이너 | 개발 | `architect`, `engineer`, `ops` |
| CDO 네이마르 | 디자인 | `ui_ux`, `competitive_pattern_researcher` |
| CMO 손흥민 | 마케팅 | `marketing`, `gtm_lead`, `discoverability` |
| CDAO 로드리 | 데이터 | `analyst` |
| CQO 반다이크 | QA·독립 품질 검토 | `qa`, `reviewer`, `store_compliance` |
| CISO 말디니 | 보안 | `security_reviewer` |

- 표시는 `별칭 [실제 역할 / 작업명]`으로 작성한다. 같은 별칭의 다른 작업자는 별도 발화자이며, 메인의 최종 결정과 사업 담당의 제안을 구분한다. `release_council`의 개별 의견은 실제 참여 역할로 기록하고 최종 통합만 CEO로 표시한다. `doc_gardener`는 기록 담당으로 구분하며 다른 사람의 의견을 자기 발언으로 만들지 않는다. 탐색/보조 역할은 맡긴 기능의 별칭과 실제 역할을 함께 밝힌다.

[AGENT_DISCUSSIONS.md](./AGENT_DISCUSSIONS.md)는 실제 협업 메시지의 공개 가능한 요약과 출처 기반 과거 결정 요약을 구분한다. 제품·QA 상세는 기존 문서를 링크해 중복 전사를 줄인다.

한 논점의 기록은 다음 정보를 포함한다. 아래는 입력 형식이며 실제 대화 예시가 아니다.

```text
항목 ID / 논점 / 종류: 관측 메시지 요약 또는 문서 기반 과거 결정 요약
시각: 확인 가능한 정밀도와 시간대; 발언·관측·기록 시각을 각각 구분
발화자: 별칭 [실제 역할 / 작업명]; 과거 요약은 출처에 확인된 당시 역할만 사용
제안·반론: 관측된 내용만 요약; 없는 항목은 없음/미관측
근거: 메시지/산출물의 종류, 문서 링크·절, 기준 커밋 또는 변경 범위
결정: 결정자, 채택/보류/기각과 짧은 공개 사유; 결정 전이면 미정
남은 이견·불확실성: 해결 여부와 검증 필요 내용; 침묵을 동의로 계산하지 않음
다음 행동: 담당, 구체적 산출물, 상태, 필요한 승인/접근의 보유 여부
기록자·기록 시각: 발화자와 분리; 정정 시 원 항목 ID·새 근거를 함께 남김
```

발언 시각은 메시지 메타데이터로 확인할 때만 기록하고, 없으면 미상으로 둔다. 관측·기록 시각으로 대체하지 않는다. 서로 다른 메시지를 한 논점으로 묶어도 각 발화자와 확인 가능한 관측 시각을 구분한다. 실제 반론이 없으면 만들어 채우지 않는다. 과거 문서의 익명 반론은 문서의 검토 요약으로만 남기며 대화 인용으로 바꾸지 않는다. 같은 역할을 메인이 겸해도 별도 에이전트 참여로 세지 않는다. 채택한 결론과 합의는 다르므로 참여자가 확인한 범위만 기록한다.

게시 전 기록 담당은 공개 가능한 결과만 남기고 숨겨진 추론·시스템 지침·자격 증명·사용자 원문 및 사용자/계정/세션 식별자를 제외한다. 비공개 스레드 ID와 토큰이 포함된 링크도 제외하되 공개 가능한 작업명·커밋·PR 번호는 추적 근거로 유지한다. 비공개 메시지를 누구나 열 수 있는 출처처럼 표현하지 말고, 메시지 종류와 관측 경로를 밝힌 뒤 공개 산출물을 연결한다. 원문 전체를 저장할 필요는 없다. 이 기록 계약이 권한 확대·지출·외부 마케팅·사업 전환의 실행 승인을 부여하지 않는다.

부모 작업에는 변경 커밋, 새 항목 ID, 남은 행동과 공개 기록 링크를 넘긴다. Notion 페이지와 자동화를 별도로 생성하지 않는다. 무료 서비스·클라우드 전용 제약을 유지하고 문서 변경만으로 운영 배포를 실행하지 않는다. 추가 구매·유료 전환을 하지 않으며 실제 비용은 확인된 범위만 보고한다. 무료 사용 제약 자체를 비용 0의 검증 결과로 표시하지 않는다.

### 기계 검증

새 클론에서는 먼저 테스트 환경을 만든다.

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
```

```bash
codex --version
codex --strict-config -C . doctor --summary --ascii
codex -C . debug prompt-input "라우팅 규칙과 조건부 에이전트를 요약해줘"
.venv/bin/python -m pytest -q tests/test_codex_harness_config.py
python3 run.py --lint
git diff --check
```

하네스만 바뀐 경우에도 위 검증을 모두 통과해야 한다. 제품 코드가 바뀌면 `npm test`와 `npm run build`를 추가한다. iOS/Android/Watch 변경은 웹 검증과 별개로 native artifact, signing, entitlement, simulator 또는 실기기 증거를 남긴다. 웹 배포, 네이티브 빌드, 스토어 제출, 승인과 공개 상태는 같은 완료 상태가 아니다.
