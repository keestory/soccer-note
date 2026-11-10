/** Local browser QA only. Never configure this module on the hosting project.
 * Google Fonts egress may be blocked in a cloud executor. Install the existing
 * font families separately, then use Next's test response hook with --webpack.
 * See docs/TEAM_CONTEXT_CLOUD_2026-11-02.md for scope and reproduction.
 */
const fs = require('node:fs')
const path = require('node:path')
const root = process.env.SOCCER_QA_FONT_ROOT || '/tmp/soccer-note-browser/node_modules/@fontsource'

function css(family, weights) {
  return weights.map(weight => fs.readFileSync(path.join(root, family, `${weight}.css`), 'utf8')
    .replace(/, url\([^)]*\.woff\) format\('woff'\)/g, '')
    .replace(/url\(\.\/files\/([^)]*)\)/g, (_, file) => `url(${path.join(root, family, 'files', file)})`)).join('\n')
}

module.exports = {
  'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800;900&display=swap': css('noto-sans-kr', [400, 500, 600, 700, 800, 900]),
  'https://fonts.googleapis.com/css2?family=Bebas+Neue:wght@400&display=swap': css('bebas-neue', [400]),
}
