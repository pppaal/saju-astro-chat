# backend_ai/app/routers/tarot/context_detector.py
"""
Question context detection for tarot interpretation.
Analyzes user questions to provide appropriate interpretation context.
"""

import json
import re
from typing import Any, Dict, List, Optional, Tuple


# Playful/unusual question keywords
PLAYFUL_KEYWORDS_KO = [
    "개한테", "고양이한테", "강아지한테", "동물",
    "키스", "뽀뽀", "핥", "물어",
    "라면", "밥 먹", "치킨", "피자", "짜장면",
    "게임", "유튜브", "넷플릭스", "틱톡",
    "머리 염색", "문신", "타투", "피어싱",
    "술 마", "담배", "복권", "로또",
    "외계인", "귀신", "유령", "좀비",
]

PLAYFUL_KEYWORDS_EN = [
    "kiss a dog", "kiss my dog", "pet", "lotto", "lottery"
]

PLAYFUL_KEYWORDS = PLAYFUL_KEYWORDS_KO + PLAYFUL_KEYWORDS_EN


INTENT_RULES: List[Dict[str, Any]] = [
    {
        "intent": "reconciliation",
        "keywords": ["재회", "다시 만나", "다시 이어질", "이어질 수 있", "이어질까", "헤어진", "돌아올", "연락 올", "ex", "get back", "reconcile"],
        "mapped_spreads": {"reconciliation"},
    },
    {
        "intent": "feelings",
        "keywords": ["좋아", "관심", "호감", "날 어떻게", "마음이 있", "like me", "crush", "속마음", "진심"],
        "mapped_spreads": {"crush"},
    },
    {
        "intent": "confession",
        "keywords": ["고백", "말할까", "표현", "confess", "tell them"],
    },
    {
        "intent": "commitment",
        "keywords": ["결혼", "프로포즈", "약혼", "marriage", "propose", "wedding"],
        "mapped_spreads": {"marriage"},
    },
    {
        "intent": "breakup",
        "keywords": ["이별", "헤어질", "끝낼", "break up", "end relationship", "separate"],
        "mapped_spreads": {"breakup"},
    },
    {
        "intent": "new_connection",
        "keywords": ["썸", "소개팅", "만남", "인연", "dating", "meeting", "single", "soulmate"],
        "mapped_spreads": {"new_love"},
    },
    {
        "intent": "conflict_resolution",
        "keywords": ["싸웠", "다퉜", "화해", "사과", "fight", "make up"],
    },
    {
        "intent": "career_change",
        "keywords": ["이직", "퇴사", "그만두", "quit", "resign", "change job"],
        "mapped_spreads": {"career_change"},
    },
    {
        "intent": "job_search",
        "keywords": ["취업", "취직", "입사", "job", "employment", "hire"],
        "mapped_spreads": {"job_search"},
    },
    {
        "intent": "entrepreneurship",
        "keywords": ["사업", "창업", "business", "startup", "entrepreneur"],
        "mapped_spreads": {"entrepreneurship"},
    },
    {
        "intent": "promotion",
        "keywords": ["승진", "promotion", "raise"],
        "mapped_spreads": {"promotion"},
    },
    {
        "intent": "workplace_relationship",
        "keywords": ["상사", "팀장", "boss", "manager", "동료", "팀원", "coworker", "colleague"],
        "mapped_spreads": {"workplace"},
    },
    {
        "intent": "exam",
        "keywords": ["시험", "합격", "붙을", "자격증", "exam", "test", "pass", "면접", "interview"],
    },
    {
        "intent": "finance",
        "keywords": ["돈", "재물", "금전", "수입", "money", "income", "wealth"],
    },
    {
        "intent": "investment",
        "keywords": ["투자", "주식", "코인", "부동산", "invest", "stock", "crypto"],
    },
    {
        "intent": "debt",
        "keywords": ["대출", "빚", "loan", "debt"],
    },
    {
        "intent": "health",
        "keywords": ["건강", "아파", "병원", "수술", "health", "sick", "hospital"],
    },
    {
        "intent": "emotional_healing",
        "keywords": ["스트레스", "우울", "불안", "멘탈", "힘들", "stress", "anxiety", "depression", "burnout", "지침"],
    },
    {
        "intent": "comparison",
        "keywords": [" vs ", "아니면", " or ", "둘 중", "양자택일"],
    },
    {
        "intent": "decision",
        "keywords": ["할까 말까", "해야 할까", "결정", "선택", "decide", "choice"],
    },
    {
        "intent": "timing",
        "keywords": ["언제", "시기", "타이밍", "when", "timing"],
    },
    {
        "intent": "daily_flow",
        "keywords": ["오늘", "today", "이번 주", "this week", "이번 달", "this month", "올해", "this year"],
    },
    {
        "intent": "self_identity",
        "keywords": ["나는 누구", "정체성", "본질", "내 강점", "약점", "identity", "who am i"],
    },
    {
        "intent": "shadow_work",
        "keywords": ["그림자", "내면", "무의식", "트라우마", "shadow", "subconscious"],
    },
    {
        "intent": "growth",
        "keywords": ["성장", "발전", "변화", "자기계발", "growth", "development"],
    },
]


