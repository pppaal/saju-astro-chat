# 소셜 로그인 완전 설정 가이드 🔐

## 목차
1. [Google OAuth](#1-google-oauth-) - ✅ 완료
2. [Apple Sign In](#2-apple-sign-in-) - 30분
3. [Kakao Login](#3-kakao-login-) - 30분
4. [WeChat Login](#4-wechat-login-) - 2-3일
5. [WhatsApp Login](#5-whatsapp-login-) - 복잡

---

## 1. Google OAuth ✅

### 이미 설정 완료!
현재 `.env.local`에 설정된 값:
```bash
GOOGLE_CLIENT_ID=1006631025287-1sf5ard6g4mifa3jq6u23ejnmf1cor8k.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

### 추가 확인 사항:
1. [Google Cloud Console](https://console.cloud.google.com/)
2. 프로젝트 선택
3. APIs & Services → Credentials
4. Authorized redirect URIs에 추가되어 있는지 확인:
   - `http://localhost:3000/api/auth/callback/google`
   - 프로덕션: `https://yourdomain.com/api/auth/callback/google`

---

## 2. Apple Sign In 🍎

### 필요한 것:
- Apple Developer Program 계정 ($99/년)
- 도메인 이름 (프로덕션용)

### 설정 단계:

#### Step 1: Identifiers 생성
1. [Apple Developer](https://developer.apple.com/account) 로그인
2. **Certificates, Identifiers & Profiles** 클릭
3. **Identifiers** → **+** 버튼

#### Step 2: App ID 생성
1. **App IDs** 선택 → Continue
2. **App** 선택 → Continue
3. 정보 입력:
   - **Description**: `Saju Astro Chat`
   - **Bundle ID**: `com.sajuastro.chat` (고유해야 함)
4. **Capabilities** 섹션에서:
   - ✅ **Sign in with Apple** 체크
5. **Continue** → **Register**

#### Step 3: Services ID 생성
1. **Identifiers** → **+** 버튼
2. **Services IDs** 선택 → Continue
3. 정보 입력:
   - **Description**: `Saju Astro Chat Web`
   - **Identifier**: `com.sajuastro.chat.web`
4. **Continue** → **Register**

#### Step 4: Services ID 설정
1. 방금 만든 Services ID 클릭
2. ✅ **Sign in with Apple** 체크
3. **Configure** 버튼 클릭
4. 설정:
   - **Primary App ID**: 위에서 만든 App ID 선택
   - **Website URLs** 섹션:
     - **Domains**: `localhost` (개발용) / `yourdomain.com` (프로덕션)
     - **Return URLs**:
       - 개발: `http://localhost:3000/api/auth/callback/apple`
       - 프로덕션: `https://yourdomain.com/api/auth/callback/apple`
5. **Save** → **Continue** → **Register**

#### Step 5: Key 생성
1. **Keys** → **+** 버튼
2. **Key Name**: `Saju Astro Chat Sign In Key`
3. ✅ **Sign in with Apple** 체크
4. **Configure** 클릭
5. **Primary App ID**: 위에서 만든 App ID 선택
6. **Save** → **Continue** → **Register**
7. **Download** 버튼으로 `.p8` 파일 다운로드 ⚠️ 한 번만 가능!

#### Step 6: .env.local 설정
```bash
# Apple Sign In
APPLE_ID=com.sajuastro.chat.web
APPLE_SECRET=-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
(다운로드한 .p8 파일 내용 전체 복사)
-----END PRIVATE KEY-----

APPLE_TEAM_ID=ABC123DEFG  # Apple Developer Team ID (10자)
APPLE_KEY_ID=XYZ456     # Key ID (다운로드 페이지에 표시됨)
```

#### 로컬 테스트 (중요!):
Apple은 localhost를 지원하지 않으므로 **ngrok** 사용:
```bash
npm install -g ngrok
ngrok http 3000
```

ngrok URL(예: `https://abc123.ngrok.io`)을 Apple Services ID의 Return URLs에 추가

---

## 3. Kakao Login 💬

### 필요한 것:
- 카카오 계정만 있으면 됨 (무료)

### 설정 단계:

#### Step 1: 애플리케이션 생성
1. [Kakao Developers](https://developers.kakao.com/) 로그인
2. **내 애플리케이션** → **애플리케이션 추가하기**
3. 정보 입력:
   - **앱 이름**: `Saju Astro Chat`
   - **사업자명**: 개인 또는 회사명
4. **저장**

#### Step 2: 플랫폼 설정
1. **앱 설정** → **플랫폼**
2. **Web 플랫폼 등록**
3. **사이트 도메인**:
   - 개발: `http://localhost:3000`
   - 프로덕션: `https://yourdomain.com`
4. **저장**

#### Step 3: 카카오 로그인 활성화
1. **제품 설정** → **카카오 로그인**
2. **활성화 설정** → **ON**
3. **Redirect URI** 등록:
   - 개발: `http://localhost:3000/api/auth/callback/kakao`
   - 프로덕션: `https://yourdomain.com/api/auth/callback/kakao`
4. **동의 항목** 설정:
   - ✅ 닉네임 (필수)
   - ✅ 카카오계정(이메일) (필수)
   - ✅ 프로필 사진 (선택)

#### Step 4: Client Secret 생성
1. **제품 설정** → **카카오 로그인** → **보안**
2. **Client Secret** → **코드 생성** 버튼
3. 생성된 코드 복사

#### Step 5: .env.local 설정
1. **앱 설정** → **앱 키**에서 확인:
   - **REST API 키** 복사

```bash
# Kakao Login
KAKAO_CLIENT_ID=abc123def456ghi789jkl  # REST API 키
KAKAO_CLIENT_SECRET=xyz789uvw456rst123  # Client Secret
```

#### 테스트:
```
http://localhost:3000/myjourney
"Continue with Kakao" 클릭
```

---

## 4. WeChat Login 🟢

### 필요한 것:
- 중국 휴대폰 번호 (SMS 인증용)
- 중국 신분증 또는 사업자등록증
- 1-3일 대기 시간

### 설정 단계:

#### Step 1: 계정 생성
1. [WeChat Open Platform](https://open.weixin.qq.com/) 접속
2. **注册** (회원가입) 클릭
3. 중국 휴대폰으로 SMS 인증

#### Step 2: 개발자 인증
1. **개발자 자질 인증** (开发者资质认证)
2. 두 가지 옵션:
   - **개인**: 중국 신분증 필요
   - **기업**: 사업자등록증, 기업 계좌 필요
3. 인증 수수료: ¥300 (약 $45)
4. 심사 기간: 1-3일

#### Step 3: 웹사이트 애플리케이션 생성
1. 인증 완료 후 **管理中心** (관리 센터)
2. **网站应用** (웹사이트 애플리케이션) → **创建应用** (애플리케이션 생성)
3. 정보 입력:
   - **应用名称**: Saju Astro Chat
   - **应用简介**: 사주 운세 앱
   - **应用官网**: https://yourdomain.com
   - **授权回调域**: yourdomain.com
4. 제출 후 심사 (1-2일)

#### Step 4: .env.local 설정
승인되면 **AppID**와 **AppSecret** 발급:

```bash
# WeChat Login
WECHAT_APP_ID=wx1234567890abcdef
WECHAT_APP_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

#### 중요 제약사항:
- ⚠️ **localhost 불가** - HTTPS 도메인 필수
- ⚠️ QR 코드 스캔 방식 (모바일 불가)
- ⚠️ 중국 외 지역에서는 느릴 수 있음

#### 테스트 (프로덕션 환경):
```bash
# ngrok으로 HTTPS 터널
ngrok http 3000 --region ap

# ngrok URL을 WeChat 콘솔에 등록
https://abc123.ngrok.io
```

---

## 5. WhatsApp Login 📱

### 필요한 것:
- Facebook Business 계정
- 인증된 도메인
- WhatsApp Business API 액세스

### 설정 단계:

#### Step 1: Meta for Developers 계정
1. [Meta for Developers](https://developers.facebook.com/) 가입
2. **My Apps** → **Create App**
3. **Consumer** 또는 **Business** 선택
4. 앱 이름: `Saju Astro Chat`

#### Step 2: Facebook Login 제품 추가
1. **Add Product** → **Facebook Login** 선택
2. **Web** 플랫폼 선택
3. **Site URL**: `http://localhost:3000`

#### Step 3: OAuth 설정
1. **Facebook Login** → **Settings**
2. **Valid OAuth Redirect URIs**:
   - 개발: `http://localhost:3000/api/auth/callback/whatsapp`
   - 프로덕션: `https://yourdomain.com/api/auth/callback/whatsapp`
3. **Save Changes**

#### Step 4: WhatsApp Business API (선택적)
⚠️ **주의**: WhatsApp은 실제로 "WhatsApp 로그인"이 아니라 Facebook 계정 기반입니다.

진짜 WhatsApp Business API가 필요하다면:
1. **WhatsApp Business Platform** 신청
2. 사업자 정보 제출
3. 비즈니스 인증 (1-2주)
4. API 액세스 승인 대기

#### Step 5: .env.local 설정
**간단 버전 (Facebook 기반):**
```bash
# WhatsApp (Facebook OAuth)
WHATSAPP_APP_ID=1234567890123456
WHATSAPP_APP_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**App ID와 Secret 찾기:**
1. **Settings** → **Basic**
2. **App ID** 복사
3. **App Secret** → **Show** → 복사

#### 대안: Facebook Login 사용
WhatsApp 대신 Facebook Login을 사용하는 게 더 간단합니다:

```typescript
// authOptions.ts
import FacebookProvider from 'next-auth/providers/facebook'

providers.push(
  FacebookProvider({
    clientId: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
  })
);
```

---

## 환경 변수 전체 예시

`.env.local` 파일에 모두 추가:

```bash
# === Authentication ===
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key-change-this-in-production

# Google OAuth ✅
GOOGLE_CLIENT_ID=1006631025287-1sf5ard6g4mifa3jq6u23ejnmf1cor8k.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# Apple Sign In 🍎
APPLE_ID=com.sajuastro.chat.web
APPLE_SECRET=-----BEGIN PRIVATE KEY-----...-----END PRIVATE KEY-----
APPLE_TEAM_ID=ABC123DEFG
APPLE_KEY_ID=XYZ456

# Kakao Login 💬
KAKAO_CLIENT_ID=your_rest_api_key
KAKAO_CLIENT_SECRET=your_client_secret

# WeChat Login 🟢
WECHAT_APP_ID=wx1234567890abcdef
WECHAT_APP_SECRET=your_wechat_secret

# WhatsApp/Facebook Login 📱
WHATSAPP_APP_ID=your_facebook_app_id
WHATSAPP_APP_SECRET=your_facebook_secret
```

---

## 우선순위 추천

### 1단계 (즉시 가능):
- ✅ **Google** - 이미 완료
- ✅ **Email/Password** - 이미 완료

### 2단계 (30분):
- 💬 **Kakao** - 한국 사용자 많으면 필수
- 🍎 **Apple** - iOS 사용자용

### 3단계 (나중에):
- 🟢 **WeChat** - 중국 시장 진출 시
- 📱 **WhatsApp** - 실용성 낮음, Facebook으로 대체 가능

---

## 테스트 체크리스트

### 각 OAuth 설정 후:
- [ ] 로그인 버튼이 표시되는가?
- [ ] 버튼 클릭 시 OAuth 페이지로 이동하는가?
- [ ] 로그인 성공 후 MyJourney로 리다이렉트되는가?
- [ ] 사용자 정보가 제대로 표시되는가?
- [ ] 로그아웃이 정상 작동하는가?

### 로그 확인:
```bash
# 서버 로그에서 확인
npm run dev

# 브라우저 콘솔에서 확인
F12 → Console
```

---

## 문제 해결

### redirect_uri_mismatch 에러
**원인:** Redirect URI가 OAuth 콘솔에 등록되지 않음

**해결:**
1. OAuth 제공자 콘솔로 이동
2. Redirect URIs 확인
3. 정확히 일치하는 URL 추가 (끝에 `/` 포함 여부 주의)

### localhost가 안 되는 경우
**Apple, WeChat은 localhost 불가**

**해결:** ngrok 사용
```bash
ngrok http 3000
# https://abc123.ngrok.io 같은 URL 생성됨
# 이 URL을 OAuth 콘솔에 등록
```

### Client Secret이 안 보이는 경우
대부분의 OAuth 제공자는 Secret을 **한 번만** 보여줍니다.

**해결:** 새로 생성하기

---

## 다음 단계

모든 OAuth 설정 완료 후:
1. 프로덕션 도메인으로 Redirect URIs 업데이트
2. 환경 변수를 프로덕션 서버에 안전하게 배포
3. HTTPS 인증서 설정
4. 각 OAuth 제공자에게 앱 리뷰 제출 (필요한 경우)

---

**설정하면서 막히는 부분 있으면 알려주세요!** 🚀
