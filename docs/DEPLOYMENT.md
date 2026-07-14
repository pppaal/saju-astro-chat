# 배포 체크리스트 (Production Launch)

## 5개 서비스 (출시 시점)

1. 💬 AI 운세 상담 (`/destiny-counselor`)
2. 🔮 타로 리딩 (`/tarot`)
3. 💞 궁합 분석 (`/compatibility`) — 다각도 + 8 facets + 7 이상형 + Sonnet 12 단락
4. ✨ 정밀 운세 리포트 (`/premium-reports`) — 종합 24,000자 / 테마 14,000-18,000자
5. 📅 운세 캘린더 (`/calendar`)

## 출시 전 필수 작업 (5)

### 1. 환경변수 셋팅 (Production)

```bash
# Vercel / 호스팅 환경에 추가
ANTHROPIC_API_KEY=sk-ant-...      # 필수 — Claude polish + counselor streaming
OPENAI_API_KEY=sk-...              # 선택 — fallback (Claude 실패 시)
DATABASE_URL=postgresql://...      # Prisma DB
NEXTAUTH_URL=https://destinypal.com
NEXTAUTH_SECRET=...
NEXT_PUBLIC_BASE_URL=https://destinypal.com

# Stripe (Premium 결제)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

**ANTHROPIC_API_KEY 없으면:** counselor·report·calendar polish 모두 fallback (raw 또는 emergency text). 사용자 화면 깨짐. **반드시 셋팅.**

### 2. DB Migration 적용

```bash
# Production DB에 적용
npx prisma migrate deploy

# 마이그레이션 목록 (이번 세션에서 추가):
# - 20260501_add_persona_recall_fields (PersonaMemory recentQuestions·decisionsMentioned)
# - 20260501_add_user_decision (UserDecision 테이블)
```

#### 인덱스 추가 시 규칙 — 기존(비어있지 않은) 테이블은 `CONCURRENTLY`

같은 마이그레이션에서 `CREATE TABLE` 한 테이블에 인덱스를 만드는 건 빈 테이블이라
안전하다. 하지만 **이미 프로덕션에 존재하며 행이 있는 테이블**(예: `User`,
`CreditTransaction`, `BonusCreditPurchase`)에 일반 `CREATE INDEX` 를 걸면 빌드
동안 쓰기(INSERT/UPDATE)를 막는 잠금이 걸려 결제·가입 경로가 다운된다.

Prisma Migrate 는 각 `migration.sql` 을 트랜잭션으로 감싸고, `CREATE INDEX
CONCURRENTLY` 는 트랜잭션 안에서 실행할 수 없다(→ apply 시 실패). 따라서 hot
테이블에 인덱스를 추가할 때는:

1. Supabase SQL editor / `psql` 에서 트랜잭션 밖으로 직접 실행:
   `CREATE INDEX CONCURRENTLY IF NOT EXISTS "..." ON "..."(...);`
2. 그런 다음 동일 인덱스를 **일반** `CREATE INDEX IF NOT EXISTS ...` 로 담은
   Prisma 마이그레이션을 커밋 → 이미 존재하므로 no-op, 히스토리만 동기화된다.

**이미 적용된 마이그레이션 파일은 절대 수정하지 않는다** — `_prisma_migrations`
체크섬이 어긋나 다음 `migrate deploy` 가 깨진다. 잘못 만든 인덱스를 고쳐야 하면
새 교정 마이그레이션에서 `DROP INDEX CONCURRENTLY` + 재생성한다.

### 3. 실제 LLM 출력 1회 검증

```bash
# Staging이나 production에서 한 번씩
# A. /destiny-counselor → 폼 입력 → chat 1턴
# B. /premium-reports/themed → 테마 선택 → 리포트 생성
# C. /calendar → 날짜 선택 → action plan
# D. /tarot → 질문 → 카드 → 해석

# 또는 로컬에서:
ANTHROPIC_API_KEY=sk-... npx tsx scripts/probe-llm-output.ts
```

### 4. Build 검증

```bash
npx next build
# (시간 1-2분 걸림. type-check + 정적 페이지 생성)
```

### 5. Stripe 결제 흐름 확인

- premium 카드 클릭 → /pricing → 결제 → 크레딧 차감 → 리포트 생성

---

## 출시 후 모니터링 (1-2주)

### Metrics 추적

- Claude API 비용 (`claude.cost.usd_micro` counter)
- Free → Premium 전환률
- Error rate (Sentry / 로그)
- 페이지별 평균 응답 시간

### 사용자 피드백

- 5-10명 베타 사용자 reaction
- 특히 "어색한 부분" / "이해 안 되는 부분"
- LLM 출력 품질 (예외 케이스)

---

## 비용 예측

### 월 1,000 query 기준

| 항목                                             | 비용/월               |
| ------------------------------------------------ | --------------------- |
| Claude (Haiku 4.5) — counselor + calendar polish | $50-100               |
| Claude (Sonnet 4.5) — premium reports            | $30-80                |
| Vercel hosting                                   | $20 (Pro)             |
| Database (Postgres / Supabase)                   | $0-25                 |
| Stripe fees (3% of revenue)                      | 변동                  |
| **합계**                                         | **$100-225** + Stripe |

### Python backend Docker (제거됨)

- ✓ 더 이상 필요 없음 (이번 세션에서 제거)
- 이전 비용 $30-100/월 절약

---

## 추후 개선 (Phase 2)

### 진짜 ROI 있는 것

- [ ] Sentry / monitoring 셋업
- [ ] Free → Premium A/B test
- [ ] SEO meta tags (각 페이지)
- [ ] Sitemap.xml 자동 생성
- [ ] Open Graph 이미지

### nice-to-have

- [ ] Email 알림 (decision review 시점)
- [ ] PDF 다운로드 (premium report)
- [ ] 친구 초대 / referral
- [ ] 다국어 (영어 prompt 이미 있음)

---

## 응급 대응

### Claude API 다운 시

- 자동으로 fallback skeleton 노출 (calendar polish)
- counselor: "AI 서비스 일시 불가" 메시지
- 사용자 결제 환불 정책 확인

### DB 다운 시

- Prisma 자동 retry
- guest mode 일부 작동 (auth 없이도 destiny-map 가능)

### 비용 폭증 시

- ANTHROPIC_API_KEY 일시 제거 → fallback 모드
- 또는 Anthropic dashboard에서 rate limit
