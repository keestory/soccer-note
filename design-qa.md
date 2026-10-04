# Home Simplification Design QA

## Comparison inputs

- Reference: `/Users/mac_al03256458/.codex/generated_images/01a10606-c79f-7e53-bbfb-9c101df0c4e4/exec-72674c8f-2e5a-4527-8e62-ecce42dd4777.png`
- Implementation route: `/screenshots/home`
- Shared implementation: `src/components/home/HomeFocus.tsx`
- Captured evidence: `docs/design-qa/home-390x844.png`
- Evidence viewport: 390 × 844 CSS pixels; verified PNG dimensions with `sips`.

## Scoped checklist

- [x] Three primary destinations are visible: 홈, 경기, 팀.
- [x] Home is active and has a visible lime active indicator.
- [x] Header contains team selector, bell icon, and profile avatar.
- [x] Season summary uses dedicated localized copy and token replacement.
- [x] Latest match presents result, date, location, oversized score, and opponent.
- [x] Quarter scores are ordered by `quarter_number` before native rendering.
- [x] Stadium strip uses the optimized 1086 × 362 asset on web and native.
- [x] One lime primary CTA is present.
- [x] Home utility rows use dedicated localized labels and descriptions.
- [x] Static screenshot composition reserves bottom-navigation space at 390 × 844.
- [x] Actual web navigation model is the single source used by rendering and tests.
- [x] Active web navigation exposes `aria-current="page"`.
- [x] Native icon-only add-match control has an accessibility label.
- [x] Existing player, training, community, match, and team routes remain available.

## Verification

- `npm test` — passed: 6 files, 37 tests.
- `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=test SUPABASE_SERVICE_ROLE_KEY=test npm run build` — passed; `/dashboard`, `/matches`, `/team`, and `/screenshots/home` generated.
- `cd mobile && npx tsc --noEmit` — passed.
- `git diff --check` — passed.
- `sips -g pixelWidth -g pixelHeight docs/design-qa/home-390x844.png` — 390 × 844.
- `sips -g pixelWidth -g pixelHeight public/match-stadium-bg.png` — 1086 × 362; 505 KB. Native copy is byte-identical at the same size.

## Known repository-wide findings outside this change

- Global CSS hides all scrollbars and disables body text selection as an existing native-feel policy. This is broader than the scoped Home/navigation redesign.
- Standalone root `npx tsc --noEmit` reports pre-existing test-only literal-comparison and incomplete `Quarter` fixture diagnostics. The production Next.js build type check passes.
- Existing dependency trees report audit warnings during clean installs. No dependency versions or lockfiles were changed in this work.
- Firebase Admin variables are not present in the local QA environment; the build logs the existing warning while completing successfully.

## Result

final result: passed
