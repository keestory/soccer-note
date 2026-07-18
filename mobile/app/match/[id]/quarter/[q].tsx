import { useEffect, useMemo, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Modal,
  TextInput, Alert, PanResponder, Image, Switch,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, Plus, X, Check, Trash2, ArrowRightLeft, Camera } from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import { decode } from 'base64-arraybuffer'
import { POS_COLOR, POS_TEXT, type Theme } from '@/lib/theme'
import { useTheme } from '@/lib/theme-context'
import { useI18n } from '@/lib/i18n/context'
import { supabase } from '@/lib/supabase'
import type { Player, Quarter, QuarterRecord, QuarterSubstitution, PositionType } from '@/types/database'

// Field is horizontal: left = our goal, right = opponent goal. Positions are [x%, y%].
const FORMATIONS: Record<string, Record<string, [number, number][]>> = {
  '4-4-2': { GK: [[8, 50]], DF: [[22, 15], [22, 38], [22, 62], [22, 85]], MF: [[45, 15], [45, 38], [45, 62], [45, 85]], FW: [[72, 35], [72, 65]] },
  '4-3-3': { GK: [[8, 50]], DF: [[22, 15], [22, 38], [22, 62], [22, 85]], MF: [[45, 25], [45, 50], [45, 75]], FW: [[72, 20], [72, 50], [72, 80]] },
  '4-2-3-1': { GK: [[8, 50]], DF: [[22, 15], [22, 38], [22, 62], [22, 85]], MF: [[38, 35], [38, 65], [55, 20], [55, 50], [55, 80]], FW: [[75, 50]] },
  '3-5-2': { GK: [[8, 50]], DF: [[22, 25], [22, 50], [22, 75]], MF: [[42, 10], [42, 30], [42, 50], [42, 70], [42, 90]], FW: [[72, 35], [72, 65]] },
  '3-4-3': { GK: [[8, 50]], DF: [[22, 25], [22, 50], [22, 75]], MF: [[45, 15], [45, 38], [45, 62], [45, 85]], FW: [[72, 20], [72, 50], [72, 80]] },
  '4-5-1': { GK: [[8, 50]], DF: [[22, 15], [22, 38], [22, 62], [22, 85]], MF: [[42, 10], [42, 30], [42, 50], [42, 70], [42, 90]], FW: [[72, 50]] },
  '5-3-2': { GK: [[8, 50]], DF: [[22, 10], [22, 30], [22, 50], [22, 70], [22, 90]], MF: [[45, 25], [45, 50], [45, 75]], FW: [[72, 35], [72, 65]] },
}

interface FieldPlayer {
  id: string
  playerId: string
  player: Player
  positionType: PositionType
  positionX: number
  positionY: number
  rating: number | null
  goals: number
  assists: number
  cleanSheet: boolean
  contribution: number
  praiseText: string
  improvementText: string
  highlightText: string
  mediaUrls: string[]
}

function ratingColor(r: number | null, theme: Theme): string {
  if (r === null) return theme.textMute
  if (r <= 3) return theme.danger
  if (r <= 6) return '#f5a623'
  return theme.isDark ? theme.accent : theme.text
}

function toFieldPlayer(r: QuarterRecord): FieldPlayer {
  return {
    id: r.id, playerId: r.player_id, player: r.player!, positionType: r.position_type,
    positionX: Number(r.position_x), positionY: Number(r.position_y),
    rating: r.rating, goals: r.goals, assists: r.assists, cleanSheet: r.clean_sheet,
    contribution: r.contribution, praiseText: r.praise_text || '', improvementText: r.improvement_text || '',
    highlightText: r.highlight_text || '', mediaUrls: r.media_urls || [],
  }
}

function blankFieldPlayer(player: Player, x: number, y: number): FieldPlayer {
  return {
    id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    playerId: player.id, player, positionType: player.default_position,
    positionX: x, positionY: y, rating: null, goals: 0, assists: 0, cleanSheet: false,
    contribution: 0, praiseText: '', improvementText: '', highlightText: '', mediaUrls: [],
  }
}

