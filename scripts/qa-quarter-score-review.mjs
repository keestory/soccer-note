/** Cloud-local synthetic review; no production requests or persisted user data. */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { base, browser, fixture, matches, report, until, hold, pause, closeBounded } from './qa-team-fixture.mjs'

assert.equal(base, 'http://127.0.0.1:3128')
const before = process.argv.includes('--expect-defect')
const navigationOnly = process.argv.includes('--navigation-only')
const output = process.env.SOCCER_QA_OUTPUT || `docs/design-qa/2026-11-03-quarter-score/${before ? 'before' : navigationOnly ? 'after-navigation' : 'after'}`
await mkdir(output, { recursive: true })
const evidence = { observedAt: new Date().toISOString(), mode: before ? 'candidate regression reproduction' : 'acceptance',
  data: 'Synthetic browser fixture; no production DB, real users or billing evidence', cases: [] }

async function surface(options = {}) {
  const s = await fixture({ route: `/match/${matches[0].id}`, width: options.width || 390, locale: options.locale || 'ko' })
  // Cloud-local asset loads can exceed the 10s interaction timeout. Keep
  // assertions bounded at 10s; allow document navigation a separate 30s bound.
  s.page.setDefaultNavigationTimeout(30000)
  s.state.matches[0].quarters.push({ ...structuredClone(s.state.matches[0].quarters[0]),
    id: '40000000-0000-4000-8000-000000000099', quarter_number: 2, home_score: 0, away_score: 0, quarter_records: [] })
  await s.page.reload({ waitUntil: 'networkidle' })
  s.writes = []
  s.gate = hold()
  let failure = options.failure
  await s.context.route('**/rest/v1/**', async route => {
    const req = route.request(), url = new URL(req.url()), table = url.pathname.split('/').at(-1)
    if (req.method() !== 'PATCH' || !['quarters', 'matches'].includes(table)) return route.fallback()
    const patch = req.postDataJSON(), rowId = url.searchParams.get('id')?.slice(3)
    s.writes.push({ table, patch, rowId })
    if (failure === `${table}-error`) {
      failure = ''
      return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Injected score write failure' }) })
    }
    const row = table === 'matches' ? s.state.matches.find(m => m.id === rowId)
      : s.state.matches.flatMap(m => m.quarters).find(q => q.id === rowId)
    assert(row)
    Object.assign(row, patch)
    if (failure === `${table}-lost`) { failure = ''; return route.abort('connectionfailed') }
    if (options.holdTable === table && !s.gate.entered) {
      s.gate.entered = true
      await s.gate.wait
    }
    try { await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([row]) }) }
    catch (error) { if (!options.navigation) throw error }
  })
  return s
}
async function edit(s, score = /^1\s*:\s*0$/, home = '3', away = '2') {
  await s.page.getByRole('button', { name: score }).click()
  const inputs = s.page.locator('input[type="number"]')
  await inputs.nth(0).fill(home); await inputs.nth(1).fill(away)
  return inputs
}
async function concurrent() {
  const s = await surface({ holdTable: 'matches' })
  try {
    const inputs = await edit(s)
    const save = s.page.getByRole('button', { name: '저장', exact: true })
    const controls = await s.page.locator('input[type="number"],button').evaluateAll(nodes => nodes.filter(n => n.tagName === 'INPUT' || ['저장', '취소'].includes(n.textContent)).map(n => ({ text: n.textContent, name: n.getAttribute('aria-label'), width: n.getBoundingClientRect().width, height: n.getBoundingClientRect().height })))
    await save.evaluate((button, reproduce) => { button.click(); if (!reproduce) button.click() }, before)
    await until(() => s.gate.entered, 'first total committed, response held')
    if (before) {
      await s.page.getByRole('button', { name: '2쿼터', exact: true }).click()
      await edit(s, /^0\s*:\s*0$/, '2', '1')
      await s.page.getByRole('button', { name: '저장', exact: true }).click()
      await until(() => s.writes.filter(w => w.table === 'matches').length === 2, 'second total written')
      s.gate.release()
      await until(async () => await inputs.count() === 0, 'both saves completed')
      const total = s.state.matches[0].home_score
      const quarterSum = s.state.matches[0].quarters.reduce((sum, q) => sum + q.home_score, 0)
      assert.equal(total, 3); assert.equal(quarterSum, 5)
      await s.page.screenshot({ path: `${output}/concurrent-total-390.png`, fullPage: true })
      return { name: 'cross-quarter stale total', defectReproduced: true, total, quarterSum, controls, writes: s.writes }
    }
    assert.equal(await inputs.nth(0).isDisabled(), true)
    assert.equal(await s.page.getByRole('button', { name: '2쿼터', exact: true }).isDisabled(), true)
    assert.equal(await s.page.getByRole('button', { name: '취소', exact: true }).isDisabled(), true)
    assert.equal(s.writes.length, 2, 'same-tick repeated clicks must start one write pair')
    s.gate.release()
    await until(async () => await inputs.count() === 0, 'first save acknowledged')
    await s.page.getByRole('button', { name: '2쿼터', exact: true }).click()
    await edit(s, /^0\s*:\s*0$/, '2', '1')
    await s.page.getByRole('button', { name: '저장', exact: true }).click()
    await until(async () => await inputs.count() === 0, 'second save acknowledged')
    assert.equal(s.state.matches[0].home_score, 5); assert.equal(s.state.matches[0].away_score, 3)
    await s.page.reload({ waitUntil: 'networkidle' })
    return { name: 'repeated click and sequential quarter saves', status: 'pass', total: '5:3', writes: s.writes }
  } finally { s.gate.release(); await s.close() }
}

