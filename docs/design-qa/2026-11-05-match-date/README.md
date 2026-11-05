# New-match local calendar date: independent browser QA

**18/18 acceptance scenarios passed** on product commit `90398f1822cddc665d3d18f26d7fc12cc46229c2`, local production build `RhpQn8IX3tuCX7iF2qVF6`. Observation began `2026-11-05T02:11:25.730Z`.

[Final browser report](after/browser-results.json) · [QA runner](../../../scripts/qa-match-date.mjs) · [Work card](https://app.notion.com/p/40f66b33db7a81698851ca52dc557c1f)

CQO 반다이크 is the independent QA role alias, not participation by the football player. All authentication, API responses and creates were synthetic and stayed in browser-route fixture memory. These results do not verify production database writes or real-user outcomes. The release owner owns implementation, code review, unit/lint/type/build checks, cost/deployment checks and production evidence separately.

## Provenance

| Item | Observed value |
| --- | --- |
| Product source HEAD | `90398f1822cddc665d3d18f26d7fc12cc46229c2` |
| Build ID | `RhpQn8IX3tuCX7iF2qVF6` |
| `src/app/match/new/page.tsx` blob | `9fcfe8634ec72e3a395503987379f810581c5c97` |
| `src/lib/match-date.ts` blob | `cf1558fbcc83d496c4ced79d23b10fffd8314151` |
| Executed runner blob | `0a12ad4a127f3055ca6de4b049d9d3e85caade14` |
| Product tree at run | Clean; only the new QA runner was untracked |
| Runtime | Existing installed Playwright and Chromium, loopback `127.0.0.1:3128` |
| Time control | Fixed browser time before first navigation, per-context IANA timezone; server clock unchanged |
| Font source | Cached pre-feature build CSS and 746 WOFF2 assets through `/tmp/soccer-date-fonts/responses.cjs`; no dependency installation |

The [original investigation](../2026-11-05-match-date-reproduction/browser-results.json) and its runner/screenshots remain unchanged. Its six investigation cases observed two wrong UTC-derived defaults at KST 00:30 and Los Angeles 17:30; all six manual selections survived subsequent edits. It used old build `7-KgWrDkQQ1lvIHgToQO3`, repository HEAD `54e18d11571b7b0b77e32fee61061e546d90d443`. Investigation success meant the problem was reproduced, not that the product passed.

Intake: S1 bounded existing-flow QA. Discoverability, store compliance and competitive benchmark are not applicable to the date-only correction: no public route, data field, permission, SDK, purchase or product-positioning change.

## Acceptance results

| Case | Result |
| --- | --- |
| 01 kst-0030-boundary: default and manual date preservation | PASS |
| 02 la-1730-boundary: default and manual date preservation | PASS |
| 03 utc-0030-control: default and manual date preservation | PASS |
| 04 kst-1230-control: default and manual date preservation | PASS |
| 05 la-1030-control: default and manual date preservation | PASS |
| 06 utc-1230-control: default and manual date preservation | PASS |
| 07 kst-month-start: default and manual date preservation | PASS |
| 08 la-month-end: default and manual date preservation | PASS |
| 09 kst-year-start: default and manual date preservation | PASS |
| 10 la-year-end: default and manual date preservation | PASS |
| 11 kst-leap-day: default and manual date preservation | PASS |
| 12 la-leap-day: default and manual date preservation | PASS |
| 13 direct KST year-boundary hydration and default-date create | PASS |
| 14 direct LA leap-day hydration and explicit-date create | PASS |
| 15 physical double-click sends one request while create is pending | PASS |
| 16 failure before commit preserves fields and retry succeeds once | PASS |
| 17 cancel through header and browser Back before submit writes nothing | PASS |
| 18 320px and 390px labels, keyboard order and layout | PASS |

The twelve time cases include the original six plus KST/LA month, year and leap-day boundaries. Each first asserts the browser timezone, instant and local date, then the actual date input. Each selects `2028-03-02`, edits the opponent/location, advances the fixed browser clock by one day and triggers another render; the manual date remains unchanged and no write occurs.

The two direct-document cases inspect the ready, hydrated input after direct `/match/new` navigation, using browser dates different from the server's unchanged current date. KST renders `2027-01-01`; LA renders `2028-02-29`. The raw initial SSR HTML input value and first-paint transition were not separately captured. No page errors or console hydration errors were observed.

## Exact synthetic writes

Five intercepted POST attempts occurred across four isolated creation fixtures, producing four in-memory rows:

| Case | Posted date | Attempts / synthetic commits | Result |
| --- | --- | --- | --- |
| KST direct default creation | `2027-01-01` | 1 / 1 | Default preserved; opponent/location trimmed |
| LA direct manual creation | `2028-03-02` | 1 / 1 | Explicit selection preserved; blank location sent as null |
| Physical double-click and pending click | `2026-11-05` | 1 / 1 | Submit visibly disabled during held response |
| Server failure before commit, then retry | `2028-03-03` | 2 / 1 | First response 500 without a commit; second request has identical fields |

The report includes each exact mocked request body and outcome. The writes contain only `team_id`, `opponent`, `match_date` and `location`. Header-back and browser-Back exits before submit produce zero writes. The double-click case uses actual mouse events and a further click while disabled, not synthetic form-submit bypasses.

**The failure case does not test an unknown response after a successful commit and does not prove retry idempotency.** It establishes only that a confirmed synthetic failure before commit preserves the input and permits the observed retry. No broad duplicate-prevention guarantee is claimed.

## Mobile and accessibility observations

- At 320px and 390px, all fields have associated labels and stay within the viewport. Document scroll width equals viewport width.
- Actual computed input font size is 16px and input height 44px, despite a smaller utility class in the source; the global CSS applies. The earlier source-only concern about these sizes was not reproduced.
- Keyboard navigation reaches opponent, the native date control/segments, location and submit. Manual date is retained. Submit has visible solid focus and a height of 54.5px.
- **Preexisting limitation:** the header back link has no accessible name and measures 36×36px at both widths. It was not changed by this date fix and is recorded for follow-up. This report is not a full accessibility-compliance claim.
- Mobile evidence is headless Chromium with CSS viewport 320/390×844 and DPR 1. Native date-picker rendering, screen-reader use and physical iOS/Android devices were not tested.

## Screen evidence

- KST boundary: [before](../2026-11-05-match-date-reproduction/kst-0030-boundary.png) → [after](after/kst-0030-boundary.png).
- LA boundary: [before](../2026-11-05-match-date-reproduction/la-1730-boundary.png) → [after](after/la-1730-boundary.png).
- [Pending disabled create](after/390-pending-create-disabled.png), [input after failed create](after/390-create-failed-input-preserved.png).
- [320px labels and keyboard focus](after/320-labels-keyboard-manual-date.png), [390px labels and keyboard focus](after/390-labels-keyboard-manual-date.png).
- Year/leap screenshots are included alongside the browser report. The native date display format in these screenshots is browser-controlled; assertions use the date input's ISO calendar value.

Visual inspection confirmed the corrected KST/LA dates, preserved failure-case input and visible submit focus at 320px. It does not establish growth, retention, time savings or production data correctness.

## Reproduce

The release owner starts the verified local production server first. No new packages, credentials or services are needed.

```sh
SOCCER_QA_BASE_URL=http://127.0.0.1:3128 \
SOCCER_QA_PLAYWRIGHT=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs \
SOCCER_QA_OUTPUT=docs/design-qa/2026-11-05-match-date/after \
node scripts/qa-match-date.mjs
```

`SOCCER_QA_CASE` permits a diagnostic subset, which is explicitly not a full-suite pass. Navigation is bounded at 30 seconds; actions/assertions at 10 seconds. The suite closes its contexts and browser, including setup-failure cleanup.

## Outcome and limits

The first acceptance run passed all 18 cases without a product or harness correction. Page errors, unexpected requests, unexpected console errors and cleanup warnings were zero. One expected HTTP 500 was deliberately injected. No new create-flow blocker was observed in the requested scope.

No production DB/RLS access, remote service write, model CLI, paid API, credentials change, commit, push or deployment was performed by this QA worker. The preserved original reproduction and the final acceptance evidence remain distinct. Production behavior, free-tier conditions and release/rollback evidence belong to the release owner's separate artifacts.

## Release owner follow-up

The same product SHA reached production READY at `2026-11-05T02:16:28Z`, deployment `dpl_6rHZ5swbN8un8GuPp5nBsBYFRkSe`. Exact Git SHA, production alias and Vercel status were checked separately from this synthetic browser run. [Release record](../../MATCH_DATE_2026-11-05.md), [static verification](verification.json), [deployment evidence](production-deployment.json), and [observed discussion](../../AGENT_DISCUSSIONS.md#2026-11-05-실제-5역할-협의--날짜와-저장-안내) preserve the distinct evidence. Public production UI was not retried after the existing cloud CONNECT403 limitation; no production database writes or real rollback transition were performed.

A subsequent coordinator-supplied report from a separate authorized cloud CUA worker observed public onboarding and login at 1180×757 from `2026-11-05T02:20:38Z` to `02:21:44Z`. This was read-only, with no input, login or production data writes. Live mobile inspection was unavailable, and the authenticated date field was not checked. [The release follow-up](../../MATCH_DATE_2026-11-05.md#후속-공개-ui-관측--별도-허용된-클라우드) records the source, limited log sample and alias recheck separately. The original executor's CONNECT403 was not retried; these observations do not alter the synthetic 18-case report.
