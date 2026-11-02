/** Shared synthetic browser fixture. All data/auth/API requests stay in memory. */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const base = process.env.SOCCER_QA_BASE_URL || 'http://127.0.0.1:3127'
export const production = base === 'https://soccer-note-hazel.vercel.app' && process.env.SOCCER_QA_ALLOW_PRODUCTION_FIXTURE === '1'
export const preview = process.env.SOCCER_QA_PREVIEW === '1'
assert(production || ['http://127.0.0.1:3127', 'http://localhost:3127', ...(preview ? ['http://127.0.0.1:3126'] : [])].includes(base), 'Only exact authorized fixture origins are allowed')
export const host = production ? 'qfbfkgbqmeqgwnbdphlm.supabase.co' : 'soccer-note-test.supabase.co'
export const authKey = `sb-${host.split('.')[0]}-auth-token`
export const output = resolve('docs/design-qa/2026-11-02-team-switch', production ? 'production' : preview ? 'preview' : 'local')
export const uid = '10000000-0000-4000-8000-000000000001'
export const otherUid = '10000000-0000-4000-8000-000000000002'
export const id = (kind, n) => `${kind}0000000-0000-4000-8000-${String(n).padStart(12, '0')}`
export const teams = ['A', 'B', 'C', 'D'].map((letter, i) => ({
  id: id(2, i + 1), name: `가상 ${letter} 팀`, user_id: i === 1 ? otherUid : i === 3 ? otherUid : uid,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}))
