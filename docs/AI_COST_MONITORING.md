# AI 비용 모니터링 & 최적화 가이드

Last updated: 2026-05-06 (Asia/Hong_Kong)

## 1. 현재 스택

- 단일 프로바이더: **Anthropic Claude** (`@anthropic-ai/sdk`)
- 호출 경로: Next.js API 라우트 → Anthropic API 직접
- Python backend `backend_ai`는 2026-05-06 폐기 (별도 LLM 비용 없음)

## 2. 모델별 단가 (USD / 1M tokens)

| 모델 ID | Input | Output | Cache Read | 용도 |
| --- | ---: | ---: | ---: | --- |
| `claude-haiku-4-5-20251001` | $1 | $5 | $0.10 | 기본 — 캘린더, 상담사, 사주, 점성, 타로, summarize |
| `claude-sonnet-4-5-20250929` | $3 | $15 | $0.30 | 프리미엄 — 궁합 narrative, AI 리포트(품질 모드), cross-rules LLM |
| `claude-opus-4-7` | $15 | $75 | $1.50 | 최상급 — 테마 angles AI (premium 리포트 8각도) |

단가 표는 `src/lib/llm/claude.ts` `CLAUDE_PRICING` 상수가 source of truth. 가격 변경 시 그곳도 갱신.

## 3. 호출처별 모델 + 토큰 한도

| 라우트 / 모듈 | 모델 | maxTokens | 비고 |
| --- | --- | ---: | --- |
| `api/destiny-map/chat-stream` (상담사) | Haiku | 2500 | 스트리밍 |
| `api/calendar/ai-monthly`, `ai-narrative` | Haiku | 800 | 짧은 풀이 |
| `lib/llm/calendarNarrativePolish` | Haiku | 2000 | 텍스트 윤문 |
| `api/saju/route` | Haiku | 3500 | 사주 풀이 |
| `api/astrology/route` | Haiku | 2500 | 점성 풀이 |
| `api/tarot/interpret` | Haiku | 900~2400 | 5단계 호출 (개선 여지) |
| `api/tarot/interpret-stream` | Haiku | — | 스트리밍 |
| `lib/Tarot/questionEngineV2` | Haiku | 420 | 질문 분류 (작음) |
| `lib/ai/summarize` | Haiku | 500 | 요약 |
| `api/compatibility/chat` | Haiku | 2000 | |
| `api/compatibility/counselor` | Haiku | 3500 | |
| `api/compatibility/narrative-stream` | **Sonnet** | 16000 | 프리미엄 궁합 |
| `lib/destiny-matrix/ai-report/aiBackend` | Sonnet (quality) / Haiku (fast) | 5k~32k | 플랜별 |
| `lib/destiny-matrix/ai-report/themeAnglesAI` | **Opus 4.7** | 16000 | 8각도 × 6테마, paywall + rate limit 적용 |
| `lib/fortune/cross-rules/llmRenderer`, `chat` | Sonnet | 1200~4000 | |

## 4. 비용 절감 메커니즘 (적용된 것)

### 4-1. 시스템 프롬프트 캐싱
모든 `callClaude*` 경로의 system 블록은 `cache_control: { type: 'ephemeral' }` 자동 적용.
- 첫 호출: cache_creation 단가 (input × 1.25)
- 이후 5분 내 동일 시스템 프롬프트: **cache_read 단가 (input × 0.1)** — **90% 할인**

코드: `src/lib/llm/claude.ts` `callClaude` / `callClaudeStream`.

### 4-2. User 컨텍스트 캐싱 (선택적)
`CallClaudeOptions.cachedUserContext`로 큰 + 거의 정적인 user 블록 (차트 데이터, signals JSON 등)을 별도 캐시 블록으로 분리 가능.

```ts
await callClaude({
  systemPrompt: SYSTEM,
  cachedUserContext: bigChartFacts,  // 같은 유저의 여러 호출에 걸쳐 재사용
  userPrompt: dynamicQuestion,
  // ...
})
```

적용처:
- `themeAnglesAI` — 차트/signals/cross matrix를 cached block으로, 테마별 instruction만 dynamic block으로 분할 → 6개 테마 호출 중 5번이 cache_read 단가 (≈ 80% 입력 토큰 비용 절감, Opus 4.7에서 큰 절감액)

