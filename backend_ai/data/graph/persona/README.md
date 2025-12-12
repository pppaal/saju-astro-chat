# Persona System for AI Fortune-Telling

이 폴더는 AI 운세 해석에 **페르소나(Persona)** 시스템을 추가하여 다양한 철학적 관점에서 해석을 제공합니다.

## 📦 구조

```
persona/
├── nodes/                          # 페르소나 개념 노드 (CSV)
│   ├── nodes_persona_jung.csv     # Jung 심리학 개념들
│   └── nodes_persona_stoic.csv    # Stoic 철학 개념들
├── relations/                      # 페르소나 개념 간 관계 (CSV)
│   └── relations_persona.csv      # 개념 간 연결
└── README.md                       # 이 파일
```

**Rules JSON 파일들** (해석 스타일):
```
../rules/persona/
├── analyst_jung.json               # Jung 페르소나 룰
└── strategist_stoic.json           # Stoic 페르소나 룰
```

## 🎭 페르소나 목록

### 1. The Analyst (분석관) - Carl Jung
**철학**: 분석심리학 (Analytical Psychology)
**톤**: 깊이 있는 심리 분석, 원형과 무의식 탐구
**핵심 개념**:
- **Archetype (원형)**: 집단 무의식의 보편적 상징
- **Shadow (그림자)**: 억압된 자아의 어두운 면
- **Anima/Animus (아니마/아니무스)**: 내면의 반대 성별 에너지
- **Individuation (개성화)**: 진정한 자기 자신이 되는 과정
- **Collective Unconscious (집단무의식)**: 인류 공통의 심리 구조
- **Synchronicity (공시성)**: 의미있는 우연의 일치

**언제 적용되나요?**:
- 심리적 깊이가 필요한 해석
- 무의식적 패턴 분석
- 관계에서의 투사 이해
- 꿈과 상징 해석

### 2. The Strategist (전략가) - Stoicism
**철학**: 스토아 철학 (Marcus Aurelius, Epictetus, Seneca)
**톤**: 실용적 지혜, 통제 가능한 것에 집중, 덕과 내적 평온
**핵심 개념**:
- **Dichotomy of Control (통제 이분법)**: 통제 가능/불가능 구분
- **Virtue (덕)**: 지혜, 용기, 절제, 정의
- **Memento Mori**: 죽음을 기억하고 현재를 살기
- **Amor Fati**: 운명을 사랑하고 받아들이기
- **Premeditatio Malorum**: 최악의 상황을 미리 명상하기
- **The Obstacle is the Way**: 장애물을 성장의 기회로
- **Inner Citadel (내면의 성채)**: 흔들리지 않는 내면

**언제 적용되나요?**:
- 실용적 조언이 필요할 때
- 어려운 상황 대처 전략
- 감정 조절과 평정심
- 현실적 목표 설정

## 🔧 작동 방식

### GraphRAG 자동 로드
`graph_rag.py`의 `_load_all()` 함수가 재귀적으로 모든 CSV와 JSON을 자동 로드합니다:

```python
def _load_all(self):
    # 1️⃣ 그래프 CSV 로드 (persona/nodes/, persona/relations/)
    for root, _, files in os.walk(self.graph_dir):
        for file in files:
            if "node" in name:
                self._load_nodes(path)  # 노드 추가
            elif "edge" or "relation" in name:
                self._load_edges(path)  # 엣지 추가

    # 2️⃣ 룰 JSON 로드 (rules/persona/)
    for root, _, files in os.walk(self.rules_dir):
        if file.endswith(".json"):
            self.rules[key] = json.load(f)  # 룰 추가
```

### 임베딩 기반 검색
페르소나 개념들이 임베딩되어 사용자 질의와 유사도 비교:

```python
def query(self, facts: dict, top_k: int = 8):
    # facts 딕셔너리를 임베딩
    query_emb = self.embed_model.encode(facts_str)

    # 페르소나 노드들과 코사인 유사도 계산
    cos_scores = util.cos_sim(query_emb, self.node_embeds)[0]

    # 상위 k개 매칭 노드 반환
    matched_nodes = [self.node_texts[i] for i in top_results.indices]
```

### 룰 기반 해석
특정 키워드가 포함되면 해당 페르소나 메시지 출력:

