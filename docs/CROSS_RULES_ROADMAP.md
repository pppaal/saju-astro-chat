# Cross-Rules Engine — 개선 체크리스트

> 현재 상태: 룰 143 / 테스트 75 / 명세 자동 생성 / 2개 큰 버그 수정 완료
> 등급: 엔진 A−, 제품 완성도 C+ (UI·LLM 실측 미흡)

---

## 🔥 P0 — 운영 시작 전 필수

### LLM 실측
- **현 상태**: `llmRenderer.ts`·`chat.ts` 코드는 작성됐으나 호출 0회
- **할 일**: `ANTHROPIC_API_KEY` 환경변수 세팅 후 `runFortune` + `renderWithLlm` 5명 샘플 호출
- **검증 항목**: 응답 길이·톤·환각 여부·캐싱 hit rate
- **예상 시간**: 30분 (코드 변경 없음)

### UI 1개
- **현 상태**: API 라우트 3개 (`/api/fortune-cross`, `/chat`, `/cross/...`) 있음. 화면 없음
- **할 일**: 입력 폼 + 결과 페이지 1세트
- **권장**: 기존 `src/app/saju/`나 `src/app/astrology/` 패턴 따라가기
- **예상 시간**: 1~2시간

---

## ⚠️ P1 — 품질 다듬기

### 베타 테스트 (사용자 5~20명)
- 본인 + 친구 사주로 돌려서 어색한 부분 수집
- 도메인별 narrative가 사용자 경험과 맞는지 확인
- 메타룰 발화 빈도가 적절한지 측정
- **결과물**: 룰별 fine-tune 목록

### saju normalizer 분할 (현 1001줄)
- `normalizer/saju/state.ts` — 원소·십성·궁
- `normalizer/saju/relation.ts` — 합/충/형/파/해/합화/충해
- `normalizer/saju/timing.ts` — 운 + 합성 event
- `normalizer/saju/extras.ts` — 신살·12운성·격국·용신·지장간·상신·구응
- **이유**: 단일 파일이 너무 커서 PR 리뷰·신규 작업자 진입 어려움

### 테스트 파일 분할 (현 1100+ 줄)
- `tests/fortune-cross-rules/engine.test.ts`
- `tests/fortune-cross-rules/aggregator.test.ts`
- `tests/fortune-cross-rules/rules-corpus.test.ts`
- `tests/fortune-cross-rules/regression.test.ts`

### 메타룰 임계 통계 보정
- 현재 기본값이 1995-02-09 차트 기준 0개 발화 — 보수적
- 베타 데이터 누적 후 `setMetaThresholds(...)` 활용해 분포 분석
- 1000명 차트에서 메타 테마 평균 1~2개 발화하도록 임계 조정

---

## 📚 P2 — 도메인 다듬기

### 다른 도메인 deep-dive
- ✅ career: 22 → 38 (deep)
- love: 9 (얕음). 7궁 dignity, Venus aspects, composite chart 기초 추가 가능
- money: 11 (보통). 2궁/8궁 dignity 세분화, 격국별 부유 패턴 추가 가능
- family: 11 (보통). 4궁/IC, 부모 역할 십성 매핑 세분화
- health: 14 (좋음). 임상 사례 부재로 더 늘리는 것은 한계
- self: 57 (충분)

### 정밀화 가능한 룰
- **자평진전 양인합살** 세부: 무관·정치·격투 등 직업 범주별 fine-grain
- **식신제살** 세부: 능동적 권력 + 학자 vs 운동가 분기
- **종격 운로 분석**: 종왕격이 비겁/인성 운에 형통 vs 식상/재성/관성 운에 손해 — 운별 룰
- **삼합 vs 방합 차이**: 현재 통합 처리 중

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
P0 (LLM 실측) → 베타 테스트 → P1 (메타 임계 보정 + 룰 fine-tune) → P2 (도메인 deep-dive)

P3, P4는 독립적으로 진행 가능.
```

권장 순서: **P0 → 베타 → P1 → P2/P3 병렬**