미적용 (잠재 절감 후보):
- 상담사 multi-turn (`destiny-map/chat-stream`) — 차트 facts + 대화 히스토리를 cached로 분리하면 여러 턴 호출 절감
- 궁합 narrative-stream — 두 사람 차트 데이터가 큼

### 4-3. 모델 티어 분리
- 기본 Haiku 4.5 ($1/$5) — 사용량 큰 일상 호출
- 프리미엄 라우트만 Sonnet/Opus 격상 (paywall 가드 필수)

### 4-4. maxTokens 작업별 튜닝
`tarot/questionEngineV2` 420, `calendar/ai-monthly` 800 같이 짧은 출력은 짧게 잡음.

### 4-5. Paywall + Rate limit
- `theme-angles` (Opus 4.7, $1.20+/회) → `withApiMiddleware + createAuthenticatedGuard` (분당 6회/유저)
- `ai-report` (플랜별 토큰) → 크레딧 차감
- 그 외 비용 큰 라우트는 인증 + rate limit 필수

## 5. 메트릭 + 알람

### 자동 기록 (`src/lib/llm/claude.ts`)

매 Claude 호출 후 다음 카운터 emit:

```
claude.tokens.input      { model, label }
claude.tokens.output     { model, label }
claude.tokens.cache_read { model, label }
claude.cost.usd_micro    { model, label }   # USD * 1,000,000 (정수)
```

또 `recordExternalCall(provider='anthropic', model, status, durationMs, tokens)` 호출.

### 대시보드 접근

- 관리자 대시보드: `/admin/dashboard` (`src/app/admin/dashboard/page.tsx`)
- 환경변수: `ADMIN_EMAILS=email1@example.com,email2@example.com`

대시보드는 60초마다 자동 갱신, 서비스별 P95 latency / 에러율 / 외부 호출 통계 표시.

### 비용 알람 임계 (제안)

- 일일 USD 합계 > $50 → Slack/이메일 경고
- 시간당 cache_read 비율 < 30% → 시스템 프롬프트가 자주 바뀌고 있다는 신호 (캐싱 무효화)
- Opus 4.7 호출 수 > 100/시간 → theme-angles 가드 우회 시도 가능성

(현재 알람 자동화는 미설정 — `src/lib/metrics/index.ts`의 카운터 polling 또는 외부 모니터링 도구 wiring 필요)

## 6. 비용 점검 체크리스트 (월 1회)

- [ ] `claude.cost.usd_micro` 월 합계 vs Anthropic 콘솔 청구액 일치 확인
- [ ] 라벨별 비용 분포 — 한 라벨이 70% 넘으면 그 경로 점검
- [ ] cache_read 비율 — 50% 미만이면 시스템 프롬프트 재검토
- [ ] Opus 4.7 호출 추이 — premium 사용자 증가 vs 우회 호출 구분
- [ ] 신규 라우트 추가 시 본 문서 표 갱신

## 7. 추가 개선 여지 (P1/P2)

| 항목 | 절감 잠재 | 작업량 |
| --- | --- | --- |
| 상담사 chat-stream에 cachedUserContext 적용 | 차트 facts 5~10k 토큰을 multi-turn 캐시 → 큰 절감 | 1~2시간 |
| 궁합 narrative-stream 캐싱 | 두 사람 차트 데이터 캐시 | 1시간 |
| Anthropic Batch API (스케줄 작업) | 50% 추가 할인 | 2~3시간 |
| Tarot interpret 5회 호출 통합 | 호출 횟수 감소 | 2시간 |

## 8. 재발 방지 가드

- 새 LLM 호출은 **반드시** `callClaude*` 공유 wrapper 통과 (raw fetch 금지) — 캐싱·메트릭이 자동 적용됨
- 예외: `themeAnglesAI` (Opus thinking 옵션 때문에 raw fetch). 이 경우에도 `cache_control` 명시 + 수동으로 메트릭 기록 필요
- 모델 ID는 하드코딩하지 말고 `CLAUDE_PRICING` 키 또는 `DEFAULT_CLAUDE_MODEL` / `PREMIUM_CLAUDE_MODEL` 상수 사용 — 오타 방지 (`claude-sonnet-4-6` 같은 존재 안 하는 ID 사고 재발 방지)
