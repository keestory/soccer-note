import puppeteer from 'puppeteer'
import { execSync, spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUTPUT_DIR = path.join(ROOT, 'public', 'appstore-screenshots')

// iPhone: 1284 x 2778px (428x926 @3x)
// iPad 13": 2048 x 2732px (1024x1366 @2x)

const IPHONE_SCREENSHOTS = [
  { path: '/screenshots/1', filename: '01_match_dashboard.png', label: '경기 기록 관리' },
  { path: '/screenshots/2', filename: '02_formation.png', label: '포메이션 기록' },
  { path: '/screenshots/3', filename: '03_player_stats.png', label: '선수 통계 랭킹' },
  { path: '/screenshots/4', filename: '04_player_rating.png', label: '선수 평가 피드백' },
]

const IPAD_SCREENSHOTS = [
  { path: '/screenshots/ipad/1', filename: 'ipad_01_match_dashboard.png', label: 'iPad 경기 기록' },
  { path: '/screenshots/ipad/2', filename: 'ipad_02_formation.png', label: 'iPad 포메이션' },
  { path: '/screenshots/ipad/3', filename: 'ipad_03_player_stats.png', label: 'iPad 선수 통계' },
  { path: '/screenshots/ipad/4', filename: 'ipad_04_player_rating.png', label: 'iPad 선수 평가' },
]

const PORT = 3987 // use uncommon port to avoid conflicts
const BASE_URL = `http://localhost:${PORT}`

async function waitForServer(url, maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url)
      if (res.ok) return true
    } catch {
      // server not ready yet
    }
    await new Promise(r => setTimeout(r, 1000))
  }
  throw new Error('Server did not start in time')
}

async function main() {
  console.log('Starting Next.js dev server...')
  const server = spawn('npx', ['next', 'dev', '-p', String(PORT)], {
    cwd: ROOT,
    stdio: 'pipe',
    env: { ...process.env, NODE_ENV: 'development' },
  })

  server.stderr.on('data', (d) => {
    const msg = d.toString()
    if (msg.includes('Error')) console.error(msg)
  })

  try {
    await waitForServer(BASE_URL)
    console.log('Server ready!')

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    // Capture iPhone screenshots (1284 x 2778)
    console.log('\n--- iPhone Screenshots (1284 x 2778) ---')
    for (const s of IPHONE_SCREENSHOTS) {
      console.log(`Capturing: ${s.label} (${s.filename})...`)
      const page = await browser.newPage()
      await page.setViewport({ width: 428, height: 926, deviceScaleFactor: 3 })
      await page.goto(`${BASE_URL}${s.path}`, { waitUntil: 'networkidle0', timeout: 30000 })
      await new Promise(r => setTimeout(r, 1000))
      const outputPath = path.join(OUTPUT_DIR, s.filename)
      await page.screenshot({ path: outputPath, type: 'png' })
      console.log(`  Saved: ${outputPath}`)
      await page.close()
    }

    // Capture iPad screenshots (2048 x 2732)
    console.log('\n--- iPad 13" Screenshots (2048 x 2732) ---')
    for (const s of IPAD_SCREENSHOTS) {
      console.log(`Capturing: ${s.label} (${s.filename})...`)
      const page = await browser.newPage()
      await page.setViewport({ width: 1024, height: 1366, deviceScaleFactor: 2 })
      await page.goto(`${BASE_URL}${s.path}`, { waitUntil: 'networkidle0', timeout: 30000 })
      await new Promise(r => setTimeout(r, 1000))
      const outputPath = path.join(OUTPUT_DIR, s.filename)
      await page.screenshot({ path: outputPath, type: 'png' })
      console.log(`  Saved: ${outputPath}`)
      await page.close()
    }

    await browser.close()
    console.log('\nAll screenshots captured successfully!')
    console.log(`Output: ${OUTPUT_DIR}`)
  } finally {
    server.kill('SIGTERM')
  }
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
