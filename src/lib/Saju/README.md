# `src/lib/Saju/` — 사주명리 엔진

**Canonical file map.** 같은 일을 하는 함수가 여러 곳에 흩어져 답이 갈리는 걸 막기 위한 문서. 새 사주 함수 추가 전 이 표 먼저 확인.

## 파일별 책임

| 파일 | Canonical 책임 | 다른 파일에 같은 거 있으면 wrapper로 |
|---|---|---|
| `saju.ts` | 메인 entry. `calculateSajuData(birthDate, time, gender, calendar, tz)` → 4기둥 + 대운/세운/월운/일운 + 십신/지장간 |  |
| `geokguk.ts` | **canonical 격국**: `determineGeokguk`(17 정통격) + `detectGeokgukVariation`(진종/가종/파격/합거) | `advancedSajuAnalysis.analyzeGeokguk`은 wrapper |
| `yongsin.ts` | **canonical 용신**: `determineYongsin` (조후 DB 우선 → 억부 → 통관 → 병약) | `advancedSajuAnalysis.analyzeYongsin`은 wrapper |
| `johuYongsin.ts` | **canonical 조후 DB**: 120-case 궁통보감 (일간×월령) + `getJohuPrescription`(천간 처방·색·방향·시간 + 비가역 행동 가드) | `yongsin.ts:selectJohuYongsin`은 이 DB lookup |
| `strengthScore.ts` | **canonical 신강/신약**: `calculateStrengthScore`(6단계 100점, 득령·통근 정밀) + `calculateComprehensiveScore` | `yongsin.ts:assessDaymasterStrength`은 wrapper (5단계 매핑) |
| `shinsal.ts` | **canonical 신살 + 12운성**: `getShinsalHits`, `getTwelveStagesForPillars`, `getTwelveShinsalSingleByPillar` | calendar 내부 자체 신살 헬퍼는 빠른 score용 |
| `relations.ts` | **canonical 합·형·충·파·해**: `analyzeRelations`, `toAnalyzeInputFromSaju` | `hyeongchung.ts`는 더 자세한 detail 분석 (보완) |
| `hyeongchung.ts` | 형충회합 detail 분석 (`relations.ts`보다 깊은 구조) |  |
| `sibsinAnalysis.ts` | 십신 분포 종합 분석: `analyzeSibsinComprehensive` |  |
| `interpretations.ts` | 사주 정적 dictionary (12운성·신살·일주 한국어 lookup) |  |
| `irreversibleActionGuards.ts` | **canonical 비가역 행동 가드**: `getIrreversibleActionGuards`(6 행동 × 4 level: go/caution/wait/block) |  |
| `advancedSajuAnalysis.ts` | **사주 advanced 통합 entry**: `analyzeAdvancedSaju`. 내부적으로 `geokguk.ts`/`yongsin.ts`/`strengthScore.ts`로 위임. 이전 이름 `astrologyengine.ts`(사주 폴더에 있는데 이름이 점성이라 혼동) → 2025-05 rename. |  |
| `healthCareer.ts` | 직업 적성 + 건강 분석 |  |
| `unseAnalysis.ts` | 운세 종합 분석 — 대운·세운·월운·일운 통합 평가 + advice |  |
| `unse.ts` | 운세 timing 헬퍼 |  |
| `compatibilityEngine.ts` | 사주 궁합 |  |
| `family/familyLineage.ts` | 가족 계보 분석 |  |
| `event-correlation/eventCorrelation.ts` | 사건 상관 분석 |  |
| `pillar-lookup/pillarLookup.ts` | 4기둥 lookup |  |
| `cache/` | 사주 캐시 |  |
| `data/` | 정적 데이터 (지지장간 등) |  |
| `constants.ts` | 상수 (천간·지지·오행 관계) |  |
| `types.ts` | 공유 타입 |  |
| `graphIds.ts` | UI graph ID |  |
| `johuYongsin.ts` | `MONTH_CLIMATE` (월령 → 한습/조열/온화 매핑) |  |
| `comprehensiveReport.ts` | 사주 결과 페이지용 단일 리포트 (deprecated, route별로 분산됨) |  |

## 새 사주 함수 추가 룰

1. 위 표에서 어느 canonical 파일에 속하는지 확인
2. **새 파일 만들지 말 것** — canonical 파일에 함수 추가
3. 같은 일을 하는 함수가 이미 있으면 그걸 호출하는 wrapper로
4. 정통 룰북(자평진전·적천수·궁통보감) 출처 주석으로

## 외부 path가 사용하는 것

```
/api/saju/route.ts            → calculateSajuData + analyzeAdvancedSaju
/api/destiny-map/chat-stream  → calculateSajuData + analyzeAdvancedSaju + getJohuPrescription + detectGeokgukVariation + getIrreversibleActionGuards
/api/calendar/route.ts        → calculateSajuData + analyzeAdvancedSaju
/api/destiny-matrix/route.ts  → calculateSajuData + getShinsalHits + analyzeRelations + analyzeAdvancedSaju
/api/compatibility/*          → calculateSajuData + performAdvancedAnalysis
```

## 통일된 결과 보장 (2025-05 refactor 후)

같은 사람을 위 어느 path로 봐도 **격국·용신·신강신약·조후·12운성·신살**이 같은 답을 함. yongsin은 `johuYongsin.ts`의 120-case 정통 DB 우선.
