/** Synthetic browser regression harness. Never connects to a production database.
 * Run: SOCCER_QA_PLAYWRIGHT=/path/to/playwright/index.mjs node scripts/qa-quarter-save.mjs
 * Requires an already running local production build on 127.0.0.1:3127 with
 * NEXT_PUBLIC_SUPABASE_URL=https://soccer-note-test.supabase.co.
 * Explicit deployed-asset fixture run (no real data): set base to the exact
 * https://soccer-note-hazel.vercel.app alias AND SOCCER_QA_ALLOW_PRODUCTION_FIXTURE=1.
 */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const modulePath = process.env.SOCCER_QA_PLAYWRIGHT || '/tmp/soccer-note-browser/node_modules/playwright/index.mjs'
const { chromium } = await import(pathToFileURL(modulePath).href)
const base = process.env.SOCCER_QA_BASE_URL || 'http://127.0.0.1:3127'
const productionFixture = process.env.SOCCER_QA_ALLOW_PRODUCTION_FIXTURE === '1' && base === 'https://soccer-note-hazel.vercel.app'
assert(productionFixture || ['http://localhost:3127', 'http://127.0.0.1:3127'].includes(base), 'Only the exact local app or explicitly authorized production fixture alias is allowed')
const supabaseHost = productionFixture ? 'qfbfkgbqmeqgwnbdphlm.supabase.co' : 'soccer-note-test.supabase.co'
const output = resolve(process.env.SOCCER_QA_OUTPUT || 'docs/design-qa/2026-11-02-quarter-save', productionFixture && !process.env.SOCCER_QA_OUTPUT ? 'production' : '.')
await mkdir(output, { recursive: true })
const ids = { user: '10000000-0000-4000-8000-000000000001', team: '20000000-0000-4000-8000-000000000001', match: '30000000-0000-4000-8000-000000000001', quarter: '40000000-0000-4000-8000-000000000001' }
const players = [1, 2, 3].map(n => ({ id: `50000000-0000-4000-8000-00000000000${n}`, team_id: ids.team, name: `가상 선수 ${['하나', '둘', '셋'][n - 1]}`, number: [9, 7, 11][n - 1], default_position: 'FW', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }))
const record = (n, extra = {}) => ({ id: `60000000-0000-4000-8000-00000000000${n}`, quarter_id: ids.quarter, player_id: players[n - 1].id, position_type: 'FW', position_x: 65, position_y: n === 1 ? 35 : 65, rating: 7, goals: 0, assists: 0, clean_sheet: false, contribution: 0, praise_text: null, improvement_text: null, highlight_text: null, media_urls: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', ...extra })
const session = { access_token: `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: ids.user, role: 'authenticated', exp: 4102444800 })).toString('base64url')}.fixture`, refresh_token: 'fictional-refresh-token', expires_at: 4102444800, expires_in: 3600, token_type: 'bearer', user: { id: ids.user, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', user_metadata: {}, app_metadata: {}, created_at: '2026-01-01T00:00:00Z' } }
const report = { observedAt: new Date().toISOString(), app: base, data: 'Synthetic in-memory fixtures only; all data APIs intercepted', cases: [], consoleErrors: [], pageErrors: [], unexpectedRequests: [], screenshots: [], cleanupWarnings: [] }
const browser = await chromium.launch({ ...(process.env.SOCCER_QA_BROWSER ? { executablePath: process.env.SOCCER_QA_BROWSER } : { channel: 'chrome' }), headless: true })
const pause = ms => new Promise(r => setTimeout(r, ms))
async function closeBounded(surface, label) {
  let timer
  try {
    await Promise.race([
      surface.close(),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Cleanup exceeded 5 seconds')), 5000) }),
    ])
  } catch (error) { report.cleanupWarnings.push({ label, message: error.message }) }
  finally { clearTimeout(timer) }
}
async function persistReport() {
  report.expectedInjectedNetworkErrors = report.consoleErrors.filter(text => /Failed to load resource:.*(500|ERR_CONNECTION_FAILED)/.test(text))
  report.unexpectedConsoleErrors = report.consoleErrors.filter(text => !report.expectedInjectedNetworkErrors.includes(text))
  report.passed = report.cases.length === 8 && report.cases.every(item => item.status === 'pass') && report.pageErrors.length === 0 && report.unexpectedRequests.length === 0 && report.unexpectedConsoleErrors.length === 0 && report.cleanupWarnings.length === 0
  await writeFile(`${output}/browser-results.json`, JSON.stringify(report, null, 2) + '\n')
}

async function fixture({ width = 390, locale = 'ko', initial = [record(1), record(2)] } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1, locale: 'ko-KR', serviceWorkers: 'block' })
  const state = { records: structuredClone(initial), requests: [], posts: [], deletes: [], nextPost: null, nextDelete: null, nextUpload: null, nextSub: null, sequence: 10 }
  await context.addInitScript(({ session, locale, supabaseHost }) => {
    localStorage.setItem('soccernote-locale', locale)
    localStorage.setItem(`sb-${supabaseHost.split('.')[0]}-auth-token`, `base64-${btoa(JSON.stringify(session)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')}`)
  }, { session, locale, supabaseHost })
  const fulfill = (route, data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data), headers: { 'access-control-allow-origin': '*' } })
  async function waitMode(mode) {
    if (mode?.hold) { mode.entered = true; await new Promise(r => { mode.release = r }) }
  }
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method()
    if (url.origin === new URL(base).origin && !url.pathname.startsWith('/api/') && ['GET', 'HEAD'].includes(method)) return route.continue()
    if (url.origin === new URL(base).origin && url.pathname === '/api/team-members-profiles' && method === 'GET') return fulfill(route, { profiles: [] })
    if (url.origin === new URL(base).origin && url.pathname === '/api/upload') {
      const mode = state.nextUpload; state.nextUpload = null
      await waitMode(mode)
      return fulfill(route, { url: `${base}/app-icon-512.png` })
    }
    if (url.hostname !== supabaseHost) {
      report.unexpectedRequests.push({ method, origin: url.origin, path: url.pathname })
      return route.abort('blockedbyclient')
    }
    if (method === 'OPTIONS') return fulfill(route, {})
    if (url.pathname.startsWith('/auth/v1/')) return fulfill(route, session.user)
    const table = url.pathname.split('/').at(-1)
    state.requests.push({ method, table })
    const objectResponse = request.headers().accept?.includes('application/vnd.pgrst.object+json')
    const respondRows = rows => fulfill(route, objectResponse ? rows[0] ?? null : rows)
    if (table === 'matches' && method === 'GET') return respondRows([{ id: ids.match, team_id: ids.team, opponent: '가상 상대팀', match_date: '2026-01-01', quarters: [{ id: ids.quarter, match_id: ids.match, quarter_number: 1, duration_minutes: 25, quarter_records: state.records.map(row => ({ ...row, player: players.find(p => p.id === row.player_id) })) }] }])
    if (table === 'teams' && method === 'GET') return respondRows([{ id: ids.team, user_id: ids.user, name: '가상 QA 팀' }])
    if (table === 'profiles' && method === 'GET') return respondRows([{ id: ids.user, display_name: '가상 코치' }])
    if (['team_members', 'training_sessions'].includes(table) && method === 'GET') return respondRows([])
    if (table === 'team_visibility_settings' && method === 'GET') return respondRows([{ team_id: ids.team }])
    if (table === 'players') return fulfill(route, players)
    if (table === 'match_attendees') return fulfill(route, [])
    if (table === 'quarter_substitutions') {
      if (method === 'POST') {
        const mode = state.nextSub; state.nextSub = null; await waitMode(mode)
        const body = request.postDataJSON()
        return fulfill(route, { ...body, id: '70000000-0000-4000-8000-000000000001', player_out: players.find(p => p.id === body.player_out_id), player_in: players.find(p => p.id === body.player_in_id) })
      }
      return fulfill(route, [])
    }
    if (table === 'quarter_records' && method === 'POST') {
      const body = request.postDataJSON(), mode = state.nextPost; state.nextPost = null
      state.posts.push(structuredClone(body)); await waitMode(mode)
      if (mode?.fail) return fulfill(route, { message: 'Synthetic save failure', code: 'QA_FAIL' }, 500)
      const saved = body.map(item => {
        const existing = state.records.find(row => row.quarter_id === item.quarter_id && row.player_id === item.player_id)
        const row = { ...item, id: existing?.id || `60000000-0000-4000-8000-${String(++state.sequence).padStart(12, '0')}`, created_at: existing?.created_at || '2026-11-02T00:00:00Z', updated_at: '2026-11-02T00:00:00Z' }
        state.records = state.records.filter(r => r.player_id !== item.player_id || r.quarter_id !== item.quarter_id)
        state.records.push(row)
        return row
      })
      if (mode?.lost) return route.abort('connectionfailed')
      return fulfill(route, saved, 201)
    }
    if (table === 'quarter_records' && method === 'DELETE') {
      const filter = url.searchParams.get('id'), quarterFilter = url.searchParams.get('quarter_id'), mode = state.nextDelete; state.nextDelete = null
      state.deletes.push({ filter, quarterFilter }); await waitMode(mode)
      assert.equal(quarterFilter, `eq.${ids.quarter}`)
      assert.match(filter || '', /^in\.\(.+\)$/)
      if (mode?.fail) return fulfill(route, { message: 'Synthetic removal failure', code: 'QA_FAIL' }, 500)
      if (mode?.zero) return fulfill(route, [])
      const selected = filter.slice(4, -1).replaceAll('"', '').split(',')
      const removed = state.records.filter(row => row.quarter_id === ids.quarter && selected.includes(row.id))
      state.records = state.records.filter(row => !removed.includes(row))
      return fulfill(route, removed.map(({ id, quarter_id }) => ({ id, quarter_id })))
    }
    report.unexpectedRequests.push({ method, table, path: url.pathname })
    return fulfill(route, { message: 'Unexpected synthetic request' }, 500)
  })
  const page = await context.newPage()
  page.on('pageerror', error => report.pageErrors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()) })
  await page.goto(`${base}/match/${ids.match}/quarter/1`, { waitUntil: 'networkidle' })
  await page.locator('#quarter-save-status').waitFor()
  return { page, context, state }
}

