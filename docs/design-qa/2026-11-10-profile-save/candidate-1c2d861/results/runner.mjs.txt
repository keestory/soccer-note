/** WORK-33: actual profile component, synthetic in-memory backend only. */
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { base, browser, fixture, report as network, host, authKey, uid, otherUid, makeSession, until, hold, pause } from './qa-team-fixture.mjs'

assert.equal(base, 'http://127.0.0.1:3128', 'Only the existing local synthetic server is allowed')
const output = resolve(process.env.SOCCER_PROFILE_QA_OUTPUT || 'docs/design-qa/2026-11-10-profile-save/after')
await mkdir(output, { recursive: true })
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()
const expectedCases = 33
const result = { expectedCases, observedAt: new Date().toISOString(), sourceHEAD: git('rev-parse', 'HEAD'), buildId: (await readFile('.next/BUILD_ID', 'utf8')).trim(), componentBlobs: Object.fromEntries(['src/app/profile/page.tsx', 'src/lib/profile-name-save.ts', 'src/lib/profile-name-copy.ts'].map(p => [p, git('hash-object', p)])), scope: 'Actual local production component; synthetic auth/profile data, all external calls intercepted. No live user/DB writes, physical iOS, screen reader, or rollback execution.', intake: { discoverability: 'not-applicable: authenticated local QA only', store_compliance: 'not-applicable: no binary/permission/submission change or claim', competitive_benchmark: 'not-applicable: reproduced local correctness repair' }, cases: [], screenshots: [], blockedWrites: [], routeErrors: [] }
const ORIGINAL = '가상 코치', NAME = '가상 변경 이름', SECOND = '가상 새 입력', OTHER = '가상 다른 계정'
const journalPrefix = 'soccernote-profile-name-v1:'
const field = p => p.locator('form input[type=text]')
const save = p => p.locator('form button[type=submit]')
const status = p => p.locator('#profile-name-status')
const check = p => p.locator('#profile-name-check')
const retry = p => p.locator('#profile-name-retry')
const inputReady = async p => { await field(p).waitFor(); await until(async () => await save(p).count() > 0, 'profile input ready') }
const stageCount = (s, stage, user = uid) => s.writes.filter(w => w.stage === stage && w.user === user).length
const counts = s => ({ auth: stageCount(s, 'auth'), profile: stageCount(s, 'profile') })
const noMoreWrites = async (s, expected) => { await pause(180); assert.deepEqual(counts(s), expected) }

