import { useEffect, useState } from 'react'
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator, Modal,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, Globe, LogOut, Check } from 'lucide-react-native'
import { theme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n/context'
import { supabase } from '@/lib/supabase'
import { LOCALES } from '@/lib/i18n'

export default function Profile() {
  const router = useRouter()
  const { t, locale, setLocale } = useI18n()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [langModal, setLangModal] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/'); return }
      setEmail(user.email ?? '')
      const { data } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()
      setName(data?.display_name || (user.user_metadata as any)?.display_name || '')
      setLoading(false)
    })
  }, [])

  const save = async () => {
    if (!name.trim()) { Alert.alert(t.nameRequired); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.auth.updateUser({ data: { display_name: name.trim() } })
    await supabase.from('profiles').upsert({ id: user!.id, display_name: name.trim(), email, updated_at: new Date().toISOString() })
    setSaving(false)
    Alert.alert(t.nameChangeSuccess)
  }

  const logout = () => {
    Alert.alert(t.logoutConfirmTitle, t.logoutConfirmDesc, [
      { text: t.cancel, style: 'cancel' },
      { text: t.logout, style: 'destructive', onPress: async () => { await supabase.auth.signOut(); router.replace('/') } },
    ])
  }

  const currentLocale = LOCALES.find((l) => l.code === locale)
  if (loading) return <View style={[s.fill, s.center]}><ActivityIndicator color={theme.accent} /></View>

  return (
    <SafeAreaView style={s.fill} edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}><ArrowLeft color="#888" size={22} /></Pressable>
        <Text style={s.headerTitle}>{t.myProfile}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
          <View style={s.avatar}><Text style={s.avatarText}>{(name || '?').charAt(0).toUpperCase()}</Text></View>
          <Text style={s.name}>{name || t.noName}</Text>
          <Text style={s.email}>{email}</Text>
        </View>

        <View style={s.card}>
          <Text style={s.label}>{t.nameLabel}</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder={t.namePlaceholder} placeholderTextColor="#555" />
          <Pressable style={s.saveBtn} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color="#0a0a0a" /> : <Text style={s.saveText}>{t.save}</Text>}
          </Pressable>
        </View>

        <View style={s.listCard}>
          <Pressable style={s.listRow} onPress={() => setLangModal(true)}>
            <View style={s.listLeft}><Globe color="#888" size={18} /><Text style={s.listText}>{t.language}</Text></View>
            <Text style={s.listValue}>{currentLocale?.flag} {currentLocale?.label}</Text>
          </Pressable>
          <Pressable style={[s.listRow, { borderTopWidth: 1, borderTopColor: theme.line }]} onPress={logout}>
            <View style={s.listLeft}><LogOut color="#888" size={18} /><Text style={s.listText}>{t.logout}</Text></View>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={langModal} transparent animationType="slide" onRequestClose={() => setLangModal(false)}>
        <Pressable style={s.modalBg} onPress={() => setLangModal(false)}>
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={s.sheetTitle}>{t.selectLanguage}</Text>
            {LOCALES.map((l) => {
              const active = l.code === locale
              return (
                <Pressable key={l.code} style={[s.langRow, active && s.langRowActive]}
                  onPress={() => { setLocale(l.code); setLangModal(false) }}>
                  <Text style={{ fontSize: 20 }}>{l.flag}</Text>
                  <Text style={[s.langLabel, active && { color: theme.accent }]}>{l.label}</Text>
                  {active && <Check color={theme.accent} size={18} style={{ marginLeft: 'auto' }} />}
                </Pressable>
              )
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.nav, borderBottomWidth: 1, borderBottomColor: theme.line },
  headerTitle: { color: theme.white, fontSize: 16, fontWeight: '900' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#0a0a0a', fontSize: 30, fontWeight: '900' },
  name: { color: theme.white, fontSize: 18, fontWeight: '800' },
  email: { color: theme.muted2, fontSize: 13, marginTop: 2 },
  card: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line, borderRadius: 16, padding: 16 },
  label: { color: theme.muted2, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  input: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: theme.white, fontSize: 15 },
  saveBtn: { backgroundColor: theme.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  saveText: { color: '#0a0a0a', fontWeight: '900', fontSize: 15 },
  listCard: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line, borderRadius: 16, overflow: 'hidden' },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  listLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  listText: { color: theme.white, fontWeight: '600', fontSize: 15 },
  listValue: { color: theme.muted2, fontSize: 13 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, gap: 6 },
  sheetTitle: { color: theme.white, fontSize: 17, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'transparent' },
  langRowActive: { backgroundColor: theme.chip, borderColor: theme.accent },
  langLabel: { color: '#ccc', fontSize: 15, fontWeight: '600' },
})
