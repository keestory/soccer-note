/** Independent acceptance: real UI, loopback only, all data/auth synthetic. */
import assert from 'node:assert/strict'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { base, browser, fixture, matches, report, hold, until, pause, closeBounded, broadcastAuth, makeSession, otherUid } from './qa-team-fixture.mjs'

assert.equal(base, 'http://127.0.0.1:3128')
const output = process.env.SOCCER_QA_OUTPUT || 'docs/design-qa/2026-11-04-notes-save'
await mkdir(output, { recursive: true })
const old = 'OLD: confirmed memo', first = 'A: submitted memo', next = 'B: newer unsaved memo'
const sourceChanges = ['diff', 'untracked'].flatMap(kind => execFileSync('git', kind === 'diff' ? ['diff', '--name-only', 'HEAD', '--', 'src'] : ['ls-files', '--others', '--exclude-standard', '--', 'src'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean))
const evidence = {
  observedAt: new Date().toISOString(),
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  productBlob: execFileSync('git', ['hash-object', 'src/app/match/[id]/page.tsx'], { encoding: 'utf8' }).trim(),
  copyBlob: execFileSync('git', ['hash-object', 'src/lib/match-note-copy.ts'], { encoding: 'utf8' }).trim(),
  productBlobs: Object.fromEntries(['src/app/match/[id]/page.tsx', 'src/lib/match-note-copy.ts'].map(file => [file, execFileSync('git', ['hash-object', file], { encoding: 'utf8' }).trim()])),
  uncommittedProductSource: sourceChanges.length > 0,
  changedProductPaths: sourceChanges,
  buildId: (await readFile('.next/BUILD_ID', 'utf8')).trim(),
  scope: 'Independent native QA; production build with synthetic API/auth. No real user, production DB, billing or native-device proof.',
  timeouts: { interactionsMs: 10000, documentNavigationMs: 30000, reason: 'A prior loopback reload remained in document loading with CSS/JS requests pending at 10s. Navigation remains fully awaited; no production latency claim.' },
  navigationDiagnostics: [],
  cases: [],
}
const copy = {
  ko: { heading: '경기 메모', save: '저장', success: '경기 메모가 저장되었습니다', close: /^(닫기|취소)$/ },
  de: { heading: 'Spielnotizen', save: 'Speichern', success: 'Notiz gespeichert', close: /^(Schließen|Abbrechen)$/ },
}
async function surface(options = {}) {
  const s = await fixture({ route: `/match/${matches[0].id}`, width: options.width || 390, locale: options.locale || 'ko' })
  s.page.setDefaultNavigationTimeout(30000)
  s.copy = copy[options.locale || 'ko']
  s.gate = hold(); s.writes = []; s.abortedResponses = 0
  s.state.matches[0].notes = old
  s.state.matches[1].notes = 'OTHER: separate match memo'
  s.state.matches[1].team_id = s.state.teams[0].id
  await s.context.route('**/rest/v1/**', async route => {
    const req = route.request(), url = new URL(req.url())
    const table = url.pathname.split('/').at(-1)
    if (req.method() !== 'PATCH' || !['matches', 'quarters'].includes(table)) return route.fallback()
    const body = req.postDataJSON(), rowId = url.searchParams.get('id')?.slice(3)
    const row = table === 'matches' ? s.state.matches.find(m => m.id === rowId) : s.state.matches.flatMap(m => m.quarters).find(q => q.id === rowId)
    assert(row, 'Write must stay in synthetic match scope')
    const isMemo = table === 'matches' && Object.hasOwn(body, 'notes')
    const firstMemo = isMemo && !s.writes.some(w => Object.hasOwn(w.body, 'notes'))
    s.writes.push({ table, rowId, body })
    if (!(firstMemo && options.response === '500')) Object.assign(row, body)
    if (firstMemo && options.pending) { s.gate.entered = true; await s.gate.wait }
    try {
      if (firstMemo && options.response === 'lost') await route.abort('connectionfailed')
      else await route.fulfill({ status: firstMemo && options.response === '500' ? 500 : 200, contentType: 'application/json', body: JSON.stringify(firstMemo && options.response === '500' ? { message: 'Injected memo failure' } : [row]) })
    } catch (error) {
      if (!options.navigation || !/Target.*closed|Route is already handled|Invalid InterceptionId|Fetch domain is not enabled|already been handled/i.test(error.message)) throw error
      s.abortedResponses++
    } finally { if (firstMemo) s.gate.released = true }
  })
  const pending = new Map()
  s.page.on('request', request => pending.set(request, { method: request.method(), path: new URL(request.url()).pathname, type: request.resourceType() }))
  s.page.on('requestfinished', request => pending.delete(request))
  s.page.on('requestfailed', request => pending.delete(request))
  try { await s.page.reload({ waitUntil: 'networkidle' }) }
  catch (error) {
    evidence.navigationDiagnostics.push({ operation: 'surface reload', pending: [...pending.values()], page: await s.page.evaluate(() => ({ readyState: document.readyState, path: location.pathname, headings: [...document.querySelectorAll('h1,h3')].map(n => n.textContent), memoPresent: document.body.textContent.includes('OLD: confirmed memo') })).catch(() => null) })
    await s.dispose?.()
    await s.close()
    throw error
  }
  s.section = s.page.locator('section').filter({ has: s.page.getByRole('heading', { name: s.copy.heading, exact: true }) })
  s.input = s.section.locator('textarea')
  s.save = () => s.section.getByRole('button', { name: s.copy.save, exact: true })
  s.success = () => s.page.getByText(s.copy.success, { exact: true })
  s.edit = async () => { await s.section.getByRole('button').first().click(); await s.input.waitFor() }
  s.submit = async (value = first) => { await s.edit(); await s.input.fill(value); await s.save().click() }
  s.release = async () => { s.gate.release(); await until(() => s.gate.released, 'held response released') }
  s.dispose = async () => { s.gate.release(); await s.close() }
  return s
}
async function noSuccess(s) { assert.equal(await s.success().count(), 0, 'Old request must not display a current-edit success') }
async function preserved(s, value) {
  assert.equal(await s.input.count(), 1, 'New editor must remain open')
  assert.equal(await s.input.inputValue(), value)
  assert.equal(await s.input.isEditable(), true)
  await noSuccess(s)
}
async function saveLatestAndReopen(s, value) {
  await s.save().click()
  await until(async () => await s.input.count() === 0, 'latest save acknowledged')
  await s.success().waitFor()
  assert.equal(s.state.matches[0].notes, value.trim() || null)
  await s.page.reload({ waitUntil: 'networkidle' })
  await s.edit()
  assert.equal(await s.input.inputValue(), value.trim())
}

async function normal(blank = false) {
  const s = await surface()
  try {
    await s.submit(blank ? '   ' : `  ${first}  `)
    await until(async () => await s.input.count() === 0, 'same draft success closes editor')
    await s.success().waitFor()
    assert.equal(s.state.matches[0].notes, blank ? null : first)
    await s.page.reload({ waitUntil: 'networkidle' }); await s.edit()
    assert.equal(await s.input.inputValue(), blank ? '' : first)
    return { stored: s.state.matches[0].notes, writes: s.writes }
  } finally { await s.dispose() }
}

async function collision(mode) {
  const s = await surface({ pending: true })
  try {
    await s.edit(); await s.input.fill(first)
    // Two synchronous DOM clicks cover the window before a React rerender.
    await s.save().evaluate(button => { button.click(); button.click() })
    await until(() => s.gate.entered, 'A request pending')
    assert.equal(s.writes.length, 1)
    assert.equal(await s.input.isEditable(), true)
    assert.equal(await s.section.getByRole('button', { name: s.copy.close }).isEnabled(), true)
    if (mode.startsWith('reopen')) {
      await s.section.getByRole('button', { name: s.copy.close }).click()
      await s.edit()
    }
    await s.input.fill(next)
    const expected = mode === 'aba' || mode === 'reopen-identical' ? first : next
    if (expected === first) await s.input.fill(first)
    await s.input.focus()
    await noSuccess(s)
    if (mode === 'edit-b') await s.page.screenshot({ path: `${output}/pending-b-390.png`, fullPage: true })
    await s.release()
    await until(async () => await s.save().isEnabled(), 'A finished, latest save available')
    await preserved(s, expected)
    assert.equal(await s.input.evaluate(node => node === document.activeElement), true, 'Acknowledgment must not steal typing focus')
    assert.equal(s.state.matches[0].notes, first)
    assert.equal(s.writes.length, 1)
    if (mode === 'edit-b') await s.page.screenshot({ path: `${output}/ack-b-retained-390.png`, fullPage: true })
    await saveLatestAndReopen(s, expected)
    return { pendingEditable: true, requestCountBeforeRetry: 1, editorAfterAcknowledgment: expected, storedAfterAcknowledgment: first, staleSuccess: false, finalStored: s.state.matches[0].notes, writes: s.writes }
  } finally { await s.dispose() }
}

async function closePending() {
  const s = await surface({ pending: true })
  try {
    await s.submit(); await until(() => s.gate.entered, 'pending before close')
    await s.section.getByRole('button', { name: s.copy.close }).click()
    assert.equal(await s.input.count(), 0)
    await s.release(); await pause(100)
    assert.equal(await s.input.count(), 0); await noSuccess(s)
    assert.equal(s.state.matches[0].notes, first, 'Close must not be modeled as server rollback')
    await s.edit(); assert.equal(await s.input.inputValue(), first)
    return { closedRemainedClosed: true, submittedWriteMayComplete: true, reopenedConfirmed: first, staleSuccess: false }
  } finally { await s.dispose() }
}

async function failure(response, reopen = false) {
  const s = await surface({ pending: true, response })
  try {
    await s.submit(); await until(() => s.gate.entered, 'pending before injected failure')
    if (reopen) { await s.section.getByRole('button', { name: s.copy.close }).click(); await s.edit() }
    await s.input.fill(next)
    await s.release()
    await until(async () => await s.save().isEnabled(), 'failed request unlocks latest save')
    await preserved(s, next)
    assert.equal(s.state.matches[0].notes, response === 'lost' ? first : old)
    const statusText = await s.section.innerText()
    if (reopen) assert(!statusText.includes('저장 완료를 확인하지'), 'Previous edit session failure must not replace the new session status')
    else assert.match(statusText, /확인|실패/, 'Failure must remain visible in current session')
    if (response === 'lost') await s.page.screenshot({ path: `${output}/unconfirmed-b-390.png`, fullPage: true })
    const storedAfterFailure = s.state.matches[0].notes
    await saveLatestAndReopen(s, next)
    return { failure: response, newSession: reopen, retained: next, storedAfterFailure, staleSuccess: false, finalStored: next, writes: s.writes }
  } finally { await s.dispose() }
}

async function mobile(width, locale) {
  const s = await surface({ width, locale })
  try {
    const editButton = s.section.getByRole('button').first()
    const editInfo = await editButton.evaluate(node => ({ label: node.getAttribute('aria-label'), width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height }))
    assert(editInfo.label); assert(editInfo.width >= 44 && editInfo.height >= 44)
    await s.edit()
    await s.input.fill('A sufficiently long synthetic note for narrow mobile layout.')
    assert.equal(await s.section.getByRole('textbox', { name: s.copy.heading, exact: true }).count(), 1)
    const fontSize = await s.input.evaluate(node => parseFloat(getComputedStyle(node).fontSize))
    assert(fontSize >= 16)
    await s.input.focus(); await s.page.keyboard.press('Tab')
    const focus = await s.page.evaluate(() => ({ text: document.activeElement.textContent, tag: document.activeElement.tagName, outline: getComputedStyle(document.activeElement).outlineStyle, width: getComputedStyle(document.activeElement).outlineWidth }))
    assert.equal(focus.tag, 'BUTTON'); assert.equal(focus.text, s.copy.save)
    assert.notEqual(focus.outline, 'none'); assert(parseFloat(focus.width) >= 2)
    const controls = await s.section.locator('textarea,button').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { tag: node.tagName, x: r.x, right: r.right, width: r.width, height: r.height } }))
    assert(controls.every(c => c.width >= 44 && c.height >= 44 && c.x >= 0 && c.right <= width))
    const viewport = await s.page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth, dpr: devicePixelRatio }))
    assert.equal(viewport.innerWidth, width); assert(viewport.scrollWidth <= width)
    const status = s.section.locator('[role="status"], [aria-live="polite"]')
    assert(await status.count() > 0, 'Memo state must have a polite accessible status')
    await s.page.screenshot({ path: `${output}/mobile-${width}-${locale}.png`, fullPage: true })
    await s.page.keyboard.press('Tab'); await s.page.keyboard.press('Enter')
    assert.equal(await s.input.count(), 0); assert.equal(s.writes.length, 0)
    await s.edit(); assert.equal(await s.input.inputValue(), old)
    return { editInfo, fontSize, focus, controls, viewport, keyboardCancel: true }
  } finally { await s.dispose() }
}

