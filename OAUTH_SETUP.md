# OAuth 로그인 설정 가이드

이 문서는 프로젝트에서 지원하는 모든 소셜 로그인(OAuth) 설정 방법을 설명합니다.

## 지원하는 로그인 방식

1. ✅ **Google** - 전 세계적으로 가장 많이 사용
2. ✅ **Kakao (카카오톡)** - 한국 사용자용
3. ✅ **WeChat (微信)** - 중국 사용자용
4. ✅ **WhatsApp** - Meta/Facebook 기반
5. ✅ **Email/Password** - 일반 회원가입

---

## 1. Google OAuth 설정

### 1.1 Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성 또는 선택
3. **APIs & Services** → **Credentials** 이동
4. **Create Credentials** → **OAuth 2.0 Client ID** 선택
5. Application type: **Web application**
6. Authorized JavaScript origins:
   ```
   http://localhost:3000
   https://yourdomain.com
   ```
7. Authorized redirect URIs:
   ```
   http://localhost:3000/api/auth/callback/google
   https://yourdomain.com/api/auth/callback/google
   ```

### 1.2 환경 변수 설정

`.env.local`:
```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

---

## 2. Kakao OAuth 설정 (카카오 로그인)

### 2.1 Kakao Developers 설정

1. [Kakao Developers](https://developers.kakao.com/) 접속 및 로그인
2. **내 애플리케이션** → **애플리케이션 추가하기**
3. 앱 정보 입력 (앱 이름, 사업자명)
4. **앱 설정** → **플랫폼** → **Web 플랫폼 등록**
   - 사이트 도메인: `http://localhost:3000`
5. **제품 설정** → **카카오 로그인** → **활성화 설정 ON**
6. **Redirect URI 등록**:
   ```
   http://localhost:3000/api/auth/callback/kakao
   https://yourdomain.com/api/auth/callback/kakao
   ```
7. **보안** → **Client Secret** 발급 (필수)

### 2.2 환경 변수 설정

`.env.local`:
```bash
KAKAO_CLIENT_ID=your-rest-api-key
KAKAO_CLIENT_SECRET=your-client-secret
```

**앱 키 위치:**
- **REST API 키** = `KAKAO_CLIENT_ID`
- **보안 탭의 Client Secret** = `KAKAO_CLIENT_SECRET`

---

## 3. WeChat OAuth 설정 (微信登录)

### 3.1 WeChat Open Platform 설정