THEME_DEFAULT_INTENTS = {
    "love": "relationship_general",
    "career": "career_general",
    "wealth": "finance_general",
    "money": "finance_general",
    "general": "general_guidance",
}


INTENT_LABELS = {
    "reconciliation": "재회 가능성",
    "feelings": "상대 감정",
    "confession": "고백/표현",
    "commitment": "결혼/약속",
    "breakup": "이별 판단",
    "new_connection": "새 인연",
    "conflict_resolution": "갈등 회복",
    "career_change": "이직/퇴사",
    "job_search": "취업/합격",
    "entrepreneurship": "사업/창업",
    "promotion": "승진",
    "workplace_relationship": "직장 관계",
    "exam": "시험/면접",
    "finance": "재정 흐름",
    "investment": "투자 판단",
    "debt": "부채/대출",
    "health": "건강 이슈",
    "emotional_healing": "정서 회복",
    "comparison": "선택지 비교",
    "decision": "결정 판단",
    "timing": "시기 판단",
    "daily_flow": "기간 흐름",
    "self_identity": "자기 이해",
    "shadow_work": "내면 탐색",
    "growth": "성장 방향",
    "relationship_general": "관계 흐름",
    "career_general": "커리어 흐름",
    "finance_general": "금전 흐름",
    "general_guidance": "전반 흐름",
    "playful": "가벼운 질문",
}


INTENT_FOCUS_TEXT = {
    "reconciliation": "재회 가능성과 연락 흐름, 막히는 요인을 먼저 보세요.",
    "feelings": "상대의 현재 감정과 진심, 표현 가능성을 먼저 보세요.",
    "confession": "표현 타이밍과 받아들여질 가능성을 먼저 보세요.",
    "commitment": "장기 안정성과 현실적인 약속 가능성을 먼저 보세요.",
    "breakup": "관계를 이어갈지 정리할지의 현실 판단을 먼저 보세요.",
    "new_connection": "새 인연 유입 시점과 어떤 유형의 사람이 들어오는지 먼저 보세요.",
    "conflict_resolution": "갈등 원인과 먼저 움직여야 할 쪽, 회복 가능성을 먼저 보세요.",
    "career_change": "현재 자리 대비 이동 리스크와 바꾸는 시점을 먼저 보세요.",
    "job_search": "합격 가능성과 준비 포인트, 결과 시점을 먼저 보세요.",
    "entrepreneurship": "시작 타이밍과 리스크, 수익화 가능성을 먼저 보세요.",
    "promotion": "승진 가능성과 경쟁 구도, 타이밍을 먼저 보세요.",
    "workplace_relationship": "권력 관계와 소통 포인트, 충돌 리스크를 먼저 보세요.",
    "exam": "합격 가능성과 부족한 영역, 단기 보완 포인트를 먼저 보세요.",
    "finance": "돈의 흐름과 새는 지점, 회복 포인트를 먼저 보세요.",
    "investment": "진입 시점과 변동성 리스크를 먼저 보세요.",
    "debt": "부담이 커지는 지점과 정리 순서를 먼저 보세요.",
    "health": "무리되는 부분과 회복 페이스를 조심스럽게 보세요.",
    "emotional_healing": "지금 감정의 압력과 회복에 필요한 안정 장치를 먼저 보세요.",
    "comparison": "선택지별 장단점과 어느 쪽이 더 자연스럽게 열리는지 먼저 보세요.",
    "decision": "결정 보류가 나은지, 바로 움직여도 되는지 먼저 보세요.",
    "timing": "지금 움직일 때인지, 더 기다려야 하는지 시점 중심으로 보세요.",
    "daily_flow": "기간별 흐름과 주의 포인트를 먼저 보세요.",
    "self_identity": "지금 반복되는 패턴과 핵심 성향을 먼저 보세요.",
    "shadow_work": "무의식적 저항과 회피 패턴을 먼저 보세요.",
    "growth": "다음 성장 단계와 지금 내려놓아야 할 부분을 먼저 보세요.",
    "relationship_general": "관계의 전체 흐름과 감정 밸런스를 먼저 보세요.",
    "career_general": "커리어 방향성과 현실적 실행 포인트를 먼저 보세요.",
    "finance_general": "지출과 수입의 균형, 현실적인 안정 포인트를 먼저 보세요.",
    "general_guidance": "전체 흐름에서 가장 중요한 변화 지점을 먼저 보세요.",
    "playful": "가볍고 재치 있게 답하되 카드 상징은 실제 상황과 연결하세요.",
}


