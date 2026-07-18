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

export default function NewMatch() {
  const router = useRouter()
  const { t } = useI18n()
  const theme = useTheme()
  const s = useMemo(() => makeStyles(theme), [theme])
  const today = new Date().toISOString().split('T')[0]
  const [opponent, setOpponent] = useState('')
  const [date, setDate] = useState(today)
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const teamId = getStore().selectedTeamId
    if (!teamId || !opponent.trim()) { Alert.alert(t.opponentPlaceholder); return }
    setSaving(true)
    const { data, error } = await supabase.from('matches')
      .insert({ team_id: teamId, opponent: opponent.trim(), match_date: date, location: location.trim() || null })
      .select().single()
    setSaving(false)
    if (error) { Alert.alert(t.saveFailed, error.message); return }
    await refreshData()
    router.replace(`/match/${data.id}`)
  }

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) =>
    <View style={s.field}><Text style={s.label}>{label}</Text>{children}</View>

  return (
    <SafeAreaView style={s.fill} edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}><ArrowLeft color={theme.textMute} size={22} /></Pressable>
        <Text style={s.headerTitle}>{t.newMatch}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Field label={t.opponentNameRequired}>
          <TextInput style={s.input} value={opponent} onChangeText={setOpponent} placeholder={t.opponentPlaceholder} placeholderTextColor={theme.textMute} />
        </Field>
        <Field label={t.matchDateRequired}>
          <TextInput style={s.input} value={date} onChangeText={setDate} placeholder="2026-01-01" placeholderTextColor={theme.textMute} />
        </Field>
        <Field label={t.location}>
          <TextInput style={s.input} value={location} onChangeText={setLocation} placeholder={t.locationPlaceholder} placeholderTextColor={theme.textMute} />
        </Field>
        <Pressable style={s.btn} onPress={submit} disabled={saving}>
          {saving ? <ActivityIndicator color={theme.btnText} /> : <Text style={s.btnText}>{t.createMatch}</Text>}
        </Pressable>
        <Text style={s.note}>{t.createMatchDescription}</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.nav, borderBottomWidth: 1, borderBottomColor: theme.line },
  headerTitle: { color: theme.text, fontSize: 16, fontWeight: '900' },
  field: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10 },
  label: { color: theme.textMute, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  input: { color: theme.text, fontSize: 16, paddingVertical: 4 },
  btn: { backgroundColor: theme.btnBg, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 6 },
  btnText: { color: theme.btnText, fontWeight: '900', fontSize: 16 },
  note: { color: theme.textMute, fontSize: 12, textAlign: 'center', marginTop: 4 },
})
