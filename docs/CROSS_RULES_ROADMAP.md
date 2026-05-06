# Cross-Rules Engine — 개선 체크리스트

> 현재 상태: 룰 143 / 테스트 75 / 명세 자동 생성 / 2개 큰 버그 수정 완료
> 등급: 엔진 A−, 제품 완성도 C+ (UI·LLM 실측 미흡)

---

## 🧭 상시 디시플린 — 출력 계층 일관성 & 릴리스 위생 (Release Hygiene)

룰·도메인이 늘어날수록 오케스트레이션 파일이 다시 비대해지는 패턴이 반복됩니다. 우선순위 작업과 무관하게 **모든 PR에서 적용**합니다.

### 파일 비대화 가드레일
- **상한선**: 단일 파일 600줄 (orchestration), 400줄 (rules/normalizer 서브모듈), 250줄 (adapter/bridge)
  - 대상 파일: `src/lib/fortune/cross-rules/engine.ts`, `aggregator.ts`, `renderer.ts`, `llmRenderer.ts`, `chat.ts`, `metaRules.ts`, `normalizer/saju.ts`, `normalizer/astro.ts`
- **상한 도달 시**: PR 머지 차단. 분할 또는 룰을 `rules/<domain>-<sub>.ts`로 이관
- **CI 체크**: `scripts/check-file-size.ts` (또는 동등) — 상한 초과 시 실패

### 출력 계층 일관성
- **단일 출력 스키마**: `CrossRuleOutput` (`src/lib/fortune/cross-rules/types.ts`) — 모든 렌더러(`renderer`/`llmRenderer`)는 동일 evidence·polarity·domain 키 사용
- **금지 사항**:
  - 렌더러 내부에서 룰 재해석 (룰은 engine에서만)
  - LLM 렌더러가 정적 렌더러보다 더 많은 필드 노출 (역방향 OK, 정방향 금지)
  - 메타룰 narrative를 도메인 narrative로 섞기
- **회귀 테스트**: `tests/fortune-cross-rules/output-consistency.test.ts` — 동일 input → 정적/LLM 렌더러 evidence 키 집합 동일

### 릴리스 위생 체크리스트 (PR 머지 전)
- [ ] 신규/수정 룰의 단위 테스트 추가 (predicate purity + sample chart fixture)
- [ ] 자동 명세(`docs/CROSS_RULES_SPEC.md`) 재생성 — 누락 시 CI 실패
- [ ] 파일 사이즈 상한 통과
- [ ] `runFortune` 골든 fixture 5개 회귀 통과
- [ ] 메타룰 임계값 변경 시 `setMetaThresholds(...)` 호출 위치 모두 추적

---

## 🔥 P0 — 운영 시작 전 필수

### P0-1. 메타룰 임계값 캘리브레이션 (LLM 실측 **이전**)
- **현 상태**: 기본값이 1995-02-09 차트 기준 0개 발화 — 보수적
- **목표**: 1000명 합성/실제 차트에서 메타 테마 평균 **1~2개 발화**
- **방법**:
  1. `scripts/cross-rules/sample-charts.ts` — 1000개 birth profile 합성 (성별·연도·시간대 분포)
  2. 각 차트에서 `runFortune({ meta: { collectStats: true } })` 호출 → 메타룰 발화 빈도 분포 수집
  3. 분포 분석 후 `setMetaThresholds(...)`로 P50≈1, P95≈3 되도록 조정
  4. 1000-chart 회귀 fixture로 임계값 동결
- **출력**: `docs/META_RULE_CALIBRATION.md` (분포 히스토그램 + 최종 임계값 표)
- **이유**: LLM 실측 전에 임계값을 잡아야 LLM 비용·환각 변수가 섞이지 않음
- **예상 시간**: 2~3시간

### P0-2. LLM 실측
- **현 상태**: `llmRenderer.ts`·`chat.ts` 코드는 작성됐으나 호출 0회
- **할 일**: P0-1 캘리브레이션 완료 후 `ANTHROPIC_API_KEY` 세팅 → `runFortune` + `renderWithLlm` 5명 샘플 호출
- **검증 항목**: 응답 길이·톤·환각 여부·캐싱 hit rate
- **예상 시간**: 30분 (코드 변경 없음)

### P0-3. UI 1개
- **현 상태**: API 라우트 3개 (`/api/fortune-cross`, `/chat`, `/cross/...`) 있음. 화면 없음
- **할 일**: 입력 폼 + 결과 페이지 1세트
- **권장**: 기존 `src/app/saju/`나 `src/app/astrology/` 패턴 따라가기
- **예상 시간**: 1~2시간