LLM_FALLBACK_INTENTS = [
    "reconciliation",
    "feelings",
    "confession",
    "commitment",
    "breakup",
    "new_connection",
    "conflict_resolution",
    "career_change",
    "job_search",
    "entrepreneurship",
    "promotion",
    "workplace_relationship",
    "exam",
    "finance",
    "investment",
    "debt",
    "health",
    "emotional_healing",
    "comparison",
    "decision",
    "timing",
    "daily_flow",
    "self_identity",
    "shadow_work",
    "growth",
    "relationship_general",
    "career_general",
    "finance_general",
    "general_guidance",
]


def _score_intent(rule: Dict[str, Any], question: str, mapped_spread: str) -> Tuple[int, List[str], int]:
    hits: List[str] = []
    score = 0
    keyword_hit_count = 0

    for keyword in rule.get("keywords", []):
        if keyword and keyword in question:
            hits.append(keyword)
            score += 1
            keyword_hit_count += 1

    if mapped_spread and mapped_spread in rule.get("mapped_spreads", set()):
        hits.append(f"spread:{mapped_spread}")
        score += 1

    return score, hits, keyword_hit_count


def _estimate_intent_confidence(top_score: int, second_score: int, has_keyword_match: bool) -> float:
    if not has_keyword_match:
        return 0.42
    if top_score >= 4 and top_score - second_score >= 2:
        return 0.94
    if top_score >= 3 and top_score - second_score >= 1:
        return 0.86
    if top_score >= 2:
        return 0.76
    return 0.64


def classify_question_intent(
    question: str,
    mapped_theme: str = "",
    mapped_spread: str = "",
) -> Dict[str, Any]:
    """Return a structured question intent payload for tarot prompting and tracing."""
    q = (question or "").lower().strip()
    matched_keywords: Dict[str, List[str]] = {}
    scores: Dict[str, int] = {}
    keyword_hit_counts: Dict[str, int] = {}
    is_playful = is_playful_question(question)

    if is_playful:
        scores["playful"] = 4
        matched_keywords["playful"] = ["playful_keyword"]

    for rule in INTENT_RULES:
        score, hits, keyword_hit_count = _score_intent(rule, q, mapped_spread)
        if score <= 0:
            continue
        intent = str(rule["intent"])
        scores[intent] = scores.get(intent, 0) + score
        keyword_hit_counts[intent] = keyword_hit_counts.get(intent, 0) + keyword_hit_count
        matched_keywords[intent] = hits

    if not scores:
        fallback_intent = THEME_DEFAULT_INTENTS.get(mapped_theme or "", "general_guidance")
        return {
            "primary_intent": fallback_intent,
            "secondary_intents": [],
            "confidence": _estimate_intent_confidence(0, 0, False),
            "matched_keywords": {},
            "is_playful": False,
            "mapped_theme": mapped_theme,
            "mapped_spread": mapped_spread,
            "intent_label": INTENT_LABELS.get(fallback_intent, fallback_intent),
            "focus_instruction": INTENT_FOCUS_TEXT.get(fallback_intent, ""),
        }

    ranked = sorted(
        scores.items(),
        key=lambda item: (-item[1], -keyword_hit_counts.get(item[0], 0), item[0]),
    )
    primary_intent, top_score = ranked[0]
    second_score = ranked[1][1] if len(ranked) > 1 else 0
    secondary_intents = []
    for intent, score in ranked[1:]:
        if score >= 2 or (intent in {"timing", "comparison", "decision"} and score >= 1):
            secondary_intents.append(intent)
        if len(secondary_intents) >= 2:
            break

    return {
        "primary_intent": primary_intent,
        "secondary_intents": secondary_intents,
        "confidence": _estimate_intent_confidence(top_score, second_score, True),
        "matched_keywords": matched_keywords,
        "is_playful": is_playful,
        "mapped_theme": mapped_theme,
        "mapped_spread": mapped_spread,
        "intent_label": INTENT_LABELS.get(primary_intent, primary_intent),
        "focus_instruction": INTENT_FOCUS_TEXT.get(primary_intent, ""),
    }


