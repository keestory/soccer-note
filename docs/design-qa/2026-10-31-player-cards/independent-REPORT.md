# Independent player-card QA — 2026-10-31

Target: `/Users/mac_al03256458/Developer/soccer-note`, local production server on port 3110. Chrome via Playwright, 390×844. Fixtures intercept Supabase/API requests; production records were not changed.

11 behavior assertions passed (`check.cjs`, `result.json`):
- Optional age is displayed; six skill sliders are absent.
- Age updates preserve legacy skills and unknown root/nested metadata.
- Unchanged age omits the attributes update.
- Clearing age saves null and hides the age.
- Ages 0, 121 and 20.5 are rejected before mutation.
- A 406 zero-row update leaves the original card and editable form intact.
- Create persists age, jersey 0 and primary position without fabricated skills.
- Photo upload sends Bearer auth and uses the returned visible URL.
- Upload failure retains the previous photo; photo removal saves null and restores the silhouette.
- Non-image selection is rejected before upload.
- A member without edit permission sees cards and no add/edit/delete controls.
- Browser page errors: 0.

## Defect fixed and verified

P1: delayed photo upload can cross player boundaries. Begin an upload for A; close the editor while upload is pending; open B; let A's response complete; save B. A's photo URL is saved on B. Reproduced all the way to the mock persisted row. `upload-race.json`, `upload-race.png`, `race.cjs` record this.

Root added AbortController cancellation and request identity checks on reset, editor/member/mode changes and unmount. Retest on rebuilt server passed: no photo is assigned to either A or B after the canceled upload completes. Evidence: `race-fixed.cjs`, `upload-race-fixed.json`, `upload-race-fixed.png`. Normal upload/save, failed upload retaining old photo, remove-photo persistence, and Bearer auth also passed after the fix (`photo-retest.cjs`, `photo-retest.json`).

## Scope limits

This verifies client behavior and mock API contracts. It does not verify live Supabase RLS, real file storage, real user saves, iOS startup or native upload permissions. Root owns unit/API/build/locale/width/deployment evidence.
