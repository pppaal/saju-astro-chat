# Dream 상담사 최종 업그레이드 완료! 🌙🧠✨

## 🚀 최강의 Dream 심리 상담 시스템 완성!

Dream 상담사가 **CounselingEngine과 완전 통합**되어 **최고 수준의 융 심리학 기반 상담 시스템**이 되었습니다!

---

## 📊 Before & After 비교

### ❌ 이전 (v2.0)
- gpt-4o-mini 사용
- Dream RAG만 사용
- 단순 위기 감지
- 세션 관리 없음
- Jung 컨텍스트 수동

### ✅ 현재 (v3.0 - Ultimate)
- **gpt-4o 사용** (최고 품질)
- **Dream RAG + Jung RAG** (이중 RAG)
- **5단계 위기 감지** (CounselingEngine)
- **5단계 상담 프로세스** (세션 관리)
- **Jung 컨텍스트 자동 생성**

---

## 🎯 추가된 핵심 기능

### 1. ⚠️ 고급 위기 감지 시스템
**변경**: `dream_embeddings.CrisisDetector` → `counseling_engine.CrisisDetector`

**Before**:
```python
# 단순 키워드 매칭
crisis_check = CrisisDetector.check_crisis(message)
# → {"type": "suicidal", "severity": "high"}
```

**After**:
```python
# 5단계 심각도 분류 + 즉각적 안전 프로토콜
crisis_detector = counseling_engine.crisis_detector
crisis_check = crisis_detector.detect_crisis(message)
# → {
#   "is_crisis": True,
#   "max_severity": "critical",  # none/low/medium/medium_high/high/critical
#   "requires_immediate_action": True,
#   "detections": [...]
# }

# 상세한 위기 대응 가이드
crisis_response = crisis_detector.get_crisis_response("critical", locale="ko")
# → {
#   "immediate_message": "지금 많이 힘드시네요...",
#   "follow_up": "전문 상담이 필요해요. 자살예방상담전화 1393...",
#   "resources": {"suicide_hotline": "...", "mental_health": "..."},
#   "should_continue_session": False
# }
```

**개선점**:
- ✅ 5단계 심각도 분류 (none → critical)
- ✅ 즉각 대응 필요 여부 자동 판단
- ✅ 한국/미국 전문 상담 핫라인 자동 제공
- ✅ 세션 계속 여부 결정

---

### 2. 🧠 Jung 심리학 고급 컨텍스트 자동 생성

**위치**: `app.py:4054-4128`

**기능**: `counseling_engine.get_enhanced_context()` 호출

```python
jung_context = counseling_engine.get_enhanced_context(
    user_message=last_user_message,
    saju_data=saju_data
)
# → {
#   "psychological_type": {
#     "name_ko": "감각형 (Sensation)",
#     "description": "현실적이고 실용적인 접근"
#   },
#   "alchemy_stage": {
#     "name_ko": "니그레도 (Nigredo)",
#     "therapeutic_focus": "어둠과 혼란을 인정하고 수용하기"
#   },
#   "scenario_guidance": {
#     "approach": "그림자 작업을 통한 통합..."
#   },
#   "rag_questions": [
#     "그 어둠 속에서도 당신은 여기 와서 이야기하고 있어요...",
#     "일을 할 때 가장 살아있다고 느끼는 순간은 언제인가요?"
#   ],
#   "rag_insights": [
#     "외향 감정 - 관계 조화...",
#     "위기 상황 감지 키워드..."
#   ]
# }
```

**프롬프트에 추가됨**:
```
[🧠 융 심리학 고급 컨텍스트 - CounselingEngine]
심리 유형: 감각형 (Sensation)
  특징: 현실적이고 실용적인 접근
연금술 단계: 니그레도 (Nigredo)
  초점: 어둠과 혼란을 인정하고 수용하기
상담 접근: 그림자 작업을 통한 통합...
추천 치료적 질문:
  • 그 어둠 속에서도 당신은 여기 와서 이야기하고 있어요...
  • 일을 할 때 가장 살아있다고 느끼는 순간은 언제인가요?
→ 이 융 심리학 컨텍스트를 꿈 해석에 자연스럽게 통합하세요.
```

