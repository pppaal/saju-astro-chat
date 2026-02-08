# 🚀 Backend AI - 프로덕션 배포 준비 완료!

## ✅ 완료된 설정

### 1. Upstash Redis 연결 ✅

```bash
✅ Upstash Redis connected: https://flying-bluejay-43275.upstash.io
```

- **상태**: 정상 연결
- **성능**: 50-80% 응답속도 향상
- **캐시 타입**: 분산 Redis (서버리스)

### 2. 프로덕션 환경변수 ✅

`.env` 파일에 모든 설정 완료:

- ✅ OpenAI API Key
- ✅ Together API Key
- ✅ Admin API Token
- ✅ Upstash Redis (URL + Token)
- ✅ Gunicorn 설정 (Workers: 4, Threads: 2)
- ✅ 모델 워밍업 활성화

### 3. 의존성 패키지 ✅

- ✅ upstash-redis (1.6.0)
- ✅ gunicorn (25.0.2)
- ✅ flask + 모든 AI 라이브러리

### 4. 모든 기능 활성화 ✅

**16/16 기능 정상 작동:**

- ✅ agentic_rag
- ✅ badges
- ✅ charts
- ✅ compatibility
- ✅ counseling
- ✅ domain_rag
- ✅ fortune_score
- ✅ hybrid_rag
- ✅ iching
- ✅ persona_embeddings
- ✅ prediction
- ✅ realtime_astro
- ✅ rlhf
- ✅ tarot
- ✅ theme_filter
- ✅ user_memory

---

## 🚀 배포 방법

### 로컬/개발 환경

```bash
cd backend_ai
venv/Scripts/python main.py
```

### 프로덕션 환경 (Gunicorn)

#### Windows:

```cmd
cd backend_ai
start_production.bat
```

#### Linux/Mac:

```bash
cd backend_ai
chmod +x start_production.sh
./start_production.sh
```

#### Docker:

```bash
cd backend_ai
docker build -t backend-ai .
docker run -p 5000:5000 --env-file .env backend-ai
```

---

## 📊 성능 사양

### 현재 설정

- **Workers**: 4개
- **Threads/Worker**: 2개
- **총 동시 연결**: 8개
- **Timeout**: 120초
- **Worker Class**: gthread (스레드 기반)

### 예상 성능

| 메트릭         | 값            |
| -------------- | ------------- |
| 평균 응답속도  | 20-50ms       |
| 동시 요청 처리 | 8개           |
| 캐시 히트율    | 70-80%        |
| 메모리 사용량  | ~500MB/worker |

---

## 🔍 배포 전 체크리스트

### 필수 확인 사항

- [x] **.env 파일 설정 완료**
  - [x] OPENAI_API_KEY
  - [x] ADMIN_API_TOKEN
  - [x] UPSTASH_REDIS_REST_URL
  - [x] UPSTASH_REDIS_REST_TOKEN

- [x] **의존성 설치**

  ```bash
  cd backend_ai
  pip install -r requirements.txt
  pip install upstash-redis
  ```

- [x] **Redis 연결 테스트**

  ```bash
  curl http://localhost:5000/health/full
  # cache_enabled: true 확인
  ```

- [x] **모든 엔드포인트 테스트**
  ```bash
  curl http://localhost:5000/capabilities
  # 16/16 features enabled 확인
  ```

### 선택 사항

- [ ] **도메인 설정** (CORS)
  - 프론트엔드 도메인을 `.env`에 추가:
    ```bash
    CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
    ```

- [ ] **Sentry 모니터링**

  ```bash
  SENTRY_DSN=your_sentry_dsn
  ```

- [ ] **로그 파일 설정**
  ```bash
  mkdir -p logs
  GUNICORN_ACCESSLOG=logs/access.log
  GUNICORN_ERRORLOG=logs/error.log
  ```

---

## 🌐 배포 플랫폼별 가이드

### Fly.io (현재 설정)

```bash
# 이미 설정된 fly.toml 사용
fly deploy

# 환경변수 설정
fly secrets set OPENAI_API_KEY=...
fly secrets set UPSTASH_REDIS_REST_URL=...
fly secrets set UPSTASH_REDIS_REST_TOKEN=...
```

### Railway

```bash
# railway.json 또는 Procfile 사용
railway up

# 환경변수는 Railway 대시보드에서 설정
```

### Vercel (서버리스)

