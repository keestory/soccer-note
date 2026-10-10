# SoccerNote Navigation UX Contract

## Primary flow

1. Home answers: what is the next scheduled match, what happened most recently, and what should I do next?
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
- Home explicitly states when no upcoming match is scheduled. When one exists, it is visually primary and the latest result becomes secondary.
- Pull to refresh remains available on data-heavy Home and Matches screens.
- Switching teams updates the shared store and cached permission resolution before rendering team data.

## Acceptance criteria

- Exactly three primary destinations appear on web and native.
- Existing player, training, community, match detail, and team administration URLs still resolve.
- Home contains one primary CTA and no full recent-match list.
- Home state hierarchy is conditional: next match first when scheduled; otherwise no-upcoming status followed by the latest result or empty-history explanation.
- Complete match history lives under Matches.
- The auth-free `/screenshots/home` route renders the same HomeHeader, HomeFocus and BottomNavShell for deterministic visual QA; only data and the team-switch handler differ.
- The recent-match heading owns one localized View all link to Matches. Home keeps one compact Team operations row and does not repeat a large Matches menu row.
- Long team/opponent names wrap. Two-digit scores remain fully visible. Outcome labels remain readable independently of color.
- Responsive evidence records the true CSS viewport and device pixel ratio at 320, 360, 390 and 430px; screenshot dimensions alone are insufficient.

## Line Matchday interaction delta (2026-10-10)

- Upcoming matches use date-centered rows; completed rows display scores.
- Manual player addition is the default, with name required and number optional.
- Name and number search share one field. Rankings use competition ties (1,1,3).
- A pitch player can be selected and moved by tapping a destination, dragging, or using arrow keys.
- The selected player's explicit record action opens existing goal/assist/rating editing.
- Coordinate storage stays unchanged: portrait display uses left=y and top=100-x.
- Shared sheets trap focus, support Escape, restore focus and constrain their height.
- The noindex /design-system route is an in-memory fictional review surface; its four review selectors do not change the three production navigation destinations.
- No production data, authorization, native SDK or schema change is part of the visual refresh.
