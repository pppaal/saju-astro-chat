# Google OAuth 로그인 수정 가이드

## 문제
- 서버가 포트 3003에서 실행 중이지만 Google OAuth는 3000으로 설정됨
- 콜백 URL 불일치로 로그인 실패

## 해결 완료 ✅
1. `.env.local` 파일 수정:
   - `NEXTAUTH_URL=http://localhost:3003`
   - `NEXT_PUBLIC_BASE_URL=http://localhost:3003`

## Google Cloud Console 설정 필요 🔧

### 1단계: Google Cloud Console 접속
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택 (Client ID: 1006631025287-...)

### 2단계: OAuth 설정 수정
1. **APIs & Services** → **Credentials** 메뉴로 이동
2. OAuth 2.0 Client IDs 목록에서 해당 Client ID 클릭
3. **Authorized redirect URIs** 섹션 찾기

### 3단계: 리다이렉트 URI 추가
기존 URI:
```
http://localhost:3000/api/auth/callback/google
```

**추가해야 할 URI:**
```
http://localhost:3003/api/auth/callback/google
```

**참고:** 두 개 모두 유지해도 됩니다 (3000과 3003 둘 다)

### 4단계: 저장
1. **Save** 버튼 클릭
2. 변경 사항 저장 완료 (즉시 반영됨)

## 테스트 방법

1. 브라우저 캐시 삭제 또는 시크릿 모드 사용
2. http://localhost:3003/myjourney 접속
3. "Continue with Google" 버튼 클릭
4. Google 계정 선택
5. 로그인 성공 확인

## 대안: 포트 3000 사용하기

포트 3000이 사용 중이라면:

### 옵션 1: 3000 포트 프로세스 종료
```bash
# 포트 3000 사용 중인 프로세스 확인
netstat -ano | findstr :3000

# 프로세스 종료 (PID: 44944)
taskkill /PID 44944 /F

# 서버 재시작
npm run dev
```

### 옵션 2: package.json에서 포트 지정
`package.json` 수정:
```json
{
  "scripts": {
    "dev": "next dev -p 3000"
  }
}
```

## 현재 상태

✅ 환경 변수 수정 완료
🔧 Google Cloud Console에서 리다이렉트 URI 추가 필요
⏳ 추가 후 즉시 로그인 가능

## 스크린샷 참고

Google Cloud Console에서 찾을 위치:
```
APIs & Services
  └── Credentials
       └── OAuth 2.0 Client IDs
            └── [Your Client ID]
                 └── Authorized redirect URIs
                      └── + ADD URI
```

입력할 값:
```
http://localhost:3003/api/auth/callback/google
```

## 완료 후

서버 재시작:
```bash
# Ctrl+C로 현재 서버 종료 후
npm run dev
```

이제 http://localhost:3003/myjourney에서 Google 로그인이 작동합니다!
