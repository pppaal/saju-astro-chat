# 사주 · 점성 계산 커버리지 감사

**최종 업데이트**: 2026-06-05 (Round 1 명궁 + 납음 추가 직후)

이 문서는 본 코드베이스가 가진 사주·점성 계산 모듈 전체 인벤토리와 각 모듈이 실제로 어느 사용자-facing 서비스에 노출되는지를 정리한다. "계산은 되는데 어디서도 안 쓰는" 데드 영역과 "아직 계산 자체가 없는" 미구현 영역을 한 눈에 본다.

## 서비스 약자

- **운흐름** — 5-tier 생애 운명 차트 (`/destinypal`, `src/components/destinypal/*`) ※ 코드 폴더명은 `destinypal` 이지만 사용자 가시 명칭은 "운흐름" 으로 통칭
- **통합 리포트** — `/integrated-report` (chart.zip 디자인 기반)
- **운명상담사** — `/destiny-counselor` (LLM 챗)
- **궁합** — `/compatibility/counselor`
- **캘린더** — `/calendar` premium 흐름표 (`src/components/calendar/premium/*`) + 모든 calendar-engine extractor
- **타로** — 타로 자체 데이터만 쓰므로 사주/점성 raw 영향 거의 없음

## 사주 측 인벤토리

| 분석 | 계산 | 운흐름 | 통합 리포트 | 운명상담사 | 궁합 | 캘린더 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| 4기둥 (pillars) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 일주 (dayMaster) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 강약 (strength) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 용신 (yongsin) | ✅ | - | ✅ | ✅ | ✅ | - |
| 격국 (geokguk) — 일반 | ✅ | - | ✅ | ✅ | ✅ | ✅ |
| 십신 (sibsin) | ✅ | - | ✅ | ✅ | ✅ | ✅ |
| 신살 (shinsal) | ✅ | - | ✅ | ✅ | - | ✅ |
| 합·충·형·파·해 (relations) | ✅ | - | ✅ | ✅ | - | ✅ |
| 대운 (daeun) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 오행 분포 (fiveElements) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 지장간 (jijanggan) | ✅ | ✅ | ✅ | - | - | ✅ |
| 12운성 (twelveStages) | ✅ | ✅ | ✅ | ✅ | - | ✅ |
| 공망 (gongmang) | ✅ | - | ✅ | ✅ | - | ✅ |
| 일주 archetype | ✅ | - | - | ✅ | - | - |
| **형충회합** (hyeongchung) | ✅ | - | **❌** | **❌** | - | ✅ |
| **통근** (tonggeun) | ✅ | - | **❌** | **❌** | - | ✅ |
| **득령** (deukryeong) | ✅ | - | **❌** | **❌** | - | - |
| **조후용신** (johuYongsin) | ✅ | - | **❌** | **❌** | - | ✅ |
| **건강·직업** (health/career) | ✅ | - | **❌** | **❌** | - | - |
| **종합 점수** (score) | ✅ | - | **❌** | **❌** | - | - |
| **해석 텍스트** (interpretations) | ✅ | - | **❌** | **❌** | - | - |
| **명궁** (myungGung) ⭐ 2026-06-05 신규 | ✅ | **❌** | **❌** | **❌** | - | - |
| **납음** (nayin) ⭐ 2026-06-05 신규 | ✅ | **❌** | **❌** | **❌** | - | - |
| 자평진전 8격 정밀 | **❌** | - | - | - | - | - |
| 천을귀인 정밀 활성도 | **❌** | - | - | - | - | - |
| 24절기 정밀 hour 보정 | **❌** | - | - | - | - | - |
| 신주·명주 (자미두수) | **❌** | - | - | - | - | - |

## 점성 측 인벤토리

