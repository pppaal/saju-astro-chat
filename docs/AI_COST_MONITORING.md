# AI 비용 모니터링 가이드

Last audited: 2026-06-15 (Asia/Hong_Kong)

이 문서는 코드에서 **실제로 확인된** 것만 기술한다. 구현되지 않은 것은
"미구현"으로 명시한다.

## 1. 스택

- 단일 LLM 프로바이더: **Anthropic Claude** (raw HTTP, `@anthropic-ai/sdk` 미사용)
- 호출 경로: Next.js API 라우트/lib → `https://api.anthropic.com/v1/messages` 직접 fetch
- 모든 호출은 공유 wrapper `src/lib/llm/claude.ts` 의 `callClaude` / `callClaudeStream`
  를 통과한다. 두 함수가 토큰/비용 메트릭을 자동 기록한다.

## 2. 사용 모델 (코드 확인)

`src/lib/llm/claude.ts` 기준 — 두 모델만 정의/사용된다.

| 상수                   | 모델 ID                      | 용도                                     |
| ---------------------- | ---------------------------- | ---------------------------------------- |
| `DEFAULT_CLAUDE_MODEL` | `claude-haiku-4-5-20251001`  | 기본 — 대부분의 호출                     |
| `PREMIUM_CLAUDE_MODEL` | `claude-sonnet-4-5-20250929` | 프리미엄 — 명시적으로 격상한 일부 라우트 |

`ClaudeModel` 타입이 이 두 ID 로 제한되어 있어, 그 외 모델은 타입 레벨에서 막힌다.
모델을 지정하지 않으면 `DEFAULT_CLAUDE_MODEL` (Haiku) 이 쓰인다.

Sonnet (premium) 을 명시적으로 쓰는 라우트 (코드 확인):

- `src/app/api/tarot/interpret-stream/route.ts`
- `src/app/api/counselor/realtime/route.ts`
- `src/app/api/compatibility/counselor/route.ts`

> 참고: 위 ID 는 코드에 하드코딩된 현재 값이다. 모델을 올리거나 바꾸려면
> `claude.ts` 의 `CLAUDE_PRICING`, `ClaudeModel`, `DEFAULT/PREMIUM_CLAUDE_MODEL`,
> `MIN_CACHE_PREFIX_TOKENS` 네 곳을 함께 갱신해야 한다.

## 3. 단가 (source of truth)

`src/lib/llm/claude.ts` 의 `CLAUDE_PRICING` 상수가 단가의 single source of truth.
가격이 바뀌면 그곳을 갱신해야 한다.

| 모델 ID                      | Input ($/1M) | Output ($/1M) | Cache Read ($/1M) |
| ---------------------------- | -----------: | ------------: | ----------------: |
| `claude-haiku-4-5-20251001`  |           $1 |            $5 |             $0.10 |
| `claude-sonnet-4-5-20250929` |           $3 |           $15 |             $0.30 |

USD 비용은 `calculateUsdCost(model, input, output, cacheRead)` 가 위 표로 계산한다.
알 수 없는 모델 ID 가 들어오면 Haiku 단가로 fallback 한다. (cache **creation**
토큰은 비용 계산식에 포함되지 않는다 — input/output/cache_read 만 합산한다.)

## 4. 토큰 측정

`callClaude` 와 `callClaudeStream` 모두 Anthropic 응답의 `usage` 를 읽어 토큰을 반환/기록한다.

- 비스트리밍 (`callClaude`): `CallClaudeResult` 로 `inputTokens`, `outputTokens`,
  `cacheReadTokens`, `cacheCreateTokens` 반환.
- 스트리밍 (`callClaudeStream`): `message_start` 이벤트에서 input/cache_read/cache_create,
  `message_delta` 이벤트에서 output 토큰을 누적. (반환 스트림은 텍스트만 흘리고,
  토큰은 내부에서 메트릭으로만 기록한다.)

읽는 `usage` 필드: `input_tokens`, `output_tokens`, `cache_read_input_tokens`,
`cache_creation_input_tokens`.

## 5. 프롬프트 캐싱

- 모든 호출의 system 블록에 `cache_control: { type: 'ephemeral', ttl: '1h' }` 자동 적용.
- TTL 1시간 확장은 베타 헤더 `extended-cache-ttl-2025-04-11` 로 활성화 (기본 ephemeral 은 5분).
- `cachedUserContext` 옵션으로 큰 + 거의 정적인 user-side 컨텍스트(차트 데이터 등)를
  별도 cached block 으로 분리 가능 (별도 cache_control breakpoint).
- `priorTurns` (멀티턴) 사용 시 마지막 prior turn 에도 breakpoint 를 찍어 대화 히스토리를
  cache read 로 재사용. breakpoint 는 최대 3개(system + cachedUserContext + 마지막 턴)
  로 Anthropic 한도(4) 이내.
- 모델별 최소 캐시 prefix: Haiku 4096 토큰, Sonnet 1024 토큰 (`MIN_CACHE_PREFIX_TOKENS`).
  이보다 짧으면 cache_control 을 달아도 조용히 캐시되지 않는다.

