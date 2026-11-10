import type { Locale } from './i18n/types'

const english = {
  pending: 'Saving the submitted note. New edits need another save. Closing does not undo the sent save.',
  dirty: 'These edits are not saved yet.',
  failed: 'Saving could not be confirmed. Keep your edits and retry, or reopen the match to check what was saved.',
}

const copy: Record<Locale, typeof english> = {
  en_US: english,
  en_GB: english,
  ko: {
    pending: '보낸 메모를 저장 중이에요. 새 입력은 다시 저장해야 해요. 닫아도 보낸 저장은 취소되지 않아요.',
    dirty: '아직 저장하지 않은 입력이 있어요.',
    failed: '저장 완료를 확인하지 못했어요. 입력을 유지한 채 다시 저장하거나, 경기를 다시 열어 저장된 내용을 확인하세요.',
  },
  ja: {
    pending: '送信したメモを保存中です。新しい編集は再度保存してください。閉じても送信済みの保存は取り消せません。',
    dirty: 'まだ保存されていない編集があります。',
    failed: '保存を確認できませんでした。入力を残して再試行するか、試合を開き直して保存内容を確認してください。',
  },
  fr: {
    pending: 'Enregistrement de la note envoyée. Les nouvelles modifications doivent être enregistrées séparément. Fermer n’annule pas l’envoi.',
    dirty: 'Ces modifications ne sont pas encore enregistrées.',
    failed: 'Enregistrement non confirmé. Gardez vos saisies et réessayez, ou rouvrez le match pour vérifier le contenu enregistré.',
  },
  de: {
    pending: 'Die gesendete Notiz wird gespeichert. Neue Änderungen müssen erneut gespeichert werden. Schließen macht das Senden nicht rückgängig.',
    dirty: 'Diese Änderungen sind noch nicht gespeichert.',
    failed: 'Speichern nicht bestätigt. Eingaben behalten und erneut speichern oder das Spiel erneut öffnen, um den gespeicherten Inhalt zu prüfen.',
  },
  it: {
    pending: 'Salvataggio della nota inviata. Le nuove modifiche richiedono un altro salvataggio. Chiudere non annulla l’invio.',
    dirty: 'Queste modifiche non sono ancora salvate.',
    failed: 'Salvataggio non confermato. Mantieni le modifiche e riprova, oppure riapri la partita per controllare il contenuto salvato.',
  },
  es: {
    pending: 'Guardando la nota enviada. Los cambios nuevos necesitan otro guardado. Cerrar no cancela el envío.',
    dirty: 'Estos cambios aún no se han guardado.',
    failed: 'No se pudo confirmar el guardado. Conserva los cambios y vuelve a intentarlo, o abre de nuevo el partido para comprobar lo guardado.',
  },
}

export function getMatchNoteCopy(locale: Locale) {
  return copy[locale]
}
