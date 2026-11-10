# Match-list load errors: independent browser QA

**21/21 acceptance scenarios passed** on product commit `e7b50d5043149cbecbdfedb2760ff49fc1ecedc4`, production build `Dpvc3wJRetRWag672znXw`. The first acceptance run began `2026-11-06T01:50:04.368Z` and passed without a product correction or assertion retry. Case 21 contains eight supported locales and one unsupported-locale fallback; these are variants within that case, not additional top-level scenarios.

[Final browser report](after/browser-results.json) · [Executed runner snapshot](after/attempt-2026-11-06T01-50-04-367Z/runner.mjs.txt) · [Reusable runner](../../../scripts/qa-match-load.mjs) · [Work card](https://app.notion.com/p/41066b33db7a8186a786eb5c683deddb) · [Release record](../../MATCH_LIST_LOAD_2026-11-06.md) · [Observed council](../../AGENT_DISCUSSIONS.md)

CQO 반다이크 is the independent QA role alias, not participation by the football player. The real local production-build UI ran with synthetic authentication and in-memory reads. **All write methods were blocked; no synthetic or production writes were attempted.** No production origin or database was contacted. The release owner separately owns source implementation, independent code review, unit/lint/type/build verification, cost checks, deployment and production evidence.

## Provenance and method

| Item | Observed value |
| --- | --- |
| Product source HEAD | `e7b50d5043149cbecbdfedb2760ff49fc1ecedc4` |
| Build ID | `Dpvc3wJRetRWag672znXw` |
| `src/app/matches/page.tsx` blob | `4415b75b3bfc73d7350c7f0ccb0bbec66cc1487b` |
| `src/lib/match-load-copy.ts` blob | `b51bf7454c7f0451002e1660aa59848b0549c061` |
| Executed runner blob | `d4a690a058a0dd626d3576a759fecce5eabfb750` |
| Final reusable runner blob | `220b2e955a189e7a886fa5a28a7f2e23c5ac6e12` |
| Runtime | Existing installed Playwright and `/usr/bin/chromium`; loopback `127.0.0.1:3128` only |
| Screenshots | 320×844 and 390×844 CSS viewport, DPR 1; actual document widths recorded |
| Fonts | Existing cached CSS/746 WOFF2 assets used by the release-owner build; fonts loaded in captured pages; no dependency installation |
| Working tree | Product files matched the supplied final blobs; parent-owned documentation changes and this new QA runner were preserved |

The full run's exact runner is archived alongside its report. After execution, two unused local bindings were removed from the reusable runner to eliminate two lint warnings; assertions, interactions and case selection did not change. `node --check` and focused ESLint passed after that cleanup. The archived executed blob remains the source of truth for these browser observations. No second acceptance run is claimed.

The wrapper intercepts all API/auth traffic, allows only the exact local web origin, blocks non-GET/HEAD/OPTIONS requests and supplies synthetic read failures. Every fixture checks zero writes. Held responses expose loading state and race boundaries without real server side effects. Contexts and browser are closed; no cleanup warning occurred. No model CLI, external paid API, new credential, permission or installation was used.

Intake: S1 bounded existing-flow QA. Discoverability, store compliance and competitive benchmark are not applicable to this authenticated error-state correction: no acquisition route, SDK, data field, purchase or market-positioning change.

## Acceptance results

| Scenario | Result |
| --- | --- |
| 01 cold team-list failure hides zero totals and retries | PASS |
| 02 cold membership failure hides empty state and retries | PASS |
| 03 cold match-data failure remains retryable on Matches | PASS |
| 04 retry fails again then succeeds without false empty state | PASS |
| 05 cached record stays labeled during failure and recovery | PASS |
| 06 cached empty result is labeled as previous data | PASS |
| 07 same-team match-data failure labels cached records | PASS |
| 08 normal nonempty list retains statistics and detail links | PASS |
| 09 normal empty list retains authorized create action | PASS |
| 10 browser mouse double-click makes one pending retry and keeps cache | PASS |
| 11 browser Back during pending retry ignores late UI completion | PASS |
| 12 account handoff ignores late failed old-account retry | PASS |
| 13 logout during pending retry cannot restore old list | PASS |
| 14 successful team switch keeps title and rows consistent | PASS |
| 15 failed other-team selection keeps confirmed A list | PASS |
| 16 canceled team switch and late response keep confirmed A | PASS |
| 17 320px Korean keyboard retry, focus and touch target | PASS |
| 18 320px German cached warning wraps without overflow | PASS |
| 19 existing local-date default and manual selection regression | PASS |
| 20 pull retry joins a failing automatic load without rejection leakage | PASS |
| 21 eight supported locales and unsupported-locale fallback | PASS |

Cold team-list, membership and match-data failures show an alert and retry instead of unconfirmed zero totals or the normal empty result. Confirmed cached one-record and zero-record results stay visible with explicit previous-data wording. A failed switch to another team does not mark the still-confirmed A result as failed. Successful/canceled/failed team changes, account handoff and logout preserve the observed identity/data boundary.

During a held retry, the card stays present with `role=status`, `aria-busy=true` and `aria-disabled=true` on the focusable retry button. An actual browser mouse double-click, a further mouse click, Enter and Space produced exactly **one** lookup while pending. This is automated browser input, not a physical-device test. The old cached record stayed present. Repeated failure kept the retry usable; later success removed the notice.

The joined-load case aged the client cache, entered `/matches` while its automatic request was held, then dispatched a synthetic touch sequence through the actual `PullToRefresh` handlers. The retry joined that **one** request. Its injected HTTP 500 produced a retryable cached-error UI with no unhandled page error. It does not prove physical touch behavior or every network failure mode.

Browser Back during a pending retry stayed on the dashboard after the response; account handoff kept B and logout kept the signed-out destination. These cases do not prove cancellation of every transport operation; they establish the observed UI outcomes. The local-date smoke check retained Nov 6 at KST 00:30 and preserved explicit `2027-02-03` after another field edit; no create was submitted. The prior comprehensive date QA is not claimed to have been rerun.

## Mobile, focus and accessibility observations

- The new retry control is keyboard reachable with a visible 2px solid focus outline. At 320px it is 238×48px; the German retry is also 238×48px and stays within the viewport.
- Failure retains focus on the retry button. Same confirmed-team successful retry moves focus to the page heading when that retry button still owns focus. The keyboard failure and same-context success assertions passed.
- Initial no-team → first confirmed-team success replaces the keyed content and leaves focus on the body; it does not force focus into a different context. This is an explicit limitation accepted by the release owner and its code/UI reviewers, not a claim of ideal cross-context focus restoration. The new control itself was verified reachable by Tab.
- Error versus pending announcements use `alert` versus `status`; busy and disabled semantics were inspected. The eight supported translations and unsupported saved-locale fallback rendered readable retry labels. This is DOM/keyboard evidence, not screen-reader certification.
- The new error text and stale-data explanation wrap at 320px in Korean and German. No document horizontal overflow occurred at either captured width. The existing German four-column statistics have tightly packed long labels (`Unentschieden`/`Niederlage`) at 320px; that unchanged statistics layout is a separate preexisting follow-up, not a failure of the new error card.
- Headless CSS viewports are not physical iOS/Android devices. Native wrappers, screen readers, short-height landscape, real authentication and production reads/writes were not tested.

## Before and after

The [original investigation](reproduction/README.md) used old product `90398f1822cddc665d3d18f26d7fc12cc46229c2` and build `RhpQn8IX3tuCX7iF2qVF6`. Its five observations reproduced cold-failure false emptiness and missing cached-failure guidance; investigation completion was **not** product acceptance. Its original first harness assertion mismatch and correction remain under `reproduction/initial-harness-*` and are distinct from this first passing acceptance run.

- Cold initial failure: [before](reproduction/cold-failure-390.png) → [after](after/attempt-2026-11-06T01-50-04-367Z/390-cold-error.png).
- Cached failure: [before](reproduction/cached-failure-390.png) → [after](after/attempt-2026-11-06T01-50-04-367Z/390-cached-error.png).
- Genuine empty result: [before](reproduction/normal-empty-390.png) → [after](after/attempt-2026-11-06T01-50-04-367Z/390-normal-empty.png).
- [Pending retry with cache](after/attempt-2026-11-06T01-50-04-367Z/390-cached-retry-pending.png).
- [320px Korean keyboard focus](after/attempt-2026-11-06T01-50-04-367Z/320-cold-error-keyboard.png).
- [320px German cached-error copy](after/attempt-2026-11-06T01-50-04-367Z/320-de-cached-error.png).

CQO visually inspected cold, cached, pending, Korean-focus and German screenshots. The independent CDO's review is recorded by the release owner separately; this document does not invent its verdict.

## Outcome and limits

21 top-level scenarios passed; page errors, unexpected requests, unexpected console errors and cleanup warnings were zero. **27 intentionally injected HTTP 500 console entries** are separated in the JSON. All synthetic/production write counts and write attempts were zero. No new blocker was demonstrated in the requested scope.

This evidence does not establish incident frequency, user demand, growth, fresh production data, database/RLS correctness, persistence guarantees, model identity, host billing, free quota or deployment/rollback success. Source and browser acceptance are separate from release-owner deployment evidence. This worker made no commit, push, PR change, deployment or production request.

## Reproduce

The release owner must first start the matching verified production build at loopback 3128 and supply the exact source SHA. The runner rejects a different HEAD or origin. Existing installed dependencies suffice.

```sh
SOCCER_QA_BASE_URL=http://127.0.0.1:3128 \
SOCCER_QA_PLAYWRIGHT=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs \
SOCCER_QA_SOURCE_SHA=e7b50d5043149cbecbdfedb2760ff49fc1ecedc4 \
node scripts/qa-match-load.mjs
```

Every execution preserves an `after/attempt-*` report and screenshots. `SOCCER_QA_CASE` permits a diagnostic subset and explicitly prevents a full-suite pass claim. Later documentation-only HEADs require an explicit source/build verification by the release owner before choosing the supplied SHA. Navigation is bounded at 30 seconds and actions/assertions at 10 seconds.