let activeScenario
const originalContext = browser.newContext.bind(browser)
browser.newContext = async options => {
  const context = await originalContext(options)
  const originalPage = context.newPage.bind(context)
  context.newPage = async () => {
    const s = activeScenario
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url()), method = request.method()
      const reply = async (data, code = 200) => {
        try { await route.fulfill({ status: code, contentType: 'application/json', body: JSON.stringify(data), headers: { 'access-control-allow-origin': '*' } }) }
        catch (e) { if (!/Target.*closed|Route is already handled|Invalid InterceptionId|Fetch domain is not enabled|already been handled/i.test(e.message)) result.routeErrors.push(e.message) }
      }
      const token = request.headers().authorization?.replace(/^Bearer /, '')
      let owner
      try { owner = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub } catch {}
      const row = owner && s.accounts.get(owner)
      const user = () => ({ ...makeSession(owner).user, user_metadata: { display_name: row.auth } })
      const handle = async (stage, write) => {
        const queue = write ? s.modes[stage] : s.readModes[stage]
        const mode = queue.shift() || {}
        if (mode.gate) { mode.gate.entered = true; await mode.gate.wait; mode.gate.released = true }
        return mode
      }
      if (url.hostname === host && url.pathname === '/auth/v1/user') {
        if (!row) return reply({ code: 'bad_jwt', message: 'Synthetic unauthenticated' }, 401)
        if (method === 'GET') {
          s.reads.push({ stage: 'auth', user: owner }); const mode = await handle('auth', false)
          if (mode.abort) return route.abort('connectionfailed')
          if (mode.status) return reply({ code: 'QA_READ_FAIL', message: 'Synthetic failed read' }, mode.status)
          return reply(mode.value === undefined ? user() : { ...user(), user_metadata: { display_name: mode.value } })
        }
        if (method === 'PUT') {
          const name = request.postDataJSON().data.display_name
          s.writes.push({ stage: 'auth', user: owner, name })
          const mode = await handle('auth', true)
          if (mode.commit || (!mode.status && !mode.abort)) row.auth = name
          if (mode.abort) return route.abort('connectionfailed')
          return reply(mode.status ? { code: mode.status === 403 ? 'not_authorized' : 'unexpected_failure', message: 'Synthetic write response' } : user(), mode.status || 200)
        }
      }
      if (url.hostname === host && url.pathname === '/rest/v1/profiles') {
        if (!row) return reply({ code: '42501', message: 'Synthetic unauthenticated' }, 403)
        if (method === 'GET') {
          s.reads.push({ stage: 'profile', user: owner }); const mode = await handle('profile', false)
          if (mode.abort) return route.abort('connectionfailed')
          if (mode.status) return reply({ code: 'QA_READ_FAIL', message: 'Synthetic failed read' }, mode.status)
          const requested = url.searchParams.get('id')?.replace(/^eq\./, '')
          assert(!requested || requested === owner, 'Read must remain scoped to token owner')
          const value = mode.value === undefined ? row.profile : mode.value
          const data = value === null ? null : { id: owner, display_name: value }
          return reply(request.headers().accept?.includes('object+json') ? data : data ? [data] : [])
        }
        if (method === 'POST') {
          const body = request.postDataJSON(); assert.equal(body.id, owner, 'Write ID must match captured token owner')
          s.writes.push({ stage: 'profile', user: owner, name: body.display_name })
          const mode = await handle('profile', true)
          if (mode.commit || (!mode.status && !mode.abort)) row.profile = body.display_name
          if (mode.abort) return route.abort('connectionfailed')
          const data = { id: owner, display_name: row.profile }
          return reply(mode.status ? { code: mode.status === 403 ? '42501' : 'QA_WRITE_FAIL', message: 'Synthetic write response' } : request.headers().accept?.includes('object+json') ? data : [data], mode.status || 201)
        }
      }
      if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) { result.blockedWrites.push({ method, path: url.pathname }); return route.abort('blockedbyclient') }
      return route.fallback()
    })
    return originalPage()
  }
  return context
}

async function run(name, fn, width = 390, locale = 'ko') {
  let f
  const s = { accounts: new Map([[uid, { auth: ORIGINAL, profile: ORIGINAL }], [otherUid, { auth: OTHER, profile: OTHER }]]), modes: { auth: [], profile: [] }, readModes: { auth: [], profile: [] }, writes: [], reads: [], gates: [] }
  activeScenario = s
  const startedAt = new Date().toISOString()
  try {
    f = await fixture({ route: '/profile', width, locale }); await inputReady(f.page)
    const observations = await fn(f, s)
    result.cases.push({ name, status: 'pass', startedAt, completedAt: new Date().toISOString(), writes: s.writes, reads: s.reads, observations })
  } catch (e) {
    result.cases.push({ name, status: 'fail', startedAt, completedAt: new Date().toISOString(), error: e.message, writes: s.writes, reads: s.reads, text: f ? (await f.page.locator('main').innerText().catch(() => '')).slice(0,1600) : '' })
    if (f) await f.page.screenshot({ path: `${output}/failure-${result.cases.length}.png` }).catch(() => {})
    process.exitCode = 1
  } finally { for (const gate of s.gates) gate.release(); await f?.close() }
}
function gate(s) { const g = hold(); s.gates.push(g); return g }
async function submit(p, value = NAME) { await field(p).fill(value); await save(p).click() }
async function settled(p) { const busyLabels=['저장 중...','Saving...','Wird gespeichert...','保存中...','Enregistrement...','Guardando...','Salvataggio...'];await until(async()=>!busyLabels.includes((await save(p).innerText()).trim()),'operation settled') }
async function attempt(p, user = uid) { return p.evaluate(key => JSON.parse(sessionStorage.getItem(key) || 'null'), journalPrefix + user) }
async function broadcastAuth(p,state,nextSession) {
  state.session=nextSession
  const encoded=nextSession?'base64-'+Buffer.from(JSON.stringify(nextSession),'utf8').toString('base64url'):null
  await p.evaluate(({authKey,nextSession,encoded})=>{if(encoded)localStorage.setItem(authKey,encoded);else localStorage.removeItem(authKey);const channel=new BroadcastChannel(authKey);channel.postMessage({event:nextSession?'SIGNED_IN':'SIGNED_OUT',session:nextSession});setTimeout(()=>channel.close(),100)},{authKey,nextSession,encoded})
}
async function authIdentity(p) { return p.evaluate(key => { const raw=localStorage.getItem(key); if (!raw) return null; const s=JSON.parse(atob(raw.slice(7).replaceAll('-','+').replaceAll('_','/'))); return s.user.id }, authKey) }
async function expectUnknown(p, s, expected) {
  await check(p).waitFor(); await until(async()=>await check(p).isEnabled(),'check enabled'); assert.equal(await retry(p).count(), 0); assert(await save(p).isDisabled())
  assert((await status(p).innerText()).includes('결과 미확인'),'Unknown stage must be visible'); const a=await attempt(p); assert(a.auth === 'unknown' || a.profile === 'unknown'); await noMoreWrites(s,expected)
}
async function capture(p, file) {
  await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: `${output}/${file}.png` })
  result.screenshots.push({ file: `${file}.png`, ...await p.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, fontStatus: document.fonts.status })) })
}