def build_intent_focus_instruction(intent_payload: Dict[str, Any], is_korean: bool = True) -> str:
    """Build a compact intent instruction block for prompts."""
    if not intent_payload:
        return ""

    primary_intent = str(intent_payload.get("primary_intent", "")).strip()
    if not primary_intent:
        return ""

    secondary_intents = [
        INTENT_LABELS.get(intent, intent)
        for intent in intent_payload.get("secondary_intents", []) or []
        if str(intent).strip()
    ]
    confidence = float(intent_payload.get("confidence", 0.0) or 0.0)
    focus_instruction = str(intent_payload.get("focus_instruction", "")).strip()
    primary_label = INTENT_LABELS.get(primary_intent, primary_intent)

    if is_korean:
        parts = [
            "## Question Intent",
            f"- primary: {primary_label}",
            f"- confidence: {confidence:.2f}",
        ]
        if secondary_intents:
            parts.append(f"- secondary: {', '.join(secondary_intents)}")
        if focus_instruction:
            parts.append(f"- focus: {focus_instruction}")
        return "\n".join(parts)

    parts = [
        "## Question Intent",
        f"- primary: {primary_intent}",
        f"- confidence: {confidence:.2f}",
    ]
    if secondary_intents:
        parts.append(f"- secondary: {', '.join(secondary_intents)}")
    if focus_instruction:
        parts.append(f"- focus: {focus_instruction}")
    return "\n".join(parts)


def _build_llm_intent_prompt(question: str, mapped_theme: str, mapped_spread: str, base_intent: Dict[str, Any]) -> str:
    return f"""Return ONLY valid JSON.

Classify the user's tarot question intent.

Allowed intents:
{json.dumps(LLM_FALLBACK_INTENTS, ensure_ascii=False)}

Question:
{question}

Mapped theme: {mapped_theme or "general"}
Mapped spread: {mapped_spread or "general"}
Rule-based primary intent: {base_intent.get("primary_intent", "")}
Rule-based secondary intents: {json.dumps(base_intent.get("secondary_intents", []), ensure_ascii=False)}

Return JSON with this shape:
{{
  "primary_intent": "one allowed intent",
  "secondary_intents": ["up to 2 allowed intents"],
  "confidence": 0.0,
  "reason": "short reason"
}}

Rules:
1. Prefer the user's actual question wording over the mapped spread when they conflict.
2. Use `timing` as secondary if the question mainly asks when.
3. Use `comparison` as primary for A vs B type questions.
4. Keep confidence between 0.55 and 0.92.
"""


def _merge_llm_intent_payload(
    base_intent: Dict[str, Any],
    llm_payload: Dict[str, Any],
) -> Dict[str, Any]:
    primary_intent = str(llm_payload.get("primary_intent", "")).strip()
    if primary_intent not in LLM_FALLBACK_INTENTS:
        return base_intent

    merged = dict(base_intent)
    secondary_intents = [
        str(intent).strip()
        for intent in llm_payload.get("secondary_intents", []) or []
        if str(intent).strip() in LLM_FALLBACK_INTENTS and str(intent).strip() != primary_intent
    ][:2]
    llm_confidence = float(llm_payload.get("confidence", merged.get("confidence", 0.0)) or 0.0)
    merged.update(
        {
            "primary_intent": primary_intent,
            "secondary_intents": secondary_intents,
            "confidence": max(float(base_intent.get("confidence", 0.0) or 0.0), min(max(llm_confidence, 0.55), 0.92)),
            "intent_label": INTENT_LABELS.get(primary_intent, primary_intent),
            "focus_instruction": INTENT_FOCUS_TEXT.get(primary_intent, ""),
            "llm_reason": str(llm_payload.get("reason", "")).strip(),
            "llm_fallback_used": False,
            "llm_understanding_used": True,
            "understanding_source": "gpt_first",
            "rule_based_primary_intent": str(base_intent.get("primary_intent", "")).strip(),
            "rule_based_secondary_intents": list(base_intent.get("secondary_intents", []) or []),
        }
    )
    return merged


