# SoccerNote — Native app (React Native + Expo)

The native rewrite of SoccerNote. Reuses the web app's i18n translations,
types, and business logic; the UI is rebuilt with native components.

## Run it (on your Mac)

> **Node 20 LTS 사용 권장** — Expo는 Node 20에서 가장 안정적입니다.
> Node 22를 쓰면 번들 오류가 날 수 있어요. `nvm install 20 && nvm use 20`

```bash
cd mobile
npm install

# Supabase keys (Settings → API in your Supabase project)
cp .env.example .env
# then edit .env and paste your URL + anon key

npx expo start
```

Then:
- Install **Expo Go** on your phone (App Store / Play Store)
- Scan the QR code shown in the terminal
- The app opens live on your phone — edits reload instantly

## Status (phased rewrite)

- [x] **Phase 1 — Foundation**: project setup, theme (GOLDLINE), Supabase
      (AsyncStorage sessions), i18n (8 languages), navigation
- [x] Landing → Login / Signup (email auth working)
- [x] **Phase 3 — Core screens**: tab navigation, Dashboard (season stats,
      recent matches, team switcher), Players (with stats), Team intro
      (roster + OVR), Training list, Profile (name / language / logout)
- [ ] Phase 2 — Google OAuth (native)
- [ ] Phase 4 — Match / Training / Quarter records (create + edit)
- [ ] Phase 5 — Community, Notifications, member management
- [ ] Phase 6 — Native builds & store release
