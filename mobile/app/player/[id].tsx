import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Image, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, Star, Pencil, Trash2 } from 'lucide-react-native'
import { theme, POS_COLOR, POS_TEXT } from '@/lib/theme'
import { useI18n } from '@/lib/i18n/context'
import { supabase } from '@/lib/supabase'
import { useAppData } from '@/hooks/useAppData'
import { refreshData } from '@/lib/dataStore'
import type { Player } from '@/types/database'
import { AbilityHexagon } from '@/components/AbilityHexagon'
import { overallRating } from '@/lib/attributes'

export default function PlayerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { t } = useI18n()
  const data = useAppData()
  const isCoach = data.selectedTeam?.role === 'coach'
  const [player, setPlayer] = useState<Player | null>(null)
  const [stats, setStats] = useState({ games: 0, goals: 0, assists: 0, cleanSheets: 0, avg: null as number | null, matchAtt: 0, trainAtt: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: records }, { count: matchAtt }, { count: trainAtt }] = await Promise.all([
        supabase.from('players').select('*').eq('id', id).single(),
        supabase.from('quarter_records').select('goals, assists, clean_sheet, rating, quarter:quarters(match:matches(id, status))').eq('player_id', id),
        supabase.from('match_attendees').select('id', { count: 'exact', head: true }).eq('player_id', id),
        supabase.from('training_attendees').select('id', { count: 'exact', head: true }).eq('player_id', id),
      ])
      setPlayer(p as Player)
      const matchMap = new Map<string, { goals: number; assists: number; cs: boolean; rating: number | null }>()
      for (const r of (records as any[]) || []) {
        const match = r.quarter?.match
        if (!match || match.status === 'upcoming') continue
        const cur = matchMap.get(match.id) || { goals: 0, assists: 0, cs: false, rating: null }
        cur.goals += r.goals || 0; cur.assists += r.assists || 0
        if (r.clean_sheet) cur.cs = true
        if (r.rating !== null) cur.rating = cur.rating === null ? r.rating : (cur.rating + r.rating) / 2
        matchMap.set(match.id, cur)
      }
      const arr = [...matchMap.values()]
      const rated = arr.filter((x) => x.rating !== null)
      setStats({
        games: arr.length,
        goals: arr.reduce((s, x) => s + x.goals, 0),
        assists: arr.reduce((s, x) => s + x.assists, 0),
        cleanSheets: arr.filter((x) => x.cs).length,
        avg: rated.length ? rated.reduce((s, x) => s + (x.rating || 0), 0) / rated.length : null,
        matchAtt: matchAtt || 0, trainAtt: trainAtt || 0,
      })
      setLoading(false)
    })()
  }, [id])

  const onDelete = () => {
    Alert.alert(t.deletePlayerTitle, t.deletePlayerDesc, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete, style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('players').delete().eq('id', id)
          if (error) { Alert.alert(t.deleteFailed, error.message); return }
          await refreshData()
          router.back()
        },
      },
    ])
  }

  if (loading || !player) return <View style={[s.fill, s.center]}><ActivityIndicator color={theme.accent} /></View>

  const posColor = POS_COLOR[player.default_position]

  return (
    <SafeAreaView style={s.fill} edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}><ArrowLeft color="#888" size={22} /></Pressable>
        <Text style={s.headerTitle}>{player.name}</Text>
        {isCoach && (
          <View style={{ flexDirection: 'row', gap: 16, marginLeft: 'auto' }}>
            <Pressable onPress={() => router.push(`/player/form?id=${id}`)} hitSlop={12}><Pencil color={theme.accent} size={20} /></Pressable>
            <Pressable onPress={onDelete} hitSlop={12}><Trash2 color={theme.danger} size={20} /></Pressable>
          </View>
        )}
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 16 }]}>
          <View style={[s.avatar, { backgroundColor: posColor }]}>
            {player.photo_url ? <Image source={{ uri: player.photo_url }} style={{ width: 64, height: 64, borderRadius: 16 }} />
              : <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>{player.number ?? '-'}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{player.name}</Text>
            <View style={[s.posTag, { backgroundColor: posColor, marginTop: 4 }]}>
              <Text style={{ color: POS_TEXT[player.default_position], fontSize: 11, fontWeight: '800' }}>{player.default_position}</Text>
            </View>
          </View>
          {stats.avg !== null && (
            <View style={s.avgBox}>
              <Star color={theme.accent} size={14} fill={theme.accent} />
              <Text style={s.avgNum}>{stats.avg.toFixed(1)}</Text>
              <Text style={s.avgLabel}>{t.avgRatingShort}</Text>
            </View>
          )}
        </View>

        {player.attributes && (
          <View style={s.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={s.cardLabel}>{t.abilityCard}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
                <Text style={{ color: theme.accent, fontSize: 28, fontWeight: '900' }}>{overallRating(player.attributes)}</Text>
                <Text style={{ color: theme.muted2, fontSize: 10, fontWeight: '800', marginBottom: 4 }}>{t.overall}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'center' }}><AbilityHexagon attributes={player.attributes} /></View>
          </View>
        )}

        {player.strength_tags && player.strength_tags.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardLabel}>{t.strengths}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {player.strength_tags.map((tag, i) => (
                <View key={i} style={s.strengthChip}><Text style={s.strengthText}>{tag}</Text></View>
              ))}
            </View>
          </View>
        )}

        {(player.bio || player.preferred_positions?.length || player.preferred_numbers) && (
          <View style={s.card}>
            <Text style={s.cardLabel}>{t.memberIntro}</Text>
            {player.bio ? <Text style={s.bio}>{player.bio}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 20, marginTop: 10, flexWrap: 'wrap' }}>
              {player.preferred_positions && player.preferred_positions.length > 0 && (
                <View>
                  <Text style={s.miniLabel}>{t.preferredPositions}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    {player.preferred_positions.map((p, i) => <View key={i} style={s.chip}><Text style={s.chipText}>{p}</Text></View>)}
                  </View>
                </View>
              )}
              {player.preferred_numbers ? (
                <View>
                  <Text style={s.miniLabel}>{t.preferredNumbers}</Text>
                  <Text style={{ color: '#fff', fontWeight: '800', marginTop: 4 }}>{player.preferred_numbers}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        <View style={s.card}>
          <Text style={s.cardLabel}>{t.seasonStatsTitle}</Text>
          <View style={s.statGrid}>
            <Stat label={t.statAppearances} value={stats.matchAtt} color={theme.accent} />
            <Stat label={t.goals} value={stats.goals} color="#a3e635" />
            <Stat label={t.assistsLabel} value={stats.assists} color="#38bdf8" />
            <Stat label={t.cleanSheet} value={stats.cleanSheets} color="#a78bfa" />
            <Stat label={t.statTraining} value={stats.trainAtt} color="#fb923c" />
            <Stat label={t.statRecordedMatches} value={stats.games} color={theme.muted2} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={s.statBox}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.nav, borderBottomWidth: 1, borderBottomColor: theme.line },
  headerTitle: { color: theme.white, fontSize: 16, fontWeight: '900' },
  card: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line, borderRadius: 16, padding: 16 },
  cardLabel: { color: theme.muted2, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  avatar: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  name: { color: theme.white, fontSize: 20, fontWeight: '900' },
  posTag: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  avgBox: { backgroundColor: theme.chip, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' },
  avgNum: { color: theme.accent, fontSize: 20, fontWeight: '900' },
  avgLabel: { color: theme.muted2, fontSize: 10 },
  strengthChip: { backgroundColor: theme.chip, borderWidth: 1, borderColor: theme.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  strengthText: { color: theme.chipText, fontSize: 13, fontWeight: '800' },
  bio: { color: '#e5e5e5', fontSize: 14, lineHeight: 20, marginTop: 10 },
  miniLabel: { color: theme.muted2, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  chip: { backgroundColor: theme.chip, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { color: theme.chipText, fontSize: 12, fontWeight: '700' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 10 },
  statBox: { width: '30%', backgroundColor: '#1a1a1a', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { color: theme.muted2, fontSize: 11, marginTop: 2 },
})
