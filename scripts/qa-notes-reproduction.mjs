/** Historical defect reproduction for the 46d8a3d baseline build, not fixed-build acceptance. Real UI, synthetic data/auth. */
import assert from 'node:assert/strict'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { base, browser, fixture, matches, report, hold, until, closeBounded } from './qa-team-fixture.mjs'

assert.equal(base, 'http://127.0.0.1:3128')
const output = 'docs/design-qa/2026-11-04-notes-reproduction'
await mkdir(output, { recursive: true })
const evidence = {
  observedAt: new Date().toISOString(), sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  productBlob: execFileSync('git', ['hash-object', 'src/app/match/[id]/page.tsx'], { encoding: 'utf8' }).trim(),
  buildId: (await readFile('.next/BUILD_ID', 'utf8')).trim(),
  scope: 'Cached verified production build with unchanged product source; synthetic in-memory API/auth; no production DB or deployment', cases: [],
}
const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
const old = 'OLD: saved match memo', first = 'A: first submitted memo', next = 'B: later unsaved memo'

async function memo(mode) {
  const s = await fixture({ route: `/match/${matches[0].id}` })
  const gate = hold(), writes = []
  let fail = mode === 'failure-retry'
  s.state.matches[0].notes = old
  await s.context.route('**/rest/v1/**', async route => {
    const req = route.request(), url = new URL(req.url())
    if (req.method() !== 'PATCH' || !url.pathname.endsWith('/matches') || !Object.hasOwn(req.postDataJSON(), 'notes')) return route.fallback()
    const body = req.postDataJSON(); writes.push(body)
    if (fail) { fail = false; return json(route, { message: 'Injected memo save failure' }, 500) }
    s.state.matches[0].notes = body.notes
    if (mode !== 'failure-retry' && !gate.entered) { gate.entered = true; await gate.wait }
    return json(route, [s.state.matches[0]])
  })
  try {
    await s.page.reload({ waitUntil: 'networkidle' })
    const section = s.page.locator('section').filter({ has: s.page.getByRole('heading', { name: '경기 메모', exact: true }) })
    const edit = async () => { await section.getByRole('button').first().click(); await section.locator('textarea').waitFor() }
    await edit()
    await section.locator('textarea').fill(first)
    await section.getByRole('button', { name: '저장', exact: true }).click()
    if (mode === 'failure-retry') {
      await s.page.getByText('저장에 실패했습니다', { exact: true }).waitFor()
      const failed = { editorOpen: await section.locator('textarea').count() === 1, input: await section.locator('textarea').inputValue(), stored: s.state.matches[0].notes,
        successShown: await s.page.getByText('경기 메모가 저장되었습니다', { exact: true }).count() > 0 }
      assert.equal(failed.input, first); assert.equal(failed.stored, old); assert.equal(failed.successShown, false)
      await section.getByRole('button', { name: '저장', exact: true }).click()
      await until(async () => await section.locator('textarea').count() === 0, 'retry closes acknowledged memo')
      assert.equal(s.state.matches[0].notes, first)
      await s.page.reload({ waitUntil: 'networkidle' })
      await section.getByText(first, { exact: true }).waitFor()
      return { name: mode, status: 'existing recovery works in fixture', failed, retryStored: first, reopenedStored: first, writes }
    }
    await until(() => gate.entered, 'A stored, response held')
    if (mode === 'cancel-reopen') { await section.getByRole('button', { name: '취소', exact: true }).click(); await edit() }
    await section.locator('textarea').fill(next)
    const beforeResponse = { editorOpen: true, input: await section.locator('textarea').inputValue(), stored: s.state.matches[0].notes,
      successShown: await s.page.getByText('경기 메모가 저장되었습니다', { exact: true }).count() > 0 }
    await section.scrollIntoViewIfNeeded()
    await s.page.screenshot({ path: `${output}/${mode}-pending-390.png`, fullPage: true })
    gate.release()
    await until(async () => await section.locator('textarea').count() === 0, 'A response closes B editor')
    await s.page.getByText('경기 메모가 저장되었습니다', { exact: true }).waitFor()
    const afterResponse = { editorOpen: false, visibleMemo: await section.locator('p').innerText(), stored: s.state.matches[0].notes, successShown: true }
    assert.equal(afterResponse.visibleMemo, first); assert.equal(afterResponse.stored, first)
    await s.page.screenshot({ path: `${output}/${mode}-closed-390.png`, fullPage: true })
    await edit()
    const reopenedDraft = await section.locator('textarea').inputValue()
    assert.equal(reopenedDraft, next, 'B is recoverable in memory before reload; do not claim instant permanent loss')
    await s.page.reload({ waitUntil: 'networkidle' })
    await edit()
    const reloadedDraft = await section.locator('textarea').inputValue()
    assert.equal(reloadedDraft, first)
    return { name: mode, status: 'editor collision reproduced', beforeResponse, afterResponse, reopenedDraft, reloadedDraft, writes }
  } finally { gate.release(); await s.close() }
}