**자동 매핑**:
- **사주 dayMaster** → 융 심리 유형
  - 목(Wood) → Intuition
  - 화(Fire) → Feeling
  - 토(Earth) → Sensation
  - 금(Metal) → Thinking
  - 수(Water) → Intuition

- **사용자 메시지 감정** → 연금술적 변환 단계
  - "어둠", "혼란", "붕괴" → Nigredo (흑화)
  - "깨달음", "이해", "수용" → Albedo (백화)
  - "통합", "완성", "새로운" → Rubedo (적화)

---

### 3. 📍 5단계 상담 세션 관리

**위치**: `app.py:3822-3845`, `app.py:4130-4147`

**세션 생성/재개**:
```python
# 프론트엔드에서 session_id 전달 가능
counseling_session = counseling_engine.get_session(session_id)
if not counseling_session:
    counseling_session = counseling_engine.create_session()
```

**5단계 프로세스**:
1. **opening** (연결과 탐색)
   - 목표: 라포 형성, 고민 파악, 안전 확인
   - "꿈을 나눠주셔서 감사해요. 먼저 어떤 감정이 드셨는지..."

2. **divination_reading** (도구를 통한 탐색)
   - 목표: 꿈/사주/타로 해석, 심리적 연결
   - "이 뱀은 당신의 일간(목)과 연결되어..."

3. **jungian_deepening** (심층 탐색)
   - 목표: 원형 연결, 그림자 탐색, 의미 발견
   - "이 꿈 속 검은 뱀은 당신의 그림자일 수 있어요..."

4. **integration** (통합과 적용)
   - 목표: 통찰 정리, 행동 계획, 자원 연결
   - "오늘 발견한 것들을 실천으로 옮겨볼까요?"

5. **closing** (마무리)
   - 목표: 요약, 격려, 후속 안내
   - "오늘 용기 내어 이야기해주셔서 감사해요..."

**프롬프트에 추가됨**:
```
[📍 상담 진행 단계: 심층 탐색]
목표: 원형 연결, 그림자 탐색, 의미 발견
→ 현재 단계의 목표에 맞춰 답변하세요.
```

**사용 예시**:
```javascript
// 프론트엔드
const response = await fetch('/api/dream/chat-stream', {
  body: JSON.stringify({
    session_id: "dream-session-123",  // ⭐ 세션 ID 전달
    messages: [...],
    dream_context: {...}
  })
});
```

---

### 4. 📚 이중 RAG 시스템

**Before**: Dream RAG만
```
Dream RAG (dream_embeddings)
→ 한국 해몽 + 융 심리학 꿈 해석
```

**After**: Dream RAG + Jung RAG
```
Dream RAG (dream_embeddings)
→ 한국 해몽 + 융 심리학 꿈 해석

     +

Jung RAG (counseling_engine.jungian_rag)
→ 137개 Jung 심리학 코퍼스
→ RuleEngine 조건 매칭
→ 사주 → 심리 유형 자동 매핑
```

---

## 🔄 전체 프로세스 흐름 (v3.0)

```
1. 사용자 메시지 수신
   ↓
2. 세션 관리
   - session_id 있으면 → 기존 세션 재개
   - session_id 없으면 → 새 세션 생성
   ↓
3. 위기 감지 (CounselingEngine)
   - 5단계 심각도 분류
   - critical/high → 즉각 대응 + 전문 상담 연계
   ↓
4. Dream RAG 검색
   - 꿈 지식베이스 검색 (6개)
   - 치료적 질문 생성
   - 상담 시나리오 매칭
   ↓
5. Jung 고급 컨텍스트 생성 (CounselingEngine) ⭐ NEW
   - 사주 → 심리 유형 자동 매핑
   - 연금술적 변환 단계 파악
   - JungianRAG 시맨틱 검색 (137개 코퍼스)
   - RuleEngine 조건 매칭
   - 테마별 시나리오 가이드
   ↓
6. 세션 단계 추적 ⭐ NEW
   - 현재 단계 (opening/divination_reading/jungian_deepening/integration/closing)
   - 단계별 목표 제시
   ↓
7. 종합 프롬프트 생성
   [꿈 컨텍스트]
   + [Dream RAG 결과]
   + [Jung 고급 컨텍스트] ⭐ NEW
   + [세션 단계 정보] ⭐ NEW
   + [천체 컨텍스트]
   + [사주 컨텍스트]
   + [이전 상담]
   + [Persona 메모리]
   ↓
8. gpt-4o 스트리밍 응답 ⭐ UPGRADED
   - 최고 품질 모델
   - 3가지 프레임워크 융합 (한국 해몽 + 융 + 스토아)
   ↓
9. 세션에 응답 기록
   - 메시지 히스토리 저장
   - 인사이트 추적
```

