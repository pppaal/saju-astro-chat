# 사진 업로드 기능 설정 가이드

MyJourney 사진 업로드 기능이 프로덕션에 배포되었습니다. 이제 몇 가지 설정만 하면 바로 사용할 수 있습니다!

## 🎯 현재 상태

✅ 코드 배포 완료
✅ Vercel Blob Storage 통합 완료
⏳ Blob Storage 활성화 필요
⏳ 데이터베이스 마이그레이션 필요

## 📋 설정 단계

### 1. Vercel Blob Storage 활성화

1. **Vercel Dashboard** 접속

   ```
   https://vercel.com/dashboard
   ```

2. **프로젝트 선택**
   - `saju-astro-chat-2atr` 클릭

3. **Storage 탭으로 이동**
   - 왼쪽 메뉴에서 "Storage" 클릭

4. **Blob Store 생성**
   - "Create Blob Store" 버튼 클릭
   - 이름 입력: `profile-photos` (또는 원하는 이름)
   - "Create" 클릭

5. **자동 설정 확인**
   - `BLOB_READ_WRITE_TOKEN` 환경 변수가 자동으로 추가됨
   - "Environment Variables" 탭에서 확인 가능

---

### 2. 데이터베이스 마이그레이션 실행

#### 옵션 A: Prisma Migrate 사용 (권장)

프로덕션 데이터베이스에 연결하여:

```bash
# 환경 변수 설정
export DATABASE_URL="your_production_database_url"

# 마이그레이션 실행
npx prisma migrate deploy
```

#### 옵션 B: 수동 SQL 실행

데이터베이스에 직접 접속하여 다음 SQL 실행:

```sql
-- Add profilePhoto field to User table
ALTER TABLE "User" ADD COLUMN "profilePhoto" TEXT;

-- Add comment for documentation
COMMENT ON COLUMN "User"."profilePhoto" IS 'User uploaded custom profile photo URL (from Vercel Blob Storage)';
```

---

### 3. 배포된 앱 재시작 (선택사항)

환경 변수가 추가되었으므로:

1. Vercel Dashboard → Deployments
2. 최신 배포 옆 "..." 메뉴 클릭
3. "Redeploy" 선택

---

## 🧪 테스트

설정이 완료되면:

1. **프로덕션 URL 접속**

   ```
   https://your-app.vercel.app/myjourney
   ```

2. **로그인**

3. **사진 업로드 테스트**
   - 프로필 아바타에 마우스 오버 → 📷 아이콘 표시
   - 아바타 클릭
   - 이미지 선택 (JPG, PNG, WebP, 최대 5MB)
   - 업로드 완료 후 즉시 반영 확인

4. **Destiny Match 연동 확인** (선택사항)
   - MatchProfile이 있는 경우
   - 업로드한 사진이 자동으로 photos 배열에 추가됨

---

## 📁 파일 구조

```
src/
├── app/
│   ├── api/
│   │   └── user/
│   │       └── upload-photo/
│   │           └── route.ts          # 업로드 API (Vercel Blob)
│   └── myjourney/
│       ├── components/
│       │   └── ProfileCard.tsx       # 업로드 UI
│       └── types.ts                  # Profile 타입 정의

prisma/
└── schema.prisma                     # User.profilePhoto 필드

public/
└── uploads/                          # (로컬 개발용, Vercel에서는 Blob 사용)
    └── profiles/
        └── .gitkeep
```

---

## 🔧 기술 스택

- **스토리지**: Vercel Blob Storage
- **API**: Next.js App Router (Server Actions)
- **데이터베이스**: PostgreSQL (Prisma ORM)
- **UI**: React + Next.js Image
- **검증**: 파일 타입, 크기 (클라이언트 + 서버)

---

## 💰 비용

### Vercel Blob Storage 무료 티어

- **스토리지**: 500MB
- **대역폭**: 1GB/월
- **요청**: 무제한

대부분의 앱에는 무료 티어로 충분합니다!

---

## 🐛 문제 해결

### "BLOB_READ_WRITE_TOKEN not found" 에러

→ Vercel Dashboard에서 Blob Storage를 활성화하고 재배포하세요.

### 사진이 표시되지 않음

→ 브라우저 콘솔에서 에러 확인
→ Next.js Image 컴포넌트 설정 확인
→ Blob URL이 공개 접근 가능한지 확인

### 업로드 후 사진이 바로 보이지 않음

→ 페이지 새로고침 시도
→ API 응답에서 photoUrl 확인
→ 네트워크 탭에서 업로드 성공 여부 확인

### 데이터베이스 마이그레이션 실패

→ DATABASE_URL 환경 변수 확인
→ 데이터베이스 연결 권한 확인
→ 수동 SQL 실행으로 대체

---

## 📚 추가 문서

- [Vercel Blob 공식 문서](https://vercel.com/docs/storage/vercel-blob)
- [Prisma 마이그레이션 가이드](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [상세 구현 가이드](./DEPLOYMENT_PHOTO_UPLOAD.md)

---

## ✅ 완료 체크리스트

- [ ] Vercel Blob Storage 생성
- [ ] BLOB_READ_WRITE_TOKEN 환경 변수 확인
- [ ] 데이터베이스 마이그레이션 실행
- [ ] 프로덕션 배포 재시작 (필요시)
- [ ] 사진 업로드 테스트
- [ ] Destiny Match 연동 확인 (있는 경우)

---

## 🎉 완료!

모든 단계를 완료하면 MyJourney에서 사진 업로드 기능을 사용할 수 있습니다!

문제가 있으면 이 문서의 "문제 해결" 섹션을 참고하거나,
GitHub Issues에 문의하세요.