---

## ⚠️ P1 — 품질 다듬기

### P1-1. saju normalizer 4-way 분할 (현 998줄)
- **대상**: `src/lib/fortune/cross-rules/normalizer/saju.ts` (998줄)
- **분할안**:
  - `normalizer/saju/state.ts` — 원소·십성·궁
  - `normalizer/saju/relation.ts` — 합/충/형/파/해/합화/충해
  - `normalizer/saju/timing.ts` — 운(대운/세운/월운/일진) + 합성 event
  - `normalizer/saju/extras.ts` — 신살·12운성·격국·용신·지장간·상신·구응
  - `normalizer/saju/index.ts` — 위 4개 합성 + 외부 export 유지 (기존 import 경로 호환)
- **이유**: 단일 파일이 너무 커서 PR 리뷰·신규 작업자 진입 어려움. 릴리스 위생 상한선 위반
- **검증**: 분할 전후 동일 input → 동일 normalized output (스냅샷 회귀)
- **예상 시간**: 3~4시간

### P1-2. 베타 테스트 (사용자 5~20명)
- 본인 + 친구 사주로 돌려서 어색한 부분 수집
- 도메인별 narrative가 사용자 경험과 맞는지 확인
- 메타룰 발화 빈도가 P0-1 캘리브레이션 결과와 일치하는지 실측 검증
- **결과물**: 룰별 fine-tune 목록

### P1-3. 테스트 파일 분할 (현 1100+ 줄)
- `tests/fortune-cross-rules/engine.test.ts`
- `tests/fortune-cross-rules/aggregator.test.ts`
- `tests/fortune-cross-rules/rules-corpus.test.ts`
- `tests/fortune-cross-rules/regression.test.ts`
- `tests/fortune-cross-rules/output-consistency.test.ts` (신규 — 정적/LLM 렌더러 evidence 일치 검증)

---

## 📚 P2 — 도메인 딥다이브 (룰 보강)

### P2-1. love 딥다이브 (현 9개 → 목표 25+)
- **대상 파일**: `src/lib/fortune/cross-rules/rules/love-deep.ts`
- **추가 축**:
  - 7궁 dignity (essential + accidental) × 일간 강약
  - Venus aspects × 사주 일지 합·충
  - Mars-Venus 패턴 × 식신/상관·정관/편관
  - 5궁 (연애 표현) × 도화·홍염
  - composite chart 기초 신호 (1인 한정 내에서 추출 가능한 지표만)
  - 정관/편관 개수 × 7궁 ruler 상태
  - 정재/편재 (남성) × Venus
  - 일지 합화 결과 vs 일지 충 — 관계 안정성 polarity
- **검증**: 신규 룰별 단위 테스트 + 메타룰 발화 빈도 영향 측정 (P0-1 임계값 재보정 트리거 가능)

### P2-2. money 딥다이브 (현 11개 → 목표 25+)
- **대상 파일**: `src/lib/fortune/cross-rules/rules/money-deep.ts`
- **추가 축**:
  - 2궁/8궁 dignity 세분화 (ruler 강약 × 수성/목성 aspect)
  - 격국별 부유 패턴 (식신생재·재격·종재격·재자약살격 등)
  - Lot of Fortune × 2궁 ruler
  - 정재 vs 편재 × Jupiter dignity
  - 식상생재 흐름 통근 강도 × 재성 통근
  - 8궁 (자원·유산·투자) × Pluto/Saturn aspect
  - 재성 충·합화 → 변동성 polarity
  - 운로별 재성 활성화 (대운 식상/재성 vs 비겁/인성 비교)

### P2-3. family 딥다이브 (현 11개 → 목표 22+)
- **대상 파일**: `src/lib/fortune/cross-rules/rules/family-deep.ts`
- **추가 축**:
  - 4궁/IC × 인성 강약 (모친 관계)
  - 10궁/MC × 정관·편재 (부친 관계)
  - 부모 육친 십성 매핑 세분화 (편재=부, 정인=모 등 정통 매핑)
  - 형제 (비겁) × 3궁/Mercury
  - 자녀 (식상) × 5궁
  - 일지-월지 합·충 → 부모와의 거리감 polarity
  - 화개살·역마살 × 4궁 ruler — 이주·분리 패턴
  - 가족 내 역할 (장남/장녀 십성 패턴)

