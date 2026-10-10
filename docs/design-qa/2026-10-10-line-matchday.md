# Line Matchday verification — 2026-10-10

## Scope
Next.js interface refresh for the remote-web Capacitor experience. Web routes, permissions and database schema retained. Independent strategy/research, UX/planning and QA review; one product-code writer.

## Verified
- 41 tests pass across 8 files.
- Calendar-day regression tests also pass under America/Los_Angeles (3 tests).
- Production build passes: 46 static pages generated, dynamic API/match routes compiled.
- Build used explicit local-only placeholder Supabase configuration. It did not test production Auth, database writes, uploads or notifications. Firebase configuration is absent locally.
- New shared design components and preview pass scoped ESLint with zero errors.
- Browser checks of /design-system: all four views at 320px and 430px have document width equal to viewport width; 390x844 visually inspected.
- Name-only player addition updates the fictional roster; numeric search matches jersey 14.
- Tap then destination, arrow-key motion, direct drag and Undo verified on the shared LinePitch.
- Formation 4-3-3 to 4-4-2 and quarter score 3:2 to 4:2 verified in preview.
- Browser error log empty on the review surface.
- Independent QA findings fixed: date-only today handling, IN/OUT semantics, sheet autofocus, stale selected IDs, western-timezone day badge, drag Undo, selected-OUT number contrast.

## Boundaries and remaining release checks
- The preview uses fictional in-memory data and is noindex. It is not evidence of authenticated database persistence.
- No production deployment, App Store submission, physical iOS/Android test, or separate Expo UI update.
- DATE-only matches have no completion status: they remain scheduled throughout their local calendar day. Adding an explicit completed state is a separate data-model decision.
- Existing visibility-policy and backend authorization behavior are preserved; live role-by-role RLS validation is outside this visual verification.
- Before release: validate actual login, team switch, player save, quarter/goal/assist save and role permissions in the intended environment, then verify the deployed Capacitor web experience.
