# Soccer Note — 클라우드 팀 전환 개선

최종 상태(2026-11-02 05:07 UTC): 검증한 `b3b96fd29f778ef5b44084cb96e2130c93a8a30c`의 기존 운영 배포를 완료했다. Vercel Hobby 무료 플랜, READY, 공개 alias 연결을 확인했다. 공개 화면은 이 실행 환경의 proxy 403으로 미확인이고, 롤백 후보 조회는 권한 거부로 차단됐다. 아래 초기 배포 거부는 이후 해소된 이력이다.

## 범위와 기준

2026-11-02, `keestory/soccer-note`의 `codex/quarter-save-reliability`를 클라우드 `/workspace/soccer-note`에 별도로 clone했다. 기준 커밋은 `896562a2b33004840da9a8dbfd98d48223da8b14`, 기존 draft PR은 [#62](https://github.com/keestory/soccer-note/pull/62)다. Mac의 미커밋 패치는 전송되지 않았으며 이번 구현은 원격 코드와 요구사항으로 재구성한다. Mac이나 해당 executor에 연결하지 않았고 실행 환경 이름과 무관한 `ourcommunity` 저장소는 변경하지 않는다.

시작 시 Vercel의 [공개 alias](https://soccer-note-hazel.vercel.app)는 `dpl_HkBWcMRogdKBvCHYiZ9AkirvHLXC`, 운영 커밋 `8ea82a495c0846bc36fccca2607eab88048911b1`, READY / production임을 확인했다. 클라우드에서 기준 단위/기능 테스트 117개가 다시 통과했다. 이전 Mac의 135개 테스트 주장이나 미실행 브라우저 시나리오는 이번 증거에 포함하지 않는다.

S2 데이터 정합성·기존 입력 흐름 개선이다. `discoverability: not-applicable` — 인증 뒤 기존 화면과 기존 URL을 유지한다. `competitive_benchmark: required` — 팀 전환 상태와 선수 입력 흐름에 직접 관련된 공식 제품 자료만 비교한다. `store_compliance: not-applicable` — 새 개인정보 필드·SDK·권한·결제·네이티브 artifact·스토어 제출이 없다. 원격 웹을 표시하는 Capacitor에는 웹 변경이 반영되지만 실기기 검증과 스토어 승인을 뜻하지 않는다. 계정 전환과 클라이언트 권한 캐시 변경은 독립 검토 대상으로 둔다.

## 확인한 문제와 수용 기준

기준 코드의 `selectTeam`은 기록 조회 완료 전에 `selectedTeamId`와 localStorage를 갱신했다. dashboard는 권한 캐시까지 미리 바꾸고 picker를 닫았다. `loadTeamData`는 실패 응답을 빈 배열로 처리하고 요청 순서를 확인하지 않았다. 선수 화면에는 shared store와 별도의 `localPlayers`가 있었으며 늦은 저장 응답이 새 팀 상태에 반영될 수 있었다. 이는 소스에서 확인한 결함이며 운영에서 실제 영향을 받은 사용자 수는 미확인이다.

- 팀 이름·기록·선수·권한 캐시·영속 선택은 최신 성공 요청 하나로 함께 확정한다.
- 실패하거나 취소한 전환은 이전 확정 팀을 유지하고, 실패 이유와 재시도 동작을 picker 안에 남긴다.
- B 이후 C를 선택했을 때 늦은 B의 성공·실패가 C를 바꾸지 않는다.
- 계정 변경·로그아웃은 이전 계정의 조회·저장 응답을 무효화한다.
- 선수·쿼터 저장은 시작 당시 계정/팀/편집기 문맥이 유지된 경우에만 화면과 캐시에 반영한다.
- 같은 팀 새로고침은 선수 저장 잠금을 풀거나 저장 결과를 지우지 않는다.
- 취소·Escape·뒤로가기·느린 요청·응답 유실·실패 재시도와 모바일 가로 넘침·포커스를 가상 데이터로 검증한다.

## 자료와 접근 제한

[Supabase onAuthStateChange 공식 문서](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)는 동기 callback과 unsubscribe 패턴을 확인하는 데 사용했다. changelog Markdown 요청은 읽기에 실패해 [공식 HTML changelog](https://supabase.com/changelog)를 확인했다. [2026-10-12 TLS 공지](https://supabase.com/changelog/cbc-tls-ciphers-deprecated)는 11월 10일 이후 오래된 CBC cipher 지원 종료를 알리며, 이번 클라이언트 상태 수정에 SDK 교체를 요구하지 않는다. 실제 구형 기기 영향은 확인하지 않았다.

Supabase 관리 대상 `qfbfkgbqmeqgwnbdphlm`의 과거 `get_project` 요청은 `MCP -32600: You do not have permission to perform this action`으로 거부됐다. 이번 작업은 그 요청을 재시도하거나 다른 자격 증명으로 우회하지 않는다. 운영 쓰기·RLS·실제 사용/매출 지표는 `null / blocked`이며 합성 QA 결과로 대체하지 않는다. DB migration, 권한 확대, 비밀 값 수집, 유료 집행, 외부 마케팅 발송은 범위에 없다.

구현·QA·독립 검토·배포 결과는 완료 후 아래 기록과 PR에 추가한다. 노션 페이지와 일일 자동화는 상위 작업이 관리하며 중복 생성하지 않는다.

## 독립 디자인 비교와 반론

관측일 2026-11-02. 영어 공식 도움말의 웹 문서이며 경쟁 앱 로그인·직접 네트워크 동작·접근성 검증은 수행하지 않았다. 특정 국가의 앱 순위나 매출을 판단하는 자료로 쓰지 않는다.

| 공식 자료의 관측 사실 | 이번 적용 판단 |
| --- | --- |
| [360Player Change groups](https://help.360player.com/en/articles/10205630-change-groups), 2026-08-31: 현재 그룹 이름으로 선택기를 열고 그룹 변경 시 calendar/wall/menu가 함께 바뀜 | 기존 팀 이름 진입점을 유지하며 전체 팀 상태를 함께 확정한다 |
| [TeamSnap ONE roster management](https://teams-help.teamsnap.com/article/3003-how-to-manage-your-roster-in-teamsnap-one), 2026-09-29: team → roster → Add Player modal, jersey number 선택 입력 | 수동 선수 추가를 기본으로 유지한다. 확인 단계나 필수 항목을 늘리지 않는다 |
| [Spond group settings](https://help.spond.com/app/en/articles/133292-group-settings-for-group-admins-in-spond-app), 2026-09-01: 그룹을 선택한 다음 설정으로 이동하며 수정은 권한에 따름 | 팀 식별과 사용 가능한 행동의 문맥이 일치해야 한다 |

위 자료는 경쟁사의 요청 취소·race 처리 구현을 증명하지 않는다. 적용 원칙은 독립 디자인 담당의 해석이다.

반론: 새 팀 이름을 즉시 바꾸면 더 빠르게 보일 수 있다. 하지만 데이터가 따라오지 않은 동안 제목과 기록이 어긋나면 잘못된 팀에 입력했다고 오해하기 쉽다. 따라서 기존 팀을 유지하고 Sheet에서 목표 팀의 로딩을 알리며, 완전한 성공에만 닫는다. 선택 자체는 한 번의 탭으로 유지한다.

반론: 같은 팀 refresh도 입력기를 초기화하면 구현이 단순해진다. 그러나 진행 중 저장·초안이 사라지고 늦은 조회가 저장된 값을 덮을 수 있다. 따라서 계정/팀 identity와 조회 요청 순서를 구분한다. 저장과 겹친 오래된 조회 결과는 버리고 확인된 저장은 현재 명단에 ID로 합친다.

반론: 대대적인 화면 재설계를 먼저 해야 하는가. 현재 근거는 일관된 팀 상태와 오류 복구를 지지한다. 이번에는 기존 Black/Volt와 공통 Sheet를 유지하고 잘못된 정보·중복 입력을 줄이는 흐름을 바꾼다. 긴 쿼터 입력의 단계 분리나 사업 방향 전환은 실제 코치 관찰·반복 사용·지불 의사 증거를 바탕으로 별도 실험을 제안한다.

개발 중 합성 preview 검토에서 독일어의 긴 팀 이름이 320px 오류 문단 안에서 잘리는 문제를 발견했다. `scrollWidth === innerWidth`만으로 판정하지 않고 문단 자체의 clipping도 검사하도록 QA를 보강한다. `preview/`의 화면은 개발 중 캡처이며 Google Fonts 접근 제한으로 fallback 글꼴을 사용했다. 최종 승인 화면으로 계산하지 않는다.

## 클라우드 구현과 기계 검증

팀/계정 identity 버전과 요청 순서를 분리했다. 확정 전환은 공유 store와 선택/권한 캐시를 함께 갱신한다. 새로고침과 쓰기가 겹치면 조회 결과를 버리고, 확인된 선수 저장은 현재 문맥의 명단에 ID로 합친다. 초기 팀 목록 조회 실패도 빈 팀으로 표현하지 않고 재시도를 제공한다. 계정 전환을 기다리게 만들던 이전 요청을 즉시 무효화하며, 쿼터 저장 도중 문맥이 바뀌면 뒤따르는 삭제 요청을 시작하지 않는다.

선수 생성 후 회원 연결 실패에서는 확인한 선수 ID를 현재 페이지 방문 동안 유지한다. 재시도는 연결 PATCH만 수행한다. 페이지 이탈·전체 새로고침 이후 복구와 삽입 응답 자체 유실까지 보장하지 않는다. 이미 서버에 전송된 쓰기는 화면 취소·배포 롤백으로 되돌리지 않는다.

- 1차 동결 후보의 전체 단위/기능 테스트: 19개 파일, **135개 통과**. 이번 클라우드 구현에 새 테스트 18개를 추가했으며 Mac 테스트 결과를 재사용하지 않았다. 독립 코드 검토의 추가 결함과 수정 후 결과는 아래에 별도 기록한다.
- TypeScript: `npx tsc --noEmit` 통과.
- lint: `npm run lint`, 오류 0개·경고 49개. `git diff --check` 통과.
- 로컬 production build: `npm run build -- --webpack` 통과, 47개 페이지 생성. 배포 설정·제품 폰트·package/lockfile은 변경하지 않았다.
- 로컬 build의 접근 제약: Google Fonts HTTP 요청은 클라우드 proxy 403으로 차단됐다. 테스트 전용 `/tmp` Fontsource 패키지에서 같은 Noto Sans KR/Bebas Neue 계열을 읽는 `NEXT_FONT_GOOGLE_MOCKED_RESPONSES`를 사용했다. 기본 Turbopack은 이 로컬 경로를 처리하며 `request should be cloneable` 내부 오류로 실패했으므로 Webpack으로 로컬 검증했다. 이는 Vercel의 기본 빌드 성공 증거가 아니며, 호스팅 빌드를 별도로 확인해야 한다.
- Supabase URL·client/server 키는 로컬 빌드용 가짜 값만 사용했다. Firebase 자격 증명을 추가하지 않았으며 빌드의 Firebase 미설정 안내는 푸시 검증을 의미하지 않는다. 브라우저 QA는 실제 데이터/API 요청을 차단하고 가상 응답만 사용한다.

클라우드 재현 보조: Node 24.19.0, Chromium 154.0.8037.57, Playwright 1.64.1, Fontsource Noto Sans KR 5.3.1 / Bebas Neue 5.3.0을 사용했다. [테스트용 글꼴 응답 모듈](../scripts/qa-font-responses.cjs)은 실제 빌드에 사용한 `/tmp` 모듈과 동일한 응답을 생성함을 확인했다. 제품 의존성이나 호스팅 환경에 이 모듈을 설정하지 않는다.

```sh
npm ci
npm install --prefix /tmp/soccer-note-browser --no-package-lock playwright@1.64.1 @fontsource/noto-sans-kr@5.3.1 @fontsource/bebas-neue@5.3.0
NEXT_FONT_GOOGLE_MOCKED_RESPONSES="$PWD/scripts/qa-font-responses.cjs" \
NEXT_PUBLIC_SUPABASE_URL=https://soccer-note-test.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=synthetic-public-fixture-key \
SUPABASE_SERVICE_ROLE_KEY=synthetic-server-fixture-key npm run build -- --webpack
```

로컬 서버도 같은 가짜 Supabase 설정으로 `npm run start -- --hostname 127.0.0.1 --port 3127`을 실행한 뒤 독립 QA 보고서의 두 브라우저 명령을 사용한다. 외부 데이터 연결이나 실제 자격 증명은 필요하지 않다.

## 독립 브라우저·디자인 검증

1차 동결 후보의 로컬 production build에서 팀/선수 시나리오 **11/11**, 기존 쿼터 저장 회귀 **8/8**이 통과했다. 두 보고서 모두 page error·예상 밖 API 요청·예상 밖 console error·cleanup warning이 0개다. 일부러 주입한 네트워크 실패는 별도 집계한다. 최초 두 실행의 도구 결함(빈 Next route announcer의 alert 선택 충돌, Touch 필드 누락, fixture player join/투표 조회 누락)은 가상 응답/선택자를 고쳐 전체를 재실행했고, 이전 실행을 제품 회귀로 분류하지 않는다.

팀 데이터/권한의 동시 전환, 느린 B 후 빠른 C, 실패 보존·재시도, 취소/닫기/Escape/browser Back, 이전 요청의 늦은 실패, 로그아웃/계정 변경, 이전 팀 선수 저장, 같은 팀 refresh와 save의 두 완료 순서, 이전 계정 쿼터 응답, 독일어 320px/한국어 390px 접근 조작, 회원 연결 실패의 단일 insert·link-only retry를 확인했다. 회원 연결 테스트는 실제 운영 데이터에 쓰지 않았다.

독립 디자인 담당은 최종 로컬 production 캡처를 검토해 blocking 시각 결함이 없다고 판정했다. 320px 로딩/오류 문구는 Sheet 안에서 모두 줄바꿈하며, 실제 CSS viewport와 문단의 너비/텍스트 사각형을 검사했다. 현재 글꼴은 로컬 mirror로 로드되었고 preview의 fallback과 구분한다. 기존 긴 이름의 높은 sticky header와 최초 로드 실패 문구의 “현재 팀” 표현은 후속 개선 과제다.

- [팀 전환 최종 결과](design-qa/2026-11-02-team-switch/local/browser-results.json)
- [쿼터 저장 최종 회귀](design-qa/2026-11-02-team-switch/local/quarter-regression/browser-results.json)
- [320px 오류 화면](design-qa/2026-11-02-team-switch/local/failed-de-320.png)
- [선수 저장 중 새로고침](design-qa/2026-11-02-team-switch/local/player-save-refresh-390.png)
- [회원 연결 부분 실패](design-qa/2026-11-02-team-switch/local/member-link-failed-390.png)

이는 합성 검증 결과이며 사용자 활성·저장 성공률·유지율·매출 지표가 아니다. 실제 OAuth 공급자·운영 DB 쓰기/RLS·물리 iOS/Android·푸시·스토어 제출은 미검증이다.

## 독립 코드 검토에서 발견한 추가 결함

독립 reviewer가 **P1 배포 차단 결함**을 재현했다. 이전 계정의 저장을 시작한 뒤 새 계정의 첫 팀 조회를 보류하고, 이전 저장을 먼저 완료하면 전역 `writeRevision`이 새 계정의 조회까지 무효화했다. 새 계정은 `isLoaded=false`, 팀 목록 없음, 오류도 없는 상태에 남아 로딩이 끝나지 않았다. 기존 11개 브라우저 그룹 중 계정 전환 사례는 새 계정이 준비된 뒤 이전 저장을 풀었으므로 이 순서를 놓쳤다.

배포를 보류하고 이전 문맥의 `finish()`가 현재 문맥의 조회를 무효화하지 않도록 수정했다. 관련 검토에서 picker 선택이 없는데도 dashboard 이탈 정리가 초기 조회를 취소하는 경로를 찾아, 실제 pending selection이 있을 때만 취소하도록 바꿨다. 같은 문맥의 쓰기로 첫 조회가 무효화될 때는 무한 로딩 대신 기존 재시도 상태로 전환한다.

세 가지 회귀 테스트를 추가한 최종 전체 **138개 / 19파일**이 통과했다. 최종 TypeScript·Webpack production build·diff 검사 통과, lint 오류 0개·경고 49개다. 독립 reviewer는 최초 P1 재현과 선택 요청 없는 초기 조회 취소 재현을 다시 실행해 해결을 확인했고, 남은 차단 결함은 찾지 못했다. 새 계정 초기 조회 도중 이전 선수/쿼터 저장이 끝나는 순서를 브라우저 12번째 그룹에 추가해 최종 재검증한다.

비차단 후속 과제: 초기 조회 오류의 공통 재시도 UI가 아직 dashboard에 집중돼 있다. `/ranking` 직접 진입 실패는 skeleton이 남고 선수 직접 진입 실패는 빈 목록처럼 보일 수 있어, 모든 인증 화면에서 일관된 오류/재시도를 제공해야 한다. Home 이동을 통한 복구는 가능하지만 이번 범위에서 전 화면을 재설계하지 않는다.

### 수정 후 최종 검증

팀/계정/선수 브라우저 **12/12**, 기존 쿼터 저장 회귀 **8/8**이 새 production build에서 통과했다. 12번째 그룹은 선수 저장과 쿼터 저장 각각에 대해 새 계정 조회를 지연하고 이전 쓰기를 먼저 완료시키는 순서를 검증한다. 두 보고서 모두 예상 밖 요청·page error·예상 밖 console error·cleanup warning이 0개다. 수정 전 11/8 결과는 `pre-review/`에 별도 보존하며 최종 결과와 섞지 않는다.

검증한 로컬 build ID는 `LGZgaQM3qLvAVWMbGHyBB`, `src` 119개 파일 manifest SHA256은 `ab3d56c6cfcda1c6193a8dbec8984f495d606b2569ba12ed5907eab79e57391a`다. [빌드·소스 식별](design-qa/2026-11-02-team-switch/local/build-identity.json)에 package/lockfile hash도 기록했다. [독립 QA 보고서](design-qa/2026-11-02-team-switch/independent-qa.md)와 위 최종 기계 검증·독립 재검토를 기준으로 웹 배포 후보가 준비됐다. 공개 HTTP 검증의 접근 제한은 아래와 같이 남는다.

## 운영 확인 경계와 롤백 기준

기존 Git 원격 접근과 동일 브랜치 push dry-run은 성공했다. 일반 `gh api repos/keestory/soccer-note` 읽기는 `Forbidden`을 반환했으나 기존 GitHub 연결의 PR 조회는 성공했으며 CLI REST 요청을 반복하지 않았다.

공개 `https://soccer-note-hazel.vercel.app`에 대한 클라우드 curl은 proxy HTTP 403, web 도구는 URL 접근 불가를 반환했다. Vercel의 deployment/alias 읽기는 가능하다. `web_fetch_vercel_url`은 임시 공유 링크를 생성/재사용하고 생성 금지 옵션이 없어 사용하지 않는다. 권한/자격 증명을 추가하지 않으며 공개 브라우저 smoke는 **blocked**로 기록한다. 배포 READY와 alias 확인을 공개 화면 검증 완료로 바꾸지 않는다.

이번 릴리스의 롤백 대상은 시작 시 운영 중이던 `dpl_HkBWcMRogdKBvCHYiZ9AkirvHLXC` / `8ea82a495c0846bc36fccca2607eab88048911b1`이다. 같은 Vercel project/team의 기존 rollback 기능을 사용하며, 그보다 오래된 `dpl_3ALrLX…`를 사용하면 삭제 후 삽입 코드까지 되살아난다. 스키마·캐시 저장 형식의 마이그레이션은 없으며 실제 롤백은 실행하지 않는다. 실행 중인 브라우저와 이미 보낸 데이터 쓰기를 롤백이 취소하지 않는 점은 그대로다.

## 원격 반영 및 최초 운영 배포 거부 이력

검증한 제품 커밋 `b3b96fd29f778ef5b44084cb96e2130c93a8a30c`을 기존 브랜치/PR #62에 push했고 원격 SHA를 다시 확인했다. 기존 Git 연동이 생성한 **preview** `dpl_2zQUzRR62Cuom34azTZe46YQKz3m`은 같은 SHA로 **READY**다. [호스팅 preview](https://soccer-note-f1iq6u141-keestory91-6294s-projects.vercel.app)의 정상 호스팅 빌드는 통과했지만 보호된/공개 URL 화면 검증을 뜻하지 않는다. 운영 환경변수 변경이나 local font mirror 설정은 하지 않았다.

이후 기존 프로젝트의 `create_deployment`, `target=production`, `gitSource.ref=b3b96fd29f778ef5b44084cb96e2130c93a8a30c` 요청은 **자동 승인 검토가 거부**했다. 이유 원문: “This creates a production Vercel deployment and externally commits the verified branch to a live service; the user authorized cloud development but did not explicitly authorize this exact production deployment.”

기존 서비스 배포를 허용한 사용자 지시가 전달돼 있었지만 자동 검토가 이 요청에 대한 승인으로 인정하지 않았다. 이 작업의 상태는 **denied / 미실행**이다. 다른 배포·promotion 경로로 우회하거나 같은 요청을 반복하지 않았다. 이후 읽기 전용 확인에서 공개 alias는 계속 `dpl_HkBWcMRogdKBvCHYiZ9AkirvHLXC` / `8ea82a495c0846bc36fccca2607eab88048911b1`, READY / production이었다. 새 SHA에는 자동 preview만 존재했다.

이 시점에는 정확한 커밋의 기존 Soccer Note 운영 배포가 남아 있었다. 이후 아래와 같이 승인된 동일 작업을 한 번 재시도해 완료했다. 기존 웹/Capacitor 원격 웹 사용자의 팀 전환·저장 화면이 바뀌며 DB/RLS/자격 증명은 바꾸지 않는다.

## 무료 플랜 확인 및 운영 배포 완료

2026-11-02, 사용자가 정확한 제품 커밋과 공개 서비스의 운영 반영을 승인하고 항상 무료 버전만 사용하도록 지정했다. 무료 플랜을 먼저 읽기 전용으로 확인한 뒤, 앞서 미실행으로 거부된 동일 `create_deployment` 요청을 한 번 재시도했다. 다른 배포 경로로 우회하지 않았고 요금제 변경·과금 동의·새 유료 서비스·DB/RLS/권한·환경변수 변경은 하지 않았다.

- `get_git_deployment_context`: 대상 팀 `team_jr2EoWExoCNDX3AFRs9fZxKh`의 실제 `plan=hobby`, Soccer Note project 연결 확인.
- 배포 전 팀 전체 최근 24시간 배포 **17회**, pagination의 다음 페이지 없음. [Vercel 공식 한도](https://vercel.com/docs/limits)의 Hobby 하루 100회 안이었다. 다른 프로젝트는 한도 집계에만 포함했고 변경하지 않았다.
- [Hobby 공식 안내](https://vercel.com/docs/plans/hobby)는 무료 tier이며 한도 초과 시 사용 재개까지 대기한다고 명시한다. 월간 사용량 전체 잔여치는 도구에서 제공되지 않아 추정하지 않았다. 청구 조회는 `404 costs_not_found`였으며 이를 청구 금액 0의 증거로 사용하지 않았다. 실제 무료 플랜에서 이번 빌드/배포는 성공했다.
- 배포: **`dpl_yxx1LCzPEhBeJep6sFd9R2KzgEYJ`**, `target=production`, **READY**, `aliasError=null`.
- 정확한 제품 SHA: **`b3b96fd29f778ef5b44084cb96e2130c93a8a30c`**. `e6ee0f3` 및 이후 기록 커밋은 문서만 바꾸며 제품 배포 대상은 b3b96fd로 유지한다.
- 대상 project: `prj_8MtXlwcx0NzpWAZQjGUuFTL4HHAL` / `soccer-note`.
- [공개 서비스](https://soccer-note-hazel.vercel.app)의 `get_alias`가 위 배포 ID와 project를 반환했다.
- [배포 URL](https://soccer-note-2xifea14a-keestory91-6294s-projects.vercel.app), [배포 관리 화면](https://vercel.com/keestory91-6294s-projects/soccer-note/yxx1LCzPEhBeJep6sFd9R2KzgEYJ).
- 호스팅 빌드 로그에 `Build Completed in /vercel/output [20s]`, `Deployment completed`를 확인했다. READY 시각은 2026-11-02 05:07:16 UTC다.
- 배포 직후 error/fatal runtime log 그룹 조회에는 행이 없었다. 짧은 구간이며 실제 접속량도 미확인이므로 운영 오류율 0이나 사용자 성공을 의미하지 않는다.

공개 화면 확인은 **blocked**다. 05:07 UTC의 클라우드 `curl -I https://soccer-note-hazel.vercel.app`는 `CONNECT tunnel failed, response 403`, proxy `server: envoy`를 반환했다. 앱이 반환한 403으로 해석하지 않는다. 부모 작업의 별도 클라우드 브라우저에서 root/login/privacy와 배포된 모바일 화면을 확인해야 하며 Mac은 사용하지 않는다. 보호 우회·공유 자격 증명 생성도 하지 않았다.

롤백 대상 `dpl_HkBWcMRogdKBvCHYiZ9AkirvHLXC` / `8ea82a495c0846bc36fccca2607eab88048911b1`는 배포 직전 READY / production으로 재확인했다. 그러나 `list_deployments(rollbackCandidate=true)`는 `403 forbidden`, resource `deploymentRollback`, “You don't have permission to list the resource.”로 **denied**됐다. 해당 조회를 반복하거나 CLI/다른 자격 증명으로 우회하지 않았으며 실제 롤백은 실행하지 않았다. 따라서 보존된 이전 배포는 확인했지만, 현재 연결의 롤백 실행 권한까지 검증한 것으로 표시하지 않는다.

정제된 배포 증거는 [production-deployment.json](design-qa/2026-11-02-team-switch/production-deployment.json)에 보관한다. PR #62는 draft/open을 유지하고 main 병합·PR 승인은 하지 않는다. 남은 검증은 공개 브라우저, 롤백 실행 권한, 실제 OAuth/운영 DB·RLS·실기기이며 실제 사업 지표는 계속 `null / blocked`다.
