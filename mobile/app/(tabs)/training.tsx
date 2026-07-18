import { useMemo, useState } from 'react'
import {
  View, Text, Pressable, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Clock, MapPin } from 'lucide-react-native'
import { useTheme } from '@/lib/theme-context'
import type { Theme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n/context'
import { useAppData } from '@/hooks/useAppData'
import { TRAINING_TYPE_COLORS } from '@/lib/training-colors'
import { formatDate } from '@/lib/utils'
import type { TrainingType } from '@/types/database'

export default function Training() {
  const router = useRouter()
  const { t } = useI18n()
  const theme = useTheme()
  const s = useMemo(() => makeStyles(theme), [theme])
  const data = useAppData()
  const [refreshing, setRefreshing] = useState(false)

  const TYPE_LABELS: Record<TrainingType, string> = {
    'mini-game': t.trainingTypeMiniGame, passing: t.trainingTypePassing, shooting: t.trainingTypeShooting,
    fitness: t.trainingTypeFitness, tactics: t.trainingTypeTactics, mixed: t.trainingTypeMixed, other: t.trainingTypeOther,
  }
  const onRefresh = async () => { setRefreshing(true); await data.refresh(); setRefreshing(false) }
  const trainings = data.trainings as any[]

  if (data.loading) return <View style={[s.fill, s.center]}><ActivityIndicator color={theme.accent} /></View>

  return (
    <SafeAreaView style={s.fill} edges={['top']}>
      <View style={s.headerRow}>
        <View>
          <Text style={s.title}>{t.trainingLabel}</Text>
          <Text style={s.sub}>{data.selectedTeam?.name} · {t.trainingCountN.replace('{n}', String(trainings.length))}</Text>
        </View>
        {(data.selectedTeam?.role === 'coach' || data.selectedTeam?.membership?.can_edit_matches) && (
          <Pressable style={s.addBtn} onPress={() => router.push('/training/new')}>
            <Text style={s.addText}>＋</Text>
          </Pressable>
        )}
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}>
        {trainings.length === 0 ? (
          <View style={[s.card, { alignItems: 'center', paddingVertical: 32 }]}>
            <Text style={{ color: theme.textMute }}>{t.noTrainings}</Text>
          </View>
        ) : trainings.map((tr) => {
          const color = TRAINING_TYPE_COLORS[tr.training_type] || '#888'
          const attendees = (tr.training_attendees ?? []).length
          return (
            <Pressable key={tr.id} style={s.row} onPress={() => router.push(`/training/${tr.id}`)}>
              <View style={[s.dot, { backgroundColor: `${color}1f` }]}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.type}>{TYPE_LABELS[tr.training_type as TrainingType] || tr.training_type}</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 3, alignItems: 'center' }}>
                  <View style={s.metaItem}><Clock color={theme.muted2} size={12} /><Text style={s.meta}>{t.minutesN.replace('{n}', String(tr.duration_minutes))}</Text></View>
                  {tr.location ? <View style={s.metaItem}><MapPin color={theme.muted2} size={12} /><Text style={s.meta}>{tr.location}</Text></View> : null}
                  {attendees > 0 ? <Text style={s.meta}>{t.attendCountN.replace('{n}', String(attendees))}</Text> : null}
                </View>
              </View>
              <Text style={s.date}>{formatDate(tr.training_date)}</Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: theme.nav, borderBottomWidth: 1, borderBottomColor: theme.line },
  addBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: theme.btnBg, alignItems: 'center', justifyContent: 'center' },
  addText: { color: theme.btnText, fontSize: 22, fontWeight: '900', marginTop: -2 },
  title: { color: theme.text, fontSize: 20, fontWeight: '900' },
  sub: { color: theme.textMute, fontSize: 12, marginTop: 2 },
  card: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line, borderRadius: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line, borderRadius: 14, padding: 16 },
  dot: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  type: { color: theme.text, fontSize: 14, fontWeight: '800' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  meta: { color: theme.textMute, fontSize: 12 },
  date: { color: theme.textMute, fontSize: 12 },
})
