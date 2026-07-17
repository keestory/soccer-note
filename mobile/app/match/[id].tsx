import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, MapPin } from 'lucide-react-native'
import { theme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n/context'
import { supabase } from '@/lib/supabase'
import type { Match } from '@/types/database'
import { calculateMVP, formatDate } from '@/lib/utils'

export default function MatchDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { t } = useI18n()
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
        <Pressable onPress={() => router.back()} hitSlop={12}><ArrowLeft color="#888" size={22} /></Pressable>
        <View>
          <Text style={s.headerTitle}>vs {match.opponent}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={s.headerSub}>{formatDate(match.match_date)}</Text>
            {match.location ? <><MapPin color="#555" size={11} /><Text style={s.headerSub}>{match.location}</Text></> : null}
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Scoreboard */}
        <View style={s.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={s.muted}>{formatDate(match.match_date)}</Text>
            <View style={[s.resultPill, { backgroundColor: isWin ? theme.accent : isLoss ? 'rgba(192,90,77,.14)' : '#222' }]}>
              <Text style={{ color: isWin ? '#0a0a0a' : isLoss ? '#e07a6d' : '#888', fontWeight: '900', fontSize: 12 }}>{result}</Text>
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
                  <View key={q.id} style={s.qChip}>
                    <Text style={s.qText}>Q{q.quarter_number} {hs}·{as_}</Text>
                  </View>
                )
              })}
            </View>
          )}
          {mvp && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
              <Text style={{ color: theme.accent }}>★</Text>
              <Text style={s.muted}>MVP {mvp.playerName} · {mvp.averageRating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        <View style={[s.card, { alignItems: 'center', paddingVertical: 24 }]}>
          <Text style={{ fontSize: 28, marginBottom: 8 }}>🚧</Text>
          <Text style={s.muted}>쿼터별 기록 입력은 다음 단계에서 이식됩니다</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.nav, borderBottomWidth: 1, borderBottomColor: theme.line },
  headerTitle: { color: theme.white, fontSize: 16, fontWeight: '900' },
  headerSub: { color: '#777', fontSize: 12 },
  card: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line, borderRadius: 20, padding: 20 },
  muted: { color: theme.muted2, fontSize: 12 },
  resultPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  score: { fontSize: 72, fontWeight: '900' },
  dash: { fontSize: 48, color: theme.dash, fontWeight: '900' },
  qChip: { flex: 1, backgroundColor: theme.chip, borderRadius: 8, paddingVertical: 6, alignItems: 'center' },
  qText: { color: theme.chipText, fontSize: 12, fontWeight: '700' },
})
