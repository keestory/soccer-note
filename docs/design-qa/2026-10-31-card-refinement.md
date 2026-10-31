# Card header and photo refinement — 2026-10-31

The user identified jersey/position labels crowding the shield and a rectangular photo looking detached from the card. This correction reduces the header typography, increases its inset, and fades all four edges of uploaded portraits while leaving the central face opaque. It changes presentation only; data and upload behavior are unchanged.

The initial padding-only correction passed short names but failed 80-character Korean/English names: stretching the whole SVG also lowered its shoulders into the header. The final frame has fixed-height top/bottom caps and a stretchable center. Number and position boxes plus an 8px margin fit inside the frame at all tested widths. The body overlaps the bottom cap by 1 CSS px to prevent fractional-pixel raster seams.

## Verification

- Existing unit/API suite: 11 files, 57 tests passed.
- TypeScript and production webpack build passed using the existing real-font cache. Production font behavior unchanged.
- ESLint: no errors; existing ordinary-img optimization recommendation remains.
- Independent Chrome and WebKit QA: 36 surfaces at 320/390 CSS px, short/Korean80/English80 names, jersey99, roster/detail/ranking, present/broken/missing photos. Minimum header clearance 10px; no overflow or page errors. Broad-card image masks active; ranking compact image and missing-photo silhouette preserved.
- UI/UX review of the user's real photo confirmed clear header spacing, soft photo edges and visible facial detail. The supplied photo and its screenshots stay local and are excluded from Git and the public deployment.
- Final cosmetic overlap is separately checked on the actual photo capture. It does not change card content, header or portrait geometry.

[Independent browser summary](./2026-10-31-card-refinement/browser-summary.json). This is web/browser-engine evidence, not native iOS startup or App Store verification. Source release baseline: 9dcfcc0 / Vercel dpl_9Qi7jVY6PgVpjMLFJ6semt9XVvtX; rollback needs no database change.

CSS mask reference checked during implementation: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/mask-composite and https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/-webkit-mask-composite. Standard intersection is used with a prefixed fallback; tested on both browser engines.
