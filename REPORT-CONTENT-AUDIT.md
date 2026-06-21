# 통합(프리미엄) 리포트 내용 감사 — Opus 10 종합

10개 Opus 에이전트가 영역별로 내용(해석·사전·글로서리·번역·안전)을 감사한 결과를
중복 제거·우선순위화한 단일 보고서. 결론 먼저: **사전 산문(해석 텍스트) 품질 자체는
매우 높음**(hanja-rich/ilju-60/geokguk-rich/astro-planet 등 정확·따뜻·이중언어 견고).
문제는 대부분 **① 배선 버그 ② 안전/면책 ③ 일관성/중복**에 몰려 있음.

범례: 🔴 Critical(정확성 버그·안전) · 🟠 Important(과장·일관성·i18n) · 🟡 Polish

---

## 🔴 Critical

### C1. 십신(十神) 배선 버그 — "주도 십성" 카드가 틀린 데이터로 계산됨

- (a) 카드 상태(dominant/missing)를 **십신 개수**가 아니라 **일간 강약(신강/신약)**으로 계산.
  → 재성이 많아도 "재물 부족" 카드가 뜰 수 있음. `IntegratedReport.tsx:347-356`
- (b) 주도 십성을 **일지(배우자궁)**에서 뽑음 → 월령 기반이어야 할 격국 교리와 어긋나고,
  바로 위 격국 카드와 **모순**(정재격 ↔ 편재). `IntegratedReport.tsx:354`, `labels:100`
- 출처: §01·§02 에이전트 공통. 수정: 실제 카테고리 카운트(`adv.sibsin.categoryCount`)로
  상태 산출 + 주도 십성을 월령에서 뽑거나 라벨을 "일지(배우자궁) 십성"으로 정직하게.

### C2. 격국 fallback 과장 — CONVENTIONS §9 위반

- 월령 본기 추정(`fallback:true, confidence:medium`, 투출 미확인) 격국을 **확정 정격과
  동일하게** 단정 렌더. adapter가 `fallback/confidence` 플래그를 버림. `adapter.ts:359`
- 수정: 플래그를 카드까지 전달, fallback이면 헤더를 "추정 격국"으로 약화 / advice 톤 완화.

### C3. 안전·법무 — 면책 문구가 전무

- 리포트 어디에도 "참고용/전문 조언 아님" 문구 없음. (생년시 미상 노트만 존재)
- 수정: 푸터에 ko/en 면책 — "자기 이해를 돕는 참고용이며 의료·법률·재무 판단을 대신하지
  않습니다 / For self-reflection only; not professional advice."

### C4. 의료성 주장 — "우울/depression"을 성격으로 렌더

- 화(火) 결핍 = "무기력, **우울**" 렌더. health/질환 필드도 같은 사전에 존재(현재 미렌더).
  `interpretations.json` deficiency, `saju-strength.json` 조후
- 수정: 임상어 제거 → "의욕 저하·가라앉는 기분" 등 비진단 표현. health 필드 노출 경로 점검.

### C5. 결정론적 처방 — "직업·브랜딩 중심축으로 삼으세요"

- §05 cross "가장 흔들리지 않는 코어 → 직업·브랜딩의 중심축으로 삼으세요 / make it the
  center of your work and brand." 명령형 단정. `IntegratedReport.tsx:1226-1227`
- 수정: "…처럼 활용해 볼 만해요 / you might consider" 성찰형으로.

### C6. 영문 결핍 문구 비문 (5오행 전부)

- `"you may feel ${명사나열}"` → "you may feel indecision, low confidence, lack of drive"
  (비문). `ElementsDetail.tsx:69-72` + deficiency_en가 명사구라 전부 깨짐.
- 수정: 템플릿 "you may notice: {…}" 또는 deficiency_en을 형용사로.

### C7. 좌표 하드코딩 °N·°E — 남반구/서경 오표기

- `${input.lat}°N · ${input.lng}°E` → 시드니 "-33.8°N", 뉴욕 "-74°E". `IntegratedReport.tsx:407`
- 수정: 부호로 N/S·E/W 분기 (`Math.abs` + 반구 문자).

### C8. cross 융합 신뢰도 — 거짓 수렴 생성

- (a) `evalKeyAspect`가 **각의 성질(하드/소프트)을 버림** → Mars□Saturn(긴장)과
  Mars△Saturn(조화)이 똑같이 "강점". `natalCrossEvaluators.ts:716-722`
- (b) 공기 별자리를 木으로 근사 → "둘 다 같은 결" 거짓 수렴. `natalCrossShared.ts:88-93`
- (c) 공망/카르마(결핍 축)가 초록 "잘 맞아요" 집계에 포함 → 막대그래프 오해. `evalVoid`
- 수정: 각 성질 반영 / 공기 유래면 same→complement 강등·헤지 / 카르마 전용 톤 분리.

---

## 🟠 Important

### I1. 정체성 충돌 — 히어로 vs 격국이 딴사람

- 히어로 "⚔️ 결단의 승부사 #용맹" ↔ §02 "정재격 = 견실한 자산가, 한탕보다 복리".
  한 화면에서 두 사람처럼 읽힘(주의 라인 "리스크 앞 과도하게 보수적"이 "용맹" 바로 아래).
