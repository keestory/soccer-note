import { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/lib/theme-context'
import type { Theme } from '@/lib/theme'

export function Placeholder({ title }: { title: string }) {
  const theme = useTheme()
  const s = useMemo(() => makeStyles(theme), [theme])
  return (
    <SafeAreaView style={s.fill} edges={['top']}>
      <View style={s.header}><Text style={s.title}>{title}</Text></View>
      <View style={s.center}>
        <Text style={s.emoji}>🚧</Text>
        <Text style={s.text}>이 화면은 다음 단계에서 이식됩니다</Text>
      </View>
    </SafeAreaView>
  )
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.bg },
  header: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: theme.nav, borderBottomWidth: 1, borderBottomColor: theme.line },
  title: { color: theme.text, fontSize: 20, fontWeight: '900' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emoji: { fontSize: 40 },
  text: { color: theme.textMute, fontSize: 14 },
})
