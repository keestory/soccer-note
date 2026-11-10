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

## Selected previous-quarter placement draft (2026-11-04)

- A quarter after the first may import selected recorded players from the immediately previous quarter of the same match only when saved records and draft players are empty. Recheck before applying.
- Start with zero selected players. Describe actual recorded IN/OUT facts without inferring a final lineup. Explain unavailable roster entries, duplicate/conflicting records, invalid coordinates and positions outside the existing editable pitch area.
- Copy player identity and placement into a new local draft only. Do not copy row IDs, statistics, feedback, media or substitution records. Block selected players at the same exact coordinates instead of silently moving them.
- Cancel, Escape and context changes invalidate pending import responses. Pending application keeps keyboard focus on an enabled Cancel control; a successful application moves focus to the existing pitch heading.
- The existing pitch is the editable preview. Existing explicit Save all and save-failure retry/discard flows own persistence. The read-before-apply check is not an atomic lock against another client's later write.
- [Implementation, evidence and release boundaries](docs/QUARTER_IMPORT_2026-11-04.md) distinguish synthetic QA, production deployment and unverified real-user outcomes.

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
- Card records are cumulative appearances, goals, assists, clean sheets and contribution. Appearance means one unique played match with a player quarter record, regardless of quarter count. Missing records show zero; no invented abilities.
- Legacy JSON metadata survives editing. Only changed age adds an attributes patch. The returned persisted row updates the store; an update failure keeps the draft and previous card.
- Uploads send the authenticated Bearer token. The server verifies it; invalid Authorization cannot fall back to cookies. Requests without Authorization retain existing cookie support.
- Saving is disabled while uploading. Closing or changing a player form aborts its upload; late success/failure/finally cannot modify the next form. Removing the photo clears the player's reference when saved.
- Cards remain two columns at 320px. Names wrap, age is optional, broken photos show a silhouette, and edit/delete remain separate accessible 44px controls. Existing eight locales cover the new labels.

- Card header labels keep at least 8px clearance from the inner frame at 320/390px, including an 80-character name and jersey 99. Fixed frame caps do not stretch with long content.
- Photo edges fade on all four sides while the face remains visible; upload failure restores the unmasked silhouette. Compact ranking images remain recognizable. Cropping and fading are rendering-only changes and preserve the uploaded source.

- Five card records use a 3+2 layout with equal numeric emphasis. Translated labels may wrap while the numbers stay aligned within each row.
- Clean sheets count true quarter-record checks; contribution sums stored quarter values without converting numeric values into booleans. Example: two quarters with clean-sheet checks and contributions 1 and 2.5 produce appearances 1 / clean sheets 2 / contribution 3.5.
- Detail history, defense-point charts, totals and clean-sheet badges follow those same quarter totals. This replaces the old detail-only any/max collapse; ranking continues the established quarter-sum meaning. Record metrics omit upcoming fixtures and contribution is presented to the stored one-decimal precision.

## Entry flow (2026-11-01)

- Anonymous root visitors start at step 1 of 3. Next, previous, skip, signup and login are keyboard accessible; advancing focuses the new heading. No timed advance or extra logo splash. Signed-in visitors go to Home.
- Login and signup share persistent labels, password visibility controls, busy/error feedback, provider branding and links that preserve a valid invitation destination.
- New accounts without an authenticated session see email-confirmation guidance. This state performs no protected profile or membership write. Immediate authenticated signup saves the name with a visible retry on profile failure. Regular login never overwrites a later profile name from signup metadata.
- Users without a team see equally prominent create/join choices. Create opens the existing form; cancel returns focus to its choice. Names are trimmed, duplicate submission is blocked and failure keeps the draft. Existing team selection and approval-pending membership behavior remain intact.
- Authentication accepts only `/dashboard`, `/team/join` or the latter with one valid eight-character invite code as a return path. Invalid/external targets fall back to Home. OAuth return storage expires after 30 minutes and is consumed once.
- Login handoffs clear anonymous/previous-account data before navigating. Web PKCE code exchange remains owned by the Supabase client; native callbacks retain the existing custom-scheme exchange.

## Quarter save reliability (2026-11-02)

- One explicit Save all action covers formation, player statistics, reviews and media references. Substitution records retain their separate immediate persistence.
- Preserve existing record IDs through the `(quarter_id, player_id)` unique key. A failed upsert must never trigger deletion. Delete only loaded IDs explicitly removed by this editor, within the current quarter, and require acknowledged IDs before claiming success.
- Save, media upload and substitution mutations share one synchronous operation lock. The editor cannot change a pending save snapshot. Old route responses cannot reset the next editor.
- Persistent status distinguishes unsaved, saving, saved and unconfirmed failure. Failed drafts stay on screen and are locked until the same save succeeds or the user confirms leaving. This avoids forgetting an unacknowledged newly committed row while editing the failed snapshot.
- Multiple requests are not an atomic transaction. Some changes may have saved before an error. A lost deletion acknowledgment may require returning to the match and reopening to reconcile actual records; the UI does not claim the database stayed unchanged.
- The explicit Back action confirms leaving a dirty/failed draft with the shared accessible Sheet. Browser unload warns where supported. Browser history, native back, forced termination and cross-reload draft recovery are not guaranteed.
- Success reconciles IDs and the matching team's cached quarter without reloading the entire editor or changing other teams' cached data. All eight locales expose status and recovery. No new data collection, schema, RLS or native permission is added.

## Confirmed team context (2026-11-02, cloud reconstruction)

- Team name, records, roster, visibility and client permission cache change together after the latest selection completes. Until then the previous confirmed team remains visible. A failed request keeps it intact.
- The team Sheet shows the current team, names the pending/failed target, and offers retry. Escape, backdrop, Close, cancel and leaving Home invalidate pending selection; late responses cannot switch teams after dismissal. Another target can supersede a pending target without an extra confirmation tap.
- Account changes immediately clear old account context and invalidate old loads. A stale permission resolver cannot replace a newly committed team's cache. Actual database authorization remains owned by unchanged RLS.
- Same-team refresh does not reset an open player draft or pending mutation. A refresh snapshot overlapping a write cannot erase its acknowledged result. Old player and quarter acknowledgements cannot update another account/team or a later visit to the original team.
- Player forms freeze while saving and announce progress. A failed member link retains the acknowledged inserted player for a link-only retry within the current roster visit; the UI explicitly distinguishes saved player from unconfirmed link. Full reload/route-exit recovery and a lost insertion acknowledgement are not guaranteed.
- The quarter saver rechecks editor/account context before its subsequent delete stage. Requests already sent to the server are not undone by switching account or leaving.