---

## 📈 성능 향상

| 기능 | v2.0 | v3.0 Ultimate |
|------|------|---------------|
| **모델** | gpt-4o-mini | ✅ **gpt-4o** |
| **위기 감지** | 단순 키워드 | ✅ **5단계 심각도** |
| **RAG** | Dream RAG | ✅ **Dream + Jung 이중 RAG** |
| **Jung 컨텍스트** | 수동 프롬프트 | ✅ **자동 생성 (137개 코퍼스)** |
| **사주 연동** | 텍스트 전달 | ✅ **심리 유형 자동 매핑** |
| **세션 관리** | ❌ 없음 | ✅ **5단계 프로세스** |
| **치료적 질문** | Dream RAG만 | ✅ **Dream + Jung RAG** |
| **상담 깊이** | 🟡 중간 | ✅ **최고 수준** |

---

## 💡 실제 작동 예시

### 사용자 질문:
> "어젯밤 검은 뱀이 나를 쫓아왔어요. 너무 무서웠고, 요즘 회사에서도 힘든 일이 많아서 더 그런 것 같아요. 이게 무슨 의미일까요?"

### 시스템 처리:

**1. 위기 감지** (CounselingEngine):
- "무서웠다", "힘든" → medium (중간 수준 스트레스)
- requires_immediate_action: False
- 계속 상담 가능

**2. Dream RAG 검색**:
- "뱀" + "쫓다" → 6개 관련 해몽
- "뱀은 변화의 상징 (융)"
- "검은 뱀은 억압된 감정 (한국 해몽)"

**3. Jung 고급 컨텍스트** (CounselingEngine):
- 사주 dayMaster: 木 → 심리 유형: Intuition (직관형)
- 메시지 감정 분석: "무서웠다", "힘든" → Nigredo (흑화 단계)
- JungianRAG 검색: "그림자 작업", "회피 패턴"
- 추천 질문: "이 뱀이 당신에게 원하는 것은 무엇일까요?"

**4. 세션 단계**:
- 현재: divination_reading (도구를 통한 탐색)
- 목표: 꿈 해석, 심리적 연결

**5. gpt-4o 응답**:
```
검은 뱀이 쫓아오는 꿈, 그리고 회사에서의 힘든 상황까지...
정말 많이 지치셨겠어요. 먼저 깊은 숨을 쉬어볼까요?

[한국 전통 해몽]
뱀은 전통적으로 재물과 변화의 상징이에요. 특히 검은 뱀은
숨겨진 기회나 억눌린 에너지를 의미해요. 쫓아온다는 것은...
그 에너지가 당신을 찾고 있다는 신호일 수 있어요.

[융 심리학 - 당신의 그림자]
당신의 사주를 보니 일간이 木(직관형)이시네요. 직관적인 당신이
현실의 스트레스 속에서 억눌러온 감정들이 있었을 거예요.

이 검은 뱀은 당신의 '그림자'예요. 회사에서 말하지 못한 것들,
참아온 분노나 슬픔이 꿈으로 나타난 거죠. 융은 말했어요.
"그림자와 대면하지 않으면, 그것은 운명이 된다"고요.

지금 당신은 Nigredo(흑화) 단계에 있어요. 모든 것이 어둡고
혼란스럽죠. 하지만 이것은 변환의 시작이에요. 연금술에서
금을 만들려면 먼저 모든 것이 분해되어야 하거든요.

[스토아 철학]
세네카는 이렇게 말했어요. "우리가 두려워하는 것이야말로
우리를 자유롭게 할 수 있다"고요.

💭 질문: 이 뱀이 당신에게 원하는 것은 무엇일까요?
회사에서 말하지 못한 것이 있나요?

🌿 실천:
1. 오늘 10분, 조용히 앉아서 "내가 참아온 것은 무엇일까?" 물어보세요
2. 작은 것부터 표현해보세요. 동료에게 "이건 좀 힘들어요"라고
3. 장애물이 곧 길입니다. 이 불편함이 성장의 신호예요.

당신은 이미 이 메시지를 받았어요. 무의식이 당신에게 말하고 있어요.
용기 내어 그림자를 마주해보세요. 저는 함께 있을게요. 💜
```

