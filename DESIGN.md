# Soccer Note — Line Matchday
Updated 2026-10-11.

## Direction
A quiet team notebook: warm white canvas, forest green actions, one-pixel rules and legible numbers. No grass textures, neon panels, oversized black scoreboards or ornamental podiums. Keep established routes and data ownership.

## Tokens
| Token | Value | Purpose |
| --- | --- | --- |
| canvas | #f8faf8 | App background |
| surface | #ffffff | Cards and forms |
| ink | #172c23 | Primary text |
| forest | #176b52 | Primary actions and selected states |
| sage | #d8ece2 | Subtle emphasis |
| divider | #dde5df | 1px borders |
| major line | #b8c6bc | Card outlines and score-grid boundary |
| control line | #83968a | Input boundaries on white |
| loss | #a33a36 / #fbefed | Restrained loss text / background |
| pitch | #f0f6f2 | Line-only formation surface |
| pitch line | #a7c4b4 | Decorative field markings |

Font: Noto Sans KR with system fallback; core titles 26/34px at 600, home section titles 16/24px at 600, opponents 20/28px at 600, body 14/21px, metadata and navigation 12/18px, inputs 16px. Load actual 600 weight; retain existing 400–900 weights required by older routes. Core screens use 400/500/600/700, not 900. Primary result scores remain 48px and tabular; a result shown beneath an upcoming match is reduced to 32px. Spacing 4/8/12/16/24/32; main margins 20px and section gaps 24px. Controls 44px minimum, primary actions 48px, cards/buttons 12px radius. Main icons 20px/1.7; metadata icons 16px/1.7. Korean kickers use .01em tracking; uppercase English kickers explicitly opt into .1em. Focus rings 2px forest with 3px offset. Respect reduced motion and safe areas.

## Shared components
- HomeHeader: dashboard and deterministic QA share the same wrapping team title, notification shell, profile action, spacing and safe-area handling. The QA fixture has no team-switch handler.
- HomeFocus: the home explains the current state first. An upcoming match becomes the primary surface; without one, a concise no-upcoming message precedes the latest result. The latest result keeps real quarter scores and becomes compact only when an upcoming match is present. Localized View all sits beside the latest-result heading; one compact 64px team-management row remains below the single primary action. Never fabricate missing quarter scores. Two-digit scores get a separate row; long opponents wrap. Win/draw/loss retain localized text plus semantic color.
- BottomNav: exactly Home / Matches / Team, white surface, restrained selected state, aria-current.
- PlayerFields: persistent name/number labels, numeric keyboard, optional number, explicit position selection.
- LinePitch: portrait display of existing horizontal coordinates; tap player then destination, pointer dragging or arrow keys. Drag cancellation handled without document-level listeners.
- Sheet: bounded, scrollable bottom sheet; Escape, focus containment and return, body scroll restored.
- ConfirmSheet: semantic Sheet wrapper and visible destructive confirmation.
- Existing API calls, permission guards, player records and match storage stay in their original routes.

## Core experience
Home surfaces the next scheduled match and latest result. Match lists distinguish schedule from scores: upcoming fixtures show a calendar day rather than a fictional 0:0. Team roster supports name and number search. Quick addition starts with manual entry; linking existing members is still available. Rankings use competition ties (1,1,3). Quarter selection and actual goal/assist editing retain the existing database flow.

The football identity comes from real team names, opponents, quarter records and formations. No invented crest, decorative illustration or placeholder team asset is introduced.

The pitch editing screen selects a player for placement first; the explicit Player record action opens the existing goal/assist/rating editor. Dragging is optional. Players outside the visible pitch can still be represented by existing substitution records.

## Localization and accessibility
Existing eight locales remain supported. New placement labels are supplied in eight locales. Date-only strings render as calendar dates; selected locale is passed by redesigned match views. HTML language follows the selected locale. Long labels wrap; control titles and accessible labels identify icon actions. Do not use color as the only win/loss or position cue.

## Review surface
/design-system is a noindex, fictional, in-memory review surface. It shares HomeFocus, PlayerFields, LinePitch and Sheet with production. It has four demonstration selectors (Home, Players/Rankings, Formation, Record); these are review selectors, not a replacement for the production three-tab navigation. Demo changes are not saved to any team or database.

/screenshots/home uses the real HomeHeader, HomeFocus and BottomNavShell at the viewport's actual width. Optional locale/scenario/result query parameters exercise translated, empty, viewer, upcoming, long-name and outcome fixtures without real data. Its displayed total is derived from its quarter fixture. Browser evidence must record CSS innerWidth, DPR and screenshot pixel size; a narrow Chrome screenshot alone does not prove a narrow CSS viewport.

## Scope and release boundary
Implementation applies to Next.js web and the Capacitor shell that displays that web URL. The separate Expo source under mobile/ is not changed. Production deployment, authenticated real-data workflows and physical-device verification require separate evidence. New permissions, native SDKs, data collection and database migrations are not introduced.

## 2026 benchmark evidence
Observed 2026-10-10, country-specific free iPhone charts; snapshots are not annual/global rankings or quality proof.
- Apple US Business chart: Teams #1, Zoom #3, LinkedIn #4. https://apps.apple.com/us/iphone/charts/6000
- Apple GB Sports chart: Spond #3, Prematch #4. https://apps.apple.com/gb/iphone/charts/6004
- Apple local-team editorial selection includes TeamSnap, Spond, Heja. https://apps.apple.com/us/iphone/grouping/25268
- TeamSnap's 2026-02-04 announcement reports 30 million lifetime users and over 2 million daily active users in 2025. These are user metrics, not downloads. https://www.teamsnap.com/blog/announcements/teamsnap-delivers-breakthrough-innovation-strategic-partnerships-expanded-impact-across-youth-sports-2025
- Apple Sports' 2026-05-19 announcement emphasizes speed, simplicity and lineup formations. https://www.apple.com/newsroom/2026/05/apple-sports-expands-to-more-than-90-new-countries-and-regions/
- Spond's schedule/invite/attendance flow. https://help.spond.com/app/en/articles/121230-about-the-spond-app
- Heja's team creation and invite-link flow. https://help.heja.io/en/articles/15286103-getting-started-with-heja-for-clubs

Interpretation: next-match clarity, low-friction player entry and repeated team use are more relevant than decorative graphics. Two million downloads is an aspiration, not an outcome guaranteed by these design choices.

## Intake
S2/S3-scale product redesign. competitive_benchmark: required, completed. discoverability: not-applicable to authenticated core; new fictional preview explicitly noindex. store_compliance: limited impact review required because Capacitor renders the web; no permissions, privacy collection or payment changes. No store submission or release is included.
