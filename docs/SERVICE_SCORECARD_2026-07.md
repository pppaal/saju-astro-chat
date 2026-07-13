# 서비스 스코어카드 — 멀티에이전트 코드 리뷰 (2026-07)

10개 서비스 영역을 각각 전담 리뷰 에이전트가 독립적으로 평가했다. 각 에이전트는
해당 영역의 소스와 테스트를 직접 읽고, 프로젝트 불변식(결정론·injectable `now`·
멱등 머니패스·fail-closed 보안·ko/en 페어링·no `console.*`)을 기준으로
5개 항목을 0–100으로 채점했다.

- 채점 기준: 90+ 모범 수준 · 70대 견고하나 실질적 갭 존재 · 60 미만 심각한 문제
- **P0(불변식 위반) 결함은 전 영역에서 발견되지 않았다.** 개선점은 P1(우선 수정)·P2(권장)로 분류.

## 종합 점수표

| 순위 | 서비스                         | 정확성 | 코드 품질 | 테스트 | 보안 | 유지보수성 | **종합** |
| ---- | ------------------------------ | :----: | :-------: | :----: | :--: | :--------: | :------: |
| 1    | Tarot 타로                     |   90   |    88     |   80   |  91  |     85     |  **87**  |
| 2    | Credits & Payments 결제/크레딧 |   85   |    88     |   90   |  88  |     82     |  **86**  |
| 2    | LLM/Prompts/Streaming          |   86   |    90     |   87   |  84  |     87     |  **86**  |
| 4    | Saju 사주 엔진                 |   88   |    85     |   91   |  84  |     79     |  **85**  |
| 4    | Western Astrology 서양 점성술  |   87   |    85     |   86   |  82  |     84     |  **85**  |
| 4    | Calendar/Timing 운흐름 캘린더  |   88   |    85     |   89   |  79  |     82     |  **85**  |
| 7    | API Middleware & Security      |   82   |    84     |   88   |  78  |     85     |  **83**  |
| 8    | Destiny/Counselor AI 상담      |   85   |    76     |   84   |  90  |     74     |  **82**  |
| 9    | Frontend/UX & i18n             |   80   |    82     |   85   |  80  |     73     |  **80**  |
| 10   | Compatibility 궁합             |   76   |    82     |   79   |  88  |     74     |  **79**  |

## 전 영역 공통 테마

1. **로직 복제가 실제 버그를 만들었다.** formatter↔facts(궁합 원진 누락),
   상수 테이블 중복(destiny 오행), 차트 조립 루프 4중 복제(점성술). 공유 헬퍼/SSOT
   추출이 가장 수익 높은 리팩터링이다.
2. **침묵하는 테스트.** 실측 천체력 테스트가 조건부 skip(점성술), 스모크 테스트가
   낡은 스키마로 헛통과(타로), 목 데이터만 검증하는 테스트(궁합). 통과하지만
   아무것도 지키지 않는 테스트가 각 영역에 하나씩 있다.
3. **i18n 드리프트 가드 부재.** 데이터는 현재 완벽하지만 ko/en 길이 동등성·언어
   순도를 지키는 가드가 없는 지점(타로 키워드, 점성술 returns 요약, 캘린더 EN
   토큰 치환)이 있다.
4. **거대 함수.** `calculateSajuData` ~500줄, `buildSajuSection` ~540줄.
   순수 함수 추출 패턴이 이미 저장소에 있으므로 골든을 깨지 않고 분해 가능하다.
5. **관측성 공백.** 빈 `catch {}`(destiny), 환불 leftover warn-only(credits),
   idempotency fail-open 무메트릭. 머니패스·판단 데이터의 무음 실패는 메트릭으로
   승격 필요.

## 최우선(P1) 개선 목록 — 서비스 횡단

