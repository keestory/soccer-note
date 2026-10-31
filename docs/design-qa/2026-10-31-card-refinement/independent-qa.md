Archived QA report. Raw captures and scripts referred to below remain in the local `/tmp/soccer-player-cards/qa-frame/final` workspace; the aggregate summary is included alongside this report.

# Player card frame and photo-edge QA — 2026-10-31

Scoped result: PASS after the fixed-height SVG cap correction. Product code was read only during QA.

- Local production build on localhost:3110.
- Chrome and Playwright WebKit; 320×844 and 390×844.
- 36 surfaces: roster, detail and ranking for short, Korean 80-character and English 80-character names at both widths in both engines.
- Jersey number 99; photo present, failed photo and no photo fixtures.
- Header bounding boxes expanded by 8px lie fully within the inner body-frame bounds in every card. Minimum measured inset is 10px.
- Horizontal overflow: 0. Browser page errors: 0.
- Photo mask intersection is active on roster/detail in both engines; ranking retains its compact unmasked image.
- Failed and absent photo URLs remove has-photo and render the silhouette.
- Synthetic fixture images only. No personal photo was uploaded or added to the repository.

Method: use SVG body getScreenCTM() to convert its inner x=12..288 and y=0..1 bounds to CSS pixels; compare number and position DOM bounding boxes plus 8px against those bounds. This is conservative because it includes the number/position line boxes, not only painted glyphs.

Initial negative evidence is retained in the parent qa-frame directory. With the former single stretched SVG, long names reduced header clearance to 0–3.5px. Final 3-part SVG keeps top/bottom cap heights fixed while only the body grows; all those cases now pass.

Evidence: summary.json, result-all.json, and per-engine screenshots in this directory. Test source: ../check-fixed.cjs.

Limitations: this is browser-engine validation with mocked data, not an iOS device/App Store/native startup test. Real private-photo art direction remains the root agent's review.