def resolve_question_intent(
    question: str,
    mapped_theme: str = "",
    mapped_spread: str = "",
    llm_fn=None,
) -> Dict[str, Any]:
    """Resolve tarot question intent with GPT-first understanding and rule fallback."""
    base_intent = classify_question_intent(
        question,
        mapped_theme=mapped_theme,
        mapped_spread=mapped_spread,
    )
    base_intent["llm_fallback_used"] = False
    base_intent["llm_understanding_used"] = False
    base_intent["understanding_source"] = "rule_only"
    base_intent["rule_based_primary_intent"] = str(base_intent.get("primary_intent", "")).strip()
    base_intent["rule_based_secondary_intents"] = list(base_intent.get("secondary_intents", []) or [])

    if llm_fn is None or not str(question or "").strip():
        return base_intent

    try:
        prompt = _build_llm_intent_prompt(question, mapped_theme, mapped_spread, base_intent)
        llm_raw = str(llm_fn(prompt, max_tokens=300, temperature=0.1, use_mini=True) or "").strip()
        json_match = re.search(r"\{[\s\S]*\}", llm_raw)
        if not json_match:
            base_intent["understanding_source"] = "rule_fallback"
            base_intent["llm_reason"] = "llm_intent_parse_failed"
            return base_intent
        llm_payload = json.loads(json_match.group())
        if not isinstance(llm_payload, dict):
            base_intent["understanding_source"] = "rule_fallback"
            base_intent["llm_reason"] = "llm_intent_not_dict"
            return base_intent
        return _merge_llm_intent_payload(base_intent, llm_payload)
    except Exception:
        base_intent["understanding_source"] = "rule_fallback"
        base_intent["llm_reason"] = "llm_intent_exception"
        return base_intent


def is_playful_question(question: str) -> bool:
    """Check if the question is playful/unusual."""
    q = question.lower()
    return any(kw in q for kw in PLAYFUL_KEYWORDS)