try {
  await run('normal-keyboard-save-and-refresh', async ({page:p},s) => {
    await field(p).fill(` ${NAME} `); await field(p).press('Enter'); await until(async()=>!await save(p).isDisabled(),'save complete')
    await until(()=>s.accounts.get(uid).profile===NAME,'profile persisted'); assert.deepEqual(counts(s),{auth:1,profile:1}); assert.equal(await attempt(p),null)
    await p.reload({waitUntil:'networkidle'});await inputReady(p);assert.equal(await field(p).inputValue(),NAME)
    assert.deepEqual(s.accounts.get(uid),{auth:NAME,profile:NAME});return {refreshName:await field(p).inputValue()}
  })
  await run('completed-name-repeat-no-write-new-name-still-saves',async({page:p},s)=>{
    await submit(p);await until(()=>s.accounts.get(uid).profile===NAME,'first save');await settled(p);if(await save(p).isEnabled())await save(p).click();await p.locator('form').evaluate(form=>form.requestSubmit());await noMoreWrites(s,{auth:1,profile:1});await submit(p,SECOND);await until(()=>s.accounts.get(uid).profile===SECOND,'different name save');await settled(p);assert.deepEqual(counts(s),{auth:2,profile:2})
  })
  await run('empty-name-rejected-before-network', async ({page:p},s) => {await submit(p,'   ');await noMoreWrites(s,{auth:0,profile:0});assert.equal(await attempt(p),null)})
  await run('profile-403-retry-only-unfinished-profile', async ({page:p},s) => {
    s.modes.profile.push({status:403});await submit(p);await retry(p).waitFor();assert.deepEqual(counts(s),{auth:1,profile:1});assert.equal(await field(p).inputValue(),NAME)
    await capture(p,'profile-rejected-390');await retry(p).click();await until(()=>s.accounts.get(uid).profile===NAME,'profile retry saved');await settled(p)
    assert.deepEqual(counts(s),{auth:1,profile:2});assert.equal(await attempt(p),null)
  })
  await run('auth-403-explicit-retry-after-read', async ({page:p},s) => {
    s.modes.auth.push({status:403});await submit(p);await retry(p).waitFor();assert.deepEqual(counts(s),{auth:1,profile:0})
    const before=s.reads.length;await retry(p).click();await until(()=>s.accounts.get(uid).profile===NAME,'retry complete');await settled(p)
    assert(s.reads.slice(before).some(r=>r.stage==='auth'));assert(s.reads.slice(before).some(r=>r.stage==='profile'));assert.deepEqual(counts(s),{auth:2,profile:1})
  })
  for (const stage of ['auth','profile']) for (const mode of ['500','abort']) await run(`${stage}-${mode}-uncommitted-stays-unknown-after-check`,async({page:p},s)=>{
    s.modes[stage].push(mode==='500'?{status:500}:{abort:true});await submit(p);const expected={auth:1,profile:stage==='profile'?1:0};await expectUnknown(p,s,expected)
    await check(p).click();await expectUnknown(p,s,expected);assert.equal(await field(p).inputValue(),NAME)
    if(stage==='profile'&&mode==='500')await capture(p,'profile-unknown-390')
  })
  for (const stage of ['auth','profile']) await run(`${stage}-lost-response-after-commit-read-reconciles-without-resend`,async({page:p},s)=>{
    s.modes[stage].push({abort:true,commit:true});await submit(p);const expected={auth:1,profile:stage==='profile'?1:0};await expectUnknown(p,s,expected)
    await check(p).click();await settled(p);await noMoreWrites(s,expected)
    if(stage==='auth'){await retry(p).waitFor();await retry(p).click();await until(()=>s.accounts.get(uid).profile===NAME,'remaining profile saved');await settled(p)}
    assert.deepEqual(counts(s),{auth:1,profile:1});assert.equal(await attempt(p),null)
  })
  await run('unknown-failed-state-check-is-not-missing-or-retry',async({page:p},s)=>{
    s.modes.profile.push({status:500});await submit(p);await expectUnknown(p,s,{auth:1,profile:1});s.readModes.profile.push({status:500});await check(p).click();await expectUnknown(p,s,{auth:1,profile:1});assert.equal((await attempt(p)).profile,'unknown')
  })
  await run('rejected-retry-check-failure-does-not-write',async({page:p},s)=>{
    s.modes.profile.push({status:403});await submit(p);await retry(p).waitFor();s.readModes.auth.push({status:500});await retry(p).click();await settled(p);await noMoreWrites(s,{auth:1,profile:1});assert.equal(await field(p).inputValue(),NAME)
  })
  await run('duplicate-submit-one-request-pair',async({page:p},s)=>{
    const g=gate(s);s.modes.auth.push({gate:g});await field(p).fill(NAME);await p.locator('form').evaluate(form=>{form.requestSubmit();form.requestSubmit()});await until(()=>g.entered,'auth held');assert.deepEqual(counts(s),{auth:1,profile:0});g.release();await until(()=>s.accounts.get(uid).profile===NAME,'saved once');await settled(p);assert.deepEqual(counts(s),{auth:1,profile:1})
  })
  await run('late-A-response-keeps-new-B-input-unsaved',async({page:p},s)=>{
    const g=gate(s);s.modes.auth.push({gate:g});await submit(p);await until(()=>g.entered,'A request entered');await field(p).fill(SECOND);g.release();await until(()=>s.accounts.get(uid).profile===NAME,'A profile saved');await settled(p)
    assert.equal(await field(p).inputValue(),SECOND);assert.deepEqual(s.accounts.get(uid),{auth:NAME,profile:NAME});assert.deepEqual(counts(s),{auth:1,profile:1});assert(!s.writes.some(w=>w.name===SECOND));const summary=await status(p).innerText();assert(summary.includes('이번 저장 요청 이름: '+NAME));assert(summary.includes('현재 입력한 다른 이름은 아직 저장하지 않았어요.'));await capture(p,'new-draft-after-A-390')
  })
  await run('rejected-A-retry-keeps-B-draft',async({page:p},s)=>{
    s.modes.profile.push({status:403});await submit(p);await retry(p).waitFor();await field(p).fill(SECOND);await retry(p).click();await until(()=>s.accounts.get(uid).profile===NAME,'A retry completed');await settled(p);assert.equal(await field(p).inputValue(),SECOND);assert.deepEqual(counts(s),{auth:1,profile:2})
  })
  await run('unknown-reload-retains-attempt-no-automatic-write',async({page:p},s)=>{
    s.modes.profile.push({status:500});await submit(p);await expectUnknown(p,s,{auth:1,profile:1});await p.reload({waitUntil:'networkidle'});await inputReady(p);await expectUnknown(p,s,{auth:1,profile:1});assert.equal(await field(p).inputValue(),NAME)
  })
  await run('leave-back-remount-retains-unknown-no-write',async({page:p},s)=>{
    s.modes.profile.push({status:500});await submit(p);await expectUnknown(p,s,{auth:1,profile:1});await p.locator('header a').click();await p.waitForURL('**/dashboard');await p.goBack({waitUntil:'networkidle'});await inputReady(p);await expectUnknown(p,s,{auth:1,profile:1})
  })
  for (const stage of ['auth','profile']) for (const change of ['account','logout']) await run(`${change}-during-${stage}-write-isolates-old-response`,async(f,s)=>{
    const p=f.page,g=gate(s);s.modes[stage].push({gate:g,commit:true});await submit(p);await until(()=>g.entered,'held write entered')
    const next=change==='account'?makeSession(otherUid):null;if(next){next.user.user_metadata.display_name=OTHER;next.user.email='other-fixture@example.invalid'}
    await broadcastAuth(p,f.state,next);await until(async()=>await authIdentity(p)===(next?.user.id||null),'new session observed');await pause(100);g.release();await pause(180)
    assert.equal(await authIdentity(p),next?.user.id||null,'Old response must not restore A session');assert.equal(stageCount(s,'auth',otherUid),0);assert.equal(stageCount(s,'profile',otherUid),0)
    if(stage==='auth')assert.equal(stageCount(s,'profile'),0,'Do not start old account next stage')
    if(change==='account'){await inputReady(p);await until(async()=>await field(p).inputValue()===OTHER,'new account profile');assert.equal(await field(p).inputValue(),OTHER);assert.equal(await p.locator('form input[type=email]').inputValue(),'other-fixture@example.invalid');assert(!await p.locator('main').innerText().then(t=>t.includes(NAME)))}else await p.waitForURL('**/login')
    return {currentAccount:await authIdentity(p),oldAttemptRetained:!!await attempt(p)}
  })
  await run('leave-during-auth-write-no-next-stage-after-remount',async({page:p},s)=>{
    const g=gate(s);s.modes.auth.push({gate:g,commit:true});await submit(p);await until(()=>g.entered,'request entered');await p.locator('header a').click();await p.waitForURL('**/dashboard');g.release();await noMoreWrites(s,{auth:1,profile:0});await p.goBack({waitUntil:'networkidle'});await inputReady(p);await noMoreWrites(s,{auth:1,profile:0});assert(await attempt(p))
  })
  await run('completed-journal-clear-failure-reload-then-new-B-save',async({page:p},s)=>{
    await p.evaluate(prefix=>{const original=Storage.prototype.removeItem;Storage.prototype.removeItem=function(key){if(this===sessionStorage&&key.startsWith(prefix))throw new DOMException('Synthetic clear denied','SecurityError');return original.call(this,key)};window.__restoreJournalRemove=()=>{Storage.prototype.removeItem=original}},journalPrefix)
    await submit(p);await until(()=>s.accounts.get(uid).profile===NAME,'A persisted before clear failure');await settled(p);assert.deepEqual(counts(s),{auth:1,profile:1});const pending=await attempt(p);assert.equal(pending.name,NAME);assert.equal(pending.auth,'confirmed');assert.equal(pending.profile,'confirmed')
    // A real reload destroys the injected prototype override; inject it for the new document too.
    await p.context().addInitScript(prefix=>{const original=Storage.prototype.removeItem;Storage.prototype.removeItem=function(key){if(this===sessionStorage&&key.startsWith(prefix))throw new DOMException('Synthetic clear denied','SecurityError');return original.call(this,key)};window.__restoreJournalRemove=()=>{Storage.prototype.removeItem=original}},journalPrefix)
    await p.reload({waitUntil:'networkidle'});await inputReady(p);await noMoreWrites(s,{auth:1,profile:1});assert((await status(p).innerText()).includes('저장 상태를 보관하지 못해'),'Reload must expose retained-journal storage failure');await check(p).waitFor();await p.evaluate(()=>window.__restoreJournalRemove());await submit(p,SECOND);await until(()=>s.accounts.get(uid).profile===SECOND,'new B actually saved');await settled(p);assert.deepEqual(s.accounts.get(uid),{auth:SECOND,profile:SECOND});assert.deepEqual(counts(s),{auth:2,profile:2});assert((await status(p).innerText()).includes('이번 저장 요청 이름: '+SECOND));assert.equal(await attempt(p),null)
  })
  for(const failure of ['get','set','property'])await run(`journal-${failure}-denied-stops-before-write`,async({page:p},s)=>{
    await p.evaluate(({prefix,failure})=>{if(failure==='property'){const descriptor=Object.getOwnPropertyDescriptor(window,'sessionStorage');Object.defineProperty(window,'sessionStorage',{configurable:true,get(){throw new DOMException('Synthetic journal getter blocked','SecurityError')}});window.__restoreJournal=()=>Object.defineProperty(window,'sessionStorage',descriptor);return}const key=failure==='get'?'getItem':'setItem';const orig=Storage.prototype[key];Storage.prototype[key]=function(name,...args){if(this===sessionStorage&&name.startsWith(prefix))throw new DOMException('Synthetic journal blocked','SecurityError');return orig.call(this,name,...args)};window.__restoreJournal=()=>{Storage.prototype[key]=orig}},{prefix:journalPrefix,failure})
    await submit(p);await noMoreWrites(s,{auth:0,profile:0});assert.equal(await field(p).inputValue(),NAME);await status(p).waitFor();await p.evaluate(()=>window.__restoreJournal());if(await retry(p).isVisible().catch(()=>false))await retry(p).click();else await save(p).click();await until(()=>s.accounts.get(uid).profile===NAME,'save after storage recovery');await settled(p);assert.deepEqual(counts(s),{auth:1,profile:1})
  })
  await run('account-switch-during-initial-profile-load-discards-old-read',async(f,s)=>{
    const p=f.page,g=gate(s);s.readModes.profile.push({gate:g})
    await p.reload({waitUntil:'domcontentloaded'});await until(()=>g.entered,'initial A read held')
    const next=makeSession(otherUid);next.user.user_metadata.display_name=OTHER;next.user.email='other-fixture@example.invalid';await broadcastAuth(p,f.state,next);await until(async()=>await authIdentity(p)===otherUid,'B session');g.release();await inputReady(p);await until(async()=>await field(p).inputValue()===OTHER,'B profile after A read');assert.equal(await field(p).inputValue(),OTHER);assert.equal(await authIdentity(p),otherUid);assert.equal(await p.locator('form input[type=email]').inputValue(),'other-fixture@example.invalid');assert(!await p.locator('main').innerText().then(t=>t.includes(ORIGINAL)));await noMoreWrites(s,{auth:0,profile:0})
  })
  for(const locale of ['ko','en_US','de'])await run(`status-${locale}-long-name-320`,async({page:p},s)=>{
    const longName=NAME+'L'.repeat(70);s.modes.profile.push({status:403});await submit(p,longName);await retry(p).waitFor();await until(async()=>await retry(p).isEnabled(),'retry enabled');assert(await status(p).innerText());assert((await status(p).innerText()).includes(longName));for(const b of [check(p),retry(p)]){assert(await b.innerText());await b.focus();assert(await b.evaluate(e=>e===document.activeElement));const rect=await b.boundingBox();assert(rect.width>=44&&rect.height>=44)}assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await capture(p,`status-${locale}-long-320`);await retry(p).press('Enter');await until(()=>s.accounts.get(uid).profile===longName,'localized keyboard retry');await settled(p);assert.deepEqual(counts(s),{auth:1,profile:2})
  },320,locale)
  for(const width of [320,390])await run(`mobile-${width}-keyboard-status-controls`,async({page:p},s)=>{
    await p.setViewportSize({width,height:568});s.modes.profile.push({status:403});await field(p).fill(NAME);await field(p).press('Enter');await retry(p).waitFor();assert(await status(p).innerText());assert(['status','alert'].includes(await status(p).getAttribute('role')))
    assert(await field(p).getAttribute('id'));assert(await p.locator(`label[for="${await field(p).getAttribute('id')}"]`).innerText());const control=retry(p);await control.focus();assert(await control.evaluate(e=>e===document.activeElement));const b=await control.boundingBox();assert(b.height>=44&&b.width>=44);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await capture(p,`rejected-${width}-short`);await control.press('Enter');await until(()=>s.accounts.get(uid).profile===NAME,'keyboard retry saved');await settled(p)
  },width)
}finally{
  await browser.close();result.completedAt=new Date().toISOString();result.pageErrors=network.pageErrors;result.consoleErrors=network.consoleErrors;result.unexpectedRequests=network.unexpectedRequests;result.cleanupWarnings=network.cleanupWarnings
  result.expectedInjectedNetworkErrors=network.consoleErrors.filter(t=>/Failed to load resource:.*(403|500|ERR_CONNECTION_FAILED|ERR_ABORTED)/.test(t));result.unexpectedConsoleErrors=network.consoleErrors.filter(t=>!result.expectedInjectedNetworkErrors.includes(t))
  result.passed=result.cases.length===expectedCases&&result.cases.every(c=>c.status==='pass')&&!result.pageErrors.length&&!result.unexpectedRequests.length&&!result.blockedWrites.length&&!result.routeErrors.length&&!result.unexpectedConsoleErrors.length&&!result.cleanupWarnings.length
  await writeFile(`${output}/browser-results.json`,JSON.stringify(result,null,2)+'\n');await copyFile(new URL(import.meta.url),`${output}/runner.mjs.txt`)
  console.log(JSON.stringify({output,passed:result.passed,cases:result.cases.map(({name,status,error})=>({name,status,error})),pageErrors:result.pageErrors,unexpectedRequests:result.unexpectedRequests,blockedWrites:result.blockedWrites,routeErrors:result.routeErrors,unexpectedConsoleErrors:result.unexpectedConsoleErrors},null,2));if(!result.passed)process.exitCode=1
}
