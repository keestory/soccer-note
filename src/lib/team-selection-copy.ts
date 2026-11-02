import type { Locale } from './i18n/types'

const en = { current: 'Current team', loading: 'Loading {team}…', failed: 'Could not load {team}. Your current team is unchanged.', retry: 'Retry', cancel: 'Cancel switch', saving: 'Saving… Keep this screen open until saving finishes.' }
const copy: Record<Locale, typeof en> = {
  en_US: en, en_GB: en,
  ko: { current: '현재 팀', loading: '{team} 불러오는 중…', failed: '{team}을 불러오지 못했어요. 현재 팀은 그대로 유지돼요.', retry: '다시 시도', cancel: '전환 취소', saving: '저장 중이에요… 완료될 때까지 이 화면을 유지하세요.' },
  ja: { current: '現在のチーム', loading: '{team}を読み込み中…', failed: '{team}を読み込めませんでした。現在のチームは変更されていません。', retry: '再試行', cancel: '切り替えをキャンセル', saving: '保存中… 完了するまでこの画面を開いておいてください。' },
  fr: { current: 'Équipe actuelle', loading: 'Chargement de {team}…', failed: 'Impossible de charger {team}. Votre équipe actuelle reste inchangée.', retry: 'Réessayer', cancel: 'Annuler le changement', saving: 'Enregistrement… Gardez cet écran ouvert jusqu’à la fin.' },
  de: { current: 'Aktuelles Team', loading: '{team} wird geladen…', failed: '{team} konnte nicht geladen werden. Dein aktuelles Team bleibt unverändert.', retry: 'Erneut versuchen', cancel: 'Wechsel abbrechen', saving: 'Speichern… Lass diese Seite bis zum Abschluss geöffnet.' },
  it: { current: 'Squadra attuale', loading: 'Caricamento di {team}…', failed: 'Impossibile caricare {team}. La squadra attuale non è cambiata.', retry: 'Riprova', cancel: 'Annulla cambio', saving: 'Salvataggio… Tieni aperta questa schermata fino al completamento.' },
  es: { current: 'Equipo actual', loading: 'Cargando {team}…', failed: 'No se pudo cargar {team}. Tu equipo actual no ha cambiado.', retry: 'Reintentar', cancel: 'Cancelar cambio', saving: 'Guardando… Mantén esta pantalla abierta hasta que termine.' },
}
export function getTeamSelectionCopy(locale: Locale) { return copy[locale] ?? en }

export function getAppLoadErrorCopy(locale: Locale) {
  const errors: Record<Locale, string> = {
    en_US: 'Could not load your teams. Try again.', en_GB: 'Could not load your teams. Try again.',
    ko: '팀 목록을 불러오지 못했어요. 다시 시도하세요.', ja: 'チーム一覧を読み込めませんでした。もう一度お試しください。',
    fr: 'Impossible de charger vos équipes. Réessayez.', de: 'Deine Teams konnten nicht geladen werden. Bitte versuche es erneut.',
    it: 'Impossibile caricare le squadre. Riprova.', es: 'No se pudieron cargar tus equipos. Inténtalo de nuevo.',
  }
  return errors[locale]
}

export function getMemberLinkErrorCopy(locale: Locale) {
  const errors: Record<Locale, string> = {
    en_US: 'The player was saved, but the member link was not confirmed. Retry to link the saved player.',
    en_GB: 'The player was saved, but the member link was not confirmed. Retry to link the saved player.',
    ko: '선수는 저장됐지만 회원 연결을 확인하지 못했어요. 다시 시도하면 저장된 선수를 연결해요.',
    ja: '選手は保存されましたが、メンバーとの連携を確認できませんでした。再試行すると保存済みの選手を連携します。',
    fr: 'Le joueur est enregistré, mais le lien au membre n’est pas confirmé. Réessayez pour lier le joueur enregistré.',
    de: 'Der Spieler wurde gespeichert, aber die Mitgliedsverknüpfung ist nicht bestätigt. Erneut versuchen, um den gespeicherten Spieler zu verknüpfen.',
    it: 'Il giocatore è salvato, ma il collegamento al membro non è confermato. Riprova per collegare il giocatore salvato.',
    es: 'El jugador se guardó, pero no se confirmó el vínculo con el miembro. Reintenta para vincular al jugador guardado.',
  }
  return errors[locale]
}
