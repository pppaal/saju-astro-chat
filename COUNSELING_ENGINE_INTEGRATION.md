# 융 심리학 상담 엔진 통합 완료 🎉

## 개요
Destiny Map 카운슬러 시스템을 백엔드 Jungian Counseling Engine과 완전히 통합했습니다.
이제 GPT보다 훨씬 전문적이고 안전한 상담 시스템을 제공합니다.

## 주요 변경사항

### 1. 백엔드 엔드포인트 추가 ✅
**파일**: `backend_ai/app/app.py` (라인 5125-5263)

추가된 엔드포인트:
- `POST /api/counseling/chat` - 융 심리학 기반 상담 채팅
- `POST /api/counseling/therapeutic-questions` - 치료적 질문 생성
- `GET /api/counseling/health` - 상담 엔진 상태 확인

### 2. 프론트엔드 API 통합 ✅
**파일**: `src/app/api/life-prediction/advisor-chat/route.ts`

**변경 내용**:
- v3.0으로 업그레이드
- 백엔드 counseling engine 우선 사용 (15초 타임아웃)
- 백엔드 실패 시 기존 GPT 방식으로 자동 Fallback
- 세션 ID 추가하여 상담 맥락 유지

## 백엔드 상담 엔진의 강력한 기능

### 1. 위기 감지 시스템 🚨
- 자살/자해 키워드 자동 감지
- 즉각적 안전 프로토콜 실행
- 위기 수준별 맞춤 응답 (critical/high/medium)
- 전문 상담 핫라인 자동 제공

### 2. 융 심리학 통합 🧠
- **10개 Jung 심리학 JSON 파일** 기반 심층 분석:
  - `jung_therapeutic.json` - 치료적 질문
  - `jung_archetypes.json` - 원형 이론
  - `jung_psychological_types.json` - 심리 유형론
  - `jung_alchemy.json` - 연금술적 변환 단계
  - `jung_cross_analysis.json` - 사주×점성 교차 분석
  - `jung_counseling_scenarios.json` - 상담 시나리오
  - `jung_integrated_counseling.json` - 통합 상담
  - `jung_counseling_prompts.json` - 상담 프롬프트
  - `jung_personality_integration.json` - 성격 통합
  - `jung_expanded_counseling.json` - 확장 상담

### 3. RAG + RuleEngine 🔍
- **시맨틱 검색**: SentenceTransformer 기반 질문/상황 매칭
- **규칙 기반 매칭**: 조건에 맞는 치료적 개입 자동 선택
- **상황별 맞춤 질문**: 테마/원형/감정 상태에 따른 질문 생성

### 4. 상담 세션 관리 📝
- 5단계 상담 프로세스:
  1. **opening** - 연결과 탐색 (라포 형성)
  2. **divination_reading** - 도구 탐색 (사주/타로 해석)
  3. **jungian_deepening** - 심층 탐색 (그림자 작업, 의미 발견)
  4. **integration** - 통합과 적용 (행동 계획)
  5. **closing** - 마무리 (요약, 격려)

### 5. 사주/점성/타로 컨텍스트 통합 🔮
- 사주 dayMaster → 융 심리 유형 자동 매핑
- 오행 → 4원소(점성) 교차 분석
- 연금술적 변환 단계 파악 (니그레도→알베도→루베도)

## 사용 예시

### API 호출 예시
```typescript
const response = await fetch('/api/life-prediction/advisor-chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "요즘 직장에서 너무 힘들어요",
    sessionId: "session-123", // 선택: 세션 유지
    context: {
      question: "취업/이직",
      eventType: "취업/이직",
      sipsin: "정인 正印",
      daeun: "갑인 甲寅",
      birthDate: "1990-01-01",
      gender: "M",
      results: [/* 길일 예측 결과 */]
    },
    history: [/* 이전 대화 */],
    locale: "ko"
  })
});

const data = await response.json();
// data.useBackendEngine === true  → 백엔드 상담 엔진 사용
// data.crisisDetected === true    → 위기 감지됨
// data.jungContext                → 융 심리학 컨텍스트
```

