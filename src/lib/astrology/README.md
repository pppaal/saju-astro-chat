# `src/lib/astrology/` — 점성학 엔진

**Canonical file map.** 같은 일을 하는 점성 함수가 여러 곳에 흩어지는 걸 막기 위한 문서.

## 폴더 구조

```
src/lib/astrology/
├── astrology.ts             # 메인 entry — calculateAstrologyData(birth) → natal+daily+monthly+yearly+daewoon+advanced 11
├── index.ts                 # 모든 export 통합
├── comprehensiveReport.ts   # 7테마 + 4시기 섹션 + advice (해석 prose)
├── interpretations.ts       # planet × sign × house static dictionary
├── dignities.ts             # canonical Hellenistic dignity (6단계 + triplicity)
├── aspectScoring.ts         # canonical aspect 점수 (orb-weighted)
├── balance.ts               # 원소·모달리티·극성 balance
├── localization.ts          # KO/EN
├── hellenisticTiming.ts     # Brennan: profection year-lord / ZR L1+L2 / sect-aware bonification prose
├── extraPointInterpretations.ts  # Chiron/Lilith × sign+house
├── advancedInterpretations.ts    # eclipse/midpoint/draconic/fixed-star prose
├── aspectPairInterpretations.ts  # planet pair × aspect kind (curated overrides + function-based fallback)
├── asteroidInterpretations.ts    # Ceres/Pallas/Juno/Vesta × sign
├── pofVertexInterpretations.ts   # Part of Fortune / Vertex × sign+house
├── graphIds.ts              # UI graph IDs
└── foundation/              # 11개 advanced 엔진 (lower-level)
    ├── astrologyService.ts  # canonical natal chart calc (Swiss Ephemeris)
    ├── transit.ts           # canonical transit aspects (real ephemeris angle compare)
    ├── aspects.ts           # natal aspect detection
    ├── houses.ts            # house cusps
    ├── returns.ts           # canonical Solar Return + Lunar Return (real Sun-longitude match)
    ├── progressions.ts      # secondary progressions
    ├── asteroids.ts         # canonical 4 소행성 (Ceres/Pallas/Juno/Vesta)
    ├── extraPoints.ts       # canonical Chiron/Lilith/PoF/Vertex
    ├── fixedStars.ts        # canonical fixed star conjunctions (50+ stars)
    ├── midpoints.ts         # canonical midpoints + activations
    ├── eclipses.ts          # canonical eclipse impact analysis
    ├── draconic.ts          # draconic chart comparison
    ├── electional.ts        # canonical planetary hour (variable-arc Chaldean) + moon phase + void of course
    ├── synastry.ts          # 시너스트리
    ├── composite.ts         # 합성 차트
    ├── harmonics.ts         # 하모닉 분석
    ├── rectification.ts     # 출생시간 교정
    ├── transitBatch.ts      # 365일 transit batch
    └── types.ts             # 공유 타입
```

## Canonical functions (사용해야 하는 것)

| 영역 | Canonical | 위치 |
|---|---|---|
| Natal chart | `calculateNatalChart` | `foundation/astrologyService.ts` |
| Transit aspects | `findTransitAspects` (실제 ephemeris) | `foundation/transit.ts` |
| Major transits | `findMajorTransits` | `foundation/transit.ts` |
| Dignity (6단계 + triplicity) | `getEssentialDignity` | `dignities.ts` |
| Aspect 점수 (orb-weighted) | `scoreAspect` / `aggregateAspectScore` | `aspectScoring.ts` |
| Solar Return | `calculateSolarReturn` (실제 sun-longitude match) | `foundation/returns.ts` |
| Lunar Return | `calculateLunarReturn` | `foundation/returns.ts` |
| Planetary hour | `calculatePlanetaryHour` (variable-arc) | `foundation/electional.ts` |
| Moon phase | `getMoonPhase` (각 분리 기반) | `foundation/electional.ts` |
| Void of course | `checkVoidOfCourse` | `foundation/electional.ts` |
| Eclipse impact | `findEclipseImpact` | `foundation/eclipses.ts` |
| Asteroids | `calculateAllAsteroids` | `foundation/asteroids.ts` |
| Extra points | `calculateExtraPoints` | `foundation/extraPoints.ts` |
| Fixed stars | `findFixedStarConjunctions` | `foundation/fixedStars.ts` |
| Midpoints | `calculateMidpoints` + `findMidpointActivations` | `foundation/midpoints.ts` |
| Draconic | `compareDraconicToNatal` | `foundation/draconic.ts` |
| Profection / ZR / bonification prose | `readProfection` / `readZodiacalReleasing` / `readBonification` | `hellenisticTiming.ts` |
| Aspect pair interpretation | `getAspectPairInterpretation` | `aspectPairInterpretations.ts` |

## 평행 엔진 (legacy, 정리 예정)

이전엔 calendar 내부에 자체 transit/planetary-hour heuristic이 있었음. 정확하지 않아서 문서적으로 deprecated:
- `src/lib/destiny-map/calendar/transit-analysis.ts:analyzePlanetTransits` — sign 비교만, 365일 batch 성능용. 정확한 transit은 `foundation/transit.ts` 사용.
- `src/lib/destiny-map/calendar/planetary-hours.ts:getPlanetaryHourForDate` — 6-18시 고정. 정통은 `foundation/electional.ts:calculatePlanetaryHour`.

## 새 점성 함수 추가 룰

1. **lower-level (계산)** = `foundation/`에
2. **prose (해석)** = `*Interpretations.ts` 또는 `comprehensiveReport.ts`
3. **scoring/aggregation** = root에 (`aspectScoring.ts`, `balance.ts` 등)
4. 새 파일 만들지 말 것 — 위 canonical에 함수 추가
5. Cross-rules / matrix engine은 위 canonical을 호출하는 adapter