| #   | 서비스 | 개선점                                                                                           | 위치                                                        |
| --- | ------ | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| 1   | 궁합   | 원진(元嗔)이 formatter에는 있으나 facts에 없어 차트/점수에서 누락 — "차트=상담사 정합" 실제 깨짐 | `src/lib/compatibility/sajuSynastryFacts.ts:236`            |
| 2   | 결제   | `refundCredits`의 compat/followUp 분기가 BONUS 풀을 복원하지 못하는 잠복 결함                    | `src/lib/credits/creditRefund.ts:145`                       |
| 3   | 보안   | CSRF가 클라이언트 `x-forwarded-host`를 신뢰 — 신뢰 프록시 밖 배포에서 우회 가능                  | `src/lib/security/csrf.ts:16-43`                            |
| 4   | 보안   | zod 검증 커버리지 ~53% (102개 라우트 중 54개) — 미들웨어에 스키마 옵션 추가로 일원화             | `src/lib/api/middleware/index.ts:95`                        |
| 5   | LLM    | `buildMessages` 인젝션 방어 비대칭 — priorTurns만 sanitize, 현재 턴은 라우트 신뢰                | `src/lib/llm/claude.ts:180,228`                             |
| 6   | 상담   | saju 서브섹션 실패를 빈 `catch {}`로 무음 삼킴 — `logger.warn` 추가                              | `src/lib/destiny/counselorContext.ts:947,972,1001`          |
| 7   | 상담   | 천간/지지 오행 상수가 saju SSOT와 별도로 하드코딩 — 드리프트 시 잘못된 오행이 LLM에 유입         | `src/lib/destiny/counselorContext.ts:258`                   |
| 8   | 사주   | `calculateSajuData` ~500줄 모놀리스 분해                                                         | `src/lib/saju/saju.ts:232-736`                              |
| 9   | 사주   | 부정확한 raw `monthlyCycles`(절기 미반영)가 결과 shape에 노출 — footgun 제거                     | `src/lib/saju/saju.ts:658-680`                              |
| 10  | 점성술 | returns 요약 theme가 한국어 전용으로 로케일 무시 API 노출 (ko/en 규약 위반)                      | `src/lib/astrology/foundation/returns.ts:331,373`           |
| 11  | 점성술 | 실측 천체력 정확성 테스트가 조건부 skip — CI에서 침묵 가능                                       | `tests/lib/astrology/real-ephemeris-correctness.test.ts:27` |
| 12  | 타로   | 스모크 테스트가 낡은 요청 스키마로 happy-path 헛통과                                             | `tests/tarot.smoke.test.ts:64-80`                           |
| 13  | 타로   | ko/en 키워드 길이 동등성 가드 테스트 부재                                                        | `tests/lib/Tarot/tarot-data.test.ts:169`                    |
| 14  | 캘린더 | 교차 활성 신호가 `evidence.planets[0]` 암묵 규약에 결합 — 타입으로 강제 필요                     | `src/lib/calendar-engine/extractors/cross-activation.ts:47` |
| 15  | 캘린더 | 점수 보정 매직넘버 — 룰 확장 시 분포 드리프트를 테스트가 못 잡음                                 | `src/lib/calendar-engine/derivers/score.ts:41,81`           |
| 16  | 궁합   | formatter↔facts 파리티 테스트 부재 (1번 재발 방지)                                               | `tests/lib/compatibility/`                                  |
| 17  | 프론트 | `isLikelyCorrupted`가 키릴 1자 포함 정상 한글을 영어로 강등                                      | `src/i18n/I18nProvider.tsx:184`                             |
| 18  | 프론트 | i18n 시스템 이원화 (`src/i18n` vs `src/lib/i18n`, 8-로케일 타입 드리프트)                        | `src/lib/i18n/types.ts:4`                                   |

---

## 서비스별 상세

### 1. Tarot 타로 — 87점

**강점**

- 78장 덱 ko/en 페어링 완결 (전 카드 keywords/keywordsKo 길이 일치, advice 페어 완비).
- 랜덤/결정성 분리가 원칙에 정확히 부합: 라이브 뽑기는 partial Fisher-Yates
  (`src/app/api/tarot/route.ts:33-46`), 데일리는 `sha256(userId:date)` 결정적 재현.
- 역방향 확률 SSOT(`src/lib/tarot/reversedProbability.ts`)를 전 흐름이 파생.
- draw nonce로 "뽑힌 카드=해석된 카드" + 서버 권위 비용 강제, `sanitizeForXmlTagBoundary`
  인젝션 차단, `refundCreditsOnce` 멱등 환불.

**개선점**

