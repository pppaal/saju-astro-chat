# Credit System Redesign: Mutable Counter → Ledger SSOT

> **Status**: Planning / design proposal — not yet implemented.
> **Goal**: 잔액(balance)의 source of truth 를 `UserCredits` 의 가변 카운터
> (`monthlyCredits` / `usedCredits` / `bonusCredits`)에서 **`CreditTransaction`
> 원장(ledger)의 합**으로 옮겨, 구조적으로 balance drift 를 제거한다.
> **Non-goal**: 가격 정책(`pricing.ts`), 만료 기간(90일/3개월), bonus-first 소비
> 순서 같은 비즈니스 룰 변경 — 이 문서는 *데이터 모델*만 다룬다.

---

## 0. Why — 현재 모델의 구조적 문제

오늘 잔액은 `creditService.getCreditBalance()` 에서 이렇게 계산된다
(`src/lib/credits/creditService.ts:150`):

```ts
const remaining = credits.monthlyCredits - credits.usedCredits + credits.bonusCredits
```

즉 **세 개의 가변 카운터**가 잔액의 SSOT 이고, `CreditTransaction` 은
"redundant 감사 테이블"로 명시돼 있다 (schema.prisma:620 주석:
_"잔액의 source of truth 는 UserCredits + BonusCreditPurchase 다"_).

이 구조는 **세 곳의 분산된 상태**가 항상 동기화돼야만 정합한다:

| 상태                                      | 위치        | 의미                  |
| ----------------------------------------- | ----------- | --------------------- |
| `UserCredits.bonusCredits`                | 집계 카운터 | 보너스 풀 잔액 (캐시) |
| `BonusCreditPurchase.remaining` (per-row) | 행별 잔액   | FIFO 소비/만료 단위   |
| `CreditTransaction.amount` (append)       | 이벤트 로그 | 감사용                |

코드 주석이 이미 깨진 적 있는 invariant 들을 증언한다:

- `consumeBonusCreditOnceInTx` (creditService.ts:478): _"FIFO drift"_ — 어떤
  라우트가 `bonusCredits` 만 줄이고 `BonusCreditPurchase.remaining` 은 안 줄여서
  `sum(remaining) > bonusCredits` over-grant 발생했음.
- `addBonusCredits` (creditService.ts:599-622): 감사 row 를 **트랜잭션 밖에서
  best-effort** 로 쓴다 — audit write 가 실패하면 ledger 에 구멍이 생긴다.
  ("크레딧은 지급됐는데 GRANT row 누락"은 현재 정상 동작으로 허용됨.)
- `expireBonusCredits` / `revokeBonusCreditPurchase`: `GREATEST(0, ...)` raw SQL
  로 음수 drift 를 *방어*하고 있다 — 즉 drift 가 발생할 수 있다는 전제.

**Leverage**: 이미
`tests/lib/credits/creditTransaction.invariant.test.ts` 가
`sum(CreditTransaction.amount) == bonusCredits + (monthlyCredits - usedCredits)`
를 단언한다. 이 테스트가 **참인 한** 카운터를 버리고 ledger sum 으로 갈아끼워도
잔액은 동일하다. 이 invariant 가 본 마이그레이션의 정당성의 핵심이며, 마지막
단계까지 살아남아야 하는 가드다.

---

## 1. Target model

### 1.1 잔액의 정의 (the one equation)

잔액은 ledger 의 결정적 함수가 된다. 풀(pool)별로 분리:

```
effective_balance(user, pool, now) =
    Σ CreditTransaction.amount
      WHERE userId = user
        AND pool = pool
        AND (lot 이 만료되지 않았다 — 아래 §5 참조)

spendable(user, now) =
    effective_balance(user, MONTHLY, now)
  + effective_balance(user, BONUS, now)
```

`amount` 의 부호 규약은 **현행 그대로 유지**한다
(schema.prisma:655 주석): `GRANT`/`REFUND`/`SIGNUP_BONUS` 양수,
`CONSUME`/`EXPIRE`/`REVOKE` 음수. 따라서 단순 `SUM(amount)` 이 곧 잔액이다.
이게 이 마이그레이션을 안전하게 만드는 이유 — **부호 규약이 이미 ledger-friendly**.

