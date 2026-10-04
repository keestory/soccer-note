import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, ImageBackground, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Bell, Check, ChevronDown, ChevronRight, Plus } from 'lucide-react-native'
import { useTheme } from '@/lib/theme-context'
import type { Theme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n/context'
import { useAppData } from '@/hooks/useAppData'
import { formatDate } from '@/lib/utils'

export default function Dashboard() {
  const router = useRouter(); const { t } = useI18n(); const theme = useTheme(); const s = useMemo(() => styles(theme), [theme]); const data = useAppData()
  const [picker, setPicker] = useState(false); const [refreshing, setRefreshing] = useState(false)
  useEffect(() => { if (data.isLoaded && !data.userId) router.replace('/') }, [data.isLoaded, data.userId, router])
  if (data.loading) return <View style={[s.fill, s.center]}><ActivityIndicator color={theme.accent} /></View>
  const now = Date.now(); const played = data.matches.filter(m => +new Date(m.match_date) <= now).sort((a, b) => +new Date(b.match_date) - +new Date(a.match_date)); const latest = played[0]
  const wins = played.filter(m => m.home_score > m.away_score).length; const rate = played.length ? Math.round(wins / played.length * 100) : null
  const team = data.selectedTeam; const canEdit = team?.role === 'coach' || !!team?.membership?.can_edit_matches
  const quarters = latest ? [...(latest.quarters ?? [])].sort((a, b) => a.quarter_number - b.quarter_number) : []
  const refresh = async () => { setRefreshing(true); await data.refresh(); setRefreshing(false) }
  const result = latest ? latest.home_score > latest.away_score ? 'WIN' : latest.home_score < latest.away_score ? 'LOSS' : 'DRAW' : null
  return <SafeAreaView style={s.fill} edges={['top']}>
    <View style={s.header}><Pressable style={s.teamButton} onPress={() => setPicker(true)}><Text numberOfLines={1} style={s.teamName}>{team?.name ?? t.selectTeam}</Text><ChevronDown color={theme.text3} size={20} /></Pressable><View style={s.headerActions}><Bell color={theme.text3} size={23} /><Pressable style={s.avatar} onPress={() => router.push('/profile')}><Text style={s.avatarText}>{(data.displayName || '?')[0].toUpperCase()}</Text></Pressable></View></View>
    <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.text} />}>
      <Text style={s.season}>{t.homeSeasonSummary.replace('{n}', String(played.length)).replace('{rate}', String(rate ?? '–'))}</Text><View style={s.rule} />
      {latest ? <View><View style={s.meta}><View><Text style={s.latest}>{t.lastMatch}</Text><View style={[s.badge, result === 'LOSS' && s.lossBadge]}><Text style={[s.badgeText, result === 'LOSS' && { color: '#fff' }]}>{result}</Text></View></View><View style={{ alignItems: 'flex-end' }}><Text style={s.date}>{formatDate(latest.match_date)}</Text>{latest.location && <Text style={s.location}>{latest.location}</Text>}</View></View>
        <Pressable onPress={() => router.push(`/match/${latest.id}`)}><View style={s.scoreRow}><Text style={s.score}>{latest.home_score}-{latest.away_score}</Text><View style={s.opponent}><Text style={s.opponentLabel}>{t.opponentShort}</Text><Text numberOfLines={2} style={s.opponentName}>vs {latest.opponent}</Text></View></View><ImageBackground source={require('../../assets/match-stadium-bg.png')} imageStyle={s.pitchImage} style={s.pitch}><View style={s.pitchOverlay}>{[0,1,2,3].map((_, i) => { const q = quarters[i]; return <View key={i} style={[s.quarter, i > 0 && s.quarterBorder]}><Text style={s.quarterLabel}>{i + 1}Q</Text><Text style={s.quarterScore}>{q?.home_score ?? 0}:{q?.away_score ?? 0}</Text></View> })}</View></ImageBackground></Pressable>
      </View> : <View style={s.empty}><Text style={s.location}>{t.noMatches}</Text></View>}
      {canEdit && <Pressable style={s.cta} onPress={() => router.push('/match/new')}><Plus color={theme.text} size={28} strokeWidth={3} /><Text style={s.ctaText}>{t.newMatchRecord}</Text></Pressable>}
      <QuickLink label={t.homeAllMatchesLabel} detail={t.homeAllMatchesDescription} onPress={() => router.push('/(tabs)/matches')} theme={theme} />
      <QuickLink label={t.homeTeamOperationsLabel} detail={t.homeTeamOperationsDescription} onPress={() => router.push('/(tabs)/team')} theme={theme} />
    </ScrollView>
    <Modal visible={picker} transparent animationType="fade" onRequestClose={() => setPicker(false)}><Pressable style={s.modalBg} onPress={() => setPicker(false)}><Pressable style={s.modalCard} onPress={e => e.stopPropagation()}><Text style={s.modalTitle}>{t.selectTeam}</Text>{data.teams.map(tm => <Pressable key={tm.id} style={s.teamOption} onPress={() => { data.selectTeam(tm.id); setPicker(false) }}><Text style={s.optionText}>{tm.name}</Text>{tm.id === data.selectedTeamId && <Check color={theme.text} size={18} />}</Pressable>)}</Pressable></Pressable></Modal>
  </SafeAreaView>
}