| 우선순위 | 내용                                                                                                                                                                          | 위치                                                  |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| P1       | 스모크 테스트가 `{spread,question,category}` 낡은 스키마를 보내 4xx로 떨어지는데 200–599 단언이라 헛통과. 현행 계약(`categoryId`,`spreadId`)으로 조이고 응답 스키마 단언 추가 | `tests/tarot.smoke.test.ts:64-80`                     |
| P1       | ko/en 키워드 배열 길이 동등성 테스트 부재 — 카드 수정 시 드리프트 무방비                                                                                                      | `tests/lib/Tarot/tarot-data.test.ts:169-174`          |
| P2       | `RawCard.image`가 항상 `getCardImagePath`로 덮어써지는 죽은 필드 — 제거/옵셔널화                                                                                              | `src/lib/tarot/data/index.ts:27-30`                   |
| P2       | interpret-stream이 `withApiMiddleware` 대신 수동 조합 — 스트리밍 전용 래퍼로 표준화하거나 예외 문서화                                                                         | `src/app/api/tarot/interpret-stream/route.ts:204-217` |

### 2. Credits & Payments 결제/크레딧 — 86점

**강점**

- 4대 머니패스 불변식 전부 성립: create-as-lock claim/release(자기 토큰만 삭제),
  조건부 `updateMany`로 lost-update·만료 lot 이중차감 차단, Stripe raw-body 서명검증 +
  event-id dedupe + transient throw, livemode 검증과 out-of-order 웹훅 큐잉까지.
- pricing.ts SSOT가 실제 강제됨 (webhook이 `CREDIT_PACKS`에서 파생 지급).
- webhook 테스트 1018줄 포함 머니패스 테스트가 촘촘 (멱등/동시성/엣지/회귀).

**개선점**

| 우선순위 | 내용                                                                                                                                                                                                   | 위치                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| P1       | `refundCredits`의 compatibility/followUp 분기가 카운터만 깎고 BONUS 풀(`BonusCreditPurchase.remaining`)을 복원하지 않음 — 현재 라우트는 `reading`만 쓰지만 직접 호출 시 무음 손실. reading 경로와 통일 | `src/lib/credits/creditRefund.ts:145-181` |
| P2       | `synthesizeRefundKey` 1시간 버킷 충돌 시 정당한 재환불 스킵 가능 — synth 키 폴백에 메트릭 추가, 호출자에 transactionId 강제                                                                            | `src/lib/credits/refundOnce.ts:33-68`     |
| P2       | idempotency claim fail-open이 DB 장애 중 크로스-인스턴스 이중차감 창을 남김 — `recordCounter` 알림 연동, fail-closed 스위치 검토                                                                       | `src/lib/api/idempotency.ts:101`          |
| P2       | 환불 lot 복원 휴리스틱: 전액 만료 시 leftover가 warn만 남김 — REFUND 감사행/메트릭으로 reconciliation 가능하게                                                                                         | `src/lib/credits/creditRefund.ts:137`     |

### 3. LLM/Prompts/Streaming — 86점

**강점**

- 비용/토큰 통제 SSOT(`llm-policy.ts`): 모델 등록 강제, 출력 clamp, 호출당 USD 알림,
  캐시 hit ratio 계측.
- abort 전파·`reader.cancel()` 업스트림 과금 차단·하트비트·1회성 환불까지 스트림 정리 촘촘.
- ko/en co-location을 dev guard가 throw로 강제, 이중언어 위기(자해) 스크리닝.

**개선점**

| 우선순위 | 내용                                                                                                                                                                           | 위치                                            |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| P1       | `buildMessages`가 priorTurns만 sanitize하고 현재 턴 userPrompt/cachedUserContext는 라우트 신뢰 — 신규 라우트가 sanitize를 빠뜨리면 방어가 뚫림. 빌더 내부에서 멱등 스크럽 적용 | `src/lib/llm/claude.ts:180,228`                 |
| P2       | `koStructuralLabels` 전역 단어 치환(`\bSun\b→태양` 등)이 산문 속 정상 영어까지 훼손 가능 — 라벨 구간으로 한정                                                                  | `src/lib/llm/koStructuralLabels.ts:40`          |
| P2       | `serverStreamProxy`의 두 함수는 미사용 죽은 코드 + abort/flush/에러이벤트 미비 — 삭제 권장                                                                                     | `src/lib/streaming/serverStreamProxy.ts:28,164` |
| P2       | `callClaudeStream`은 연결 셋업(pre-first-byte) 재시도 없음 — 529 일시 오류 1회 재시도로 체감 실패율 감소                                                                       | `src/lib/llm/claude.ts:478`                     |

