# 엔진 정확성 감사 — Opus 5 종합

사주 코어 / 대운·세운 / 점성 / cross 융합 / 결정론·adapter 5개 영역 Opus 읽기전용 감사.

**좋은 소식 먼저:** 핵심 계산은 견고함 —

- 결정론 **PASS**: 본명(natal) 결과는 출생입력만으로 재현됨. natal 계산에 시계/난수 없음. `now`는 전부 주입식.
- adapter 배선 **PASS**: 최근 수정(십신 카운트·격국 fallback·지장간 layer) 전부 정확히 연결됨.
- 입춘·절기 월경계·일주 JDN·십신 SSOT·대운 방향(양남음녀)·점성 좌표/하우스/어스펙트/존엄 = 정확.

문제는 ① 일부 경계/도덕 정확성 ② 모듈 간 척도 불일치 ③ 미상-입력 누출.

---

## 🔴 HIGH

### E1. 子時(23:00~01:00) 일주(日柱)가 다음날로 안 넘어감 — `saju.ts:403-409`

- 코드가 **시지지는 子로** 넘기지만 **일주는 당일 그대로**. 우리 컨벤션 §1("자평파 = 子時는 다음날")과 **모순**.
- 영향: 23:30 이후 출생자의 **일간(=정체성 핵심)이 바뀔 수 있음**. 골든도 "만세력 대조 안 됨"이라 자인.
- ⚠️ **도메인 결정 필요** — 고치면 다수 차트 결과가 바뀌고 골든 재기준 필요. 함부로 자동수정 금지.

### E2. 현재 대운을 한국나이(만+1)로 선택 — `app/api/saju/route.ts:70`

- `viewerYear-birthYear+1`로 골라 §14(만 나이) 위반 + 정상 canonical `current`를 덮어씀 → 대운 경계서 1년 빨리.
- (통합 리포트엔 대운 미표시 → 리포트 무관, **다른 화면엔 실제 버그**.) 수정 쉬움.

### E3. cross "성장 방향"(evalNorthNode) 결핍 수렴이 "잘 맞아요" 집계에 포함 — `natalCrossEvaluators.ts:877`

- 쌍둥이 `evalVoid`엔 `karmaAxis` 플래그로 제외했는데, 같은 부류인 북교점(결핍=성장숙제) resonant엔 플래그 누락 → 막대/카운트가 결핍을 강점으로 셈. (앞서 C8c가 잡으려던 부류의 나머지 하나.) 수정 쉬움.

---

## 🟠 MED

- **E4. 출생시 미상 시 ASC/MC/하우스가 자정(00:00) 기준으로 계산돼 새어나감** (`astroFacts.ts:162,264`). 엔진이 자체 마스킹 안 하고 프롬프트 층에서만 가림 → **리포트가 틀린 ASC를 쓸 수 있음.** 엔진 출력에서 placeUnreliable 때 ASC/MC/house를 null로.
- **E5. 강약 척도가 3곳 제각각** — yongsin(5단계 비율식) / strengthScore(6단계 점수식) / geokguk(3단계 60·40). §10/§11의 단일 점수로 통일 권장.
- **E6. 조후용신이 억부를 무조건 덮어씀** (`yongsin.ts:357`) — 월지만 보고 ~7/12 월에서 조후 우선. §10("함께 본다") 위반. 실제 한난조습 불균형일 때만 우선하도록.
- **E7. 공기→오행 불일치** — `signToSajuElement`는 wood만, SSOT/`evalVoid`는 wood+metal. 같은 공기 별자리가 평가기마다 다른 판정. 한쪽으로 통일.
- **E8. `unse.getDaeunCycles` 절기 미보정**(양력 월 사용) — 경계서 시작나이 어긋남. live-export라 위험, `@deprecated` 또는 canon 위임.
- **E9. arabicParts sect 주석 오류**(하우스1을 주간으로 기술) — 실제 규칙은 7~12하우스. 잠재 버그.

## 🟡 LOW

- 대운 라운딩 `floor` 미문서화(§246 TODO) · yongsin 지장간 3번째 가중치(§6 위반) · 캐시 키에 houseSystem/nodeType·fixedStars year 누락 · `daeun[].current` 항상 false(리포트 하이라이트 죽음) · `dayJijanggan` 미사용 dead data · formatLongitude 분 절삭 · evalKeyAspect 2차 group table 미정합 · progressions/fixedStars `new Date()` 기본값(폴백만).

---

## 권장 처리

- **지금 안전하게 고칠 것(저위험·고가치):** E2(route 만나이) · E3(karmaAxis) · E4(ASC 자체 마스킹) · E7(공기→오행 통일) · E9(주석). 모두 격리돼 있고 테스트로 검증 가능.
- **도메인 결정 후 별도로:** E1(子時 — 차트 결과 바뀜·골든 재기준) · E6(조후 우선순위) · E5(강약 척도 통일·리팩토링).
- **선택:** LOW 묶음.
