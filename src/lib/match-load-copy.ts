import type { Locale } from './i18n/types'

const en = { failed: 'Could not load match records. Try again.', cached: 'Showing previously loaded records. The latest records have not been confirmed.' }
const copy: Record<Locale, typeof en> = {
  en_US: en, en_GB: en,
  ko: { failed: '경기 기록을 불러오지 못했어요. 다시 시도하세요.', cached: '이전에 불러온 기록을 표시하고 있어요. 최신 기록은 확인하지 못했어요.' },
  ja: { failed: '試合記録を読み込めませんでした。もう一度お試しください。', cached: '以前読み込んだ記録を表示しています。最新の記録は確認できていません。' },
  fr: { failed: 'Impossible de charger les matchs. Réessayez.', cached: 'Les données précédemment chargées sont affichées. Les dernières données ne sont pas confirmées.' },
  de: { failed: 'Die Spielaufzeichnungen konnten nicht geladen werden. Bitte versuche es erneut.', cached: 'Zuvor geladene Aufzeichnungen werden angezeigt. Die neuesten Daten sind nicht bestätigt.' },
  it: { failed: 'Impossibile caricare le partite. Riprova.', cached: 'Sono mostrati i dati caricati in precedenza. I dati più recenti non sono confermati.' },
  es: { failed: 'No se pudieron cargar los partidos. Inténtalo de nuevo.', cached: 'Se muestran los datos cargados anteriormente. Los datos más recientes no están confirmados.' },
}

export function getMatchLoadCopy(locale: Locale) { return copy[locale] ?? en }
