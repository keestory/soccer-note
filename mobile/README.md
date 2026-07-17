# SoccerNote — Native app (React Native + Expo)

The native rewrite of SoccerNote. Reuses the web app's i18n translations,
types, and business logic; the UI is rebuilt with native components.

## Run it (on your Mac)

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
- [ ] Phase 2 — Google OAuth (native)
- [ ] Phase 3 — Dashboard, Players, Team intro
- [ ] Phase 4 — Match / Training / Quarter records
- [ ] Phase 5 — Community, Notifications, Profile
- [ ] Phase 6 — Native builds & store release