const status = page => page.locator('#quarter-save-status')
const save = page => page.locator('header button').last()
async function selectPlayer(page, n = 1) { await page.getByRole('button', { name: new RegExp(players[n - 1].name) }).last().click(); await page.locator('section[aria-label="선수 기록"]').waitFor() }
async function changeGoal(page) { await selectPlayer(page); await page.getByRole('button', { name: '골 +', exact: true }).click() }
async function expectReady(page) { await page.waitForFunction(() => document.querySelector('#quarter-save-status')?.textContent === '변경 사항이 모두 저장됐어요.'); assert.equal(await save(page).isDisabled(), true) }
async function expectFailure(page) { await page.waitForFunction(() => document.querySelector('#quarter-save-status')?.getAttribute('role') === 'alert'); assert.equal(await page.locator('fieldset').evaluate(el => el.disabled), true); assert.equal(await save(page).isEnabled(), true) }
async function screenshot(page, file) { await page.evaluate(() => document.fonts.ready); await page.evaluate(() => scrollTo(0, 0)); await page.waitForFunction(() => { const button = document.querySelector('header button:last-child'); return Math.abs(Number(getComputedStyle(button).opacity) - (button.disabled ? 0.5 : 1)) < 0.001 }); await page.screenshot({ path: `${output}/${file}`, fullPage: false }); const metrics = await page.evaluate(() => ({ innerWidth, innerHeight, dpr: devicePixelRatio, scrollWidth: document.documentElement.scrollWidth, fontStatus: document.fonts.status, computedFontFamily: getComputedStyle(document.body).fontFamily, fontFaces: [...new Map([...document.fonts].map(face => [`${face.family}:${face.weight}:${face.status}`, { family: face.family, weight: face.weight, status: face.status }])).values()], statusColor: getComputedStyle(document.querySelector('#quarter-save-status')).color, statusBackground: getComputedStyle(document.querySelector('#quarter-save-status')).backgroundColor, saveOpacity: getComputedStyle(document.querySelector('header button:last-child')).opacity })); report.screenshots.push({ file, ...metrics }) }
async function caseRun(name, action) { if (process.env.SOCCER_QA_CASE && !name.includes(process.env.SOCCER_QA_CASE)) return; const start = Date.now(); try { const evidence = await action(); report.cases.push({ name, status: 'pass', elapsedMs: Date.now() - start, evidence }); await persistReport() } catch (error) { report.cases.push({ name, status: 'fail', error: error.stack }); await persistReport(); throw error } }

