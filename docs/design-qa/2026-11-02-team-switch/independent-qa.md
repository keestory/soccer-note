# Team context independent browser QA — 2026-11-02

Status: **POST-REVIEW LOCAL SCOPE PASS — team-context 12/12 and existing quarter-save 8/8**. Both final runs have zero page errors, unexpected requests, unexpected console errors and cleanup warnings. The rebuilt fix also passes the previously missing old-write/new-account-initialization interleaving for both player and quarter writes. All work ran in the cloud container. This is not a deployment, live-database or physical-device acceptance claim.

## Isolation and reproduction

The QA fixture uses fictional teams, players, matches and accounts. Every Supabase/auth and application API request is intercepted in the browser. Unknown endpoints fail closed. Only same-origin GET/HEAD documents and static assets reach the application. Service workers are blocked. No database query, production write, credential change or real user metric is part of this QA.

```sh
SOCCER_QA_BROWSER=/usr/bin/chromium node scripts/qa-team-switch.mjs
SOCCER_QA_BROWSER=/usr/bin/chromium SOCCER_QA_OUTPUT=docs/design-qa/2026-11-02-team-switch/local/quarter-regression node scripts/qa-quarter-save.mjs
```

The tested local production server ran at `http://127.0.0.1:3127` with synthetic Supabase configuration. The build owner used `npm run build -- --webpack`; cloud Google-font egress was blocked, so the repository QA helper `scripts/qa-font-responses.cjs` supplied a test-only Fontsource mirror of the existing Noto Sans KR and Bebas Neue families through `NEXT_FONT_GOOGLE_MOCKED_RESPONSES`. Fontsource is installed outside the repository. Product source/dependency/font choices were not changed for the mirror. This local bundler/font setup is distinct from a normal hosting build. Screenshots await `document.fonts.ready` and record computed family and face status. Used primary faces loaded; unavailable local fallback faces and unused subsets are recorded separately rather than hidden.

The restarted post-review server served Next build ID `LGZgaQM3qLvAVWMbGHyBB`. [Build identity](local/build-identity.json) records the SHA-256 manifest for all 119 `src/` files (`ab3d56c6cfcda1c6193a8dbec8984f495d606b2569ba12ed5907eab79e57391a`) and package/lockfile hashes. This identifies the tested uncommitted tree without inventing a Git release commit.

The browser library is installed separately at `/tmp/soccer-note-browser/node_modules/playwright/index.mjs`, configurable with `SOCCER_QA_PLAYWRIGHT`. Final PASS requires all expected cases, no unexpected API requests, no page/unexpected console errors, and no cleanup warnings. The previous release's stored evidence is preserved; its rerun results live in this release's `local/quarter-regression/` directory.

The exact public alias can be tested only with both `SOCCER_QA_BASE_URL=https://soccer-note-hazel.vercel.app` and `SOCCER_QA_ALLOW_PRODUCTION_FIXTURE=1`. This still intercepts all data requests; it tests deployed UI assets rather than operational database/RLS behavior.

## Acceptance groups

1. A → B commits team identity, records, browser cache and permission cache together; prior confirmed A remains during delay.
2. Slow B followed by fast C cannot overwrite C when B completes.
3. Failed B retains A and supports explicit retry.
4. Cancel, close, Escape and browser Back invalidate pending selection; focus returns where appropriate.
5. A superseded failure cannot damage C or reopen an error.
6. Logout and account change invalidate pending team work and old caches.
7. An old-team player-save response cannot populate the new team.
8. Same-team refresh during player save preserves the pending draft and reconciles acknowledgement without stranded busy state.
9. An old-account quarter-save response cannot repopulate the old account or show false success in the new context.
10. German 320px / Korean 390px long-name selector and error states: viewport, overflow, target size, dialog semantics and keyboard focus.
11. Acknowledged player insert followed by failed member-link update retries only the link, without another player insert.
12. The old account's player/quarter write finishes while the new account's initial team read is held; releasing that read must complete the new account without retry/navigation recovery.

The first-release quarter-save harness retains its eight preservation/retry/acknowledgement regressions.

## Results and artifacts

- [Team-context final machine report](local/browser-results.json): all 12 groups passed. Each group may contain multiple actions, including all four cancellation routes, both save/refresh completion orders, and old player/quarter write completion during a new account's initialization.
- [Quarter-save regression report](local/quarter-regression/browser-results.json): all eight original groups passed, including failed/lost responses, explicit removals, upload/substitution locking and German 320px.
- [Corrected pending state, German 320px](local/pending-de-320.png) and [corrected failed state](local/failed-de-320.png): true CSS viewport 320×844 at DPR 1. Pending/error paragraphs both have `clientWidth=scrollWidth=272`; text rectangles remain inside the Sheet. The page width is 320.
- [Player save during same-team refresh](local/player-save-refresh-390.png): draft remains visible and disabled while pending; acknowledgement closes the form and updates the cache. A separately delayed refresh response after a completed write cannot restore the old player name.
- [Initial load failure](local/initial-load-failed-390.png): no team is committed until retry succeeds.
- [Member-link failure](local/member-link-failed-390.png): one player insert and two link attempts; the acknowledged player ID is reused.
- [Long selected team name](local/selected-long-320.png): wraps without horizontal overflow; the existing tall sticky header for very long names remains a nonblocking usability follow-up.

The initial harness execution had strict-selector collisions with Next's empty route-announcer `role=alert`, an incomplete synthetic `TouchInit`, and a missing fixture `quarter_record.player` relation. After those fixture corrections, all product assertions passed but the fail-closed network gate detected the existing match-detail `GET match_mom_votes` after an account-change redirect. That known read now receives an empty synthetic response. No request escaped to a real data API. [First](local/harness-first-attempt.json) and [second](local/harness-second-attempt.json) attempts are retained as test-harness debugging receipts, not product regression findings.

The subsequent independent review found that the earlier 11-group suite had not required completion when an old write's `finish()` ran **during** the next account's first read. The global write revision could invalidate that read and strand initialization. The product fix scopes completion invalidation to the still-current context and includes unit regression coverage. Group 12 holds the new account's first team response, releases the old write and waits for its HTTP completion plus two rendering turns, then releases the new read. It requires a persisted new-account team snapshot before any navigation, so a later page visit cannot hide a retry-based recovery. Both player and quarter variants passed. The earlier 11/8 artifacts are preserved under [pre-review](pre-review/README.md); they are superseded by the final 12/8 reports.

Production UI verification remains separate. At this QA handoff the public Vercel URL was reported inaccessible from this container's network, and no new deployment or deployed-browser success is asserted here.

## Limits

These synthetic cases cannot establish live Supabase RLS, real OAuth provider operation, physical iOS/Android behavior, screen-reader speech, cross-device conflicts or business impact. The earlier management API denial for `qfbfkgbqmeqgwnbdphlm` is respected; it is not retried or bypassed. Actual metrics remain unknown/blocked.

## Preview defect receipt

Current development-tree screenshots were captured at 390px Korean and 320px German. They are **not** final production-build acceptance. In [the original error screenshot](preview/failed-320.png) and [pending screenshot](preview/pending-320.png), the long unbroken German team name clips horizontally. `document.scrollWidth` still equals 320 because the Sheet clips its overflowing content. The engineer added wrapping to pending/error status text; final QA measures each status paragraph's `scrollWidth/clientWidth` and rendered text rectangles as well as page width. Corrected states passed. The original preview capture is preserved as negative evidence.

A development-server attempt while implementation was actively edited hit an intermediate syntax error and produced no usable screenshots; it is excluded from release evidence.
