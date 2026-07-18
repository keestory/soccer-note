import { useEffect, useMemo, useState } from 'react'
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator, Image,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, Camera } from 'lucide-react-native'
import Slider from '@react-native-community/slider'
import * as ImagePicker from 'expo-image-picker'
import { decode } from 'base64-arraybuffer'
import { POS_COLOR, POS_TEXT, type Theme } from '@/lib/theme'
import { useTheme } from '@/lib/theme-context'
import { useI18n } from '@/lib/i18n/context'
import { supabase } from '@/lib/supabase'
import { getStore, refreshData } from '@/lib/dataStore'
import type { PositionType, PlayerAttributes } from '@/types/database'
import { ATTRIBUTE_KEYS } from '@/types/database'

const DEFAULT_ATTRS: PlayerAttributes = { pace: 50, shooting: 50, passing: 50, dribbling: 50, defending: 50, physical: 50 }

export default function PlayerForm() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const router = useRouter()
  const { t } = useI18n()
  const theme = useTheme()
  const s = useMemo(() => makeStyles(theme), [theme])
  const accentText = theme.isDark ? theme.accent : theme.text
  const editing = !!id

  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [position, setPosition] = useState<PositionType>('MF')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [preferredPositions, setPreferredPositions] = useState('')
  const [preferredNumbers, setPreferredNumbers] = useState('')
  const [bio, setBio] = useState('')
  const [strengthTags, setStrengthTags] = useState('')
  const [attrs, setAttrs] = useState<PlayerAttributes>(DEFAULT_ATTRS)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(editing)

  useEffect(() => {
    if (!editing) return
    supabase.from('players').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        setName(data.name); setNumber(data.number?.toString() ?? '')
        setPosition(data.default_position); setPhotoUrl(data.photo_url ?? null)
        setPreferredPositions((data.preferred_positions ?? []).join(', '))
        setPreferredNumbers(data.preferred_numbers ?? ''); setBio(data.bio ?? '')
        setStrengthTags((data.strength_tags ?? []).join(', '))
        setAttrs(data.attributes ?? DEFAULT_ATTRS)
      }
      setLoading(false)
    })
  }, [id])

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true,
    })
    if (res.canceled || !res.assets[0]?.base64) return
    setUploading(true)
    try {
      const path = `players/${Date.now()}.jpg`
      const { error } = await supabase.storage.from('player-media')
        .upload(path, decode(res.assets[0].base64), { contentType: 'image/jpeg', upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('player-media').getPublicUrl(path)
      setPhotoUrl(data.publicUrl)
    } catch (e: any) {
      Alert.alert(t.uploadFailed, e.message)
    } finally { setUploading(false) }
  }

  const submit = async () => {
    if (!name.trim()) { Alert.alert(t.playerName); return }
    setSaving(true)
    const payload = {
      name: name.trim(),
      number: number ? parseInt(number) : null,
      default_position: position,
      photo_url: photoUrl,
      preferred_positions: preferredPositions.split(',').map((x) => x.trim()).filter(Boolean),
      preferred_numbers: preferredNumbers.trim() || null,
      bio: bio.trim() || null,
      strength_tags: strengthTags.split(',').map((x) => x.trim()).filter(Boolean),
      attributes: attrs,
    }
    let error
    if (editing) ({ error } = await supabase.from('players').update(payload).eq('id', id))
    else ({ error } = await supabase.from('players').insert({ ...payload, team_id: getStore().selectedTeamId }))
    setSaving(false)
    if (error) { Alert.alert(t.saveFailed, error.message); return }
    await refreshData()
    router.back()
  }

  if (loading) return <View style={[s.fill, s.center]}><ActivityIndicator color={theme.accent} /></View>

  return (
    <SafeAreaView style={s.fill} edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}><ArrowLeft color={theme.textMute} size={22} /></Pressable>
        <Text style={s.headerTitle}>{editing ? t.editPlayerTitle : t.addPlayerTitle}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }} keyboardShouldPersistTaps="handled">
        {/* Photo */}
        <Pressable style={{ alignSelf: 'center' }} onPress={pickPhoto}>
          <View style={[s.photo, { backgroundColor: POS_COLOR[position] }]}>
            {photoUrl ? <Image source={{ uri: photoUrl }} style={{ width: 96, height: 96, borderRadius: 24 }} />
              : <Camera color={POS_TEXT[position]} size={28} />}
          </View>
          {uploading && <ActivityIndicator color={theme.accent} style={{ position: 'absolute', top: 36, left: 36 }} />}
        </Pressable>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TextInput style={[s.input, { flex: 2 }]} value={name} onChangeText={setName} placeholder={t.playerName} placeholderTextColor={theme.textMute} />
          <TextInput style={[s.input, { flex: 1 }]} value={number} onChangeText={setNumber} placeholder="#" keyboardType="number-pad" placeholderTextColor={theme.textMute} />
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['GK', 'DF', 'MF', 'FW'] as PositionType[]).map((p) => (
            <Pressable key={p} onPress={() => setPosition(p)}
              style={[s.posBtn, { backgroundColor: position === p ? POS_COLOR[p] : theme.card2 }]}>
              <Text style={{ color: position === p ? POS_TEXT[p] : theme.textMute, fontWeight: '800' }}>{p}</Text>
            </Pressable>
          ))}
        </View>

        {/* Ability sliders */}
        <View style={s.card}>
          <Text style={s.cardLabel}>{t.rateYourself}</Text>
          {ATTRIBUTE_KEYS.map((k) => {
            const label = { pace: t.attrPace, shooting: t.attrShooting, passing: t.attrPassing, dribbling: t.attrDribbling, defending: t.attrDefending, physical: t.attrPhysical }[k]
            return (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <Text style={{ color: theme.text2, width: 52, fontSize: 12, fontWeight: '700' }}>{label}</Text>
                <Slider style={{ flex: 1 }} minimumValue={1} maximumValue={99} step={1}
                  value={attrs[k]} onValueChange={(v) => setAttrs((a) => ({ ...a, [k]: Math.round(v) }))}
                  minimumTrackTintColor={accentText} maximumTrackTintColor={theme.inputLine} thumbTintColor={accentText} />
                <Text style={{ color: accentText, width: 26, textAlign: 'right', fontWeight: '900' }}>{attrs[k]}</Text>
              </View>
            )
          })}
        </View>

        <TextInput style={s.input} value={preferredPositions} onChangeText={setPreferredPositions} placeholder={t.preferredPositionsPlaceholder} placeholderTextColor={theme.textMute} />
        <TextInput style={s.input} value={preferredNumbers} onChangeText={setPreferredNumbers} placeholder={t.preferredNumbersPlaceholder} placeholderTextColor={theme.textMute} />
        <TextInput style={s.input} value={strengthTags} onChangeText={setStrengthTags} placeholder={t.strengthsPlaceholder} placeholderTextColor={theme.textMute} />
        <TextInput style={[s.input, { height: 90, textAlignVertical: 'top' }]} value={bio} onChangeText={setBio} placeholder={t.selfIntroPlaceholder} placeholderTextColor={theme.textMute} multiline />

        <Pressable style={s.btn} onPress={submit} disabled={saving}>
          {saving ? <ActivityIndicator color={theme.btnText} /> : <Text style={s.btnText}>{editing ? t.editDone : t.addPlayer}</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.nav, borderBottomWidth: 1, borderBottomColor: theme.line },
  headerTitle: { color: theme.text, fontSize: 16, fontWeight: '900' },
  photo: { width: 96, height: 96, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  input: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: theme.text, fontSize: 15 },
  posBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  card: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line, borderRadius: 16, padding: 16 },
  cardLabel: { color: theme.textMute, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  btn: { backgroundColor: theme.btnBg, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  btnText: { color: theme.btnText, fontWeight: '900', fontSize: 16 },
})