async function partialThenDifferentQuarter() {
  const s = await surface({ failure: 'matches-error' })
  try {
    await edit(s)
    await s.page.getByRole('button', { name: '저장', exact: true }).click()
    await s.page.getByText('점수 저장에 실패했습니다', { exact: false }).waitFor()
    await s.page.getByRole('button', { name: '취소', exact: true }).click()
    await s.page.getByRole('button', { name: '2쿼터', exact: true }).click()
    const inputs = await edit(s, /^0\s*:\s*0$/, '2', '1')
    await s.page.getByRole('button', { name: '저장', exact: true }).click()
    await until(async () => await inputs.count() === 0, 'different quarter saved')
    const total = s.state.matches[0].home_score
    const quarterSum = s.state.matches[0].quarters.reduce((sum, q) => sum + q.home_score, 0)
    assert.equal(total, before ? 3 : 5); assert.equal(quarterSum, 5)
    return { name: 'acknowledged quarter survives total failure, cancel and different quarter save', status: before ? 'defect reproduced' : 'pass', total, quarterSum, writes: s.writes }
  } finally { await s.close() }
}

async function retry(failure) {
  const s = await surface({ failure })
  try {
    const inputs = await edit(s)
    await s.page.getByRole('button', { name: '저장', exact: true }).click()
    await s.page.getByText('점수 저장에 실패했습니다', { exact: false }).waitFor()
    assert.equal(await inputs.nth(0).inputValue(), '3'); assert.equal(await inputs.nth(1).inputValue(), '2')
    assert.equal(await s.page.getByText('점수가 저장되었습니다', { exact: true }).count(), 0)
    assert.equal(await inputs.nth(0).isDisabled(), false)
    if (failure === 'matches-error') await s.page.screenshot({ path: `${output}/failed-retry-390.png`, fullPage: true })
    await s.page.getByRole('button', { name: '저장', exact: true }).click()
    await until(async () => await inputs.count() === 0, 'retry acknowledged')
    await s.page.reload({ waitUntil: 'networkidle' })
    await s.page.getByRole('button', { name: /^3\s*:\s*2$/ }).waitFor()
    assert.equal(s.state.matches[0].home_score, 3)
    return { name: `${failure}: retain, retry and reopen`, status: 'pass', writes: s.writes }
  } finally { await s.close() }
}

