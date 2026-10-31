# SoccerNote Navigation UX Contract

## Primary flow

1. Home answers: what is the next scheduled match, what happened most recently, and what should I do next?
2. Matches provides the complete upcoming/completed record and opens existing match detail/edit flows.
3. Ranking provides the selected team’s player rankings as a separate primary tab.
4. Team groups lower-frequency operations without removing their existing routes.

## Route ownership

| Primary destination | Owned routes |
| --- | --- |
| Home | `/dashboard` |
| Matches | `/matches`, `/match/*` |
| Ranking | `/ranking`, `/ranking/*` |
| Team | `/team`, `/team/*`, `/training/*`, `/community/*` |

The deployed Capacitor shell displays this web navigation. The separate Expo source currently retains its earlier three-tab model. `players`, `training`, and `community` remain routable but are hidden from the tab bar.

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

- Exactly four primary destinations appear on web and the current Capacitor web shell: Home, Matches, Ranking, Team.
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
- The noindex /design-system route is an in-memory fictional review surface; its four review selectors do not change the four production navigation destinations.
- No production data, authorization, native SDK or schema change is part of the visual refresh.

## Neon restoration (2026-10-31)

- GOLDLINE dark surfaces and volt accents replace Line Matchday colors; the interaction requirements above still apply.
- Existing forest-default preferences migrate to volt. Other valid saved accents remain usable on dark surfaces.
- Filled neon actions use dark foregrounds; dark cards use light text, including legacy team, training and player-detail routes.
- The shared preview and Home screenshot route reflect the restored design; archived store screenshots are separate assets.

## Separate ranking tab

- Ranking is reachable directly from the bottom navigation at `/ranking`; player management no longer contains the roster/ranking toggle.
- The selected team name is explicit. Goals, assists, contribution, rating, attendance and clean sheets retain their calculations and inclusive date filters.
- Ties use competition ranks and the same first-place emphasis. Unrated players show a dash. No players and no records in the selected range have separate messages.
- Ranking player details use `/ranking/[id]` with a Ranking back link; the original `/team/players/[id]` remains supported.
- Loading retains bottom navigation. Unauthenticated users go to login; users without a selected team go to Home. Ranking is noindex and reuses existing data access.

## Player card contract (2026-10-31)

- Roster, authenticated team introduction and player detail share PlayerCard. Ranking uses its compact portrait while preserving separate tab navigation and comparison behavior.
- Required name; optional jersey number (0–99), optional age (integer 1–120), primary position, optional photo. Blank age is omitted and does not require a date of birth.
- Card records are cumulative appearances, goals and assists. Appearance means one unique played match with a player quarter record, regardless of quarter count. Missing records show zero; no invented abilities.
- Legacy JSON metadata survives editing. Only changed age adds an attributes patch. The returned persisted row updates the store; an update failure keeps the draft and previous card.
- Uploads send the authenticated Bearer token. The server verifies it; invalid Authorization cannot fall back to cookies. Requests without Authorization retain existing cookie support.
- Saving is disabled while uploading. Closing or changing a player form aborts its upload; late success/failure/finally cannot modify the next form. Removing the photo clears the player's reference when saved.
- Cards remain two columns at 320px. Names wrap, age is optional, broken photos show a silhouette, and edit/delete remain separate accessible 44px controls. Existing eight locales cover the new labels.
