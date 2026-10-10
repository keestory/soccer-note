import { BottomNavShell } from '@/components/BottomNav'
import { HomeFocus } from '@/components/home/HomeFocus'
import { HomeHeader } from '@/components/home/HomeHeader'
import { NotificationBadgeShell } from '@/components/NotificationBadge'
import { getTranslations, LOCALES, type Locale } from '@/lib/i18n'
import { formatDate } from '@/lib/utils'

export default async function HomeScreenshotPage({ searchParams }: { searchParams: Promise<{ locale?: string; scenario?: string; result?: string }> }) {
  const params = await searchParams
  const locale = LOCALES.some(item => item.code === params.locale) ? params.locale as Locale : 'ko'
  const t = getTranslations(locale)
  const long = params.scenario === 'long'
  const quarters = (long ? [[3, 2], [3, 3], [3, 3], [3, 3]] : [[0, 0], [1, 1], [1, 0], [1, 1]])
    .map(([home, away], index) => ({ label: `${index + 1}Q`, home, away: params.result === 'loss' ? home + 1 : params.result === 'draw' ? home : away }))
  const homeScore = quarters.reduce((sum, quarter) => sum + quarter.home, 0)
  const awayScore = quarters.reduce((sum, quarter) => sum + quarter.away, 0)
  const result = homeScore > awayScore ? 'WIN' : homeScore < awayScore ? 'LOSS' : 'DRAW'
  return (
    <div className="light app-shell pb-nav" lang={locale.replace('_', '-')}>
      <HomeHeader teamName={long ? 'FC 서울숲 함께뛰는축구동호회' : 'FC 행구'} displayName="김" teamPickerLabel={t.selectTeam} profileLabel={t.myProfile} notification={<NotificationBadgeShell label={t.notifications} />} />
      <main className="mx-auto max-w-md px-5 pb-8 pt-1">
        <HomeFocus seasonLine={t.homeSeasonSummary.replace('{n}', params.scenario === 'empty' ? '0' : '27').replace('{rate}', params.scenario === 'empty' ? '–' : '48')} latestLabel={t.lastMatch} opponentLabel={t.opponentShort}
          match={params.scenario === 'empty' ? null : { id: 'preview', opponent: long ? 'InternationalFootballCommunityUnited' : '김수빈 FC', score: `${homeScore}-${awayScore}`, date: formatDate('2026-09-11', locale), location: '살곶이 축구장', result, resultLabel: result === 'WIN' ? t.win : result === 'LOSS' ? t.loss : t.draw, quarters }}
          upcoming={params.scenario === 'upcoming' ? { id: 'preview-next', opponent: '서울 유나이티드', date: formatDate('2026-10-18', locale), location: '서울숲 축구장' } : undefined} upcomingLabel={t.nextMatch}
          canCreateMatch={params.scenario !== 'viewer'} newMatchLabel={t.newMatchRecord} allMatchesLabel={t.viewAll} teamOperationsLabel={t.homeTeamOperationsLabel} teamOperationsDescription={t.homeTeamOperationsDescription} noMatchesLabel={t.noMatches} noUpcomingLabel={t.homeNoUpcoming} emptyDescription={t.homeEmptyDescription} />
      </main>
      <BottomNavShell activeKey="home" labels={{ home: t.homeLabel, matches: t.matchesLabel, team: t.teamLabel }} />
    </div>
  )
}
