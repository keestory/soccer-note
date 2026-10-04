import { useEffect } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronRight, Dumbbell, FileText, Swords, UsersRound } from 'lucide-react-native'
import { useTheme } from '@/lib/theme-context'
import { useI18n } from '@/lib/i18n/context'
import { useAppData } from '@/hooks/useAppData'

export default function Team() {
  const router = useRouter(); const theme = useTheme(); const { t } = useI18n(); const data = useAppData()
  useEffect(() => { if (data.isLoaded && !data.userId) router.replace('/') }, [data.isLoaded, data.userId, router])
  const items = [
    { route: '/(tabs)/players', label: t.playerManagement, detail: `${data.players.length}${t.persons}`, Icon: UsersRound },
    { route: '/(tabs)/training', label: t.trainingLabel, detail: t.trainingLabel, Icon: Dumbbell },
    { route: '/(tabs)/community', label: t.navMatching, detail: t.findTeamsTagline, Icon: Swords },
    { route: '/team-intro', label: t.teamIntro, detail: data.selectedTeam?.name ?? '', Icon: FileText },
  ]
  return <SafeAreaView style={[s.fill, { backgroundColor: theme.bg }]} edges={['top']}><View style={[s.header, { backgroundColor: theme.nav }]}><Text style={[s.eyebrow, { color: theme.text3 }]}>{t.teamManagement}</Text><Text style={[s.title, { color: theme.text }]}>{data.selectedTeam?.name}</Text><Text style={[s.description, { color: theme.text3 }]}>{t.teamIntro}</Text></View><ScrollView contentContainerStyle={s.content}><View style={[s.list, { backgroundColor: theme.card, borderColor: theme.line }]}>{items.map(({ route, label, detail, Icon }, index) => <Pressable key={route} style={[s.row, index > 0 && { borderTopWidth: 1, borderTopColor: theme.line }]} onPress={() => router.push(route as any)}><View style={[s.icon, { backgroundColor: theme.hero }]}><Icon color={theme.accent} size={21} /></View><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontSize: 16, fontWeight: '900' }}>{label}</Text><Text numberOfLines={1} style={{ color: theme.text3, fontSize: 12, marginTop: 4 }}>{detail}</Text></View><ChevronRight color={theme.text3} size={21} /></Pressable>)}</View></ScrollView></SafeAreaView>
}
const s = StyleSheet.create({ fill: { flex: 1 }, header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 22 }, eyebrow: { fontSize: 12, fontWeight: '800' }, title: { fontSize: 28, fontWeight: '900', letterSpacing: -1.2, marginTop: 4 }, description: { fontSize: 14, marginTop: 8 }, content: { padding: 20 }, list: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' }, row: { minHeight: 80, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 15 }, icon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' } })
