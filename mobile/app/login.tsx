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

export default function Login() {
  const router = useRouter()
  const { t } = useI18n()
  const theme = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const onLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { Alert.alert(t.loginFailed, error.message); return }
    router.replace('/dashboard')
  }

  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft color={theme.textMute} size={24} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={styles.logo}><Text style={styles.logoLetter}>F</Text></View>
          <Text style={styles.wordmark}>FOOTBALL NOTE</Text>
          <Text style={styles.tagline}>{t.appTagline}</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder={t.email}
          placeholderTextColor={theme.textMute}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <View style={styles.pwWrap}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder={t.password}
            placeholderTextColor={theme.textMute}
            secureTextEntry={!show}
            value={password}
            onChangeText={setPassword}
          />
          <Pressable onPress={() => setShow((v) => !v)} style={styles.showBtn}>
            <Text style={styles.showText}>{show ? t.hide : t.show}</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => router.push('/forgot-password')} style={styles.forgotLink} hitSlop={8}>
          <Text style={styles.forgotText}>{t.forgotPassword}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
          onPress={onLogin}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color={theme.btnText} /> : <Text style={styles.primaryText}>{t.loginButton}</Text>}
        </Pressable>

        <Pressable onPress={() => router.replace('/signup')} style={styles.footerLink}>
          <Text style={styles.footerText}>
            {t.noAccount} <Text style={{ color: theme.text, fontWeight: '800' }}>{t.signup}</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.bg },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  body: { paddingHorizontal: 30, paddingTop: 20, flexGrow: 1, justifyContent: 'center' },
  brand: { alignItems: 'center', marginBottom: 32 },
  logo: {
    width: 64, height: 64, borderRadius: 18, backgroundColor: theme.btnBg,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  logoLetter: { fontSize: 38, fontWeight: '900', color: theme.btnText },
  wordmark: { fontSize: 30, fontWeight: '900', color: theme.text, letterSpacing: 2, marginBottom: 8 },
  tagline: { fontSize: 13, color: theme.textMute },
  input: {
    backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line, borderRadius: 13,
    paddingHorizontal: 16, paddingVertical: 15, color: theme.text, fontSize: 16, marginBottom: 12,
  },
  pwWrap: { flexDirection: 'row', alignItems: 'center', position: 'relative', marginBottom: 12 },
  showBtn: { position: 'absolute', right: 16 },
  showText: { color: theme.textMute, fontSize: 13 },
  forgotLink: { alignSelf: 'flex-end', marginTop: 10, marginBottom: 2 },
  forgotText: { color: theme.isDark ? theme.accent : theme.text, fontSize: 13, fontWeight: '700' },
  primaryBtn: {
    backgroundColor: theme.btnBg, borderRadius: 13, paddingVertical: 16, alignItems: 'center', marginTop: 4,
  },
  primaryText: { color: theme.btnText, fontSize: 16, fontWeight: '900' },
  footerLink: { alignItems: 'center', marginTop: 24 },
  footerText: { color: theme.textMute, fontSize: 14 },
})
