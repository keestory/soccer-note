# Pre-review QA evidence — superseded

This directory preserves the exact artifacts produced before the independent review found the stale-write-finish/new-account-initialization race. It is historical scoped evidence, not acceptance of the subsequent fix.

- Team browser run: `2026-11-02T04:39:10.640Z`, 11/11, `browser-results.json`.
- Quarter regression run: `2026-11-02T04:37:11.493Z`, 8/8, `quarter-regression/browser-results.json`.
- Both used the cloud local Webpack production build and a test-only mirror of the existing fonts.
- The product tree was uncommitted on the existing PR branch at these runs. These artifacts do not assert a separate immutable Git commit identity.

The missing order is: old write begins → new account fetch begins → old write finishes → new account fetch finishes. Final verification adds that sequence for both player and quarter writes.