function QuickLink({ label, detail, onPress, theme }: { label: string; detail: string; onPress: () => void; theme: Theme }) { return <Pressable style={{ flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.line, paddingVertical: 20 }} onPress={onPress}><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontSize: 18, fontWeight: '900' }}>{label}</Text><Text style={{ color: theme.text3, fontSize: 13, marginTop: 4 }}>{detail}</Text></View><ChevronRight color={theme.text3} size={24} /></Pressable> }

const styles = (t: Theme) => StyleSheet.create({
  fill: { flex: 1, backgroundColor: t.bg }, center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingVertical: 14, backgroundColor: t.nav }, teamButton: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '68%' }, teamName: { color: t.text, fontSize: 25, fontWeight: '900', letterSpacing: -1 }, headerActions: { flexDirection: 'row', alignItems: 'center', gap: 15 }, avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: t.hero }, avatarText: { color: t.accent, fontWeight: '900', fontSize: 16 },
  content: { paddingHorizontal: 20, paddingBottom: 34, gap: 20 }, season: { color: t.text3, fontSize: 18, fontWeight: '600' }, rule: { height: 1, backgroundColor: t.line }, meta: { flexDirection: 'row', justifyContent: 'space-between' }, latest: { color: t.text3, fontSize: 18 }, badge: { alignSelf: 'flex-start', marginTop: 12, borderRadius: 11, backgroundColor: t.accent, paddingHorizontal: 16, paddingVertical: 8 }, lossBadge: { backgroundColor: t.danger }, badgeText: { color: t.hero, fontWeight: '900', fontSize: 16 }, date: { color: t.text, fontWeight: '700', fontSize: 16 }, location: { color: t.text3, fontSize: 14, marginTop: 5 }, scoreRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 20, paddingHorizontal: 6, paddingVertical: 24 }, score: { color: t.text, fontSize: 88, lineHeight: 91, fontWeight: '900', letterSpacing: -6 }, opponent: { borderLeftWidth: 1, borderLeftColor: t.line, paddingLeft: 18, paddingBottom: 8, flex: 1 }, opponentLabel: { color: t.text3, fontSize: 14 }, opponentName: { color: t.text, fontSize: 21, fontWeight: '900', marginTop: 4 }, pitch: { height: 124, justifyContent: 'flex-end' }, pitchImage: { borderRadius: 20 }, pitchOverlay: { flexDirection: 'row', borderRadius: 20, backgroundColor: 'rgba(8,16,31,.64)', paddingVertical: 30, paddingHorizontal: 10 }, quarter: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline', gap: 5 }, quarterBorder: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,.25)' }, quarterLabel: { color: 'rgba(255,255,255,.55)', fontSize: 12, fontWeight: '800' }, quarterScore: { color: '#fff', fontSize: 17, fontWeight: '900' }, empty: { padding: 32, borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, alignItems: 'center' }, cta: { minHeight: 64, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, borderRadius: 18, backgroundColor: t.accent }, ctaText: { color: t.hero, fontSize: 18, fontWeight: '900' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,.72)', paddingTop: 120, paddingHorizontal: 20 }, modalCard: { backgroundColor: t.card, borderRadius: 20, padding: 20, gap: 8 }, modalTitle: { color: t.text, fontSize: 18, fontWeight: '900', marginBottom: 8 }, teamOption: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: t.card2, borderRadius: 12 }, optionText: { color: t.text, fontWeight: '800' },
})
