# 타로 스프레드 선택 로직 완전 분석

## 📊 전체 스프레드 목록 (8개 테마, 총 43개 스프레드)

### 1. general-insight (전반 운세) - 3개
- `quick-reading` (1장) - 빠른 리딩
- `past-present-future` (3장) - 과거, 현재, 미래
- `celtic-cross` (10장) - 켈틱 크로스

### 2. love-relationships (연애·관계) - 5개
- `crush-feelings` (3장) - 그 사람 마음
- `relationship-check-in` (2장) - 관계 점검
- `reconciliation` (4장) - 재회 가능성
- `relationship-cross` (5장) - 관계 크로스
- `finding-a-partner` (4장) - 인연 찾기

### 3. career-work (직장·커리어) - 6개
- `quick-guidance` (1장) - 한줄 조언
- `interview-result` (3장) - 면접 결과
- `exam-pass` (3장) - 시험 합격
- `job-change` (4장) - 이직할까
- `career-path` (3장) - 커리어 방향
- `work-life-balance` (5장) - 워라밸

### 4. money-finance (재물·금전) - 3개
- `financial-snapshot` (2장) - 재정 체크
- `abundance-path` (4장) - 재물운 높이기
- `career-money` (5장) - 일과 돈

### 5. well-being-health (건강·웰빙) - 3개
- `mind-body-scan` (3장) - 심신 체크
- `healing-path` (4장) - 회복하기
- `energy-balance` (5장) - 에너지 밸런스

### 6. spiritual-growth (자기 성장) - 3개
- `inner-voice` (1장) - 내면의 소리
- `shadow-work` (4장) - 그림자 탐구
- `path-of-growth` (5장) - 성장 방향

### 7. **decisions-crossroads (선택·결정) - 3개** ⭐ 가장 중요!
- `two-paths` (6장) - A vs B 비교
- `yes-no-why` (3장) - **할까 말까** ← Yes/No 질문은 여기!
- `timing-window` (4장) - 언제가 좋을까

### 8. self-discovery (자기 탐색) - 2개
- `identity-core` (5장) - 나는 누구인가
- `shadow-integration` (6장) - 내면 통합

### 9. daily-reading (오늘의 운세) - 4개
- `day-card` (1장) - 오늘의 카드
- `three-times` (3장) - 하루 흐름
- `weekly-forecast` (7장) - 이번 주 운세
- `oracle-message` (1장) - 오라클 메시지

---

## 🎯 스프레드 선택 우선순위 (현재 로직)

### **Level 1: Pattern Matching (최우선)**
프론트엔드에서 정규식으로 즉시 감지

```typescript
// questionClassifiers.ts의 패턴 매칭
isYesNoQuestion() → yes-no-why
isComparisonQuestion() → two-paths
isTimingQuestion() → timing-window
isCrushQuestion() → crush-feelings
isReconciliationQuestion() → reconciliation
// ... 총 25개의 패턴 분류기
```

### **Level 2: GPT-4o-mini Analysis**
패턴 매칭으로 못 잡으면 GPT가 분석

```typescript
// analyze-question/route.ts
1. GPT에게 전체 스프레드 목록 제공
2. 사용자 질문 분석 요청
3. JSON 응답: { themeId, spreadId, reason, explanation }
```

### **Level 3: Correction Layer**
GPT 결과를 패턴 매칭으로 다시 검증

```typescript
// applyPatternCorrections()
if (isYesNoQuestion() && parsed.spreadId !== "yes-no-why") {
  // GPT가 틀렸으면 강제로 yes-no-why로 변경
  return correctedResult;
}
```

---

## 🧪 실제 테스트 시나리오

### Category 1: Yes/No 질문 (가장 많은 케이스)

#### ✅ 명확한 케이스
```
"오늘 운동갈까?" → yes-no-why ✓
"이 옷 살까?" → yes-no-why ✓
"그 사람한테 연락할까?" → yes-no-why ✓
"개한테 뽀뽀할까?" → yes-no-why ✓
"라면 먹을까?" → yes-no-why ✓
```

#### ⚠️ 애매한 케이스 (띄어쓰기/맞춤법 오류)
```
"오늘운동갈까" → yes-no-why? (띄어쓰기 없음)
"이옷살까" → yes-no-why? (띄어쓰기 없음)
"개한테뽀뽀할까" → yes-no-why? (띄어쓰기 없음)
"라면먹을까" → yes-no-why? (띄어쓰기 없음)
"술마실까" → yes-no-why? (띄어쓰기 없음)
```

#### 🔥 진짜 애매한 케이스
```
"머리염색ㅎㄹㄲ" → yes-no-why? (자음만)
"운동ㄱㄹㄲ" → yes-no-why? (자음만)
"개뽀뽀" → yes-no-why? (질문 형태 아님)
"라면ㄱ?" → yes-no-why? (초성만)
"ㅅㅁㅅㄹㄲ" → yes-no-why? (완전 자음)
```