async function attendees(uniqueConstraint) {
  const s = await fixture({ route: `/match/${matches[0].id}` })
  const a = s.state.players[0], b = { ...a, id: '50000000-0000-4000-8000-000000000099', name: '가상 추가 선수', number: 99 }
  s.state.players.push(b)
  let rows = [{ id: '90000000-0000-4000-8000-000000000001', match_id: matches[0].id, player_id: a.id, player: a }]
  const writes = []; let failDelete = true
  await s.context.route('**/rest/v1/**', async route => {
    const req = route.request(), url = new URL(req.url())
    if (!url.pathname.endsWith('/match_attendees')) return route.fallback()
    if (req.method() === 'GET') return json(route, rows)
    if (req.method() === 'POST') {
      const body = req.postDataJSON(); const duplicate = body.some(item => rows.some(r => r.player_id === item.player_id && r.match_id === item.match_id))
      writes.push({ method: 'POST', duplicate, blocked: uniqueConstraint && duplicate })
      if (uniqueConstraint && duplicate) return json(route, { code: '23505', message: 'Synthetic unique match/player constraint' }, 409)
      rows.push(...body.map((item, i) => ({ ...item, id: `90000000-0000-4000-8000-${String(writes.length * 10 + i).padStart(12, '0')}`, player: b })))
      return json(route, rows)
    }
    if (req.method() === 'DELETE') {
      writes.push({ method: 'DELETE', failed: failDelete })
      if (failDelete) { failDelete = false; return json(route, { message: 'Injected attendee delete failure' }, 500) }
      rows = rows.filter(row => !(url.searchParams.get('id') || '').includes(row.id))
      return json(route, [])
    }
    throw new Error('Unexpected attendee operation')
  })
  try {
    await s.page.reload({ waitUntil: 'networkidle' })
    const section = s.page.locator('section').filter({ has: s.page.getByRole('heading', { name: /^참석 선수 \(/ }) })
    await section.getByRole('button', { name: '수정', exact: true }).click()
    const picker = s.page.locator('div.fixed.inset-0').filter({ has: s.page.getByRole('heading', { name: '참석 선수', exact: true }) })
    await picker.getByRole('button', { name: new RegExp(a.name) }).click()
    await picker.getByRole('button', { name: new RegExp(b.name) }).click()
    await picker.getByRole('button', { name: '1명 저장', exact: true }).click()
    await s.page.getByText('참석 선수 삭제에 실패했습니다', { exact: true }).waitFor()
    const afterFailure = { storedA: rows.filter(r => r.player_id === a.id).length, storedB: rows.filter(r => r.player_id === b.id).length, editorOpen: await picker.count() === 1 }
    await picker.getByRole('button', { name: '1명 저장', exact: true }).click()
    if (uniqueConstraint) await s.page.getByText('참석 선수 저장에 실패했습니다', { exact: true }).waitFor()
    else await s.page.getByText('참석 선수가 저장되었습니다', { exact: true }).waitFor()
    const afterRetry = { storedA: rows.filter(r => r.player_id === a.id).length, storedB: rows.filter(r => r.player_id === b.id).length, editorOpen: await picker.count() === 1 }
    assert.equal(afterRetry.storedB, uniqueConstraint ? 1 : 2)
    assert.equal(afterRetry.storedA, uniqueConstraint ? 1 : 0)
    return { name: 'WORK-13 attendee partial save retry', fixtureConstraint: uniqueConstraint ? 'repository UNIQUE(match_id, player_id) emulated' : 'counterfactual: unique constraint absent',
      status: uniqueConstraint ? 'retry blocked without duplicate accumulation' : 'counterfactual duplicate accumulation', afterFailure, afterRetry, writes,
      limitation: 'Production constraint deployment/state unknown; neither scenario is a production finding' }
  } finally { await s.close() }
}

try {
  for (const mode of ['edit-during-save', 'cancel-reopen', 'failure-retry']) evidence.cases.push(await memo(mode))
  for (const unique of [true, false]) evidence.cases.push(await attendees(unique))
  assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.unexpectedRequests, [])
} catch (error) { evidence.error = error.stack; process.exitCode = 1 }
finally {
  await closeBounded(browser, 'notes reproduction browser')
  Object.assign(evidence, { pageErrors: report.pageErrors, unexpectedRequests: report.unexpectedRequests, consoleErrors: report.consoleErrors, cleanupWarnings: report.cleanupWarnings })
  await writeFile(`${output}/browser-results.json`, JSON.stringify(evidence, null, 2) + '\n')
  console.log(JSON.stringify(evidence, null, 2))
}