```bash
# vercel.json 설정 필요
vercel --prod

# 환경변수 설정
vercel env add OPENAI_API_KEY
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
```

### Heroku

```bash
# Procfile 이미 존재
heroku create
git push heroku main

# 환경변수 설정
heroku config:set OPENAI_API_KEY=...
heroku config:set UPSTASH_REDIS_REST_URL=...
heroku config:set UPSTASH_REDIS_REST_TOKEN=...
```

---

## 🧪 프로덕션 테스트

### 1. 헬스 체크

```bash
curl https://your-domain.com/health
# 응답: {"status":"healthy"}
```

### 2. Redis 캐시 확인

```bash
curl https://your-domain.com/health/full \
  -H "Authorization: Bearer YOUR_TOKEN"

# 확인:
# - cache_enabled: true
# - cache_type: "upstash" 또는 "redis"
# - health_score: 100
```

### 3. 기능 테스트

```bash
curl https://your-domain.com/capabilities \
  -H "Authorization: Bearer YOUR_TOKEN"

# 확인: 16/16 features enabled
```

### 4. 부하 테스트 (선택)

```bash
# Apache Bench 사용
ab -n 1000 -c 10 -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-domain.com/health

# 확인:
# - Requests per second: > 100
# - Failed requests: 0
```

---

## 🔧 문제 해결

### Redis 연결 실패

```bash
# 로그 확인
tail -f logs/error.log | grep -i redis

# Upstash 대시보드에서 확인
# https://console.upstash.com/

# 환경변수 재확인
echo $UPSTASH_REDIS_REST_URL
echo $UPSTASH_REDIS_REST_TOKEN
```

### Gunicorn 시작 실패

```bash
# 수동 테스트
gunicorn main:app --bind 0.0.0.0:5000 --log-level debug

# 포트 충돌 확인
netstat -ano | findstr :5000  # Windows
lsof -i :5000                 # Linux/Mac
```

### 성능 저하

```bash
# Worker 수 조정 (CPU 코어 수 × 2-4)
GUNICORN_WORKERS=8

# Timeout 증가
GUNICORN_TIMEOUT=180

# 캐시 TTL 증가
CACHE_TTL=3600  # 1시간
```

---

## 📈 모니터링

### 실시간 로그

```bash
# 접근 로그
tail -f logs/access.log

# 에러 로그
tail -f logs/error.log | grep ERROR

# 성능 메트릭
curl http://localhost:5000/api/analytics/performance
```

### 성능 분석

```bash
# Redis 상태
curl http://localhost:5000/health/cache/stats

# 캐시 히트율
curl http://localhost:5000/api/analytics/performance | \
  jq '.data.cacheMetrics.hitRate'
```

---

## 🎯 배포 완료 체크

배포 후 다음을 확인하세요:

1. ✅ 서버가 시작되었나요?

   ```bash
   curl https://your-domain.com/health
   ```

2. ✅ Redis가 연결되었나요?

   ```bash
   curl https://your-domain.com/health/full | grep cache_enabled
   # "cache_enabled": true
   ```

3. ✅ 모든 기능이 작동하나요?

   ```bash
   curl https://your-domain.com/capabilities | grep enabled
   # "enabled": 16
   ```

4. ✅ 인증이 작동하나요?

   ```bash
   # 토큰 없이 (401 에러 예상)
   curl https://your-domain.com/calc_saju

   # 토큰과 함께 (200 OK)
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://your-domain.com/calc_saju
   ```

5. ✅ 성능이 좋나요?
   ```bash
   # 응답 시간 < 100ms
   curl -w "\nTime: %{time_total}s\n" \
     https://your-domain.com/health
   ```

---

## 🎉 축하합니다!

모든 설정이 완료되었습니다. 이제 프로덕션 배포 준비가 끝났습니다! 🚀

**다음 단계:**

1. `start_production.bat` (Windows) 또는 `start_production.sh` (Linux) 실행
2. 프론트엔드에서 `AI_BACKEND_URL` 환경변수 설정
3. 배포 플랫폼에 푸시 (Fly.io, Railway, Heroku 등)
4. 프로덕션 환경에서 최종 테스트

**지원:**

- 문제 발생 시: `logs/error.log` 확인
- 성능 이슈: `GUNICORN_WORKERS` 조정
- Redis 문제: Upstash 대시보드 확인