#### ❌ Yes/No가 아닌 케이스 (혼동 주의!)
```
"언제 운동할까?" → timing-window (시기 질문)
"운동 vs 휴식" → two-paths (비교 질문)
"오늘 운세 어때?" → day-card (오늘 운세)
"그 사람 나 좋아해?" → crush-feelings (마음 확인)
```

### Category 2: A vs B 비교

```
"A회사 vs B회사" → two-paths ✓
"이직할까 남을까" → two-paths ✓
"서울이사 vs 부산이사" → two-paths ✓
"A랑 B 중에 어떤 게 나아?" → two-paths ✓
```

### Category 3: 타이밍 질문

```
"언제 이직해?" → timing-window ✓
"결혼 시기가 언제야?" → timing-window ✓
"몇 월에 사업 시작할까?" → timing-window ✓
"타이밍 언제가 좋아?" → timing-window ✓
```

### Category 4: 연애 관련

```
"그 사람 나 좋아해?" → crush-feelings ✓
"헤어진 사람 다시 만날 수 있어?" → reconciliation ✓
"언제쯤 좋은 사람 만날까?" → finding-a-partner ✓
"우리 관계 괜찮아?" → relationship-check-in ✓
```

### Category 5: 직장/시험

```
"면접 붙을까?" → interview-result ✓
"시험 합격할까?" → exam-pass ✓
"이직해도 돼?" → job-change ✓  (⚠️ yes-no-why와 혼동 가능!)
```

### Category 6: 오늘 운세

```
"오늘 운세 어때?" → day-card ✓
"오늘 하루 어떨까?" → day-card ✓
"이번 주 운세" → weekly-forecast ✓
```

### Category 7: 잡다한 질문 (장난/이상한 질문)

```
"개한테 키스할까?" → yes-no-why ✓ (장난이지만 yes/no)
"라면 먹을까 말까?" → yes-no-why ✓
"술 마실까?" → yes-no-why ✓
"머리 염색할까?" → yes-no-why ✓
"문신할까?" → yes-no-why ✓
"로또 살까?" → yes-no-why ✓
```

---

## 🐛 잠재적 버그 케이스

### Bug 1: "오늘 ~할까?" 혼동
```
"오늘 운동갈까?" → yes-no-why ✓ (올바름)
"오늘 운세 어때?" → day-card ✓ (올바름)

⚠️ GPT가 헷갈릴 수 있는 케이스:
"오늘 운동 어때?" → day-card? yes-no-why? (애매함!)
```

### Bug 2: 이직 질문 혼동
```
"이직할까?" → yes-no-why ✓ (yes/no 질문)
"이직 시기가 언제야?" → timing-window ✓ (시기 질문)
"이직하면 어떻게 될까?" → job-change ✓ (상황 분석)
```

### Bug 3: 띄어쓰기 없는 질문
```
"개한테뽀뽀할까" → GPT가 파싱 못 할 수도?
"라면먹을까" → GPT가 파싱 못 할 수도?
```

### Bug 4: 초성/자음만 있는 질문
```
"ㅇㄷㅇㄷㄱㄹㄲ" (오늘 운동 갈까) → ??? (완전 실패 가능성)
"ㄹㅁㄴㅁㅇㄹㄲ" (라면 먹을까) → ???
```

---

## ✅ 현재 개선 사항

### 1. GPT 프롬프트 강화
- 띄어쓰기/맞춤법 오류 무시하도록 명시
- 우선순위 명확화 (yes/no > 비교 > 타이밍 > ...)
- 예외 케이스 명시 ("언제 할까?" = timing-window)

### 2. Pattern Correction Layer
- GPT 결과를 패턴 매칭으로 재검증
- 25개의 패턴 분류기로 강제 보정

---

## 🔍 추가 개선 필요 사항

### 1. 초성/자음 처리
- "ㅇㄷㅇㄷㄱㄹㄲ" 같은 질문은 자음→한글 변환 필요
- 또는 "자음만 있는 질문은 처리 불가" 에러 메시지

### 2. 장난 질문 감지
- "개한테 키스" 같은 질문에도 정확한 스프레드 선택
- 백엔드에서 playful_question 플래그로 유머러스하게 응답

### 3. 애매한 케이스 규칙 추가
```
"오늘 ~할까?" → yes-no-why (우선)
"오늘 운세" → day-card
"오늘 ~어때?" → day-card (운세 질문)
```

---

## 📝 테스트 체크리스트

- [ ] "할까/갈까/볼까/살까/먹을까" 패턴 → yes-no-why
- [ ] "A vs B" 패턴 → two-paths
- [ ] "언제" 패턴 → timing-window
- [ ] 띄어쓰기 없는 질문 처리
- [ ] 맞춤법 오류 질문 처리
- [ ] 장난/이상한 질문 처리
- [ ] 혼동 케이스 (오늘 운세 vs 오늘 운동)
- [ ] GPT 실패시 fallback 작동 확인