`COMPATIBILITY` / `FOLLOWUP` 풀은 현재 잔액에 안 들어가는 한도 카운터
(invariant 테스트 effectiveBalance 주석 참조)이고, 플랜 폐지로 `*Limit` 들이
0/사실상 dead 다. 본 redesign 에서는 **이 두 풀을 잔액 계산에서 계속 제외**하고,
정리 여부는 §6 open question 으로 남긴다.

### 1.2 Ledger row 가 반드시 담아야 하는 것

현재 `CreditTransaction` 은 이미 거의 다 갖췄다. 부족한 것만 추가한다.

| 필드                                   | 현재 | 변경     | 이유                                                                                                                                                                                                                                                              |
| -------------------------------------- | ---- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pool` (`CreditPool`)                  | 있음 | 유지     | 풀별 partition 의 키                                                                                                                                                                                                                                              |
| `amount` (signed Int)                  | 있음 | 유지     | `SUM` 이 곧 잔액                                                                                                                                                                                                                                                  |
| `type` (`CreditTxnType`)               | 있음 | 유지     | 감사/분류                                                                                                                                                                                                                                                         |
| `reason` (String)                      | 있음 | 유지     | 사람이 읽는 사유                                                                                                                                                                                                                                                  |
| `sourceRef` (String?)                  | 있음 | 유지     | stripePaymentId / purchaseId 등                                                                                                                                                                                                                                   |
| `createdAt`                            | 있음 | 유지     | 시계열 재현                                                                                                                                                                                                                                                       |
| **`lotId`** (String?)                  | 없음 | **추가** | 이 row 가 속한 보너스 lot(구매 단위). GRANT 면 자기 자신이 lot 의 시작, CONSUME/EXPIRE/REVOKE 면 어느 lot 에서 빠졌는지. FIFO·만료를 ledger 안에서 표현하는 핵심. (지금은 `sourceRef` 에 purchaseId 가 들어가지만 stripePaymentId 와 섞여 있어 별도 컬럼이 필요.) |
| **`expiresAt`** (DateTime?)            | 없음 | **추가** | GRANT(BONUS) row 에만 채운다. lot 의 만료 시각. §5 참조.                                                                                                                                                                                                          |
| **`period`** (String?)                 | 없음 | **추가** | MONTHLY 풀 row 의 기간 키 (예: `'2026-06'`). 월 리셋이 부활할 경우 기간별 partition. (현재 월간 충전 없음 → 당장은 nullable.)                                                                                                                                     |
| **`idempotencyKey`** (String? @unique) | 없음 | **추가** | charge/grant 의 멱등 키. 현재 멱등성은 `RequestIdempotencyLog` / `BonusCreditPurchase.stripePaymentId` / `refundOnce` 에 흩어져 있다. ledger 자체에 unique 멱등 키를 두면 "한 번만 기록" 이 DB 레벨로 강제된다.                                                   |

> `lotId` 와 `expiresAt` 를 ledger 에 넣으면 **`BonusCreditPurchase` 의 역할을
> ledger 가 흡수**할 수 있다 (§5). 단 1차 목표는 잔액 SSOT 이동이므로,
> `BonusCreditPurchase` drop 은 별도 후속으로 분리한다.

신규 인덱스:

```prisma
@@unique([idempotencyKey])
@@index([userId, pool, createdAt])   // 풀별 부분합/스냅샷 쿼리
@@index([lotId])                     // lot 단위 소진/만료 집계
@@index([expiresAt])                 // 만료 스윕
```

### 1.3 UserCredits 카운터의 운명 → **derived cache (advisory)**

`UserCredits` 를 통째로 드롭하지 않는다. 이유:

- `plan`, `historyRetention`, `periodStart/End`, `compatibility*`, `followUp*`
  등 **잔액과 무관한 필드**가 같은 row 에 산다. 이건 그대로 둔다.
- 매 요청 잔액 조회를 `SUM` 풀스캔으로 돌리면 hot path 가 느려진다 (§2).

따라서 `monthlyCredits` / `usedCredits` / `bonusCredits` /
`totalBonusReceived` 는 **권고적 캐시(advisory cache)** 로 강등한다:

- ledger 가 **authoritative**, 카운터는 **읽기 최적화 캐시**.
- 캐시는 ledger write 와 **같은 트랜잭션** 안에서 갱신 (§3).
- 캐시가 ledger 와 어긋나면 **ledger 가 이긴다** — reconcile job 이 캐시를
  ledger sum 으로 덮어쓴다 (§4b).

장기적으로 carrying 비용이 크면 카운터 컬럼을 드롭하고 §2 의 running-balance
컬럼만 남길 수 있다 (§4d). 단 1차 릴리스에서는 보존 — 롤백 경로를 위해.

---

## 2. Reads — N-row 스캔 없이 잔액 조회

매 credit-aware 요청마다 `SUM(amount)` 풀스캔은 비현실적
(`getCreditBalance` 는 거의 모든 보호 라우트에서 호출됨). 세 가지 후보:

| 전략                                        | 동작                                                                                                 | 장점                                                                      | 단점                                                                                                  |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **A. Materialized cache (derived counter)** | ledger write 트랜잭션 안에서 `UserCredits.bonusCredits` 등 캐시를 갱신. 읽기는 캐시만.               | 읽기 O(1), 기존 read 코드 거의 그대로. 마이그레이션 최소.                 | 캐시가 또 다른 상태 → drift 가능 (단 이번엔 ledger 가 권위라 reconcile 로 자가치유).                  |
| **B. Running-balance 컬럼**                 | 각 ledger row 에 `balanceAfter` (그 시점 풀 잔액) 스냅샷. 읽기 = 해당 풀 최신 row 의 `balanceAfter`. | 잔액이 ledger 안에 살아 별도 캐시 테이블 불필요. row 단위 감사도 강해짐.  | append 가 직렬화돼야 정확 (직전 row 를 읽고 +1). 동시 append 경합 → §3 의 조건부 update 로 해결 필요. |
| **C. Periodic snapshot**                    | 주기적으로 `(user, pool, asOf, balance)` 스냅샷 row. 읽기 = 최신 스냅샷 + 그 이후 delta 합.          | 풀스캔 길이를 스냅샷 간격으로 bound. 만료/리셋 같은 epoch 경계와 잘 맞음. | 읽기마다 "스냅샷 이후 tail 합" 이 필요 → 여전히 작은 스캔. 스냅샷 갱신 job 필요.                      |

**권고: A를 1차, B를 종착지로.**

- **Phase 1~3 은 A** — 기존 `UserCredits` 카운터를 그대로 캐시로 재사용하면
  read path (`getCreditBalance`) 를 거의 안 건드리고도 ledger 로 권위를 옮길 수
  있다. drift 가 나도 이제 "캐시 vs 권위 ledger" 라 reconcile 가능하므로
  _구조적으로_ 안전해진다.
- **장기적으로 B** — `BonusCreditPurchase` 까지 ledger 로 흡수하면서 row 별
  `balanceAfter` 를 도입하면 캐시 테이블 자체가 불필요해진다. 단 이건 별도 PR.
- **C는 채택하지 않음** — 현재 데이터량(월간 충전 없음, 사용자당 ledger row 수가
  적음)에서 over-engineering. 사용자당 row 가 수천 단위로 커지면 재검토.

읽기 정확성 fallback: 캐시 신뢰가 깨진 사용자(reconcile 가 drift 표시)는
`getCreditBalance` 가 **on-demand 로 ledger sum 을 계산**해 캐시를 고치고 반환
(self-healing read). 이 경로는 드물어야 하므로 hot path 비용 무시 가능.

---

## 3. Writes — append-first, cache-advisory

모든 잔액 변동 사이트는 한 가지 패턴으로 수렴한다. 현재 사이트들:
`initializeUserCredits`, `addBonusCredits`, `consumeCredits` /
`consumeBonusCreditsFromPurchasesInTx` / `consumeBonusCreditOnceInTx`,
`refundCredits` (`creditRefund.ts`), `expireBonusCredits`,
`revokeBonusCreditPurchase`.

### 3.1 표준 write 절차 (단일 `prisma.$transaction`)

```
BEGIN
  1. (멱등) idempotencyKey 로 INSERT — unique 위반이면 이미 처리됨 → no-op 반환.
  2. (consume 한정) 잔액 검사를 **ledger 기준**으로:
       available = SUM(amount WHERE userId, pool, lot 미만료)
       if available < requested → throw CreditBusinessError (insufficient)
     append 는 monotonic 이므로, 검사와 append 가 같은 tx 안에 있고
     append 가 조건부(아래)이면 over-spend 불가.
  3. ledger row(s) append (CONSUME 면 음수, GRANT 면 양수, lotId/expiresAt 채움).
  4. advisory cache 갱신 — **상대 연산**으로:
       UserCredits.bonusCredits  { decrement: fromBonus }   (조건부 guard)
       UserCredits.usedCredits   { increment: fromMonthly } (조건부 guard)
