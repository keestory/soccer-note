# Previous-quarter selected-player import: independent browser QA

**22/22 scenarios passed** against product commit `41a4958e8cb46319ed168534edaa999b7fce3cf4`, local production build `7-KgWrDkQQ1lvIHgToQO3`. The final run began at `2026-11-04T15:06:02.092Z`. This is synthetic browser evidence, not production database or real-user evidence.

CQO 반다이크 is this independent QA worker's role alias, not participation by the football player. Product implementation, independent code review, unit/lint/type/build checks and deployment are separate release-owner evidence.

## Reports and source provenance

- [Final browser report](after/browser-results.json): full suite, no case filter, 22 passes. Zero page errors, unexpected requests, unexpected console errors and cleanup warnings. Three expected HTTP 500 responses were injected for target-check failure, save failure and lost acknowledgement.
- [Before report](before/browser-results.json): one baseline capture on cached build `sMT-dOg3oD3u2jcyhbPFq`, source HEAD `46e4b1419a439147d5821adb8a38058ed863516d`. The release owner identified its product source as prior production `8ba405ef24d521fc186562dda6ad3d2455e6f489`. Newly created helper files on disk were not part of that cached build.
- [First acceptance run](after-first-run/browser-results.json): preserved negative receipt, 21 passed and one harness selector failed. This is not the final acceptance result.
- [Runner](../../../scripts/qa-quarter-import.mjs): executed runner blob `4e936ec7028141cea483564f3200a5d4c2dc4690`. A subsequent font-source metadata correction does not change its cases or assertions. The final run had harness/document changes in the working tree and no product changes; its JSON preserves those paths.

| Product file | Tested blob |
| --- | --- |
| `src/app/match/[id]/quarter/[q]/page.tsx` | `fa729c8eee869d99800d497380f934b84001cf52` |
| `src/lib/quarter-import.ts` | `32f82f5d906435aaadc3c7f844b2f53c2996a200` |
| `src/lib/quarter-import-copy.ts` | `f8c7007d58bba955ae9f873e99d2d14d873c6ab0` |
| `src/components/design/Sheet.tsx` | `c17bdc42fd3aca6d8646b2ae9afbec8cd0da5b80` |

Font provenance: the release owner reused CSS and 746 WOFF2 assets from the cached pre-feature build through `/tmp/soccer-import-fonts/responses.cjs`. No font package or product dependency was added. The shared fixture's generic historical “Fontsource mirror” label was inaccurate for this run. The final report and runner override it; preserved before/first-run reports retain their original fields and must be read with this correction.

## Coverage

The final report enumerates all 22 cases. They cover:

- Default zero selection; recorded-player wording; known OUT/IN events without final-lineup inference.
- Selected IDs/position types/unchanged numeric coordinates only; explicit Save all; source immutable; goals, assists, rating, clean sheet, contribution, notes, media, substitutions and original row IDs absent from the new saved record.
- Existing saved target and manual draft entry blocked; apply rechecks current visible target rows; occupancy and check failure do not change the draft.
- Duplicate/conflicting player rows, missing roster, ineligible attendee, invalid numeric values and unsafe edges disabled with reasons. Exact selected-coordinate collisions block apply without relocation. Boundaries x=8/92 and y=10/90 remain unchanged; 0/100 are refused.
- Same-tick repeated apply, delayed cancelled response, reopen, Escape/focus return, browser Back, actual app-router quarter/match navigation, dashboard team switch, account switch and logout.
- Imported draft stay/discard, save failure, and synthetic committed-write/lost-acknowledgement retry with one server row and stable synthetic identity.
- 320px keyboard selection, visible focus, 44px enabled controls, focus containment including pending Apply Tab/Shift+Tab, and arrow-key adjustment of the preview. English, French and unsupported-language English fallback remain usable.

Route-change tests use existing application links and browser Back. A URL-only `history.pushState` is not treated as proof of a new dynamic route context. No source fields are inferred as a final lineup.

## Screen comparison

- Before: [empty second quarter](before/390-empty-quarter2.png), [manual player selection](before/390-existing-manual-player-selection.png).
- After: [entry](after/390-empty-quarter2.png), [zero-selected recorded players](after/390-recorded-players-zero-selected.png), [unsaved imported draft](after/390-imported-unsaved-draft.png).
- Boundaries: [invalid source reasons](after/390-invalid-source-records.png), [320px keyboard selection](after/320-keyboard-selected.png), [320px adjusted draft](after/320-keyboard-adjusted-draft.png), [English fallback](after/390-unsupported-selected.png), [French](after/390-fr-selected.png).

Visual inspection confirmed readable source/unsaved wording and an explicit Save all boundary in the inspected 390px views, plus visible keyboard focus at 320px. Final captures record CSS widths 320/390, height 844, DPR 1, loaded fonts and document scroll width equal to viewport width. Checkbox labels and enabled sheet buttons meet the measured 44px minimum. The invalid-record list scrolls; the screenshot does not imply every record fits in one viewport.

## Harness corrections and negative evidence

1. The originally supplied `/tmp/soccer-note-browser` module was absent. The first process stopped at module import before launching a browser. Existing installed Playwright and Chromium were used instead; no package, credential or service was installed.
2. Installed Next router source showed that direct `history.pushState` preserves the route tree. Before acceptance execution, navigation cases were changed to real navigation and existing links.
3. First acceptance case 18 selected a name shared by the existing ConfirmSheet close icon and footer. Playwright strict mode rejected the ambiguity. The corrected selector targets the text-bearing footer; no product change was needed.
4. That run intercepted and blocked six attempts to display fictional `example.invalid/old-media` after returning to existing match views. No external host was contacted. The final fixture fulfills only that exact QA image URL with an in-memory PNG. All auth, data, write and media responses remain synthetic.
5. The final harness sets navigation timeout to 30 seconds before the shared fixture's first page, with action/assertion timeout 10 seconds. These bound local asset-loading waits and are not performance targets.

The reviewer's pending-focus concern was checked against the engineer's footer Cancel/focus handling in the same product commit. Pending Tab and Shift+Tab remained inside the sheet. The shared Sheet component itself was unchanged.

## Reproduce

```sh
SOCCER_QA_BASE_URL=http://127.0.0.1:3128 \
SOCCER_QA_PLAYWRIGHT=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs \
SOCCER_QA_OUTPUT=docs/design-qa/2026-11-04-quarter-import/after \
node scripts/qa-quarter-import.mjs
```

The release owner must start the verified local production build first. `--before` is reserved for the previous cached build. `SOCCER_QA_CASE` permits diagnostic subsets, which are explicitly not full-suite passes. The runner enforces the exact loopback origin and closes its contexts/browser on completion; setup failure also closes the created fixture.

## Limits

- Synthetic upsert and lost-acknowledgement responses demonstrate client behavior in these scenarios. They do not verify production uniqueness, RLS, database writes, deletion policy, multi-client atomicity or real-network response loss.
- The fresh target read checks visible rows at apply time, not a server lock. A concurrent write after that check is outside the feature's guarantee. Source and roster facts are loaded snapshots.
- No production request, real-user record, outreach, model CLI, paid API or native-device test was performed by this QA task. User value, adoption, time savings, retention and growth remain unmeasured.
- No browser QA blocker remains for the inspected product version. Deployment, free-tier verification and public read-only live checks remain separate release-owner steps.