| 분석 | 계산 | 운흐름 | 통합 리포트 | 운명상담사 | 궁합 | 캘린더 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| chart (planets, houses, ASC, MC) | ✅ | ✅ | ✅ | ✅ | - | ✅ |
| sect (낮/밤) | ✅ | ✅ | ✅ | ✅ | - | ✅ |
| extraPoints (Chiron, Lilith) | ✅ | - | ✅ | ✅ | - | ✅ |
| natalAspects | ✅ | - | ✅ | ✅ | - | - |
| dignities | ✅ | ✅ | ✅ | ✅ | - | - |
| **lots** (7 Arabic Parts) | ✅ | ✅ | **❌** | **❌** | - | ✅ |
| **almutenFiguris** | ✅ | ✅ | **❌** | **❌** | - | - |
| **zodiacalReleasing** (ZR) | ✅ | ✅ | **❌** | **❌** | - | ✅ |
| **profections** (연 군주) | ✅ | - | **❌** | ✅ | - | ✅ |
| **progressions** (전진법) | ✅ | - | **❌** | - | - | ✅ |
| **transits** | ✅ | ✅ | - | ✅ | - | ✅ |
| **eclipses** | ✅ | - | - | - | - | ✅ |
| **fixed stars** (Regulus, Spica 등) | ✅ | - | **❌** | - | - | ✅ |
| **asteroids** (Ceres, Vesta 등) | ✅ | - | **❌** | - | - | ✅ |
| **midpoints** | ✅ | - | **❌** | - | - | ✅ |
| **harmonics** | ✅ | - | **❌** | - | - | ✅ |
| **draconic** | ✅ | - | **❌** | - | - | ✅ |
| **synastry** (두 차트 비교) | ✅ | - | - | - | **❌** | - |
| **composite** (두 차트 평균) | ✅ | - | - | - | **❌** | - |
| **returns** (Solar/Lunar Return) | ✅ | - | **❌** | - | - | ✅ |
| **electional** (택일) | ✅ | - | - | - | - | ✅ |
| **planetReturns** (행성 회귀) | ✅ | - | - | - | - | **0 사용처** |
| 28수 (lunar mansions) | ✅ | - | - | - | - | ✅ |
| firdaria (페르시아 75년) | ✅ | - | - | - | - | ✅ |
| Heliocentric | ✅ | - | - | - | - | ✅ |
| Hyleg/Alcocoden | **❌** | - | - | - | - | - |
| Vedic dasha (Vimshottari) | **❌** | - | - | - | - | - |
| Vedic divisional (D9, D10 등) | **❌** | - | - | - | - | - |
| Tajaka annual chart | **❌** | - | - | - | - | - |
| Vertex / Anti-vertex | **❌** | - | - | - | - | - |

## 큰 그림 — 진짜 missing

### 🔴 계산도 없고 가치 큰 것 (사주)
1. **자평진전 8격 정밀** — 사주 해석 표준화
2. **천을귀인 정밀 활성도** — 본명·운기마다 활성도 다름
3. **24절기 정밀 hour 보정** — 진태양시 정밀화

### 🔴 계산도 없고 가치 큰 것 (점성)
4. **Vedic dasha (Vimshottari)** — 인도 점성술 표준 시간 군주
5. **Hyleg/Alcocoden** — 헬레니즘 생명력 분석
6. **Vertex** — 운명의 만남 표상

### 🟡 계산 있는데 노출 거의 0 (UI/LLM 통합 필요)
- **사주**: 형충회합, 통근, 득령, 조후용신, health, career, score, interpretations, 명궁, 납음
- **점성**: lots/almutenFiguris/ZR (운흐름만), fixed stars, asteroids, midpoints, harmonics, draconic, returns

### 🔴 궁합 점성 측 비어있음
- **Synastry** 계산은 있는데 궁합 페이지에서 0 사용 ← 가장 큰 missing
- **Composite** 도 마찬가지

## 다음 단계 추천

- **A**: 궁합 페이지에 Synastry 통합 (코드 있음, UI만 필요) — 가장 큰 임팩트
- **B**: 통합 명식 리포트에 dead 8개 + 명궁/납음/lots/almutenFiguris/ZR/profections 노출
- **C**: 자평진전 8격 정밀 compute 추가
- **D**: Vedic dasha compute 추가
