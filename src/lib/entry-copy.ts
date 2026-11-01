import type { Locale } from './i18n/types'

interface EntryCopy {
  skip: string; intro: string; next: string; previous: string; createAccount: string
  titles: [string, string, string]; descriptions: [string, string, string]
  example: string; player: string; ourTeam: string; opponent: string; matchResult: string
  loginTitle: string; loginDescription: string; signupTitle: string; signupDescription: string
  teamTitle: string; teamDescription: string; createTeamDescription: string; joinTeamDescription: string
  showPassword: string; hidePassword: string; progress: string
}

const english: EntryCopy = {
  skip: 'Skip', intro: 'Explore the app', next: 'Next', previous: 'Back', createAccount: 'Create an account',
  titles: ['Your team.\nYour football story.', 'Every match.\nEvery player.', 'Start with\nyour team.'],
  descriptions: ['Keep the moments on the pitch, one player card at a time.', 'Match results and five player records, together in one place.', 'Create a team or join with an invite code after signing up.'],
  example: 'Fictional example', player: 'Sample player', ourTeam: 'Our team', opponent: 'Away team', matchResult: 'Match result',
  loginTitle: 'Back to\nyour team.', loginDescription: 'Sign in to continue your football story.',
  signupTitle: 'Your next match\nstarts here.', signupDescription: 'Create an account, then choose your team.',
  teamTitle: 'Find your team.', teamDescription: 'Create a new team or join one you’ve been invited to.', createTeamDescription: 'Start recording with a team of your own.', joinTeamDescription: 'Enter the invite code shared by your team.',
  showPassword: 'Show password', hidePassword: 'Hide password', progress: 'Step {n} of 3',
}

