/** New-match local calendar date QA. Real loopback UI, synthetic auth/data/writes only. */
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { base, browser, fixture, report, closeBounded, hold, until, pause, id, teams } from './qa-team-fixture.mjs'

assert.equal(base, 'http://127.0.0.1:3128', 'Only the authorized local fixture origin is allowed')
const output = resolve(process.env.SOCCER_QA_OUTPUT || 'docs/design-qa/2026-11-05-match-date/after')
const filter = process.env.SOCCER_QA_CASE || ''
await mkdir(output, { recursive: true })
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
Object.assign(report, {
  feature: 'New match default uses browser local calendar date',
  scope: 'Local production-build browser acceptance with synthetic auth, reads and creates; no production DB verification',
  sourceHEAD: git('rev-parse', 'HEAD'), workingTree: git('status', '--short'),
  buildId: (await readFile('.next/BUILD_ID', 'utf8')).trim(),
  productBlobs: Object.fromEntries(['src/app/match/new/page.tsx', 'src/lib/match-date.ts'].map(path => [path, git('hash-object', path)])),
  runnerBlob: git('hash-object', 'scripts/qa-match-date.mjs'),
  clock: 'Playwright fixed browser time before first navigation; per-context IANA timezone; server clock unchanged',
  fontSource: 'Cached pre-feature build CSS and 746 WOFF2 assets reused through /tmp/soccer-date-fonts/responses.cjs; no font or product dependency installation',
  expectedCaseCount: 18, filter: filter || null, navigationTimeoutMs: 30000, assertionTimeoutMs: 10000,
  cases: [], screenshots: [], observedLimitations: [],
})
const scenarios = [
  { name: 'kst-0030-boundary', timezoneId: 'Asia/Seoul', instant: '2026-11-04T15:30:00Z', localDate: '2026-11-05' },
  { name: 'la-1730-boundary', timezoneId: 'America/Los_Angeles', instant: '2026-11-05T01:30:00Z', localDate: '2026-11-04' },
  { name: 'utc-0030-control', timezoneId: 'UTC', instant: '2026-11-05T00:30:00Z', localDate: '2026-11-05' },
  { name: 'kst-1230-control', timezoneId: 'Asia/Seoul', instant: '2026-11-05T03:30:00Z', localDate: '2026-11-05' },
  { name: 'la-1030-control', timezoneId: 'America/Los_Angeles', instant: '2026-11-04T18:30:00Z', localDate: '2026-11-04' },
  { name: 'utc-1230-control', timezoneId: 'UTC', instant: '2026-11-05T12:30:00Z', localDate: '2026-11-05' },
  { name: 'kst-month-start', timezoneId: 'Asia/Seoul', instant: '2026-03-31T15:30:00Z', localDate: '2026-04-01' },
  { name: 'la-month-end', timezoneId: 'America/Los_Angeles', instant: '2026-04-01T00:30:00Z', localDate: '2026-03-31' },
  { name: 'kst-year-start', timezoneId: 'Asia/Seoul', instant: '2026-12-31T15:30:00Z', localDate: '2027-01-01' },
  { name: 'la-year-end', timezoneId: 'America/Los_Angeles', instant: '2027-01-01T01:30:00Z', localDate: '2026-12-31' },
  { name: 'kst-leap-day', timezoneId: 'Asia/Seoul', instant: '2028-02-28T15:30:00Z', localDate: '2028-02-29' },
  { name: 'la-leap-day', timezoneId: 'America/Los_Angeles', instant: '2028-03-01T01:30:00Z', localDate: '2028-02-29' },
]
let activeScenario = scenarios[0]
const nativeNewContext = browser.newContext.bind(browser)
browser.newContext = async options => {
  const context = await nativeNewContext({ ...options, timezoneId: activeScenario.timezoneId })
  const nativeNewPage = context.newPage.bind(context)
  context.newPage = async () => {
    const page = await nativeNewPage()
    page.setDefaultNavigationTimeout(30000)
    await page.clock.setFixedTime(new Date(activeScenario.instant))
    return page
  }
  return context
}
const dateInput = page => page.locator('#match-field-1')
const opponent = page => page.locator('#match-field-0')
const location = page => page.locator('#match-field-2')
const submit = page => page.locator('button[type="submit"]')
async function setup({ scenario = scenarios[0], width = 390, direct = false } = {}) {
  activeScenario = scenario
  let f
  try {
    f = await fixture({ width, route: direct ? '/match/new' : '/dashboard' })
    f.attempts = []; f.created = []; f.nextCreate = null; f.scenario = scenario
    await f.context.route('**/rest/v1/matches?**', async route => {
      const request = route.request()
      if (request.method() !== 'POST') return route.fallback()
      const body = request.postDataJSON()
      assert(body && !Array.isArray(body), 'Expected one match insert object')
      const attempt = { method: request.method(), path: new URL(request.url()).pathname, body, outcome: 'pending' }
      f.attempts.push(attempt); f.state.writes.push({ method: 'POST', table: 'matches', body })
      const mode = f.nextCreate; f.nextCreate = null
      if (mode) { mode.entered = true; if (mode.wait) await mode.wait; mode.released = true }
      const respond = async (data, status = 200) => { try { await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data), headers: { 'access-control-allow-origin': '*' } }) } catch (error) { if (!/closed|handled|Interception|Fetch domain/.test(error.message)) throw error } }
      if (mode?.failBeforeCommit) { attempt.outcome = 'failure-before-commit'; return respond({ message: 'Synthetic create failure before commit' }, 500) }
      const row = { id: id(3, 900 + f.attempts.length), ...body, status: 'upcoming', home_score: 0, away_score: 0, notes: null, quarters: [], match_attendees: [], created_at: scenario.instant, updated_at: scenario.instant }
      f.created.push(structuredClone(row)); f.state.matches.push(row); attempt.outcome = 'synthetic-committed'; attempt.syntheticId = row.id
      return respond(row)
    })
    if (!direct) await f.page.locator('a[href="/match/new"]').first().click()
    await dateInput(f.page).waitFor()
    await f.page.getByText('가상 A 팀', { exact: true }).waitFor()
    f.date = dateInput(f.page)
    f.initial = await inspectDate(f)
    return f
  } catch (error) { if (f) await f.close(); throw error }
}
async function inspectDate(f) {
  const browserState = await f.page.evaluate(() => {
    const now = new Date()
    return { timezoneId: Intl.DateTimeFormat().resolvedOptions().timeZone, instant: now.toISOString(), localDate: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`, localHour: now.getHours(), localMinute: now.getMinutes() }
  })
  assert.equal(browserState.instant, new Date(f.scenario.instant).toISOString())
  assert.equal(browserState.localDate, f.scenario.localDate)
  const actual = await dateInput(f.page).inputValue()
  assert.equal(actual, f.scenario.localDate, `${f.scenario.name}: default must use browser local date`)
  return { ...browserState, defaultDate: actual }
}
async function shot(page, file) {
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `${output}/${file}`, fullPage: false })
  report.screenshots.push({ file, ...(await page.evaluate(() => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio, scrollWidth: document.documentElement.scrollWidth, fontStatus: document.fonts.status }))) })
}
async function withFixture(work, options) { const f = await setup(options); try { return await work(f) } finally { await f.close() } }
async function run(name, work) {
  if (filter && !name.includes(filter)) return
  const started = Date.now()
  try { const evidence = await work(); report.cases.push({ name, status: 'pass', durationMs: Date.now() - started, ...evidence }) }
  catch (error) { report.cases.push({ name, status: 'fail', durationMs: Date.now() - started, error: error.stack }); process.exitCode = 1 }
  console.log(JSON.stringify(report.cases.at(-1)))
}
async function expectCreated(f, expectedDate) {
  await until(() => f.created.length === 1, 'one synthetic match created')
  await until(() => new URL(f.page.url()).pathname === `/match/${f.created[0].id}`, 'navigation to created match')
  assert.equal(f.attempts.at(-1).body.match_date, expectedDate)
  assert.equal(f.created[0].match_date, expectedDate)
  assert.deepEqual(Object.keys(f.attempts.at(-1).body).sort(), ['team_id', 'opponent', 'match_date', 'location'].sort())
  assert.equal(f.attempts.at(-1).body.team_id, teams[0].id)
  return { initial: f.initial, attempts: f.attempts, syntheticCreated: f.created.map(({ id, match_date, opponent, location }) => ({ id, match_date, opponent, location })) }
}
async function manualPreserved(f) {
  const manual = '2028-03-02'
  await dateInput(f.page).fill(manual)
  await opponent(f.page).fill('가상 수동 날짜 검증 상대')
  await location(f.page).fill('가상 연습장')
  assert.equal(await dateInput(f.page).inputValue(), manual)
  await f.page.clock.setFixedTime(new Date(Date.parse(f.scenario.instant) + 86400000))
  await location(f.page).fill('가상 연습장 수정')
  await opponent(f.page).focus()
  assert.equal(await dateInput(f.page).inputValue(), manual)
  assert.equal(f.state.writes.length, 0)
  return { manualDate: manual, afterFieldEditsAndClockAdvance: await dateInput(f.page).inputValue(), writes: 0 }
}
try {
  for (const [index, scenario] of scenarios.entries()) await run(`${String(index + 1).padStart(2, '0')} ${scenario.name}: default and manual date preservation`, () => withFixture(async f => {
    if (index < 2 || index >= 8) await shot(f.page, `${scenario.name}.png`)
    return { scenario, initial: f.initial, ...(await manualPreserved(f)) }
  }, { scenario }))
  await run('13 direct KST year-boundary hydration and default-date create', () => withFixture(async f => {
    assert.equal(await opponent(f.page).inputValue(), '')
    await opponent(f.page).fill('  가상 기본 날짜 상대  ')
    await location(f.page).fill('  가상 새해 연습장  ')
    await submit(f.page).click()
    const result = await expectCreated(f, f.scenario.localDate)
    assert.equal(f.attempts.length, 1); assert.equal(f.attempts[0].body.opponent, '가상 기본 날짜 상대'); assert.equal(f.attempts[0].body.location, '가상 새해 연습장')
    return { navigation: 'direct document load, hydrated browser date then explicit submit', ...result }
  }, { scenario: scenarios[8], direct: true }))
  await run('14 direct LA leap-day hydration and explicit-date create', () => withFixture(async f => {
    await dateInput(f.page).fill('2028-03-02'); await opponent(f.page).fill('가상 명시 날짜 상대')
    await submit(f.page).click()
    const result = await expectCreated(f, '2028-03-02')
    assert.equal(f.attempts.length, 1); assert.equal(f.attempts[0].body.location, null)
    return { navigation: 'direct document load, hydrated browser default then manual date and explicit submit', ...result }
  }, { scenario: scenarios[11], direct: true }))
  await run('15 physical double-click sends one request while create is pending', () => withFixture(async f => {
    const mode = hold(); f.nextCreate = mode
    try {
      await opponent(f.page).fill('가상 더블클릭 상대')
      const box = await submit(f.page).boundingBox(); assert(box)
      await f.page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2, { delay: 80 })
      await until(() => mode.entered, 'held create entered'); assert(await submit(f.page).isDisabled())
      assert.match(await submit(f.page).textContent(), /생성 중/)
      await f.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
      await pause(100); assert.equal(f.attempts.length, 1); assert.equal(f.created.length, 0)
      await shot(f.page, '390-pending-create-disabled.png')
      mode.release(); const result = await expectCreated(f, f.scenario.localDate)
      assert.equal(f.attempts.length, 1)
      return { gesture: 'physical mouse double-click plus one click while visibly disabled', ...result }
    } finally { mode.release() }
  }))
  await run('16 failure before commit preserves fields and retry succeeds once', () => withFixture(async f => {
    const explicit = '2028-03-03'
    await opponent(f.page).fill('가상 실패 재시도 상대'); await dateInput(f.page).fill(explicit); await location(f.page).fill('가상 재시도 연습장')
    f.nextCreate = { failBeforeCommit: true }; await submit(f.page).click()
    await f.page.getByText('저장에 실패했습니다', { exact: true }).waitFor()
    await until(async () => !await submit(f.page).isDisabled(), 'failed create becomes retryable')
    assert.equal(f.created.length, 0); assert.equal(f.attempts.length, 1)
    assert.equal(await dateInput(f.page).inputValue(), explicit); assert.equal(await opponent(f.page).inputValue(), '가상 실패 재시도 상대'); assert.equal(await location(f.page).inputValue(), '가상 재시도 연습장')
    await shot(f.page, '390-create-failed-input-preserved.png')
    await submit(f.page).click(); const result = await expectCreated(f, explicit)
    assert.equal(f.attempts.length, 2); assert.deepEqual(f.attempts[0].body, f.attempts[1].body)
    return { failureBoundary: 'before synthetic commit; no lost-response or idempotency claim', ...result }
  }))
  await run('17 cancel through header and browser Back before submit writes nothing', () => withFixture(async f => {
    await opponent(f.page).fill('가상 취소할 상대'); await dateInput(f.page).fill('2028-03-05')
    await f.page.locator('header a[href="/dashboard"]').click(); await f.page.waitForURL(/\/dashboard$/)
    assert.equal(f.state.writes.length, 0)
    await f.page.locator('a[href="/match/new"]').first().click(); await dateInput(f.page).waitFor()
    const dateAfterReentry = await dateInput(f.page).inputValue()
    await opponent(f.page).fill('가상 뒤로가기 상대'); await f.page.goBack({ waitUntil: 'networkidle' }); await f.page.waitForURL(/\/dashboard$/)
    assert.equal(f.state.writes.length, 0); assert.equal(f.created.length, 0)
    return { attempts: f.attempts, syntheticWrites: 0, headerBack: true, browserBack: true, dateAfterReentry }
  }))
  await run('18 320px and 390px labels, keyboard order and layout', async () => {
    const evidence = []
    for (const width of [320, 390]) evidence.push(await withFixture(async f => {
      assert.equal(await f.page.getByLabel('경기 날짜 *', { exact: true }).inputValue(), f.scenario.localDate)
      assert.equal(await dateInput(f.page).getAttribute('required'), '')
      await opponent(f.page).fill('가상 모바일 입력 검증 상대')
      await opponent(f.page).focus(); await f.page.keyboard.press('Tab')
      assert(await dateInput(f.page).evaluate(node => document.activeElement === node), 'Date follows opponent in keyboard order')
      await dateInput(f.page).fill('2028-03-04')
      for (let n = 0; n < 6 && !await location(f.page).evaluate(node => document.activeElement === node); n++) await f.page.keyboard.press('Tab')
      assert(await location(f.page).evaluate(node => document.activeElement === node), 'Native date segments lead to location')
      await location(f.page).fill('가상 모바일 연습장'); await f.page.keyboard.press('Tab')
      assert(await submit(f.page).evaluate(node => document.activeElement === node))
      const metrics = await f.page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, fields: [...document.querySelectorAll('form input')].map(node => { const r = node.getBoundingClientRect(); return { id: node.id, labels: [...node.labels].map(label => label.textContent), x: r.x, right: r.right, width: r.width, height: r.height, fontSize: getComputedStyle(node).fontSize } }), submit: (() => { const n = document.querySelector('button[type="submit"]'); const r = n.getBoundingClientRect(); return { width: r.width, height: r.height, outline: getComputedStyle(n).outlineStyle } })(), backLink: (() => { const n = document.querySelector('header a'); const r = n.getBoundingClientRect(); return { label: n.getAttribute('aria-label') || n.textContent.trim(), width: r.width, height: r.height } })() }))
      assert.equal(metrics.width, width); assert(metrics.scrollWidth <= width)
      assert(metrics.fields.every(field => field.labels.length > 0 && field.x >= 0 && field.right <= width))
      assert(metrics.submit.height >= 44 && metrics.submit.width >= 44)
      assert.equal(await dateInput(f.page).inputValue(), '2028-03-04'); assert.equal(f.state.writes.length, 0)
      await shot(f.page, `${width}-labels-keyboard-manual-date.png`)
      if (!metrics.backLink.label || metrics.fields.some(field => Number.parseFloat(field.fontSize) < 16 || field.height < 44)) report.observedLimitations.push({ scope: 'Preexisting new-match form controls unchanged by date fix; no full accessibility-compliance claim', width, backLink: metrics.backLink, fields: metrics.fields })
      return metrics
    }, { width }))
    return { viewports: evidence, syntheticWrites: 0 }
  })
} catch (error) { report.fatal = error.stack; process.exitCode = 1 }
finally {
  await closeBounded(browser, 'match-date browser')
  report.expectedInjectedNetworkErrors = report.consoleErrors.filter(text => /Failed to load resource:.*500/.test(text))
  report.unexpectedConsoleErrors = report.consoleErrors.filter(text => !report.expectedInjectedNetworkErrors.includes(text))
  report.selectedCasesPassed = !report.fatal && report.cases.length > 0 && report.cases.every(item => item.status === 'pass') && !report.pageErrors.length && !report.unexpectedRequests.length && !report.unexpectedConsoleErrors.length && !report.cleanupWarnings.length
  report.passed = !filter && report.cases.length === report.expectedCaseCount && report.selectedCasesPassed
  if (!report.selectedCasesPassed) process.exitCode = 1
  await writeFile(`${output}/browser-results.json`, JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify({ output, passed: report.passed, completed: report.cases.length, expected: report.expectedCaseCount, errors: report.cases.filter(c => c.status !== 'pass'), pageErrors: report.pageErrors, unexpectedRequests: report.unexpectedRequests, unexpectedConsoleErrors: report.unexpectedConsoleErrors, cleanupWarnings: report.cleanupWarnings }, null, 2))
}
