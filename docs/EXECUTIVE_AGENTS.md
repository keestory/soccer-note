# 공통 경영 에이전트 계약

관측일: 2026-11-02. 적용 대상: `kee_agent`, `wetheone`, `soccer-note`. 각 저장소의 제품·개인정보·승인 경계는 해당 AGENTS.md와 협업 문서를 우선 확인한다. 축구선수 이름은 역할 별칭이며 실제 선수의 참여·견해·보증이 아니다. 과거 발언에 소급하지 않는다.

## 정의와 의사결정 경계

실제 재사용 파일의 단일 ID는 다음과 같다. 기존 `strategy`를 CSO로 보강하고 기존 `marketing`을 CMO로 보강한다. `cso`·`cmo` 같은 중복 ID를 추가하지 않는다. CFO·CGO·CAIO는 새 파일이다. WeTheOne에는 해당 기존 Codex 파일이 없어 이 다섯 정의만 새로 도입하며 기존 Claude 역할 11개를 삭제하거나 다른 모델로 바꾸지 않는다.

| 표시명 / ID | 책임과 필수 산출물 | 다른 책임자와의 경계 |
| --- | --- | --- |
| CSO 크루이프 / `strategy` | 사업모델 대안, 기회비용, 성공·중단 기준 | CEO는 승인 범위의 최종 판단, CPO는 로드맵, business_development는 제휴 제안 |
| CFO 크로스 / `finance` | 단위경제, 비용 가정, 무료 한도, 비용 veto; 산술은 코드/시트 재계산 | CDAO는 데이터 품질; CEO나 내부 합의도 무료 전용 제약을 무효화하지 못함 |
| CMO 사비 / `marketing` | 브랜드, 근거 있는 메시지, 유기적 획득 채널 | CGO는 퍼널 실험, gtm_lead는 출시 입력 통합; 외부 게시·광고 실행 권한 없음 |
| CGO 음바페 / `growth` | 활성화·유지·추천 실험, 분모·관측 기간·중단 기준 | CDAO는 측정 검증, CPO는 우선순위, CMO는 공개 주장 검토 |
| CAIO 이니에스타 / `ai_lead` | 모델·평가셋·라우팅·AI 품질, AI 없는 기준선 | CTO는 구현, CISO는 보안·개인정보, CFO는 비용 veto |

기존 CEO 메시·CPO 모드리치·CTO 데브라이너·CDO 네이마르·CDAO 로드리·CQO 반다이크·CISO 말디니와 CMO 사비을 보존한다. 새 전문 역할은 CEO/CPO/CTO/CDAO/CISO의 결정을 대신하지 않는다. 직함은 권한 상승이나 독립적인 참여자의 증거가 아니다.

## 모델 선호와 실행 상태

아래는 공식 모델 설명을 참고한 **설계 선호값**이며 실제 벤치마크 우월성·무료 사용 가능성 보장이 아니다. 선호값의 단일 원본은 `agent_governance/roles.toml`이다. 역할 TOML에는 `model`을 고정하지 않아 실제 실행 후보는 `inherit`다. 하지만 상속도 비용 증거가 아니다.

| 역할 | 권장 LLM / effort | 선정 이유 |
| --- | --- | --- |
| CSO | `gpt-6.1-sol` / high | 사업 대안·상충 근거의 복합 판단 |
| CFO | `gpt-6.1-sol` / high | 단위경제 가정·비용 위험 검토; 숫자는 별도 재계산 |
| CMO | `gpt-6.1-terra` / medium | 메시지·시각 자료·문장 검토 |
| CGO | `gpt-6.1-sol` / medium | 퍼널 실험과 중단 기준 설계 |
| CAIO | `gpt-6.1-sol` / high | 평가·모델 라우팅·실패 복구 설계 |

가벼운 출처 요약 대체 후보는 `gpt-6-luna` / low다. 최종 재무·전략·AI 품질 판단을 저가 요약으로 대체하지 않는다. 대체 모델도 비용 검증 전 자동 호출하지 않으며 이 구현에는 자동 fallback 경로가 없다. 추천 모델을 사용할 수 없으면 확인된 현재 모델의 한계를 기록하거나 중단한다.

공식 근거:

