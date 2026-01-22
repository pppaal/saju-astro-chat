# 📱 DestinyPal 모바일 앱 배포 가이드

## 🎯 개요

이 가이드는 Next.js 웹 앱을 Android/iOS 네이티브 앱으로 배포하는 전체 프로세스를 설명합니다.

---

## ⚙️ 현재 설정

- **프레임워크**: Next.js 16 + Capacitor 8
- **앱 ID**: `com.destinypal.app`
- **앱 이름**: DestinyPal
- **빌드 모드**: 로컬 정적 빌드 (오프라인 작동)

---

## 🚀 빠른 시작

### 1️⃣ Android 앱 빌드

```bash
# 전체 빌드 및 Android Studio 열기 (한 번에)
npm run mobile:build

# 또는 단계별로
npm run build                    # Next.js 빌드
npx cap sync android             # Android 동기화
npx cap open android             # Android Studio 열기
```

### 2️⃣ iOS 앱 빌드

```bash
# iOS 빌드 및 동기화
npm run mobile:sync:ios
npm run mobile:open:ios

# 또는 단계별로
npm run build                    # Next.js 빌드
npx cap sync ios                 # iOS 동기화
npx cap open ios                 # Xcode 열기
```

---

## 📋 사전 준비사항

### Android 개발 환경

1. **Android Studio** 최신버전 설치
2. **Java JDK** 17 이상 설치
3. **Android SDK** 설치 (Android Studio에서 자동)

### iOS 개발 환경 (macOS 필수)

1. **Xcode** 최신버전 설치 (Mac App Store)
2. **CocoaPods** 설치: `sudo gem install cocoapods`
3. **Apple Developer Account** (배포용)

---

## 🔧 상세 빌드 프로세스

### Step 1: Next.js 정적 빌드

```bash
npm run build
```

이 명령어는:
- Next.js 앱을 정적 HTML/CSS/JS로 빌드
- `out/` 폴더에 빌드 파일 생성
- Capacitor의 `webDir` 설정과 연동

### Step 2: Capacitor 동기화

```bash
# 모든 플랫폼 동기화
npx cap sync

# Android만
npx cap sync android

# iOS만
npx cap sync ios
```

동기화 과정:
1. `out/` 폴더의 웹 파일을 네이티브 프로젝트로 복사
2. Capacitor 플러그인 설치/업데이트
3. 네이티브 프로젝트 설정 적용

### Step 3: 네이티브 IDE에서 빌드

#### Android (Android Studio)

```bash
npx cap open android
```

Android Studio에서:
1. **Build > Clean Project**
2. **Build > Rebuild Project**
3. 실제 기기 연결 또는 에뮬레이터 실행
4. **Run** 버튼 클릭 (Shift + F10)

#### iOS (Xcode)

```bash
npx cap open ios
```

Xcode에서:
1. Signing & Capabilities에서 Team 선택
2. 실제 기기 연결 또는 시뮬레이터 선택
3. **Product > Run** (⌘R)

---

## 🔄 개발 모드 (실시간 테스트)

개발 중 실시간으로 테스트하려면 `capacitor.config.ts` 수정:

```typescript
const config: CapacitorConfig = {
  appId: 'com.destinypal.app',
  appName: 'DestinyPal',
  webDir: 'out',
  server: {
    url: 'http://192.168.1.100:3000',  // 내 로컬 IP
    cleartext: true,
  },
  // ...
};
```

**주의**:
- `192.168.1.100`을 실제 로컬 IP로 변경
- 개발 서버 실행: `npm run dev`
- 배포 전에는 반드시 `server` 부분 제거!

---

## 📦 배포 준비

### Android APK/AAB 빌드

#### 디버그 APK (테스트용)
```bash
cd android
./gradlew assembleDebug
# 결과: android/app/build/outputs/apk/debug/app-debug.apk
```

#### 릴리스 AAB (Play Store 배포용)
```bash
cd android
./gradlew bundleRelease
# 결과: android/app/build/outputs/bundle/release/app-release.aab
```

**서명 설정**:
1. 키스토어 생성:
   ```bash
   keytool -genkey -v -keystore destinypal-release.keystore -alias destinypal -keyalg RSA -keysize 2048 -validity 10000
   ```

2. `android/app/build.gradle`에 서명 설정 추가:
   ```gradle
   android {
       signingConfigs {
           release {
               storeFile file("destinypal-release.keystore")
               storePassword "YOUR_PASSWORD"
               keyAlias "destinypal"
               keyPassword "YOUR_PASSWORD"
           }
       }
       buildTypes {
           release {
               signingConfig signingConfigs.release
           }
       }
   }
   ```

