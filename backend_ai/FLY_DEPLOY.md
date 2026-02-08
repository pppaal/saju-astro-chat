# 🚀 Fly.io 배포 가이드

## 📋 배포 전 체크리스트

### ✅ 완료된 설정

- [x] Dockerfile 준비 완료
- [x] fly.toml 설정 완료
- [x] requirements.txt 업데이트 (upstash-redis 포함)
- [x] Upstash Redis 설정 완료
- [x] 모든 기능 테스트 완료 (16/16)

---

## 🔑 1단계: Fly.io 환경변수 설정

배포하기 전에 **반드시** 환경변수를 설정해야 합니다!

```bash
cd backend_ai

# 필수 환경변수 설정
fly secrets set OPENAI_API_KEY="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"

fly secrets set TOGETHER_API_KEY="tgp_v1_afRBimIy_litRtsz-xPkSOoR2tvnobJx5iKbki9wZQ4"

fly secrets set ADMIN_API_TOKEN="0a0bd7ccf9e607a4aafb7f5b03b7e0e8bf18ec0c3949b2ee8522b8a5d9d07e69"

# Redis 설정 (성능 향상)
fly secrets set UPSTASH_REDIS_REST_URL="https://flying-bluejay-43275.upstash.io"

fly secrets set UPSTASH_REDIS_REST_TOKEN="AakLAAIncDIwMzdiZTlmMTRhZjY0MTRiODUyYTRiYTVkM2YxZDg5N3AyNDMyNzU"

# 프로덕션 최적화
fly secrets set WARMUP_ON_START="1"
fly secrets set WARMUP_OPTIMIZED="1"
fly secrets set FLASK_ENV="production"
```

### 한 번에 설정하기 (권장)

```bash
# .env 파일에서 자동으로 설정
cd backend_ai

fly secrets import < .env
```

---

## 🚀 2단계: 배포 실행

### 첫 배포 (앱 생성)

```bash
cd backend_ai

# Fly.io 로그인
fly auth login

# 앱 생성 및 배포
fly launch --copy-config --yes

# 또는 기존 설정 사용
fly deploy
```

### 재배포 (업데이트)

```bash
cd backend_ai
fly deploy
```

---

## 📊 3단계: 배포 확인

### 1. 앱 상태 확인

```bash
fly status
```

**예상 출력:**

```
App
  Name     = backend-ai
  Owner    = personal
  Hostname = backend-ai.fly.dev
  Platform = machines

Machines
ID              STATE   REGION  HEALTH
e784079d402008  started nrt     [✓]
```

### 2. 로그 확인

```bash
fly logs

# 실시간 로그
fly logs -f
```

**확인할 로그:**

```
✅ Upstash Redis connected: https://flying-bluejay-43275.upstash.io
✅ OpenAI client initialized with connection pooling
✅ Total 21 routers registered
```

### 3. 헬스 체크

```bash
curl https://backend-ai.fly.dev/health
```

**예상 응답:**

```json
{ "status": "healthy" }
```

### 4. Redis 연결 확인

```bash
curl https://backend-ai.fly.dev/health/full \
  -H "Authorization: Bearer 0a0bd7ccf9e607a4aafb7f5b03b7e0e8bf18ec0c3949b2ee8522b8a5d9d07e69"
```

**확인할 내용:**

```json
{
  "cache_health": {
    "cache_enabled": true,
    "cache_type": "upstash",
    "health_score": 100
  }
}
```

### 5. 기능 확인

```bash
curl https://backend-ai.fly.dev/capabilities \
  -H "Authorization: Bearer 0a0bd7ccf9e607a4aafb7f5b03b7e0e8bf18ec0c3949b2ee8522b8a5d9d07e69"
```

**예상 응답:**

```json
{
  "status": "success",
  "summary": {
    "enabled": 16,
    "disabled": 0,
    "total": 16
  }
}
```

---

## 🔧 4단계: 프론트엔드 연결

### Next.js 환경변수 설정

프로젝트 루트의 `.env.local` 파일 업데이트:

```bash
# Backend AI URL 업데이트
AI_BACKEND_URL="https://backend-ai.fly.dev"
BACKEND_AI_URL="https://backend-ai.fly.dev"
NEXT_PUBLIC_AI_BACKEND="https://backend-ai.fly.dev"
```

### Vercel 배포 시

```bash
vercel env add AI_BACKEND_URL
# 값: https://backend-ai.fly.dev

vercel env add BACKEND_AI_URL
# 값: https://backend-ai.fly.dev
```

---

## 🎯 성능 최적화 (선택사항)

### VM 크기 조정

현재 설정: `shared-cpu-2x` (2 vCPU, 4GB RAM)

더 많은 트래픽 예상 시:

```bash
# fly.toml에서 수정
[[vm]]
  size = "shared-cpu-4x"  # 4 vCPU, 8GB RAM
  memory = "8192mb"
```

### Worker 수 조정

```bash
# fly.toml에서 수정
[env]
  GUNICORN_WORKERS = "2"  # CPU 코어 수에 맞게
  GUNICORN_THREADS = "4"
```

재배포:

```bash
fly deploy
```

---

## 📈 모니터링

### 실시간 메트릭

```bash
fly dashboard
```

### CPU/메모리 사용량

```bash
fly status --all
```

### 성능 분석

```bash
curl https://backend-ai.fly.dev/api/analytics/performance \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔍 문제 해결

### 배포 실패 시

```bash
# 로그 확인
fly logs

# 앱 재시작
fly apps restart backend-ai

# 스케일 조정
fly scale count 1
```

### Redis 연결 실패 시

```bash
# 환경변수 확인
fly secrets list

# Redis 재설정
fly secrets set UPSTASH_REDIS_REST_URL="..."
fly secrets set UPSTASH_REDIS_REST_TOKEN="..."

# 재배포
fly deploy
```

### 메모리 부족 시

```bash
# VM 크기 증가
fly scale vm shared-cpu-4x

# 또는 fly.toml 수정 후
fly deploy
```

---

## 🚨 롤백

문제 발생 시 이전 버전으로 롤백:

```bash
# 배포 이력 확인
fly releases

# 이전 버전으로 롤백
fly releases rollback <version>
```

---

## 📞 배포 후 체크리스트

- [ ] `fly status` - 앱 실행 확인
- [ ] `fly logs` - 에러 없는지 확인
- [ ] `/health` - 헬스 체크 성공
- [ ] `/health/full` - Redis 연결 확인
- [ ] `/capabilities` - 16/16 기능 확인
- [ ] 프론트엔드 연결 테스트
- [ ] 실제 API 호출 테스트

---

## 🎉 완료!

배포가 완료되면:

1. **백엔드 URL**: `https://backend-ai.fly.dev`
2. **프론트엔드에서 사용**: `.env.local`에 추가
3. **모니터링**: `fly dashboard`

---

## 📝 빠른 명령어 참조

```bash
# 배포
fly deploy

# 로그 보기
fly logs -f

# 상태 확인
fly status

# 앱 재시작
fly apps restart backend-ai

# SSH 접속
fly ssh console

# 환경변수 보기
fly secrets list

# 스케일 조정
fly scale count 2  # 인스턴스 2개
fly scale vm shared-cpu-4x  # VM 크기 변경
```

---

## 🔗 유용한 링크

- **Fly.io 대시보드**: https://fly.io/dashboard
- **앱 URL**: https://backend-ai.fly.dev
- **문서**: https://fly.io/docs/

---

**준비되셨나요? 배포 시작하세요!** 🚀

```bash
cd backend_ai
fly deploy
```