```json
{
  "shadow_work": {
    "when": ["pluto", "8th house", "scorpio", "어려운 측면"],
    "text": "이 배치는 그림자(Shadow) 작업을 요청하고 있습니다...",
    "weight": 4
  }
}
```

```python
def _apply_rules(self, domain: str, facts_str: str):
    for key, rule in rulebook.items():
        cond = rule.get("when")
        msg = rule.get("text")
        if cond and cond in facts_str and msg:
            descs.append(msg)  # 조건 만족 시 메시지 추가
```

## 🚀 사용 예시

### Python (backend_ai)
```python
from backend_ai.app.graph_rag import GraphRAG

# GraphRAG 초기화 (자동으로 persona 로드)
rag = GraphRAG(base_dir="../backend_ai/data")

# 사용자 facts
facts = {
    "sun": "Leo",
    "pluto": "8th house",
    "difficult_aspect": True
}

# 쿼리 실행
result = rag.query(facts, top_k=10)

# 결과:
# - matched_nodes: ["shadow", "integration", "pluto", ...]
# - related_edges: [{"src": "shadow", "dst": "integration", ...}]
# - rule_summary: ["이 배치는 그림자 작업을 요청...", ...]
```

### API 사용
```bash
# POST /api/saju/interpret
curl -X POST http://localhost:5000/api/saju/interpret \
  -H "Content-Type: application/json" \
  -d '{
    "birthDate": "1990-05-15T14:30:00",
    "persona": "analyst_jung"  # 또는 "strategist_stoic"
  }'
```

## 📝 페르소나 확장 방법

### 새로운 페르소나 추가 (예: The Mystic - 예언자)

1. **Rules JSON 생성**:
```bash
# rules/persona/mystic_astrology.json 생성
{
  "meta": {
    "persona": "The Mystic (예언자)",
    "philosophy": "Astrology & I-Ching"
  },
  "planetary_alignment": {
    "when": ["transit", "conjunction"],
    "text": "우주의 별들이 당신에게 말합니다...",
    "weight": 5
  }
}
```

2. **Nodes CSV 생성**:
```bash
# persona/nodes/nodes_persona_mystic.csv
id,label,name,desc,category,element
planetary_transit,행성이동,Planetary Transit,행성의 움직임과 영향,mystic_concept,air
divination,점술,Divination,미래를 예측하는 기법,mystic_practice,water
```

3. **재시작** (자동 로드됨):
```bash
# Flask 서버 재시작하면 자동으로 새 페르소나 로드
python -m flask --app backend_ai/app/app.py run
```

## 🎯 페르소나 선택 로직 (미래 확장)

현재는 **backend_ai만 구현**되었습니다. 나중에 src/lib에 추가하면:

```typescript
// src/lib/persona/personaTypes.ts
export type PersonaType = 'analyst_jung' | 'strategist_stoic' | 'mystic_astrology' | 'healer_spiritual';

// src/components/PersonaSelector.tsx
<select onChange={(e) => setPersona(e.target.value)}>
  <option value="analyst_jung">The Analyst (Jung)</option>
  <option value="strategist_stoic">The Strategist (Stoic)</option>
</select>
```

## 📊 현재 노드/엣지 개수

- **Jung 노드**: 19개 (archetype, shadow, anima, animus, self, ...)
- **Stoic 노드**: 20개 (virtue, dichotomy_of_control, memento_mori, ...)
- **Relations**: 25개 (shadow→integration, virtue→eudaimonia, ...)
- **Rules**: 18개 (Jung 8개 + Stoic 10개)

## 🔮 다음 단계

1. **더 많은 페르소나 추가**:
   - The Mystic (예언자) - Astrology/I-Ching
   - The Healer (치유자) - Spiritual texts

2. **Cross-domain 연결**:
   - 페르소나 개념 ↔ 사주 개념
   - 페르소나 개념 ↔ 점성 개념
   - `cross_analysis/edges_persona_cross.csv`

3. **Frontend UI 통합**:
   - 페르소나 선택기 (PersonaSelector)
   - 페르소나별 스타일링
   - 페르소나 설명 카드

---

**생성일**: 2024
**버전**: 1.0
**작성자**: AI Fortune-Telling Team
