# Calendar Grade & Structure (for GPT review)

이 문서는 현재 코드 기준으로 `/api/calendar`의 등급 체계와 계산/응답 구조를 요약한 것입니다.

## 1) 등급 체계 (최고 -> 최악)

기준 점수는 `displayScore` 기준입니다.

- `grade0` (최고/천운): `68+`
- `grade1` (좋음): `62~67`
- `grade2` (보통): `42~61`
- `grade3` (안좋음): `28~41`
- `grade4` (최악): `<28`

추가 라벨(라우트 주석 기준):

- `grade0`: 천운의 날
- `grade1`: 아주 좋은 날
- `grade2`: 좋은 날
- `grade3`: 보통 날
- `grade4`: 최악의 날

근거 파일:

- `src/lib/destiny-map/calendar/scoring-config.ts` (`GRADE_THRESHOLDS`)
- `src/app/api/calendar/lib/helpers.ts` (`getEffectiveGradeFromDisplayScore`)
- `src/app/api/calendar/route.ts` (`grade0~grade4` 그룹 주석)

## 2) 입력 스키마 (`GET /api/calendar`)

`calendarMainQuerySchema` 기준:

- `birthDate` (필수, `YYYY-MM-DD`)
- `birthTime` (선택, 기본 `12:00`)
- `birthPlace` (선택, 기본 `Seoul`)
- `year` (선택, `1900~2100`, 미지정 시 현재 연도)
- `gender` (선택, 기본 `male`)
- `locale` (선택, 기본 `ko`)
- `category` (선택): `wealth | career | love | health | travel | study | general`

근거 파일:

- `src/lib/api/zodValidation/saju.ts` (`calendarMainQuerySchema`)

## 3) 계산 파이프라인 (서버)

아래 순서로 처리됩니다.

1. 쿼리 Zod 검증
2. 생년월일 파싱 + 도시 좌표/타임존 결정
3. 사주 계산 (`calculateSajuData`)
4. 점성 네이탈/애스펙트 계산 (`calculateNatalChart`, `findNatalAspects`)
5. 고급 점성 신호(프로그레션/리턴/드라코닉/하모닉/고정성/식/미드포인트 등) 수집
6. 사주+점성 통합 `matrixInput` 생성 및 cross completeness 보강
7. `buildCoreEnvelope`로 코어/패턴/품질 지표 계산
8. 연간 날짜 생성 (`calculateYearlyImportantDates`, 캐시 사용)
9. 카테고리 필터
10. Matrix 기반 재등급 (`applyMatrixPreformatRegrade`)
11. AI 날짜 보강 시도 (`fetchAIDates`, 기본은 best-effort)
12. 날짜 포맷팅 + 프레젠테이션 요약 생성 (`buildCalendarPresentationView`)
13. 최종 JSON 응답 반환

Strict 모드 관련:

- `CALENDAR_STRICT_ASTROLOGY`: 점성 실패 시 에러 반환 여부
- `CALENDAR_STRICT_MATRIX`: 매트릭스 실패 시 에러 반환 여부
- `CALENDAR_STRICT_AI_ENRICHMENT`: AI 보강 실패 시 에러 반환 여부 (기본 false 성격)

근거 파일:

- `src/app/api/calendar/route.ts`

## 4) 등급 그룹/하이라이트 생성 규칙

서버는 전체 날짜를 먼저 `grade0..grade4`로 그룹화합니다.

- `summary.grade0..grade4`: 각 등급 일수 카운트
- `topDates`: 기본 `grade0+grade1+grade2`; 5개 미만이면 `grade3` 상위 점수로 채움; 최종 최대 10개
- `goodDates`: `grade1+grade2` 상위 점수 최대 20개
- `badDates`: `grade4+grade3` 상위 점수 최대 10개
- `worstDates`: `grade4` 상위 점수 최대 5개
- `allDates`: 전체 포맷된 날짜 배열

정렬:

- 재등급 직후: `grade` 오름차순(0이 최고) + `displayScore` 내림차순

근거 파일:

- `src/app/api/calendar/route.ts`

## 5) 최종 응답 구조 (핵심 필드)

```json
{
  "success": true,
  "type": "yearly",
  "year": 2026,
  "aiEnhanced": true,
  "matrixStrictMode": true,
  "matrixContract": {
    "coreHash": "string",
    "overallPhase": "string",
    "overallPhaseLabel": "string",
    "topClaimId": "string",
    "topClaim": "string",
    "focusDomain": "career|love|money|health|move|general"
  },
  "birthInfo": {
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "place": "Seoul"
  },
  "summary": {
    "total": 365,
    "grade0": 0,
    "grade1": 0,
    "grade2": 0,
    "grade3": 0,
    "grade4": 0
  },
  "topDates": [],
  "goodDates": [],
  "badDates": [],
  "worstDates": [],
  "allDates": [],
  "daySummary": {
    "date": "YYYY-MM-DD",
    "summary": "string",
    "focusDomain": "string",
    "reliability": "string"
  },
  "weekSummary": {
    "rangeStart": "YYYY-MM-DD",
    "rangeEnd": "YYYY-MM-DD",
    "summary": "string"
  },
  "monthSummary": {
    "month": "YYYY-MM",
    "summary": "string"
  },
  "topDomains": [],
  "timingSignals": [],
  "cautions": [],
  "recommendedActions": [],
  "relationshipWeather": {
    "grade": "strong|good|neutral|caution",
    "summary": "string"
  },
  "workMoneyWeather": {
    "grade": "strong|good|neutral|caution",
    "summary": "string"
  },
  "matrixInputCoverage": {},
  "matrixEvidencePackets": {},
  "topMatchedPatterns": [],
  "aiInsights": {
    "auspicious": [],
    "caution": []
  }
}
```

## 6) 참고 파일 목록

- `src/app/api/calendar/route.ts`
- `src/app/api/calendar/lib/helpers.ts`
- `src/app/api/calendar/lib/presentationAdapter.ts`
- `src/app/api/calendar/lib/types.ts`
- `src/lib/destiny-map/calendar/scoring-config.ts`
- `src/lib/api/zodValidation/saju.ts`
- `src/components/calendar/CalendarGrid.tsx`
