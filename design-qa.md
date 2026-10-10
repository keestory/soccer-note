# Line Matchday refinement — Design QA

Reviewed 2026-10-11 (Asia/Seoul). Scope: the approved refinement of local HEAD `30e254de7f614c646e463e87223f2246391e11a0`, not a replacement design. No commit, push, deployment, database mutation, or native release was performed by this implementation pass.

## Comparison metadata

- Source visual truth path (line language): `/var/folders/g7/b06wm9592y731w_0tkx21bzm0000gn/T/codex-clipboard-lLa9Jd.png` — MY TURN reference, **734 × 1346 pixels**. Source CSS viewport and DPR are unknown; the image includes a photographed device/frame. It is a visual-language reference, not a literal SoccerNote screen specification.
- Accepted SoccerNote source path: `/tmp/soccer-note-design-audit.DjrX5g/01-home.png` — **390 × 844 pixels**, Korean, light theme, FC 행구, latest match 3:2, no upcoming match. Original CSS-width/DPR telemetry was not retained. A pre-change capture was therefore also made with forced CSS metrics: `/tmp/soccer-note-design-refinement.a2LrZS/before-home-390x844.png`, **390 × 844 CSS px, DPR 1**.
- Implementation screenshot path: [final-home-390x844.png](docs/design-qa/2026-10-11-line-matchday/final-home-390x844.png), also `/tmp/soccer-note-design-refinement.a2LrZS/final-home-390x844.png`.
- Implementation URL: `http://127.0.0.1:3989/screenshots/home`; secondary URL: `http://127.0.0.1:3989/design-system`. These are locally rendered Next.js production-build routes. The existing development server on 3988 was left running.
- Viewport: primary **390 × 844 CSS px**, `devicePixelRatio = 1`, screenshot **390 × 844 pixels**. Responsive runs used **320 / 360 / 390 / 430 × 844 CSS px**, all DPR 1, with the corresponding 1:1 screenshot dimensions.
- State: light theme; auth-free, deterministic fixture; Korean default; no real API writes. The fixture shares `HomeHeader`, `HomeFocus`, notification shell and `BottomNavShell` with the dashboard. Its only team-header interaction difference is the absence of a team-switch handler. Dynamic data, authenticated permissions and native safe-area values are not simulated as proof of production behavior.
- Density normalization: accepted home and implementation are placed side by side at 1:1 pixels. The MY TURN image is proportionally resized to **460 × 844 pixels**, with its frame retained and explicitly treated as a mismatch. No pixel-fidelity claim is made between these different products. No screenshot or device chrome is rendered as app content.
- Browser: existing Chrome fallback; Chrome CDP device metrics override, font readiness and DOM measurements. No Playwright was used. IAB was unavailable, and the visible Chrome/CUA path timed out earlier in the run.

## Combined comparison evidence

These are real combined image files, not separate image views. They were opened and inspected, including original-size views and focused crops.

| Purpose | Artifact | Dimensions / interpretation |
| --- | --- | --- |
| Accepted home → implementation | [Full home comparison](docs/design-qa/2026-10-11-line-matchday/final-home-comparison.png) | 804 × 844; source left, implementation right, 24px gutter |
| Line-language reference → implementation | [MY TURN comparison](docs/design-qa/2026-10-11-line-matchday/final-reference-comparison.png) | 874 × 844; framed reference left, web viewport right |
| Typography, metadata, score, grid and CTA | [Focused home comparison](docs/design-qa/2026-10-11-line-matchday/final-home-detail.png) | 1456 × 840; each source crop `(16,80,358,420)` enlarged 2× |
| Actual CSS-width showcase baseline → final | [Design-system comparison](docs/design-qa/2026-10-11-line-matchday/final-design-comparison.png) | 804 × 844; forced 390px baseline left, final right |
| Home responsive structure | [Home 320–430](docs/design-qa/2026-10-11-line-matchday/final-home-responsive.png) | 1572 × 844; widths 320,360,390,430 left to right |
| Showcase responsive structure | [Design system 320–430](docs/design-qa/2026-10-11-line-matchday/final-design-responsive.png) | Same width order, native 1:1 panels |
| Long names and two-digit score | [12:11 responsive](docs/design-qa/2026-10-11-line-matchday/approved-long-comparison.png) | Long Korean team name and unspaced English opponent; no overlap |
| Shared sheet | [Sheet 320–430](docs/design-qa/2026-10-11-line-matchday/approved-sheet-comparison.png) | Final controls, wrapping and bounded form |
| Eight locales | [ko/en_US/en_GB/ja](docs/design-qa/2026-10-11-line-matchday/approved-locales-1-comparison.png), [fr/de/it/es](docs/design-qa/2026-10-11-line-matchday/approved-locales-2-comparison.png) | Four 390px panels per file |

