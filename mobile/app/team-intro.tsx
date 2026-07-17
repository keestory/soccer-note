import { View, Text, Pressable, StyleSheet, ScrollView, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft } from 'lucide-react-native'
import { theme, POS_COLOR, POS_TEXT } from '@/lib/theme'
import { useI18n } from '@/lib/i18n/context'
import { useAppData } from '@/hooks/useAppData'
import { overallRating } from '@/lib/attributes'

export default function TeamIntro() {
  const router = useRouter()
  const { t } = useI18n()
  const data = useAppData()

  return (
    <SafeAreaView style={s.fill} edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}><ArrowLeft color="#888" size={22} /></Pressable>
        <View>
          <Text style={s.title}>{t.teamIntro}</Text>
          <Text style={s.sub}>{data.selectedTeam?.name} · {t.playersN.replace('{n}', String(data.players.length))}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 10 }}>
        {data.players.map((p: any) => (
          <Pressable key={p.id} style={s.card} onPress={() => router.push(`/player/${p.id}`)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {p.attributes ? (
                <View style={s.ovr}>
                  <Text style={s.ovrNum}>{overallRating(p.attributes)}</Text>
                  <Text style={s.ovrLabel}>{t.overall}</Text>
                </View>
              ) : null}
              <View style={[s.avatar, { backgroundColor: POS_COLOR[p.default_position] }]}>
                {p.photo_url ? (
                  <Image source={{ uri: p.photo_url }} style={{ width: 44, height: 44, borderRadius: 11 }} />
                ) : (
                  <Text style={{ color: POS_TEXT[p.default_position], fontWeight: '900', fontSize: 15 }}>{p.number ?? '–'}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{p.name}</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  <View style={[s.tag, { backgroundColor: POS_COLOR[p.default_position] }]}>
                    <Text style={{ color: POS_TEXT[p.default_position], fontSize: 10, fontWeight: '800' }}>{p.default_position}</Text>
                  </View>
                  {(p.preferred_positions ?? []).slice(0, 3).map((pos: string, i: number) => (
                    <View key={i} style={s.chip}><Text style={s.chipText}>{pos}</Text></View>
                  ))}
                </View>
              </View>
            </View>
            {p.bio ? <Text style={s.bio} numberOfLines={2}>{p.bio}</Text> : <Text style={s.noBio}>{t.noBio}</Text>}
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.nav, borderBottomWidth: 1, borderBottomColor: theme.line },
  title: { color: theme.white, fontSize: 20, fontWeight: '900' },
  sub: { color: theme.muted2, fontSize: 12, marginTop: 2 },
  card: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line, borderRadius: 16, padding: 16 },
  ovr: { backgroundColor: theme.chip, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center' },
  ovrNum: { color: theme.accent, fontSize: 17, fontWeight: '900' },
  ovrLabel: { color: theme.muted2, fontSize: 8, fontWeight: '800' },
  avatar: { width: 44, height: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  name: { color: theme.white, fontSize: 15, fontWeight: '800' },
  tag: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  chip: { backgroundColor: theme.chip, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  chipText: { color: theme.chipText, fontSize: 10 },
  bio: { color: theme.muted2, fontSize: 12, marginTop: 10, lineHeight: 17 },
  noBio: { color: '#444', fontSize: 12, marginTop: 10, fontStyle: 'italic' },
})
