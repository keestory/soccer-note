import type { Locale } from './i18n/types'

const english = {
  saveAll: 'Save all', retry: 'Retry save', ready: 'All changes are saved.',
  dirty: 'Unsaved changes. Save all before leaving.', saving: 'Saving all changes…',
  failed: 'Saving could not be confirmed. Some changes may already be saved. Your edits remain on this screen. Retry this save before editing. If it still cannot be confirmed, return to the match and reopen to review the saved records.',
  waiting: 'Wait for the current operation before saving or leaving.',
  leaveTitle: 'Leave without saving?', leaveDescription: 'Unsaved edits will be lost when you leave this screen. Changes already sent to the server are not undone.',
  leave: 'Leave this screen', stay: 'Stay here', back: 'Back to match',
}
const copy: Record<Locale, typeof english> = {
  en_US: english, en_GB: english,
  ko: {
    saveAll: '전체 저장', retry: '저장 재시도', ready: '변경 사항이 모두 저장됐어요.',
    dirty: '저장하지 않은 변경 사항이 있어요. 나가기 전에 전체 저장하세요.', saving: '변경 사항을 모두 저장하고 있어요…',
    failed: '저장 완료를 확인하지 못했어요. 일부 변경은 저장됐을 수 있어요. 입력은 이 화면에 남아 있어요. 다시 수정하기 전에 이 저장을 재시도하세요. 계속 확인되지 않으면 경기로 돌아갔다가 다시 열어 저장된 기록을 확인하세요.',
    waiting: '진행 중인 작업이 끝난 뒤 저장하거나 나갈 수 있어요.',
    leaveTitle: '저장하지 않고 나갈까요?', leaveDescription: '이 화면을 나가면 저장하지 않은 입력이 사라져요. 이미 서버에 전송한 변경은 취소되지 않아요.',
    leave: '이 화면 나가기', stay: '이 화면에 머무르기', back: '경기로 돌아가기',
  },
  ja: {
    saveAll: 'すべて保存', retry: '保存を再試行', ready: '変更はすべて保存されています。',
    dirty: '未保存の変更があります。移動する前にすべて保存してください。', saving: 'すべての変更を保存中…',
    failed: '保存の完了を確認できませんでした。一部は保存済みの可能性があります。入力はこの画面に残っています。編集する前にこの保存を再試行してください。確認できない場合は試合に戻り、再度開いて保存済みの記録を確認してください。',
    waiting: '処理が完了するまで、保存や移動をお待ちください。',
    leaveTitle: '保存せずに移動しますか？', leaveDescription: 'この画面を離れると未保存の入力は失われます。送信済みの変更は取り消されません。',
    leave: 'この画面を離れる', stay: 'この画面に留まる', back: '試合に戻る',
  },
  fr: {
    saveAll: 'Tout enregistrer', retry: 'Réessayer', ready: 'Toutes les modifications sont enregistrées.',
    dirty: 'Modifications non enregistrées. Enregistrez tout avant de quitter.', saving: 'Enregistrement en cours…',
    failed: 'Enregistrement non confirmé. Certaines modifications peuvent être enregistrées. Vos saisies restent ici. Réessayez avant de modifier. Si cela reste non confirmé, revenez au match et rouvrez cet écran pour vérifier les données enregistrées.',
    waiting: 'Attendez la fin de l’opération avant d’enregistrer ou de quitter.',
    leaveTitle: 'Quitter sans enregistrer ?', leaveDescription: 'Les saisies non enregistrées seront perdues. Les modifications déjà envoyées au serveur ne seront pas annulées.',
    leave: 'Quitter cet écran', stay: 'Rester ici', back: 'Retour au match',
  },
  de: {
    saveAll: 'Alles speichern', retry: 'Erneut speichern', ready: 'Alle Änderungen sind gespeichert.',
    dirty: 'Ungespeicherte Änderungen. Vor dem Verlassen alles speichern.', saving: 'Alle Änderungen werden gespeichert…',
    failed: 'Speichern nicht bestätigt. Einige Änderungen können bereits gespeichert sein. Die Eingaben bleiben hier. Vor weiteren Änderungen erneut speichern. Bleibt die Bestätigung aus, zum Spiel zurückkehren und die gespeicherten Daten erneut öffnen.',
    waiting: 'Vor dem Speichern oder Verlassen das Ende des Vorgangs abwarten.',
    leaveTitle: 'Ohne Speichern verlassen?', leaveDescription: 'Ungespeicherte Eingaben gehen verloren. Bereits gesendete Änderungen werden nicht rückgängig gemacht.',
    leave: 'Diese Seite verlassen', stay: 'Hier bleiben', back: 'Zurück zum Spiel',
  },
  it: {
    saveAll: 'Salva tutto', retry: 'Riprova a salvare', ready: 'Tutte le modifiche sono salvate.',
    dirty: 'Modifiche non salvate. Salva tutto prima di uscire.', saving: 'Salvataggio di tutte le modifiche…',
    failed: 'Salvataggio non confermato. Alcune modifiche potrebbero essere salvate. I dati rimangono qui. Riprova prima di modificare. Se manca ancora la conferma, torna alla partita e riapri per controllare i dati salvati.',
    waiting: 'Attendi la fine dell’operazione prima di salvare o uscire.',
    leaveTitle: 'Uscire senza salvare?', leaveDescription: 'I dati non salvati andranno persi. Le modifiche già inviate al server non verranno annullate.',
    leave: 'Esci dalla schermata', stay: 'Resta qui', back: 'Torna alla partita',
  },
  es: {
    saveAll: 'Guardar todo', retry: 'Reintentar', ready: 'Todos los cambios están guardados.',
    dirty: 'Cambios sin guardar. Guarda todo antes de salir.', saving: 'Guardando todos los cambios…',
    failed: 'No se pudo confirmar el guardado. Algunos cambios pueden estar guardados. Los datos siguen aquí. Reintenta antes de editar. Si sigue sin confirmarse, vuelve al partido y abre de nuevo para revisar los datos guardados.',
    waiting: 'Espera a que termine la operación antes de guardar o salir.',
    leaveTitle: '¿Salir sin guardar?', leaveDescription: 'Se perderán los datos sin guardar. Los cambios ya enviados al servidor no se desharán.',
    leave: 'Salir de esta pantalla', stay: 'Permanecer aquí', back: 'Volver al partido',
  },
}
export function getQuarterSaveCopy(locale: Locale) { return copy[locale] ?? english }