All additional raw captures, comparison iterations and capture scripts are in `/tmp/soccer-note-design-refinement.a2LrZS`. Persisted evidence and measurement JSON are under `docs/design-qa/2026-10-11-line-matchday/`.

## Findings and comparison history

### Iteration 0 — source audit: blocked

- **P1 — Screenshot fixture was not the real dashboard header.** The source used a separate 29px/900 title and 40px top padding; the dashboard used different type/spacing. The fixture also showed 3:2 while its quarters summed to 3:0. Fix: extract shared `HomeHeader`, reuse the actual notification/navigation shells, and derive the fixture total from quarters. Final evidence: full home comparison and the 0:0 / 1:1 / 1:0 / 1:1 grid.
- **P2 — Repeated utility navigation diluted the main action.** A full-size Matches row repeated the primary tab and consumed the same weight as Team operations. Fix: localized, 44px-high `View all` beside the latest-match heading; retain one compact Team row with 64px minimum height. Final evidence: full home and focused comparisons.
- **P2 — Type hierarchy and line contrast were uneven.** Metadata/navigation at 9–11px, widespread 900 weight, overly tracked Korean labels and very faint structural borders competed with the score. Fix: actual loaded 600 weight; titles 26/34, opponents 20/28, body 14/21, metadata/navigation 12/18; selective `--line-strong: #b8c6bc`; 12px card/control radii; 20px/1.7 main icons and 16px/1.7 metadata icons. Final evidence: focused comparison and shared-sheet comparison.
- **P2 — Outcome meaning and localization were incomplete.** Result treatment was not differentiated consistently, and visible `vs` was hardcoded. Fix: localized outcome text with forest/neutral/restrained-loss tokens, localized opponent label and eight `viewAll` translations. Final evidence: locale comparisons and `approved-loss-*` / `approved-draw-*` raw captures.
- **Unconfirmed clipping was rejected as a finding.** `/tmp/soccer-note-design-audit.DjrX5g/02-design-system.png` had a 390px raster but an unverified, wider Chrome CSS viewport. Pre-change forced-320/390 captures showed `scrollWidth === innerWidth` and no overflowing elements. This was not treated as a proven application bug; no `overflow-x:hidden` mask was added. The showcase grid was made shrinkable and labels wrap to remain resilient with the larger typography.

### Iteration 1 — first implementation comparison: blocked

- Full/source comparisons: `iteration1-home-comparison.png`, `iteration1-reference-comparison.png`, `iteration1-home-detail.png`, and responsive comparisons in the evidence directory.
- The preceding fixture, density, typography, line and state findings were resolved.
- **P2 — The first score container breakpoint stacked ordinary 3:2 scores at 320px unnecessarily.** This increased card height without improving readability. Fix: lower the narrow-container fallback from 300px to 260px, while keeping explicit two-digit-score stacking. This was a visual-layout iteration, not a build/capture troubleshooting step.

### Iteration 2 — revised layout comparison: visual issues cleared

