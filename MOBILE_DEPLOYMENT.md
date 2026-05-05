# 모바일 앱 배포 가이드 (Mobile App Deployment Guide)

## 개요
이 문서는 Soccer Note 앱을 Android Google Play Store와 iOS App Store에 배포하는 방법을 설명합니다.

---

## 사전 요구사항

### 공통
- Node.js 18+
- npm 또는 yarn

### Android
- Android Studio (최신 버전)
- JDK 17+
- Android SDK 34+

### iOS
- macOS
- Xcode 15+
- Apple Developer Program 멤버십 ($99/년)

---

## 1. 앱 아이콘 및 스플래시 스크린 생성

### 아이콘 생성
```bash
# 1024x1024 PNG 아이콘을 준비한 후:
./scripts/generate-icons.sh path/to/your-icon.png
```

### 스플래시 스크린 생성 (ImageMagick 필요)
```bash
# ImageMagick 설치
brew install imagemagick

# 스플래시 스크린 생성
./scripts/generate-splash.sh path/to/your-logo.png
```

---

## 2. Android 배포

### 2.1 키스토어 생성 (최초 1회)

```bash
# keystore 디렉토리 생성
mkdir -p android/keystore

# 릴리즈 키스토어 생성
keytool -genkey -v -keystore android/keystore/release.keystore \
  -alias soccer-note \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

> ⚠️ **중요**: 키스토어 파일과 비밀번호를 안전하게 보관하세요. 분실 시 앱 업데이트가 불가능합니다.

### 2.2 키스토어 설정

```bash
# keystore.properties 파일 생성
cp android/keystore.properties.example android/keystore.properties

# 편집기로 열어서 실제 값으로 수정
nano android/keystore.properties
```

`keystore.properties` 내용:
```properties
storeFile=../keystore/release.keystore
storePassword=실제_스토어_비밀번호
keyAlias=soccer-note
keyPassword=실제_키_비밀번호
```

### 2.3 릴리즈 빌드

```bash
# AAB (Android App Bundle) 빌드 - Play Store 권장
npm run cap:build:android:bundle

# 출력 위치: android/app/build/outputs/bundle/release/app-release.aab
```

또는 APK로 빌드:
```bash
npm run cap:build:android

# 출력 위치: android/app/build/outputs/apk/release/app-release.apk
```

### 2.4 Google Play Console 업로드

1. [Google Play Console](https://play.google.com/console) 접속
2. 앱 생성 또는 기존 앱 선택
3. Production > Create new release
4. app-release.aab 파일 업로드
5. 릴리즈 노트 작성
6. 검토 및 출시

### 2.5 Play Store 리스팅 정보

- **앱 이름**: 축구 노트 (Soccer Note)
- **패키지 이름**: com.soccernote.app
- **카테고리**: 스포츠
- **대상 연령**: 전체 이용가
- **필요 스크린샷**:
  - 휴대폰: 최소 2장 (1080x1920 또는 16:9)
  - 7인치 태블릿: 최소 1장 (권장)
  - 10인치 태블릿: 최소 1장 (권장)
- **그래픽 에셋**:
  - 고해상도 아이콘: 512x512 PNG
  - 기능 그래픽: 1024x500 PNG

---

## 3. iOS 배포

### 3.1 Xcode에서 프로젝트 열기

```bash
# 먼저 웹 빌드 및 동기화
npm run cap:build

# Xcode 열기
npm run cap:open:ios
```

### 3.2 Xcode 설정

1. **Signing & Capabilities** 탭 선택
2. **Team** 선택 (Apple Developer 계정)
3. **Bundle Identifier** 확인: `com.soccernote.app`
4. **Automatically manage signing** 체크

### 3.3 버전 설정

1. General 탭에서:
   - **Version**: 1.0.0
   - **Build**: 1

### 3.4 릴리즈 빌드

1. Xcode에서 Product > Scheme > Edit Scheme
2. Run > Build Configuration을 `Release`로 변경
3. Product > Archive 선택
4. 아카이브 완료 후 "Distribute App" 클릭
5. "App Store Connect" 선택
6. 업로드 완료

### 3.5 App Store Connect 설정

1. [App Store Connect](https://appstoreconnect.apple.com) 접속
2. 앱 생성 (신규인 경우)
3. 앱 정보 입력:
   - **이름**: 축구 노트
   - **부제목**: 유소년 축구팀 경기 기록 관리
   - **카테고리**: 스포츠
   - **설명**: 앱 설명 작성
4. 스크린샷 업로드:
   - iPhone 6.7" (1290x2796)
   - iPhone 6.5" (1284x2778)
   - iPhone 5.5" (1242x2208)
   - iPad Pro 12.9" (2048x2732) - 선택
5. 빌드 선택 및 검토 제출

---

## 4. 버전 업데이트

### Android 버전 업데이트

`android/app/build.gradle` 수정:
```gradle
defaultConfig {
    versionCode 2          // 매 릴리즈마다 증가
    versionName "1.0.1"    // 사용자에게 표시되는 버전
}
```

### iOS 버전 업데이트

Xcode General 탭에서:
- **Version**: 1.0.1
- **Build**: 2 (매 업로드마다 증가)

---

## 5. 문제 해결

### Android 빌드 실패

```bash
# Gradle 캐시 정리
cd android && ./gradlew clean && cd ..

# node_modules 재설치
rm -rf node_modules && npm install

# Capacitor 재동기화
npm run cap:sync
```

### iOS 빌드 실패

```bash
# Pod 재설치
cd ios/App && pod install --repo-update && cd ../..

# DerivedData 정리
rm -rf ~/Library/Developer/Xcode/DerivedData

# Capacitor 재동기화
npm run cap:sync
```

### 서명 오류

- Android: `keystore.properties` 경로와 비밀번호 확인
- iOS: Xcode에서 Team 설정 및 인증서 확인

---

## 6. 유용한 명령어

```bash
# 개발용 빌드 및 실행
npm run cap:run:android    # Android 에뮬레이터/기기
npm run cap:run:ios        # iOS 시뮬레이터/기기

# 프로젝트 열기
npm run cap:open:android   # Android Studio
npm run cap:open:ios       # Xcode

# 웹 빌드 + Capacitor 동기화
npm run cap:build

# 릴리즈 빌드
npm run cap:build:android:bundle  # Play Store용 AAB
npm run cap:build:android         # APK
```

---

## 7. 체크리스트

### 배포 전 확인사항

- [ ] 앱 아이콘 설정 완료
- [ ] 스플래시 스크린 설정 완료
- [ ] 버전 번호 업데이트
- [ ] 릴리즈 노트 작성
- [ ] 스크린샷 준비
- [ ] 개인정보 처리방침 URL 준비
- [ ] 앱 설명 작성

### Android 전용

- [ ] 키스토어 생성 및 백업
- [ ] keystore.properties 설정
- [ ] AAB 빌드 테스트
- [ ] Google Play Console 앱 생성

### iOS 전용

- [ ] Apple Developer Program 가입
- [ ] Xcode 서명 설정
- [ ] TestFlight 테스트
- [ ] App Store Connect 앱 생성
