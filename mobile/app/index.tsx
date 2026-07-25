import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/lib/theme-context'
import type { Theme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n/context'
import { supabase } from '@/lib/supabase'

export default function Landing() {
  const router = useRouter()
  const { t } = useI18n()
  const theme = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])
  const [checking, setChecking] = useState(true)

  // If already signed in, skip straight to the app
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard')
      else setChecking(false)
    })
  }, [])

  if (checking) {
    return (
      <View style={[styles.fill, styles.center]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <View style={styles.center}>
        <View style={styles.logo}>
          <Text style={styles.logoLetter}>F</Text>
        </View>
        <Text style={styles.wordmark}>FOOTBALL NOTE</Text>
        <Text style={styles.tagline}>{t.appTagline}</Text>
      </View>

      <View style={styles.buttons}>
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          onPress={() => router.push('/signup')}
        >
          <Text style={styles.primaryText}>{t.signupButton}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.secondaryText}>{t.landingLogin}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  logo: {
    width: 104, height: 104, borderRadius: 26, backgroundColor: theme.btnBg,
    alignItems: 'center', justifyContent: 'center', marginBottom: 28,
  },
  logoLetter: { fontSize: 64, fontWeight: '900', color: theme.btnText },
  wordmark: { fontSize: 40, fontWeight: '900', color: theme.text, letterSpacing: 2, marginBottom: 12 },
  tagline: { fontSize: 15, color: theme.textMute },
  buttons: { paddingHorizontal: 24, paddingBottom: 12, gap: 12 },
  primaryBtn: {
    backgroundColor: theme.btnBg, borderRadius: 18, paddingVertical: 18, alignItems: 'center',
  },
  primaryText: { color: theme.btnText, fontSize: 17, fontWeight: '900' },
  secondaryBtn: {
    backgroundColor: theme.card, borderRadius: 18, paddingVertical: 18, alignItems: 'center',
    borderWidth: 1, borderColor: theme.line,
  },
  secondaryText: { color: theme.text, fontSize: 17, fontWeight: '900' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
})
