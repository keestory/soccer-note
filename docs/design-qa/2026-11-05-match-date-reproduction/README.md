# Nov 5 match-date reproduction and candidate comparison

Status: investigation complete; **two date-default defects reproduced**, no product fix, commit, push or deployment. This is a synthetic browser observation, not production-write evidence.

## Provenance and method

- Current source HEAD: `54e18d11571b7b0b77e32fee61061e546d90d443`; its product files are unchanged from deployed `41a4958e8cb46319ed168534edaa999b7fce3cf4`.
- Reused existing production build `7-KgWrDkQQ1lvIHgToQO3`, existing Playwright/Chromium and existing synthetic auth/data fixture. No install, new service, external inference API or repository model CLI.
- The browser context uses each specified timezone. Playwright `page.clock.setFixedTime` is set before first navigation; server clock is not changed. Each case follows the existing Home → New match link and waits for the fictional team to load.
- Every data/auth/API request is intercepted. No form is submitted: synthetic data writes **0**, production writes **0**. Only local loopback app/assets are fetched normally.
- [Full observed report](browser-results.json), [exact executed runner](runner.mjs). The runner has cloud-workspace paths and requires the existing fixture server on port 3128 with synthetic Supabase variables; it is not a production-target runner.

## Results

| Browser local time | Fixed UTC instant | Expected local date | Actual date input | Result |
| --- | --- | --- | --- | --- |
| Asia/Seoul Nov 5 00:30 | Nov 4 15:30Z | 2026-11-05 | 2026-11-04 | Default defect reproduced |
| America/Los_Angeles Nov 4 17:30 | Nov 5 01:30Z | 2026-11-04 | 2026-11-05 | Default defect reproduced |
| UTC Nov 5 00:30 | Nov 5 00:30Z | 2026-11-05 | 2026-11-05 | Control matched |
| Asia/Seoul Nov 5 12:30 | Nov 5 03:30Z | 2026-11-05 | 2026-11-05 | Control matched |
| America/Los_Angeles Nov 4 10:30 | Nov 4 18:30Z | 2026-11-04 | 2026-11-04 | Control matched |
| UTC Nov 5 12:30 | Nov 5 12:30Z | 2026-11-05 | 2026-11-05 | Control matched |

All six investigation cases completed. In all six, manually selecting `2026-11-12` survived edits to opponent/location, focus changes, then a 24-hour browser clock advance and another field-triggered render. This is **6/6 manual-input preservation**, not a persisted-record assertion. No page/console errors, unexpected requests or cleanup warnings occurred. The report's `investigationPassed=true` means the observations were verified; it does not mean the existing date defaults are correct.

Screenshots include [KST defect](kst-0030-boundary.png), [LA defect](la-1730-boundary.png), [UTC control](utc-0030-control.png), and [manual date preserved](kst-0030-boundary-manual-preserved.png). All are fictional 390×844 browser views.

## Existing date policy, not a new timezone policy

- `src/lib/match-date.ts:1–6` says match DATE values represent local calendar days and compares against `getFullYear/getMonth/getDate` from the current browser clock.
- `src/lib/utils.ts:111–118` explicitly treats date-only match values as a local calendar day rather than midnight UTC.
- `src/app/matches/page.tsx:27–28` and `src/app/dashboard/page.tsx:101–104` use that local-day comparison for previous/upcoming presentation.
- `src/app/match/new/page.tsx:22` initializes the date from `toISOString().split('T')[0]`, creating the observed mismatch. Its submission at line 52 uses the selected `matchDate`; no submit was performed here.

These sources support matching the user's browser calendar default. They do not establish a venue/team timezone policy or authorize rewriting existing records. No training/community date field or match-status semantics were changed.

## S1: source-only comparison of opponent/location reuse

Current sources: `src/components/home/HomeFocus.tsx:49` and `src/app/matches/page.tsx:35` link directly to new match; existing match detail `src/app/match/[id]/page.tsx:545` links back to Home. New-match fields are at `src/app/match/new/page.tsx:21–23,92–96`, explicit create at lines 45–56. No existing opponent/location reuse action was found in these routes or the repository keyword search.

Counts below mean screen-navigation actions, not measured taps, typing duration or user outcomes. The proposed shortcut has not been implemented or browser-tested.

| Starting point | Existing path to new form | Proposed detail shortcut path | Static comparison |
| --- | --- | --- | --- |
| Home or match list | New match → form: 1 navigation | Open an existing match → reuse → form: 2 navigations, plus any search/scroll | Adds navigation while avoiding at most two field entries; not unconditionally fewer steps |
| Already viewing the source match | Back to Home → New match → form: 2 navigations | Reuse → form: 1 navigation | Could remove one navigation and at most two field entries |

Date selection, review, explicit creation and the existing post-create attendee step remain. A blank old location saves no location entry; changed opponents/venues may still require editing. Finding the right old match can cost more than typing. Therefore S1's benefit is conditional on starting context and reusable values, with no demonstrated demand or time saving. It remains deferred pending selection and a design that preserves date/permission/context boundaries.

## Scope and next decision

Only investigation artifacts and the supplied actual council summary were written locally. Product source is unchanged. The temporary local server and browser were stopped. Current Hobby policy and unknown monthly allowance/bill remain as established in the Nov 5 read-only preflight; this run added no paid option or service. No denied billing/rollback/workflow/DB/CLI path was retried. Product editing awaits the coordinator's decision.