### 응답 예시 (백엔드 엔진 사용 시)
```json
{
  "success": true,
  "reply": "직장에서 힘드시다니... 그 무게가 느껴져요. 말씀해주셔서 고마워요.\n\n정인(正印)의 기운이 흐르는 지금, 당신은 배움과 성장을 갈망하고 있어요. 혹시 현재 직장에서 그런 기회가 부족하다고 느끼시나요?\n\n융은 말했어요. '증상은 적이 아니라 메신저'라고요. 지금의 힘듦이 당신에게 무엇을 말하고 있을까요?",
  "sessionId": "20241230_143022",
  "phase": "jungian_deepening",
  "crisisDetected": false,
  "useBackendEngine": true,
  "jungContext": {
    "psychological_type": {
      "name": "감각형 (Sensation)",
      "description": "현실적이고 실용적인 접근"
    },
    "alchemy_stage": {
      "name_ko": "니그레도 (Nigredo)",
      "therapeutic_focus": "어둠과 혼란을 인정하고 수용하기"
    },
    "rag_questions": [
      "그 어둠 속에서도 당신은 여기 와서 이야기하고 있어요. 그것 자체가 의미 있는 거예요.",
      "일을 할 때 가장 살아있다고 느끼는 순간은 언제인가요?"
    ]
  }
}
```

## GPT vs 백엔드 상담 엔진 비교

| 기능 | 기존 GPT | 백엔드 상담 엔진 |
|------|----------|-----------------|
| **위기 감지** | ❌ 없음 | ✅ 자동 감지 + 즉각 대응 |
| **심리학 깊이** | 🟡 프롬프트 수준 | ✅ 10개 Jung 파일 기반 |
| **맞춤 질문** | ❌ 없음 | ✅ 테마/원형별 자동 생성 |
| **상담 구조** | ❌ 없음 | ✅ 5단계 프로세스 |
| **사주 통합** | 🟡 텍스트 전달만 | ✅ 심리 유형 자동 매핑 |
| **세션 관리** | ❌ 없음 | ✅ 세션 ID로 맥락 유지 |
| **안전성** | 🟡 보통 | ✅ 위기 프로토콜 완비 |
| **Fallback** | ❌ 실패 시 에러 | ✅ GPT로 자동 Fallback |

## 테스트 방법

### 1. 백엔드 상태 확인
```bash
curl http://localhost:5000/api/counseling/health
```

### 2. 치료적 질문 생성 테스트
```bash
curl -X POST http://localhost:5000/api/counseling/therapeutic-questions \
  -H "Content-Type: application/json" \
  -d '{
    "theme": "career",
    "user_message": "직장에서 힘들어요"
  }'
```

### 3. 상담 채팅 테스트
```bash
curl -X POST http://localhost:5000/api/counseling/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "요즘 너무 우울해요",
    "saju": {
      "dayMaster": {"element": "목"}
    }
  }'
```

### 4. 위기 감지 테스트
```bash
curl -X POST http://localhost:5000/api/counseling/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "죽고 싶어요"
  }'
```

## 환경 변수 설정

### 백엔드 (.env)
```env
OPENAI_API_KEY=your_key_here
COUNSELOR_MODEL=gpt-4o        # 프리미엄 품질 (선택)
# COUNSELOR_MODEL=gpt-4o-mini  # 기본값 (비용 절감)
```

### 프론트엔드 (.env.local)
```env
BACKEND_AI_URL=http://localhost:5000  # 로컬 개발
# BACKEND_AI_URL=https://your-backend.com  # 프로덕션
```

## 성능 최적화

### Lazy Loading
- counseling_engine은 처음 사용 시에만 로드됩니다
- SentenceTransformer 모델은 공유 싱글톤으로 메모리 절약
- 임베딩 캐시로 재계산 방지 (`jung_embeds.pt`)

### Fallback 전략
1. **백엔드 counseling engine** 시도 (15초 타임아웃)
2. 실패 시 → **기존 GPT 방식** 자동 전환
3. 사용자는 중단 없이 서비스 이용

## 다음 단계

### 추가 가능한 기능
1. **세션 요약 자동 생성** - 상담 종료 시 인사이트 정리
2. **이메일 리포트** - 세션 내용 PDF/이메일 발송
3. **추적 관찰** - 정기 체크인 알림
4. **그룹 상담** - 공통 테마 그룹 세션
5. **음성 상담** - TTS/STT 통합

### 모니터링
- 백엔드 엔진 사용률 추적
- 위기 감지 빈도 모니터링
- 세션 단계별 완료율 분석

## 참고 파일

- **백엔드 엔진**: `backend_ai/app/counseling_engine.py`
- **백엔드 API**: `backend_ai/app/app.py` (라인 5122+)
- **프론트엔드 API**: `src/app/api/life-prediction/advisor-chat/route.ts`
- **Jung 데이터**: `backend_ai/data/graph/rules/jung/*.json`

---

**결론**: 이제 Destiny Map 카운슬러는 단순 GPT 기반이 아닌, **전문적인 융 심리학 기반 상담 시스템**입니다. 위기 감지, 맞춤형 질문, 세션 관리, 사주 통합까지 완비되어 **GPT보다 훨씬 우수한 상담 경험**을 제공합니다! 🎊
