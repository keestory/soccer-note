/** Read-only reproduction against real local production components. No product edits or API writes. */
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { base, browser, fixture, report as network } from '../../../../scripts/qa-team-fixture.mjs'

assert.equal(base, 'http://127.0.0.1:3128')
const output = resolve('docs/design-qa/2026-11-09-language-dialog/before')
await mkdir(output, { recursive: true })
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()
const productCommit = 'acffd57b509cacdffac4b200796a272d7537f44e'
assert.equal(git('diff', productCommit, '--', 'src'), '')
const buildId = (await readFile('.next/BUILD_ID', 'utf8')).trim()
assert.equal(buildId, JSON.parse(await readFile('docs/design-qa/2026-11-07-locale-storage/verification.json', 'utf8')).buildId)
const result = { observedAt: new Date().toISOString(), sourceHEAD: git('rev-parse', 'HEAD'), productCommit, buildId, componentBlobs: Object.fromEntries(['src/app/profile/page.tsx', 'src/components/design/Sheet.tsx', 'src/components/ConfirmSheet.tsx'].map(p => [p, git('hash-object', p)])), scope: 'Real profile component in existing production build; synthetic auth/reads; all API writes and external requests blocked; no live/iOS/App Store claim', cases: [], screenshots: [], writesBlocked: [] }
const originalContext = browser.newContext.bind(browser)
browser.newContext = async options => {
  const context = await originalContext(options)
  const originalPage = context.newPage.bind(context)
  context.newPage = async () => {
    await context.route('**/*', async route => {
      const r = route.request()
      if (!['GET', 'HEAD', 'OPTIONS'].includes(r.method())) { result.writesBlocked.push({ method: r.method(), path: new URL(r.url()).pathname }); return route.abort('blockedbyclient') }
      return route.fallback()
    })
    return originalPage()
  }
  return context
}
const trigger = p => p.locator('main button').filter({ has: p.locator('svg.lucide-globe') })
const sheet = p => p.locator('.fixed').filter({ has: p.locator('h3') })
const options = p => sheet(p).getByRole('button')
const snapshot = p => p.evaluate(() => {
  const a = document.activeElement, host = document.querySelector('.fixed h3')?.closest('.fixed')
  return { tag: a?.tagName, name: a?.tagName === 'BODY' ? 'BODY' : a?.getAttribute('aria-label') || a?.textContent?.trim().slice(0, 90), inLanguageSheet: !!host?.contains(a), languageOpen: !!host, isLanguageTrigger: a?.tagName === 'BUTTON' && !!a.querySelector('svg.lucide-globe'), hasDialogSemantics: !!host?.querySelector('[role="dialog"][aria-modal="true"]'), lang: document.documentElement.lang, savedLocale: localStorage.getItem('soccernote-locale') }
})
async function capture(p, name) {
  await p.evaluate(() => document.fonts.ready)
  await p.screenshot({ path: `${output}/${name}.png`, animations: 'disabled' })
  result.screenshots.push({ file: `${name}.png`, ...await p.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth })) })
}
async function run(name, expected, check, width = 390) {
  let f
  try {
    f = await fixture({ route: '/profile', width })
    await trigger(f.page).waitFor()
    const observations = await check(f.page)
    assert.equal(f.state.writes.length, 0)
    result.cases.push({ name, expected, status: 'observed-as-expected', observations })
  } catch (e) { result.cases.push({ name, expected, status: 'unexpected', error: e.message }); process.exitCode = 1 }
  finally { await f?.close() }
}
try {
  await run('keyboard-open-and-escape', 'reproduce missing initial focus and Escape close', async p => {
    await trigger(p).focus(); await p.keyboard.press('Enter'); await sheet(p).waitFor()
    const opened = await snapshot(p)
    assert.equal(opened.isLanguageTrigger, true); assert.equal(opened.inLanguageSheet, false)
    await p.keyboard.press('Escape')
    const escaped = await snapshot(p); assert.equal(escaped.languageOpen, true)
    await capture(p, 'keyboard-open-escape-390')
    return { opened, afterEscape: escaped }
  })
  await run('tab-boundaries', 'reproduce focus leaving both language option boundaries', async p => {
    await trigger(p).click(); await sheet(p).waitFor()
    await p.keyboard.press('Tab'); const firstTab = await snapshot(p)
    await options(p).last().focus(); await p.keyboard.press('Tab'); const fromLast = await snapshot(p)
    await options(p).first().focus(); await p.keyboard.press('Shift+Tab'); const fromFirst = await snapshot(p)
    for (const state of [firstTab, fromLast, fromFirst]) { assert.equal(state.languageOpen, true); assert.equal(state.inLanguageSheet, false) }
    await capture(p, 'tab-escaped-to-background-390')
    return { firstTab, fromLast, fromFirst }
  })
  await run('outside-cancel', 'pointer cancellation preserves language; inspect focus return', async p => {
    await trigger(p).click(); await sheet(p).waitFor()
    await p.mouse.click(4, 50)
    const closed = await snapshot(p); assert.equal(closed.languageOpen, false); assert.equal(closed.lang, 'ko'); assert.equal(closed.savedLocale, 'ko')
    return closed
  })
  await run('keyboard-selection-focus-return', 'selection succeeds but focus does not return to trigger', async p => {
    await trigger(p).click(); await options(p).filter({ hasText: 'Français' }).focus(); await p.keyboard.press('Enter')
    await p.waitForFunction(() => document.documentElement.lang === 'fr')
    const selected = await snapshot(p); assert.equal(selected.languageOpen, false); assert.equal(selected.savedLocale, 'fr'); assert.equal(selected.isLanguageTrigger, false)
    return selected
  })
  await run('repeat-selection-cancel-reload-control', 'normal selection and persistence remain usable', async p => {
    const states = []
    for (const [label, code] of [['日本語', 'ja'], ['Deutsch', 'de'], ['한국어', 'ko']]) {
      await trigger(p).click(); await options(p).filter({ hasText: label }).click()
      await p.waitForFunction(code => document.documentElement.lang === code, code)
      const s = await snapshot(p); assert.equal(s.languageOpen, false); assert.equal(s.savedLocale, code); states.push(s)
    }
    await trigger(p).click(); await p.mouse.click(4, 50); assert.equal((await snapshot(p)).savedLocale, 'ko')
    await p.reload({ waitUntil: 'networkidle' }); await trigger(p).waitFor()
    assert.equal((await snapshot(p)).lang, 'ko')
    await capture(p, 'normal-profile-320')
    return states
  }, 320)
  await run('existing-shared-sheet-control', 'shared Sheet moves/traps/restores focus and closes on Escape', async p => {
    const logoutTrigger = p.locator('main button').filter({ has: p.locator('svg.lucide-log-out') })
    await logoutTrigger.focus(); await p.keyboard.press('Enter')
    const dialog = p.getByRole('dialog'); await dialog.waitFor()
    assert(await dialog.evaluate(e => e.contains(document.activeElement)))
    const buttons = dialog.getByRole('button')
    await buttons.last().focus(); await p.keyboard.press('Tab'); assert(await buttons.first().evaluate(e => e === document.activeElement))
    await p.keyboard.press('Shift+Tab'); assert(await buttons.last().evaluate(e => e === document.activeElement))
    await p.keyboard.press('Escape'); assert.equal(await dialog.count(), 0)
    const restored = await logoutTrigger.evaluate(e => e === document.activeElement); assert(restored)
    return { focusMovedInside: true, tabWrapped: true, shiftTabWrapped: true, escapeClosed: true, restoredToTrigger: restored, confirmAction: 'never activated; no auth write' }
  })
} finally {
  await browser.close()
  result.completedAt = new Date().toISOString()
  result.pageErrors = network.pageErrors; result.unexpectedRequests = network.unexpectedRequests; result.consoleErrors = network.consoleErrors; result.cleanupWarnings = network.cleanupWarnings
  result.completed = result.cases.length === 6 && result.cases.every(c => c.status === 'observed-as-expected') && [result.pageErrors, result.unexpectedRequests, result.consoleErrors, result.cleanupWarnings, result.writesBlocked].every(a => a.length === 0)
  if (!result.completed) process.exitCode = 1
  await writeFile(`${output}/browser-results.json`, JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify(result, null, 2))
}