export const players = teams.map((team, i) => ({ id: id(5, i + 1), team_id: team.id, name: `가상 ${'ABCD'[i]} 선수`, number: i + 7, default_position: 'MF', attributes: null, photo_url: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }))
export const matches = teams.map((team, i) => ({
  id: id(3, i + 1), team_id: team.id, opponent: `가상 ${'ABCD'[i]} 상대`, match_date: '2026-01-01', home_score: i + 1, away_score: 0, location: null, status: 'completed',
  quarters: [{ id: id(4, i + 1), match_id: id(3, i + 1), quarter_number: 1, home_score: i + 1, away_score: 0, duration_minutes: 25, quarter_records: [{
    id: id(6, i + 1), quarter_id: id(4, i + 1), player_id: players[i].id, position_type: 'MF', position_x: 50, position_y: 50, rating: 7, goals: i + 1, assists: 0, clean_sheet: false, contribution: 0,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  }] }], match_attendees: [],
}))
export function makeSession(userId = uid) {
  return { access_token: `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: userId, role: 'authenticated', exp: 4102444800 })).toString('base64url')}.fixture`, refresh_token: 'fictional-refresh-token', expires_at: 4102444800, expires_in: 3600, token_type: 'bearer', user: { id: userId, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', user_metadata: {}, app_metadata: {}, created_at: '2026-01-01T00:00:00Z' } }
}
export const report = { observedAt: new Date().toISOString(), app: base, scope: preview ? 'Development screenshots only; not final acceptance' : 'Production-build acceptance', fontSource: production ? 'Deployed font assets' : preview ? 'Development font loading; no final typography acceptance' : 'Local test-only Fontsource mirror of existing Noto Sans KR and Bebas Neue families; no product font/dependency changes', data: 'Synthetic in-memory fixtures; every API and auth request intercepted; no production DB access', cases: [], pageErrors: [], consoleErrors: [], unexpectedRequests: [], screenshots: [], cleanupWarnings: [] }
const modulePath = process.env.SOCCER_QA_PLAYWRIGHT || '/tmp/soccer-note-browser/node_modules/playwright/index.mjs'
const { chromium } = await import(pathToFileURL(modulePath).href)
export const browser = await chromium.launch({ executablePath: process.env.SOCCER_QA_BROWSER || '/usr/bin/chromium', headless: true })
await mkdir(output, { recursive: true })
export const pause = ms => new Promise(r => setTimeout(r, ms))
export async function until(check, label, timeout = 10000) {
  const start = Date.now()
  while (!await check()) { if (Date.now() - start > timeout) throw new Error(`Timed out: ${label}`); await pause(25) }
}
export function hold(extra = {}) {
  let release
  const wait = new Promise(r => { release = r })
  return { wait, release, entered: false, released: false, ...extra }
}
export async function closeBounded(surface, label) {
  let timer
  try { await Promise.race([surface.close(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Cleanup exceeded 5 seconds')), 5000) })]) }
  catch (error) { report.cleanupWarnings.push({ label, message: error.message }) }
  finally { clearTimeout(timer) }
}
export async function persistReport(expected = 12) {
  report.expectedInjectedNetworkErrors = report.consoleErrors.filter(text => /Failed to load resource:.*(500|ERR_CONNECTION_FAILED|ERR_ABORTED)/.test(text))
  report.unexpectedConsoleErrors = report.consoleErrors.filter(text => !report.expectedInjectedNetworkErrors.includes(text))
  const completed = report.cases.length === expected && report.cases.every(item => item.status === 'pass') && !report.pageErrors.length && !report.unexpectedRequests.length && !report.unexpectedConsoleErrors.length && !report.cleanupWarnings.length
  report.passed = preview ? null : completed
  if (preview) report.captureCompleted = completed
  await writeFile(`${output}/browser-results.json`, JSON.stringify(report, null, 2) + '\n')
}
export async function screenshot(page, file) {
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => scrollTo(0, 0))
  await page.screenshot({ path: `${output}/${file}`, fullPage: false })
  const metrics = await page.evaluate(() => ({ innerWidth, innerHeight, dpr: devicePixelRatio, scrollWidth: document.documentElement.scrollWidth, lang: document.documentElement.lang, fontStatus: document.fonts.status, computedFontFamily: getComputedStyle(document.body).fontFamily, fontFaces: [...new Map([...document.fonts].map(face => [`${face.family}:${face.weight}:${face.status}`, { family: face.family, weight: face.weight, status: face.status }])).values()] }))
  report.screenshots.push({ file, ...metrics })
  return metrics
}
export async function fixture({ width = 390, locale = 'ko', route = '/dashboard', longNames = false, initialFailure = false, availableMember = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1, locale: 'ko-KR', serviceWorkers: 'block', hasTouch: true })
  const state = { session: makeSession(), teams: structuredClone(teams), players: structuredClone(players), matches: structuredClone(matches), members: [], requests: [], writes: [], teamModes: new Map(), nextPlayerWrite: null, nextQuarterWrite: null, nextMemberWrite: null }
  if (longNames) state.teams[1].name = 'FiktiverFußballvereinDonaudampfschifffahrtsgesellschaft2026 International'
  if (initialFailure) state.teamModes.set(teams[0].id, { fail: true })
  const membership = { id: id(7, 2), team_id: teams[1].id, user_id: uid, role: 'member', status: 'approved', can_edit_players: false, can_edit_matches: false, can_edit_quarters: false, joined_at: '2026-01-01T00:00:00Z' }
  state.members = [membership]
  if (availableMember) state.members.push({ ...membership, id: id(7, 3), team_id: teams[0].id, user_id: id(1, 3), linked_player_id: null })
  await context.addInitScript(({ session, authKey, locale }) => {
    if (!sessionStorage.getItem('qa-initialized')) {
      localStorage.setItem('soccernote-locale', locale)
      localStorage.setItem(authKey, `base64-${btoa(JSON.stringify(session)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')}`)
      sessionStorage.setItem('qa-initialized', 'true')
    }
    window.__qaFrames = []
    addEventListener('DOMContentLoaded', () => {
      const sample = () => {
        const name = document.querySelector('h1')?.textContent
        const body = document.querySelector('main')?.textContent
        if (name && body) window.__qaFrames.push({ name, body, selected: localStorage.getItem('selectedTeamId') })
      }
      new MutationObserver(sample).observe(document.documentElement, { childList: true, subtree: true, characterData: true })
      sample()
    })
  }, { session: state.session, authKey, locale })
  const fulfill = async (route, data, status = 200) => {
    try { await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data), headers: { 'access-control-allow-origin': '*' } }) }
    catch (error) { if (!/Target.*closed|Route is already handled|Invalid InterceptionId|Fetch domain is not enabled|already been handled/i.test(error.message)) throw error }
  }
  const handleMode = async mode => { if (!mode) return; mode.entered = true; if (mode.wait) await mode.wait; mode.released = true }
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method()
    if (url.origin === new URL(base).origin && !url.pathname.startsWith('/api/') && ['GET', 'HEAD'].includes(method)) return route.continue()
    if (url.origin === new URL(base).origin && url.pathname === '/api/team-members-profiles' && method === 'GET') return fulfill(route, { profiles: availableMember ? [{ id: id(1, 3), display_name: '가상 추가 팀원' }] : [] })
    if (url.origin === new URL(base).origin && url.pathname === '/api/notifications/unread-count' && method === 'GET') return fulfill(route, { count: 0 })
    if (url.hostname !== host) {
      report.unexpectedRequests.push({ method, origin: url.origin, path: url.pathname })
      return route.abort('blockedbyclient')
    }
    if (method === 'OPTIONS') return fulfill(route, {})
    if (url.pathname.startsWith('/auth/v1/')) {
      if (url.pathname.endsWith('/logout')) { state.session = null; return fulfill(route, {}) }
      return fulfill(route, state.session?.user ?? { message: 'No session' }, state.session ? 200 : 401)
    }
    const table = url.pathname.split('/').at(-1)
    const eq = column => url.searchParams.get(column)?.replace(/^eq\./, '')
    const object = request.headers().accept?.includes('application/vnd.pgrst.object+json')
    const respond = data => fulfill(route, object && Array.isArray(data) ? data[0] ?? null : data)
    const teamId = eq('team_id')
    state.requests.push({ method, table, teamId, id: eq('id'), userId: state.session?.user.id })
    if (method === 'GET') {
      if (table === 'profiles') return respond([{ id: state.session?.user.id, display_name: '가상 코치' }])
      if (table === 'teams') return respond(state.teams.filter(team => (!eq('id') || team.id === eq('id')) && (!eq('user_id') || team.user_id === eq('user_id'))))
      if (table === 'team_members') {
        return respond(state.members.filter(member => (!teamId || member.team_id === teamId) && (!eq('user_id') || member.user_id === eq('user_id'))).map(member => ({ ...member, team: state.teams.find(team => team.id === member.team_id) })))
      }
      if (table === 'matches') {
        const mode = state.teamModes.get(teamId)
        if (mode) state.teamModes.delete(teamId)
        const snapshot = structuredClone(state.matches.filter(item => (!teamId || item.team_id === teamId) && (!eq('id') || item.id === eq('id'))).map(match => ({ ...match, quarters: match.quarters.map(quarter => ({ ...quarter, quarter_records: quarter.quarter_records.map(record => ({ ...record, player: state.players.find(player => player.id === record.player_id) })) })) })))
        await handleMode(mode)
        if (mode?.fail) return fulfill(route, { message: 'Synthetic team load failure', code: 'QA_FAIL' }, 500)
        return respond(snapshot)
      }
      if (table === 'players') return respond(state.players.filter(item => !teamId || item.team_id === teamId))
      if (table === 'team_visibility_settings') return respond([{ id: id(8, 1), team_id: teamId, show_goals: true, show_assists: true }])
      if (['training_sessions', 'match_attendees', 'quarter_substitutions', 'match_mom_votes'].includes(table)) return respond([])
    }
    if (table === 'players' && ['POST', 'PATCH'].includes(method)) {
      const mode = state.nextPlayerWrite; state.nextPlayerWrite = null
      const body = request.postDataJSON(); state.writes.push({ method, table, body, id: eq('id') })
      await handleMode(mode)
      if (mode?.fail) return fulfill(route, { message: 'Synthetic player save failure' }, 500)
      const old = state.players.find(player => player.id === eq('id'))
      const saved = { ...old, ...body, id: old?.id || id(5, 100 + state.writes.length), created_at: '2026-01-01T00:00:00Z', updated_at: '2026-11-02T00:00:00Z' }
      state.players = [...state.players.filter(player => player.id !== saved.id), saved]
      return respond(saved)
    }
    if (table === 'team_members' && method === 'PATCH') {
      const mode = state.nextMemberWrite; state.nextMemberWrite = null
      const body = request.postDataJSON(); state.writes.push({ method, table, body, id: eq('id'), teamId })
      await handleMode(mode)
      if (mode?.fail) return fulfill(route, { message: 'Synthetic member-link failure' }, 500)
      const member = state.members.find(item => item.id === eq('id') && (!teamId || item.team_id === teamId))
      assert(member, 'Member link must remain in fixture team scope')
      Object.assign(member, body)
      return respond({ id: member.id, linked_player_id: member.linked_player_id })
    }
    if (table === 'quarter_records' && method === 'POST') {
      const mode = state.nextQuarterWrite; state.nextQuarterWrite = null
      const body = request.postDataJSON(); state.writes.push({ method, table, body })
      await handleMode(mode)
      if (mode?.fail) return fulfill(route, { message: 'Synthetic quarter save failure' }, 500)
      const saved = body.map(record => {
        const quarter = state.matches.flatMap(match => match.quarters).find(q => q.id === record.quarter_id)
        const old = quarter.quarter_records.find(r => r.player_id === record.player_id)
        const row = { ...old, ...record, id: old?.id || id(6, 100 + state.writes.length) }
        quarter.quarter_records = [...quarter.quarter_records.filter(r => r.player_id !== record.player_id), row]
        return row
      })
      return respond(saved)
    }
    report.unexpectedRequests.push({ method, table, path: url.pathname })
    return fulfill(route, { message: 'Unexpected synthetic request' }, 500)
  })
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  page.on('pageerror', error => report.pageErrors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()) })
  await page.goto(`${base}${route}`, { waitUntil: 'networkidle' })
  if (route === '/dashboard' && initialFailure) await page.locator('#team-selection-status').getByRole('alert').waitFor()
  else if (route === '/dashboard') await page.locator('h1').filter({ hasText: state.teams[0].name }).waitFor()
  else if (route === '/team/players') await page.getByRole('button', { name: `선수 수정: ${players[0].name}`, exact: true }).waitFor()
  else if (route.includes('/quarter/')) await page.locator('#quarter-save-status').waitFor()
  return { context, page, state, close: () => closeBounded(context, 'fixture context') }
}
export async function cache(page) { return page.evaluate(() => ({ selected: localStorage.getItem('selectedTeamId'), snapshot: JSON.parse(localStorage.getItem('fn-appcache-v2') || 'null'), permission: JSON.parse(sessionStorage.getItem('team_resolve_10000000-0000-4000-8000-000000000001') || 'null') })) }
export async function assertTeam(page, n) {
  await page.waitForFunction(name => document.querySelector('h1')?.textContent?.includes(name), teams[n].name)
  await page.waitForFunction(opponent => document.querySelector('main')?.textContent?.includes(opponent), matches[n].opponent)
  const value = await cache(page)
  assert.equal(value.selected, teams[n].id)
  assert.equal(value.snapshot.selectedTeamId, teams[n].id)
  assert(value.snapshot.matches.every(match => match.team_id === teams[n].id))
  assert(value.snapshot.players.every(player => player.team_id === teams[n].id))
  assert.equal(value.permission.teamId, teams[n].id)
  assert.equal(value.permission.canEditPlayers, n !== 1)
  const mixed = await page.evaluate(() => window.__qaFrames.filter(frame => ['A', 'B', 'C', 'D'].some(letter => frame.name.includes(`가상 ${letter} 팀`) && ['A', 'B', 'C', 'D'].some(other => other !== letter && frame.body.includes(`가상 ${other} 상대`)))))
  assert.deepEqual(mixed, [], 'A frame paired a team title with another team’s match')
  return value
}
export async function openPicker(page) { await page.locator('h1 button').click(); await page.getByRole('dialog').waitFor() }
export async function choose(page, n, state) { await page.getByRole('dialog').getByRole('button', { name: new RegExp((state?.teams || teams)[n].name) }).click() }
export async function broadcastAuth(page, state, nextSession) {
  state.session = nextSession
  await page.evaluate(({ authKey, nextSession }) => {
    if (nextSession) localStorage.setItem(authKey, `base64-${btoa(JSON.stringify(nextSession)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')}`)
    else localStorage.removeItem(authKey)
    const channel = new BroadcastChannel(authKey)
    channel.postMessage({ event: nextSession ? 'SIGNED_IN' : 'SIGNED_OUT', session: nextSession })
    setTimeout(() => channel.close(), 100)
  }, { authKey, nextSession })
}
