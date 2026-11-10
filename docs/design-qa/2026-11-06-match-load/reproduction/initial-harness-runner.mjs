import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { browser, fixture, report, output, base, teams, matches, openPicker, choose, until, pause, closeBounded } from './fixture.mjs'

assert.equal(base, 'http://127.0.0.1:3128')
let mode = { failTeams: false, empty: false, deniedWrites: [], injectedFailures: 0 }
const nativeContext = browser.newContext.bind(browser)
browser.newContext = async options => {
  const context = await nativeContext(options)
  const nativePage = context.newPage.bind(context)
  context.newPage = async () => {
    // Installed after the shared fixture routes, before the first navigation.
    await context.route('**/*', async route => {
      const r = route.request(), u = new URL(r.url())
      if (!['GET', 'HEAD', 'OPTIONS'].includes(r.method())) {
        mode.deniedWrites.push({ method: r.method(), path: u.pathname })
        return route.abort('blockedbyclient')
      }
      if (u.hostname === 'soccer-note-test.supabase.co' && r.method() === 'GET') {
        if (u.pathname === '/rest/v1/teams' && mode.failTeams) {
          mode.injectedFailures++
          return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Synthetic initial team-list failure', code: 'QA_FAIL' }), headers: { 'access-control-allow-origin': '*' } })
        }
        if (u.pathname === '/rest/v1/matches' && mode.empty) {
          return route.fulfill({ status: 200, contentType: 'application/json', body: '[]', headers: { 'access-control-allow-origin': '*' } })
        }
      }
      return route.fallback()
    })
    const page = await nativePage()
    page.setDefaultNavigationTimeout(30000)
    return page
  }
  return context
}

async function observe(f, name) {
  await f.page.locator('h1').waitFor()
  await pause(100)
  const view = await f.page.evaluate(() => ({
    path: location.pathname,
    title: document.querySelector('h1')?.textContent,
    header: document.querySelector('header')?.innerText,
    main: document.querySelector('main')?.innerText,
    alerts: [...document.querySelectorAll('[role="alert"]')].map(e => e.textContent),
    buttons: [...document.querySelectorAll('button')].map(e => e.textContent?.trim()),
    matchLinks: [...document.querySelectorAll('main a[href^="/match/"]')].map(e => ({ href: e.getAttribute('href'), text: e.textContent })),
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio, scrollWidth: document.documentElement.scrollWidth },
  }))
  await f.page.evaluate(() => document.fonts.ready)
  await f.page.screenshot({ path: `${output}/${name}.png`, fullPage: false })
  return view
}
async function run(name, options, work) {
  mode = { failTeams: false, empty: false, deniedWrites: [], injectedFailures: 0, ...options }
  let f
  try {
    f = await fixture({ route: '/matches', width: 390 })
    const evidence = await work(f)
    assert.equal(f.state.writes.length, 0)
    assert.equal(mode.deniedWrites.length, 0)
    report.cases.push({ name, status: 'observed-as-expected', ...evidence, writes: 0, injectedTeamListFailures: mode.injectedFailures })
  } catch (error) {
    report.cases.push({ name, status: 'harness-or-observation-failed', error: error.stack })
    throw error
  } finally { if (f) await f.close() }
}

