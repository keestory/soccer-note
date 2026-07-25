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

export default function Signup() {
  const router = useRouter()
  const { t } = useI18n()
  const theme = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const onSignup = async () => {
    if (!name.trim()) { Alert.alert(t.nameRequired); return }
    if (password.length < 6) { Alert.alert(t.passwordMinLength); return }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { display_name: name.trim() } },
    })
    if (error) { setLoading(false); Alert.alert(t.signupFailed, error.message); return }
    if (data.session) {
      await supabase.from('profiles').upsert({
        id: data.user!.id, display_name: name.trim(), email: email.trim(),
        updated_at: new Date().toISOString(),
      })
      setLoading(false)
      router.replace('/dashboard')
    } else {
      setLoading(false)
      Alert.alert(t.signupSuccessMessage)
      router.replace('/login')
    }
  }

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  )

  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft color={theme.textMute} size={24} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.brandSmall}>FOOTBALL NOTE</Text>
        <Text style={styles.title}>{t.newAccountTitle}</Text>
        <Text style={styles.subtitle}>{t.newAccountSubtitle}</Text>

        <Field label={t.nameLabel}>
          <TextInput style={styles.input} placeholder={t.namePlaceholder} placeholderTextColor={theme.textMute}
            value={name} onChangeText={setName} />
        </Field>
        <Field label={t.email}>
          <TextInput style={styles.input} placeholder="email@example.com" placeholderTextColor={theme.textMute}
            autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        </Field>
        <Field label={t.password}>
          <TextInput style={styles.input} placeholder={t.passwordMin6} placeholderTextColor={theme.textMute}
            secureTextEntry value={password} onChangeText={setPassword} />
        </Field>

        <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
          onPress={onSignup} disabled={loading}>
          {loading ? <ActivityIndicator color={theme.btnText} /> : <Text style={styles.primaryText}>{t.getStarted}</Text>}
        </Pressable>

        <Pressable onPress={() => router.replace('/login')} style={styles.footerLink}>
          <Text style={styles.footerText}>
            {t.hasAccount} <Text style={{ color: theme.text, fontWeight: '800' }}>{t.login}</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.bg },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  body: { paddingHorizontal: 26, paddingTop: 12, paddingBottom: 40 },
  brandSmall: { color: theme.isDark ? theme.accent : theme.text, fontSize: 13, fontWeight: '900', letterSpacing: 2, marginBottom: 6 },
  title: { color: theme.text, fontSize: 28, fontWeight: '900', marginBottom: 4 },
  subtitle: { color: theme.textMute, fontSize: 14, marginBottom: 24 },
  field: {
    backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 10, marginBottom: 12,
  },
  fieldLabel: { color: theme.textMute, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  input: { color: theme.text, fontSize: 16, paddingVertical: 4 },
  primaryBtn: { backgroundColor: theme.btnBg, borderRadius: 16, paddingVertical: 17, alignItems: 'center', marginTop: 8 },
  primaryText: { color: theme.btnText, fontSize: 17, fontWeight: '900' },
  footerLink: { alignItems: 'center', marginTop: 20 },
  footerText: { color: theme.textMute, fontSize: 14 },
})
