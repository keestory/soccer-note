import { useMemo, useState } from 'react'
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert, ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft } from 'lucide-react-native'
import { useTheme } from '@/lib/theme-context'
import type { Theme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n/context'
import { supabase } from '@/lib/supabase'

// The reset link opens the web reset page in the device browser (native has no
// deep-linked reset screen yet).
const RESET_REDIRECT = 'https://soccer-note-hazel.vercel.app/reset-password'

export default function ForgotPassword() {
  const router = useRouter()
  const { t } = useI18n()
  const theme = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async () => {
    if (!email.trim()) return
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: RESET_REDIRECT })
    setLoading(false)
    if (error) { Alert.alert(t.loginFailed, error.message); return }
    setSent(true)
  }

  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft color={theme.textMute} size={24} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t.resetPasswordTitle}</Text>
        <Text style={styles.subtitle}>{t.resetPasswordDesc}</Text>

        {sent ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>{t.resetLinkSent}</Text>
          </View>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder={t.email}
              placeholderTextColor={theme.textMute}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]} onPress={submit} disabled={loading}>
              {loading ? <ActivityIndicator color={theme.btnText} /> : <Text style={styles.primaryText}>{t.sendResetLink}</Text>}
            </Pressable>
          </>
        )}

        <Pressable onPress={() => router.replace('/login')} style={styles.footerLink}>
          <Text style={styles.footerText}>{t.backToLogin}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.bg },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  body: { paddingHorizontal: 30, paddingTop: 20, flexGrow: 1, justifyContent: 'center' },
  title: { color: theme.text, fontSize: 26, fontWeight: '900', marginBottom: 6 },
  subtitle: { color: theme.textMute, fontSize: 14, marginBottom: 24 },
  input: {
    backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line, borderRadius: 13,
    paddingHorizontal: 16, paddingVertical: 15, color: theme.text, fontSize: 16, marginBottom: 12,
  },
  primaryBtn: { backgroundColor: theme.btnBg, borderRadius: 13, paddingVertical: 16, alignItems: 'center' },
  primaryText: { color: theme.btnText, fontSize: 16, fontWeight: '900' },
  notice: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line, borderRadius: 13, padding: 18 },
  noticeText: { color: theme.text2, fontSize: 14, lineHeight: 21 },
  footerLink: { alignItems: 'center', marginTop: 24 },
  footerText: { color: theme.isDark ? theme.accent : theme.text, fontSize: 14, fontWeight: '800' },
})
