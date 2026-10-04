# SoccerNote Navigation UX Contract

## Primary flow

1. Home answers: what happened most recently, what is the season snapshot, and what should I do next?
2. Matches provides the complete upcoming/completed record and opens existing match detail/edit flows.
3. Team groups lower-frequency operations without removing their existing routes.

## Route ownership

| Primary destination | Owned routes |
| --- | --- |
| Home | `/dashboard` |
| Matches | `/matches`, `/match/*` |
| Team | `/team`, `/team/*`, `/training/*`, `/community/*` |

Native tabs mirror this model. `players`, `training`, and `community` remain routable but are hidden from the tab bar.

## Permissions

- Match creation is shown only to coaches, owners, or members with `can_edit_matches`.
- Team administration destinations continue to enforce their own existing permission checks.
- Navigation grouping never grants access; it only changes discovery.

## State and recovery

- No session redirects to login.
- No selected team returns to team selection on Home.
- Empty match history explains the state and keeps the authorized create action available.
- Pull to refresh remains available on data-heavy Home and Matches screens.
- Switching teams updates the shared store and cached permission resolution before rendering team data.

## Acceptance criteria

- Exactly three primary destinations appear on web and native.
- Existing player, training, community, match detail, and team administration URLs still resolve.
- Home contains one primary CTA and no full recent-match list.
- Complete match history lives under Matches.
- The auth-free `/screenshots/home` route renders the same Home hero component for deterministic visual QA.
