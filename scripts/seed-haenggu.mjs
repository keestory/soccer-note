// One-off local seeder for the FC 행구 roster + member photos.
//
// Usage (run from repo root after unzipping the photo bundle here so that
// ./haenggu-jpg/ contains <name>.jpg files and haenggu-roster.json):
//
//   NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co" \
//   SUPABASE_SERVICE_ROLE_KEY="eyJ..." \
//   node scripts/seed-haenggu.mjs
//
// Idempotent: upserts players by (team, name) and only sets photo_url.
// Requires migrations 023 + 024 to have been applied first.

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const supabase = createClient(url, key)

const PHOTO_DIR = 'haenggu-jpg'
const roster = JSON.parse(readFileSync(join(PHOTO_DIR, 'haenggu-roster.json'), 'utf8'))

const { data: team, error: teamErr } = await supabase
  .from('teams').select('id, name').ilike('name', '%행구%')
  .order('created_at').limit(1).single()
if (teamErr || !team) { console.error('FC 행구 team not found:', teamErr?.message); process.exit(1) }
console.log('Team:', team.name, team.id)

const photos = Object.fromEntries(
  readdirSync(PHOTO_DIR).filter(f => f.endsWith('.jpg'))
    .map(f => [f.replace(/\.jpg$/, ''), join(PHOTO_DIR, f)])
)

for (const m of roster) {
  // Ensure the player row exists
  let { data: player } = await supabase
    .from('players').select('id').eq('team_id', team.id).eq('name', m.name).maybeSingle()

  if (!player) {
    const { data: inserted, error } = await supabase.from('players').insert({
      team_id: team.id, name: m.name, number: m.number,
      default_position: m.default_position,
      preferred_positions: m.preferred_positions, preferred_numbers: m.preferred_numbers,
    }).select('id').single()
    if (error) { console.error(`  insert ${m.name} failed:`, error.message); continue }
    player = inserted
    console.log(`+ inserted ${m.name}`)
  }

  // Upload photo if present
  const file = photos[m.name]
  if (!file) { console.log(`  ${m.name}: no photo`); continue }
  const buf = readFileSync(file)
  const path = `players/${player.id}.jpg`
  const { error: upErr } = await supabase.storage.from('player-media')
    .upload(path, buf, { contentType: 'image/jpeg', upsert: true })
  if (upErr) { console.error(`  ${m.name} upload failed:`, upErr.message); continue }
  const { data: pub } = supabase.storage.from('player-media').getPublicUrl(path)
  const { error: updErr } = await supabase.from('players')
    .update({ photo_url: pub.publicUrl }).eq('id', player.id)
  if (updErr) { console.error(`  ${m.name} update failed:`, updErr.message); continue }
  console.log(`✓ ${m.name}`)
}
console.log('Done.')