### 4. Saju 사주 엔진 — 85점

**강점**

- 결정론 불변식 모범 준수: 원국은 birth 입력만으로, 시간 의존 경로는 전부
  injectable `now`. 골든 테스트로 계약 고정. `console.*`/`any` 0건.
- 시각 보정 SSOT(`solarTimeCorrectionMinutes`) 하나로 네 기둥·시주·대운수가
  동일 `effectiveDateTime` 기준 — 경계 불일치 구조적 제거.
- KMT(1954-61)·DST·평균태양시 보정을 근거와 함께 처리, 테스트 54종(KASI crosscheck 포함).

**개선점**

| 우선순위 | 내용                                                                                                                                        | 위치                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| P1       | `calculateSajuData` ~500줄 모놀리스 — 연주·월주·시주·대운 산출을 순수 함수로 추출해 조립부로 축소                                           | `src/lib/saju/saju.ts:232-736`      |
| P1       | 절기 미반영 raw `monthlyCycles`가 `result.unse.monthly`로 노출 — 활성 소비자는 없으나 실수 소비 시 조용한 오차. 절기 기준으로 채우거나 제거 | `src/lib/saju/saju.ts:658-680`      |
| P2       | 에러 경로에서 birthDate/birthTime PII 로깅 — 마스킹/해시 대체                                                                               | `src/lib/saju/saju.ts:323-328`      |
| P2       | KASI 1940–2050 범위 밖 출생은 RangeError — 근사 절기 폴백 또는 사용자 안내 경로                                                             | `src/lib/saju/constants.ts:186-191` |
| P2       | 모듈 전역 가변 캐시 — 주입 가능한 store로 분리해 테스트 격리 개선                                                                           | `src/lib/saju/saju.ts:198`          |

### 5. Western Astrology 서양 점성술 — 85점

**강점**

- 천체력 래퍼·타임존→JD 변환(delta-T 정확), DST/존재하지 않는 시각 검증, 극권
  WholeSign 폴백. 과거 회귀를 주석으로 문서화하며 수정한 흔적.
- 결정론 규약 철저 (injectable now/targetDate, 날짜-only 입력 정오 UTC 앵커링).
- 테스트 ~13,400줄: 골든·분기·폴백·malformed cusp까지.

**개선점**

| 우선순위 | 내용                                                                                                      | 위치                                                        |
| -------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| P1       | Solar/Lunar return 요약 theme가 하드코딩 한국어로 영어 로케일에도 노출 — ko/en 페어 또는 locale 인자화    | `src/lib/astrology/foundation/returns.ts:331,373`           |
| P1       | 실측 천문 정확성 검증이 native 바이너리 부재 시 `describe.skip`으로 침묵 — fixture 골든 추가 또는 CI fail | `tests/lib/astrology/real-ephemeris-correctness.test.ts:27` |
| P2       | `PlanetData`의 `[key: string]: unknown` index signature가 strict 타입 무력화                              | `src/lib/astrology/foundation/astrologyService.ts:33`       |
| P2       | 행성 조립 루프가 4개 파일에 중복 — `buildPlanetsForJD` 공용 헬퍼 추출                                     | `src/lib/astrology/foundation/transit.ts:29` 외             |
| P2       | `findSunAtLongitude`에 bracket 부호 검증 없음 (달 검색 대비 비대칭)                                       | `src/lib/astrology/foundation/returns.ts:27`                |

### 6. Calendar/Timing 운흐름 캘린더 — 85점

**강점**

- UTC 버킷팅 SSOT + 골든 digest + TZ 테스트로 `process.env.TZ` 무관 결정론 보장.
- injectable now를 request boundary에서만 읽고 전파 — now-injection 결정론 테스트 완비.
- ko/en 페어링이 신호 레벨에 baked(`ActiveSignal.korean/english`), 캐시 fail-soft +
  엔진 버전 bump 무효화.

**개선점**

