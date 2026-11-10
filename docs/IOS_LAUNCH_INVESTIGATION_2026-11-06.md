# iPhone App Store 시작 직후 종료 조사

상태: **원인 미확정·수정/앱 배포 미실행**. 사용자는 다른 설치자에게 시작 직후 종료가 발생하며 플랫폼과 설치 경로는 iPhone/App Store라고 확인했다. 이는 사용자 보고이며 crash log나 기기 재현 결과와 구분한다. 정상 기기와 장애 기기가 같은 설치 바이너리인지, 기기/OS·설치 버전/빌드·종료 시점은 아직 미확인이다. 원문 사용자 발언이나 개인 식별자는 기록하지 않는다.

## 범위와 중복 확인

- 조사 기준 원격/로컬은 `10eede50cf0d98b3a6d91c4db74fb3576d06b215`, `codex/quarter-save-reliability`, clean이었다. 운영 웹 제품은 `e7b50d5043149cbecbdfedb2760ff49fc1ecedc4`다. 이번 조사에서 제품 파일을 변경하지 않는다.
- [기존 Nov1 QA](design-qa/2026-11-01-entry-onboarding.md#known-limits)에 설치 앱 즉시 종료가 이미 미해결로 기록돼 있다. 오늘 목록 오류 안내 수정과 인과를 연결하지 않는다.
- 기존 공통 Notion 보드를 읽기 조회한 Soccer Note 9개 카드에는 설치 앱 시작 종료 항목이 없었다. [WORK-25](https://app.notion.com/p/41066b33db7a8186a786eb5c683deddb)는 완료된 웹 목록 조회 실패 범위로 이번 장애와 다르다. 중복 카드나 Notion 변경은 만들지 않았고 조정자의 장애 추적에 이 근거를 전달한다.
- S2 장애 조사. discoverability/competitive_benchmark는 해당 없음. 네이티브 시작/배포 범위에는 store compliance가 필요하므로 AGENTS와 [스토어 게이트](STORE_COMPLIANCE.md)를 읽었다. 실제 제출/심사/스토어 선언 변경은 수행하지 않았다. 호스트의 독립 읽기 검토와 저장소 CLI blocked 상태를 구분한다.

## 첫 중요한 발견과 공개 스토어 정정

공식 App Store 페이지는 [Match Tracker — ID 6760930338](https://apps.apple.com/kr/app/match-tracker/id6760930338)이며 개인정보처리방침이 `soccer-note-hazel.vercel.app`을 가리킨다. **2026-11-06 13:59:10–13:59:11 UTC**의 웹 도구 응답은 `Crawled: today`, **버전1.4 /10월4일 /iOS15.0 이상 /19.9MB**를 표시했다. 숫자 ID와 링크는 공개 제품 식별자다. 이 응답은 개별 피해 기기에 설치된 버전이나 App Store Connect의 build number를 제공하지 않는다.

앞선 같은 페이지 응답은 `Crawled: last month`, 버전1.3/7월11일을 표시했다. 이를 먼저 중간 보고했지만 최신 응답으로 **1.4로 정정**했다. 오래된 응답을 현재 배포 버전으로 사용하지 않는다. 1.3과 소스1.4의 차이를 이번 장애 원인으로 주장하지 않는다.

| 경로 | 확인된 소스/공개 사실 | 확인되지 않은 것 |
| --- | --- | --- |
| 현재 iOS Capacitor | `ios/App/App.xcodeproj/project.pbxproj:461–493`의1.4(build5), iOS15. `capacitor.config.ts:8`은 운영 웹 URL을 연다. | 실제 App Store1.4의 build number·Git SHA·archive·리소스/SDK 일치 |
| 과거 iOS 소스 | `7f33efdc906f927337d1a9374d16e69f973351b9`는1.2(build3). 현재까지 시작 코드·plist·리소스 목록은 동일하며 Capacitor8.0.2→8.5.3, App/Browser SPM 및 CI 생성 경로에 변화가 있다. | 과거 커밋도 App Store1.3/1.4 바이너리의 확정 대응물이 아님 |
| 별도 Expo 앱 | `mobile/`은 Expo52/React Native0.76, 같은 `com.soccernote.app`, 소스1.0.0. | 해당 코드로 App Store 설치본을 만들었는지, EAS 원격 설정·실제 artifact·OTA 경로 |

웹 업데이트는 실제 설치 shell이 같은 운영 URL을 성공적으로 불러오는 경우에만 웹 변경을 전달한다. AppDelegate·SDK·서명·포함 리소스 등의 수정은 **새 설치 바이너리의 빌드·검증·배포**가 필요하며 Vercel 배포로 대체할 수 없다. 같은 앱 ID만으로 Capacitor와 Expo의 실제 배포 경로를 단정하지 않는다.

## 독립 네이티브 소스 조사와 반론

독립 네이티브 검토자는 현재와 위 과거 커밋을 읽기 비교했다. 아래는 실제 업무 출력 요약이며 실제 기기 crash reproduction이 아니다.

- `ios/App/App/AppDelegate.swift:11–18`은 앱 시작 시 `FirebaseApp.configure()`와 notification delegate 설정을 수행한다. [Firebase 공식 구현](https://github.com/firebase/firebase-ios-sdk/blob/12.12.1/FirebaseCore/Sources/FIRApp.m#L93)의 잘못된 설정 예외는 조건부 후보지만, 저장소의 설정 plist 존재·필수 키/형식·번들 일치·`project.pbxproj:292` Resources 포함 검사는 과거와 현재 모두 통과했다. **현재 소스의 plist 누락 원인은 뒷받침되지 않는다.** 설정값/키는 공개하지 않았다. 실제 archive의 설정은 미검증이다.
- SceneDelegate 부재는 지원되는 AppDelegate 시작 구조와 양립한다. 그 사실만으로 파일을 추가하거나 수정하지 않는다. 현재 Xcode의 iOS15 minimum은 Capacitor8 요구와 일치한다. Firebase SDK의 Xcode/Swift **빌드 도구** 요구사항을 사용자 기기의 iOS 요구사항으로 해석하지 않는다.
- Android의 Firebase 설정 누락 허용과 push 등록 예외 후보를 검토했지만, `src/components/Providers.tsx:9–23`에 PushNotificationInit 마운트가 없고 전체 src 검색도 정의 외 사용처가 없다. 웹 검토자의 반론 뒤 네이티브 검토자가 이를 재확인해 현재 시작 경로 후보 순위를 낮췄다. iPhone/App Store 확인 이후 Android는 이번 수정 대상이 아니다.
- Expo의 `mobile/src/lib/supabase.ts:8–15`는 설정이 비면 module-level client 생성 예외 위험이 있다. EAS 원격 값과 실제 설치 artifact는 미확인이다. iPhone/App Store라는 정보만으로 Expo라고 가정하지 않으며, 해당 위험을 이번 원인으로 확정하거나 Expo 설정을 바꾸지 않았다.
- 현재 웹 Next16.4.3의 기본 [브라우저 지원 범위](https://nextjs.org/docs/architecture/supported-browsers)는 Safari16.4 이상인데 공개 앱/네이티브 minimum은 iOS15다. 피해 OS가15–16.3인지 확인할 가치가 있다. 지원범위 차이는 **실제 종료 재현 또는 원인 확정의 증거가 아니다**. OS 지원을 임의 변경하지 않았다.

가장 강한 반론은 실제 App Store 바이너리·비식별 crash exception이 없다는 점이다. 같은 바이너리에서 소유자만 정상인지도 모른다. 원인에 대한 순위를 확정하거나 Firebase/Scene/전체 빌드 설정을 추측으로 바꾸지 않는다.

## 비파괴 웹 조사 · 실제 실행과 한계

별도 웹 검토자는 기존 제품 빌드 `Dpvc3wJRetRWag672znXw`를 사용했다. 현재 src가 제품e7b50d5와 동일함을 확인했으며 새 빌드는 만들지 않았다. 아래는 **직접 실행한 두 도구 호출의 관측을 옮긴 요약**이다. 원본 runner/report 파일·스크린샷은 생성하지 않았으므로 보존된 raw artifact라고 표현하지 않는다. iPhone/WKWebView가 아닌 로컬 Chromium 합성 조사다.

- 실행 시각: 2026-11-06 13:50:14.025 UTC(5조건),13:51:34.499 UTC(4조건).
- 모든 API/auth/외부 요청을 가로챘다. 만료 세션의 합성 refresh POST4개도 차단했다. **실제 외부 요청·운영 쓰기0**이며, 다른8조건은 쓰기 시도0이다. 조사용 서버는 종료했다.

| 조건 | 관측 |
| --- | --- |
| 신규 진입 /깨진 캐시 JSON | 온보딩 정상, 페이지 오류0 |
| 네이티브 listener 미제공 모형 | 온보딩 정상, 페이지 오류0 |
| localStorage getter /모든 getItem /언어 키만 SecurityError | 웹 오류 화면과 오류 재현. 브라우저 프로세스는 종료되지 않음 |
| 복원 세션 +빈 팀 | dashboard 팀 선택 정상 |
| 유효 세션/만료 세션 +네트워크 차단 | 3초 관측 중 온보딩 유지, 페이지 오류0. 무한 대기/실제 오프라인 정상 동작을 증명하지 않음 |

격리된 조건에서 `src/lib/i18n/context.tsx:22`의 최초 `soccernote-locale` 읽기에 SecurityError를 주면 “This page couldn’t load /Reload /Back” 웹 오류 화면이 나타났다. 해당 키의 실제 기기 접근 거부 증거와 OS 종료는 없다. 따라서 이는 **별도 웹 실패 조건**이며 이번 native crash의 해결로 포장하지 않는다. `DeepLinkHandler`의 listener 설정 실패와 Onboarding의 세션 조회 실패는 catch된다. 자동 push 권한 요청이 현재 Providers에서 실행된다는 가설도 지지되지 않았다.

조사 소스 blob: I18nProvider `9c5b9dd5fda0c9801c8564798048d8309c0b96a7`, Providers `0373eb93104b1435770cfd34b521a7ade52f94e8`, Onboarding `f825000d1236738b2ca0ef21c80f0e09820cb196`, DeepLinkHandler `e64f631da0b0009e84866931766556255dd2a173`. 빌드 매핑은 기존 [검증 manifest](design-qa/2026-11-06-match-load/verification.json)와 BUILD_ID를 읽어 확인했다. 원인 수정이 없어 lint/type/test/build를 다시 실행하지 않았으며, 기존 출시 검사를 이번 native 검증으로 전용하지 않는다.

## 접근 상태·배포 경계

| 정확한 작업/대상 | 상태·이유 | 후속 |
| --- | --- | --- |
| GitHub release 목록, `gh release list --repo keestory/soccer-note` | **denied**: GraphQL 요청 Forbidden. release 데이터 미수신 | 반복·다른 endpoint 우회 없음. 저장소/PR의 기존 허용 Git 작업과 구분 |
| 공개 iTunes bundle lookup | 웹 도구는 URL 처리 불가. 이어진 cloud HTTP는 **denied**: CONNECT403, 응답 미수신 | 이후 재시도/우회 없음. 허용된 별도 `apps.apple.com` 페이지 관측과 구분 |
| 실제 IPA/archive/dSYM·기기 crash log | **unavailable/pending evidence**: 현재 checkout에 artifact/`.ips`/`.crash` 없음, 연결된 App Store Connect/Crashlytics 조회 도구 없음 | 기존 승인된 배포 기록이나 개인정보 제거된 crash 근거가 필요. 신규 계정·키·권한 요구 없음 |
| iOS 빌드·실기기 재현·App Store 배포 | **not executed**: 이 클라우드에 Xcode/Swift/iOS 기기 및 검증된 기존 무료 서명/배포 경로 없음 | 비용이나 접근을 추정해 새 빌드를 시작하지 않음. Mac 미접근 |
| 기존 Supabase/특수rollback/workflow/저장소 CLI | 기존 차단 유지, **not retried** | 이번 조사로 해소됐다고 주장하지 않음 |

제품 수정·운영 재배포·새 PR·승인/병합·서명/권한/DB 변경은 없다. 공개 앱의 무료 가격은 클라우드 빌드 비용이나 남은 할당량의 증거가 아니다. 문서만 기존 브랜치에 보존하며 총청구0원은 주장하지 않는다.

## 다음에 필요한 최소 근거와 안전한 절차

1. 장애 기기 한 대의 기종·iOS 버전, 설치 앱 버전/빌드, 로고 단계/온보딩/로그인 중 어디서 홈 화면으로 돌아가는지. 정상 기기도 동일 App Store 설치본인지 비교한다.
2. 그 기기에서 생성된 crash의 앱 버전/빌드, Exception Type/Termination Reason, 마지막 예외 또는 종료 스레드의 첫 앱 프레임. 원본은 기기/소유자의 비공개 보관으로 유지하고 이메일·사용자/기기 식별자·토큰·개인 경로는 GitHub/공개 문서에 올리지 않는다. [Apple crash 수집 안내](https://developer.apple.com/documentation/xcode/acquiring-crash-reports-and-diagnostic-logs), [필드 해석](https://developer.apple.com/documentation/xcode/examining-the-fields-in-a-crash-report)을 따른다. 개인정보 공유 설정을 임의로 켜거나 재설치·데이터 삭제를 먼저 요구하지 않는다.
3. 기존 App Store Connect/Xcode Cloud에서 출시1.4에 대응하는 build number·source commit·archive/dSYM·포함 Firebase/Capacitor 리소스를 허용된 읽기 경로로 대조한다. 이 환경에서 없는 권한을 만들어 해결하지 않는다.

Exception이 native 초기화인지, WebKit 종료/메모리/감시 타이머인지, 웹 JS 실패인지 구분된 뒤 그 경로만 최소 수정한다. 그때 동일 수정 SHA의 관련 회귀와 lint/type/test/build, iOS artifact·기기 검증 및 실제 App Store 전달을 각각 기록해야 한다. 현재 결론은 **조사 근거 확보·진단 입력 대기이며 장애 해결 완료가 아니다**.

## 조사 문서 검증

독립 네이티브 검토자는 버전 정정·소스와 archive 경계·가설/반론·배포 미실행 기록에서 사실 오류나 과장을 발견하지 못했다. 별도 웹 검토자는9조건·시각·POST4개 차단·실제 외부/운영쓰기0·원본 파일 미생성·3초 한계가 자신의 실제 실행 기록과 일치한다고 확인했다. 두 검토자는 새 외부 조회나 제품 변경 없이 문서만 읽었으며, 이 문서 검토는 native 원인 확정이나 출시 승인으로 보지 않는다. 문서 push 전 기존 Hobby 프로젝트·원격 baseline과 제품 파일 무변경을 재확인했다.
