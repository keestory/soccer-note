Archived report. Raw capture/script paths refer to the local QA workspace; compact result receipts are included here.

# Five player-card records — independent QA, 2026-10-31

Scoped result: PASS. Read-only product review; local production build and intercepted fixture requests, no production data changes.

## Final browser checks

- Chrome at 320px, all 8 locales, roster + team intro + detail, plus ranking/filter interactions: 25 surfaces.
- WebKit at 320px, Japanese + US English, roster + team intro + detail: 6 surfaces.
- All numeric rows align despite wrapped labels. Horizontal overflow, stat-cell overflow, header 8px-boundary failures, and browser page errors: 0.
- All cards retain photo masks and fixed-cap shield frames.

## Record consistency

A completed match with 2 quarters (goals 1+2, assists 2+0, clean_sheet true+true, contribution 1+2.5) produces `[appearances=1, goals=3, assists=2, cleanSheets=2, contribution=3.5]` in roster, team intro and detail. Ranking displays cleanSheets=2 and contribution=3.5. Other-player data is isolated; a player without records displays five zeros, including on detail.

The detail totals grid shows CS2/contribution3.5, match list shows the same with defense total5.5P, and the defense chart has 98px contribution and 56px clean-sheet bars (28px/point), total5.5. A separate 3-quarter clean-sheet fixture triggers the “철벽” badge with “클린시트 3회”.

Date filters include both date boundaries and isolate the October15 versus October30 match records. A 0.1+0.2 contribution fixture displays0.3 consistently across all four surfaces. A scheduled match containing99-point fixture records is excluded from record metrics across all four surfaces.

## Fixed defect and evidence

Initial test reproduced 13.75px numeric-row offsets caused by column-reverse and unequal label wrapping (7 locales in roster/intro, Japanese on the second row too). Root added justify-content:flex-end. The full affected locale matrix and WebKit cases pass on the rebuilt app.

Evidence in this directory: result-chrome.json, result-webkit.json and locale screenshots. Additional evidence one directory up: fraction-upcoming.json, badge.json, detail-consistency.json, initial result.json and scripts.

Limits: fixture/browser validation, not live Supabase RLS/storage/data mutation or native iOS verification.