async function navigate(mode) {
  const s = await surface({ pending: true, navigation: true })
  try {
    // Establish a real app-router history entry using existing product links.
    await s.page.locator('header a[href="/dashboard"]').click()
    await s.page.waitForURL(/\/dashboard$/)
    await s.page.locator(`a[href="/match/${matches[0].id}"]`).first().click()
    await s.section.waitFor()
    await s.submit(); await until(() => s.gate.entered, 'pending before navigation')
    if (mode === 'full-navigation') await s.page.goto(`${base}/dashboard`, { waitUntil: 'networkidle' })
    else await s.page.goBack({ waitUntil: 'networkidle' })
    await s.page.waitForURL(/\/dashboard$/)
    if (mode === 'new-match') {
      await s.page.locator('a[href="/matches"]').first().click()
      await s.page.waitForURL(/\/matches$/)
      await s.page.locator(`a[href="/match/${matches[1].id}"]`).first().click()
      await s.section.getByText('OTHER: separate match memo', { exact: true }).waitFor()
    }
    await s.release(); await pause(150); await noSuccess(s)
    if (mode === 'new-match') {
      assert.equal(await s.section.getByText('OTHER: separate match memo', { exact: true }).count(), 1)
      assert.equal(await s.section.getByText(first, { exact: true }).count(), 0)
      assert.equal(s.state.matches[1].notes, 'OTHER: separate match memo')
    } else assert(s.page.url().endsWith('/dashboard'))
    return { mode, staleSuccess: false, finalPath: new URL(s.page.url()).pathname, oldSyntheticWrite: s.state.matches[0].notes, newMatchUnchanged: s.state.matches[1].notes }
  } finally { await s.dispose() }
}

