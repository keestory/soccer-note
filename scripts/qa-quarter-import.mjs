/** New quarter import QA: real local production-build UI, synthetic in-memory APIs only. */
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { base, browser, fixture, report, id, players, teams, matches, hold, until, pause, closeBounded, broadcastAuth, makeSession, otherUid, openPicker, choose } from './qa-team-fixture.mjs'
assert.equal(base, 'http://127.0.0.1:3128', 'Import QA is loopback-only, never a deployed origin')
const before = process.argv.includes('--before')
const filter = process.env.SOCCER_QA_CASE || ''
const output = resolve(process.env.SOCCER_QA_OUTPUT || `docs/design-qa/2026-11-04-quarter-import/${before ? 'before' : 'after'}`)
await mkdir(output, { recursive: true })
// Set navigation timeout before the shared fixture creates its first page.
const originalNewContext = browser.newContext.bind(browser)
browser.newContext = async options => {
  const context = await originalNewContext(options)
  context.on('page', page => page.setDefaultNavigationTimeout(30000))
  return context
}
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const productPaths = ['src/app/match/[id]/quarter/[q]/page.tsx', 'src/lib/quarter-import.ts', 'src/lib/quarter-import-copy.ts', 'src/components/design/Sheet.tsx']
Object.assign(report, { feature: 'Selected previous-quarter records to unsaved draft', fontSource: 'CSS and 746 WOFF2 assets reused from the cached pre-feature build via /tmp/soccer-import-fonts/responses.cjs; build-only font responses, no product font/dependency change', mode: before ? 'baseline-capture' : 'acceptance', sourceHEAD: git('rev-parse', 'HEAD'), workingTree: git('status', '--short'), buildId: (await readFile('.next/BUILD_ID', 'utf8')).trim(), productBlobs: {}, assertionTimeoutMs: 10000, navigationTimeoutMs: 30000, filter: filter || null, cases: [], screenshots: [] })
for (const path of productPaths) { try { report.productBlobs[path] = git('hash-object', path) } catch {} }
const targetId = id(4, 102), sourceId = id(4, 1)
const routeTo = (quarter = 2, match = matches[0].id) => `/match/${match}/quarter/${quarter}`
const sourceRecord = (player, n, overrides = {}) => ({ id: id(6, n), quarter_id: sourceId, player_id: player.id, position_type: player.default_position, position_x: 25 + n % 3 * 20, position_y: 25 + n % 3 * 20, rating: 9, goals: 3, assists: 2, clean_sheet: true, contribution: 4, praise_text: 'Fictional old praise', improvement_text: 'Fictional old improvement', highlight_text: 'Fictional old highlight', media_urls: ['https://example.invalid/old-media'], created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', ...overrides })
async function setup({ width = 390, locale = 'ko', browserLanguage, configure = () => {} } = {}) {
  let f
  try {
    f = await fixture({ width, locale })
    f.page.setDefaultNavigationTimeout(30000)
    // Fictional historical media may render on the existing match page after Back.
    // Fulfill only this exact QA URL in memory; never contact its host.
    await f.context.route('https://example.invalid/old-media', route => route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64') }))
    if (browserLanguage) await f.context.addInitScript(language => { Object.defineProperty(navigator, 'language', { get: () => language }); Object.defineProperty(navigator, 'languages', { get: () => [language] }) }, browserLanguage)
    const extra = [11, 12, 13, 14, 15, 16, 17, 18].map((n, i) => ({ ...players[0], id: id(5, n), name: `가상 가져오기 ${i + 1}`, number: n, default_position: i === 0 ? 'FW' : 'MF' }))
    f.state.players.push(...extra)
    const m = f.state.matches[0]
    m.quarters[0].quarter_records = [sourceRecord(players[0], 11, { position_x: 25, position_y: 30 }), sourceRecord(extra[0], 12, { position_x: 70, position_y: 60 }), sourceRecord(extra[1], 13, { position_x: 50, position_y: 50 })]
    m.quarters[0].quarter_substitutions = [{ id: id(9, 1), quarter_id: sourceId, player_out_id: players[0].id, player_in_id: extra[0].id, minute: 12 }]
    m.quarters.push({ id: targetId, match_id: m.id, quarter_number: 2, home_score: 0, away_score: 0, duration_minutes: 25, quarter_records: [], quarter_substitutions: [] }, { id: id(4, 103), match_id: m.id, quarter_number: 3, home_score: 0, away_score: 0, duration_minutes: 25, quarter_records: [], quarter_substitutions: [] })
    f.state.attendees = []
    f.state.nextTargetRead = null
    f.state.importReads = []
    f.state.sequence = 200
    f.source = m.quarters[0]
    f.target = m.quarters[1]
    f.extra = extra
    await configure(f)
    f.originalSource = structuredClone(f.source)
    const reply = async (route, data, status = 200) => { try { await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) }) } catch (e) { if (!/closed|handled|Interception|Fetch domain/.test(e.message)) throw e } }
    await f.context.route('**/rest/v1/**', async route => {
      const req = route.request(), url = new URL(req.url()), table = url.pathname.split('/').at(-1), method = req.method()
      if (table === 'match_attendees' && method === 'GET') return reply(route, f.state.attendees)
      if (table === 'quarter_substitutions' && method === 'GET') {
        const qid = url.searchParams.get('quarter_id')?.replace(/^eq\./, '')
        return reply(route, f.state.matches.flatMap(m => m.quarters).find(q => q.id === qid)?.quarter_substitutions || [])
      }
      if (table !== 'quarter_records') return route.fallback()
      const quarterId = url.searchParams.get('quarter_id')?.replace(/^eq\./, '')
      const quarter = f.state.matches.flatMap(m => m.quarters).find(q => q.id === quarterId)
      if (method === 'GET') {
        f.state.importReads.push({ quarterId, query: url.search })
        const mode = f.state.nextTargetRead; f.state.nextTargetRead = null
        if (mode) { mode.entered = true; if (mode.wait) await mode.wait; mode.released = true }
        if (mode?.fail) return reply(route, { message: 'Synthetic target-read failure' }, 500)
        return reply(route, structuredClone(quarter?.quarter_records || []))
      }
      if (method === 'POST') {
        const body = req.postDataJSON(), mode = f.state.nextQuarterWrite; f.state.nextQuarterWrite = null
        f.state.writes.push({ method, table, body })
        if (mode) { mode.entered = true; if (mode.wait) await mode.wait; mode.released = true }
        if (mode?.fail && !mode.commit) return reply(route, { message: 'Synthetic save failure' }, 500)
        const saved = body.map(row => {
          const q = f.state.matches.flatMap(m => m.quarters).find(item => item.id === row.quarter_id)
          assert(q, 'Write must remain in synthetic fixture')
          const old = q.quarter_records.find(item => item.player_id === row.player_id)
          const next = { ...old, ...row, id: old?.id || id(6, ++f.state.sequence) }
          q.quarter_records = [...q.quarter_records.filter(item => item.player_id !== row.player_id), next]
          return next
        })
        if (mode?.fail) return reply(route, { message: 'Synthetic lost acknowledgement after commit' }, 500)
        return reply(route, saved)
      }
      return route.fallback()
    })
    await f.page.goto(`${base}${routeTo()}`, { waitUntil: 'networkidle', timeout: 30000 })
    await f.page.locator('#quarter-save-status').waitFor()
    return f
  } catch (e) { if (f) await f.close(); throw e }
}
const status = page => page.locator('#quarter-save-status')
const save = page => page.locator('header button').last()
const pitch = page => page.locator('.sn-pitch-player')
const noWrite = f => assert.equal(f.state.writes.length, 0, 'Import/preview must not write to the server')
const sourceUnchanged = f => assert.deepEqual(f.source, f.originalSource, 'Previous quarter must remain immutable')
async function shot(page, name) {
  await page.evaluate(() => document.fonts.ready)
  if (await page.getByRole('dialog').count() === 0) await page.evaluate(() => scrollTo(0, 0))
  await page.screenshot({ path: `${output}/${name}`, fullPage: false })
  report.screenshots.push({ file: name, ...(await page.evaluate(() => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio, scrollWidth: document.documentElement.scrollWidth, fontStatus: document.fonts.status }))) })
}
async function run(name, work) {
  if (filter && !name.includes(filter)) return
  const start = Date.now()
  try { await work(); report.cases.push({ name, status: 'pass', durationMs: Date.now() - start }) }
  catch (e) { report.cases.push({ name, status: 'fail', error: e.stack, durationMs: Date.now() - start }); process.exitCode = 1 }
  console.log(JSON.stringify(report.cases.at(-1)))
}
async function withFixture(work, options) { const f = await setup(options); try { await work(f) } finally { await f.close() } }
try {
  if (before) {
    await run('before: empty second quarter and existing manual workflow', () => withFixture(async f => {
      assert.equal(await pitch(f.page).count(), 0)
      await shot(f.page, '390-empty-quarter2.png')
      await f.page.getByRole('button', { name: '선수 추가', exact: true }).click()
      await shot(f.page, '390-existing-manual-player-selection.png')
      noWrite(f); sourceUnchanged(f)
    }))
  } else {
    await acceptance()
  }
} catch (e) { report.fatal = e.stack; process.exitCode = 1 }
finally {
  await closeBounded(browser, 'browser')
  report.expectedCaseCount = before ? 1 : 22
  report.expectedInjectedNetworkErrors = report.consoleErrors.filter(text => /Failed to load resource:.*(500|ERR_CONNECTION_FAILED|ERR_ABORTED)/.test(text))
  report.unexpectedConsoleErrors = report.consoleErrors.filter(text => !report.expectedInjectedNetworkErrors.includes(text))
  report.passed = !filter && !report.fatal && report.cases.length === report.expectedCaseCount && report.cases.every(c => c.status === 'pass') && !report.pageErrors.length && !report.unexpectedConsoleErrors.length && !report.unexpectedRequests.length && !report.cleanupWarnings.length
  report.selectedCasesPassed = !report.fatal && report.cases.length > 0 && report.cases.every(c => c.status === 'pass') && !report.pageErrors.length && !report.unexpectedConsoleErrors.length && !report.unexpectedRequests.length && !report.cleanupWarnings.length
  if (!report.selectedCasesPassed) process.exitCode = 1
  await writeFile(`${output}/browser-results.json`, JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify({ output, passed: report.passed, cases: report.cases.map(({name,status,error}) => ({name,status,error})), fatal: report.fatal, pageErrors: report.pageErrors, unexpectedRequests: report.unexpectedRequests, cleanupWarnings: report.cleanupWarnings }, null, 2))
}

