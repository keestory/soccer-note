# SoccerNote Design System

## Product character

SoccerNote is a focused football team notebook. The interface should feel like a clean match sheet: decisive navy, one energetic lime action, generous white space, and scores with editorial scale. The home screen prioritizes the latest match and the next action; operational tools stay one level deeper.

## Navigation

- Primary navigation has exactly three destinations: Home, Matches, Team.
- Home is the daily summary and single primary action.
- Matches owns schedules, results, season totals, and match detail entry points.
- Team is the hub for players, training, opponent matching, members, notifications, and team profile.
- Legacy feature routes remain stable so saved links and back flows continue to work.

## Tokens

| Role | Value |
| --- | --- |
| App background | `#f5f6f8` |
| Card/navigation surface | `#ffffff` |
| Primary navy | `#101828` |
| Secondary navy | `#1a2437` |
| Energy accent | `#c8f542` |
| Primary text | `#101828` |
| Secondary text | `#475467` |
| Tertiary text | `#667085` |
| Muted text | `#98a2b3` |
| Divider | `#eaecf0` |
| Danger | `#f04438` |

Use `Noto Sans KR` for interface text and `Bebas Neue` for compact numeric display. Core radii are 12px controls, 16px cards, 18px CTAs, and 20–22px hero media. Default horizontal page padding is 20px.

## Components

- Header: team switcher on the left; notification and profile actions on the right.
- Latest-match hero: date and result metadata, oversized score, opponent, then a stadium-backed quarter strip.
- Primary CTA: lime fill, navy text, minimum 64px height.
- Utility row: title, short supporting line, chevron; separated by 1px dividers.
- Bottom navigation: icon plus short label, three equal destinations, visible active state.

## Accessibility and states

- Interactive controls use semantic links/buttons and visible keyboard focus.
- Text and icon controls maintain at least a 44px touch target where possible.
- Empty match state replaces the hero without hiding the create action from authorized users.
- Permission-gated creation and administration actions remain hidden for unauthorized members.
- Loading, refresh, no-team, team-picker, pending-member, empty, win/draw/loss, and localization states are supported.

## Avoid

- Do not promote every capability to the bottom navigation.
- Do not stack multiple competing primary cards on Home.
- Do not use lime text or fills on light surfaces except the single high-priority action/result accent.
- Do not duplicate match or permission logic in presentational components.
