import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '@/lib/theme'

export function Placeholder({ title }: { title: string }) {
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

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.bg },
  header: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: theme.nav, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  title: { color: theme.white, fontSize: 20, fontWeight: '900' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emoji: { fontSize: 40 },
  text: { color: theme.muted2, fontSize: 14 },
})
