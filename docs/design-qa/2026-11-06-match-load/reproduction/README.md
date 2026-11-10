# Nov 6 matches-load investigation — no product change

Observed from 2026-11-06 01:32:39 UTC. Current repository HEAD: `372faf95816879cc0e930102e08fd45c94c0c077`; unchanged product source: `90398f1822cddc665d3d18f26d7fc12cc46229c2`; existing local production build: `RhpQn8IX3tuCX7iF2qVF6`. No rebuild or dependency installation. Browser viewport 390×844, DPR 1.

The real `/matches` component ran against synthetic auth and in-memory API responses at loopback only. All non-GET/HEAD/OPTIONS requests were blocked by the investigation wrapper; no write attempts occurred. No production origin or database was contacted. Product, Git branch, PR, deployment, credentials and permissions were unchanged.

## Observed results

| Scenario | Observation |
| --- | --- |
| No cache, initial team-list GET returns 500 | Reproduced: `/matches` shows total games 0, win/draw/loss 0 and `아직 기록된 경기가 없습니다`; no error alert or explicit retry button. Team identity is absent. |
| Confirmed A cache, initial team-list GET fails after reload | A's one saved fixture match remains visible. No zero-record result, but no failed-refresh explanation on this page. |
| Successful genuinely empty match query | Legitimate zero/empty state, with confirmed A team name and authorized create action. The main list wording is the same as the cold failure. |
| Successful A→B selection on dashboard, then Matches | Confirmed B title and B match; no A record under B title. |
| Failed A→B selection on dashboard, then Matches | Dashboard explains failure. Confirmed A title and A match remain; B does not overwrite A. |

All five investigation observations completed. This is evidence of a defect, **not** acceptance of a fix. Each case made zero synthetic/production writes. Page errors, unexpected requests, unexpected console errors and cleanup warnings were zero; deliberately injected HTTP 500 responses are separated in the JSON. No incident frequency, user harm frequency or growth effect is measured. Physical devices, screen readers, live authenticated UI and production RLS were not tested.

Files: [JSON](browser-results.json), [runner](runner.mjs), [temporary fixture copy](fixture.mjs), [cold failure](cold-failure-390.png), [genuine empty](normal-empty-390.png), [cached failure](cached-failure-390.png), [switch success](switch-success-390.png), [switch failure](switch-failure-390.png).

The first harness run expected a paraphrased Korean empty-state string and failed its assertion. The actual UI already showed zero/empty. The harness was corrected to the existing locale string, without product changes, and the complete five-case run then completed. Original runner/report/screenshot are preserved under `initial-harness-*`. A preliminary read used a nonexistent locale path; no browser run occurred for that command.

## Candidate A: minimum search design only

- Filter only the confirmed team's currently loaded `data.matches` by opponent or non-null location. A single optional, labeled input plus explicit clear action; literal text matching, trim/case normalization, no regex interpretation. No new API, persistence, analytics or server writes.
- State the scope as currently loaded matches. Existing query has no explicit client pagination, but that does not prove every database row was returned. Do not promise global history search.
- Keep existing upcoming/completed classification and ordering. Search-result counts belong to the filtered list; the existing games/win/draw/loss summary still uses the original unfiltered loaded matches. Do not show that summary as the result of the search.
- Distinguish genuine empty history, no search matches, and load failure. Clear restores the original list. A fresh load failure must not become a search-no-results message; confirmed cached rows may remain with an explicit stale/error message.
- Tie query state to confirmed user ID and selected team ID. Clear on confirmed account/team change; preserve it for a canceled/failed selection or same-team refresh. Do not key off the pending team name or carry results across accounts. Keep query in component memory only.
- Acceptance would cover Korean/Latin text, spaces, null locations, no match, clear, unchanged overall summary, sorting, team/account transitions, cancel/failure, same-team refresh and mobile keyboard/label/focus. Actual demand and speed benefit remain unknown.
- Stop if additional data access, permission/schema changes, a new search service, or a promise of complete server history is required. This design is unimplemented and unselected.

## Candidate B: minimum potential fix boundary

The store already distinguishes initial failure and exposes `appLoadError`; `/matches` currently ignores it. A local consumer change could reuse existing load-error copy/retry: suppress unconfirmed zero totals on a cold failure, preserve confirmed cached records with an error explanation, and retain genuine empty-success behavior. Do not change team-selection/store/permission contracts. This is a proposal only; no code has been edited.
