# `src/lib/destiny-map/` — 운명 지도 서비스 wrapper

destiny-map은 **`/api/destiny-map/` 엔드포인트 + 캘린더 + 카운슬러 + 리포트 생성**의 service-level wrapper. canonical 엔진 (`Saju/`, `astrology/`, `fortune/cross-rules/`, `destiny-matrix/`)을 호출해서 서비스가 쓰기 좋은 형태로 다시 묶어줌.

## 폴더 구조

```
destiny-map/
├── astrology/                  점성 service orchestrator
│                                computeDestinyMap → natal + advanced + asteroids + electional + saju
│                                내부적으로 src/lib/astrology/ canonical 호출
│
├── calendar/                   캘린더 엔진 (실제 구현)
│   ├── astrology/              calendar 전용 astro helpers (newer modular)
│   │                            아래 flat 파일들과 일부 중복 — 둘 다 production 사용 중
│   ├── analyzers/              사주/점성 일별 분석기
│   ├── astrology-*.ts          legacy flat astro helpers (365-batch heuristic)
│   ├── transit-analysis.ts     calendar 365-batch transit (sign 비교 heuristic)
│   ├── planetary-hours.ts      6-18시 고정 (lightweight) — 정통은 astrology/foundation/electional.ts
│   ├── scoring*.ts             일별 score factory
│   ├── temporal-scoring.ts     대운·세운·월운·일운 시간 점수
│   └── ...
│
├── chat-stream/                카운슬러 chat 보조 (config)
├── prompt/                     사주 prompt builder (theme별)
│   └── fortune/                fortune prompt 모듈
│
├── helpers/                    공통 helper
├── visual/                     UI 시각화
├── config/                     설정
│
├── destinyCalendar.ts          📌 calendar/ 의 public re-export shim
├── reportService.ts            📌 AI 리포트 entry (cached + safety guards)
├── local-report-generator.ts   📌 AI 없는 template 리포트 (별도 용도)
├── report-helpers.ts           📌 text helpers (security re-export)
│
├── type-guards.ts              타입 가드
├── types.ts                    공유 타입
└── sanitize.ts                 sanitization
```

## 핵심 룰

1. **destiny-map/astrology/ = service orchestrator**, 평행 점성 엔진 X. 내부적으로 `@/lib/astrology` canonical 호출.

2. **destiny-map/calendar/ 안 dual 구조 (legacy + 모듈식)**
   - 기존 flat 파일 (`astrology-*.ts`, `transit-analysis.ts`, `planetary-hours.ts`) — 365일 batch 성능을 위한 lightweight heuristic
   - `calendar/astrology/` 서브폴더 — newer modular 버전
   - 정확한 transit/planetary hour는 `@/lib/astrology/foundation/` canonical 사용

3. **3개 report 파일 — 다른 역할**
   - `reportService.ts`: AI 리포트 service entry
   - `local-report-generator.ts`: AI 없이 template 기반
   - `report-helpers.ts`: text/name masking helpers

4. **destinyCalendar.ts**: 그냥 `./calendar/` 의 public re-export. 새 파일 X.

## 외부 callers

```
/api/destiny-map/chat-stream  → 카운슬러
/api/destiny-map/chat         → 채팅
/api/calendar/                → 캘린더 (date-detail, action-plan, cross-augment)
/api/destiny-matrix/          → 매트릭스 (timing 보조)
```

## 새 파일 추가 룰

- 새 service 추가 시 위 폴더 중 어디에 속하는지 확인
- 평행 wrapper 만들지 말 것 (`destiny-map/astrology/`처럼)
- canonical 엔진을 직접 호출 — 자체 점성/사주 계산 X
