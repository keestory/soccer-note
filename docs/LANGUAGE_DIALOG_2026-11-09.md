# 언어 선택창 키보드 흐름 · 2026-11-09

[WORK-30](https://app.notion.com/p/41266b33db7a810fb89bf53acb939cda) · [실제 역할 논의](AGENT_DISCUSSIONS.md#2026-11-09-실제-역할-협의--언어-선택창의-국소-수정) · [기존 draft PR62](https://github.com/keestory/soccer-note/pull/62)

## 현재 결론

제품 `0b04a960c616f19317759dd7c8e54da0509f4abd`의 국소 수정·독립 CQO/CDO 검토·최종 합성 검증과 원격 push 완료. **운영 production 생성은 자동 승인 검토가 실행 전에 거절하여 미배포**다. 반복 요청이나 다른 경로로 우회하지 않았다. 브랜치 자동 preview READY와 운영 배포는 구분한다.

이것은 웹 언어 선택창 변경이다. App Store 시작 종료 [WORK-26](https://app.notion.com/p/41066b33db7a817699aaf41c684ed5e2)은 새 crash/출시 바이너리 대응 근거 없이 별도 P0 Blocked이며 해결·완화로 주장하지 않는다.

## 현재 재현·선택 근거

기준 원격 `31517a5d32d165307ca126f1222f50322090551a`, 운영 제품 `acffd57b509cacdffac4b200796a272d7537f44e` 사이 `src` 차이가 없음을 확인했다. 기존 production 빌드 `UmXl9FMQnF3RfRtRo9BCp`에서 **Nov9 01:58:34–01:58:42 UTC** 실제 프로필 6조건을 새로 실행했다. 과거 Nov8 결과를 오늘 실행으로 쓰지 않았다.

Enter로 열어도 배경 트리거에 포커스가 남고 Escape가 닫지 못하며 Tab/Shift+Tab이 배경으로 이탈했다. 취소·선택 뒤 포커스는 BODY였다. 언어 선택/저장/새로고침과 공통 ConfirmSheet 대조는 정상이다. 6조건은 결함/정상 관측 묶음이지 출시 기준 6개 통과가 아니다. [현재 재현 원본](design-qa/2026-11-09-language-dialog/before/browser-results.json).

전체 화면 배경막, 바깥 클릭 닫기, 하단 창 구조와 `UX-CONTRACT.md`의 공통 Sheet 계약으로 모달 의도를 확인했다. S1 국소 웹 상호작용 수정으로 분류했다. discoverability/store_compliance/competitive_benchmark는 적용 제외: 인증 뒤 선택창만 바꾸며 검색·딥링크·스토어 제출·SDK·데이터·권한·시장 판단에 변경이 없다. 신규 메모 필터·비밀번호 표시·AI·계측은 미채택이다.

## 구현과 검증 중 추가 발견

제품 변경은 `src/app/profile/page.tsx` 하나다. 기존 Sheet를 재사용해 초기 포커스·Tab 순환·Escape·명시적 닫기·트리거 복귀를 적용했다. 트리거의 dialog/expanded 상태와 현재 언어의 pressed 상태를 추가했다. 기존 언어 저장 로직·공통 Sheet/ConfirmSheet·CSS·인증·의존성·DB·네이티브 파일은 그대로다.

첫 후보 `53ca120847dcb508729f1fff1c89bba054456de0`의 UI 결과는 **15/16**이었다. 처음에는 더블클릭 후 닫힘을 바깥 클릭 취소로 추정했지만, 실제 이벤트 대상 확인이 그 추정을 반박했다. 390px에서 첫 클릭은 언어 트리거, 두 번째 클릭은 새 창의 Français 버튼에 전달되어 의도하지 않은 fr 저장이 발생했다. 독립 CQO가 마우스 및 320/390px Chromium touchscreen 입력으로 같은 결함을 재현했다. [최초 실패](design-qa/2026-11-09-language-dialog/initial-after/browser-results.json), [이벤트 대상 근거](design-qa/2026-11-09-language-dialog/rapid-click-investigation.json)를 보존했다. 테스트 기대를 느슨하게 바꾸지 않았다.

후속 제품 커밋은 트리거와 언어 버튼에서 `event.detail > 1`인 연속 클릭을 무시한다. 일반 첫 클릭(detail 1), 키보드(detail 0)는 유지한다. 타이머·전역 이벤트·공통 Sheet 수정 없이 관측한 재클릭 문제를 국소 보완했다.

## 동일 최종 제품 SHA의 검증

`0b04a960c616f19317759dd7c8e54da0509f4abd`, 로컬 production 빌드 `Neev93urkk1AiksttepRq`:

- lint 0 errors / 기존 49 warnings, type 통과, 단위 20파일 **163/163**, production webpack build 통과.
- 실제 컴포넌트 UI **20/20**, Nov9 02:07:59–02:08:38 UTC. 초기 포커스·Tab/Shift+Tab·Escape·닫기/바깥 클릭/선택 뒤 복귀·8개 언어·반복·브라우저 뒤로/앞으로·기존 공통 ConfirmSheet 취소 대조·320/390px의 568/844px 화면 및 마우스/합성 touchscreen 반복을 확인했다.
- 실제 I18nProvider/프로필/온보딩 저장소 회귀 **17/17**. localStorage 속성/getItem 초기 실패, 속성/setItem 선택 실패, 현재 세션 유지, 닫힘·포커스 복귀·expanded=false, 복구 후 재선택/새로고침, 유효 8언어·누락·잘못된 값·fallback을 확인했다.
- 최종 두 실행 모두 API 쓰기·예상 밖 외부 요청·uncaught page 오류 0. UI 정리 경고 0. 모든 계정/조회는 합성이다. 로그아웃 확인창은 열고 취소만 했다.
- CQO 반다이크의 독립 코드·실제 재현·결과 JSON·모바일 이미지 검토: 최종 국소 웹 변경의 남은 차단 결함 없음. 이는 PR 승인이나 배포 증거가 아니다.

[검증 manifest](design-qa/2026-11-09-language-dialog/verification.json) · [UI 결과](design-qa/2026-11-09-language-dialog/after/browser-results.json) · [저장소 결과](design-qa/2026-11-09-language-dialog/storage/browser-results.json) · [UI 실행기](../scripts/qa-language-dialog.mjs) · [저장소 실행기](../scripts/qa-language-dialog-storage.mjs).

로컬 build는 기존 설치 도구와 기존 빌드에 있던 폰트 바이트를 임시 경로에서 재사용했고 합성 Supabase 설정을 썼다. 새 패키지·API 키·환경 권한은 만들지 않았다. Firebase 설정 없음 경고는 로컬 합성 환경의 한계이며 실제 푸시를 검증하지 않았다. QA 서버 재시작의 포트 충돌은 해당 실행에서 시작한 서버를 확인·종료한 뒤 정상 재시작했다. 새 외부 실행기는 사용하지 않았다.

## 무료 경로·원격 상태·복귀

현재 연결된 프로젝트 팀의 plan=hobby를 읽었고 [공식 Hobby 정책](https://vercel.com/docs/plans/hobby)의 무료 포함량 및 일반적인 초과 시 사용 제한을 확인했다. 저장소 build/lint/test는 기존 로컬 도구이며 `.github` workflow, `vercel.json`, 새 유료 빌드 override는 없다. 생성 요청도 기존 프로젝트/Git SHA/production만 지정했으며 turbo·유료 옵션·요금제·외부 추론 API·유료 CI를 추가하지 않았다. 월 잔량·총청구·호스트 모델 청구는 미확인이다. 포함 한도에서만 진행하며 한도 거절 또는 추가 과금 경로가 생기면 중단한다. 이번 배포 거절 사유는 비용이 아니라 승인 해석이다.

원격 제품 SHA와 PR62 open/draft/base main/미병합을 확인했다. Vercel Git check success, 자동 preview `dpl_9gLAaeGaxek6xXPHSvGtfAR2EvUd` READY / target=null이며 제품 SHA가 일치한다. Preview URL: https://soccer-note-r7weughyy-keestory91-6294s-projects.vercel.app . 보호 설정을 바꾸거나 우회해 열지 않았다.

운영 create_deployment 요청은 **1회**, 실행 전 명시적 거절이다. 이유: 기존 자율 개발 지시를 이 정확한 production 배포의 명시적 승인으로 인정하지 않는다는 자동 승인 검토 판단. 새 deployment ID는 발급되지 않았다. 거절 응답을 확인한 뒤 상태만 읽었고 동일 요청 재시도·다른 계정/경로 우회는 없다.

Nov9 02:11 UTC 조회에서 대표 alias는 여전히 이전 READY production `dpl_9fY9Rv4VNjhuD1seXTnbApE4x98k` / `acffd57b509cacdffac4b200796a272d7537f44e`다. 운영 https://soccer-note-hazel.vercel.app 는 변경하지 않았다. 새 제품 SHA의 production 항목은 없고 위 preview만 존재한다.

복귀점은 위 acffd57b 원격 소스와 기존 READY 배포다. 정상 create-deployment 계약의 이전 `deploymentId`, `target=production`, `withLatestCommit=false`를 이용하는 소스 재배포 계획을 보존했다. 실제 복귀 전환·그 실행 권한 성공을 시험한 것은 아니며 이번 생성 승인 거절도 남아 있다. 특수 rollbackCandidate 접근 거절은 재조회하지 않았다.

## 검증 경계와 다음 단계

새 배포는 미실행이다. 따라서 새 버전 공개 UI의 live 검증도 미실행이며 기존 executor 공개 도메인 CONNECT403은 반복하지 않았다. 현재 도구에 별도 허용된 원격 브라우저는 없다. 승인 해소 뒤에는 동일 검증 SHA의 배포/READY/alias 확인과 가능한 별도 공개 읽기 검수를 해야 한다.

Chromium 합성 touchscreen 결과의 `physicalTouch` 필드는 touchscreen 프로토콜 사용을 뜻하며 물리 기기 증거가 아니다. 실제 iPhone/Safari·스크린리더·운영 인증/언어 변경·App Store 바이너리 전달·사용자 효과는 미검증이다. 공통 Sheet는 배경 inert를 새로 적용하지 않았으므로 완전한 접근성 해결을 주장하지 않는다. 저장소 결과의 fault hit 배열은 새로고침 때 초기화될 수 있어 마지막 빈 배열을 예외 미발생으로 해석하지 않는다. 실패 중 이전 저장값 보존과 복구 후 저장값 assertion이 근거다.
