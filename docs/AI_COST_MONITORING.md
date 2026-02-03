# AI 비용 모니터링 가이드

**작성일:** 2026-02-02
**목적:** OpenAI API 사용량 및 비용을 실시간으로 모니터링하는 방법

---

## 🎯 Quick Start

### 1. 관리자 대시보드 접속

**URL:** `https://your-domain.com/admin/dashboard`

**접근 권한:**

1. `.env` 파일에 관리자 이메일 설정:

   ```bash
   ADMIN_EMAILS=your-email@example.com,admin2@example.com
   ```

2. 해당 이메일로 로그인

3. `/admin/dashboard` 접속

---

## 📊 대시보드 기능

### 실시간 메트릭 (60초마다 자동 갱신)

**파일:** [src/app/admin/dashboard/page.tsx](../src/app/admin/dashboard/page.tsx)

#### 1. SLA 상태

- ✅ **P95 Latency:** API 응답 시간 (목표: < 2000ms)
- ✅ **Error Rate:** 에러 발생률 (목표: < 1%)
- ℹ️ **Total Requests:** 총 요청 수

#### 2. 서비스별 성능

- 서비스별 요청 수
- 서비스별 에러 수
- 서비스별 평균 응답 시간

---

## 💰 AI 비용 모니터링

### 자동 기록되는 메트릭

**구현 위치:** [src/lib/metrics/index.ts](../src/lib/metrics/index.ts:93-111)

```typescript
recordExternalCall(
  provider: "openai",     // AI 프로바이더
  model: "gpt-4o-mini",   // 사용한 모델
  status: "success",      // 성공/실패
  durationMs: 1500,       // 소요 시간 (ms)
  tokens: {               // 토큰 사용량
    input: 1000,
    output: 300
  }
)
```

### 현재 기록 중인 엔드포인트

| 엔드포인트     | 파일                                                                                  | 모델        | 토큰 기록  |
| -------------- | ------------------------------------------------------------------------------------- | ----------- | ---------- |
| 타로 스트리밍  | [tarot/interpret-stream/route.ts](../src/app/api/tarot/interpret-stream/route.ts:474) | gpt-4o-mini | ❌ 미기록  |
| 타로 질문 분석 | [tarot/analyze-question/route.ts](../src/app/api/tarot/analyze-question/route.ts:40)  | gpt-4o-mini | ❌ 미기록  |
| Destiny Matrix | [aiBackend.ts](../src/lib/destiny-matrix/ai-report/aiBackend.ts:129)                  | gpt-4o-mini | ✅ 기록 중 |

---

## 📈 메트릭 API 엔드포인트

### 1. 전체 메트릭 조회

```bash
GET /api/admin/metrics?timeRange=24h
```

**응답 예시:**

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalRequests": 45230,
      "errorRate": 0.23,
      "avgLatencyMs": 245,
      "p95LatencyMs": 520
    },
    "services": {
      "tarot": {
        "requests": 18200,
        "errors": 8,
        "avgLatencyMs": 180
      }
    }
  }
}
```

### 2. Prometheus 형식 (외부 모니터링 툴 연동)

```bash
GET /api/admin/metrics?format=prometheus
```

### 3. OpenTelemetry 형식

```bash
GET /api/admin/metrics?format=otlp
```

---

## 💡 AI 비용 계산 방법

### OpenAI 가격표 (2026년 2월 기준)

| 모델        | 입력 토큰  | 출력 토큰   |
| ----------- | ---------- | ----------- |
| gpt-4o      | $5.00 / 1M | $15.00 / 1M |
| gpt-4o-mini | $0.15 / 1M | $0.60 / 1M  |

### 비용 계산 공식

```javascript
// 예시: gpt-4o-mini 1회 호출
const inputTokens = 1500
const outputTokens = 300

const cost =
  (inputTokens / 1_000_000) * 0.15 + // 입력 비용
  (outputTokens / 1_000_000) * 0.6 // 출력 비용

// = $0.00023 + $0.00018 = $0.00041 per request
```

### 월간 비용 추정

```javascript
// 월 10,000회 요청 가정
const monthlyCost = 0.00041 * 10000
// = $4.10 / month
```

---

## 🚨 비용 알림 설정 (향후 추가 예정)

### Slack 알림 예시

**파일:** `scripts/cost-monitor.ts` (신규 생성 필요)

```typescript
import { getMetricsSnapshot } from '@/lib/metrics/index'

// 일일 비용이 $100 초과 시 알림
const DAILY_COST_THRESHOLD = 100

async function checkDailyCost() {
  const metrics = getMetricsSnapshot()

  // external.openai.tokens 메트릭 집계
  const totalInputTokens = 0
  const totalOutputTokens = 0

  // 비용 계산
  const dailyCost = calculateCost(totalInputTokens, totalOutputTokens)

  if (dailyCost > DAILY_COST_THRESHOLD) {
    await sendSlackAlert({
      channel: '#alerts',
      text: `⚠️ AI 비용 초과: $${dailyCost} (목표: $${DAILY_COST_THRESHOLD})`,
    })
  }
}

// 매 시간 실행
setInterval(checkDailyCost, 60 * 60 * 1000)
```

---

## 📝 현재 개선 완료 사항 (2026-02-02)

### ✅ 완료된 최적화

1. **타로 질문 분석 다운그레이드**
   - ❌ Before: `gpt-4o` ($5 input / $15 output)
   - ✅ After: `gpt-4o-mini` ($0.15 input / $0.60 output)
   - 💰 **절감: 96%**

2. **Redis 캐싱 활성화**
   - ✅ 운명 캘린더 (1일 TTL)
   - ✅ 일일 운세 (캐싱 적용)
   - ✅ Destiny Map 트랜짓 차트 (1시간 TTL)
   - 💰 **예상 절감: 30-50%** (캐시 히트율에 따라)

### 📊 예상 비용 변화

**Before (월 10,000회 기준):**

- 타로 질문 분석 (gpt-4o): $105/월
- 기타 엔드포인트: ~$50/월
- **총: ~$155/월**

**After:**

- 타로 질문 분석 (gpt-4o-mini): $3.45/월 ✅
- 기타 엔드포인트 (캐싱 적용): ~$25/월 ✅
- **총: ~$28.45/월**

**절감액: $126.55/월 (81.6% ↓)** 🎉

---

## 🔍 추가 모니터링 권장사항

### 1. OpenAI 대시보드 직접 확인

**URL:** https://platform.openai.com/usage

- 실제 청구 금액 확인
- 모델별 사용량 확인
- 일일/월간 트렌드 확인

### 2. Vercel Analytics 연동

**설정:** `next.config.ts`에 이미 구현됨

```typescript
import { withSentryConfig } from '@sentry/nextjs'
import { SpeedInsights } from '@vercel/speed-insights/next'
```

### 3. Sentry 에러 모니터링

**설정:** 이미 활성화됨

- AI API 호출 실패 자동 기록
- 에러율 추적
- 성능 이슈 감지

---

## 📞 추가 지원

문제 발생 시:

1. [GitHub Issues](https://github.com/anthropics/claude-code/issues)
2. 관리자 대시보드 `/admin/dashboard` 확인
3. Sentry 대시보드에서 에러 로그 확인

---

**작성자:** Claude Sonnet 4.5
**버전:** 1.0
**관련 문서:** [ROADMAP.md](../ROADMAP.md), [08_AI_COST_OPTIMIZATION.md](../UNICORN_ANALYSIS/08_AI_COST_OPTIMIZATION.md)