Object.assign(report, {
  scope: 'Read-only synthetic investigation, not acceptance of a fix; no product changes',
  sourceHEAD: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  productSourceCommit: '90398f1822cddc665d3d18f26d7fc12cc46229c2',
  buildId: (await readFile('.next/BUILD_ID', 'utf8')).trim(),
  fontSource: 'Existing Nov5 cached-font production build reused without installation or rebuild',
  cases: [],
})
try {
  await run('cold initial team-list failure', { failTeams: true }, async f => {
    await until(() => mode.injectedFailures > 0, 'injected initial failure')
    const view = await observe(f, 'cold-failure-390')
    assert.equal(view.path, '/matches')
    assert.match(view.main, /0\n총 경기/)
    assert.match(view.main, /아직 경기 기록이 없습니다/)
    assert.equal(view.matchLinks.length, 0)
    assert.equal(view.alerts.length, 0)
    assert(!view.buttons.some(x => /다시|재시도/.test(x)))
    return { productFinding: 'Reproduced: failed lookup appears as zero matches with no error/retry', view }
  })
  await run('confirmed cache then initial team-list failure on reload', {}, async f => {
    await f.page.getByText(matches[0].opponent, { exact: true }).waitFor()
    const before = await observe(f, 'cached-before-390')
    assert.equal(before.matchLinks.length, 1)
    mode.failTeams = true
    await f.page.reload({ waitUntil: 'networkidle' })
    await until(() => mode.injectedFailures > 0, 'cached reload failure')
    const after = await observe(f, 'cached-failure-390')
    assert.match(after.main, /가상 A 상대/)
    assert.equal(after.matchLinks.length, 1)
    assert.equal(after.alerts.length, 0)
    return { productFinding: 'Confirmed cached record is retained; no zero-record claim, but failed refresh is not explained here', before, after }
  })
  await run('successful genuinely empty match list', { empty: true }, async f => {
    await f.page.getByText(teams[0].name, { exact: true }).waitFor()
    const view = await observe(f, 'normal-empty-390')
    assert.match(view.main, /0\n총 경기/)
    assert.match(view.main, /아직 경기 기록이 없습니다/)
    assert.equal(view.matchLinks.length, 0)
    return { productFinding: 'Control: successful empty list legitimately renders zero/empty, with confirmed team name', view }
  })
  await run('successful team switch before opening matches', {}, async f => {
    await f.page.getByText(matches[0].opponent, { exact: true }).waitFor()
    await f.page.goto(`${base}/dashboard`, { waitUntil: 'networkidle' })
    await openPicker(f.page); await choose(f.page, 1, f.state)
    await f.page.locator('h1').filter({ hasText: teams[1].name }).waitFor()
    await f.page.goto(`${base}/matches`, { waitUntil: 'networkidle' })
    const view = await observe(f, 'switch-success-390')
    assert.match(view.header, /가상 B 팀/)
    assert.match(view.main, /가상 B 상대/)
    assert(!view.main.includes('가상 A 상대'))
    return { productFinding: 'Control: confirmed B team and B record render together', view }
  })
  await run('failed team switch preserves confirmed A matches', {}, async f => {
    await f.page.getByText(matches[0].opponent, { exact: true }).waitFor()
    await f.page.goto(`${base}/dashboard`, { waitUntil: 'networkidle' })
    f.state.teamModes.set(teams[1].id, { fail: true })
    await openPicker(f.page); await choose(f.page, 1, f.state)
    await f.page.locator('#team-selection-status').getByRole('alert').waitFor()
    const dashboardError = await f.page.locator('#team-selection-status').innerText()
    await f.page.keyboard.press('Escape')
    await f.page.goto(`${base}/matches`, { waitUntil: 'networkidle' })
    const view = await observe(f, 'switch-failure-390')
    assert.match(view.header, /가상 A 팀/)
    assert.match(view.main, /가상 A 상대/)
    assert(!view.main.includes('가상 B 상대'))
    return { productFinding: 'Control: failed B selection is explained on dashboard and keeps confirmed A data', dashboardError, view }
  })
} finally {
  await closeBounded(browser, 'browser')
  report.expectedInjectedNetworkErrors = report.consoleErrors.filter(x => /Failed to load resource:.*500/.test(x))
  report.unexpectedConsoleErrors = report.consoleErrors.filter(x => !report.expectedInjectedNetworkErrors.includes(x))
  report.investigationCompleted = report.cases.length === 5 && report.cases.every(x => x.status === 'observed-as-expected') && !report.pageErrors.length && !report.unexpectedRequests.length && !report.unexpectedConsoleErrors.length && !report.cleanupWarnings.length
  report.acceptancePass = null
  await writeFile(`${output}/browser-results.json`, JSON.stringify(report, null, 2)+'\n')
  console.log(JSON.stringify({ cases: report.cases.map(x => ({ name: x.name, status: x.status, finding: x.productFinding, error: x.error })), investigationCompleted: report.investigationCompleted }))
}