function entry(page) { return page.getByTestId('quarter-import-open') }
function apply(page) { return page.getByTestId('quarter-import-apply') }
function choice(page, playerId) { return page.getByTestId(`quarter-import-choice-${playerId}`) }
function importStatus(page) { return page.getByTestId('quarter-import-status') }
async function openImport(f) { await entry(f.page).click(); await f.page.getByRole('dialog').waitFor() }
async function select(f, ...ids) { for (const playerId of ids) await choice(f.page, playerId).check() }
async function imported(f, count) { await until(async () => await pitch(f.page).count() === count && await f.page.getByRole('dialog').count() === 0, `import ${count} to draft`); noWrite(f); sourceUnchanged(f); assert.match(await status(f.page).textContent(), /저장하지 않은|Unsaved|non enregistrées/) }
async function applyOne(f) { await openImport(f); await select(f, players[0].id); await apply(f.page).click(); await imported(f, 1) }
async function saveConfirmed(f) { await save(f.page).click(); await until(async () => (await status(f.page).textContent()).includes('변경 사항이 모두 저장됐어요.'), 'save confirmation') }
async function entryBlocked(f) { assert(await entry(f.page).count() === 0 || await entry(f.page).isDisabled(), 'Nonempty target must not allow import'); sourceUnchanged(f) }
async function moveRoute(f, path) { await f.page.goto(`${base}${path}`, { waitUntil: 'networkidle', timeout: 30000 }); await until(() => f.page.url().endsWith(path), `route ${path}`) }
async function openQuarterLink(f, number, matchId = matches[0].id) {
  await f.page.getByRole('button', { name: `${number}쿼터`, exact: true }).click()
  await f.page.locator(`a[href="/match/${matchId}/quarter/${number}"]`).click()
  await f.page.locator('#quarter-save-status').waitFor()
}
async function prepareEditorHistory(f) {
  await f.page.getByRole('button', { name: '경기로 돌아가기', exact: true }).click()
  await openQuarterLink(f, 2)
}
async function releaseMode(mode) { mode.release(); await until(() => mode.released, 'held response released') }
async function pending(f) { const mode = hold(); f.state.nextTargetRead = mode; await openImport(f); await select(f, players[0].id); await apply(f.page).click(); await until(() => mode.entered, 'fresh target read entered'); return mode }
function verifyClean(row, source) {
  assert.equal(row.quarter_id, targetId)
  assert.equal(row.player_id, source.player_id)
  assert.equal(row.position_type, source.position_type)
  assert.equal(row.position_x, Number(source.position_x))
  assert.equal(row.position_y, Number(source.position_y))
  assert.equal(row.rating, null); assert.equal(row.goals, 0); assert.equal(row.assists, 0)
  assert.equal(row.clean_sheet, false); assert.equal(row.contribution, 0)
  for (const field of ['praise_text', 'improvement_text', 'highlight_text', 'media_urls']) assert.equal(row[field], null, `${field} must start empty`)
  assert(!('id' in row)); assert(!('created_at' in row)); assert(!('updated_at' in row))
  assert.deepEqual(Object.keys(row).sort(), ['quarter_id', 'player_id', 'position_type', 'position_x', 'position_y', 'rating', 'goals', 'assists', 'clean_sheet', 'contribution', 'praise_text', 'improvement_text', 'highlight_text', 'media_urls'].sort())
}
async function acceptance() {
  await run('01 zero selection, recorded-player explanation and observed OUT/IN facts', () => withFixture(async f => {
    await shot(f.page, '390-empty-quarter2.png')
    await openImport(f)
    assert.equal(await f.page.getByRole('checkbox', { checked: true }).count(), 0)
    assert(await apply(f.page).isDisabled())
    const text = await f.page.getByRole('dialog').textContent()
    assert.match(text, /기록된 선수/); assert.match(text, /최종/); assert.match(text, /OUT/); assert.match(text, /IN/); assert.match(text, /12/)
    assert.equal(await choice(f.page, players[0].id).isDisabled(), false, 'OUT must remain a selectable record, never inferred excluded')
    assert.equal(await choice(f.page, f.extra[0].id).isDisabled(), false)
    await shot(f.page, '390-recorded-players-zero-selected.png')
    noWrite(f); sourceUnchanged(f)
  }))
  await run('02 selected placement only, explicit Save all and immutable source', () => withFixture(async f => {
    await openImport(f); await select(f, players[0].id, f.extra[0].id); await apply(f.page).click(); await imported(f, 2)
    assert.equal(f.target.quarter_records.length, 0)
    assert.equal(f.target.quarter_substitutions.length, 0)
    const positions = await pitch(f.page).evaluateAll(nodes => nodes.map(n => ({ name: n.getAttribute('aria-label'), left: n.style.left, top: n.style.top })))
    assert.deepEqual(positions.map(p => [p.left, p.top]), [['30%', '75%'], ['60%', '30%']])
    assert(positions.every(p => !/OUT|IN/.test(p.name)))
    await shot(f.page, '390-imported-unsaved-draft.png')
    await saveConfirmed(f)
    assert.equal(f.state.writes.length, 1)
    const body = f.state.writes[0].body
    assert.equal(body.length, 2); body.forEach(row => verifyClean(row, f.source.quarter_records.find(r => r.player_id === row.player_id)))
    assert.equal(f.target.quarter_records.length, 2)
    assert(f.target.quarter_records.every(row => !f.source.quarter_records.some(old => old.id === row.id)))
    sourceUnchanged(f); await entryBlocked(f)
  }))
  await run('03 persisted target records prohibit entry', () => withFixture(async f => { assert.equal(await pitch(f.page).count(), 1); await entryBlocked(f); noWrite(f) }, { configure: f => { f.target.quarter_records = [sourceRecord(players[0], 50, { quarter_id: targetId })] } }))
  await run('04 existing manual draft prohibits import without overwriting', () => withFixture(async f => {
    await f.page.getByRole('button', { name: '선수 추가', exact: true }).click()
    await f.page.getByRole('button', { name: new RegExp(players[0].name) }).click()
    await f.page.getByRole('button', { name: '1명 추가하기', exact: true }).click()
    await until(async () => await pitch(f.page).count() === 1, 'manual player draft')
    await entryBlocked(f); noWrite(f); assert.equal(f.target.quarter_records.length, 0)
  }))
  await run('05 duplicate and conflicting player records are disabled with reasons', () => withFixture(async f => {
    await openImport(f)
    for (const p of [players[0], f.extra[0]]) { assert(await choice(f.page, p.id).isDisabled()); assert(await choice(f.page, p.id).getAttribute('aria-describedby')) }
    const text = await f.page.getByRole('dialog').textContent(); assert.match(text, /같은 선수|중복/); assert.match(text, /서로|상충|다른|불일치/)
    assert.equal(await choice(f.page, players[0].id).count(), 1)
    noWrite(f); sourceUnchanged(f)
  }, { configure: f => { f.source.quarter_records.push({ ...f.source.quarter_records[0], id: id(6, 61) }, { ...f.source.quarter_records[1], id: id(6, 62), position_x: 40 }) } }))
  await run('06 invalid numeric values, missing roster and ineligible attendees disabled', () => withFixture(async f => {
    await openImport(f)
    for (const row of f.source.quarter_records) { assert(await choice(f.page, row.player_id).isDisabled()); assert(await choice(f.page, row.player_id).getAttribute('aria-describedby')) }
    assert(await apply(f.page).isDisabled()); await shot(f.page, '390-invalid-source-records.png'); noWrite(f); sourceUnchanged(f)
  }, { configure: f => {
    const p = [players[0], ...f.extra]
    f.source.quarter_records = p.map((player, i) => sourceRecord(player, 70 + i, { position_x: [null, '', 'NaN', 101, -1, true, '  ', 50, 50][i], position_y: 50 }))
    f.state.players = f.state.players.filter(player => player.id !== f.extra[6].id)
    f.state.attendees = p.filter(player => player.id !== f.extra[7].id).map(player => ({ id: id(8, player.number), match_id: matches[0].id, player_id: player.id, player }))
  } }))
  await run('07 exact coordinate collision blocks selected pair without silent relocation', () => withFixture(async f => {
    await openImport(f); await select(f, players[0].id, f.extra[0].id)
    assert(await apply(f.page).isDisabled()); assert.match(await f.page.getByRole('dialog').textContent(), /위치/)
    await choice(f.page, f.extra[0].id).uncheck(); assert.equal(await apply(f.page).isDisabled(), false)
    await apply(f.page).click(); await imported(f, 1)
    assert.deepEqual(await pitch(f.page).evaluate(n => [n.style.left, n.style.top]), ['30%', '75%'])
  }, { configure: f => { f.source.quarter_records[1].position_x = 25; f.source.quarter_records[1].position_y = 30 } }))
  await run('08 editor-safe bounds preserved and 0/100 edge positions refused', () => withFixture(async f => {
    await openImport(f)
    assert(await choice(f.page, f.extra[1].id).isDisabled()); assert(await choice(f.page, f.extra[2].id).isDisabled())
    await select(f, players[0].id, f.extra[0].id); await apply(f.page).click(); await imported(f, 2)
    assert.deepEqual(await pitch(f.page).evaluateAll(ns => ns.map(n => [n.style.left, n.style.top])), [['10%', '92%'], ['90%', '8%']])
    await saveConfirmed(f); f.state.writes[0].body.forEach(row => verifyClean(row, f.source.quarter_records.find(r => r.player_id === row.player_id)))
    sourceUnchanged(f)
  }, { configure: f => { Object.assign(f.source.quarter_records[0], { position_x: '8', position_y: '10' }); Object.assign(f.source.quarter_records[1], { position_x: 92, position_y: 90 }); Object.assign(f.source.quarter_records[2], { position_x: 0, position_y: 0 }); f.source.quarter_records.push(sourceRecord(f.extra[2], 84, { position_x: 100, position_y: 100 })) } }))
  await run('09 empty previous quarter and quarter one provide no import', () => withFixture(async f => {
    await entryBlocked(f); await moveRoute(f, routeTo(1)); await until(async () => (await f.page.locator('h1').textContent()).includes('1'), 'first quarter loaded'); await entryBlocked(f); noWrite(f)
  }, { configure: f => { f.source.quarter_records = [] } }))
  await run('10 apply rechecks current persisted target occupancy', () => withFixture(async f => {
    await openImport(f); await select(f, players[0].id)
    f.target.quarter_records.push(sourceRecord(f.extra[2], 91, { quarter_id: targetId }))
    await apply(f.page).click(); await until(() => f.state.importReads.length === 1, 'target read')
    await until(async () => !(await apply(f.page).isDisabled()), 'occupancy check completes')
    assert.equal(await pitch(f.page).count(), 0); assert.match(await f.page.getByRole('dialog').getByRole('alert').textContent(), /비어|기록|바뀌|empty|record/i)
    assert.equal(f.target.quarter_records.length, 1); noWrite(f); sourceUnchanged(f)
  }))
  await run('11 target-check failure retains selection and retries without writes', () => withFixture(async f => {
    f.state.nextTargetRead = { fail: true }
    await openImport(f); await select(f, players[0].id); await apply(f.page).click()
    await until(async () => !(await apply(f.page).isDisabled()), 'target error becomes retryable')
    assert(await choice(f.page, players[0].id).isChecked()); assert.match(await f.page.getByRole('dialog').getByRole('alert').textContent(), /확인|다시|실패/); assert.equal(await pitch(f.page).count(), 0); noWrite(f)
    await apply(f.page).click(); await imported(f, 1); assert.equal(f.state.importReads.length, 2)
  }))
  await run('12 repeated same-tick apply performs one check and one draft insertion', () => withFixture(async f => {
    const mode = hold(); f.state.nextTargetRead = mode
    try { await openImport(f); await select(f, players[0].id); await apply(f.page).evaluate(button => { button.click(); button.click() }); await until(() => mode.entered, 'first read'); assert.equal(f.state.importReads.length, 1); await releaseMode(mode); await imported(f, 1); assert.equal(f.state.importReads.length, 1) } finally { mode.release() }
  }))
  await run('13 closing pending check and reopening cannot apply its stale response', () => withFixture(async f => {
    const mode = await pending(f)
    try { await f.page.keyboard.press('Escape'); await until(async () => await f.page.getByRole('dialog').count() === 0, 'close pending picker'); await openImport(f); assert.equal(await f.page.getByRole('checkbox', { checked: true }).count(), 0); await releaseMode(mode); await pause(100); assert.equal(await pitch(f.page).count(), 0); assert(await f.page.getByRole('dialog').isVisible()); noWrite(f); sourceUnchanged(f) } finally { mode.release() }
  }))
  await run('14 cancel and browser back preserve empty target and return focus', () => withFixture(async f => {
    await openImport(f); await select(f, players[0].id); await f.page.keyboard.press('Escape'); await until(async () => await f.page.getByRole('dialog').count() === 0, 'Escape closes picker')
    assert(await entry(f.page).evaluate(n => n === document.activeElement)); assert.equal(await pitch(f.page).count(), 0)
    await openImport(f); await f.page.goBack({ waitUntil: 'domcontentloaded', timeout: 30000 }); await until(async () => !f.page.url().includes('/quarter/'), 'browser back navigation')
    noWrite(f); sourceUnchanged(f); assert.equal(f.target.quarter_records.length, 0)
  }))
  await run('15 pending apply cannot cross quarter or match route changes', async () => {
    for (const destination of ['next-quarter', 'other-match']) await withFixture(async f => {
      await prepareEditorHistory(f)
      const mode = await pending(f)
      try {
        await f.page.goBack({ waitUntil: 'networkidle', timeout: 30000 })
        if (destination === 'next-quarter') await openQuarterLink(f, 3)
        else {
          await f.page.locator('header a[href="/dashboard"]').click(); await f.page.locator('h1').filter({ hasText: teams[0].name }).waitFor()
          await openPicker(f.page); await choose(f.page, 2, f.state); await f.page.locator('h1').filter({ hasText: teams[2].name }).waitFor()
          await f.page.locator(`a[href="/match/${matches[2].id}"]`).first().click(); await openQuarterLink(f, 1, matches[2].id)
        }
        await until(async () => await f.page.getByRole('dialog').count() === 0, 'context clears picker'); await releaseMode(mode); await pause(100); const names = await pitch(f.page).allTextContents(); assert(names.every(name => !name.includes(players[0].name))); assert.equal(f.target.quarter_records.length, 0); noWrite(f); sourceUnchanged(f) } finally { mode.release() }
    })
  })
  await run('16 pending import cannot survive dashboard team switch', () => withFixture(async f => {
    await prepareEditorHistory(f)
    const mode = await pending(f)
    try { await f.page.goBack({ waitUntil: 'networkidle', timeout: 30000 }); await f.page.locator('header a[href="/dashboard"]').click(); await f.page.locator('h1').filter({ hasText: teams[0].name }).waitFor(); await openPicker(f.page); await choose(f.page, 2, f.state); await f.page.locator('h1').filter({ hasText: teams[2].name }).waitFor(); await releaseMode(mode); await pause(100); assert.equal(await f.page.getByRole('dialog').count(), 0); assert.equal(f.target.quarter_records.length, 0); noWrite(f); sourceUnchanged(f) } finally { mode.release() }
  }))
  await run('17 account switch and logout invalidate pending import', async () => {
    for (const next of [makeSession(otherUid), null]) await withFixture(async f => {
      const mode = await pending(f)
      try { await broadcastAuth(f.page, f.state, next); await until(async () => await f.page.getByRole('dialog').count() === 0, 'auth context invalidates picker'); await releaseMode(mode); await pause(100); assert.equal(await pitch(f.page).count(), 0); assert.equal(f.target.quarter_records.length, 0); noWrite(f); sourceUnchanged(f) } finally { mode.release() }
    })
  })
  await run('18 imported draft supports stay and confirmed discard without saving', () => withFixture(async f => {
    await applyOne(f)
    await f.page.getByRole('button', { name: '경기로 돌아가기', exact: true }).click(); await f.page.getByRole('dialog').waitFor()
    await f.page.getByRole('button', { name: '이 화면에 머무르기', exact: true }).filter({ hasText: '이 화면에 머무르기' }).click(); assert.equal(await pitch(f.page).count(), 1)
    await f.page.getByRole('button', { name: '경기로 돌아가기', exact: true }).click(); await f.page.getByRole('button', { name: '이 화면 나가기', exact: true }).click(); await until(() => f.page.url().endsWith(`/match/${matches[0].id}`), 'discard returns to match')
    assert.equal(f.target.quarter_records.length, 0); noWrite(f); sourceUnchanged(f)
  }))
  await run('19 explicit save failure retains imported draft and retry persists once', () => withFixture(async f => {
    await applyOne(f); f.state.nextQuarterWrite = { fail: true }; await save(f.page).click(); await status(f.page).filter({ hasText: '저장 완료를 확인하지 못했어요.' }).waitFor()
    assert.equal(await pitch(f.page).count(), 1); assert.equal(f.target.quarter_records.length, 0); assert.equal(await save(f.page).textContent(), '저장 재시도')
    await saveConfirmed(f); assert.equal(f.target.quarter_records.length, 1); assert.equal(f.state.writes.length, 2); assert.deepEqual(f.state.writes[0].body, f.state.writes[1].body); sourceUnchanged(f)
  }))
  await run('20 lost save acknowledgement retry keeps one row and stable server identity', () => withFixture(async f => {
    await applyOne(f); f.state.nextQuarterWrite = { fail: true, commit: true }; await save(f.page).click(); await status(f.page).filter({ hasText: '저장 완료를 확인하지 못했어요.' }).waitFor()
    assert.equal(f.target.quarter_records.length, 1); const storedId = f.target.quarter_records[0].id; assert.equal(await pitch(f.page).count(), 1)
    await saveConfirmed(f); assert.equal(f.target.quarter_records.length, 1); assert.equal(f.target.quarter_records[0].id, storedId); assert.deepEqual(f.state.writes[0].body, f.state.writes[1].body); sourceUnchanged(f)
  }))
  await run('21 320px dialog keyboard, focus trap, touch targets and editable preview', () => withFixture(async f => {
    await entry(f.page).focus(); await f.page.keyboard.press('Enter'); const dialog = f.page.getByRole('dialog'); await dialog.waitFor()
    assert.equal(await f.page.evaluate(() => innerWidth), 320); assert(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    const first = choice(f.page, players[0].id); await first.focus(); await f.page.keyboard.press('Space'); assert(await first.isChecked())
    const dimensions = await dialog.locator('button, input[type="checkbox"]').evaluateAll(nodes => nodes.filter(n => !n.disabled).map(n => { const r = (n.tagName === 'INPUT' ? n.closest('label') : n).getBoundingClientRect(); return { width: r.width, height: r.height, label: n.getAttribute('aria-label') || n.textContent } }))
    assert(dimensions.every(r => r.width >= 44 && r.height >= 44), JSON.stringify(dimensions))
    for (let i = 0; i < 8; i++) { await f.page.keyboard.press('Tab'); assert(await dialog.evaluate(n => n.contains(document.activeElement)), 'Focus must stay within Sheet') }
    await shot(f.page, '320-keyboard-selected.png')
    const mode = hold(); f.state.nextTargetRead = mode
    try {
      await apply(f.page).focus(); await f.page.keyboard.press('Enter'); await until(() => mode.entered, 'keyboard apply check pending')
      await f.page.keyboard.press('Tab'); assert(await dialog.evaluate(n => n.contains(document.activeElement)), 'Pending disabled Apply must keep Tab inside dialog')
      await f.page.keyboard.press('Shift+Tab'); assert(await dialog.evaluate(n => n.contains(document.activeElement)), 'Pending disabled Apply must keep Shift+Tab inside dialog')
      await releaseMode(mode); await imported(f, 1)
    } finally { mode.release() }
    const player = pitch(f.page).first(); const top = await player.evaluate(n => n.style.top); await player.focus(); await f.page.keyboard.press('ArrowUp'); assert.notEqual(await player.evaluate(n => n.style.top), top)
    assert(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); await shot(f.page, '320-keyboard-adjusted-draft.png'); noWrite(f)
  }, { width: 320 }))
  await run('22 English labels and non-Korean fallback remain usable', async () => {
    for (const locale of ['en_US', 'fr', 'unsupported']) await withFixture(async f => {
      assert((await entry(f.page).textContent()).trim().length > 0); await openImport(f)
      const text = await f.page.getByRole('dialog').textContent(); assert(!text.includes('undefined')); assert.match(text, /recorded|enregistr|선수/i)
      assert.equal(await f.page.getByRole('checkbox', { checked: true }).count(), 0)
      await select(f, players[0].id); await shot(f.page, `390-${locale}-selected.png`); await apply(f.page).click(); await imported(f, 1); noWrite(f)
    }, { locale, browserLanguage: locale === 'unsupported' ? 'zz-ZZ' : undefined })
  })
}