- Evidence: `iteration2-home-comparison.png`, `iteration2-home-responsive.png`, `iteration2-design-responsive.png`; final production-build equivalents are linked above.
- At all four widths, ordinary scores remain beside a wrapping opponent, while 12:11 moves to its own row. 4Q remains visible. Team/header text does not collide with profile/notification controls. Section spacing stays 24px and page margins stay 20px.
- No actionable P0/P1/P2 visual mismatch remained within the approved home/showcase scope. Interaction checks remained pending, so this was not the final handoff.

### Iteration 3 — interaction/accessibility check: blocked, then fixed

- **P2 — Sheet focus did not return to its trigger after Escape.** Browser verification reproduced focus falling to `body`: the effect saved `document.activeElement` after the child input's `autoFocus` had already run.
- Fix: capture the opener before the commit, then restore it on sheet cleanup. Retain initial input focus, Tab containment, Escape handling and body-scroll restoration. Align the close icon to 20px/1.7.
- Post-fix evidence: [interaction-results.json](docs/design-qa/2026-10-11-line-matchday/interaction-results.json), the final sheet comparison, [added-player state](docs/design-qa/2026-10-11-line-matchday/interaction-player-added-390x844.png), and [updated-record state](docs/design-qa/2026-10-11-line-matchday/interaction-record-saved-390x844.png).

### Final acceptance comparison: passed within this scope

- Inspected source/implementation full views, focused card/type details, all requested responsive widths, long names/two-digit scores, empty/viewer/upcoming states, semantic outcomes, all eight locales, and showcase Home/Players/Rankings/Formation/Record/Sheet states.
- The final accepted source comparisons preserve the chosen line-based direction while applying the user-approved hierarchy and density changes. They are intentionally not pixel-identical to the old screenshot.
- A late source review added wrapping to Matches team-name and MVP/location metadata. This does not change the accepted home/showcase captures; the final code again passed tests, lint and build. Authenticated Matches/Team runtime verification remains a separate release check.

## Required fidelity surfaces

| Surface | Result and evidence |
| --- | --- |
| Fonts / typography | Noto Sans KR retained for Korean and multilingual UI; 600 is actually loaded and was checked in `document.fonts`/computed styles. 400–900 remain loaded for older routes that still request those weights. Source MY TURN font identity is not asserted. Core titles/opponents now use 600, readable 12px metadata and tabular 48px scores. Korean kicker tracking is .01em; only explicit uppercase English kickers use .1em. Long strings wrap rather than truncate. |
| Spacing / layout rhythm | 20px margins, 24px section gaps, 20px result-card padding, 12px card/button radii, 48px primary CTA and 64px-minimum Team row. Three production tabs remain. The four showcase selectors are internal demonstrations, not primary navigation. Long translated rows may grow beyond 64px intentionally. |
| Colors / tokens | White/canvas/forest palette retained; major boundaries use #b8c6bc, ordinary dividers #dde5df, input boundaries #83968a. Win/draw/loss also have localized text. Calculated examples: white on forest 6.44:1; metadata #62676f on canvas 5.43:1; loss text on its background 5.81:1; input border on white 3.14:1. Decorative dividers are intentionally lighter. These spot checks are not a full accessibility-conformance audit. |
| Image / asset fidelity | No new crest, decorative football art or raster/SVG imitation of MY TURN illustrations was created. The user explicitly requested existing product data/assets only. Football context comes from team/opponent names, quarters, real-route player/formation components and scores. Existing profile initials are functional account fallbacks, not fabricated logos. Standard Lucide UI icons remain vectors. |
| Copy / content | `View all` is translated in all eight locales; existing locale date formatting and permission predicates are retained. New visible and ARIA text is passed through translations. Known fictional names remain fixtures only; design-system identifies itself as in-memory preview data. The default 3:2 total now equals its quarters. |

## Browser, responsive and interaction verification

