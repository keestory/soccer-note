# Player cards — source QA, 2026-10-31

Approved scope: original black/volt football cards showing jersey number, primary position, player photo or silhouette, full name, optional age, and cumulative appearances/goals/assists. Two-column roster and authenticated team introduction; large player detail; compact ranking portrait. Existing ranking metrics, date filters and ties remain.

## Validation

- Vitest: 11 files, 57 tests passed. Includes unique-match appearances, missing/future records, age boundaries, legacy/unknown JSON preservation, Bearer success and invalid-auth rejection without storage/cookie fallback.
- TypeScript and local production webpack build passed. Google font responses used a local cache of real font files because Node font fetches time out in this environment. No production font implementation changed.
- Targeted ESLint: zero errors, three warnings (two ordinary img recommendations for uploaded images and one pre-existing player-detail effect dependency). Existing Next/React18 deprecation and local Firebase-config warnings remain.
- Initial browser coverage: 64 checks across eight locales and 320/360/390/430 CSS widths, roster/intro/ranking/both detail routes. No document or card horizontal overflow; 80-character unbroken name wraps; jersey 0 remains visible; missing age is omitted; broken photo falls back.
- Final rebuilt version: 48 checks across eight locales at 320/390 plus intro/ranking/both detail routes at 320. Ordinary cards align with/without age; all-time wording matches data scope. Browser page errors: zero.
- Existing ranking regression suite: 36 locale/state checks, including dates/reset, ties, metric changes, details/back, no records, empty roster, signed-out/no-team redirects and viewer state. Passed.
- Independent behavior QA: 11 assertions covering age create/edit/clear, invalid ages, unchanged metadata omission, legacy metadata preservation, zero-row update failure, jersey 0, photo authentication/upload/failure/removal, non-image rejection and read-only membership. Passed.
- A delayed upload could initially populate another player's editor after switching forms. This was reproduced to the mock persisted row, then fixed with form-bound cancellation and request identity checks. The rebuilt version passed the same race and normal upload/save/failure/remove regression. Negative and fixed receipts retained.

## Evidence and limits

Evidence is in [2026-10-31-player-cards](./2026-10-31-player-cards/). Browser fixtures intercept the Supabase/API boundary. No production player or storage record was written. The public fictional /design-system page shares the real PlayerCard component.

Read-only production schema checks confirmed attributes exists and standalone age does not. Age uses existing JSONB card.age; no migration or RLS change is required/applied. Live RLS, real-user saves and real-file storage were not verified by the mock tests. Public bucket retention behavior is unchanged.

This is web/Capacitor remote-web source QA. No new iOS/Android/Expo artifact, physical-device launch verification, or App Store/Play submission is claimed. Optional age and player-photo privacy text was updated. Console data declarations remain a separate store-review item. The earlier immediate iOS launch failure still needs the installed build's crash log; this card change is not a claimed launch-crash fix.

## Release and rollback

Existing project soccer-note, GitHub keestory/soccer-note main, Vercel team_jr2EoWExoCNDX3AFRs9fZxKh / prj_8MtXlwcx0NzpWAZQjGUuFTL4HHAL. Before release, production was READY on 552289702b2ee2847a974a6eb0a6d477740c24d4 (dpl_GcdXeC4dVoD8gGcaigNQa9G3gxNw). That deployment is a rollback candidate; no database reversal is required. After Git delivery, verify exact SHA, READY alias, live fictional card preview/privacy and signed-out guards. Production verification is reported separately from this pre-deployment source receipt.