def detect_question_context(
    question: str,
    mapped_spread: str = ""
) -> Tuple[str, bool]:
    """
    Detect question context and return appropriate interpretation guidance.

    Args:
        question: User's question
        mapped_spread: Mapped spread type for additional context

    Returns:
        Tuple of (context_instruction, is_playful)
    """
    if not question:
        return "", False

    q = question.lower()

    # Check for playful questions first
    if is_playful_question(question):
        return (
            """질문자가 가벼운/재미있는 질문을 하고 있습니다.
유머러스하게 카드를 해석하되, 카드의 상징을 실제로 연결해주세요.
예: "개한테 키스할까?" → "광대 카드가 나왔네요—이 카드는 순수한 즐거움과 자유로운 행동을 나타내요. 반려견과의 교감은 순수한 사랑의 표현이에요. 다만 위생은 챙기시길!"
진지하게 거부하거나 무시하지 말고, 재치있게 답변하세요.""",
            True
        )

    # ========== 연애/관계 ==========
    if any(kw in q for kw in ["좋아", "관심", "호감", "날 어떻게", "마음이 있", "like me", "crush"]):
        return "질문자는 상대의 감정이 궁금합니다. 상대가 질문자를 어떻게 생각하는지, 관심이 있는지, 발전 가능성은 어떤지 위주로 해석하세요.", False

    if any(kw in q for kw in ["재회", "다시 만", "헤어진", "돌아올", "연락 올", "ex", "get back"]):
        return "질문자는 헤어진 사람과의 재회를 고민합니다. 상대의 현재 마음, 재결합 가능성, 장애물, 권고사항 위주로 해석하세요.", False

    if any(kw in q for kw in ["고백", "말할까", "표현", "먼저", "confess", "tell them"]):
        return "질문자는 고백/표현을 고민합니다. 타이밍이 맞는지, 상대가 어떻게 받아들일지, 방법 위주로 해석하세요.", False

    if any(kw in q for kw in ["결혼", "프로포즈", "약혼", "marriage", "propose"]):
        return "질문자는 결혼/프로포즈를 고민합니다. 상대와의 궁합, 시기, 결혼 후 전망 위주로 해석하세요.", False

    if any(kw in q for kw in ["이별", "헤어질", "끝낼", "break up", "end relationship"]):
        return "질문자는 이별을 고민합니다. 관계를 끝내는 것이 맞는지, 아직 가능성이 있는지, 결정 후 전망 위주로 해석하세요.", False

    if any(kw in q for kw in ["바람", "불륜", "양다리", "cheating", "affair"]):
        return "질문자는 상대의 진실성을 걱정합니다. 상대가 정직한지, 숨기는 게 있는지 솔직하게 해석하세요.", False

    if any(kw in q for kw in ["썸", "소개팅", "만남", "인연", "dating", "meeting"]):
        return "질문자는 새로운 인연을 기대합니다. 좋은 인연이 언제 올지, 어떤 사람일지, 어떻게 준비할지 해석하세요.", False

    if any(kw in q for kw in ["싸웠", "다퉜", "화해", "사과", "fight", "make up"]):
        return "질문자는 상대와 갈등 상황입니다. 화해 가능성, 누가 먼저 다가가야 할지, 관계 회복 방법 위주로 해석하세요.", False

    # ========== 직장/커리어 ==========
    if mapped_spread == "entrepreneurship" or any(kw in q for kw in ["사업", "창업", "business", "startup"]):
        return "질문자는 사업/창업에 대해 묻고 있습니다. 사업 시작 시기, 성공 가능성, 주의점 위주로 해석하세요.", False

    if mapped_spread == "job_search" or any(kw in q for kw in ["취업", "취직", "job", "employment"]):
        return "질문자는 취업에 대해 묻고 있습니다. 합격 가능성, 준비 방향, 시기 위주로 해석하세요.", False

    if mapped_spread == "career_change" or any(kw in q for kw in ["이직", "퇴사", "그만두", "quit", "resign"]):
        return "질문자는 이직/퇴사를 고민 중입니다. 현 직장 vs 새 직장, 시기, 리스크 위주로 해석하세요.", False

    if any(kw in q for kw in ["면접", "interview"]):
        return "질문자는 면접 결과가 궁금합니다. 합격 가능성, 면접관의 인상, 보완할 점 위주로 해석하세요.", False

    if any(kw in q for kw in ["승진", "promotion"]):
        return "질문자는 승진을 기대합니다. 승진 가능성, 타이밍, 경쟁자 대비 강점 위주로 해석하세요.", False

    if any(kw in q for kw in ["상사", "직장 상사", "팀장", "boss", "manager"]):
        return "질문자는 상사와의 관계를 고민합니다. 상사가 어떻게 보는지, 관계 개선법 위주로 해석하세요.", False

    if any(kw in q for kw in ["동료", "팀원", "직장 동료", "coworker", "colleague"]):
        return "질문자는 동료 관계를 고민합니다. 협업 전망, 갈등 해결법 위주로 해석하세요.", False

    # ========== 시험/학업 ==========
    if any(kw in q for kw in ["시험", "합격", "붙을", "자격증", "exam", "test", "pass"]):
        return "질문자는 시험 합격 여부가 궁금합니다. 합격 가능성, 부족한 부분, 집중할 영역 위주로 해석하세요.", False

    if any(kw in q for kw in ["수능", "입시", "대학", "college", "university"]):
        return "질문자는 입시 결과가 궁금합니다. 합격 전망, 목표 학교와의 궁합, 준비 방향 위주로 해석하세요.", False

    if any(kw in q for kw in ["공부", "성적", "학점", "study", "grade"]):
        return "질문자는 학업 성과를 고민합니다. 성적 향상 가능성, 공부 방법, 집중해야 할 부분 위주로 해석하세요.", False

    # ========== 재물/금전 ==========
    if any(kw in q for kw in ["돈", "재물", "금전", "수입", "money", "income", "wealth"]):
        return "질문자는 재물운이 궁금합니다. 돈이 들어올 시기, 재정 상태 전망, 주의사항 위주로 해석하세요.", False

    if any(kw in q for kw in ["투자", "주식", "코인", "부동산", "invest", "stock", "crypto"]):
        return "질문자는 투자를 고민합니다. 투자 시기, 수익 가능성, 리스크 위주로 해석하세요. 구체적 투자 조언은 피하되 에너지 흐름을 설명하세요.", False

    if any(kw in q for kw in ["사야", "살까", "구매", "구입", "buy", "purchase"]):
        return "질문자는 큰 구매를 고민합니다. 지금 사도 되는지, 기다려야 할지, 숨은 변수 위주로 해석하세요.", False

    if any(kw in q for kw in ["대출", "빚", "loan", "debt"]):
        return "질문자는 대출/부채를 고민합니다. 재정 부담, 상환 전망, 주의사항 위주로 해석하세요.", False

    # ========== 건강/웰빙 ==========
    if any(kw in q for kw in ["건강", "아픔", "병원", "수술", "health", "sick", "hospital"]):
        return "질문자는 건강을 걱정합니다. 건강 상태 전망, 주의해야 할 부분, 회복 가능성 위주로 해석하세요. 의료 조언은 피하세요.", False

    if any(kw in q for kw in ["다이어트", "살 빼", "운동", "diet", "weight", "exercise"]):
        return "질문자는 체중/건강관리를 고민합니다. 성공 가능성, 동기부여, 주의점 위주로 해석하세요.", False

    if any(kw in q for kw in ["스트레스", "우울", "불안", "멘탈", "힘들", "stress", "anxiety", "depression"]):
        return "질문자는 정서적으로 힘든 상태입니다. 공감과 위로를 담아 해석하고, 상황이 나아질 방향을 제시하세요.", False

    if any(kw in q for kw in ["잠", "수면", "불면", "피곤", "sleep", "tired", "insomnia"]):
        return "질문자는 휴식이 필요한 상태입니다. 에너지 회복 방법, 마음 정리 방향 위주로 해석하세요.", False

    # ========== 선택/결정 ==========
    if any(kw in q for kw in ["vs", "아니면", "or", "vs"]):
        return "질문자는 양자택일 상황입니다. 각 선택지의 장단점과 카드가 어느 쪽을 가리키는지 명확히 해석하세요.", False

    if any(kw in q for kw in ["할까 말까", "해야 할까", "결정", "선택", "decide", "choice"]):
        return "질문자는 중요한 결정을 앞두고 있습니다. 각 방향의 전망과 카드가 권하는 방향을 명확히 해석하세요.", False

    if any(kw in q for kw in ["언제", "시기", "타이밍", "when", "timing"]):
        return "질문자는 적절한 타이밍이 궁금합니다. 지금이 맞는지, 기다려야 할지, 행동 시점 위주로 해석하세요.", False

    # ========== 가족/인간관계 ==========
    if any(kw in q for kw in ["부모", "엄마", "아빠", "어머니", "아버지", "parent", "mom", "dad"]):
        return "질문자는 부모님과의 관계를 고민합니다. 소통 방법, 이해받는 법, 관계 개선 위주로 해석하세요.", False

    if any(kw in q for kw in ["자녀", "아이", "아들", "딸", "child", "kid", "son", "daughter"]):
        return "질문자는 자녀에 대해 고민합니다. 자녀의 상태, 양육 방향, 관계 발전 위주로 해석하세요.", False

    if any(kw in q for kw in ["친구", "우정", "friend", "friendship"]):
        return "질문자는 친구 관계를 고민합니다. 진정한 친구인지, 관계 유지 방법 위주로 해석하세요.", False

    if any(kw in q for kw in ["형제", "언니", "오빠", "누나", "동생", "sibling", "brother", "sister"]):
        return "질문자는 형제자매 관계를 고민합니다. 갈등 해결, 관계 회복 방향 위주로 해석하세요.", False

    # ========== 이사/여행/이동 ==========
    if any(kw in q for kw in ["이사", "move", "moving"]):
        return "질문자는 이사를 고민합니다. 이사 시기, 새 집의 기운, 주의점 위주로 해석하세요.", False

    if any(kw in q for kw in ["여행", "휴가", "travel", "trip", "vacation"]):
        return "질문자는 여행을 계획합니다. 여행 운, 좋은 시기, 주의사항 위주로 해석하세요.", False

    if any(kw in q for kw in ["유학", "이민", "해외", "abroad", "overseas"]):
        return "질문자는 해외 진출을 고민합니다. 해외 운, 적응 가능성, 시기 위주로 해석하세요.", False

    # ========== 일상/기타 ==========
    if any(kw in q for kw in ["오늘", "today"]):
        return "질문자는 오늘 하루의 흐름이 궁금합니다. 오늘의 에너지, 주의할 점, 행운의 포인트 위주로 해석하세요.", False

    if any(kw in q for kw in ["이번 주", "this week"]):
        return "질문자는 이번 주 흐름이 궁금합니다. 주간 에너지, 좋은 날/주의할 날, 핵심 조언 위주로 해석하세요.", False

    if any(kw in q for kw in ["이번 달", "this month"]):
        return "질문자는 이번 달 운세가 궁금합니다. 월간 흐름, 기회, 주의사항 위주로 해석하세요.", False

    if any(kw in q for kw in ["올해", "this year", "2025", "2024"]):
        return "질문자는 연간 운세가 궁금합니다. 올해의 주요 테마, 기회와 도전, 전반적 흐름 위주로 해석하세요.", False

    if any(kw in q for kw in ["반려동물", "강아지", "고양이", "펫", "pet", "dog", "cat"]):
        return "질문자는 반려동물에 대해 묻습니다. 반려동물과의 인연, 관계, 케어 방향 위주로 해석하세요.", False

    if any(kw in q for kw in ["임신", "출산", "아기", "pregnancy", "baby", "pregnant"]):
        return "질문자는 임신/출산을 기대합니다. 임신 가능성, 시기, 준비 방향 위주로 해석하세요. 민감한 주제이므로 따뜻하게 해석하세요.", False

    if any(kw in q for kw in ["계약", "서명", "contract", "sign"]):
        return "질문자는 계약을 앞두고 있습니다. 계약 성사 가능성, 주의할 조항, 타이밍 위주로 해석하세요.", False

    if any(kw in q for kw in ["소송", "법적", "재판", "lawsuit", "legal", "court"]):
        return "질문자는 법적 문제가 있습니다. 결과 전망, 주의사항, 대응 방향 위주로 해석하세요.", False

    if any(kw in q for kw in ["분실", "잃어버", "찾을", "lost", "find", "missing"]):
        return "질문자는 분실물을 찾고 있습니다. 찾을 가능성, 방향, 시간 위주로 해석하세요.", False

    # ========== 자기 성장/내면 ==========
    if any(kw in q for kw in ["나는 누구", "정체성", "본질", "내 강점", "약점", "identity", "who am i"]):
        return "질문자는 자기 자신에 대해 탐구합니다. 핵심 동기, 강점, 약점, 성장 방향 위주로 깊이 있게 해석하세요.", False

    if any(kw in q for kw in ["그림자", "내면", "무의식", "트라우마", "shadow", "subconscious"]):
        return "질문자는 내면의 숨겨진 부분을 탐구합니다. 반복되는 패턴, 무의식적 두려움, 치유 방향 위주로 섬세하게 해석하세요.", False

    if any(kw in q for kw in ["성장", "발전", "변화", "자기계발", "growth", "development"]):
        return "질문자는 성장과 발전을 원합니다. 현재 배울 점, 극복할 과제, 다음 단계 위주로 해석하세요.", False

    if any(kw in q for kw in ["메시지", "우주", "신호", "운명", "message", "universe", "destiny"]):
        return "질문자는 우주/운명의 메시지를 듣고 싶어합니다. 카드가 전하는 심오한 메시지를 영적으로 해석하세요.", False

    if any(kw in q for kw in ["직관", "영감", "꿈", "비전", "intuition", "dream", "vision"]):
        return "질문자는 직관과 영감을 구합니다. 내면의 목소리, 꿈의 의미, 직관적 가이드 위주로 해석하세요.", False

    # ========== 현재 연인/커플 ==========
    if any(kw in q for kw in ["사귀는", "연인", "남자친구", "여자친구", "남친", "여친", "boyfriend", "girlfriend"]):
        return "질문자는 현재 연인과의 관계를 묻습니다. 상대의 마음, 관계 발전 가능성, 주의점 위주로 해석하세요.", False

    if any(kw in q for kw in ["우리 관계", "앞으로", "미래", "relationship future"]):
        return "질문자는 현재 관계의 미래를 알고 싶어합니다. 관계 발전 방향, 잠재력, 도전 과제 위주로 해석하세요.", False

    # ========== 솔로/인연 찾기 ==========
    if any(kw in q for kw in ["솔로", "혼자", "짝", "배필", "single", "soulmate"]):
        return "질문자는 인연을 찾고 있습니다. 좋은 인연이 언제/어디서 올지, 어떻게 준비할지, 본인의 매력 포인트 위주로 해석하세요.", False

    # ========== 워라밸/번아웃 ==========
    if any(kw in q for kw in ["워라밸", "일과 삶", "번아웃", "지침", "work life", "burnout", "exhausted"]):
        return "질문자는 일과 삶의 균형을 고민합니다. 에너지 분배, 우선순위, 회복 방법 위주로 해석하세요.", False

    # Default: no specific context
    return "", False


def is_yes_no_question(question: str) -> bool:
    """Check if the question is a yes/no type question."""
    q = question.lower() if question else ""
    yes_no_keywords = [
        "할까", "살까", "해야", "할지", "갈까", "볼까",
        "먹을까", "만날까", "시작할까", "그만둘까", "바꿀까"
    ]
    return any(kw in q for kw in yes_no_keywords)


def get_conclusion_instruction(question: str, is_korean: bool = True) -> str:
    """Get conclusion instruction based on question type."""
    if is_yes_no_question(question):
        return '마지막에 반드시 "결론: [질문에 대한 직접적인 답]" 형식으로 답하세요. 예: "결론: 지금은 하지 마라", "결론: 해도 좋다"'
    else:
        return '마지막에 "결론:" 으로 시작하는 핵심 메시지를 제시하세요.'