async function account(logout) {
  const s = await surface({ pending: true, navigation: true })
  try {
    await s.submit(); await until(() => s.gate.entered, 'pending before account event')
    await s.input.fill(next)
    await broadcastAuth(s.page, s.state, logout ? null : makeSession(otherUid))
    await until(async () => await s.input.count() === 0, 'old editor invalidated by account change')
    await s.release(); await pause(200); await noSuccess(s)
    assert.equal(await s.input.count(), 0)
    const body = await s.page.locator('body').innerText()
    assert(!body.includes(next), 'Old account unsaved draft must not render in the new context')
    if (!logout) assert.equal(await s.section.getByRole('button').count(), 0, 'New synthetic viewer must not inherit prior owner edit permission')
    return { logout, staleSuccess: false, oldDraftHidden: true, finalPath: new URL(s.page.url()).pathname, oldSyntheticWrite: s.state.matches[0].notes }
  } finally { await s.dispose() }
}

async function scoreWithMemo() {
  const s = await surface({ pending: true })
  try {
    await s.submit(); await until(() => s.gate.entered, 'memo pending before score save')
    await s.input.fill(next)
    await s.page.getByRole('button', { name: /^1\s*:\s*0$/ }).click()
    const inputs = s.page.locator('input[type="number"]')
    await inputs.nth(0).fill('3'); await inputs.nth(1).fill('2')
    await s.page.getByRole('button', { name: '저장', exact: true }).filter({ visible: true }).evaluateAll(buttons => {
      const button = buttons.find(item => !item.closest('section')?.querySelector('textarea'))
      if (!button) throw new Error('Score save control missing')
      button.click()
    })
    await until(async () => await inputs.count() === 0, 'score saved while memo pending')
    await s.release(); await until(async () => await s.save().isEnabled(), 'memo acknowledgment after score')
    await preserved(s, next)
    assert.equal(s.state.matches[0].home_score, 3); assert.equal(s.state.matches[0].away_score, 2)
    await saveLatestAndReopen(s, next)
    assert.equal(s.state.matches[0].home_score, 3); assert.equal(s.state.matches[0].away_score, 2)
    return { score: '3:2', memo: next, writes: s.writes }
  } finally { await s.dispose() }
}

