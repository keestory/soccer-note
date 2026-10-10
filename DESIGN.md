# SoccerNote Design System — Monochrome Matchday

## Product character

SoccerNote is a focused football team notebook. The interface should feel like a modern match programme: quiet gray canvas, crisp white surfaces, decisive black scoreboards, and a single volt-lime action color. Information density and typography create the character; decorative color, texture, and depth do not.

The signature move is the **monochrome score block**: one uninterrupted black surface with an oversized Bebas score and quarter data separated by hairline dividers. The rest of the product stays flat, restrained, and operational.

## Reference translation

The 2026-10-10 user-provided mobile reference set contains six examples, including the later MY TURN screen. SoccerNote translates their recurring layout principles rather than copying brands, illustrations, schedules, or exact compositions:

- Floating capsule navigation becomes SoccerNote's three-destination black navigation.
- Clear numeric hierarchy becomes the match score and season statistics.
- MY TURN's thin line grid becomes 1px modules for quarter scores, the statistics rail, and team utility rows.
- White content surfaces and restrained pale green become neutral surfaces and SoccerNote's single volt action.
- Pastel panels, paper texture, 3D objects, heavy shadows, calendars, and unrelated task metaphors are intentionally excluded.

## Navigation

- Primary navigation has exactly three destinations: Home, Matches, Team.
- Home is the daily summary and single primary action.
- Matches owns schedules, results, season totals, and match detail entry points.
- Team is the hub for players, training, opponent matching, members, notifications, and team profile.
- Legacy feature routes remain stable so saved links and back flows continue to work.

## Tokens

| Role | Value |
| --- | --- |
| App canvas | `#f4f5f6` |
| Surface | `#ffffff` |
| Primary ink / navigation | `#0d0f12` |
| Secondary ink | `#34383f` |
| Volt action | `#d8ff3e` |
| Primary text | `#15171a` |
| Secondary text | `#62676f` |
| Muted text | `#8b9098` |
| Divider | `#e2e4e7` |

Use `Noto Sans KR` for interface text and `Bebas Neue` for scores and compact statistics. Core radii are 12px controls, 16px surfaces, 18px CTAs, and 22px hero/navigation. Default horizontal page padding is 20px. Surfaces use 1px borders instead of depth; the floating navigation receives only a subtle shadow.

## Components

- Header: team name first, season summary on the following line, compact notification/profile controls.
- Latest-match hero: one black surface with explicit result text, oversized score, opponent, metadata, and quarter data separated by internal dividers.
- Primary CTA: flat volt fill, black text, minimum 56px height. Home has only one primary CTA.
- Utility row: white surface, consistent 72–80px height, icon, label, supporting text, chevron, and hairline divider.
- Statistics rail: four equal monochrome cells in one bordered white surface.
- Bottom navigation: exactly three equal destinations in a flat floating black capsule. Active state uses a white pill, icon, label, and `aria-current`.

## Motion

- Section entrance is limited to a short 6px fade-up using `content-enter`.
- Interactive rows use subtle opacity or background transitions; no card lift or simulated physical depth.
- All non-essential transforms and animations are removed under `prefers-reduced-motion: reduce`.

## Accessibility and states

- Interactive controls use semantic links/buttons and the shared high-contrast `focus-ring` treatment.
- Text and icon controls maintain at least a 44px touch target.
- Empty match state replaces the hero without hiding the create action from authorized users.
- Permission-gated creation and administration actions remain hidden for unauthorized members.
- Win/draw/loss is always written as text; color is never the only result signal.
- Loading, refresh, no-team, team-picker, pending-member, empty, win/draw/loss, and localization states are supported.

## Avoid

- Do not promote every capability to the bottom navigation.
- Do not stack multiple competing primary cards on Home.
- Do not add pastel semantic colors, paper textures, gradients, 3D shadows, or decorative illustration.
- Do not use volt for decoration; reserve it for the primary action and keyboard focus.
- Do not duplicate match or permission logic in presentational components.