COMMIT
```

핵심 전환: 현재 코드는 **카운터를 먼저 검사·차감**하고 ledger 를 뒤에
(때로는 트랜잭션 밖에서) 쓴다. 새 모델은 **ledger 가 검사·권위의 기준**이고
카운터 갱신은 같은 트랜잭션 안의 부수 효과다. `addBonusCredits` 의
"감사 row 를 트랜잭션 밖에서 best-effort" 패턴(creditService.ts:599)은
**폐기** — GRANT row 가 곧 잔액이므로 반드시 트랜잭션 안에 있어야 한다.
(주석이 우려한 "table phantom-apply 로 트랜잭션 전체 abort" 회귀는, ledger
테이블이 권위가 된 이상 그 테이블이 없으면 _어차피_ 결제를 받으면 안 된다 —
정상적으로 fail 해야 한다.)

### 3.2 동시성 (concurrency)

- **Append 는 monotonic**: ledger 에 INSERT 만 하므로 그 자체로 충돌 없음.
- **Over-spend 방지**는 두 겹:
  1. **조건부 캐시 가드** (현행 패턴 유지). `consumeCredits` 가 이미 쓰는
     `updateMany({ where: { usedCredits: { lte: monthlyCredits - fromMonthly } }})`
     (creditService.ts:298) 와 `BonusCreditPurchase` 의
     `updateMany({ where: { remaining: { gte: toConsume } }})` 패턴. count===0
     이면 race 진 것 → throw → 롤백. 이건 잔액 SSOT 가 ledger 로 가도 **그대로
     유효한 락**이다 (캐시가 동시 차감을 직렬화).
  2. **DB CHECK / 부분합 검증**: 캐시를 신뢰하지 않으려면, append 직전에 같은
     tx 에서 `SELECT SUM(amount) ... FOR UPDATE` 대신 — Postgres 는 집계에
     row-lock 을 못 거므로 — **advisory lock** (`pg_advisory_xact_lock(hashtext(userId))`)
     을 잡아 한 사용자의 동시 consume 을 직렬화하는 방법을 §6 에서 결정한다.
     데이터량이 작아 사용자별 직렬화 비용은 무시 가능.
- 권고: **캐시 조건부 가드(1)를 1차 락으로 유지**하고(이미 검증된 코드),
  advisory lock(2)은 캐시를 드롭하는 Phase 4d 에서 도입.

격리 수준: 현재 READ COMMITTED 가정 위에서 조건부 update 로 lost-update 를
막고 있다(코드 주석 다수). 이 가정은 유지된다.

---

## 4. Migration / rollout — 각 단계가 독립 배포·롤백 가능

> 원칙: 각 phase 는 **그 자체로 정합**하고, 다음 phase 없이도 운영 가능하며,
> 뒤로 되돌릴 수 있어야 한다. invariant 테스트가 매 phase 의 게이트다.

### Phase 0 — 스키마 확장 (additive only)

- `CreditTransaction` 에 `lotId`, `expiresAt`, `period`, `idempotencyKey`
  컬럼을 **nullable** 로 추가. 인덱스 추가. 기존 코드 무영향.
- 롤백: 컬럼 drop (아무도 안 읽음).
- 게이트: `typecheck` + 기존 invariant 테스트 그대로 통과.

### Phase 4a — Backfill: 현재 상태에서 ledger 채우기

현재 ledger 는 "도입 시점 이후의 delta 만" 정확하다(schema.prisma:631 주석).
잔액 SSOT 로 쓰려면 **각 사용자의 현재 잔액과 ledger sum 이 일치**해야 한다.

백필 스크립트 (`scripts/backfill-credit-ledger.ts`, dry-run 우선):

1. 각 사용자에 대해 `currentCacheBalance = bonusCredits + (monthlyCredits - usedCredits)`.
2. `currentLedgerSum = SUM(CreditTransaction.amount, BONUS+MONTHLY)`.
3. `gap = currentCacheBalance - currentLedgerSum`.
4. `gap != 0` 이면 **단일 보정 row** 를 append:
   - `type` 신규 `RECONCILE` (또는 기존 `GRANT`/`EXPIRE` 재사용 + `reason='backfill_reconcile'`),
   - `pool` 은 gap 의 출처를 보수적으로 추정: 보너스 쪽 gap 은 BONUS,
     monthly 쪽 gap 은 MONTHLY. (정확 분해 불가하면 BONUS 로 몰되 metadata 에 기록.)
   - `metadata: { cacheBonus, cacheMonthly, usedCredits, ledgerSumBefore }`.
5. 보너스 lot 들은 **`BonusCreditPurchase` 에서 ledger 로 매핑**: 만료 안 된
   각 purchase 의 `remaining` 을 `lotId = purchase.id`, `expiresAt =