const copy: Record<Locale, EntryCopy> = {
  ko: {
    skip: '건너뛰기', intro: '앱 소개 보기', next: '다음', previous: '이전', createAccount: '계정 만들기',
    titles: ['우리 팀의 축구를\n기록하세요', '경기부터 선수까지,\n기록이 한눈에', '우리 팀과\n시작하세요'],
    descriptions: ['함께 뛴 순간을 모아, 우리 선수만의 카드로.', '경기 결과와 선수의 다섯 가지 기록을 한곳에서 확인해요.', '계정을 만들고, 새 팀을 만들거나 초대 코드로 참여해요.'],
    example: '가상의 예시 기록', player: '예시 선수', ourTeam: '우리 팀', opponent: '상대 팀', matchResult: '경기 결과',
    loginTitle: '다시,\n우리 팀으로', loginDescription: '로그인하고 우리 팀의 기록을 이어가세요.',
    signupTitle: '우리의 다음 경기는\n여기서 시작', signupDescription: '계정을 만든 뒤 함께할 팀을 선택하세요.',
    teamTitle: '함께할 팀을 선택하세요', teamDescription: '새 팀을 만들거나, 초대받은 팀에 참여할 수 있어요.', createTeamDescription: '우리 팀을 만들고 첫 기록을 시작해요.', joinTeamDescription: '팀에서 받은 초대 코드를 입력해요.',
    showPassword: '비밀번호 보기', hidePassword: '비밀번호 숨기기', progress: '3단계 중 {n}단계',
  },
  en_US: english,
  en_GB: english,
  ja: {
    skip: 'スキップ', intro: 'アプリ紹介', next: '次へ', previous: '戻る', createAccount: 'アカウントを作成',
    titles: ['チームのサッカーを\n記録しよう', '試合も選手も、\n記録をひと目で', 'チームと一緒に\n始めよう'],
    descriptions: ['ピッチでの瞬間を、選手カードに残そう。', '試合結果と選手の5つの記録を、ひとつの場所で。', '登録後にチームを作るか、招待コードで参加できます。'],
    example: '架空のサンプル記録', player: 'サンプル選手', ourTeam: '自分のチーム', opponent: '相手チーム', matchResult: '試合結果',
    loginTitle: 'また、\nチームのもとへ', loginDescription: 'ログインしてチームの記録を続けよう。', signupTitle: '次の試合は\nここから始まる', signupDescription: 'アカウントを作成してチームを選ぼう。',
    teamTitle: 'チームを選ぼう', teamDescription: 'チームを作るか、招待されたチームに参加できます。', createTeamDescription: '自分のチームで記録を始めよう。', joinTeamDescription: 'チームから届いた招待コードを入力。', showPassword: 'パスワードを表示', hidePassword: 'パスワードを隠す', progress: '全3ステップの{n}',
  },
  fr: {
    skip: 'Passer', intro: 'Découvrir l’application', next: 'Suivant', previous: 'Retour', createAccount: 'Créer un compte',
    titles: ['Le football de\nvotre équipe.', 'Chaque match.\nChaque joueur.', 'Commencez\nen équipe.'],
    descriptions: ['Gardez les moments sur le terrain dans vos cartes joueurs.', 'Résultats et cinq statistiques par joueur, au même endroit.', 'Après inscription, créez une équipe ou rejoignez-la avec un code.'],
    example: 'Exemple fictif', player: 'Joueur exemple', ourTeam: 'Notre équipe', opponent: 'Adversaire', matchResult: 'Résultat du match',
    loginTitle: 'Retrouvez\nvotre équipe.', loginDescription: 'Connectez-vous pour poursuivre votre histoire.', signupTitle: 'Le prochain match\ncommence ici.', signupDescription: 'Créez un compte, puis choisissez votre équipe.',
    teamTitle: 'Choisissez votre équipe', teamDescription: 'Créez une équipe ou rejoignez celle qui vous a invité.', createTeamDescription: 'Commencez vos statistiques avec votre équipe.', joinTeamDescription: 'Saisissez le code partagé par votre équipe.', showPassword: 'Afficher le mot de passe', hidePassword: 'Masquer le mot de passe', progress: 'Étape {n} sur 3',
  },
  de: {
    skip: 'Überspringen', intro: 'App kennenlernen', next: 'Weiter', previous: 'Zurück', createAccount: 'Konto erstellen',
    titles: ['Euer Team.\nEuer Fußball.', 'Jedes Spiel.\nJeder Spieler.', 'Startet\nals Team.'],
    descriptions: ['Haltet eure Momente auf dem Platz in Spielerkarten fest.', 'Ergebnisse und fünf Spielerstatistiken an einem Ort.', 'Nach der Anmeldung ein Team erstellen oder per Einladungscode beitreten.'],
    example: 'Fiktives Beispiel', player: 'Beispielspieler', ourTeam: 'Unser Team', opponent: 'Gegner', matchResult: 'Spielergebnis',
    loginTitle: 'Zurück\nzu eurem Team.', loginDescription: 'Melde dich an und setze eure Geschichte fort.', signupTitle: 'Das nächste Spiel\nbeginnt hier.', signupDescription: 'Erstelle ein Konto und wähle dein Team.',
    teamTitle: 'Wähle dein Team', teamDescription: 'Erstelle ein Team oder tritt einem eingeladenen Team bei.', createTeamDescription: 'Starte die Aufzeichnung mit deinem eigenen Team.', joinTeamDescription: 'Gib den Einladungscode deines Teams ein.', showPassword: 'Passwort anzeigen', hidePassword: 'Passwort verbergen', progress: 'Schritt {n} von 3',
  },
  it: {
    skip: 'Salta', intro: 'Scopri l’app', next: 'Avanti', previous: 'Indietro', createAccount: 'Crea un account',
    titles: ['La tua squadra.\nIl tuo calcio.', 'Ogni partita.\nOgni giocatore.', 'Inizia con\nla tua squadra.'],
    descriptions: ['Conserva i momenti in campo nelle schede dei giocatori.', 'Risultati e cinque statistiche dei giocatori in un solo posto.', 'Dopo la registrazione, crea una squadra o usa un codice invito.'],
    example: 'Esempio fittizio', player: 'Giocatore esempio', ourTeam: 'La nostra squadra', opponent: 'Avversari', matchResult: 'Risultato partita',
    loginTitle: 'Torna dalla\ntua squadra.', loginDescription: 'Accedi per continuare la vostra storia.', signupTitle: 'La prossima partita\ninizia qui.', signupDescription: 'Crea un account, poi scegli la tua squadra.',
    teamTitle: 'Scegli la tua squadra', teamDescription: 'Crea una squadra o unisciti a chi ti ha invitato.', createTeamDescription: 'Inizia a registrare con la tua squadra.', joinTeamDescription: 'Inserisci il codice condiviso dalla squadra.', showPassword: 'Mostra password', hidePassword: 'Nascondi password', progress: 'Passaggio {n} di 3',
  },
  es: {
    skip: 'Omitir', intro: 'Descubre la app', next: 'Siguiente', previous: 'Atrás', createAccount: 'Crear una cuenta',
    titles: ['Tu equipo.\nTu fútbol.', 'Cada partido.\nCada jugador.', 'Empieza con\ntu equipo.'],
    descriptions: ['Guarda los momentos del campo en las fichas de tus jugadores.', 'Resultados y cinco estadísticas de jugadores en un solo lugar.', 'Tras registrarte, crea un equipo o únete con un código de invitación.'],
    example: 'Ejemplo ficticio', player: 'Jugador de ejemplo', ourTeam: 'Nuestro equipo', opponent: 'Rival', matchResult: 'Resultado del partido',
    loginTitle: 'Vuelve a\ntu equipo.', loginDescription: 'Inicia sesión y continúa vuestra historia.', signupTitle: 'El próximo partido\nempieza aquí.', signupDescription: 'Crea una cuenta y elige tu equipo.',
    teamTitle: 'Elige tu equipo', teamDescription: 'Crea un equipo o únete al que te ha invitado.', createTeamDescription: 'Empieza a registrar con tu propio equipo.', joinTeamDescription: 'Introduce el código compartido por tu equipo.', showPassword: 'Mostrar contraseña', hidePassword: 'Ocultar contraseña', progress: 'Paso {n} de 3',
  },
}

export function getEntryCopy(locale: Locale): EntryCopy { return copy[locale] }