| 우선순위 | 내용                                                                                                                                                                               | 위치                                                           |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| P1       | 교차 활성 신호가 `evidence.planets[0]`/sibsin 암묵 규약에 결합 — 이미 3개 extractor가 오발화로 하드코딩 제외됨. `ActiveSignal`에 명시적 `activePlanet`/`matchKey` 필드로 타입 강제 | `src/lib/calendar-engine/extractors/cross-activation.ts:47,73` |
| P1       | 점수 보정 상수(BIAS 1.75/SCALE 16/보너스)가 경험값 매직넘버 — named config로 모으고 분포 percentile 회귀 테스트 추가                                                               | `src/lib/calendar-engine/derivers/score.ts:41,81`              |
| P2       | EN 라벨 한글 토큰의 사후 문자열 치환(`koTokensToEn`)은 신규 토큰 누수에 취약 — extractor에서 완전 영문 emit                                                                        | `src/lib/calendar-engine/derivers/summary.ts:11,75`            |
| P2       | 익명 override 좌표 범위 미검증 + rate-limit fail-open — 좌표 클램프, 프로세스 로컬 상한                                                                                            | `src/app/calendar/loadTierData.ts:73,196`                      |

### 7. API Middleware & Security — 83점

**강점**

- 핵심 불변식 성립: `encryptToken` 프로덕션 fail-hard, admin 게이트 중앙집중
  fail-closed, rate limit 2층 fail-closed 정책, UTF-8 바이트 timing-safe 비교,
  DNS-rebinding 방어 CSRF.
- 구성요소별 comprehensive 테스트 존재.

**개선점**

| 우선순위 | 내용                                                                                                                                                                             | 위치                                      |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| P1       | `getRequestHosts`가 클라이언트 `x-forwarded-host`를 신뢰 — 신뢰 프록시 밖 배포에서 CSRF same-host 우회 가능. same-host 판정은 host 헤더로 한정, forwarded-host는 allowlist에서만 | `src/lib/security/csrf.ts:16-43`          |
| P1       | zod 검증 커버리지 ~53% (102개 라우트 중 54개) — `withApiMiddleware`에 schema 옵션을 추가해 초기화 단계 400으로 일원화                                                            | `src/lib/api/middleware/index.ts:95-183`  |
| P2       | `e.message` 문자열 매칭 기반 에러 분류 — 커스텀 에러 클래스/code 필드로 전환                                                                                                     | `src/lib/api/middleware/index.ts:157-172` |
| P2       | `NODE_ENV=test`/`VITEST`로 CSRF 전역 skip — production에서는 절대 skip 불가 가드 추가                                                                                            | `src/lib/api/middleware/context.ts:63-65` |
| P2       | `getKey`가 비정상 길이 키를 조용히 재해석/절단 — 형식 불일치 시 경고 또는 프로덕션 fail-fast                                                                                     | `src/lib/security/tokenCrypto.ts:8-24`    |

### 8. Destiny/Counselor AI 상담 — 82점

**강점**

- "엔진이 판단, LLM은 문장화"라는 핵심 교리를 가장 충실히 구현: sajuFacts/astroFacts
  순수 facts 레이어, now 주입 결정론.
- lang·sources·tz·버전을 모두 반영한 캐시 키 격리 + single-flight.
- ko/en 언어 순도·소스 격리를 회귀 테스트로 고정.

**개선점**

| 우선순위 | 내용                                                                                                              | 위치                                                                          |
| -------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| P1       | 신살·12운성·십성 포매팅의 빈 `catch {}` — 엔진 shape 변경 시 판단 데이터가 무음 누락. `logger.warn` 추가          | `src/lib/destiny/counselorContext.ts:947,972,1001`                            |
| P1       | 천간/지지 오행 상수가 saju SSOT와 별도 하드코딩 — 드리프트 시 잘못된 오행이 LLM에 유입. `saju/constants`에서 파생 | `src/lib/destiny/counselorContext.ts:258`, `src/lib/destiny/sajuFacts.ts:105` |
| P2       | 1167줄 파일의 ~540줄 `buildSajuSection` — 섹션별 순수 포매터로 추출해 단위 테스트                                 | `src/lib/destiny/counselorContext.ts:624`                                     |
| P2       | `resolveCounselorSources` 정규화·astro 실패 강등 경로 테스트 공백                                                 | `src/lib/destiny/counselorRequest.ts:52`                                      |
| P2       | `as unknown as` 이중 캐스트로 엔진 타입과 수동 동기화 — 엔진 타입 직접 재사용                                     | `src/lib/destiny/sajuFacts.ts:150,264`                                        |