const cases = [
  ['normal save, trim and reload', () => normal()],
  ['blank memo saves null', () => normal(true)],
  ...['edit-b', 'aba', 'reopen-different', 'reopen-identical'].map(mode => [`${mode}: serialize, retain, suppress stale success and save latest`, () => collision(mode)]),
  ['close pending request does not undo acknowledged write', closePending],
  ['failure with newer draft and retry', () => failure('500')],
  ['lost response with newer draft and retry', () => failure('lost')],
  ['failure from canceled session does not overwrite new status', () => failure('500', true)],
  ['mobile 320 ko accessibility and keyboard cancel', () => mobile(320, 'ko')],
  ['mobile 390 de accessibility and keyboard cancel', () => mobile(390, 'de')],
  ...['spa-back', 'full-navigation', 'new-match'].map(mode => [`${mode}: stale response excluded`, () => navigate(mode)]),
  ['account switch invalidates old draft, write response and edit permission', () => account(false)],
  ['logout invalidates old draft and write response', () => account(true)],
  ['score and memo saves preserve each other', scoreWithMemo],
]
const selectedCases = process.env.SOCCER_QA_CASES ? cases.filter(([name]) => new RegExp(process.env.SOCCER_QA_CASES).test(name)) : cases
assert(selectedCases.length > 0)
try {
  for (const [name, run] of selectedCases) {
    try { evidence.cases.push({ name, status: 'pass', ...await run() }); console.log(`PASS ${name}`) }
    catch (error) { evidence.cases.push({ name, status: 'fail', error: error.stack }); console.log(`FAIL ${name}: ${error.message}`); process.exitCode = 1 }
  }
} finally {
  await closeBounded(browser, 'independent notes QA browser')
  const expectedErrors = report.consoleErrors.filter(text => /Failed to load resource:.*(500|ERR_CONNECTION_FAILED|ERR_ABORTED)/.test(text))
  const unexpectedConsoleErrors = report.consoleErrors.filter(text => !expectedErrors.includes(text))
  Object.assign(evidence, { expected: selectedCases.length, totalSuiteCases: cases.length, pageErrors: report.pageErrors, unexpectedRequests: report.unexpectedRequests, expectedInjectedNetworkErrors: expectedErrors, unexpectedConsoleErrors, cleanupWarnings: report.cleanupWarnings })
  evidence.passed = evidence.cases.length === selectedCases.length && evidence.cases.every(c => c.status === 'pass') && !report.pageErrors.length && !report.unexpectedRequests.length && !unexpectedConsoleErrors.length && !report.cleanupWarnings.length
  if (!evidence.passed) process.exitCode = 1
  await writeFile(`${output}/browser-results.json`, JSON.stringify(evidence, null, 2) + '\n')
  console.log(JSON.stringify({ passed: evidence.passed, cases: evidence.cases.length, failures: evidence.cases.filter(c => c.status === 'fail').length, pageErrors: report.pageErrors.length, unexpectedRequests: report.unexpectedRequests.length, unexpectedConsoleErrors: unexpectedConsoleErrors.length, cleanupWarnings: report.cleanupWarnings.length, output }))
}
