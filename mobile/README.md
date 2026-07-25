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
- [x] Phase 4 — Match / Training / Quarter records (create + edit, drag formation)
- [x] Phase 7 — Light (Navy Board) / Dark (GOLDLINE) themes with toggle
- [ ] Phase 2 — Google OAuth (native)
- [ ] Phase 5 — Community, Notifications, member management
- [ ] Native builds & store release (in progress — see below)

## Building for the App Store / Play Store (EAS)

Native binaries are built in the cloud with **EAS Build** (needs a free Expo
account). Run these from `mobile/` on your Mac (Node 20 LTS):

```bash
npm i -g eas-cli          # one-time
eas login                 # your Expo account
eas init                  # links the project, writes extra.eas.projectId

# Supabase keys must exist at build time (public anon key — safe to embed).
# Set them as EAS environment variables (once per project):
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value "https://<your-project>.supabase.co"
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<your-anon-key>"

# Build:
eas build --platform ios --profile production        # → .ipa
eas build --platform android --profile production    # → .aab

# Try it on a device first without the stores:
eas build --platform android --profile preview       # installable .apk
```

Then submit to the stores (needs an Apple Developer account $99/yr and/or a
Google Play Developer account $25 one-time):

```bash
eas submit --platform ios --latest
eas submit --platform android --latest
```

`eas.json` defines the `development` / `preview` / `production` profiles.
`app.json` already carries the bundle id (`com.soccernote.app`), version codes,
and the iOS photo/camera permission strings the App Store review requires.
