/** Bounded score-save regression. Every data/auth call uses an in-memory fixture. */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { base, browser, fixture, matches, report, until, closeBounded } from './qa-team-fixture.mjs'

assert(['http://127.0.0.1:3127', 'http://127.0.0.1:3128'].includes(base), 'This regression runs only against cloud-local fixture servers')
const before = process.argv.includes('--expect-defect')
const output = resolve('docs/design-qa/2026-11-02-quarter-score', before ? 'before' : 'after')
await mkdir(output, { recursive: true })
const evidence = { observedAt: new Date().toISOString(), mode: before ? 'before-fix reproduction' : 'after-fix acceptance',
  data: 'Synthetic browser fixture; no production DB, real activation or participant experiment', cases: [] }

async function scenario(mode) {
  const surface = await fixture({ route: `/match/${matches[0].id}` })
  const { context, page, state } = surface
  const writes = []
  let failure = mode
  await context.route('**/rest/v1/**', async route => {
    const req = route.request(), url = new URL(req.url()), table = url.pathname.split('/').at(-1)
    if (req.method() !== 'PATCH' || !['quarters', 'matches'].includes(table)) return route.fallback()
    const patch = req.postDataJSON(), rowId = url.searchParams.get('id')?.slice(3)
    writes.push({ table, patch, rowId })
    const fail = failure === `${table}-error`
    if (fail) {
      failure = ''
      return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Injected score write failure' }) })
    }
    const row = table === 'matches' ? state.matches.find(m => m.id === rowId)
      : state.matches.flatMap(m => m.quarters).find(q => q.id === rowId)
    assert(row, 'Write must target an existing fixture row')
    Object.assign(row, patch)
    if (table === 'matches' && failure === 'matches-lost') {
      failure = ''
      return route.abort('connectionfailed')
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([row]) })
  })
  try {
    await page.getByRole('button', { name: /^1\s*:\s*0$/ }).click()
    const inputs = page.locator('input[type="number"]')
    await inputs.nth(0).fill('3')
    await inputs.nth(1).fill('2')
    await page.getByRole('button', { name: '저장', exact: true }).click()
    await until(() => writes.length >= (mode === 'quarters-error' ? 1 : 2), 'injected write reached')
    if (before) {
      await until(async () => await inputs.count() === 0, 'old handler falsely closes editor')
      assert.equal(state.matches[0].home_score, 1)
      assert.equal(state.matches[0].quarters[0].home_score, 3)
      await page.screenshot({ path: `${output}/false-success-390.png`, fullPage: true })
      return { mode, defectReproduced: true, editorClosedDespiteTotalFailure: true,
        storedQuarterScore: 3, storedMatchScore: 1, writes }
    }
    await page.getByText('점수 저장에 실패했습니다', { exact: false }).waitFor()
    assert.equal(await inputs.count(), 2, 'Failed save must retain editor')
    assert.equal(await inputs.nth(0).inputValue(), '3')
    assert.equal(await inputs.nth(1).inputValue(), '2')
    if (mode === 'quarters-error') assert.deepEqual(writes.map(w => w.table), ['quarters'])
    if (mode === 'matches-error') await page.screenshot({ path: `${output}/failed-retry-390.png`, fullPage: true })
    await page.getByRole('button', { name: '저장', exact: true }).click()
    await until(async () => await inputs.count() === 0, 'acknowledged retry closes editor')
    assert.equal(state.matches[0].home_score, 3)
    assert.equal(state.matches[0].away_score, 2)
    assert.equal(state.matches[0].quarters[0].home_score, 3)
    await page.reload({ waitUntil: 'networkidle' })
    await page.getByRole('button', { name: /^3\s*:\s*2$/ }).waitFor()
    if (mode === 'matches-error') await page.screenshot({ path: `${output}/reopened-390.png`, fullPage: true })
    return { mode, status: 'pass', draftRetained: true, retryConfirmed: true, reopenedScore: '3:2', writes }
  } finally { await surface.close() }
}

try {
  for (const mode of before ? ['matches-error'] : ['quarters-error', 'matches-error', 'matches-lost']) {
    evidence.cases.push(await scenario(mode))
  }
  assert.deepEqual(report.pageErrors, [])
  assert.deepEqual(report.unexpectedRequests, [])
} catch (error) {
  evidence.error = error.stack
  process.exitCode = 1
} finally {
  await closeBounded(browser, 'score regression browser')
  evidence.pageErrors = report.pageErrors
  evidence.unexpectedRequests = report.unexpectedRequests
  evidence.consoleErrors = report.consoleErrors
  evidence.cleanupWarnings = report.cleanupWarnings
  await writeFile(`${output}/browser-results.json`, JSON.stringify(evidence, null, 2) + '\n')
  console.log(JSON.stringify(evidence, null, 2))
}
