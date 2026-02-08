# 🚀 Backend AI - Fly.io 배포 가이드

## ⚡ 가장 빠른 배포 방법 (3단계!)

### 방법 1: PowerShell 스크립트 (추천! 🌟)

```powershell
cd backend_ai
.\deploy.ps1
```

**자동으로 처리:**

- ✅ Fly CLI 확인 및 설치
- ✅ 로그인 확인
- ✅ 환경변수 자동 설정
- ✅ 빌드 & 배포
- ✅ 헬스 체크

---

### 방법 2: 배치 파일 (Windows)

```cmd
cd backend_ai
deploy.bat
```

---

### 방법 3: 수동 배포 (3개 명령어)

```bash
cd backend_ai

# 1. 환경변수 설정
fly secrets import < .env

# 2. 배포
fly deploy

# 3. 확인
fly status
```

---

## 📋 배포 전 준비사항

### ✅ 이미 완료된 것들

- [x] Upstash Redis 설정
- [x] 환경변수 파일 (.env)
- [x] Docker 설정
- [x] Fly.io 설정 (fly.toml)
- [x] 모든 의존성 설치
- [x] 16/16 기능 테스트 완료

### 🔍 확인만 하면 되는 것

- [ ] Fly CLI 설치 확인: `fly version`
- [ ] Fly.io 계정 로그인: `fly auth login`

---

## 🎯 배포 후 확인

### 1. 헬스 체크

```bash
curl https://backend-ai.fly.dev/health
```

✅ 응답: `{"status":"healthy"}`

### 2. Redis 연결 확인

```bash
curl https://backend-ai.fly.dev/health/full \
  -H "Authorization: Bearer 0a0bd7ccf9e607a4aafb7f5b03b7e0e8bf18ec0c3949b2ee8522b8a5d9d07e69"
```

✅ `"cache_enabled": true` 확인

### 3. 기능 확인

```bash
curl https://backend-ai.fly.dev/capabilities \
  -H "Authorization: Bearer 0a0bd7ccf9e607a4aafb7f5b03b7e0e8bf18ec0c3949b2ee8522b8a5d9d07e69"
```

✅ `"enabled": 16, "total": 16` 확인

---

## 🔗 프론트엔드 연결

프로젝트 루트의 `.env.local` 파일 수정:

```bash
AI_BACKEND_URL=https://backend-ai.fly.dev
BACKEND_AI_URL=https://backend-ai.fly.dev
NEXT_PUBLIC_AI_BACKEND=https://backend-ai.fly.dev
```

---

## 📁 배포 관련 파일

| 파일                    | 설명                                       |
| ----------------------- | ------------------------------------------ |
| **deploy.ps1** ⭐       | PowerShell 자동 배포 스크립트 (가장 쉬움!) |
| **deploy.bat**          | Windows 배치 배포 스크립트                 |
| **deploy.sh**           | Linux/Mac 배포 스크립트                    |
| **🚀배포명령어.txt**    | 복사-붙여넣기용 명령어 모음                |
| **배포하기.md**         | 초간단 가이드 (5분)                        |
| **FLY_DEPLOY.md**       | 상세 배포 가이드                           |
| **PRODUCTION_READY.md** | 프로덕션 준비 완료 문서                    |

---

## 🎯 배포 체크리스트

### 배포 전

- [x] ✅ Upstash Redis 설정
- [x] ✅ .env 파일 준비
- [x] ✅ requirements.txt 업데이트 (upstash-redis)
- [ ] ⏭️ Fly CLI 설치 확인
- [ ] ⏭️ Fly.io 로그인

### 배포 중

- [ ] ⏭️ 환경변수 설정: `fly secrets import < .env`
- [ ] ⏭️ 배포 실행: `fly deploy`
- [ ] ⏭️ 로그 확인: `fly logs -f`

### 배포 후

- [ ] ⏭️ 헬스 체크: `/health`
- [ ] ⏭️ Redis 연결: `/health/full`
- [ ] ⏭️ 기능 확인: `/capabilities`
- [ ] ⏭️ 프론트엔드 연결
- [ ] ⏭️ 실제 API 테스트

---

## 📊 배포된 서버 사양

```yaml
Region: Tokyo (nrt)
VM Size: shared-cpu-2x
Memory: 4GB
Workers: 1
Threads: 4
Timeout: 120s
```

### 예상 성능

- 동시 처리: 4-8개 요청
- 평균 응답: 20-50ms
- Redis 캐시: 활성화
- 자동 스케일: 지원

---

## 🔧 유용한 명령어

```bash
# 로그 실시간 보기
fly logs -f

# 앱 재시작
fly apps restart backend-ai

# 상태 확인
fly status

# 환경변수 보기
fly secrets list

# 대시보드 열기
fly dashboard

# SSH 접속
fly ssh console

# 스케일 조정
fly scale count 2          # 인스턴스 2개
fly scale vm shared-cpu-4x  # VM 크기 증가
```

---

## 🚨 문제 해결

### 배포 실패 시

```bash
# 로그 확인
fly logs

# 환경변수 재설정
fly secrets import < .env

# 재배포
fly deploy
```

### Redis 연결 실패 시

```bash
# 환경변수 확인
fly secrets list | grep REDIS

# Redis 재설정
fly secrets set UPSTASH_REDIS_REST_URL="..."
fly secrets set UPSTASH_REDIS_REST_TOKEN="..."
```

### 롤백

```bash
# 배포 이력 확인
fly releases

# 이전 버전으로 롤백
fly releases rollback <version>
```

---

## 🌟 배포 성공 시나리오

```bash
# 1. 스크립트 실행
.\deploy.ps1

# 2. 환경변수 자동 설정됨
✅ 환경변수 설정 완료

# 3. 빌드 & 배포 (3-5분)
✅ 배포 완료!

# 4. 자동 헬스 체크
✅ 헬스 체크 성공!

# 5. 프론트엔드 연결
.env.local 업데이트

# 6. 완료! 🎉
```

---

## 🎉 배포 완료!

**백엔드 URL**: https://backend-ai.fly.dev

**다음 단계:**

1. ✅ 프론트엔드 `.env.local` 업데이트
2. ✅ 프론트엔드 배포: `vercel --prod`
3. ✅ 전체 시스템 테스트

**모니터링:**

- 대시보드: https://fly.io/dashboard
- 로그: `fly logs -f`
- 메트릭: https://backend-ai.fly.dev/api/analytics/performance

---

## 📞 지원

- **문제 발생 시**: `fly logs`로 로그 확인
- **성능 이슈**: `fly scale vm shared-cpu-4x`로 업그레이드
- **환경변수 변경**: `fly secrets set KEY=VALUE`

---

**준비되셨나요? 배포 시작!** 🚀

```powershell
.\deploy.ps1
```
