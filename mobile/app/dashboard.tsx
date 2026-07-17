import { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n/context'
import { supabase } from '@/lib/supabase'

export default function Dashboard() {
  const router = useRouter()
  const { t } = useI18n()
  const [name, setName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/'); return }
      setName(user.user_metadata?.display_name ?? user.email ?? null)
      setLoading(false)
    })
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    router.replace('/')
  }

  if (loading) {
    return <View style={[styles.fill, styles.center]}><ActivityIndicator color={theme.accent} /></View>
  }

  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <View style={styles.center}>
        <Text style={styles.hi}>👋 {name}</Text>
        <Text style={styles.note}>네이티브 앱 기반 완성! (대시보드는 다음 단계에서 이식)</Text>
        <Pressable style={styles.btn} onPress={logout}>
          <Text style={styles.btnText}>{t.logout}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  hi: { color: theme.white, fontSize: 24, fontWeight: '900' },
  note: { color: theme.muted2, fontSize: 14, textAlign: 'center' },
  btn: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 28, marginTop: 12 },
  btnText: { color: theme.white, fontWeight: '800' },
})
