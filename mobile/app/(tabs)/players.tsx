import { useMemo, useState } from 'react'
import {
  View, Text, Pressable, StyleSheet, ScrollView, RefreshControl, TextInput, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme, POS_COLOR, POS_TEXT } from '@/lib/theme'
import { useI18n } from '@/lib/i18n/context'
import { useAppData } from '@/hooks/useAppData'

export default function Players() {
  const router = useRouter()
  const { t } = useI18n()
  const data = useAppData()
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const players = useMemo(() => {
    return data.players.map((p) => {
      const records = data.matches.flatMap((m: any) =>
        (m.quarters ?? []).flatMap((q: any) => q.quarter_records ?? [])
      ).filter((r: any) => r.player_id === p.id)
      const rated = records.filter((r: any) => r.rating !== null)
      return {
        ...p,
        goals: records.reduce((sum: number, r: any) => sum + (r.goals || 0), 0),
        assists: records.reduce((sum: number, r: any) => sum + (r.assists || 0), 0),
        cleanSheets: records.filter((r: any) => r.clean_sheet).length,
        avg: rated.length ? rated.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / rated.length : null,
      }
    })
  }, [data.players, data.matches])

  const filtered = search.trim() ? players.filter((p) => p.name.includes(search.trim())) : players
  const onRefresh = async () => { setRefreshing(true); await data.refresh(); setRefreshing(false) }

  if (data.loading) return <View style={[st.fill, st.center]}><ActivityIndicator color={theme.accent} /></View>

  return (
    <SafeAreaView style={st.fill} edges={['top']}>
      <View style={st.header}>
        <View>
          <Text style={st.title}>{t.playersLabel}</Text>
          <Text style={st.sub}>{data.selectedTeam?.name} · {t.playersN.replace('{n}', String(players.length))}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Pressable style={st.introBtn} onPress={() => router.push('/team-intro')}>
            <Text style={st.introText}>{t.introTab}</Text>
          </Pressable>
          {data.selectedTeam?.role === 'coach' && (
            <Pressable style={st.addBtn} onPress={() => router.push('/player/form')}>
              <Text style={st.addText}>＋</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}>
        <TextInput style={st.search} placeholder={t.searchPlayer} placeholderTextColor="#555"
          value={search} onChangeText={setSearch} />
        {filtered.length === 0 ? (
          <View style={[st.card, { alignItems: 'center', paddingVertical: 32 }]}>
            <Text style={{ color: '#555' }}>{t.noPlayers}</Text>
          </View>
        ) : filtered.map((p) => (
          <Pressable key={p.id} style={st.row} onPress={() => router.push(`/player/${p.id}`)}>
            <View style={[st.posBadge, { backgroundColor: POS_COLOR[p.default_position] }]}>
              <Text style={{ color: POS_TEXT[p.default_position], fontWeight: '900', fontSize: 10 }}>{p.default_position}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.name}>{p.name} <Text style={{ color: '#555' }}>#{p.number ?? '–'}</Text></Text>
              <Text style={st.meta}>
                {p.default_position === 'GK'
                  ? `${t.cleanSheet} ${p.cleanSheets}`
                  : `${t.goalsCount.replace('{n}', String(p.goals))} ${t.assistsCount.replace('{n}', String(p.assists))}`}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={st.rating}>{p.avg !== null ? p.avg.toFixed(1) : '–'}</Text>
              <Text style={st.ratingLabel}>{t.avgRatingShort}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12, backgroundColor: theme.nav, borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  title: { color: theme.white, fontSize: 20, fontWeight: '900' },
  sub: { color: theme.muted2, fontSize: 12, marginTop: 2 },
  introBtn: { backgroundColor: theme.chip, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 9 },
  introText: { color: theme.accent, fontWeight: '800', fontSize: 13 },
  addBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' },
  addText: { color: '#0a0a0a', fontSize: 22, fontWeight: '900', marginTop: -2 },
  search: {
    backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, color: theme.white, fontSize: 14, marginBottom: 4,
  },
  card: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line, borderRadius: 16 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.card,
    borderWidth: 1, borderColor: theme.line, borderRadius: 14, padding: 16,
  },
  posBadge: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  name: { color: theme.white, fontSize: 14, fontWeight: '800' },
  meta: { color: theme.muted2, fontSize: 12, marginTop: 2 },
  rating: { color: theme.accent, fontSize: 22, fontWeight: '900' },
  ratingLabel: { color: '#555', fontSize: 9, marginTop: 2 },
})
