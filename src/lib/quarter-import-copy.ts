const en = {
  open: 'Choose players from the previous quarter', title: 'Choose recorded players',
  description: 'These are recorded players, not the final lineup. Select players and positions only. Review the pitch, then use Save all. Goals, ratings, notes and substitutions are not copied.',
  source: 'Quarter {n} records', apply: 'Apply {n} to draft', selected: '{n} selected',
  emptyOnly: 'Available when this quarter has no saved records or draft players.', noSource: 'The previous quarter has no player records.',
  duplicate: 'Multiple records for this player.', conflicting: 'Conflicting recorded positions.', unavailable: 'Not in the current eligible player list.',
  invalidPosition: 'Invalid position or coordinates.', edge: 'Outside the editable pitch area.', scope: 'Record does not belong to the source quarter.',
  collision: 'Selected players share this exact position. Deselect one.',
  readFailed: 'Could not check this quarter. Nothing was applied. Try again.', targetChanged: 'This quarter changed. Nothing was applied. Close and review it first.',
  applied: 'Players added to the draft only. Review the pitch and use Save all to save.',
  checking: 'Checking this quarter…', unknownPlayer: 'Unavailable player', noEvents: 'No substitution event in the loaded records.',
}
type ImportCopy = typeof en
const ko: ImportCopy = {
  open: '이전 쿼터 기록에서 선수 가져오기', title: '기록된 선수 선택',
  description: '최종 라인업이 아닌 기록된 선수입니다. 선수와 위치만 선택해 가져옵니다. 피치에서 검토한 뒤 전체 저장을 눌러 주세요. 골·평점·메모·교체 기록은 복사하지 않습니다.',
  source: '{n}쿼터 기록', apply: '{n}명 초안에 적용', selected: '{n}명 선택',
  emptyOnly: '저장 기록과 초안 선수가 모두 없는 쿼터에서 사용할 수 있습니다.', noSource: '이전 쿼터에 선수 기록이 없습니다.',
  duplicate: '같은 선수의 기록이 여러 개입니다.', conflicting: '기록된 위치가 서로 다릅니다.', unavailable: '현재 선택 가능한 선수 명단에 없습니다.',
  invalidPosition: '포지션 또는 좌표가 올바르지 않습니다.', edge: '편집 가능한 피치 영역 밖의 위치입니다.', scope: '이전 쿼터에 속하지 않는 기록입니다.',
  collision: '선택한 선수들의 위치가 같습니다. 한 명의 선택을 해제해 주세요.',
  readFailed: '쿼터를 확인하지 못해 적용하지 않았습니다. 다시 시도해 주세요.', targetChanged: '쿼터 상태가 바뀌어 적용하지 않았습니다. 닫고 현재 기록을 확인해 주세요.',
  applied: '초안에만 선수를 추가했습니다. 피치에서 검토한 뒤 전체 저장을 눌러 주세요.',
  checking: '쿼터 확인 중…', unknownPlayer: '현재 사용할 수 없는 선수', noEvents: '불러온 기록에 교체 이벤트가 없습니다.',
}
const ja: ImportCopy = {
  open: '前のクォーターの記録から選手を選ぶ', title: '記録された選手を選択',
  description: '最終ラインアップではなく、記録された選手です。選手と位置のみを取り込みます。ピッチで確認後、すべて保存してください。得点・評価・メモ・交代はコピーしません。',
  source: '第{n}クォーターの記録', apply: '{n}人を下書きに適用', selected: '{n}人選択',
  emptyOnly: '保存記録と下書きの選手がない場合に利用できます。', noSource: '前のクォーターに選手の記録がありません。',
  duplicate: '同じ選手の記録が複数あります。', conflicting: '記録された位置が一致しません。', unavailable: '現在選択できる選手ではありません。',
  invalidPosition: 'ポジションまたは座標が無効です。', edge: '編集できるピッチの範囲外です。', scope: '元のクォーターに属さない記録です。',
  collision: '選択した選手の位置が同じです。1人の選択を解除してください。',
  readFailed: '確認できなかったため適用していません。再試行してください。', targetChanged: 'クォーターが変更されました。適用せず、閉じて確認してください。',
  applied: '下書きに追加しました。ピッチで確認し、すべて保存してください。', checking: '確認中…', unknownPlayer: '利用できない選手', noEvents: '読み込んだ記録に交代イベントはありません。',
}
const fr: ImportCopy = {
  open: 'Choisir des joueurs du quart précédent', title: 'Choisir les joueurs enregistrés',
  description: 'Il s’agit des joueurs enregistrés, pas de la composition finale. Seuls les joueurs et positions sont repris. Vérifiez le terrain puis enregistrez tout. Buts, notes, commentaires et remplacements ne sont pas copiés.',
  source: 'Enregistrements du quart {n}', apply: 'Appliquer {n} au brouillon', selected: '{n} sélectionnés',
  emptyOnly: 'Disponible si ce quart ne contient aucun joueur enregistré ou en brouillon.', noSource: 'Aucun joueur enregistré au quart précédent.',
  duplicate: 'Plusieurs enregistrements pour ce joueur.', conflicting: 'Positions enregistrées contradictoires.', unavailable: 'Absent de la liste actuelle des joueurs admissibles.',
  invalidPosition: 'Position ou coordonnées invalides.', edge: 'Hors de la zone modifiable du terrain.', scope: 'Cet enregistrement ne provient pas du quart source.',
  collision: 'Des joueurs sélectionnés ont la même position. Désélectionnez-en un.',
  readFailed: 'Vérification impossible. Rien n’a été appliqué. Réessayez.', targetChanged: 'Ce quart a changé. Rien n’a été appliqué. Fermez et vérifiez.',
  applied: 'Joueurs ajoutés au brouillon uniquement. Vérifiez le terrain puis enregistrez tout.', checking: 'Vérification du quart…', unknownPlayer: 'Joueur indisponible', noEvents: 'Aucun remplacement dans les enregistrements chargés.',
}
const de: ImportCopy = {
  open: 'Spieler aus dem vorherigen Viertel wählen', title: 'Erfasste Spieler auswählen',
  description: 'Dies sind erfasste Spieler, nicht die endgültige Aufstellung. Nur Spieler und Positionen werden übernommen. Prüfe das Feld und speichere alles. Tore, Bewertungen, Notizen und Wechsel werden nicht kopiert.',
  source: 'Aufzeichnungen aus Viertel {n}', apply: '{n} zum Entwurf hinzufügen', selected: '{n} ausgewählt',
  emptyOnly: 'Nur verfügbar, wenn das Viertel keine gespeicherten oder entworfenen Spieler enthält.', noSource: 'Keine Spieler im vorherigen Viertel erfasst.',
  duplicate: 'Mehrere Einträge für diesen Spieler.', conflicting: 'Widersprüchliche erfasste Positionen.', unavailable: 'Nicht in der aktuell verfügbaren Spielerliste.',
  invalidPosition: 'Ungültige Position oder Koordinaten.', edge: 'Außerhalb des bearbeitbaren Spielfelds.', scope: 'Eintrag gehört nicht zum Quellviertel.',
  collision: 'Ausgewählte Spieler haben dieselbe Position. Wähle einen ab.',
  readFailed: 'Prüfung fehlgeschlagen. Nichts übernommen. Versuche es erneut.', targetChanged: 'Dieses Viertel hat sich geändert. Nichts übernommen. Schließe und prüfe es.',
  applied: 'Spieler nur zum Entwurf hinzugefügt. Prüfe das Feld und speichere alles.', checking: 'Viertel wird geprüft…', unknownPlayer: 'Nicht verfügbarer Spieler', noEvents: 'Keine Wechsel in den geladenen Aufzeichnungen.',
}
const it: ImportCopy = {
  open: 'Scegli giocatori dal quarto precedente', title: 'Scegli i giocatori registrati',
  description: 'Sono i giocatori registrati, non la formazione finale. Si importano solo giocatori e posizioni. Controlla il campo e salva tutto. Gol, valutazioni, note e sostituzioni non vengono copiati.',
  source: 'Registrazioni del quarto {n}', apply: 'Applica {n} alla bozza', selected: '{n} selezionati',
  emptyOnly: 'Disponibile se il quarto non contiene giocatori salvati o in bozza.', noSource: 'Nessun giocatore registrato nel quarto precedente.',
  duplicate: 'Più registrazioni per questo giocatore.', conflicting: 'Posizioni registrate in conflitto.', unavailable: 'Non presente nell’elenco attuale dei giocatori disponibili.',
  invalidPosition: 'Posizione o coordinate non valide.', edge: 'Fuori dall’area modificabile del campo.', scope: 'La registrazione non appartiene al quarto di origine.',
  collision: 'I giocatori selezionati hanno la stessa posizione. Deselezionane uno.',
  readFailed: 'Verifica non riuscita. Nulla applicato. Riprova.', targetChanged: 'Il quarto è cambiato. Nulla applicato. Chiudi e controlla.',
  applied: 'Giocatori aggiunti solo alla bozza. Controlla il campo e salva tutto.', checking: 'Verifica del quarto…', unknownPlayer: 'Giocatore non disponibile', noEvents: 'Nessuna sostituzione nelle registrazioni caricate.',
}
const es: ImportCopy = {
  open: 'Elegir jugadores del cuarto anterior', title: 'Elegir jugadores registrados',
  description: 'Son los jugadores registrados, no la alineación final. Solo se importan jugadores y posiciones. Revisa el campo y guarda todo. No se copian goles, valoraciones, notas ni sustituciones.',
  source: 'Registros del cuarto {n}', apply: 'Aplicar {n} al borrador', selected: '{n} seleccionados',
  emptyOnly: 'Disponible cuando no hay jugadores guardados ni en borrador en este cuarto.', noSource: 'No hay jugadores registrados en el cuarto anterior.',
  duplicate: 'Varios registros para este jugador.', conflicting: 'Posiciones registradas contradictorias.', unavailable: 'No está en la lista actual de jugadores disponibles.',
  invalidPosition: 'Posición o coordenadas no válidas.', edge: 'Fuera del área editable del campo.', scope: 'El registro no pertenece al cuarto de origen.',
  collision: 'Los jugadores seleccionados tienen la misma posición. Deselecciona uno.',
  readFailed: 'No se pudo verificar. No se aplicó nada. Inténtalo de nuevo.', targetChanged: 'Este cuarto cambió. No se aplicó nada. Cierra y revísalo.',
  applied: 'Jugadores añadidos solo al borrador. Revisa el campo y guarda todo.', checking: 'Comprobando el cuarto…', unknownPlayer: 'Jugador no disponible', noEvents: 'No hay sustituciones en los registros cargados.',
}
const copies: Record<string, ImportCopy> = { ko, en, 'en-US': en, 'en-GB': en, en_US: en, en_GB: en, ja, fr, de, it, es }
export function getQuarterImportCopy(locale: string): ImportCopy { return copies[locale] ?? en }