### iOS IPA 빌드

Xcode에서:
1. **Product > Archive**
2. **Window > Organizer**
3. **Distribute App**
4. App Store Connect 또는 Ad Hoc 선택

---

## 🎨 앱 아이콘 및 스플래시 스크린

### 아이콘 생성
1. 1024x1024 PNG 아이콘 준비
2. 다음 사이트에서 생성: https://www.appicon.co/
3. 파일 배치:
   - Android: `android/app/src/main/res/mipmap-*/ic_launcher.png`
   - iOS: `ios/App/App/Assets.xcassets/AppIcon.appasset/`

### 스플래시 스크린
현재 설정: [capacitor.config.ts:13-16](capacitor.config.ts#L13-L16)
```typescript
SplashScreen: {
  launchShowDuration: 2000,
  backgroundColor: '#0d1225',
}
```

커스텀 이미지 추가:
- Android: `android/app/src/main/res/drawable/splash.png`
- iOS: `ios/App/App/Assets.xcassets/Splash.imageset/`

---

## 🔒 보안 및 권한 설정

### Android Permissions
`android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

### iOS Permissions
`ios/App/App/Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>카메라 권한이 필요합니다</string>
```

---

## 🐛 문제 해결

### Android 빌드 오류

**"Could not find method implementation()"**
```bash
cd android
./gradlew clean
./gradlew build
```

**"SDK location not found"**
`android/local.properties` 생성:
```
sdk.dir=C:\\Users\\USERNAME\\AppData\\Local\\Android\\Sdk
```

### iOS 빌드 오류

**"Pods not found"**
```bash
cd ios/App
pod install
```

**서명 오류**
- Xcode > Signing & Capabilities > Team 선택
- Bundle Identifier 확인: `com.destinypal.app`

---

## 📊 배포 체크리스트

### 배포 전 확인사항

- [ ] `capacitor.config.ts`에서 `server` 설정 제거/주석 처리
- [ ] `npm run build` 성공 확인
- [ ] 앱 아이콘 및 스플래시 스크린 설정
- [ ] Android/iOS 권한 설정 확인
- [ ] 릴리스 빌드 테스트
- [ ] 서명 키스토어 백업

### Google Play Store 배포

1. [Google Play Console](https://play.google.com/console) 계정 생성 (₩25,000 1회 결제)
2. 새 앱 등록
3. AAB 파일 업로드
4. 스토어 등록정보 작성 (스크린샷, 설명 등)
5. 심사 제출

### Apple App Store 배포

1. [Apple Developer Program](https://developer.apple.com) 가입 ($99/년)
2. App Store Connect에서 앱 등록
3. Xcode에서 Archive 및 업로드
4. 앱 정보 작성
5. 심사 제출

---

## 🛠️ 유용한 명령어 모음

```bash
# 개발
npm run dev                      # 웹 개발 서버
npm run mobile:open:android      # Android Studio 열기
npm run mobile:open:ios          # Xcode 열기

# 빌드
npm run build                    # Next.js 빌드
npm run mobile:sync              # 전체 플랫폼 동기화
npm run mobile:sync:android      # Android 빌드 및 동기화
npm run mobile:sync:ios          # iOS 빌드 및 동기화

# 전체 빌드 (Android)
npm run mobile:build             # 빌드 + 동기화 + Android Studio 열기

# Capacitor
npx cap doctor                   # 환경 체크
npx cap ls                       # 설치된 플러그인 목록
npx cap update                   # 플러그인 업데이트
```

---

## 📱 플러그인 추가 (선택사항)

### 카메라 플러그인
```bash
npm install @capacitor/camera
npx cap sync
```

### 푸시 알림
```bash
npm install @capacitor/push-notifications
npx cap sync
```

### 기타 공식 플러그인
- https://capacitorjs.com/docs/plugins

---

## 🎉 완료!

이제 DestinyPal 앱을 Android/iOS 플랫폼에 배포할 준비가 완료되었습니다!

배포 성공을 기원합니다! 🚀

---

## 📞 참고 자료

- [Capacitor 공식 문서](https://capacitorjs.com/docs)
- [Next.js 정적 내보내기](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Google Play Console](https://play.google.com/console)
- [Apple App Store Connect](https://appstoreconnect.apple.com)
