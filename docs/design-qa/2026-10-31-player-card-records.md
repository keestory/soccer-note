# Five player-card records — 2026-10-31

The approved card now shows appearances/goals/assists in row one and clean sheets/contribution in row two. The original portrait fade, header spacing and fixed shield caps remain. All five numbers have equal emphasis; labels may wrap while numbers align at the top of each row.

## Record contract

Input and storage are player-by-quarter. The shared helper counts clean-sheet checks and adds numeric contribution values to one decimal place; appearances count distinct played matches with a record. It does not infer a clean sheet from the score or convert contribution values to booleans. For two quarters with checks and contributions 1/2.5, the result is appearances 1 / clean sheets 2 / contribution 3.5.

The former detail screen reduced those fields with any/max per match while the roster/ranking counted quarter records. Detail card, cumulative grid, defense chart, match history and badges now use the same quarter totals. Existing detail totals/badges can therefore increase without persisted data changing. Ranking uses the same helper, avoids floating-point display tails and excludes upcoming matches from record metrics; attendance ranking retains its separate rule. No DB, permissions, upload or input mutations are included.

## Verification

- 11 unit/API files, 59 tests passed, including quarter totals, distinct appearances, invalid/missing records, fractional precision, dates and upcoming-record exclusion.
- TypeScript and production webpack build passed with the existing real-font cache. ESLint zero errors, two existing warnings (ordinary img and detail effect dependency).
- Independent Chrome 8-locale 25-screen and WebKit 6-screen QA passed at 320px. Five values, 3+2 placement, text/number alignment, no horizontal overflow, no browser page errors.
- Detail/list/chart/grid/ranking consistency verified with a multi-quarter fixture: card 1/3/2/2/3.5; defense chart bars 56/98px and sum 5.5. Dates, other-player isolation, all-zero detail, 0.1+0.2=0.3, ignored future99 points and CS3 badge also passed.
- Initial translated-label check found 13.75px number misalignment from reverse-column bottom packing. Explicit top alignment fixed it; all checked locales pass after rebuilding.
- The user's photo was rendered locally with all five zero test records; UI/UX review passed. Private source/photo captures are excluded from Git and production.

[Independent QA receipts](./2026-10-31-player-card-records/). Data was mocked locally; production account saves and iOS native startup were not tested. Baseline before release: cfc0323 / Vercel dpl_5uHNd1cM48YY92p2ZEao4ieMhQqd. Rollback is web-only and needs no schema reversal.