1. [WeChat Open Platform](https://open.weixin.qq.com/) 접속
2. 계정 생성 (중국 휴대폰 번호 필요)
3. **管理中心** → **网站应用** → **创建网站应用**
4. 애플리케이션 정보 입력:
   - **应用名称** (App Name)
   - **应用简介** (Description)
   - **应用官网** (Website): `https://yourdomain.com`
   - **授权回调域** (Callback Domain): `yourdomain.com` (프로토콜 제외)
5. 개발자 인증 (신분증 + 얼굴 인증)
6. 심사 대기 (1-3일 소요)
7. 승인 후 **AppID**와 **AppSecret** 확인

### 3.2 환경 변수 설정

`.env.local`:
```bash
WECHAT_APP_ID=wx1234567890abcdef
WECHAT_APP_SECRET=your-app-secret
```

### 3.3 중요 사항

⚠️ **WeChat OAuth 제한사항:**
- HTTPS 필수 (로컬 테스트 불가)
- 중국 본토 서버 권장
- 개발자 실명 인증 필요
- 기업 인증 시 추가 기능 제공
- QR 코드 스캔 방식 로그인

**테스트 방법:**
```bash
# 로컬에서는 ngrok 등으로 HTTPS 터널링 필요
ngrok http 3000
# ngrok URL을 WeChat 콘솔에 등록
```

---

## 4. WhatsApp OAuth 설정

### 4.1 Meta for Developers 설정

1. [Meta for Developers](https://developers.facebook.com/) 접속
2. **My Apps** → **Create App**
3. App Type 선택: **Consumer** 또는 **Business**
4. 기본 정보 입력:
   - App Display Name
   - App Contact Email
5. **Dashboard** → **Settings** → **Basic**:
   - **App ID** 복사 → `WHATSAPP_APP_ID`
   - **App Secret** 표시 → `WHATSAPP_APP_SECRET`

### 4.2 Facebook Login 설정

1. **Dashboard** → **Add Product** → **Facebook Login** → **Set Up**
2. **Settings** → **Valid OAuth Redirect URIs** 추가:
   ```
   http://localhost:3000/api/auth/callback/whatsapp
   https://yourdomain.com/api/auth/callback/whatsapp
   ```
3. Save Changes

### 4.3 WhatsApp Business API (선택사항)

WhatsApp 메시징 기능까지 사용하려면:
1. **Add Product** → **WhatsApp** → **Set Up**
2. 비즈니스 전화번호 등록
3. Business Verification 완료

### 4.4 환경 변수 설정

`.env.local`:
```bash
WHATSAPP_APP_ID=your-facebook-app-id
WHATSAPP_APP_SECRET=your-facebook-app-secret
```

### 4.5 중요 사항

⚠️ **WhatsApp OAuth 제한사항:**
- 실제로는 Facebook OAuth 사용
- WhatsApp Business 계정 필요 (메시징 기능 사용 시)
- 무료 티어: 1,000 conversations/month
- Business Verification 권장

---

## 5. Email/Password 회원가입

별도 설정 없이 바로 사용 가능합니다!

**기능:**
- ✅ 이메일 + 비밀번호 회원가입
- ✅ bcrypt 암호화 (10 rounds)
- ✅ 최소 6자 이상 비밀번호
- ✅ 자동 로그인
- ✅ 비밀번호 확인

---

## 환경 변수 전체 예시

`.env.local`:
```bash
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-string-here

# Database (Supabase)
DATABASE_URL="your-supabase-url?pgbouncer=true"
DIRECT_URL="your-supabase-url"

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx

# Kakao OAuth
KAKAO_CLIENT_ID=xxx
KAKAO_CLIENT_SECRET=xxx

# WeChat OAuth
WECHAT_APP_ID=wxxxx
WECHAT_APP_SECRET=xxx

# WhatsApp OAuth
WHATSAPP_APP_ID=xxx
WHATSAPP_APP_SECRET=xxx
```

---

## 테스트 방법

### 로컬 테스트

1. 환경 변수 설정
2. 개발 서버 실행:
   ```bash
   npm run dev
   ```
3. 브라우저에서 `http://localhost:3000/myjourney` 접속
4. 각 소셜 로그인 버튼 클릭

### 프로덕션 배포 전 체크리스트

- [ ] 모든 OAuth Provider의 프로덕션 URL 등록
- [ ] NEXTAUTH_URL을 프로덕션 도메인으로 변경
- [ ] HTTPS 인증서 설정
- [ ] 각 Provider의 App Review 완료 (필요시)
- [ ] 환경 변수를 서버에 안전하게 저장

---

## 트러블슈팅

### "redirect_uri_mismatch" 에러
**원인:** Callback URL이 OAuth 콘솔에 등록되지 않음
**해결:** 각 Provider 콘솔에서 정확한 callback URL 등록

### Kakao "invalid_client" 에러
**원인:** Client Secret이 설정되지 않았거나 잘못됨
**해결:**
1. Kakao 콘솔 → 보안 탭 → Client Secret 발급
2. 코드 ON 설정
3. `.env.local`에 정확히 입력

### WeChat "redirect_uri error"
**원인:** HTTP 사용 또는 도메인이 등록되지 않음
**해결:**
1. HTTPS 사용 (로컬은 ngrok)
2. 授权回调域에 정확한 도메인 등록 (프로토콜 제외)

### WhatsApp 로그인 안 됨
**원인:** Facebook Login이 제대로 설정되지 않음
**해결:**
1. Facebook Login Product 추가 확인
2. Valid OAuth Redirect URIs 재확인
3. App이 Development 모드가 아닌지 확인

---

## 참고 자료

- [NextAuth.js Providers](https://next-auth.js.org/providers/)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Kakao Login Guide](https://developers.kakao.com/docs/latest/ko/kakaologin/common)
- [WeChat OAuth Guide](https://developers.weixin.qq.com/doc/oplatform/en/Website_App/WeChat_Login/Wechat_Login.html)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login/)