- 수정: 둘을 잇는 한 줄("겉은 과감한 승부사, 판은 안전하게") — §05 화해 로직을 상단으로.

### I2. 십신 영문 용어 표류 — 같은 화면에 2~3개 영어 이름

- 식신 = "Eating God"(geokguk-rich) ↔ "Easeful Expression"(interpretations) ↔ "Output"(glossary)
  가 §02 한 스크롤에 공존. `interpretations.json:235-388` 등
- 수정: 고전 표준으로 통일(Eating God/Hurting Officer/Direct Officer/Seven Killings/
  Direct·Indirect Resource/Direct·Indirect Wealth/Companion/Rob Wealth).

### I3. 성별·결정론 문구 (재성/관성)

- "여자 문제·과소비·도박성 투자 조심", "여자에게 남편·이성 문제" = 이성애·성별 가정 +
  미신적 단정. `sibsin-category.json`
- 수정: "이성/배우자 인연"으로 중립화, 단정형→경향형. (또는 `input.gender` 게이트)

### I4. dignity 라벨 전부 회색(_neutral_) — 강·약 구분 소실

- 본궁(+5)·손상(-5)·쇠퇴(-4)가 시각적으로 동일(회색). 옆 L2 리스트는 색칠돼 모순.
- 수정: 등급별 색(길=초록/흉=빨강)으로.

### I5. "대충 (Opposition)" 동음이의

- 한자(對沖) 없이 떠서 일상어 "대충대충"으로 읽힘. `reportTypes.ts:138,278`
- 수정: "대충(對沖)" 한자 병기 또는 친근 라벨 "정면 대립(180°)"만.

### I6. 글로서리 커버리지 구멍 — 화면 용어 미설명

- **Sect(주간/야간)** 설명 0, **dignity 등급 단어**(본궁/고양/손상) 미설명,
  **개별 십신 이름**(비견/겁재/편인…) 글자별 뜻 없음, **orb** 미번역,
  통근/공망/조후가 전문용어로 전문용어 설명(순환), 역행 글로서리 누락.
- 수정: 위 항목 글로서리 추가 + 십신 10개 1줄 뜻.

### I7. 금융·미신 처방 (미렌더지만 동일 사전)

- "투자 미루라", "운이 풀려요/luck flows", "보약/tonic"(의료 은유). `saju-strength.json` 등
- 수정: 금융 지시 제거, 단정→경향, 의료 은유 제거. C3 면책으로도 일부 완화.

### I8. 신살 과대 — "참고 수준" 초과

- 글로서리가 신살을 "재능·주의점을 짚어준다"로 단정(보조 색채 헤지 없음). 칩도 색칠돼
  강약/격국/용신과 동급으로 보임. CONVENTIONS §8 위반. `reportGlossary.ts:84-88`
- 수정: "강약·격국·용신을 보조하는 참고 신호(단독 단정 X)" 한 줄.

### I9. 바이럴 "그래서 더 확실해요" = 거짓 확신

- 두 점술 일치를 "확실성"으로 프레이밍. `ViralTopCard`/cross
- 수정: "두 관점이 같은 결을 가리켜요 / both lenses point the same way" (확신 제거).

---

## 🟡 Polish

- **P1 중복**: 庚 "의리·결단" 문구 6~7회(기둥별 그리드 동일 반복), 행성 12개 동일 템플릿
  ("…자리라 …색으로 드러나고 …하우스 무대에서"), 빈 하우스 안내 반복, "번갈아 써라" 조언 2~3회.
- **P2 톤**: 해요체↔합니다체 혼용(격국 사전 경계) → 해요체로 통일.
- **P3 ilju-60 `丙午` EN 중복 문장** "which can wear others out, which can wear others out."
- **P4 ViralTopCard 카피**: 癸 "전략가"가 壬과 겹침(음수=직관/감수성으로), 乙 EN 어순 비문,
  甲 EN만 3인칭(→ "you"), 궁합 동일오행 엣지케이스 라벨.
- **P5 점성 정밀**: detriment/fall을 결함처럼("crushed/dissolves")→"against its grain";
  천왕/해왕/명왕 `rules`에 "현대 룰러십" 태그; 수성 detriment·fall에 물고기 중복 표기 구분;
  황소·염소 EN 둘 다 "grounded" 분리.
- **P6 색상 불일치**: remedy 사전 2곳이 水 = 남색 vs 파랑.
- **P7 12운성 EN**("Office Entry/Severance/Capping")이 글로서리의 "탄생→성장→정점→쇠퇴"
  은유와 안 맞음 → 라벨 정렬 또는 1단어 주석.

---

## 권장 수정 순서

1. **안전 먼저(C3·C4·C5·I7·I9·I8)** — 면책 + 의료/결정론/금융 문구. 법적·신뢰 리스크.
2. **정확성 버그(C1·C6·C7·C8·I4)** — 사용자에게 틀린 정보. 엔진/배선.
3. **일관성(C2·I1·I2·I5·P2)** — fallback 표시, 정체성 화해, 영문 용어 통일.
4. **이해도(I6·P1)** — 글로서리 구멍, 중복 정리.
5. **Polish(P3~P7)** — 카피/정밀.
