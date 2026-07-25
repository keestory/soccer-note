import { useEffect, useMemo, useState } from 'react'
import {
  View, Text, Pressable, StyleSheet, ScrollView, RefreshControl, Modal, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronDown, Check } from 'lucide-react-native'
import { useTheme } from '@/lib/theme-context'
import type { Theme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n/context'
import { useAppData } from '@/hooks/useAppData'
import { calculateMVP, formatDate } from '@/lib/utils'
import type { Match } from '@/types/database'

export default function Dashboard() {
  const router = useRouter()
  const { t } = useI18n()
  const theme = useTheme()
  const s = useMemo(() => makeStyles(theme), [theme])
  const data = useAppData()
  const [picker, setPicker] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (data.isLoaded && !data.userId) router.replace('/')
  }, [data.isLoaded, data.userId])

  const stats = useMemo(() => {
    const m = data.matches
    const wins = m.filter((x) => x.home_score > x.away_score).length
    const losses = m.filter((x) => x.home_score < x.away_score).length
    const draws = m.filter((x) => x.home_score === x.away_score).length
    const total = m.length
    return { wins, losses, draws, total, rate: total ? Math.round((wins / total) * 100) : null }
  }, [data.matches])

  const onRefresh = async () => { setRefreshing(true); await data.refresh(); setRefreshing(false) }

  if (data.loading) {
    return <View style={[s.fill, s.center]}><ActivityIndicator color={theme.accent} /></View>
  }

  const team = data.selectedTeam
  const pending = team?.role === 'coach' ? data.members.filter((m) => m.status === 'pending' && !m.is_removed).length : 0
  const winColor = theme.isDark ? theme.accent : theme.text

  const Row = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ color: theme.text3, fontSize: 12 }}>{label}</Text>
      <Text style={{ color, fontSize: 19, fontWeight: '900' }}>{value}</Text>
    </View>
  )

  const MatchRow = ({ m }: { m: Match }) => {
    const mvp = calculateMVP(m)
    const isWin = m.home_score > m.away_score
    const isLoss = m.home_score < m.away_score
    return (
      <Pressable style={s.matchRow} onPress={() => router.push(`/match/${m.id}`)}>
        <View style={[s.matchBar, { backgroundColor: isWin ? theme.accent : theme.textFaint }]} />
        <View style={{ flex: 1 }}>
          <Text style={s.matchOpp}>vs {m.opponent}</Text>
          {mvp && <Text style={s.matchMvp}>★ MVP {mvp.playerName} · {mvp.averageRating.toFixed(1)}</Text>}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.matchScore}>{m.home_score} – {m.away_score}</Text>
          <Text style={{ color: isWin ? winColor : isLoss ? theme.danger : theme.textMute, fontSize: 12, fontWeight: '800' }}>
            {isWin ? 'WIN' : isLoss ? 'LOSS' : 'DRAW'} · {formatDate(m.match_date)}
          </Text>
        </View>
      </Pressable>
    )
  }

  return (
    <SafeAreaView style={s.fill} edges={['top']}>
      <View style={s.header}>
        <View>
          <Text style={s.brand}>FOOTBALL NOTE</Text>
          <Pressable style={s.teamRow} onPress={() => setPicker(true)}>
            <Text style={s.teamName}>{team?.name ?? t.selectTeam}</Text>
            <ChevronDown color={theme.textMute} size={18} />
          </Pressable>
        </View>
        <Pressable style={s.avatar} onPress={() => router.push('/profile')}>
          <Text style={s.avatarText}>{(data.displayName || '?').charAt(0).toUpperCase()}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 14 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      >
        {pending > 0 && (
          <Pressable style={s.pending} onPress={() => router.push('/team')}>
            <Text style={s.pendingText}>{t.pendingJoinBadge.replace('{n}', String(pending))}</Text>
            <Text style={s.pendingCta}>{t.checkNow}</Text>
          </Pressable>
        )}

        {/* Season stats */}
        <View style={s.card}>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1.3, borderRightWidth: 1, borderRightColor: theme.line, paddingRight: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                <Text style={s.bigStat}>{stats.rate ?? '–'}</Text>
                {stats.rate !== null && <Text style={s.pct}>%</Text>}
              </View>
              <Text style={s.statLabel}>{t.seasonWinRate.replace('{n}', String(stats.total))}</Text>
            </View>
            <View style={{ flex: 1, justifyContent: 'center', gap: 8, paddingLeft: 16 }}>
              <Row label={t.win} value={stats.wins} color={winColor} />
              <Row label={t.loss} value={stats.losses} color={theme.danger} />
              <Row label={t.draw} value={stats.draws} color={theme.textMute} />
            </View>
          </View>
        </View>

        {/* New match */}
        {(team?.role === 'coach' || team?.membership?.can_edit_matches) && (
          <Pressable style={s.newMatch} onPress={() => router.push('/match/new')}>
            <Text style={s.newMatchText}>{t.newMatchRecord}</Text>
          </Pressable>
        )}

        {/* Recent matches */}
        <Text style={s.sectionTitle}>{t.recentMatches}</Text>
        {data.matches.length === 0 ? (
          <View style={[s.card, { alignItems: 'center', paddingVertical: 32 }]}>
            <Text style={{ color: theme.textMute }}>{t.noMatches}</Text>
          </View>
        ) : (
          data.matches.map((m) => <MatchRow key={m.id} m={m} />)
        )}
      </ScrollView>

      {/* Team picker */}
      <Modal visible={picker} transparent animationType="fade" onRequestClose={() => setPicker(false)}>
        <Pressable style={s.modalBg} onPress={() => setPicker(false)}>
          <Pressable style={s.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={s.modalTitle}>{t.selectTeam}</Text>
            {data.teams.map((tm) => {
              const active = tm.id === data.selectedTeamId
              return (
                <Pressable key={tm.id} style={[s.teamOption, active && s.teamOptionActive]}
                  onPress={() => { data.selectTeam(tm.id); setPicker(false) }}>
                  <View>
                    <Text style={s.teamOptionName}>{tm.name}</Text>
                    <Text style={s.teamOptionRole}>{tm.role === 'coach' ? t.coach : t.member}</Text>
                  </View>
                  {active && <Check color={theme.isDark ? theme.accent : theme.text} size={18} />}
                </Pressable>
              )
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12, backgroundColor: theme.nav, borderBottomWidth: 1, borderBottomColor: theme.line,
  },
  brand: { color: theme.isDark ? theme.accent : theme.textMute, fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  teamName: { color: theme.text, fontSize: 19, fontWeight: '900' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.btnBg, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: theme.btnText, fontWeight: '900', fontSize: 15 },
  pending: {
    flexDirection: 'row', justifyContent: 'space-between', backgroundColor: theme.chip,
    borderWidth: 1, borderColor: theme.isDark ? theme.accent : theme.line, borderRadius: 14, padding: 14,
  },
  pendingText: { color: theme.isDark ? theme.accent : theme.text, fontWeight: '800' },
  pendingCta: { color: theme.isDark ? theme.accent : theme.text2, fontWeight: '800' },
  card: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line, borderRadius: 20, padding: 20 },
  bigStat: { color: theme.text, fontSize: 46, fontWeight: '900', lineHeight: 48 },
  pct: { color: theme.isDark ? theme.accent : theme.text, fontSize: 26, fontWeight: '900' },
  statLabel: { color: theme.textMute, fontSize: 12, marginTop: 4 },
  sectionTitle: { color: theme.text, fontSize: 16, fontWeight: '900', marginTop: 4 },
  newMatch: { backgroundColor: theme.btnBg, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  newMatchText: { color: theme.btnText, fontSize: 16, fontWeight: '900' },
  matchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.card,
    borderWidth: 1, borderColor: theme.line, borderRadius: 14, padding: 16,
  },
  matchBar: { width: 4, height: 34, borderRadius: 2 },
  matchOpp: { color: theme.text, fontSize: 14, fontWeight: '800' },
  matchMvp: { color: theme.textMute, fontSize: 12, marginTop: 2 },
  matchScore: { color: theme.text, fontSize: 23, fontWeight: '900' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-start', paddingTop: 120, paddingHorizontal: 20 },
  modalCard: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line, borderRadius: 20, padding: 20, gap: 8 },
  modalTitle: { color: theme.text, fontSize: 17, fontWeight: '900', marginBottom: 8 },
  teamOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: theme.card2, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'transparent',
  },
  teamOptionActive: { backgroundColor: theme.chip, borderColor: theme.isDark ? theme.accent : theme.line2 },
  teamOptionName: { color: theme.text, fontWeight: '800' },
  teamOptionRole: { color: theme.textMute, fontSize: 13, marginTop: 2 },
})
