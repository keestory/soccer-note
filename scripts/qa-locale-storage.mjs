/** Real local production UI; synthetic storage faults/auth only. All external requests are intercepted. */
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const { chromium } = await import(pathToFileURL(process.env.SOCCER_QA_PLAYWRIGHT || '/opt/codex/cua_node/lib/node_modules/playwright/index.mjs'))
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true })
const base = 'http://127.0.0.1:3128'
const phase = process.env.SOCCER_QA_PHASE || 'after'
assert(['before', 'after'].includes(phase))
const output = resolve(`docs/design-qa/2026-11-07-locale-storage/${phase}`)
await mkdir(output, { recursive: true })
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()
const report = { observedAt: new Date().toISOString(), phase, sourceHEAD: git('rev-parse', 'HEAD'), workingTree: git('status', '--short'), buildId: (await readFile('.next/BUILD_ID', 'utf8')).trim(), componentBlob: git('hash-object', 'src/lib/i18n/context.tsx'), runnerBlob: git('hash-object', 'scripts/qa-locale-storage.mjs'), scope: 'Actual I18nProvider, onboarding and profile language picker in local Chromium; no native/App Store or production storage verification', cases: [], screenshots: [] }
const key = 'soccernote-locale'
const host = 'soccer-note-test.supabase.co'
const uid = '10000000-0000-4000-8000-000000000001'
const session = { access_token: `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: uid, role: 'authenticated', exp: 4102444800 })).toString('base64url')}.fixture`, refresh_token: 'fictional-refresh-token', expires_at: 4102444800, expires_in: 3600, token_type: 'bearer', user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', user_metadata: {}, app_metadata: {} } }
const locales = { ko: '한국어', en_US: 'English (US)', en_GB: 'English (UK)', ja: '日本語', fr: 'Français', de: 'Deutsch', it: 'Italiano', es: 'Español' }
async function setup({ fault = 'none', saved = 'ko', locale = 'ko-KR', profile = false, width = 390 } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, locale, hasTouch: true, serviceWorkers: 'block' })
  const events = { errors: [], writesBlocked: [], unexpected: [], injected: [] }
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method()
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) { events.writesBlocked.push({ method, path: url.pathname }); return route.abort('blockedbyclient') }
    if (url.origin === base && !url.pathname.startsWith('/api/')) return route.continue()
    const fulfill = body => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body), headers: { 'access-control-allow-origin': '*' } })
    if (url.origin === base && url.pathname === '/api/notifications/unread-count') return fulfill({ count: 0 })
    if (url.origin === base && url.pathname === '/api/team-members-profiles') return fulfill({ profiles: [] })
    if (url.hostname === host && url.pathname.startsWith('/rest/v1/')) {
      if (url.pathname.endsWith('/profiles')) return fulfill(request.headers().accept?.includes('object+json') ? { id: uid, display_name: '가상 코치' } : [{ id: uid, display_name: '가상 코치' }])
      return fulfill([])
    }
    if (url.hostname === host && url.pathname.startsWith('/auth/v1/')) return fulfill(profile ? session.user : null)
    events.unexpected.push({ method, origin: url.origin, path: url.pathname })
    return route.abort('blockedbyclient')
  })
  await context.addInitScript(({ key, fault, saved, profile, session }) => {
    const raw = window.localStorage, get = Storage.prototype.getItem, set = Storage.prototype.setItem
    if (!sessionStorage.getItem('qa-locale-initialized')) {
      if (saved !== null) set.call(raw, key, saved)
      if (profile) set.call(raw, 'sb-soccer-note-test-auth-token', `base64-${btoa(JSON.stringify(session)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')}`)
      sessionStorage.setItem('qa-locale-initialized', '1')
    }
    window.__localeQA = { fault: sessionStorage.getItem('qa-recovered') ? 'none' : fault, hits: [], stored: () => get.call(raw, key), recover: () => { window.__localeQA.fault = 'none'; sessionStorage.setItem('qa-recovered', '1') } }
    const fail = name => { window.__localeQA.hits.push(name); throw new DOMException(`Synthetic ${name} denied`, 'SecurityError') }
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { if (window.__localeQA.fault === 'getter') fail('getter'); return raw } })
    Storage.prototype.getItem = function(name) { if (this === raw && name === key && window.__localeQA.fault === 'getItem') fail('getItem'); return get.call(this, name) }
    Storage.prototype.setItem = function(name, value) { if (this === raw && name === key && window.__localeQA.fault === 'setItem') fail('setItem'); return set.call(this, name, value) }
  }, { key, fault, saved, profile, session })
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  page.on('pageerror', e => events.errors.push(e.message))
  await page.goto(`${base}${profile ? '/profile' : '/'}`, { waitUntil: 'networkidle' })
  return { context, page, events }
}
const language = page => page.locator('main button').filter({ has: page.locator('svg.lucide-globe') })
async function choose(page, code, keyboard = false) {
  await language(page).click()
  const button = page.locator('.fixed button').filter({ hasText: locales[code] })
  if (keyboard) { await button.focus(); await page.keyboard.press('Enter') } else await button.click()
}
async function expectLang(page, code) { await page.waitForFunction(code => document.documentElement.lang === code.replace('_', '-'), code) }
async function capture(page, name) {
  await page.evaluate(() => document.fonts.ready)
  const file = `${name}.png`
  await page.screenshot({ path: `${output}/${file}`, fullPage: false })
  report.screenshots.push({ file, ...await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, lang: document.documentElement.lang })) })
}
async function run(name, options, check) {
  let f
  try {
    f = await setup(options)
    await check(f)
    assert.equal(f.events.unexpected.length, 0, 'No unhandled external request')
    assert.equal(f.events.writesBlocked.length, 0, 'No API write attempted')
    if (phase === 'after') assert.deepEqual(f.events.errors, [], 'No uncaught page exception')
    report.cases.push({ name, status: 'pass', events: f.events, storage: await f.page.evaluate(() => ({ hits: window.__localeQA.hits, stored: window.__localeQA.stored() })) })
  } catch (e) { report.cases.push({ name, status: 'fail', error: e.message, events: f?.events }); process.exitCode = 1 }
  finally { await f?.context.close() }
}
try {
  for (const fault of ['getter', 'getItem']) {
    await run(`initial-${fault}`, { fault, locale: 'fr-FR', width: 320 }, async ({ page, events }) => {
      if (phase === 'before') {
        await page.getByText('This page couldn’t load', { exact: true }).waitFor()
        assert(events.errors.some(message => message.includes(`Synthetic ${fault} denied`)))
        await capture(page, `initial-${fault}`)
      } else {
        await page.locator('main h1').waitFor(); await expectLang(page, 'fr')
        await page.locator('main button').last().click()
        await page.locator('main button').first().click()
        await page.locator('a[href="/login"]').click(); await page.locator('input[type="email"]').waitFor()
        await page.goBack(); await page.locator('main h1').waitFor()
        await capture(page, `initial-${fault}`)
      }
      await page.evaluate(() => window.__localeQA.recover())
      await page.reload({ waitUntil: 'networkidle' }); await page.locator('main h1').waitFor(); await expectLang(page, 'ko')
    })
  }
  for (const fault of ['getter', 'setItem']) {
    await run(`selection-${fault}`, { profile: true }, async ({ page, events }) => {
      await language(page).waitFor()
      await page.evaluate(fault => { window.__localeQA.fault = fault }, fault)
      await choose(page, 'fr', true); await expectLang(page, 'fr')
      assert.equal(await page.evaluate(() => window.__localeQA.stored()), 'ko')
      if (phase === 'before') {
        assert(events.errors.some(message => message.includes(`Synthetic ${fault} denied`)))
        await page.locator('.fixed h3').waitFor()
        await capture(page, `selection-${fault}`)
      } else {
        assert.equal(await page.locator('.fixed h3').count(), 0, 'Selection closes picker')
        for (const code of ['ja', 'de']) { await choose(page, code); await expectLang(page, code) }
        await capture(page, `selection-${fault}`)
        await page.evaluate(() => window.__localeQA.recover())
        await choose(page, 'en_US'); await expectLang(page, 'en_US')
        assert.equal(await page.evaluate(() => window.__localeQA.stored()), 'en_US')
        await page.reload({ waitUntil: 'networkidle' }); await language(page).waitFor(); await expectLang(page, 'en_US')
      }
    })
  }
  if (phase === 'after') {
    for (const code of Object.keys(locales)) await run(`valid-${code}`, { saved: code }, async ({ page }) => { await page.locator('main h1').waitFor(); await expectLang(page, code) })
    for (const [name, saved, locale, expected] of [['missing', null, 'es-MX', 'es'], ['invalid', 'unknown', 'de-DE', 'de'], ['fallback', null, 'zh-CN', 'en_US']]) {
      await run(name, { saved, locale }, async ({ page }) => { await page.locator('main h1').waitFor(); await expectLang(page, expected) })
    }
    await run('normal-save-cancel-navigation-reload', { profile: true, width: 320 }, async ({ page }) => {
      await language(page).waitFor(); await language(page).click()
      const bounds = await page.locator('.fixed button').first().boundingBox()
      assert(bounds.height >= 44, 'Language choice touch target')
      await page.mouse.click(4, 50); assert.equal(await page.locator('.fixed h3').count(), 0)
      await expectLang(page, 'ko'); assert.equal(await page.evaluate(() => window.__localeQA.stored()), 'ko')
      await choose(page, 'ja', true); await expectLang(page, 'ja')
      await page.locator('a[href="/dashboard"]').first().click(); await page.waitForURL('**/dashboard')
      await page.goBack(); await language(page).waitFor(); await expectLang(page, 'ja')
      await page.reload({ waitUntil: 'networkidle' }); await language(page).waitFor(); await expectLang(page, 'ja')
      await capture(page, 'normal-profile-320')
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow')
    })
    await run('initial-setItem-failure', { profile: true, fault: 'setItem' }, async ({ page }) => {
      await language(page).waitFor(); await choose(page, 'es'); await expectLang(page, 'es')
      assert.equal(await page.locator('.fixed h3').count(), 0)
      assert.equal(await page.evaluate(() => window.__localeQA.stored()), 'ko')
      await page.reload({ waitUntil: 'networkidle' }); await language(page).waitFor(); await expectLang(page, 'ko')
    })
  }
} finally {
  await browser.close()
  report.completedAt = new Date().toISOString()
  report.passed = report.cases.every(c => c.status === 'pass') && report.cases.length === (phase === 'before' ? 4 : 17)
  if (!report.passed) process.exitCode = 1
  await writeFile(`${output}/browser-results.json`, JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
}
