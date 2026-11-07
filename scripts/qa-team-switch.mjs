import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { assertTeam, base, preview, broadcastAuth, browser, cache, choose, closeBounded, fixture, hold, makeSession, matches, openPicker, otherUid, output, pause, persistReport, players, report, screenshot, teams, until } from './qa-team-fixture.mjs'

async function caseRun(name, action) {
  if (process.env.SOCCER_QA_CASE && !name.includes(process.env.SOCCER_QA_CASE)) return
  const start = Date.now()
  try { const evidence = await action(); report.cases.push({ name, status: 'pass', elapsedMs: Date.now() - start, evidence }) }
  catch (error) { report.cases.push({ name, status: 'fail', error: error.stack }); console.error(name, error.message) }
  await persistReport()
}
async function settled(page) { await page.getByRole('dialog').waitFor({ state: 'hidden' }) }
async function textClipping(page) {
  return page.locator('#team-selection-status p').evaluateAll(elements => elements.map(element => ({
    text: element.textContent, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
    right: element.getBoundingClientRect().right,
    rects: (() => { const range = document.createRange(); range.selectNodeContents(element); return [...range.getClientRects()].map(rect => ({ left: rect.left, right: rect.right })) })(),
  })))
}
async function editPlayer(page, name = '가상 A 수정 선수') {
  await page.getByRole('button', { name: `선수 수정: ${players[0].name}`, exact: true }).click()
  await page.locator('form input[id$="-name"]').fill(name)
}
async function pullRefresh(page) {
  await page.evaluate(() => scrollTo(0, 0))
  const target = page.locator('.light > div').filter({ has: page.locator('input[aria-label]') }).first()
  await target.evaluate(el => el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [new Touch({ identifier: 1, target: el, clientY: 0, clientX: 10 })] })))
  await target.evaluate(el => el.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, touches: [new Touch({ identifier: 1, target: el, clientY: 230, clientX: 10 })] })))
  await pause(50)
  await target.dispatchEvent('touchend', { touches: [] })
}