try {
  await caseRun('390px delayed full save: one request, edit lock, unchanged IDs, draft back confirmation', async () => {
    const { page, context, state } = await fixture()
    try {
      await expectReady(page); await changeGoal(page)
      await page.getByPlaceholder('잘한 점을 적어주세요').fill('가상 테스트: 입력 유지 확인')
      await page.getByRole('button', { name: '경기로 돌아가기' }).click()
      await page.getByRole('dialog').waitFor()
      await page.getByRole('button', { name: '이 화면에 머무르기', exact: true }).last().click()
      assert.equal(await page.getByRole('dialog').count(), 0)
      assert.equal(await page.getByRole('button', { name: '경기로 돌아가기' }).evaluate(el => el === document.activeElement), true)
      const hold = { hold: true }; state.nextPost = hold
      await save(page).evaluate(el => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); el.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
      while (!hold.entered) await pause(25)
      assert.equal(state.posts.length, 1)
      assert.equal(await save(page).isDisabled(), true)
      assert.equal(await page.locator('fieldset').evaluate(el => el.disabled), true)
      assert.equal(await page.getByRole('button', { name: '골 +', exact: true }).isDisabled(), true)
      const before = await page.locator('.sn-pitch-player').first().getAttribute('style')
      await page.locator('.sn-pitch-player').first().dispatchEvent('keydown', { key: 'ArrowLeft' })
      assert.equal(await page.locator('.sn-pitch-player').first().getAttribute('style'), before)
      await screenshot(page, 'pending-390.png')
      hold.release(); await expectReady(page)
      assert.equal(state.records.find(r => r.player_id === players[0].id).id, record(1).id)
      assert.equal(state.records.find(r => r.player_id === players[0].id).goals, 1)
      assert.equal(await page.getByPlaceholder('잘한 점을 적어주세요').inputValue(), '가상 테스트: 입력 유지 확인')
      assert.equal(state.deletes.length, 0)
      await screenshot(page, 'saved-390.png')
      return { postCount: state.posts.length, deleteCount: 0, goal: 1, stableId: true, focusReturned: true }
    } finally { await closeBounded(context, 'delayed-save context') }
  })
  await caseRun('failed upsert: no delete, retained locked snapshot, successful identical retry', async () => {
    const { page, context, state } = await fixture()
    try {
      await changeGoal(page)
      await page.getByPlaceholder('잘한 점을 적어주세요').fill('실패 후에도 남는 가상 입력')
      state.nextPost = { fail: true }; await save(page).click(); await expectFailure(page)
      assert.equal(state.deletes.length, 0); assert.equal(state.records[0].goals, 0)
      assert.equal(await page.getByPlaceholder('잘한 점을 적어주세요').inputValue(), '실패 후에도 남는 가상 입력')
      await screenshot(page, 'failed-390.png')
      await save(page).click(); await expectReady(page)
      assert.deepEqual(state.posts[0], state.posts[1])
      assert.equal(state.records.find(r => r.player_id === players[0].id).goals, 1)
      assert.equal(await page.locator('fieldset').evaluate(el => el.disabled), false)
      return { identicalRetry: true, noDeleteOnUpsertFailure: true, retainedDraft: true }
    } finally { await closeBounded(context, 'upsert-failure context') }
  })
  await caseRun('partial save removal failure then retry: explicit baseline IDs, unseen concurrent row preserved', async () => {
    const { page, context, state } = await fixture()
    try {
      await changeGoal(page); await selectPlayer(page, 2)
      await page.getByRole('button', { name: '선수를 삭제하시겠습니까?', exact: true }).click()
      state.records.push(record(3))
      state.nextDelete = { fail: true }; await save(page).click(); await expectFailure(page)
      assert.equal(state.records.find(r => r.player_id === players[0].id).goals, 1)
      assert.equal(state.records.length, 3)
      assert.deepEqual(state.requests.filter(r => r.method !== 'GET').slice(-2), [{ method: 'POST', table: 'quarter_records' }, { method: 'DELETE', table: 'quarter_records' }])
      await save(page).click(); await expectReady(page)
      assert.equal(state.records.length, 2)
      assert(state.records.some(r => r.id === record(3).id))
      assert(state.deletes.every(r => r.filter.includes(record(2).id) && !r.filter.includes(record(3).id)))
      return { order: 'upsert then explicit delete', unseenRowPreserved: true, retryConfirmed: true }
    } finally { await closeBounded(context, 'partial-save context') }
  })
  await caseRun('empty lineup: delete only loaded rows and fail closed on missing acknowledgement', async () => {
    const { page, context, state } = await fixture({ initial: [record(1)] })
    try {
      await selectPlayer(page); await page.getByRole('button', { name: '선수를 삭제하시겠습니까?', exact: true }).click()
      state.records.push(record(3)); state.nextDelete = { zero: true }
      await save(page).click(); await expectFailure(page)
      assert.equal(state.posts.length, 0); assert.equal(state.records.length, 2)
      await save(page).click(); await expectReady(page)
      assert.equal(state.records.length, 1); assert.equal(state.records[0].id, record(3).id)
      return { emptySavePermitted: true, zeroAckRejected: true, unseenRowPreserved: true }
    } finally { await closeBounded(context, 'empty-lineup context') }
  })
  await caseRun('new player with lost upsert response: retry preserves one identity without duplicates', async () => {
    const { page, context, state } = await fixture({ initial: [] })
    try {
      await page.getByRole('button', { name: '선수 추가', exact: true }).click()
      await page.getByRole('button', { name: new RegExp(players[0].name) }).click()
      await page.getByRole('button', { name: /명 추가/ }).click()
      state.nextPost = { lost: true }; await save(page).click(); await expectFailure(page)
      const firstId = state.records[0].id
      await save(page).click(); await expectReady(page)
      assert.equal(state.records.length, 1); assert.equal(state.records[0].id, firstId)
      assert.deepEqual(state.posts[0], state.posts[1])
      return { oneRow: true, stableIdAcrossLostResponse: true }
    } finally { await closeBounded(context, 'lost-response context') }
  })
  await caseRun('upload in flight: full save and editing wait, uploaded URL included in next save', async () => {
    const { page, context, state } = await fixture()
    try {
      await changeGoal(page)
      const hold = { hold: true }; state.nextUpload = hold
      await page.locator('input[type=file]').first().setInputFiles({ name: 'synthetic.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXzQAAAAASUVORK5CYII=', 'base64') })
      while (!hold.entered) await pause(25)
      assert.equal(await save(page).isDisabled(), true); assert.equal(await page.locator('fieldset').evaluate(el => el.disabled), true)
      hold.release(); await page.waitForFunction(() => !document.querySelector('fieldset')?.disabled)
      await save(page).click(); await expectReady(page)
      assert.deepEqual(state.records.find(r => r.player_id === players[0].id).media_urls, [`${base}/app-icon-512.png`])
      return { noSaveDuringUpload: true, uploadedUrlRetained: true }
    } finally { await closeBounded(context, 'upload context') }
  })
  await caseRun('substitution in flight: full save waits and new player is included after acknowledgement', async () => {
    const { page, context, state } = await fixture()
    try {
      await page.getByRole('button', { name: '교체 추가', exact: true }).click()
      const modal = page.locator('div.fixed.inset-0.z-50')
      await modal.getByRole('button', { name: '선택하세요', exact: true }).first().click()
      await modal.getByRole('button', { name: new RegExp(players[0].name) }).click()
      await modal.getByRole('button', { name: '선택하세요', exact: true }).click()
      await modal.getByRole('button', { name: new RegExp(players[2].name) }).click()
      const hold = { hold: true }; state.nextSub = hold
      await modal.getByRole('button', { name: '교체 추가', exact: true }).click()
      while (!hold.entered) await pause(25)
      assert.equal(await save(page).isDisabled(), true)
      assert.equal(await page.locator('fieldset').evaluate(el => el.disabled), true)
      assert.equal(state.posts.length, 0)
      hold.release(); await modal.waitFor({ state: 'hidden' })
      await save(page).click(); await expectReady(page)
      assert.equal(state.records.length, 3)
      assert(state.records.some(row => row.player_id === players[2].id))
      return { noSaveDuringSubstitution: true, acknowledgedSubstituteIncluded: true }
    } finally { await closeBounded(context, 'substitution context') }
  })
  await caseRun('320px long German copy: status wraps and primary controls remain at least 44px', async () => {
    const { page, context, state } = await fixture({ width: 320, locale: 'de' })
    try {
      await page.locator('.sn-pitch-player').first().focus()
      await page.keyboard.press('ArrowRight')
      state.nextPost = { fail: true }; await save(page).click(); await expectFailure(page)
      await screenshot(page, 'failed-de-320.png')
      const metrics = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, heights: [...document.querySelectorAll('header button')].map(el => el.getBoundingClientRect().height), lang: document.documentElement.lang, overflow: [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).map(el => ({ tag: el.tagName, text: el.textContent?.slice(0, 100), right: el.getBoundingClientRect().right, className: el.className })).slice(-12) }))
      report.responsiveMetrics = metrics
      assert(metrics.scrollWidth <= metrics.width)
      assert(metrics.heights.every(height => height >= 44))
      assert.equal(metrics.lang, 'de')
      return metrics
    } finally { await closeBounded(context, 'responsive context') }
  })
} finally {
  await persistReport()
  await closeBounded(browser, 'browser')
  await persistReport()
  console.log(JSON.stringify({ passed: report.passed, cases: report.cases.map(({ name, status }) => ({ name, status })), pageErrors: report.pageErrors, unexpectedRequests: report.unexpectedRequests, unexpectedConsoleErrors: report.unexpectedConsoleErrors, cleanupWarnings: report.cleanupWarnings }, null, 2))
  if (!report.passed) process.exitCode = 1
  // Close only this standalone test runner if a browser transport did not exit.
  // Fixture results are already durable; this never terminates unrelated apps.
  if (report.cleanupWarnings.length) process.exit(process.exitCode || 0)
}
