import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { base, browser, fixture, report, closeBounded } from '/workspace/soccer-note/scripts/qa-team-fixture.mjs'

assert.equal(base, 'http://127.0.0.1:3128')
const output = '/workspace/soccer-note/docs/design-qa/2026-11-05-match-date-reproduction'
await mkdir(output, { recursive: true })
const git = (...args) => execFileSync('git', args, { cwd: '/workspace/soccer-note', encoding: 'utf8' }).trim()
const result = {
  observedAt: new Date().toISOString(), scope: 'Read-only product investigation; synthetic browser/auth/data only; no submit or production writes',
  sourceHEAD: git('rev-parse', 'HEAD'), productCommit: '41a4958e8cb46319ed168534edaa999b7fce3cf4',
  buildId: (await readFile('/workspace/soccer-note/.next/BUILD_ID', 'utf8')).trim(),
  newMatchBlob: git('hash-object', 'src/app/match/new/page.tsx'),
  clock: 'Playwright page.clock.setFixedTime before first navigation; browser context timezoneId per case. Server clock unchanged.',
  fontSource: 'Existing cached production-build font assets; no new build, dependency or service',
  cases: [], screenshots: [], errors: [],
}
const scenarios = [
  { name: 'kst-0030-boundary', timezoneId: 'Asia/Seoul', instant: '2026-11-04T15:30:00Z', localDate: '2026-11-05', utcDate: '2026-11-04', expectedMismatch: true },
  { name: 'la-1730-boundary', timezoneId: 'America/Los_Angeles', instant: '2026-11-05T01:30:00Z', localDate: '2026-11-04', utcDate: '2026-11-05', expectedMismatch: true },
  { name: 'utc-0030-control', timezoneId: 'UTC', instant: '2026-11-05T00:30:00Z', localDate: '2026-11-05', utcDate: '2026-11-05', expectedMismatch: false },
  { name: 'kst-1230-control', timezoneId: 'Asia/Seoul', instant: '2026-11-05T03:30:00Z', localDate: '2026-11-05', utcDate: '2026-11-05', expectedMismatch: false },
  { name: 'la-1030-control', timezoneId: 'America/Los_Angeles', instant: '2026-11-04T18:30:00Z', localDate: '2026-11-04', utcDate: '2026-11-04', expectedMismatch: false },
  { name: 'utc-1230-control', timezoneId: 'UTC', instant: '2026-11-05T12:30:00Z', localDate: '2026-11-05', utcDate: '2026-11-05', expectedMismatch: false },
]
const nativeNewContext = browser.newContext.bind(browser)
let scenario
browser.newContext = async options => {
  const context = await nativeNewContext({ ...options, timezoneId: scenario.timezoneId })
  const nativeNewPage = context.newPage.bind(context)
  context.newPage = async () => {
    const page = await nativeNewPage()
    page.setDefaultNavigationTimeout(30000)
    await page.clock.setFixedTime(new Date(scenario.instant))
    return page
  }
  return context
}
try {
  for (scenario of scenarios) {
    let f
    const observed = { ...scenario }
    try {
      f = await fixture()
      await f.page.locator('a[href="/match/new"]').first().click()
      const date = f.page.locator('#match-field-1')
      await date.waitFor()
      await f.page.getByText('가상 A 팀', { exact: true }).waitFor()
      observed.browser = await f.page.evaluate(() => {
        const now = new Date()
        return { timezoneId: Intl.DateTimeFormat().resolvedOptions().timeZone, instant: now.toISOString(), localDate: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`, localHour: now.getHours(), localMinute: now.getMinutes(), cssWidth: innerWidth }
      })
      assert.equal(observed.browser.instant, scenario.instant.replace('Z', '.000Z'))
      assert.equal(observed.browser.localDate, scenario.localDate)
      observed.defaultDate = await date.inputValue()
      observed.mismatch = observed.defaultDate !== scenario.localDate
      assert.equal(observed.defaultDate, scenario.utcDate)
      assert.equal(observed.mismatch, scenario.expectedMismatch)
      await f.page.screenshot({ path: `${output}/${scenario.name}.png`, fullPage: false })
      result.screenshots.push(`${scenario.name}.png`)
      const manual = '2026-11-12'
      await date.fill(manual)
      await f.page.locator('#match-field-0').fill('가상 수동 선택 검증 상대')
      await f.page.locator('#match-field-2').fill('가상 연습장')
      await f.page.locator('#match-field-0').focus()
      observed.manualAfterOtherFieldEdits = await date.inputValue()
      assert.equal(observed.manualAfterOtherFieldEdits, manual)
      await f.page.clock.setFixedTime(new Date(Date.parse(scenario.instant) + 86400000))
      await f.page.locator('#match-field-2').fill('가상 연습장 수정')
      await date.focus()
      observed.manualAfterClockAdvanceAndRerender = await date.inputValue()
      assert.equal(observed.manualAfterClockAdvanceAndRerender, manual)
      assert.equal(f.state.writes.length, 0)
      observed.syntheticWrites = f.state.writes.length
      observed.dataMethods = [...new Set(f.state.requests.map(item => item.method))]
      assert(observed.dataMethods.every(method => method === 'GET'))
      if (scenario.expectedMismatch) {
        await f.page.screenshot({ path: `${output}/${scenario.name}-manual-preserved.png`, fullPage: false })
        result.screenshots.push(`${scenario.name}-manual-preserved.png`)
      }
      observed.investigationStatus = 'pass'
      console.log(JSON.stringify({ case: scenario.name, defaultDate: observed.defaultDate, localDate: scenario.localDate, mismatch: observed.mismatch, manualPreserved: true, writes: 0 }))
    } catch (error) {
      observed.investigationStatus = 'fail'
      observed.error = String(error.stack || error)
      result.errors.push({ case: scenario.name, error: String(error.message || error) })
    } finally { if (f) await f.close() }
    result.cases.push(observed)
  }
} finally {
  await closeBounded(browser, 'date reproduction browser')
  Object.assign(result, { pageErrors: report.pageErrors, consoleErrors: report.consoleErrors, unexpectedRequests: report.unexpectedRequests, cleanupWarnings: report.cleanupWarnings })
  result.investigationPassed = result.cases.length === 6 && result.cases.every(item => item.investigationStatus === 'pass') && !result.errors.length && !report.pageErrors.length && !report.consoleErrors.length && !report.unexpectedRequests.length && !report.cleanupWarnings.length
  result.productDefaultFailuresObserved = result.cases.filter(item => item.mismatch).length
  await writeFile(`${output}/browser-results.json`, JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify({ investigationPassed: result.investigationPassed, cases: result.cases.length, productDefaultFailuresObserved: result.productDefaultFailuresObserved, errors: result.errors, unexpectedRequests: report.unexpectedRequests, pageErrors: report.pageErrors }))
}
if (!result.investigationPassed) process.exitCode = 1
