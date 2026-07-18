import { useMemo, useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft } from 'lucide-react-native'
import { useTheme } from '@/lib/theme-context'
import type { Theme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n/context'
import { supabase } from '@/lib/supabase'
import { getStore, refreshData } from '@/lib/dataStore'
import { TRAINING_TYPE_COLORS } from '@/lib/training-colors'
import type { TrainingType } from '@/types/database'

const DURATIONS = [30, 60, 90, 120]

export default function NewTraining() {
  const router = useRouter()
  const { t } = useI18n()
  const theme = useTheme()
  const s = useMemo(() => makeStyles(theme), [theme])
  const today = new Date().toISOString().split('T')[0]
  const [type, setType] = useState<TrainingType>('mixed')
  const [date, setDate] = useState(today)
  const [duration, setDuration] = useState(60)
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)

  const TYPES: { key: TrainingType; label: string }[] = [
    { key: 'mini-game', label: t.trainingTypeMiniGame }, { key: 'passing', label: t.trainingTypePassing },
    { key: 'shooting', label: t.trainingTypeShooting }, { key: 'fitness', label: t.trainingTypeFitness },
    { key: 'tactics', label: t.trainingTypeTactics }, { key: 'mixed', label: t.trainingTypeMixed },
    { key: 'other', label: t.trainingTypeOther },
  ]

  const submit = async () => {
    const teamId = getStore().selectedTeamId
    if (!teamId) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('training_sessions').insert({
      team_id: teamId, training_date: date, training_type: type,
      location: location.trim() || null, duration_minutes: duration, created_by: user?.id || null,
    }).select().single()
    setSaving(false)
    if (error) { Alert.alert(t.trainingCreateFailed, error.message); return }
    await refreshData()
    router.replace(`/training/${data.id}`)
  }

  return (
    <SafeAreaView style={s.fill} edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}><ArrowLeft color={theme.textMute} size={22} /></Pressable>
        <Text style={s.headerTitle}>{t.newTraining}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
        <View style={s.card}>
          <Text style={s.label}>{t.trainingType}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {TYPES.map(({ key, label }) => {
              const c = TRAINING_TYPE_COLORS[key] || '#888'
              const active = type === key
              return (
                <Pressable key={key} onPress={() => setType(key)}
                  style={[s.typeBtn, { borderColor: active ? c : 'transparent', backgroundColor: active ? `${c}1f` : theme.card2 }]}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} />
                  <Text style={{ color: active ? c : theme.textMute, fontWeight: '700', fontSize: 12 }}>{label}</Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.label}>{t.trainingDate}</Text>
          <TextInput style={s.input} value={date} onChangeText={setDate} placeholder="2026-01-01" placeholderTextColor="#555" />
        </View>

        <View style={s.card}>
          <Text style={s.label}>{t.trainingDuration}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {DURATIONS.map((d) => (
              <Pressable key={d} onPress={() => setDuration(d)}
                style={[s.durBtn, { backgroundColor: duration === d ? theme.btnBg : theme.card2 }]}>
                <Text style={{ color: duration === d ? theme.btnText : theme.textMute, fontWeight: '900' }}>{t.minutesN.replace('{n}', String(d))}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.label}>{t.location}</Text>
          <TextInput style={s.input} value={location} onChangeText={setLocation} placeholder={t.locationPlaceholder} placeholderTextColor={theme.textMute} />
        </View>

        <Pressable style={s.btn} onPress={submit} disabled={saving}>
          {saving ? <ActivityIndicator color={theme.btnText} /> : <Text style={s.btnText}>{t.save}</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.nav, borderBottomWidth: 1, borderBottomColor: theme.line },
  headerTitle: { color: theme.text, fontSize: 16, fontWeight: '900' },
  card: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line, borderRadius: 16, padding: 16 },
  label: { color: theme.textMute, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  input: { color: theme.text, fontSize: 16, paddingVertical: 6, marginTop: 6 },
  typeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  durBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btn: { backgroundColor: theme.btnBg, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnText: { color: theme.btnText, fontWeight: '900', fontSize: 16 },
})