## 6. 비용 로깅 / 메트릭 (어디까지 구현되어 있나)

**중요: LLM 비용/토큰을 영구 저장하는 DB 테이블은 없다.** `prisma/schema.prisma`
에는 토큰·비용·LLM usage 원장이 없다. 크레딧 원장(`CreditTransaction`,
`UserCredits`, `BonusCreditPurchase`)은 있지만 이는 결제·크레딧 추적용이며
LLM 토큰 비용과는 무관하다.

LLM 비용 가시성은 **프로세스 메모리 내 메트릭 카운터**로만 존재한다
(`src/lib/metrics.ts` — in-memory `counters`/`timings`/`gauges` 객체). 프로세스
재시작 시 초기화된다. 매 Claude 호출 후 emit 되는 카운터:

```
claude.tokens.input          { model, label }
claude.tokens.output         { model, label }
claude.tokens.cache_read     { model, label }
claude.cache.hit_ratio_x1000 { model, label }
claude.cost.usd_micro        { model, label }   # 비스트리밍만 — USD * 1,000,000 정수
```

추가로 매 호출마다 `recordExternalCall('anthropic', model, status, 0, {input, output})`
가 호출되어 다음을 emit 한다:

```
external.anthropic.request   { model, status }
external.anthropic.duration  { model }
external.anthropic.tokens    { model, type: 'input' | 'output' }
```

> 차이 주의: `claude.cost.usd_micro` 는 **비스트리밍 (`callClaude`) 경로에서만**
> emit 된다. 스트리밍 경로(`callClaudeStream`)는 토큰·cache 카운터와
> `recordExternalCall` 은 기록하지만 `usd_micro` 카운터는 기록하지 않는다.

로그(logger) 기록도 매 호출 발생:

- `[label] Claude usage` / `Claude stream usage` — input/output/cacheRead/cacheCreate/cacheHitRatio/model
- 큰 prefix 인데 cache hit ratio < 5% 이고 cacheCreate=0 이면
  `Claude cache miss on large prefix` 경고 (silent invalidator 신호)
- 1회 호출 비용 > $0.10 이면 `Claude high-cost call` 경고 (비스트리밍 경로만)

메트릭은 `getMetricsSnapshot()`, `toPrometheus()`, `toOtlp()` 로 노출 가능
(`src/lib/metrics/index.ts` re-export). 외부 모니터링은 이 스냅샷을 scrape 해야 한다.

### 대시보드

- 관리자 대시보드: `/admin/dashboard` (`src/app/admin/dashboard/page.tsx`).
  서비스별 외부 호출/latency/에러 통계를 표시한다.

## 7. 크레딧과 LLM 비용의 관계

크레딧 시스템은 LLM 토큰 비용과 **분리되어** 있다 (`src/lib/credits/`,
`src/lib/config/pricing.ts`).

- 과금 단위: **질문 1개 = 크레딧 1개**. reading / compatibility / followUp 구분 없이
  모두 일반 크레딧 1개씩 소비 (`consumeCredits`). 구독 플랜·기능 게이트는 폐지됨.
- 크레딧 가격은 `CREDIT_PACKS` (`src/lib/config/pricing.ts`) 에 고정 — 팩별 KRW/USD.
- 즉, 한 질문이 내부적으로 Claude 를 몇 번 호출하든(예: 멀티 스텝), 또 input/output
  토큰이 얼마든, 사용자에게는 크레딧 1개로 일정하게 청구된다. 크레딧 차감 로직은
  실제 토큰 비용(`claude.cost.usd_micro`)을 참조하지 않는다.
- 따라서 "크레딧 매출"과 "Claude 비용"은 별개의 두 수치이며, 마진은 위 두 가지를
  각각 집계해 비교해야 한다 (자동 대조 기능은 미구현).

## 8. 미구현 / 주의

- LLM 토큰·비용의 **영구 저장 없음** — 메트릭은 in-memory, 프로세스 재시작 시 소실.
  월 누적 비용을 보려면 외부 모니터링(Prometheus/OTLP scrape)으로 메트릭을
  지속화해야 한다.
- **비용 알람 자동화 없음** — 임계 초과 시 로그 경고만 남고, Slack/이메일 등
  알림 연동은 없다.
- **크레딧↔실비용 자동 대조 없음** — 마진 점검은 수동.

## 9. 가드 (재발 방지)

- 새 LLM 호출은 반드시 `callClaude*` 공유 wrapper 를 통과시킬 것 (raw fetch 직접 금지)
  — 캐싱·토큰 메트릭·비용 로깅이 자동 적용되는 유일한 경로다.
- 모델 ID 는 하드코딩하지 말고 `DEFAULT_CLAUDE_MODEL` / `PREMIUM_CLAUDE_MODEL` 상수
  또는 `CLAUDE_PRICING` 키를 사용할 것 (타입 `ClaudeModel` 로 강제됨).
- 단가/모델 변경 시 `claude.ts` 의 `CLAUDE_PRICING` · `ClaudeModel` ·
  `DEFAULT/PREMIUM_CLAUDE_MODEL` · `MIN_CACHE_PREFIX_TOKENS` 를 함께 갱신할 것.