- [모델 설명](https://learn.chatgpt.com/docs/models): Sol은 복합 작업, Terra는 글쓰기·시각 작업, Luna는 집중된 반복 작업에 대한 후보이며 CLI 모델 ID가 안내돼 있다. 실제 계정별 가용성은 별도다.
- [Codex 요금](https://chatgpt.com/codex/pricing/), [포함 사용량·크레딧](https://learn.chatgpt.com/docs/pricing): 플랜 포함 사용량과 초과 사용 크레딧을 구분한다. Free 안내가 특정 클라우드 모델의 무제한 무료 사용을 보장하지 않는다.
- [API 요금](https://developers.openai.com/api/docs/pricing): 위 권장 모델은 유료 API 요금표에도 존재한다. API 키 사용을 구독 포함 사용량으로 취급하지 않는다.
- [구독 API 크레딧](https://developers.openai.com/api/docs/guides/chatgpt-api-credits): 자격·연동·잔액 확인이 필요한 별도 혜택이다. 이번 작업에서 새 계정 연동·키·OAuth 권한·결제·크레딧 구매를 만들지 않는다.
- [모델 선택 지침](https://developers.openai.com/api/docs/guides/model-selection): 실제 작업 평가로 품질·비용을 비교해야 하며 역할 이름만으로 최적 모델을 증명하지 않는다.

실행 환경 근거: 현재 클라우드 CLI는 0.163.0이며 세션의 사용 가능 모델 목록에는 위 네 모델이 있다. 이는 호출 가능성 정보일 뿐 잔액·추가 과금 차단 증거가 아니다. 읽기 전용 CLI 진단은 네트워크/파일시스템 제약이 있었고, `app-server`의 계정·한도 읽기를 위한 초기화는 응답 전에 종료됐다. 후속 확인에서는 프로젝트 미신뢰로 프로젝트 설정·hooks·exec policy가 로드되지 않는다는 안내와 `Read-only file system (os error 30)`을 확인했다. `doctor`의 config loaded를 프로젝트별 역할/비용 설정의 실제 적용 증거로 확대하지 않는다. 임시 SQLite 상태 경로만 사용한 진단도 초기화에 실패했으며 전역 trust·인증·네트워크 권한은 바꾸지 않았다. 실제 계정 entitlement·포함 잔액·과금 방지 강제 여부는 **unknown**이다. 새 역할의 실제 모델 호출은 **미실행**, actual model은 **unknown**, 기본 상태는 **blocked**다. 모델 접근을 입증하려는 유료 시험 호출도 하지 않았다.

후속 관측 (2026-11-02 13:15–13:18 UTC): 부모의 native hosted-agent 도구에서 다섯 별도 역할의 실제 제안·반론이 실행됐다는 결과를 전달받았다. [hosted-native-assistant-review 기록](EXECUTIVE_AGENT_ROLLOUT.md)을 따른다. 앞의 CLI 미실행 상태·비용 가드는 유지하며, hosted 검토의 실제 모델과 과금 0원은 확인하지 못했다.

## 비용 차단과 실행 경로

1. `.codex/config.toml`은 native 자동 하위 에이전트 실행을 `enabled=false`로 선언한다. 이는 파일의 선언이며 실제 CLI 적용 증거가 아니다. 현재 클라우드 CLI는 프로젝트를 신뢰된 경로로 인식하지 않아 이 설정을 로드하지 못했다. 신뢰 설정을 변경하지 않으며 native 실행은 미검증/blocked로 유지한다. 기존 개별 모델 설정은 보존한다. Python 진입점의 비용 차단은 이 native 설정과 별도로 검증한다.
2. `run.py --council-plan`과 `python3 -m agent_governance`는 오프라인으로 주제별 역할을 로드한다. 이 명령은 LLM·API·Claude 프로세스를 호출하지 않는다. 기존 `run.py`의 모델 실행 진입은 기본 차단하며 lint와 오프라인 계획은 사용할 수 있다.
3. `agent_governance.discussion.run_discussion`에는 실제 제안/반론 라운드와 비용 검사가 연결돼 있다. 계정·한도·모델 목록을 읽는 native metadata adapter는 구현했지만 실운영 **추론** host adapter는 아직 연결하지 않았다. `--preflight`는 실행기 시작 오류와 비용 증거 미확인을 구분하고, blocked이면 종료 코드 2를 반환한다. 성공한 계정 읽기도 실행 권한으로 바꾸지 않는다. 추론 adapter가 없으면 참여 예정 역할과 blocked 이유만 반환하고 대화 이벤트는 만들지 않는다.
4. 향후 신뢰된 host adapter는 각 호출 직전에 계정 인증 종류, 실제 모델, 가용 모델, 검증 시각/만료, free 또는 subscription_included 한도, 남은 사용 가능 여부, **호출 도중에도 포함분만 사용하도록 강제하는 기능**, 유료 fallback·구매 크레딧 사용 금지, 클라우드 실행을 입증해야 한다. 사용자 JSON이나 저장소 플래그 하나를 entitlement로 신뢰하지 않는다.
5. 증거 없음·5분 초과·미래 시각·한도 소진·API 키·잔액 불명·모델 불명·유료 fallback 가능성은 호출 **전에 blocked**다. 포함분 소진을 자동 구매나 다른 계정/모델로 넘기지 않는다. 한도 수치만 읽고 호출 도중 과금 방지를 보장할 수 없다면 실행하지 않는다.
6. 실제 응답 모델도 확인한다. 응답 유실·모델 불명/변경은 **uncertain**, 자동 재시도 없음이다. 받은 검토가 누락되면 완료/합의로 표시하지 않는다.

신뢰된 adapter는 공급자 청구 정책을 실제로 강제해야 한다. Python 인터페이스 자체가 과금을 통제하거나 임의 호출자를 보안 격리하는 기능은 아니다. repository 밖에서 native/legacy CLI를 직접 실행하면 이 가드를 거치지 않으므로 현재 운영 경로로 허용하지 않는다. 계정/네트워크·권한을 확대해 이 제한을 해소하지 않는다.

## 주제별 필수 검토와 실제 토론

| 의사결정 주제 | 필수 새 책임자 | 기존 책임자와의 후속 연결 |
| --- | --- | --- |
| strategy | CSO, CMO | CEO 최종 판단, CPO 범위 |
| revenue | CSO, CFO, CGO | CDAO 실제 데이터, business_development 제휴 |
| acquisition | CFO, CMO, CGO | CPO 제품 약속, CISO 개인정보 |
| growth | CFO, CGO | CDAO 측정, CPO 우선순위, 메시지가 바뀌면 acquisition도 선택 |
| ai | CSO, CFO, CAIO | CTO 구현, CISO 보안, CDAO 평가 데이터 |

복합 사안은 해당 주제를 모두 선택한다. 모델·수익·획득·성장 체계 전체를 바꾸는 이번 범위는 다섯 주제를 선택해 다섯 역할을 모두 필수 대상으로 만든다. 단순 문구/버그에는 경영 회의를 강요하지 않는다. 알 수 없는 주제는 조용히 누락하지 않고 오류를 낸다.

실행 허용 시 각 역할의 제안 라운드 후 전체 제안을 전달하는 반론 라운드를 진행한다. 실제 응답만 이벤트로 남기고, 논거가 없는 반론은 만들지 않는다. CFO 등 검토자의 veto는 후속 호출을 멈춘다. 모든 검토 수신은 `awaiting_ceo_decision`이며 합의·사용자 승인·배포 성공이 아니다. CEO가 근거와 남은 이견을 명시하고 승인된 범위에서 판단한다. 사업 전환·외부 마케팅·DB/RLS/보안·과금의 기존 경계는 별개다.

기록에는 실제 역할/작업자, source commit, 출처, preferred/actual model, 관측 시각과 미상인 발언 시각, 제안·반론·미해결·다음 행동을 분리한다. adapter 응답을 그대로 공개 게시하지 않는다. 기록 담당이 숨겨진 추론·시스템 지침·자격증명·사용자 원문/식별자·비공개 스레드 ID를 제외한 결과 요약을 남긴다. 같은 작업자가 여러 역할을 맡으면 다섯 독립 에이전트의 토론으로 표시하지 않는다. fixture 테스트를 실제 발언으로 옮기지 않는다.

## 실행과 검증

```sh
python3 run.py --council-plan strategy revenue acquisition growth ai
python3 -m agent_governance --topics ai
python3 -m agent_governance --preflight --topics strategy revenue acquisition growth ai
python3 -m unittest discover -s tests -p test_executive_contract.py -v
python3 -m unittest discover -s tests -p test_native_preflight.py -v
```

이 결과는 로더·주제 라우팅·비용 차단·프로토콜의 오프라인 검증이다. 실제 다섯 모델 호출이나 독립 전문가 검토의 완료가 아니다. synthetic host 테스트는 다섯 역할 × 제안/반론 2라운드, 호출 전 비용 차단, 중간 소진, veto, 응답 불확실성, 실제 모델 변경을 검증한다.

오프라인 계획과 달리 `--preflight`는 기존 클라우드 CLI의 읽기 전용 메타데이터 요청을 수행한다. LLM 호출·새 로그인·유료 API는 실행하지 않는다. [정확한 런타임 진단과 후속 조건](NATIVE_RUNTIME_PREFLIGHT.md)에 실제 관측과 fixture를 구분했다. 현재 재현된 원인은 클라우드 홈의 `installation_id` 쓰기 실패이며, trust 경고나 quota unknown과 같은 뜻이 아니다.

`kee_agent`가 공통 파일의 원본이며 `agent_governance/`, 다섯 역할 TOML, `tests/test_executive_contract.py`, `tests/test_native_preflight.py`, 이 계약과 런타임 진단 문서를 동기화한다. 제품 AGENTS·협업 기록·기존 테스트는 전체 덮어쓰기하지 않고 해당 진입점만 수정한다. 다른 담당자의 커밋과 DB 후보는 섞지 않는다. Notion·일일 실행 지침은 부모 작업이 기존 위치에서 동기화한다. 문서·하네스 변경을 위해 운영 웹을 재배포하지 않는다.
