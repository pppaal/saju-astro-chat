# 배포 가이드 (Deployment Guide)

## Vercel 배포

### 자동 마이그레이션

프로젝트는 Vercel에 배포 시 자동으로 데이터베이스 마이그레이션을 실행합니다.

```json
"vercel-build": "prisma migrate deploy && prisma generate && next build --webpack"
```

### 환경 변수 설정

Vercel 대시보드에서 다음 환경 변수를 설정해야 합니다:

- `DATABASE_URL` - PostgreSQL 데이터베이스 URL
- `DIRECT_DATABASE_URL` - Direct 연결용 데이터베이스 URL (Prisma Accelerate 사용 시)
- `NEXTAUTH_SECRET` - NextAuth 시크릿 키
- `NEXTAUTH_URL` - 프로덕션 URL (예: https://yourdomain.com)

### 수동 마이그레이션

필요한 경우 로컬에서 프로덕션 데이터베이스에 마이그레이션을 실행할 수 있습니다:

```bash
# 마이그레이션 상태 확인
npm run db:status

# 마이그레이션 배포
npm run db:migrate

# Prisma Studio 실행
npm run db:studio
```

## 일반적인 문제 해결

### "The column (not available) does not exist" 에러

이 에러는 데이터베이스 스키마가 Prisma 스키마와 동기화되지 않았을 때 발생합니다.

**해결 방법:**

1. Vercel 대시보드에서 재배포 (Redeploy)
2. 또는 수동으로 마이그레이션 실행:
   ```bash
   npm run db:migrate
   ```

### Prisma Client 캐시 문제

```bash
# Prisma Client 캐시 삭제 및 재생성
rm -rf node_modules/.prisma
npx prisma generate
```

### 마이그레이션 생성 (개발 환경)

새로운 모델이나 필드를 추가한 경우:

```bash
# 마이그레이션 생성
npx prisma migrate dev --name add_new_feature

# 프로덕션에 배포 (Vercel에서 자동 실행됨)
git add .
git commit -m "feat: add new feature with migration"
git push
```

## 배포 체크리스트

- [ ] `.env.local`에 모든 환경 변수 설정
- [ ] Vercel에 환경 변수 설정
- [ ] 마이그레이션 테스트 완료
- [ ] `npm run build` 로컬에서 성공
- [ ] `npm run lint` 에러 없음
- [ ] `npm run test` 모든 테스트 통과
- [ ] Vercel에 푸시 및 배포
- [ ] 프로덕션에서 로그인 테스트
- [ ] 데이터베이스 연결 확인

## 추가 리소스

- [Prisma Migrate 문서](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Vercel 배포 가이드](https://vercel.com/docs/deployments/overview)
- [NextAuth 배포 가이드](https://next-auth.js.org/deployment)