export default function QuarterEdit() {
  const { id: matchId, q } = useLocalSearchParams<{ id: string; q: string }>()
  const quarterNumber = parseInt(q || '1')
  const router = useRouter()
  const { t } = useI18n()
  const theme = useTheme()
  const s = useMemo(() => makeStyles(theme), [theme])
  const accentText = theme.isDark ? theme.accent : theme.text

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [quarter, setQuarter] = useState<Quarter | null>(null)
  const [teamId, setTeamId] = useState('')
  const [fieldPlayers, setFieldPlayers] = useState<FieldPlayer[]>([])
  const [available, setAvailable] = useState<Player[]>([])
  const [allTeamPlayers, setAllTeamPlayers] = useState<Player[]>([])
  const [subs, setSubs] = useState<QuarterSubstitution[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [pickerSel, setPickerSel] = useState<Set<string>>(new Set())
  const [showSub, setShowSub] = useState(false)
  const [subMinute, setSubMinute] = useState('0')
  const [subOut, setSubOut] = useState('')
  const [subIn, setSubIn] = useState('')
  const [fieldSize, setFieldSize] = useState({ w: 1, h: 1 })

  const selected = fieldPlayers.find((fp) => fp.id === selectedId) || null

  useEffect(() => { loadData() }, [matchId, quarterNumber])

  const loadData = async () => {
    const { data: matchData } = await supabase
      .from('matches')
      .select('team_id, quarters (*, quarter_records (*, player:players (*)))')
      .eq('id', matchId).single()
    if (!matchData) { Alert.alert(t.matchLoadFailed); router.back(); return }
    setTeamId(matchData.team_id)

    const cur = (matchData.quarters as Quarter[])?.find((qq) => qq.quarter_number === quarterNumber)
    if (!cur) { Alert.alert(t.quarterNotFound); router.back(); return }
    setQuarter(cur)

    const existing = (cur.quarter_records || []).map(toFieldPlayer)
    setFieldPlayers(existing)
    const usedIds = new Set(existing.map((fp) => fp.playerId))

    const { data: subsData } = await supabase
      .from('quarter_substitutions')
      .select('*, player_out:players!player_out_id(*), player_in:players!player_in_id(*)')
      .eq('quarter_id', cur.id).order('minute')
    if (subsData) setSubs(subsData as QuarterSubstitution[])

    const { data: teamPlayers } = await supabase
      .from('players').select('*').eq('team_id', matchData.team_id).order('number')
    if (teamPlayers) setAllTeamPlayers(teamPlayers as Player[])

    // attendees preferred as available pool
    const { data: att } = await supabase
      .from('match_attendees').select('player:players(*)').eq('match_id', matchId)
    const pool = att && att.length
      ? att.map((a: any) => a.player as Player).filter((p) => p && !usedIds.has(p.id))
      : (teamPlayers as Player[] || []).filter((p) => !usedIds.has(p.id))
    setAvailable(pool.sort((a, b) => (a.number || 99) - (b.number || 99)))

    setLoading(false)
  }

  const update = (fpId: string, patch: Partial<FieldPlayer>) =>
    setFieldPlayers((prev) => prev.map((fp) => (fp.id === fpId ? { ...fp, ...patch } : fp)))

  const movePlayer = (fpId: string, x: number, y: number) =>
    setFieldPlayers((prev) => prev.map((fp) => (fp.id === fpId ? { ...fp, positionX: x, positionY: y } : fp)))

  const addSelected = () => {
    const toAdd = available.filter((p) => pickerSel.has(p.id))
    const counters: Record<string, number> = { GK: 0, DF: 0, MF: 0, FW: 0 }
    const totals: Record<string, number> = { GK: 0, DF: 0, MF: 0, FW: 0 }
    toAdd.forEach((p) => { totals[p.default_position]++ })
    const news = toAdd.map((p) => {
      const i = counters[p.default_position]++
      const total = totals[p.default_position]
      let x = 50, y = 50
      if (p.default_position === 'GK') { x = 8; y = 50 }
      else if (p.default_position === 'DF') { x = 25; y = total === 1 ? 50 : 20 + i * (60 / Math.max(total - 1, 1)) }
      else if (p.default_position === 'MF') { x = 50; y = total === 1 ? 50 : 20 + i * (60 / Math.max(total - 1, 1)) }
      else { x = 75; y = total === 1 ? 50 : 30 + i * (40 / Math.max(total - 1, 1)) }
      return blankFieldPlayer(p, x, y)
    })
    setFieldPlayers([...fieldPlayers, ...news])
    setAvailable(available.filter((p) => !pickerSel.has(p.id)))
    setPickerSel(new Set())
    setShowPicker(false)
  }

  const applyFormation = (key: string) => {
    if (fieldPlayers.length === 0) { Alert.alert(t.addPlayersFirst); return }
    const f = FORMATIONS[key]
    const grouped: Record<string, FieldPlayer[]> = { GK: [], DF: [], MF: [], FW: [] }
    fieldPlayers.forEach((fp) => grouped[fp.positionType].push(fp))
    setFieldPlayers(fieldPlayers.map((fp) => {
      const g = grouped[fp.positionType]
      const idx = g.indexOf(fp)
      const slots = f[fp.positionType] || []
      if (idx < slots.length) return { ...fp, positionX: slots[idx][0], positionY: slots[idx][1] }
      if (slots.length > 0) {
        const last = slots[slots.length - 1]
        const off = (idx - slots.length + 1) * 8
        return { ...fp, positionX: Math.min(90, last[0] + off), positionY: Math.min(90, last[1] + off) }
      }
      return fp
    }))
  }

  const removeFromField = (fp: FieldPlayer) => {
    setFieldPlayers(fieldPlayers.filter((x) => x.id !== fp.id))
    setAvailable([...available, fp.player])
    setSelectedId(null)
  }

  const pickMedia = async () => {
    if (!selected) return
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, base64: true,
    })
    if (res.canceled || !res.assets[0]?.base64) return
    try {
      const path = `${matchId}/${quarter?.id}/${selected.playerId}/${Date.now()}.jpg`
      const { error } = await supabase.storage.from('player-media')
        .upload(path, decode(res.assets[0].base64), { contentType: 'image/jpeg', upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('player-media').getPublicUrl(path)
      update(selected.id, { mediaUrls: [...selected.mediaUrls, data.publicUrl] })
    } catch (e: any) { Alert.alert(t.uploadFailed, e.message) }
  }

  const addSub = async () => {
    if (!quarter || !subOut || !subIn) return
    if (subOut === subIn) { Alert.alert(t.samePlayerSubError); return }
    const { data, error } = await supabase.from('quarter_substitutions')
      .insert({ quarter_id: quarter.id, player_out_id: subOut, player_in_id: subIn, minute: parseInt(subMinute) || 0 })
      .select('*, player_out:players!player_out_id(*), player_in:players!player_in_id(*)').single()
    if (error) { Alert.alert(t.substitutionAddFailed, error.message); return }
    setSubs([...subs, data as QuarterSubstitution].sort((a, b) => a.minute - b.minute))
    // auto-add IN player to field
    const inP = allTeamPlayers.find((p) => p.id === subIn)
    const outFp = fieldPlayers.find((fp) => fp.playerId === subOut)
    if (inP && !fieldPlayers.some((fp) => fp.playerId === subIn)) {
      const np = blankFieldPlayer(inP, outFp ? Math.min(90, outFp.positionX + 3) : 50, outFp ? Math.min(90, outFp.positionY + 3) : 50)
      if (outFp) np.positionType = outFp.positionType
      setFieldPlayers((prev) => [...prev, np])
      setAvailable((prev) => prev.filter((p) => p.id !== inP.id))
    }
    setShowSub(false); setSubMinute('0'); setSubOut(''); setSubIn('')
  }

  const delSub = async (subId: string) => {
    const { error } = await supabase.from('quarter_substitutions').delete().eq('id', subId)
    if (error) { Alert.alert(t.substitutionDeleteFailed); return }
    setSubs(subs.filter((s) => s.id !== subId))
  }

  const saveAll = async () => {
    if (!quarter) return
    setSaving(true)
    try {
      await supabase.from('quarter_records').delete().eq('quarter_id', quarter.id)
      if (fieldPlayers.length > 0) {
        const records = fieldPlayers.map((fp) => ({
          quarter_id: quarter.id, player_id: fp.playerId, position_type: fp.positionType,
          position_x: fp.positionX, position_y: fp.positionY, rating: fp.rating,
          goals: fp.goals, assists: fp.assists, clean_sheet: fp.cleanSheet, contribution: fp.contribution,
          praise_text: fp.praiseText || null, improvement_text: fp.improvementText || null,
          highlight_text: fp.highlightText || null, media_urls: fp.mediaUrls.length ? fp.mediaUrls : null,
        }))
        const { error } = await supabase.from('quarter_records').insert(records)
        if (error) throw error
      }
      await loadData()
      setSelectedId(null)
      Alert.alert(t.quarterAllSaved)
    } catch (e: any) {
      Alert.alert(t.saveFailed, e.message)
    } finally { setSaving(false) }
  }

  if (loading) return <View style={[s.fill, s.center]}><ActivityIndicator color={theme.accent} /></View>

  const subInCandidates = allTeamPlayers.filter((p) => !fieldPlayers.some((fp) => fp.playerId === p.id) || subs.some((sb) => sb.player_in_id === p.id))

  return (
    <SafeAreaView style={s.fill} edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}><ArrowLeft color={theme.textMute} size={22} /></Pressable>
        <Text style={s.headerTitle}>{t.quarterN.replace('{n}', String(quarterNumber))}</Text>
        <Pressable style={[s.saveBtn, saving && { opacity: 0.5 }]} onPress={saveAll} disabled={saving}>
          {saving ? <ActivityIndicator color={theme.btnText} size="small" />
            : <Text style={s.saveBtnText}>{t.saveQuarter}</Text>}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        {/* Formation chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {Object.keys(FORMATIONS).map((k) => (
            <Pressable key={k} style={s.formChip} onPress={() => applyFormation(k)}>
              <Text style={s.formChipText}>{k}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Field */}
        <View style={s.field} onLayout={(e) => setFieldSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          <View style={s.fieldLineMid} />
          <View style={s.fieldCircle} />
          <View style={[s.fieldBox, { left: 0 }]} />
          <View style={[s.fieldBox, { right: 0 }]} />
          {fieldPlayers.map((fp) => (
            <FieldToken key={fp.id} fp={fp} fieldW={fieldSize.w} fieldH={fieldSize.h}
              selected={fp.id === selectedId} onMove={movePlayer} onSelect={() => setSelectedId(fp.id)} s={s} theme={theme} />
          ))}
          {fieldPlayers.length === 0 && (
            <View style={s.center}><Text style={{ color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>{t.addPlayersFirst}</Text></View>
          )}
        </View>

        {/* Bench / add */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={s.sectionTitle}>{t.selectPlayersToAdd} · {available.length}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={s.smallBtn} onPress={() => setShowSub(true)}>
              <ArrowRightLeft color={accentText} size={14} />
              <Text style={s.smallBtnText}>{t.substitution}</Text>
            </Pressable>
            <Pressable style={s.smallBtn} onPress={() => setShowPicker(true)}>
              <Plus color={accentText} size={14} />
              <Text style={s.smallBtnText}>{t.addPlayer}</Text>
            </Pressable>
          </View>
        </View>

        {/* Substitutions list */}
        {subs.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardLabel}>{t.substitutionRecords}</Text>
            {subs.map((sb) => (
              <View key={sb.id} style={s.subRow}>
                <Text style={s.subMin}>{sb.minute}'</Text>
                <Text style={s.subText}>
                  <Text style={{ color: theme.danger }}>▼ {sb.player_out?.name}</Text>
                  {'  '}
                  <Text style={{ color: accentText }}>▲ {sb.player_in?.name}</Text>
                </Text>
                <Pressable onPress={() => delSub(sb.id)} hitSlop={10}><Trash2 color={theme.textMute} size={16} /></Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Player editor */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelectedId(null)}>
        <View style={s.sheetBg}>
          <Pressable style={{ flex: 1 }} onPress={() => setSelectedId(null)} />
          {selected && (
            <View style={s.sheet}>
              <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={[s.token, { backgroundColor: POS_COLOR[selected.positionType], position: 'relative', width: 40, height: 40 }]}>
                    <Text style={{ color: POS_TEXT[selected.positionType], fontWeight: '900' }}>{selected.player.number ?? '-'}</Text>
                  </View>
                  <Text style={s.sheetName}>{selected.player.name}</Text>
                  <Pressable style={{ marginLeft: 'auto' }} onPress={() => removeFromField(selected)} hitSlop={10}>
                    <Trash2 color={theme.danger} size={20} />
                  </Pressable>
                </View>

                {/* Rating */}
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={s.cardLabel}>{t.rating}</Text>
                    <Text style={{ color: ratingColor(selected.rating, theme), fontWeight: '900', fontSize: 16 }}>
                      {selected.rating !== null ? selected.rating.toFixed(1) : '–'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 5 }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <Pressable key={n} style={[s.ratePill, selected.rating === n && { backgroundColor: ratingColor(n, theme) }]}
                        onPress={() => update(selected.id, { rating: selected.rating === n ? null : n })}>
                        <Text style={{ color: selected.rating === n ? '#0a0a0a' : theme.textMute, fontWeight: '800', fontSize: 12 }}>{n}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Stat steppers */}
                <Stepper label={t.goals} value={selected.goals} onChange={(v) => update(selected.id, { goals: v })} s={s} theme={theme} />
                <Stepper label={t.assistsLabel} value={selected.assists} onChange={(v) => update(selected.id, { assists: v })} s={s} theme={theme} />
                <Stepper label={t.contribution} value={selected.contribution} onChange={(v) => update(selected.id, { contribution: v })} s={s} theme={theme} />
                <View style={s.toggleRow}>
                  <Text style={s.toggleLabel}>{t.cleanSheet}</Text>
                  <Switch value={selected.cleanSheet} onValueChange={(v) => update(selected.id, { cleanSheet: v })}
                    trackColor={{ true: accentText, false: theme.inputLine }} thumbColor="#fff" />
                </View>

                {/* Notes */}
                <TextInput style={s.input} value={selected.praiseText} onChangeText={(v) => update(selected.id, { praiseText: v })}
                  placeholder={t.praisePlaceholder} placeholderTextColor={theme.textMute} />
                <TextInput style={s.input} value={selected.improvementText} onChangeText={(v) => update(selected.id, { improvementText: v })}
                  placeholder={t.improvementPlaceholder} placeholderTextColor={theme.textMute} />
                <TextInput style={s.input} value={selected.highlightText} onChangeText={(v) => update(selected.id, { highlightText: v })}
                  placeholder={t.highlightPlaceholder} placeholderTextColor={theme.textMute} />

                {/* Media */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  {selected.mediaUrls.map((url) => (
                    <View key={url}>
                      <Image source={{ uri: url }} style={s.media} />
                      <Pressable style={s.mediaX} onPress={() => update(selected.id, { mediaUrls: selected.mediaUrls.filter((u) => u !== url) })}>
                        <X color="#fff" size={12} />
                      </Pressable>
                    </View>
                  ))}
                  <Pressable style={s.mediaAdd} onPress={pickMedia}><Camera color={theme.textMute} size={20} /></Pressable>
                </View>

                <Pressable style={s.doneBtn} onPress={() => setSelectedId(null)}>
                  <Text style={s.doneBtnText}>{t.savedShort}</Text>
                </Pressable>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>

      {/* Add players picker */}
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <View style={s.sheetBg}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowPicker(false)} />
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetName}>{t.selectPlayersToAdd}</Text>
              <Pressable onPress={() => setShowPicker(false)} hitSlop={10}><X color={theme.textMute} size={22} /></Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }} style={{ maxHeight: 380 }}>
              {available.length === 0 ? <Text style={{ color: theme.textMute, textAlign: 'center', padding: 20 }}>{t.noPlayers}</Text>
                : available.map((p) => {
                  const on = pickerSel.has(p.id)
                  return (
                    <Pressable key={p.id} style={[s.pickRow, on && s.pickRowOn]} onPress={() => {
                      setPickerSel((prev) => { const n = new Set(prev); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n })
                    }}>
                      <View style={[s.posDot, { backgroundColor: POS_COLOR[p.default_position] }]}>
                        <Text style={{ color: POS_TEXT[p.default_position], fontWeight: '900', fontSize: 10 }}>{p.default_position}</Text>
                      </View>
                      <Text style={s.pickName}>{p.name} <Text style={{ color: theme.textMute }}>#{p.number ?? '–'}</Text></Text>
                      {on && <Check color={accentText} size={18} />}
                    </Pressable>
                  )
                })}
            </ScrollView>
            <Pressable style={[s.doneBtn, { margin: 16 }]} onPress={addSelected} disabled={pickerSel.size === 0}>
              <Text style={s.doneBtnText}>{t.saveNPlayers.replace('{n}', String(pickerSel.size))}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Substitution modal */}
      <Modal visible={showSub} transparent animationType="slide" onRequestClose={() => setShowSub(false)}>
        <View style={s.sheetBg}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowSub(false)} />
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetName}>{t.substitution}</Text>
              <Pressable onPress={() => setShowSub(false)} hitSlop={10}><X color={theme.textMute} size={22} /></Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} style={{ maxHeight: 420 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={s.toggleLabel}>{t.minute}</Text>
                <TextInput style={[s.input, { width: 80 }]} value={subMinute} onChangeText={setSubMinute}
                  keyboardType="number-pad" placeholderTextColor={theme.textMute} />
              </View>
              <Text style={[s.cardLabel, { color: theme.danger }]}>▼ {t.playerOut}</Text>
              <View style={{ gap: 6 }}>
                {fieldPlayers.map((fp) => (
                  <Pressable key={fp.id} style={[s.pickRow, subOut === fp.playerId && s.pickRowOn]} onPress={() => setSubOut(fp.playerId)}>
                    <Text style={s.pickName}>{fp.player.name} <Text style={{ color: theme.textMute }}>#{fp.player.number ?? '–'}</Text></Text>
                    {subOut === fp.playerId && <Check color={accentText} size={18} />}
                  </Pressable>
                ))}
              </View>
              <Text style={[s.cardLabel, { color: accentText }]}>▲ {t.playerIn}</Text>
              <View style={{ gap: 6 }}>
                {subInCandidates.map((p) => (
                  <Pressable key={p.id} style={[s.pickRow, subIn === p.id && s.pickRowOn]} onPress={() => setSubIn(p.id)}>
                    <Text style={s.pickName}>{p.name} <Text style={{ color: theme.textMute }}>#{p.number ?? '–'}</Text></Text>
                    {subIn === p.id && <Check color={accentText} size={18} />}
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <Pressable style={[s.doneBtn, { margin: 16 }]} onPress={addSub} disabled={!subOut || !subIn}>
              <Text style={s.doneBtnText}>{t.substitutionAdded}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

function FieldToken({ fp, fieldW, fieldH, selected, onMove, onSelect, s, theme }: {
  fp: FieldPlayer; fieldW: number; fieldH: number; selected: boolean
  onMove: (id: string, x: number, y: number) => void; onSelect: () => void
  s: ReturnType<typeof makeStyles>; theme: Theme
}) {
  const start = useRef({ x: fp.positionX, y: fp.positionY })
  // refs holding latest values so the once-created PanResponder never reads stale props
  const live = useRef({ x: fp.positionX, y: fp.positionY, w: fieldW, h: fieldH, id: fp.id, onMove, onSelect })
  live.current = { x: fp.positionX, y: fp.positionY, w: fieldW, h: fieldH, id: fp.id, onMove, onSelect }

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
      onPanResponderGrant: () => { start.current = { x: live.current.x, y: live.current.y } },
      onPanResponderMove: (_e, g) => {
        const { w, h, id, onMove: mv } = live.current
        const x = Math.max(5, Math.min(95, start.current.x + (g.dx / w) * 100))
        const y = Math.max(5, Math.min(95, start.current.y + (g.dy / h) * 100))
        mv(id, x, y)
      },
      onPanResponderRelease: (_e, g) => { if (Math.abs(g.dx) < 4 && Math.abs(g.dy) < 4) live.current.onSelect() },
    })
  ).current

  return (
    <View {...pan.panHandlers} style={[
      s.token,
      { backgroundColor: POS_COLOR[fp.positionType], left: `${fp.positionX}%`, top: `${fp.positionY}%`, marginLeft: -18, marginTop: -18 },
      selected && { borderWidth: 2, borderColor: '#fff' },
    ]}>
      <Text style={{ color: POS_TEXT[fp.positionType], fontWeight: '900', fontSize: 13 }}>{fp.player.number ?? '-'}</Text>
      {fp.rating !== null && (
        <View style={[s.tokenRating, { backgroundColor: ratingColor(fp.rating, theme) }]}>
          <Text style={{ color: '#0a0a0a', fontSize: 8, fontWeight: '900' }}>{fp.rating}</Text>
        </View>
      )}
    </View>
  )
}

function Stepper({ label, value, onChange, s, theme }: { label: string; value: number; onChange: (v: number) => void; s: ReturnType<typeof makeStyles>; theme: Theme }) {
  return (
    <View style={s.toggleRow}>
      <Text style={s.toggleLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Pressable style={s.stepBtn} onPress={() => onChange(Math.max(0, value - 1))} hitSlop={6}>
          <Text style={s.stepText}>−</Text>
        </Pressable>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: '900', width: 24, textAlign: 'center' }}>{value}</Text>
        <Pressable style={s.stepBtn} onPress={() => onChange(value + 1)} hitSlop={6}>
          <Text style={s.stepText}>＋</Text>
        </Pressable>
      </View>
    </View>
  )
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.nav, borderBottomWidth: 1, borderBottomColor: theme.line },
  headerTitle: { color: theme.text, fontSize: 16, fontWeight: '900' },
  saveBtn: { marginLeft: 'auto', backgroundColor: theme.btnBg, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  saveBtnText: { color: theme.btnText, fontWeight: '900', fontSize: 13 },
  formChip: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  formChipText: { color: theme.text, fontWeight: '800', fontSize: 13 },
  field: { aspectRatio: 1.5, backgroundColor: theme.pitch1, borderRadius: 16, borderWidth: 1, borderColor: theme.pitch2, overflow: 'hidden' },
  fieldLineMid: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, backgroundColor: theme.pitchLine },
  fieldCircle: { position: 'absolute', left: '50%', top: '50%', width: 80, height: 80, borderRadius: 40, borderWidth: 1, borderColor: theme.pitchLine, marginLeft: -40, marginTop: -40 },
  fieldBox: { position: 'absolute', top: '25%', bottom: '25%', width: 40, borderWidth: 1, borderColor: theme.pitchLine },
  token: { position: 'absolute', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tokenRating: { position: 'absolute', top: -4, right: -4, minWidth: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  sectionTitle: { color: theme.textMute, fontSize: 12, fontWeight: '800' },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.chip, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 },
  smallBtnText: { color: theme.isDark ? theme.accent : theme.text, fontWeight: '800', fontSize: 12 },
  card: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line, borderRadius: 16, padding: 16 },
  cardLabel: { color: theme.textMute, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  subMin: { color: theme.text, fontWeight: '900', width: 32 },
  subText: { flex: 1, fontSize: 13, fontWeight: '700', color: theme.text },
  sheetBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: theme.line, maxHeight: '88%' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.line },
  sheetName: { color: theme.text, fontSize: 17, fontWeight: '900' },
  ratePill: { flex: 1, backgroundColor: theme.card2, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { color: theme.text2, fontSize: 14, fontWeight: '700' },
  stepBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: theme.card2, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: theme.isDark ? theme.accent : theme.text, fontSize: 20, fontWeight: '900', marginTop: -2 },
  input: { backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.inputLine, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: theme.text, fontSize: 14 },
  media: { width: 64, height: 64, borderRadius: 10 },
  mediaX: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  mediaAdd: { width: 64, height: 64, borderRadius: 10, borderWidth: 1, borderColor: theme.line, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  doneBtn: { backgroundColor: theme.btnBg, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  doneBtnText: { color: theme.btnText, fontWeight: '900', fontSize: 15 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.card2, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'transparent' },
  pickRowOn: { borderColor: theme.isDark ? theme.accent : theme.line2, backgroundColor: theme.chip },
  pickName: { color: theme.text, fontWeight: '700', flex: 1 },
  posDot: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
})
