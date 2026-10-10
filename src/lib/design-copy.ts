import type { Locale } from './i18n/types'
const copy = {
  ko: { move: '선수를 선택한 뒤 원하는 위치를 탭하세요. 방향키로도 이동할 수 있어요.', moveTarget: '선택한 선수를 이 위치로 이동', record: '선수 기록', number: '등번호', position: '포지션', undo: '되돌리기' },
  en_US: { move: 'Select a player, then tap a position. Arrow keys also move players.', moveTarget: 'Move selected player here', record: 'Player record', number: 'Number', position: 'Position', undo: 'Undo' },
  en_GB: { move: 'Select a player, then tap a position. Arrow keys also move players.', moveTarget: 'Move selected player here', record: 'Player record', number: 'Number', position: 'Position', undo: 'Undo' },
  ja: { move: '選手を選び、配置したい場所をタップ。矢印キーでも移動できます。', moveTarget: '選択した選手をここに移動', record: '選手の記録', number: '背番号', position: 'ポジション', undo: '元に戻す' },
  fr: { move: 'Sélectionnez un joueur, puis une position. Les flèches le déplacent aussi.', moveTarget: 'Déplacer le joueur ici', record: 'Fiche du joueur', number: 'Numéro', position: 'Poste', undo: 'Annuler' },
  de: { move: 'Spieler wählen, dann Position antippen. Auch mit Pfeiltasten verschieben.', moveTarget: 'Spieler hierhin bewegen', record: 'Spielerstatistik', number: 'Nummer', position: 'Position', undo: 'Rückgängig' },
  it: { move: 'Seleziona un giocatore, poi tocca una posizione. Puoi usare anche le frecce.', moveTarget: 'Sposta qui il giocatore', record: 'Dati giocatore', number: 'Numero', position: 'Posizione', undo: 'Annulla' },
  es: { move: 'Selecciona un jugador y toca una posición. También puedes usar las flechas.', moveTarget: 'Mover jugador aquí', record: 'Datos del jugador', number: 'Número', position: 'Posición', undo: 'Deshacer' },
}
export function getDesignCopy(locale: Locale) { return copy[locale] ?? copy.en_US }