### 9. Frontend/UX & i18n — 80점

**강점**

- i18n 폴백 체인(로케일→영어→raw-key 감지→휴먼라이즈) + 로드 시점 1회 mojibake 복구.
- skip-link, safe-area, `interactiveWidget`(iOS 키보드) 등 접근성/Capacitor 배려 실재.
- a11y(axe)·keyboard·mobile·i18n e2e 테스트 실질적. 팩 사이즈 SSOT 준수, `console.*` 0건.

**개선점**

| 우선순위 | 내용                                                                                                                            | 위치                                  |
| -------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| P1       | `isLikelyCorrupted`가 키릴 1자만 있어도 정상 한글을 영어로 강등 — 원하는 동작이 `it.skip`으로 방치됨. 밀집도 기반 판정으로 전환 | `src/i18n/I18nProvider.tsx:184`       |
| P1       | i18n 이원화: 런타임은 `src/i18n`(en/ko), `src/lib/i18n/types.ts`는 8개 로케일 선언 — 통합 또는 미사용 타입 제거                 | `src/lib/i18n/types.ts:4`             |
| P2       | 서버 번역이 9개 중 3개 네임스페이스만 병합 — 서버 컴포넌트가 tarot.\* 등을 조회하면 무음 폴백. 네임스페이스 목록 공유화         | `src/i18n/server.ts:41`               |
| P2       | ErrorBoundary 3종 공존 — 하나로 수렴                                                                                            | `src/components/ErrorBoundary.tsx` 외 |

### 10. Compatibility 궁합 — 79점

**강점**

- 보안/과금 경로 견고: 가드(failClosed) + zod + claim/release + `refundCreditsOnce` +
  인젝션 새니타이즈 + self-harm 스크리닝.
- ko/en이 `L(ko,en)` 헬퍼 + EN 렌더맵으로 일관, 30×30 pillar sweep 언어순도 테스트.
- injectable now 준수, `console.*` 0건.

**개선점**

| 우선순위 | 내용                                                                                                                                                                                                  | 위치                                                  |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| P1       | **원진(元嗔) 누락**: formatter는 `BRANCH_WONJIN` 태그를 붙이지만 facts는 import조차 안 함 — 寅酉·卯申·辰亥·巳戌 쌍이 차트/무료 리포트/eastern band 점수에서 통째로 빠짐. facts의 tag 빌드에 원진 추가 | `src/lib/compatibility/sajuSynastryFacts.ts:236`      |
| P1       | formatter↔facts 파리티 테스트 부재 — 동일 입력에 대한 태그 집합 일치를 sweep으로 단언해 이 클래스 회귀를 구조적으로 차단                                                                              | `tests/lib/compatibility/`                            |
| P2       | 지지관계 판정 루프가 formatter/facts에 손 복제 — (i,j) pairwise 태그 산출 단일 헬퍼로 추출 (원진 드리프트의 근본 원인)                                                                                | `src/lib/compatibility/sajuSynastryFacts.ts:198`      |
| P2       | `compatibilityIntegrity.test.ts`는 파일 내부 목 상수만 검증 — 실제 모듈 대상으로 재작성 또는 제거                                                                                                     | `tests/compatibilityIntegrity.test.ts:1`              |
| P2       | `HOUSE_MEANING_KO`가 참조 클로저보다 뒤에 선언 (TDZ 의존 배치) — 상수를 위로 이동                                                                                                                     | `src/lib/compatibility/astroSynastryFormatter.ts:254` |

---

## 권장 실행 순서

1. **정합성 버그 수정** (실사용자 영향): 궁합 원진 누락(#1) → 결제 환불 분기(#2)
2. **보안 하드닝**: CSRF forwarded-host(#3), buildMessages 대칭 방어(#5)
3. **침묵 가드 복구**: 타로 스모크(#12), 점성술 ephemeris CI(#11), 궁합 파리티(#16)
4. **SSOT 통합 리팩터**: destiny 오행 상수(#7), 궁합 관계 판정 헬퍼, i18n 이원화(#18)
5. **점진 개선**: 거대 함수 분해(#8), zod 커버리지 확대(#4), 관측성 메트릭

_이 문서는 멀티에이전트 리뷰 스냅샷이다. 개선 반영 후 항목별 재채점을 권장한다._