purchase.expiresAt` 인 GRANT row 로 표현(이미 GRANT row 가 있으면 `lotId`/
   `expiresAt` 만 backfill). 이래야 §5 만료가 ledger 안에서 닫힌다.

- **멱등**: 스크립트는 `reason='backfill_reconcile'` row 존재 여부로 재실행
  방어. dry-run 모드로 gap 분포를 먼저 출력 → 사람이 검토 후 apply.
- 롤백: backfill row 들(식별 가능한 reason) 삭제.
- 게이트: 백필 후 **모든 사용자에 대해** `cacheBalance == ledgerSum` 단언
  (invariant 테스트의 prod 버전 = reconcile 리포트 §4b).

### Phase 4b — Dual-write + drift 감지/알림

- 모든 write 사이트를 §3 표준 절차로 전환하되, **읽기는 아직 캐시**(A).
  즉 ledger 와 캐시를 **둘 다** 같은 트랜잭션에서 쓴다(dual-write).
- **Drift 감지 (online)**: 각 write 트랜잭션 끝에서 그 사용자의
  `ledgerSum(pool)` 과 `cache(pool)` 를 비교 — 불일치면 `logger.error` +
  메트릭(`credit_ledger_drift`) 발행. (트랜잭션을 fail 시키진 않음 — 알림만.)
- **Drift 감지 (offline)**: cron `reconcileCreditLedger` 가 전체 사용자
  `cacheBalance vs ledgerSum` 을 스윕, drift 사용자 목록 + 합계를 리포트.
  심각하면 알림. 이 job 은 **자동 수정하지 않고** Phase 4b 동안은 _관찰만_ 한다
  (관찰 기간에 drift 0 임을 확인하는 게 flip 의 전제조건).
- 롤백: write 사이트를 이전 버전으로 되돌림 — ledger 는 계속 정확(권위 아님).
- 게이트: 관찰 기간(예: 2주) 동안 `credit_ledger_drift` 메트릭 0,
  reconcile 리포트 0 drift.

### Phase 4c — Flip reads to ledger

- `getCreditBalance` 의 잔액 계산을 **ledger sum 기반**으로 전환:
  - 1차 구현: 캐시(`UserCredits.bonusCredits` 등)를 읽되, 그것을 _ledger 의
    materialized view_ 로 간주(전략 A). 즉 코드 형태는 거의 동일하지만
    **의미론적으로 캐시는 derived** 이고, reconcile job 이 이제 **자동 수정**
    모드로 전환(캐시를 ledger sum 으로 덮어씀).
  - 검증 강화: self-healing read (§2) 활성화 — 읽기 시 캐시가 의심되면 ledger
    sum 으로 보정.
- 이 시점부터 **ledger 가 명실상부 SSOT**. 캐시 오염은 더 이상 잔액 오류가
  아니라 "곧 자가치유될 stale" 일 뿐.
- 롤백: reconcile 을 다시 관찰-only 로, read 를 캐시-authoritative 해석으로
  되돌림. (데이터는 호환 — 같은 컬럼.)
- 게이트: flip 후에도 잔액 회귀 테스트(invariant + e2e money path) 통과.

### Phase 4d — Drop counters (optional, 후속)

- 충분한 안정화 기간 후, `monthlyCredits` / `usedCredits` / `bonusCredits` /
  `totalBonusReceived` 를 드롭하거나 running-balance 컬럼(전략 B)으로 대체.
- `BonusCreditPurchase` 의 잔액 역할도 ledger lot(`lotId`/`expiresAt`)으로
  완전 흡수 → `BonusCreditPurchase` 는 "결제 메타(stripePaymentId, source,
  acknowledgedAt)" 만 남기거나 드롭.
- 이 단계는 **되돌리기 어려운** 유일한 단계이므로, 4c 가 장기 안정화된 뒤
  별도 의사결정으로 분리.
- 게이트: 카운터를 읽는 잔여 코드 0 (grep 가드), e2e money path 통과.

### Drift 를 dual-write 중에 어떻게 잡나 (요약)

1. **Per-transaction assertion**: write 끝에 pool-sum vs cache 비교 → 메트릭.
2. **Offline reconcile cron**: 전수 스윕 리포트.
3. **invariant 테스트**: 단위테스트가 모든 mutation 사이트의 row emission 을 강제.
4. **Backfill verifier**: 4a 직후 전수 `cacheBalance == ledgerSum` 1회 검증.

---

## 5. Bonus expiry in a ledger world

현재 만료는 `BonusCreditPurchase.remaining` + `expired` 플래그 +
`UserCredits.bonusCredits` 3중 상태를 `GREATEST(0,...)` 로 맞춘다
(`expireBonusCredits`). ledger 모델에서 두 가지 표현이 가능하다:

| 방식                           | 설명                                                                                                                                   | 평가                                                                                                                                                                                                      |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **(i) 만료를 ledger 이벤트로** | 만료 시점에 `EXPIRE` 음수 row 를 append (lotId, amount = 그 lot 의 미사용 잔량). 잔액은 항상 `SUM(amount)` — 만료가 "이벤트로 반영"됨. | append-only 와 일관. 감사 trail 완전. **권고.** 단점: 만료 스윕 job 이 "만료됐는데 아직 EXPIRE row 없는 lot" 을 찾아 row 를 박아야 함(현재 cron 과 동형).                                                 |
| **(ii) lot 별 remaining 컬럼** | 만료를 `expiresAt` 으로만 표현하고, 잔액 쿼리에서 `WHERE expiresAt > now` 로 미만료 lot 만 합산. EXPIRE row 안 씀.                     | row 없이 "as-of 잔액"을 계산 가능(시점 질의에 강함). 단점: 잔액이 "순수 sum" 이 아니라 "조건부 sum" 이 됨 → 캐시(전략 A) 와 어긋나기 쉽고, 만료된 lot 의 미사용분이 _언제_ 사라졌는지 감사 trail 이 약함. |

**권고: (i) ledger 이벤트 + lot 모델의 하이브리드.**

- 각 보너스 GRANT row 는 `lotId`(=자기 식별) 와 `expiresAt` 를 가진다.
- lot 의 현재 잔량 = `SUM(amount WHERE lotId = L)` (GRANT 양수 + 그 lot 에서의
  CONSUME/EXPIRE/REVOKE 음수). FIFO 소비는 `expiresAt ASC` lot 순서로 음수 row 를
  찍는다 — 현재 `consumeBonusCreditsFromPurchasesInTx` 의 FIFO 와 동형이되 대상이
  purchase 행이 아니라 ledger lot.
- 만료 cron: `lot 잔량 > 0 AND expiresAt <= now AND (아직 EXPIRE row 없음)` 인
  lot 마다 `EXPIRE` 음수 row(= 잔량)를 append. 멱등(이미 EXPIRE row 있으면 skip).
- 환불(`REVOKE`)도 같은 lot 에 음수 row — `stripePaymentId → lotId` 매핑으로
  현재 `revokeBonusCreditPurchase` 가 자연스럽게 lot 기반이 된다.

이렇게 하면 만료/환불/소비가 **전부 같은 메커니즘**(해당 lot 에 음수 row append)
이 되고, `BonusCreditPurchase.remaining` / `expired` 라는 중복 상태가 사라진다
(Phase 4d 에서 실제 드롭).

> 주의: "bonus-first 소비" 와 "만료 임박 lot 먼저(FIFO)" 비즈니스 룰은 보존.
> ledger 는 표현만 바꾸고 정책은 그대로.

---

## 6. Risks & open questions (팀 결정 필요)

1. **MONTHLY 풀의 현재 의미.** 플랜 폐지로 월간 충전이 사실상 없다
   (`initializeUserCredits` 가 `monthlyCredits: 0`, `resetMonthlyCredits` 는
   기간만 넘김). 그렇다면 MONTHLY 풀을 ledger 에서 **deprecate** 하고 모든 잔액을
   BONUS lot 으로 통일할 수 있나? 아니면 월간 모델 부활 가능성을 위해 `period`
   컬럼과 함께 유지? — **결정 필요** (이게 §1.1 / §5 의 단순화 폭을 좌우).

2. **COMPATIBILITY / FOLLOWUP 풀.** 잔액에 안 들어가는 한도 카운터인데 플랜
   폐지로 limit 이 0/dead 다. ledger 에서 이 두 풀을 **제거**할지, 감사 호환을
   위해 남길지. (남기면 잔액 계산에서 명시적으로 계속 제외.)

3. **백필의 gap 분해 정확도.** 4a 에서 `cacheBalance - ledgerSum` gap 을 BONUS/
   MONTHLY 로 정확히 쪼갤 수 없는 사용자가 있을 수 있다(과거 unaudited 변동).
   gap 을 어느 풀에 귀속시킬지의 규칙과, gap 이 큰 사용자(예: > N)는 자동 보정
   대신 **수동 검토 큐**로 보낼지.

4. **동시성 락 전략.** §3.2 의 조건부 캐시 가드(현행)로 충분한가, 아니면
   캐시 드롭(4d)을 위해 사용자별 `pg_advisory_xact_lock` 을 도입할 것인가.
   Neon(Postgres) 의 advisory lock + connection pooling(PgBouncer transaction
   mode) 호환성 확인 필요.

5. **멱등 키 backfill.** 신규 `idempotencyKey @unique` 를 과거 row 에 어떻게
   채우나(전부 NULL 허용 → 과거는 멱등성 없음으로 둠). 신규 write 부터만 강제할지.

6. **`addBonusCredits` 의 "audit outside tx" 폐기 회귀 리스크.** 현재 코드는
   ledger 테이블이 prod 에 phantom-missing 일 때 결제가 롤백되는 걸 막으려고
   일부러 밖에 뒀다(creditService.ts:594 주석). ledger 가 SSOT 가 되면 이 안전
   장치를 버려야 하는데, 그 전에 **마이그레이션이 prod 에 확실히 적용**됐음을
   보장하는 배포 게이트가 선행돼야 한다 (CI `ops:typecheck:gate` 외에
   migration-applied 체크).

7. **읽기 성능 실측.** 전략 A 로 시작하지만, self-healing read 와 reconcile
   빈도가 실제로 hot path 에 영향 없는지 prod 메트릭으로 확인 후 B 이행 시점 결정.

8. **`refundCredits` 의 reverse-FIFO 휴리스틱**(creditRefund.ts:60 주석)이
   lot-aware ledger 에서 **정확해질 수 있다** — CONSUME row 가 `lotId` 를
   기록하므로 환불 시 정확히 어느 lot 으로 되돌릴지 알 수 있다. 이 정확도 향상을
   이번 범위에 포함할지, 별도 follow-up 으로 뺄지.

---

## Appendix — 영향받는 코드 사이트

| 파일                                                    | 함수                                         | 변경 성격                               |
| ------------------------------------------------------- | -------------------------------------------- | --------------------------------------- |
| `prisma/schema.prisma`                                  | `CreditTransaction`                          | 컬럼/인덱스 추가 (Phase 0)              |
| `src/lib/credits/creditService.ts`                      | `getCreditBalance`                           | 읽기 의미론 전환 (4c)                   |
|                                                         | `consumeCredits`, `consumeBonusCredits*InTx` | append-first 절차 (4b)                  |
|                                                         | `addBonusCredits`                            | audit-in-tx 화, lot/expiresAt 기록 (4b) |
|                                                         | `expireBonusCredits`                         | lot 기반 EXPIRE row append (4b/5)       |
|                                                         | `revokeBonusCreditPurchase`                  | lot 기반 REVOKE row (4b)                |
|                                                         | `initializeUserCredits`                      | signup lot/expiresAt 기록 (4b)          |
| `src/lib/credits/creditRefund.ts`                       | `refundCredits`                              | lot-aware 환불 (선택, §6.8)             |
| `scripts/`                                              | `backfill-credit-ledger.ts`                  | 신규 (4a)                               |
| cron                                                    | `reconcileCreditLedger`                      | 신규 drift 감지/수정 job (4b/4c)        |
| `tests/lib/credits/creditTransaction.invariant.test.ts` | —                                            | 게이트로 유지·강화                      |