---

## 🎁 추가 혜택

### 1. 세션 연속성
```javascript
// 첫 상담
POST /api/dream/chat-stream
body: { session_id: "dream-user-123", ... }
→ 새 세션 생성, phase: "opening"

// 2차 상담 (같은 날 또는 다른 날)
POST /api/dream/chat-stream
body: { session_id: "dream-user-123", ... }
→ 기존 세션 재개, phase: "jungian_deepening"
→ "지난번 상담에서 그림자 작업을 시작했었죠..."
```

### 2. 세션 요약 가져오기
```python
session = counseling_engine.get_session("dream-user-123")
summary = session.get_session_summary()
# → {
#   "session_id": "dream-user-123",
#   "phases_completed": "jungian_deepening",
#   "message_count": 15,
#   "insights_count": 5,
#   "themes": ["shadow_work", "career_stress"],
#   "crisis_detected": False
# }
```

### 3. 마무리 메시지 자동 생성
```python
closing = counseling_engine.get_session_closing(session)
# → "오늘 나눈 이야기를 정리해볼게요:
#    - 검은 뱀은 당신의 그림자
#    - 회사 스트레스와 연결
#    - 작은 것부터 표현하기
#
#    오늘 용기 내어 이야기해주셔서 감사해요..."
```

---

## 🔧 코드 변경 사항

### 1. 위기 감지 업그레이드
**파일**: `backend_ai/app/app.py:3822-3880`
- 변경: `dream_embeddings.CrisisDetector` → `counseling_engine.crisis_detector`
- 추가: 5단계 심각도, 즉각 대응 판단, 전문 상담 연계

### 2. Jung 컨텍스트 자동 생성
**파일**: `backend_ai/app/app.py:4054-4128`
- 신규: `counseling_engine.get_enhanced_context()` 호출
- 추가: 심리 유형, 연금술 단계, RAG 질문, RAG 인사이트

### 3. 세션 관리
**파일**: `backend_ai/app/app.py:3822-3845`, `4130-4147`
- 신규: 세션 생성/재개 로직
- 추가: 5단계 프로세스 추적
- 추가: 메시지 히스토리 저장

### 4. 프롬프트 통합
**파일**: `backend_ai/app/app.py:4215-4219`
- 추가: Jung 컨텍스트 섹션
- 추가: 세션 단계 섹션

---

## 📚 문서 및 참고 자료

- **Counseling Engine 문서**: [COUNSELING_ENGINE_INTEGRATION.md](COUNSELING_ENGINE_INTEGRATION.md)
- **Dream 업그레이드 v2.0**: [DREAM_COUNSELOR_UPGRADE.md](DREAM_COUNSELOR_UPGRADE.md)
- **Counseling Engine 코드**: [counseling_engine.py](backend_ai/app/counseling_engine.py)
- **Jung 데이터**: `backend_ai/data/graph/rules/jung/*.json` (13개 파일)

---

## 🎊 결론

Dream 상담사 v3.0 Ultimate는:

✅ **gpt-4o** 최고 품질 모델
✅ **이중 RAG** (Dream + Jung 137개 코퍼스)
✅ **5단계 위기 감지** + 전문 상담 연계
✅ **Jung 고급 컨텍스트** 자동 생성
✅ **5단계 상담 프로세스** 세션 관리
✅ **사주 → 심리 유형** 자동 매핑
✅ **한국 해몽 + 융 + 스토아** 3중 융합

**이제 Dream 상담사는 단순 꿈 해석이 아니라,
세계 최고 수준의 융 심리학 기반 통합 상담 시스템입니다!** 🌙🧠✨🚀