try {
  if (preview) {
    for (const width of [390, 320]) {
      const f = await fixture({ width, longNames: width === 320, locale: width === 320 ? 'de' : 'ko' })
      try {
        await screenshot(f.page, `home-${width}.png`)
        await openPicker(f.page)
        await screenshot(f.page, `picker-${width}.png`)
        const pending = hold(); f.state.teamModes.set(teams[1].id, pending)
        await choose(f.page, 1, f.state); await until(() => pending.entered, 'preview B pending')
        await screenshot(f.page, `pending-${width}.png`)
        await writeFile(`${output}/pending-${width}.json`, JSON.stringify({ cache: await cache(f.page), title: await f.page.locator('h1').textContent(), text: await f.page.locator('main').textContent() }, null, 2))
        pending.release(); await settled(f.page)
        await screenshot(f.page, `selected-${width}.png`)
        await openPicker(f.page); await choose(f.page, 0); await settled(f.page)
        await openPicker(f.page); f.state.teamModes.set(teams[1].id, { fail: true })
        await choose(f.page, 1, f.state); await f.page.getByRole('dialog').getByRole('alert').waitFor()
        await screenshot(f.page, `failed-${width}.png`)
      } finally { await f.close() }
    }
  } else {
    await caseRun('01 atomic A to B: confirmed name, data, storage and permissions', async () => {
      const f = await fixture()
      try {
        await assertTeam(f.page, 0)
        const pending = hold(); f.state.teamModes.set(teams[1].id, pending)
        await openPicker(f.page); await choose(f.page, 1); await until(() => pending.entered, 'B pending')
        await assertTeam(f.page, 0)
        assert.equal(await f.page.getByRole('dialog').count(), 1)
        await screenshot(f.page, 'pending-390.png')
        pending.release(); await settled(f.page); await assertTeam(f.page, 1)
        assert.equal(await f.page.locator('a[href="/match/new"]').count(), 0)
        await screenshot(f.page, 'selected-390.png')
        return { pendingPreservesA: true, oneCommittedContext: true, viewerPermissions: true, noMixedFrames: true }
      } finally { await f.close() }
    })
    await caseRun('02 slow B then fast C: late B cannot overwrite latest successful C', async () => {
      const f = await fixture()
      try {
        const pending = hold(); f.state.teamModes.set(teams[1].id, pending)
        await openPicker(f.page); await choose(f.page, 1); await until(() => pending.entered, 'B pending')
        await choose(f.page, 2); await settled(f.page); await assertTeam(f.page, 2)
        pending.release(); await until(() => pending.released, 'B response released'); await pause(150)
        await assertTeam(f.page, 2)
        return { latestChoiceWins: true, lateSuccessIgnored: true }
      } finally { await f.close() }
    })
    await caseRun('03 failed selection preserves A with retry and no permission change', async () => {
      const f = await fixture()
      try {
        f.state.teamModes.set(teams[1].id, { fail: true })
        await openPicker(f.page); await choose(f.page, 1)
        await f.page.getByRole('dialog').getByRole('alert').waitFor()
        await assertTeam(f.page, 0); await screenshot(f.page, 'failed-390.png')
        await f.page.getByRole('dialog').getByRole('button', { name: /다시|재시도/ }).click()
        await settled(f.page); await assertTeam(f.page, 1)
      } finally { await f.close() }
      const initial = await fixture({ initialFailure: true })
      try {
        assert.equal((await cache(initial.page)).selected, null)
        await screenshot(initial.page, 'initial-load-failed-390.png')
        await initial.page.getByRole('button', { name: '다시 시도', exact: true }).click()
        await assertTeam(initial.page, 0)
      } finally { await initial.close() }
      return { failureRetainsConfirmedTeam: true, explicitRetryWorks: true, initialLoadRetryWorks: true }
    })
    await caseRun('04 cancel, close, Escape and browser Back invalidate pending selection', async () => {
      const f = await fixture()
      try {
        for (const action of ['cancel', 'close', 'escape']) {
          const pending = hold(); f.state.teamModes.set(teams[1].id, pending)
          await openPicker(f.page); await choose(f.page, 1); await until(() => pending.entered, `${action} B pending`)
          if (action === 'escape') await f.page.keyboard.press('Escape')
          else if (action === 'close') await f.page.getByRole('dialog').getByRole('button', { name: '닫기', exact: true }).click()
          else await f.page.getByRole('dialog').getByRole('button', { name: /취소|현재 팀/ }).last().click()
          await settled(f.page)
          assert.equal(await f.page.locator('h1 button').evaluate(el => el === document.activeElement), true)
          pending.release(); await until(() => pending.released, 'cancelled response released'); await pause(100)
          await assertTeam(f.page, 0)
        }
        await f.page.locator('nav a[href="/team"]').click()
        await f.page.locator('a[href="/team/players"]').waitFor()
        await f.page.locator('nav a[href="/dashboard"]').click()
        await f.page.locator('h1 button').waitFor()
        const pending = hold(); f.state.teamModes.set(teams[1].id, pending)
        await openPicker(f.page); await choose(f.page, 1); await until(() => pending.entered, 'Back B pending')
        await f.page.goBack(); await f.page.waitForURL(/\/team$/)
        pending.release(); await until(() => pending.released, 'Back response released'); await pause(100)
        assert.equal((await cache(f.page)).selected, teams[0].id)
        await f.page.locator('nav a[href="/dashboard"]').click(); await assertTeam(f.page, 0)
        return { cancel: true, close: true, escape: true, browserBack: true, focusRestored: true, lateResponsesIgnored: true }
      } finally { await f.close() }
    })
    await caseRun('05 late failure from superseded B cannot change successful C or reopen error', async () => {
      const f = await fixture()
      try {
        const pending = hold({ fail: true }); f.state.teamModes.set(teams[1].id, pending)
        await openPicker(f.page); await choose(f.page, 1); await until(() => pending.entered, 'B pending')
        await choose(f.page, 2); await settled(f.page); await assertTeam(f.page, 2)
        pending.release(); await until(() => pending.released, 'B failure released'); await pause(150)
        await assertTeam(f.page, 2); assert.equal(await f.page.locator('#team-selection-status [role=alert]').count(), 0)
        return { lateFailureIgnored: true }
      } finally { await f.close() }
    })
    await caseRun('06 logout and account switch invalidate in-flight team requests', async () => {
      for (const next of [null, makeSession(otherUid)]) {
        const f = await fixture()
        try {
          const pending = hold(); f.state.teamModes.set(teams[1].id, pending)
          await openPicker(f.page); await choose(f.page, 1); await until(() => pending.entered, 'B pending')
          if (next) f.state.matches[1].opponent = '새 계정의 가상 B 상대'
          await broadcastAuth(f.page, f.state, next)
          if (next) await until(async () => (await cache(f.page)).snapshot?.userId === otherUid, 'new account loaded')
          else await f.page.waitForURL(/\/login(?:\?|$)/)
          pending.release(); await until(() => pending.released, 'old account response released'); await pause(150)
          const value = await cache(f.page)
          if (next) {
            assert.equal(value.snapshot.userId, otherUid)
            assert.equal(value.selected, teams[1].id)
            assert.equal(value.snapshot.matches[0].opponent, '새 계정의 가상 B 상대')
            assert(!value.snapshot.players.some(player => player.team_id === teams[0].id))
            const permission = await f.page.evaluate(userId => JSON.parse(sessionStorage.getItem(`team_resolve_${userId}`) || 'null'), otherUid)
            assert.equal(permission.canEditPlayers, true)
          } else { assert.equal(value.snapshot, null); assert.equal(value.selected, null) }
          assert.equal(value.permission, null, 'Old account permission cache survived the auth transition')
        } finally { await f.close() }
      }
      return { logoutClearsCache: true, newAccountCannotBeOverwritten: true }
    })
    await caseRun('07 old team player save response cannot alter new team context', async () => {
      const f = await fixture({ route: '/team/players' })
      try {
        await editPlayer(f.page)
        const pending = hold(); f.state.nextPlayerWrite = pending
        await f.page.locator('form button[type=submit]').click(); await until(() => pending.entered, 'player saving')
        await f.page.locator('nav a[href="/dashboard"]').click(); await f.page.locator('h1 button').waitFor()
        await openPicker(f.page); await choose(f.page, 1); await settled(f.page); await assertTeam(f.page, 1)
        pending.release(); await until(() => pending.released, 'old player save released'); await pause(150)
        const value = await assertTeam(f.page, 1)
        assert.equal(value.snapshot.players.some(player => player.name === '가상 A 수정 선수'), false)
        return { oldSaveCannotPatchB: true, serverWriteRemainsScopedToA: f.state.writes[0].id === players[0].id }
      } finally { await f.close() }
    })
    await caseRun('08 same-team refresh while saving preserves pending form and reconciles acknowledged player', async () => {
      const f = await fixture({ route: '/team/players' })
      try {
        await editPlayer(f.page)
        const pending = hold(); f.state.nextPlayerWrite = pending
        await f.page.locator('form button[type=submit]').click(); await until(() => pending.entered, 'player saving')
        const count = f.state.requests.filter(r => r.table === 'matches').length
        await pullRefresh(f.page)
        await until(() => f.state.requests.filter(r => r.table === 'matches').length > count, 'refresh started')
        await pause(150)
        assert.equal(await f.page.locator('form button[type=submit]').isDisabled(), true)
        assert.equal(await f.page.locator('form input[id$="-name"]').inputValue(), '가상 A 수정 선수')
        await screenshot(f.page, 'player-save-refresh-390.png')
        pending.release(); await until(() => pending.released, 'player save released')
        await f.page.getByRole('button', { name: '선수 수정: 가상 A 수정 선수', exact: true }).waitFor()
        const value = await cache(f.page)
        assert.equal(value.snapshot.players.find(player => player.id === players[0].id).name, '가상 A 수정 선수')
        assert.equal(await f.page.locator('form').count(), 0)
      } finally { await f.close() }
      const stale = await fixture({ route: '/team/players' })
      try {
        const refresh = hold(); stale.state.teamModes.set(teams[0].id, refresh)
        await pullRefresh(stale.page); await until(() => refresh.entered, 'stale refresh pending')
        await editPlayer(stale.page, '새 저장이 유지되는 가상 선수')
        await stale.page.locator('form button[type=submit]').click()
        await stale.page.getByRole('button', { name: '선수 수정: 새 저장이 유지되는 가상 선수', exact: true }).waitFor()
        refresh.release(); await until(() => refresh.released, 'stale refresh released'); await pause(150)
        const value = await cache(stale.page)
        assert.equal(value.snapshot.players.find(player => player.id === players[0].id).name, '새 저장이 유지되는 가상 선수')
        await stale.page.getByRole('button', { name: '선수 수정: 새 저장이 유지되는 가상 선수', exact: true }).waitFor()
      } finally { await stale.close() }
      return { busySurvivedRefresh: true, noDraftReset: true, saveReconciled: true, noStrandedBusyState: true, staleReadAfterSaveIgnored: true }
    })
    await caseRun('09 old quarter save after account switch cannot repopulate prior account cache', async () => {
      const f = await fixture({ route: `/match/${matches[0].id}/quarter/1` })
      try {
        await f.page.locator('.sn-pitch-player').first().focus(); await f.page.keyboard.press('ArrowRight')
        const pending = hold(); f.state.nextQuarterWrite = pending
        await f.page.locator('header button').last().click(); await until(() => pending.entered, 'quarter saving')
        await broadcastAuth(f.page, f.state, makeSession(otherUid))
        await pause(150)
        pending.release(); await until(() => pending.released, 'old quarter response released'); await pause(150)
        const value = await cache(f.page)
        assert(!value.snapshot || value.snapshot.userId === otherUid)
        assert(!value.snapshot?.matches?.some(match => match.team_id === teams[0].id))
        assert.equal(await f.page.locator('#quarter-save-status').filter({ hasText: '변경 사항이 모두 저장됐어요.' }).count(), 0)
        return { oldQuarterSaveCannotRestoreOldAccount: true, noFalseSuccessInNewContext: true }
      } finally { await f.close() }
    })
    await caseRun('10 German 320px and Korean 390px picker accessibility, long names and error recovery', async () => {
      const results = []
      for (const width of [320, 390]) {
        const f = await fixture({ width, locale: width === 320 ? 'de' : 'ko', longNames: true })
        try {
          await openPicker(f.page); await screenshot(f.page, `picker-${width}.png`)
          const dialog = f.page.getByRole('dialog')
          assert.equal(await dialog.getAttribute('aria-modal'), 'true')
          const controls = dialog.locator('button:not(:disabled), input:not(:disabled), select, textarea, a[href]')
          await controls.last().focus(); await f.page.keyboard.press('Tab')
          assert.equal(await controls.first().evaluate(el => el === document.activeElement), true)
          await f.page.keyboard.press('Shift+Tab')
          assert.equal(await controls.last().evaluate(el => el === document.activeElement), true)
          const pending = hold({ fail: true }); f.state.teamModes.set(teams[1].id, pending)
          await choose(f.page, 1, f.state); await until(() => pending.entered, 'long-name pending')
          await screenshot(f.page, `pending-${width === 320 ? 'de-' : ''}${width}.png`)
          const pendingText = await textClipping(f.page)
          pending.release()
          await dialog.getByRole('alert').waitFor()
          const metrics = await screenshot(f.page, `failed-${width === 320 ? 'de-' : ''}${width}.png`)
          const errorText = await textClipping(f.page)
          report.responsiveMetrics ??= []
          report.responsiveMetrics.push({ width, pendingText, errorText })
          assert([...pendingText, ...errorText].every(element => element.scrollWidth <= element.clientWidth + 1 && element.rects.every(rect => rect.right <= width - 12)), 'Status copy is horizontally clipped inside the Sheet')
          assert(metrics.scrollWidth <= width)
          const dimensions = await dialog.locator('button').evaluateAll(buttons => buttons.map(button => ({ text: button.textContent, width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })))
          assert(dimensions.every(button => button.height >= 44 && button.width >= 44))
          results.push({ ...metrics, dimensions, pendingText, errorText })
          await dialog.getByRole('button', { name: width === 320 ? 'Erneut versuchen' : '다시 시도', exact: true }).click()
          await settled(f.page)
          await screenshot(f.page, `selected-long-${width}.png`)
        } finally { await f.close() }
      }
      return results
    })
    await caseRun('11 member link failure retries acknowledged player without duplicate insert', async () => {
      const f = await fixture({ route: '/team/players', availableMember: true })
      try {
        await f.page.getByRole('button', { name: '선수 추가', exact: true }).click()
        const dialog = f.page.getByRole('dialog')
        await dialog.getByRole('button', { name: '팀원에서 추가', exact: true }).click()
        await dialog.getByRole('button', { name: /가상 추가 팀원/ }).click()
        f.state.nextMemberWrite = { fail: true }
        await dialog.getByRole('button', { name: '선수로 등록하기', exact: true }).click()
        await dialog.getByRole('alert').waitFor()
        assert.equal(f.state.writes.filter(write => write.table === 'players' && write.method === 'POST').length, 1)
        assert.equal(await dialog.locator('input[id$="-name"]').isDisabled(), true)
        await screenshot(f.page, 'member-link-failed-390.png')
        await dialog.getByRole('button', { name: '다시 시도', exact: true }).click()
        await settled(f.page)
        assert.equal(f.state.writes.filter(write => write.table === 'players' && write.method === 'POST').length, 1)
        assert.equal(f.state.writes.filter(write => write.table === 'team_members').length, 2)
        const saved = f.state.players.find(player => player.name === '가상 추가 팀원')
        assert(saved)
        const value = await cache(f.page)
        assert.equal(value.snapshot.players.filter(player => player.id === saved.id).length, 1)
        assert.equal(value.snapshot.members.find(member => member.user_id === '10000000-0000-4000-8000-000000000003').linked_player_id, saved.id)
        return { playerInsertCount: 1, memberLinkAttempts: 2, acknowledgedPlayerReused: true }
      } finally { await f.close() }
    })
    await caseRun('12 old write finishing during new-account initialization cannot strand the new account', async () => {
      const results = []
      for (const kind of ['player', 'quarter']) {
        const f = await fixture({ route: kind === 'player' ? '/team/players' : `/match/${matches[0].id}/quarter/1` })
        const oldWrite = hold()
        const newAccountRead = hold()
        try {
          if (kind === 'player') {
            await editPlayer(f.page, '이전 계정 저장 응답')
            f.state.nextPlayerWrite = oldWrite
            await f.page.locator('form button[type=submit]').click()
          } else {
            await f.page.locator('.sn-pitch-player').first().focus(); await f.page.keyboard.press('ArrowRight')
            f.state.nextQuarterWrite = oldWrite
            await f.page.locator('header button').last().click()
          }
          await until(() => oldWrite.entered, `${kind} old write pending`)
          f.state.teamModes.set(teams[1].id, newAccountRead)
          await broadcastAuth(f.page, f.state, makeSession(otherUid))
          await until(() => newAccountRead.entered, `${kind} new account read pending`)
          assert.equal((await cache(f.page)).snapshot, null)
          const response = f.page.waitForResponse(response => new URL(response.url()).pathname.endsWith(kind === 'player' ? '/players' : '/quarter_records') && response.request().method() === (kind === 'player' ? 'PATCH' : 'POST'))
          oldWrite.release()
          await (await response).finished()
          // Cross two rendering turns so the obsolete operation's promise/finally
          // completes before releasing the new account's initial data response.
          await f.page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
          assert.equal(newAccountRead.released, false)
          newAccountRead.release()
          await until(async () => (await cache(f.page)).snapshot?.userId === otherUid, `${kind} new account committed after stale finish`)
          const value = await cache(f.page)
          assert.equal(value.selected, teams[1].id)
          assert.equal(value.snapshot.selectedTeamId, teams[1].id)
          assert(value.snapshot.players.every(player => player.team_id === teams[1].id))
          assert(value.snapshot.matches.every(match => match.team_id === teams[1].id))
          assert.equal(value.permission, null)
          await f.page.locator('nav a[href="/dashboard"]').click()
          await f.page.locator('h1').filter({ hasText: teams[1].name }).waitFor()
          await f.page.locator('main').filter({ hasText: matches[1].opponent }).waitFor()
          results.push({ kind, ordering: 'old write starts → new-account read starts → old write finishes → new-account read finishes', newAccountLoaded: true })
        } finally {
          oldWrite.release(); newAccountRead.release()
          await f.close()
        }
      }
      return results
    })
  }
} finally {
  await persistReport(preview ? 0 : 12)
  await closeBounded(browser, 'browser')
  await persistReport(preview ? 0 : 12)
  console.log(JSON.stringify({ app: base, passed: report.passed, cases: report.cases.map(({ name, status }) => ({ name, status })), pageErrors: report.pageErrors, unexpectedRequests: report.unexpectedRequests, unexpectedConsoleErrors: report.unexpectedConsoleErrors, cleanupWarnings: report.cleanupWarnings }, null, 2))
  if (preview ? !report.captureCompleted : !report.passed) process.exitCode = 1
  if (report.cleanupWarnings.length) process.exit(process.exitCode || 0)
}