async function mobile(width, locale) {
  const s = await surface({ width, locale })
  try {
    await edit(s)
    const inputs = s.page.getByRole('spinbutton')
    assert.equal(await inputs.count(), 2)
    const names = await inputs.evaluateAll(nodes => nodes.map(n => n.getAttribute('aria-label')))
    assert(names.every(Boolean)); assert.notEqual(names[0], names[1])
    await inputs.nth(0).focus(); await s.page.keyboard.press('Tab')
    assert.equal(await inputs.nth(1).evaluate(n => n === document.activeElement), true)
    await s.page.keyboard.press('Tab')
    const focused = await s.page.evaluate(() => ({ tag: document.activeElement.tagName, text: document.activeElement.textContent,
      outlineStyle: getComputedStyle(document.activeElement).outlineStyle, outlineWidth: getComputedStyle(document.activeElement).outlineWidth }))
    assert.equal(focused.tag, 'BUTTON'); assert.notEqual(focused.outlineStyle, 'none'); assert(parseFloat(focused.outlineWidth) >= 2)
    const bounds = await inputs.nth(0).evaluate(n => [...n.parentElement.parentElement.querySelectorAll('input,button')].map(c => {
      const r = c.getBoundingClientRect(); return { name: c.getAttribute('aria-label') || c.textContent, x: r.x, right: r.right, width: r.width, height: r.height }
    }))
    assert(bounds.every(b => b.width >= 44 && b.height >= 44 && b.x >= 0 && b.right <= width))
    const viewport = await s.page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth, dpr: devicePixelRatio }))
    assert.equal(viewport.innerWidth, width); assert(viewport.scrollWidth <= width)
    await s.page.screenshot({ path: `${output}/editor-${width}-${locale}.png`, fullPage: true })
    // Cancel the unsaved draft using only the keyboard, then reopen persisted data.
    await s.page.keyboard.press('Tab'); await s.page.keyboard.press('Enter')
    await until(async () => await inputs.count() === 0, 'keyboard cancel')
    assert.equal(s.writes.length, 0)
    const reopened = await edit(s, /^1\s*:\s*0$/, '1', '0')
    assert.equal(await reopened.nth(0).inputValue(), '1')
    return { name: `mobile ${width} ${locale}: named inputs, keyboard, focus, targets, cancel`, status: 'pass', names, bounds, viewport, focused }
  } finally { await s.close() }
}

async function back(holdTable, spa = false) {
  const s = await surface({ holdTable, navigation: true })
  try {
    // Establish a real history entry, then test browser Back while the write is pending.
    await s.page.locator('header a[href="/dashboard"]').click()
    await s.page.waitForURL(`${base}/dashboard`)
    if (spa) {
      await s.page.locator(`a[href="/match/${matches[0].id}"]`).first().click()
      await s.page.waitForURL(`${base}/match/${matches[0].id}`)
    } else await s.page.goto(`${base}/match/${matches[0].id}`, { waitUntil: 'networkidle' })
    await edit(s)
    await s.page.getByRole('button', { name: '저장', exact: true }).click()
    await until(() => s.gate.entered, 'pending write reached')
    await s.page.goBack({ waitUntil: 'networkidle' })
    assert.equal(new URL(s.page.url()).pathname, '/dashboard')
    s.gate.release(); await pause(300)
    assert.equal(await s.page.getByText('점수가 저장되었습니다', { exact: true }).count(), 0)
    assert.equal(await s.page.getByText('점수 저장에 실패했습니다', { exact: true }).count(), 0)
    if (holdTable === 'quarters') assert.equal(s.writes.filter(w => w.table === 'matches').length, 0, 'do not chain total write after leaving')
    return { name: `${spa ? 'SPA history' : 'full-page history'} Back during ${holdTable} response`, status: 'pass', writes: s.writes,
      limitation: 'Already committed synthetic writes remain; navigation is not server rollback' }
  } finally { s.gate.release(); await s.close() }
}

try {
  if (!navigationOnly) {
    evidence.cases.push(await concurrent())
    evidence.cases.push(await partialThenDifferentQuarter())
  }
  if (!before && !navigationOnly) {
    for (const failure of ['quarters-error', 'matches-error', 'quarters-lost', 'matches-lost']) evidence.cases.push(await retry(failure))
    for (const [width, locale] of [[320, 'ko'], [390, 'ko'], [390, 'de']]) evidence.cases.push(await mobile(width, locale))
    for (const table of ['quarters', 'matches']) evidence.cases.push(await back(table))
  }
  if (navigationOnly) for (const table of ['quarters', 'matches']) evidence.cases.push(await back(table, true))
  assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.unexpectedRequests, [])
} catch (error) { evidence.error = error.stack; process.exitCode = 1 }
finally {
  await closeBounded(browser, 'score review browser')
  Object.assign(evidence, { pageErrors: report.pageErrors, unexpectedRequests: report.unexpectedRequests, consoleErrors: report.consoleErrors, cleanupWarnings: report.cleanupWarnings })
  evidence.unexpectedConsoleErrors = report.consoleErrors.filter(message => !/Failed to load resource:.*(500|ERR_CONNECTION_FAILED|ERR_ABORTED)/.test(message))
  if (evidence.unexpectedConsoleErrors.length || report.cleanupWarnings.length) process.exitCode = 1
  await writeFile(`${output}/browser-results.json`, JSON.stringify(evidence, null, 2) + '\n')
  console.log(JSON.stringify(evidence, null, 2))
}