### P2-4. 정밀화 가능한 기존 룰
- **자평진전 양인합살** 세부: 무관·정치·격투 등 직업 범주별 fine-grain
- **식신제살** 세부: 능동적 권력 + 학자 vs 운동가 분기
- **종격 운로 분석**: 종왕격이 비겁/인성 운에 형통 vs 식상/재성/관성 운에 손해 — 운별 룰
- **삼합 vs 방합 차이**: 현재 통합 처리 중

### P2-5. 도메인 현황 (참고)
- ✅ career: 22 → 38 (deep)
- love: 9 → 목표 25+ (P2-1)
- money: 11 → 목표 25+ (P2-2)
- family: 11 → 목표 22+ (P2-3)
- health: 14 (좋음). 임상 사례 부재로 더 늘리는 것은 한계
- self: 57 (충분)

---

## 🛠 P3 — 기능 확장

### 진태양시 옵션 추가
- 현재 표준시(KST) 고정
- `solarTimeMode: 'standard' | 'meanSolar' | 'trueSolar'` opt-in API
- 시지 경계(±15분)에 있는 사용자에게 두 결과 모두 보여주기
- **참고**: `docs/SOLAR_TIME_CONVENTION.md`

### ZR L3·L4 (일·시 단위)
- 현재 L1·L2까지 (년·월)
- L3 = 일 단위 sub-period — 단기 의사결정에 유용
- L4 = 시 단위 — 노이즈 비율 큼, 한계효용 낮음

### 8-condition Bonification
- 현재 7-condition까지 (adherence·strikingRay·overcoming·opposition·enclosure·reception + general aspect)
- 8번째 = combust by Sun (이미 별도 시그널로 분리됨, 통합만 하면 됨)

### Composite chart (궁합)
- 두 사람 합성 차트 + 사주 일주 비교
- 별도 모듈 — 현재 cross-rules는 1인 한정

### Locality (이주 운세)
- 출생지 ↔ 거주지 위경도 차이로 angles 재계산
- relocation chart 지원 옵션

---

## 🐛 P4 — 알려진 작은 이슈

- **PlanetBase.speed가 항상 채워지지 않음** — bonification의 applying 판정이 일부 케이스에 부정확. swisseph SEFLG_SPEED 항상 사용 확인 필요
- **메타룰 narrative가 정적 텍스트** — 사용자 차트별 상황 반영 X. LLM 렌더러에서 보강 가능
- **fixed star 위치 세차 보정** — 현재 자동 보정되는지 검증 필요 (`fixedStars.ts` 동작 확인)
- **Combust orb 17°는 보수적** — 학파에 따라 8.5° 또는 15° 차이. 옵션 가능하게

---

## ✅ 완료된 큰 항목 (참고)

- [x] 사주·점성 100% 데이터 추출
- [x] 3-layer × 6-domain × 6-scale 매트릭스
- [x] 합성 시그널 (state×timing 활성화)
- [x] 컨텍스트 의존 polarity (런타임 결정)
- [x] 메타룰 (도메인 간 패턴) + 임계 calibration knob
- [x] LLM renderer (counselor + report 모드)
- [x] LLM chat (multi-turn + prompt caching)
- [x] 자평진전: 격국·용신·상신·성격/파격·구응·성중유패·종격·화기격·양인합살·관인상생·식신생재·식신제살 등 11 classical combos
- [x] Hellenistic: Sect, Lots (Fortune+Spirit), Triplicity, Profection lord, Joys, Bonification 7-condition, ZR L1·L2, Combust/Cazimi
- [x] 한방 일간×오행 5종 + 일반 health 패턴
- [x] 통근·합화·충해·신살 충 처리·대운 시퀀스·육친·생애 단계
- [x] Renderer evidence 한국어 변환
- [x] 75개 단위 테스트 (predicate purity, 다양한 birth case 회귀)
- [x] 자동 명세 생성 (50k+ 자)
- [x] 진태양시 정책 문서화

---

## 의존도 정리

```
[상시] 출력 계층 일관성 & 릴리스 위생 (모든 PR 게이트)
   │
   ▼
P0-1 메타룰 캘리브레이션 → P0-2 LLM 실측 → P0-3 UI
   │
   ▼
P1-1 saju normalizer 분할 (병렬 가능)
   │
   ▼
P1-2 베타 테스트 → P2 도메인 딥다이브 (love/money/family)

P3, P4는 독립적으로 진행 가능.
```

권장 순서: **[상시 가드레일 ON] → P0-1 → P0-2 → P0-3 → P1-1 → P1-2 → P2 (love→money→family)**
