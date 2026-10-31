'use client'

import { Camera } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { getPlayerCardCopy } from '@/lib/player-card-copy'

export function PlayerPhotoField({ url, uploading, onUpload, onRemove }: { url: string | null; uploading: boolean; onUpload: (file: File) => void; onRemove: () => void }) {
  const { locale, t } = useI18n()
  const copy = getPlayerCardCopy(locale)
  return <div className="mb-5 flex flex-wrap items-center gap-3">
    <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[color:var(--line)] bg-[color:var(--card2)]">
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <Camera aria-hidden size={24} className="text-[color:var(--text3)]" />}
    </span>
    <label className="sn-button relative cursor-pointer overflow-hidden focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-[color:var(--brand)]">
      {uploading ? t.loading : copy.photo}
      <input type="file" accept="image/*" aria-label={copy.photo} disabled={uploading} className="absolute inset-0 cursor-pointer opacity-0" onChange={event => { const file = event.target.files?.[0]; if (file) onUpload(file); event.target.value = '' }} />
    </label>
    {url && <button type="button" className="sn-button !px-3 text-xs" onClick={onRemove} disabled={uploading}>{copy.removePhoto}</button>}
  </div>
}
