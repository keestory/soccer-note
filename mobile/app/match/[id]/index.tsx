import { useEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, MapPin } from 'lucide-react-native'
import { useTheme } from '@/lib/theme-context'
import type { Theme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n/context'
import { supabase } from '@/lib/supabase'
import { useAppData } from '@/hooks/useAppData'
import type { Match } from '@/types/database'
import { calculateMVP, formatDate } from '@/lib/utils'

export default function MatchDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { t } = useI18n()
  const theme = useTheme()
  const s = useMemo(() => makeStyles(theme), [theme])
  const data = useAppData()
  const isCoach = data.selectedTeam?.role === 'coach' || data.selectedTeam?.membership?.can_edit_quarters
  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('matches')
      .select('*, quarters (*, quarter_records (*, player:players (*)))')
      .eq('id', id).single()
      .then(({ data }) => {
        if (data) (data as any).quarters?.sort((a: any, b: any) => a.quarter_number - b.quarter_number)
        setMatch(data as Match)
        setLoading(false)
      })
  }, [id])

  if (loading || !match) return <View style={[s.fill, s.center]}><ActivityIndicator color={theme.accent} /></View>

  const quarters = (match as any).quarters ?? []
  const isWin = match.home_score > match.away_score
  const isLoss = match.home_score < match.away_score
  const result = isWin ? 'WIN' : isLoss ? 'LOSS' : 'DRAW'
  const mvp = calculateMVP(match)

  return (
    <SafeAreaView style={s.fill} edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}><ArrowLeft color={theme.textMute} size={22} /></Pressable>
        <View>
          <Text style={s.headerTitle}>vs {match.opponent}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={s.headerSub}>{formatDate(match.match_date)}</Text>
            {match.location ? <><MapPin color={theme.textMute} size={11} /><Text style={s.headerSub}>{match.location}</Text></> : null}
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Scoreboard (navy hero surface in both themes) */}
        <View style={s.hero}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={s.heroMuted}>{formatDate(match.match_date)}</Text>
            <View style={[s.resultPill, { backgroundColor: isWin ? theme.accent : isLoss ? theme.dangerSoft : theme.hero2 }]}>
              <Text style={{ color: isWin ? theme.onAccent : isLoss ? theme.dangerText : theme.heroMute, fontWeight: '900', fontSize: 12 }}>{result}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <Text style={[s.score, { color: theme.accent }]}>{match.home_score}</Text>
            <Text style={s.dash}>–</Text>
            <Text style={[s.score, { color: isLoss ? theme.danger : theme.accent }]}>{match.away_score}</Text>
          </View>
          {quarters.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              {quarters.map((q: any) => {
                const hs = q.quarter_records?.filter((r: any) => r.is_home !== false).reduce((sum: number, r: any) => sum + (r.goals || 0), 0) ?? 0
                const as_ = q.quarter_records?.filter((r: any) => r.is_home === false).reduce((sum: number, r: any) => sum + (r.goals || 0), 0) ?? 0
                return (
                  <Pressable key={q.id} style={s.qChip} disabled={!isCoach}
                    onPress={() => router.push(`/match/${match.id}/quarter/${q.quarter_number}`)}>
                    <Text style={s.qText}>Q{q.quarter_number} {hs}·{as_}</Text>
                  </Pressable>
                )
              })}
            </View>
          )}
          {mvp && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
              <Text style={{ color: theme.accent }}>★</Text>
              <Text style={s.heroMuted}>MVP {mvp.playerName} · {mvp.averageRating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {isCoach && quarters.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardLabel}>{t.quarterRecord}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {quarters.map((q: any) => (
                <Pressable key={q.id} style={s.qEditBtn}
                  onPress={() => router.push(`/match/${match.id}/quarter/${q.quarter_number}`)}>
                  <Text style={s.qEditText}>{t.quarterN.replace('{n}', String(q.quarter_number))}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.nav, borderBottomWidth: 1, borderBottomColor: theme.line },
  headerTitle: { color: theme.text, fontSize: 16, fontWeight: '900' },
  headerSub: { color: theme.textMute, fontSize: 12 },
  hero: { backgroundColor: theme.hero, borderRadius: 20, padding: 20 },
  card: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line, borderRadius: 20, padding: 20 },
  heroMuted: { color: theme.heroMute, fontSize: 12 },
  resultPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  score: { fontSize: 72, fontWeight: '900' },
  dash: { fontSize: 48, color: theme.heroDash, fontWeight: '900' },
  qChip: { flex: 1, backgroundColor: theme.hero2, borderRadius: 8, paddingVertical: 6, alignItems: 'center' },
  qText: { color: theme.heroMute, fontSize: 12, fontWeight: '700' },
  cardLabel: { color: theme.textMute, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  qEditBtn: { backgroundColor: theme.card2, borderWidth: 1, borderColor: theme.line, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  qEditText: { color: theme.isDark ? theme.accent : theme.text, fontWeight: '800', fontSize: 13 },
})
