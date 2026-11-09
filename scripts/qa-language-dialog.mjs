/** WORK-30: real local production components, synthetic reads, no API writes. */
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { base, browser, fixture, report as network } from './qa-team-fixture.mjs'

assert.equal(base, 'http://127.0.0.1:3128')
const output = resolve('docs/design-qa/2026-11-09-language-dialog/after')
await mkdir(output, { recursive: true })
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()
const result = { observedAt: new Date().toISOString(), sourceHEAD: git('rev-parse', 'HEAD'), buildId: (await readFile('.next/BUILD_ID', 'utf8')).trim(), componentBlobs: Object.fromEntries(['src/app/profile/page.tsx', 'src/components/design/Sheet.tsx', 'src/components/ConfirmSheet.tsx'].map(p => [p, git('hash-object', p)])), scope: 'Local Chromium production build, synthetic auth/reads; API writes and external requests blocked. No iOS/App Store/live auth claim.', cases: [], screenshots: [], writesBlocked: [] }
const originalContext = browser.newContext.bind(browser)
browser.newContext = async options => {
  const context = await originalContext(options)
  const originalPage = context.newPage.bind(context)
  context.newPage = async () => {
    await context.route('**/*', route => {
      const r = route.request()
      if (!['GET', 'HEAD', 'OPTIONS'].includes(r.method())) { result.writesBlocked.push({ method: r.method(), path: new URL(r.url()).pathname }); return route.abort('blockedbyclient') }
      return route.fallback()
    })
    return originalPage()
  }
  return context
}
const trigger = p => p.locator('main button').filter({ has: p.locator('svg.lucide-globe') })
const dialog = p => p.getByRole('dialog')
const selected = p => dialog(p).getByRole('button', { pressed: true })
async function isFocused(locator) { return locator.evaluate(e => e === document.activeElement) }
async function open(p) { await trigger(p).focus(); await p.keyboard.press('Enter'); await dialog(p).waitFor(); assert.equal(await trigger(p).getAttribute('aria-expanded'), 'true') }
async function closed(p, locale) {
  assert.equal(await dialog(p).count(), 0)
  assert(await isFocused(trigger(p)), 'Focus returns to language trigger')
  assert.equal(await trigger(p).getAttribute('aria-expanded'), 'false')
  assert.equal(await p.evaluate(() => document.documentElement.lang), locale.replace('_', '-'))
}
async function capture(p, name) {
  await p.evaluate(() => document.fonts.ready)
  await p.screenshot({ path: `${output}/${name}.png`, animations: 'disabled' })
  result.screenshots.push({ file: `${name}.png`, ...await p.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth })) })
}
async function run(name, check, width = 390) {
  let f
  try {
    f = await fixture({ route: '/profile', width }); await trigger(f.page).waitFor()
    const observations = await check(f.page)
    assert.equal(f.state.writes.length, 0)
    result.cases.push({ name, status: 'pass', observations })
  } catch (e) { result.cases.push({ name, status: 'fail', error: e.message }); process.exitCode = 1 }
  finally { await f?.close() }
}
const locales = { ko: '한국어', en_US: 'English (US)', en_GB: 'English (UK)', ja: '日本語', fr: 'Français', de: 'Deutsch', it: 'Italiano', es: 'Español' }
try {
  await run('keyboard-modal-focus-tab-escape-3-rounds', async p => {
    for (let i = 0; i < 3; i++) {
      await open(p)
      assert.equal(await dialog(p).getAttribute('aria-modal'), 'true')
      assert(await dialog(p).getAttribute('aria-label'))
      const buttons = dialog(p).getByRole('button')
      assert.equal(await buttons.count(), 9)
      assert(await isFocused(buttons.first()))
      assert.equal(await selected(p).count(), 1)
      await buttons.last().focus(); await p.keyboard.press('Tab'); assert(await isFocused(buttons.first()))
      await p.keyboard.press('Shift+Tab'); assert(await isFocused(buttons.last()))
      await p.keyboard.press('Escape'); await closed(p, 'ko')
    }
    return { repetitions: 3, modal: true, focusTrap: true, restored: true }
  })
  await run('pointer-outside-cancel-3-rounds', async p => {
    for (let i = 0; i < 3; i++) { await trigger(p).click(); await dialog(p).waitFor(); await p.mouse.click(4, 30); await closed(p, 'ko') }
    assert.equal(await p.evaluate(() => localStorage.getItem('soccernote-locale')), 'ko')
  })
  await run('explicit-close-3-rounds', async p => {
    for (let i = 0; i < 3; i++) { await open(p); const close = dialog(p).getByRole('button').first(); assert(await close.getAttribute('aria-label')); const b = await close.boundingBox(); assert(b.height >= 44 && b.width >= 44); await close.click(); await closed(p, 'ko') }
  })
  for (const [code, label] of Object.entries(locales)) await run(`language-${code}-select-reopen-reload`, async p => {
    await open(p); const choice = dialog(p).getByRole('button', { name: label, exact: true })
    const b = await choice.boundingBox(); assert(b.height >= 44)
    await choice.focus(); await p.keyboard.press('Enter'); await closed(p, code)
    assert.equal(await p.evaluate(() => localStorage.getItem('soccernote-locale')), code)
    await open(p); assert.equal(await dialog(p).getByRole('button', { name: label, exact: true, pressed: true }).count(), 1)
    await p.keyboard.press('Escape'); await closed(p, code)
    await p.reload({ waitUntil: 'networkidle' }); await trigger(p).waitFor()
    assert.equal(await p.evaluate(() => document.documentElement.lang), code.replace('_', '-'))
    if (code === 'de') { await open(p); await capture(p, 'language-de-390'); await p.keyboard.press('Escape') }
  })
  await run('rapid-repeat-choice-and-cancel', async p => {
    for (const [code, label] of [['fr', 'Français'], ['ja', '日本語'], ['de', 'Deutsch']]) {
      await trigger(p).dblclick(); await dialog(p).waitFor(); assert.equal(await dialog(p).count(), 1)
      await dialog(p).getByRole('button', { name: label, exact: true }).click(); await closed(p, code)
    }
    await open(p); await p.keyboard.press('Escape'); await closed(p, 'de')
  })
  for (const width of [320, 390]) await run(`short-mobile-${width}-scroll-and-focus`, async p => {
    await p.setViewportSize({ width, height: 568 }); await open(p)
    assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    assert.equal(await p.evaluate(() => document.body.style.overflow), 'hidden')
    const buttons = dialog(p).getByRole('button')
    await buttons.last().focus()
    let b = await buttons.last().boundingBox(); assert(b.y >= 0 && b.y + b.height <= 568)
    await p.keyboard.press('Tab'); assert(await isFocused(buttons.first()))
    b = await buttons.first().boundingBox(); assert(b.y >= 0 && b.y + b.height <= 568)
    const focus = await buttons.first().evaluate(e => ({ width: getComputedStyle(e).outlineWidth, style: getComputedStyle(e).outlineStyle }))
    assert.notEqual(focus.style, 'none'); assert(parseFloat(focus.width) > 0)
    await capture(p, `language-short-${width}`)
    await p.keyboard.press('Escape'); await closed(p, 'ko')
    assert.notEqual(await p.evaluate(() => document.body.style.overflow), 'hidden')
  }, width)
  await run('shared-confirm-sheet-unchanged-3-rounds', async p => {
    const logout = p.locator('main button').filter({ has: p.locator('svg.lucide-log-out') })
    for (let i = 0; i < 3; i++) {
      await logout.focus(); await p.keyboard.press('Enter'); await dialog(p).waitFor()
      const buttons = dialog(p).getByRole('button'); assert(await isFocused(buttons.first()))
      await buttons.last().focus(); await p.keyboard.press('Tab'); assert(await isFocused(buttons.first()))
      await p.keyboard.press('Shift+Tab'); assert(await isFocused(buttons.last()))
      await p.keyboard.press('Escape'); assert.equal(await dialog(p).count(), 0); assert(await isFocused(logout))
    }
    return { confirmAction: 'never activated' }
  })
  await run('browser-back-unmount-and-return', async p => {
    await p.goto(`${base}/dashboard`, { waitUntil: 'networkidle' }); await p.goto(`${base}/profile`, { waitUntil: 'networkidle' }); await trigger(p).waitFor()
    await open(p); await p.goBack({ waitUntil: 'networkidle' }); assert(new URL(p.url()).pathname === '/dashboard')
    assert.notEqual(await p.evaluate(() => document.body.style.overflow), 'hidden')
    await p.goForward({ waitUntil: 'networkidle' }); await trigger(p).waitFor(); assert.equal(await dialog(p).count(), 0)
    await open(p); await p.keyboard.press('Escape'); await closed(p, 'ko')
  })
} finally {
  await browser.close()
  Object.assign(result, { completedAt: new Date().toISOString(), pageErrors: network.pageErrors, consoleErrors: network.consoleErrors, unexpectedRequests: network.unexpectedRequests, cleanupWarnings: network.cleanupWarnings })
  result.passed = result.cases.length === 16 && result.cases.every(c => c.status === 'pass') && [result.pageErrors, result.consoleErrors, result.unexpectedRequests, result.cleanupWarnings, result.writesBlocked].every(a => a.length === 0)
  if (!result.passed) process.exitCode = 1
  await writeFile(`${output}/browser-results.json`, JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify({ passed: result.passed, cases: result.cases, errors: result.pageErrors, unexpected: result.unexpectedRequests }, null, 2))
}