- [Final primary metrics](docs/design-qa/2026-10-11-line-matchday/final-metrics.json): 8 records, 320/360/390/430px for home and design-system home; all `innerWidth = scrollWidth = bodyWidth`, DPR 1, overflow arrays empty.
- [Additional accepted metrics](docs/design-qa/2026-10-11-line-matchday/approved-all-metrics.json): 40 records covering seven home stress/outcome states and Sheet at all four widths, plus eight locales at 390px; the same width/DPR/overflow checks pass.
- Additional showcase captures: `/tmp/soccer-note-design-refinement.a2LrZS/states-{players,formation,record,ranking}-{320,360,390,430}x844.png`; inspected together in each `states-*-comparison.png`. All measured CSS widths fit without horizontal scroll. Sheet was recaptured after its fix as `approved-sheet-*`.
- Twelve interaction assertions passed: Sheet opens/focuses name; name-only submission enables; add updates roster; name search finds the addition; forward Tab stays in Sheet; Escape closes and restores trigger focus; ArrowRight moves the selected player; Undo restores position; formation confirmation appears; quarter increment aggregates to 4:2; record confirmation appears; Home reflects the updated total.
- Console/error checks: final primary batch, 40-record additional batch and interaction run reported no errors. An earlier showcase run logged one `/favicon.ico` 404, confirmed separately; no application exception accompanied it. This existing polish issue is not hidden.
- Capture-quality note: wide image previews occasionally appeared to omit repeated thin controls. Original-size inspection and an RGB hash comparison between a source PNG and the corresponding combined-image crop proved identical pixels (viewer-390 sample). These preview artifacts did not prompt application CSS changes. Raw files and focused views take precedence over scaled previews.

## Automated verification

- `git diff --check`: passed.
- `npm test`: **8 files / 41 tests passed**, repeated after the final code change.
- `npm run lint`: exit 0, **0 errors / 71 existing warnings**. No unrelated warning cleanup was included.
- Placeholder-environment `npm run build`: passed, including TypeScript and 46 static pages. Required placeholder variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. An initial build without the service-role placeholder failed at `/api/upload`; adding the non-secret local placeholder allowed the full build to complete. This does not validate production credentials or API connectivity.
- Existing build warnings remain: React 18 deprecation under Next 16, outer package-lock/root warning, Tailwind config module-type warning and absent local Firebase Admin environment. These are not new visual regressions.

## Open questions / release boundary

- Actual authenticated `/dashboard`, `/matches`, `/team`, team switching, all role combinations, real API persistence and existing-player linking were not exercised with a real account in this pass. Shared-component fixture rendering is not proof of those flows. Permission conditions and routes were preserved in code, not broadened.
- Native iOS safe areas, on-screen keyboard, screen reader output, 200% text scaling/zoom and physical-device behavior need separate checks. Do not claim full WCAG compliance or a native release pass.
- The unrelated Expo source was not changed. No production deploy, App Store submission, remote-branch claim or data migration is part of this result.

## Follow-up polish (P3)

- Repair the existing favicon request and plan the separate legacy lint/dependency-warning cleanup.
- Consider variable-font/payload optimization later, with performance measurements; do not remove weights still used by older routes without migrating them.
- Add a real team crest only when real authorized assets exist. No placeholder crest is needed to complete this design.

## Implementation checklist

- [x] Shared dashboard/QA header and corrected score fixture.
- [x] One primary CTA, compact Team row and localized View all.
- [x] Core typography, selective line hierarchy, outcomes and icon consistency.
- [x] True CSS-width checks at 320/360/390/430; long names, two-digit scores and eight locales.
- [x] Shared Sheet focus repair and primary showcase interactions.
- [x] Combined full-view and focused-region artifacts inspected.
- [x] Final diff check, tests, lint and placeholder build.
- [ ] Separate authenticated/production/native release verification by the release owner.

final result: passed
