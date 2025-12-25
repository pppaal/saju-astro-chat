"""
Tarot Reading API Routes
Card interpretation, chat, streaming responses, and topic detection.
Extracted from app.py for better maintainability.
"""
import json
import logging
import os
import re
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Dict, Tuple

from flask import Blueprint, request, jsonify, Response, g

logger = logging.getLogger(__name__)

# Blueprint definition
tarot_bp = Blueprint('tarot', __name__, url_prefix='/api/tarot')

# ===============================================================
# Lazy-loaded dependencies (to avoid circular imports)
# ===============================================================
_tarot_hybrid_rag_module = None
_corpus_rag_module = None
_fusion_generate_module = None
_openai_client = None


def _get_tarot_hybrid_rag():
    """Lazy load tarot_hybrid_rag module."""
    global _tarot_hybrid_rag_module
    if _tarot_hybrid_rag_module is None:
        try:
            from backend_ai.app import tarot_hybrid_rag as _thr
            _tarot_hybrid_rag_module = _thr
        except ImportError:
            try:
                from .. import tarot_hybrid_rag as _thr
                _tarot_hybrid_rag_module = _thr
            except ImportError as e:
                logger.warning(f"[TAROT] Could not import tarot_hybrid_rag: {e}")
                return None
    return _tarot_hybrid_rag_module


def get_tarot_hybrid_rag():
    """Get tarot hybrid RAG instance."""
    mod = _get_tarot_hybrid_rag()
    if mod is None:
        return None
    return mod.get_tarot_rag()


def _get_corpus_rag():
    """Lazy load corpus_rag module."""
    global _corpus_rag_module
    if _corpus_rag_module is None:
        try:
            from backend_ai.app import corpus_rag as _cr
            _corpus_rag_module = _cr
        except ImportError:
            try:
                from .. import corpus_rag as _cr
                _corpus_rag_module = _cr
            except ImportError:
                return None
    return _corpus_rag_module


def get_corpus_rag():
    """Get corpus RAG instance."""
    mod = _get_corpus_rag()
    if mod is None:
        return None
    return mod.get_corpus_rag()


def _get_fusion_generate():
    """Lazy load fusion_generate module."""
    global _fusion_generate_module
    if _fusion_generate_module is None:
        try:
            from backend_ai.model import fusion_generate as _fg
            _fusion_generate_module = _fg
        except ImportError:
            from ...model import fusion_generate as _fg
            _fusion_generate_module = _fg
    return _fusion_generate_module


def _generate_with_gpt4(*args, **kwargs):
    """Lazy wrapper for GPT-4 generation."""
    return _get_fusion_generate()._generate_with_gpt4(*args, **kwargs)


def _get_openai_client():
    """Get OpenAI client for streaming."""
    global _openai_client
    if _openai_client is None:
        try:
            from openai import OpenAI
            _openai_client = OpenAI()
        except Exception:
            return None
    return _openai_client


def _is_openai_available():
    """Check if OpenAI is available."""
    return _get_openai_client() is not None


# ===============================================================
# Lazy-loaded shared utilities
# ===============================================================
_redis_cache_module = None
_sanitizer_module = None


def _get_redis_cache():
    """Lazy load redis_cache module."""
    global _redis_cache_module
    if _redis_cache_module is None:
        try:
            from backend_ai.app import redis_cache as _rc
            _redis_cache_module = _rc
        except ImportError:
            from .. import redis_cache as _rc
            _redis_cache_module = _rc
    return _redis_cache_module


def get_cache():
    """Get cache instance."""
    return _get_redis_cache().get_cache()


def _get_sanitizer():
    """Lazy load sanitizer module."""
    global _sanitizer_module
    if _sanitizer_module is None:
        try:
            from backend_ai.app import sanitizer as _s
            _sanitizer_module = _s
        except ImportError:
            from .. import sanitizer as _s
            _sanitizer_module = _s
    return _sanitizer_module


def sanitize_user_input(text, max_length=2000):
    """Sanitize user input."""
    return _get_sanitizer().sanitize_user_input(text, max_length=max_length)


def is_suspicious_input(text):
    """Check if input is suspicious."""
    return _get_sanitizer().is_suspicious_input(text)


def sanitize_messages(messages: list, max_content_length: int = 2000) -> list:
    """Sanitize a list of messages."""
    sanitized = []
    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if isinstance(content, str):
            content = sanitize_user_input(content, max_length=max_content_length)
        sanitized.append({"role": role, "content": content})
    return sanitized


# ===============================================================
# THEME MAPPING CONSTANTS
# ===============================================================

# Theme mapping: Frontend IDs → Backend theme names
TAROT_THEME_MAPPING = {
    # Direct matches
    "love": "love",
    "career": "career",
    "health": "health",
    "spiritual": "spiritual",
    "daily": "daily",
    "monthly": "monthly",
    "life_path": "life_path",
    "family": "family",

    # Frontend uses hyphens, backend uses underscores/different names
    "love-relationships": "love",
    "career-work": "career",
    "money-finance": "wealth",
    "well-being-health": "health",
    "spiritual-growth": "spiritual",
    "daily-reading": "daily",
    "general-insight": "life_path",
    "decisions-crossroads": "life_path",
    "self-discovery": "life_path",
}

# Sub-topic mapping for themes that use different sub_topic names
TAROT_SUBTOPIC_MAPPING = {
    # decisions-crossroads spreads → life_path sub_topics
    ("decisions-crossroads", "simple-choice"): ("life_path", "crossroads"),
    ("decisions-crossroads", "decision-cross"): ("life_path", "major_decision"),
    ("decisions-crossroads", "path-ahead"): ("life_path", "life_direction"),

    # self-discovery spreads → life_path sub_topics
    ("self-discovery", "inner-self"): ("life_path", "true_self"),
    ("self-discovery", "personal-growth"): ("life_path", "life_lessons"),

    # general-insight spreads → various themes
    ("general-insight", "quick-reading"): ("daily", "one_card"),
    ("general-insight", "past-present-future"): ("daily", "three_card"),
    ("general-insight", "celtic-cross"): ("life_path", "life_direction"),
}


def _map_tarot_theme(category: str, spread_id: str, user_question: str = "") -> Tuple[str, str]:
    """Map frontend theme/spread to backend theme/sub_topic, considering user's question"""
    # Check specific mapping first
    key = (category, spread_id)
    if key in TAROT_SUBTOPIC_MAPPING:
        return TAROT_SUBTOPIC_MAPPING[key]

    # Fall back to theme-only mapping
    mapped_theme = TAROT_THEME_MAPPING.get(category, category)

    # Dynamic sub_topic selection based on user question keywords
    if user_question and mapped_theme == "career":
        q = user_question.lower()
        if any(kw in q for kw in ["사업", "창업", "자영업", "business", "startup", "entrepreneur"]):
            return (mapped_theme, "entrepreneurship")
        elif any(kw in q for kw in ["취업", "취직", "입사", "job", "employment", "hire"]):
            return (mapped_theme, "job_search")
        elif any(kw in q for kw in ["이직", "퇴사", "전직", "resign", "quit", "change job"]):
            return (mapped_theme, "career_change")
        elif any(kw in q for kw in ["승진", "promotion", "raise"]):
            return (mapped_theme, "promotion")
        elif any(kw in q for kw in ["직장", "회사", "상사", "동료", "workplace", "boss", "colleague"]):
            return (mapped_theme, "workplace")

    elif user_question and mapped_theme == "love":
        q = user_question.lower()
        if any(kw in q for kw in ["짝사랑", "고백", "crush", "confess"]):
            return (mapped_theme, "crush")
        elif any(kw in q for kw in ["헤어", "이별", "breakup", "separate"]):
            return (mapped_theme, "breakup")
        elif any(kw in q for kw in ["결혼", "약혼", "marriage", "wedding"]):
            return (mapped_theme, "marriage")
        elif any(kw in q for kw in ["재회", "다시", "reconcile", "ex"]):
            return (mapped_theme, "reconciliation")
        elif any(kw in q for kw in ["만남", "소개팅", "dating", "meet"]):
            return (mapped_theme, "new_love")

    elif user_question and mapped_theme == "wealth":
        q = user_question.lower()
        if any(kw in q for kw in ["투자", "주식", "코인", "invest", "stock", "crypto"]):
            return (mapped_theme, "investment")
        elif any(kw in q for kw in ["빚", "대출", "부채", "debt", "loan"]):
            return (mapped_theme, "debt")
        elif any(kw in q for kw in ["저축", "절약", "save", "saving"]):
            return (mapped_theme, "saving")

    return (mapped_theme, spread_id)


# ===============================================================
# AI PHRASE CLEANING
# ===============================================================

def _clean_ai_phrases(text: str) -> str:
    """
    Remove AI-sounding phrases from tarot interpretations.
    Makes output more natural and less robotic.
    """
    # AI 특유의 한국어 표현 패턴
    ai_patterns_ko = [
        (r'~하시는군요\.?', ''),
        (r'~느끼실 수 있어요\.?', ''),
        (r'~하시면 좋을 것 같습니다\.?', ''),
        (r'~해보시는 건 어떨까요\?', ''),
        (r'긍정적인 에너지가 느껴지네요\.?', ''),
        (r'좋은 결과가 있을 거예요\.?', ''),
        (r'잘 될 거예요\.?', ''),
        (r'걱정하지 마세요\.?', ''),
        (r'자신감을 가지시면 좋겠습니다\.?', ''),
        (r'~을 나타냅니다\.', '다.'),
        (r'~을 보여주고 있습니다\.', '다.'),
        (r'~라고 할 수 있습니다\.', '다.'),
        (r'희망적인 메시지를 전하고 있네요\.?', ''),
        (r'응원합니다\.?', ''),
        (r'파이팅이에요\.?', ''),
        (r'화이팅!?', ''),
    ]

    # AI 특유의 영어 표현 패턴
    ai_patterns_en = [
        (r'I hope this helps\.?', ''),
        (r'Feel free to ask.*', ''),
        (r'I\'m here to help\.?', ''),
        (r'This suggests that you should\.?', 'This suggests'),
        (r'It\'s important to remember that\.?', ''),
        (r'positive energy', 'energy'),
    ]

    result = text
    for pattern, replacement in ai_patterns_ko + ai_patterns_en:
        result = re.sub(pattern, replacement, result)

    # 연속된 공백/마침표 정리
    result = re.sub(r'\s+', ' ', result)
    result = re.sub(r'\.+', '.', result)
    result = result.strip()

    return result


# ===============================================================
# DYNAMIC FOLLOW-UP QUESTIONS GENERATOR
# ===============================================================

def generate_dynamic_followup_questions(
    interpretation: str,
    cards: list,
    category: str,
    user_question: str = "",
    language: str = "ko",
    static_questions: list = None
) -> list:
    """
    Generate dynamic, contextual follow-up questions based on the interpretation.
    """
    try:
        interpretation_preview = interpretation[:800] if len(interpretation) > 800 else interpretation
        card_names = [f"{c.get('name', '')}{'(역방향)' if c.get('isReversed') else ''}" for c in cards]
        cards_str = ", ".join(card_names)

        # Detect reading tone from interpretation
        positive_keywords = ["기회", "성공", "행운", "긍정", "발전", "희망", "사랑", "축복", "성취", "기쁨",
                           "opportunity", "success", "luck", "positive", "growth", "hope", "love", "blessing", "joy"]
        challenging_keywords = ["주의", "경고", "위험", "도전", "갈등", "어려움", "장애", "시련", "조심",
                               "caution", "warning", "danger", "challenge", "conflict", "difficulty", "obstacle"]

        tone = "neutral"
        positive_count = sum(1 for k in positive_keywords if k in interpretation.lower())
        challenging_count = sum(1 for k in challenging_keywords if k in interpretation.lower())

        if positive_count > challenging_count + 2:
            tone = "positive"
        elif challenging_count > positive_count + 2:
            tone = "challenging"

        is_korean = language == "ko"

        if is_korean:
            prompt = f"""당신은 전문 타로 리더입니다. 방금 제공된 타로 해석을 바탕으로, 사용자가 더 깊이 탐구하고 싶어할 만한 후속 질문 5개를 생성하세요.

## 해석 요약
카드: {cards_str}
카테고리: {category}
리딩 톤: {tone}
{'원래 질문: ' + user_question if user_question else ''}

## 해석 내용
{interpretation_preview}

## 질문 생성 지침
1. 해석에서 언급된 구체적인 내용/상징/조언에 기반한 질문
2. 사용자가 "와, 이걸 더 알고 싶다!" 라고 느낄 만큼 흥미로운 질문
3. 단순 예/아니오가 아닌, 깊이 있는 대화를 유도하는 질문
4. 카드 이름이나 상징을 구체적으로 언급
5. 각 질문은 서로 다른 관점 제시 (시기, 조언, 숨겨진 의미, 관계, 행동)

## 응답 형식
질문 5개를 줄바꿈으로 구분해서 작성하세요. 번호나 불릿 없이 질문만 작성.

예시:
{card_names[0] if card_names else '광대'} 카드가 암시하는 새로운 시작의 구체적인 타이밍은?
이 리딩에서 경고하는 숨겨진 장애물을 극복하는 방법은?"""
        else:
            prompt = f"""You are an expert tarot reader. Based on the tarot interpretation just provided, generate 5 follow-up questions the user would want to explore deeper.

## Reading Summary
Cards: {cards_str}
Category: {category}
Reading Tone: {tone}
{'Original Question: ' + user_question if user_question else ''}

## Interpretation
{interpretation_preview}

## Question Guidelines
1. Based on specific content/symbols/advice mentioned in the interpretation
2. Intriguing enough that user thinks "I want to know more about this!"
3. Open-ended questions that lead to deeper conversation
4. Specifically mention card names or symbols
5. Each question offers a different perspective (timing, advice, hidden meaning, relationships, actions)

## Response Format
Write 5 questions separated by newlines. No numbers or bullets, just questions.

Example:
What specific timing does {card_names[0] if card_names else 'The Fool'} suggest for this new beginning?
How can I overcome the hidden obstacles this reading warns about?"""

        response = _generate_with_gpt4(prompt, max_tokens=500, temperature=0.8, use_mini=True)

        questions = [q.strip() for q in response.strip().split('\n') if q.strip() and len(q.strip()) > 10]

        if len(questions) >= 5:
            return questions[:5]
        elif len(questions) > 0:
            if static_questions:
                remaining = 5 - len(questions)
                questions.extend(static_questions[:remaining])
            return questions[:5]
        else:
            return static_questions[:5] if static_questions else []

    except Exception as e:
        logger.warning(f"[TAROT] Dynamic question generation failed: {e}")
        return static_questions[:5] if static_questions else []


# ===============================================================
# TOPIC DETECTION
# ===============================================================

_TAROT_TOPIC_KEYWORDS = {
    "career": {
        "job_search": {
            "keywords": ["취업", "구직", "일자리", "직장 구하", "취직", "입사", "신입", "첫 직장", "job", "employment"],
            "korean": "취업은 언제",
            "priority": 10
        },
        "interview": {
            "keywords": ["면접", "인터뷰", "합격", "불합격", "서류", "채용", "interview"],
            "korean": "면접 결과",
            "priority": 9
        },
        "job_change": {
            "keywords": ["이직", "퇴사", "직장 옮기", "회사 바꾸", "전직", "새 직장", "career change"],
            "korean": "이직해야 할까",
            "priority": 10
        },
        "promotion": {
            "keywords": ["승진", "진급", "승급", "임원", "팀장", "과장", "부장", "promotion"],
            "korean": "승진 가능성",
            "priority": 8
        },
        "business": {
            "keywords": ["사업", "창업", "스타트업", "자영업", "개업", "사장", "CEO", "business", "startup"],
            "korean": "사업 시작/확장",
            "priority": 9
        },
        "side_hustle": {
            "keywords": ["부업", "투잡", "알바", "아르바이트", "부수입", "side job"],
            "korean": "부업/투잡",
            "priority": 7
        },
        "career_path": {
            "keywords": ["진로", "적성", "어떤 직업", "무슨 일", "적합한 직업", "맞는 직업", "career path", "aptitude"],
            "korean": "나에게 맞는 직업",
            "priority": 8
        },
        "workplace": {
            "keywords": ["직장 생활", "회사 생활", "동료", "상사", "직장 내", "사내", "workplace"],
            "korean": "직장 내 관계/상황",
            "priority": 6
        },
        "salary": {
            "keywords": ["연봉", "급여", "월급", "임금", "돈", "인상", "협상", "salary"],
            "korean": "연봉 협상/인상",
            "priority": 7
        },
        "project": {
            "keywords": ["프로젝트", "업무", "과제", "일 잘", "성과", "project"],
            "korean": "프로젝트 성공",
            "priority": 6
        }
    },
    "love": {
        "secret_admirer": {
            "keywords": ["나를 좋아하는", "날 좋아하는", "관심 있는 사람", "누가 좋아", "secret admirer"],
            "korean": "나를 좋아하는 인연",
            "priority": 8
        },
        "current_partner": {
            "keywords": ["연인", "남친", "여친", "남자친구", "여자친구", "애인", "partner"],
            "korean": "지금 연인의 속마음",
            "priority": 9
        },
        "crush": {
            "keywords": ["짝사랑", "좋아하는 사람", "마음에 드는", "고백", "crush"],
            "korean": "짝사랑 상대의 마음",
            "priority": 8
        },
        "reconciliation": {
            "keywords": ["재회", "다시 만나", "헤어진", "전 남친", "전 여친", "돌아올", "reconciliation", "ex"],
            "korean": "헤어진 연인과의 재회",
            "priority": 9
        },
        "situationship": {
            "keywords": ["썸", "썸타는", "밀당", "관계 진전", "situationship"],
            "korean": "썸타는 상대",
            "priority": 8
        },
        "marriage": {
            "keywords": ["결혼", "결혼운", "배우자", "신랑", "신부", "혼인", "웨딩", "marriage", "wedding"],
            "korean": "결혼운",
            "priority": 10
        },
        "breakup": {
            "keywords": ["이별", "헤어질", "헤어져야", "끝내야", "그만 만나", "breakup"],
            "korean": "이별해야 할까",
            "priority": 9
        },
        "new_love": {
            "keywords": ["새로운 인연", "새 사랑", "언제 연애", "인연이 언제", "new love"],
            "korean": "새로운 사랑은 언제",
            "priority": 8
        },
        "cheating": {
            "keywords": ["바람", "외도", "불륜", "양다리", "cheating", "affair", "바람피"],
            "korean": "상대가 바람피우는지",
            "priority": 11
        },
        "soulmate": {
            "keywords": ["소울메이트", "운명", "진정한 사랑", "soulmate", "destiny"],
            "korean": "소울메이트 리딩",
            "priority": 7
        }
    },
    "wealth": {
        "money_luck": {
            "keywords": ["재물운", "금전운", "돈 운", "부자", "wealth", "money luck"],
            "korean": "재물운",
            "priority": 9
        },
        "investment": {
            "keywords": ["투자", "주식", "코인", "부동산", "펀드", "investment", "stock"],
            "korean": "투자 결정",
            "priority": 9
        },
        "debt": {
            "keywords": ["빚", "대출", "부채", "갚", "loan", "debt"],
            "korean": "빚/대출",
            "priority": 8
        },
        "windfall": {
            "keywords": ["복권", "로또", "횡재", "lottery", "windfall"],
            "korean": "횡재운",
            "priority": 7
        }
    },
    "health": {
        "general_health": {
            "keywords": ["건강", "건강운", "몸", "아프", "병", "health"],
            "korean": "건강운",
            "priority": 9
        },
        "mental_health": {
            "keywords": ["정신 건강", "스트레스", "우울", "불안", "mental health"],
            "korean": "정신 건강",
            "priority": 8
        },
        "recovery": {
            "keywords": ["회복", "치료", "완치", "recovery"],
            "korean": "회복",
            "priority": 8
        }
    },
    "family": {
        "parent": {
            "keywords": ["부모", "엄마", "아빠", "어머니", "아버지", "parent"],
            "korean": "부모님과의 관계",
            "priority": 8
        },
        "children": {
            "keywords": ["자녀", "아이", "아들", "딸", "임신", "children", "pregnancy"],
            "korean": "자녀운",
            "priority": 9
        },
        "sibling": {
            "keywords": ["형제", "자매", "오빠", "언니", "동생", "sibling"],
            "korean": "형제/자매 관계",
            "priority": 7
        }
    },
    "spiritual": {
        "life_purpose": {
            "keywords": ["삶의 목적", "인생의 의미", "왜 사는", "purpose"],
            "korean": "삶의 목적",
            "priority": 8
        },
        "karma": {
            "keywords": ["전생", "카르마", "업", "karma", "past life"],
            "korean": "전생/카르마",
            "priority": 7
        },
        "spiritual_growth": {
            "keywords": ["영적 성장", "깨달음", "명상", "spiritual"],
            "korean": "영적 성장",
            "priority": 7
        }
    },
    "life_path": {
        "general": {
            "keywords": ["인생", "앞으로", "미래", "운세", "전반적", "life", "future"],
            "korean": "인생 전반",
            "priority": 5
        },
        "decision": {
            "keywords": ["결정", "선택", "어떻게 해야", "뭘 해야", "decision"],
            "korean": "결정/선택",
            "priority": 6
        }
    }
}

_SPREAD_CONFIG_CACHE: Dict[str, dict] = {}


def _load_spread_config(theme: str) -> dict:
    """Load and cache spread configuration for a theme."""
    if theme in _SPREAD_CONFIG_CACHE:
        return _SPREAD_CONFIG_CACHE[theme]

    spread_file = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "data", "graph", "rules", "tarot", "spreads",
        f"{theme}_spreads.json"
    )

    try:
        if os.path.exists(spread_file):
            with open(spread_file, "r", encoding="utf-8") as f:
                _SPREAD_CONFIG_CACHE[theme] = json.load(f)
                return _SPREAD_CONFIG_CACHE[theme]
    except Exception as e:
        logger.warning(f"Could not load spread file {spread_file}: {e}")

    return {}


def detect_tarot_topic(text: str) -> dict:
    """Analyze chat text and detect the most relevant tarot theme and sub-topic."""
    text_lower = text.lower()

    all_matches = []

    for theme, sub_topics in _TAROT_TOPIC_KEYWORDS.items():
        for sub_topic_id, sub_topic_data in sub_topics.items():
            matched = []
            for keyword in sub_topic_data["keywords"]:
                if keyword.lower() in text_lower or keyword in text:
                    matched.append(keyword)

            if matched:
                priority_score = sub_topic_data["priority"] * 0.1
                match_score = len(matched) * 0.2
                avg_keyword_len = sum(len(k) for k in matched) / len(matched)
                specificity_bonus = min(avg_keyword_len * 0.02, 0.2)

                raw_score = priority_score + match_score + specificity_bonus

                all_matches.append({
                    "theme": theme,
                    "sub_topic": sub_topic_id,
                    "korean": sub_topic_data["korean"],
                    "confidence": round(min(raw_score, 1.0), 2),
                    "_raw_score": raw_score,
                    "_priority": sub_topic_data["priority"],
                    "matched_keywords": matched,
                })

    all_matches.sort(key=lambda x: (x["_raw_score"], x["_priority"]), reverse=True)

    if all_matches:
        best_match = all_matches[0]
        del best_match["_raw_score"]
        del best_match["_priority"]
    else:
        best_match = {
            "theme": "life_path",
            "sub_topic": "general",
            "korean": "인생 전반",
            "confidence": 0.0,
            "matched_keywords": []
        }

    spread_data = _load_spread_config(best_match["theme"])
    sub_topic_config = spread_data.get("sub_topics", {}).get(best_match["sub_topic"], {})

    best_match["card_count"] = sub_topic_config.get("card_count", 3)
    best_match["spread_name"] = sub_topic_config.get("spread_name", "")
    best_match["positions"] = sub_topic_config.get("positions", [])

    return best_match


# ===============================================================
# CHECK MODULE AVAILABILITY
# ===============================================================

def _has_tarot():
    """Check if tarot module is available."""
    return get_tarot_hybrid_rag() is not None


def _has_corpus_rag():
    """Check if corpus RAG is available."""
    return get_corpus_rag() is not None


# ===============================================================
# ROUTE HANDLERS
# ===============================================================

@tarot_bp.route('/interpret', methods=['POST'])
def tarot_interpret():
    """
    Premium tarot interpretation using Hybrid RAG + GPT.
    Supports optional saju/astrology context for enhanced readings.
    With caching for same card combinations.
    """
    if not _has_tarot():
        return jsonify({"status": "error", "message": "Tarot module not available"}), 501

    try:
        data = request.get_json(force=True)
        logger.info(f"[TAROT] id={getattr(g, 'request_id', 'N/A')} Interpreting tarot reading")

        category = data.get("category", "general")
        spread_id = data.get("spread_id", "three_card")
        spread_title = data.get("spread_title", "Three Card Spread")
        cards = data.get("cards", [])
        raw_question = data.get("user_question", "")
        language = data.get("language", "ko")

        # Input validation
        if is_suspicious_input(raw_question):
            logger.warning(f"[TAROT] Suspicious input detected")
        user_question = sanitize_user_input(raw_question, max_length=500)

        # Optional context
        saju_context = data.get("saju_context")
        astro_context = data.get("astro_context")
        birthdate = data.get("birthdate")
        moon_phase = data.get("moon_phase")

        if not cards:
            return jsonify({"status": "error", "message": "No cards provided"}), 400

        start_time = time.time()

        # === CACHING ===
        card_key = "_".join(sorted([
            f"{c.get('name', '')}{'_R' if c.get('is_reversed') else ''}"
            for c in cards
        ]))
        cache_key = f"tarot:interpret:{category}:{spread_id}:{language}:{card_key}"

        use_cache = not user_question and not birthdate and not saju_context and not astro_context
        cache = get_cache()

        if use_cache and cache:
            cached_result = cache.get(cache_key)
            if cached_result:
                duration_ms = int((time.time() - start_time) * 1000)
                logger.info(f"[TAROT] id={getattr(g, 'request_id', 'N/A')} CACHE HIT in {duration_ms}ms")
                cached_result["cached"] = True
                cached_result["performance"] = {"duration_ms": duration_ms, "cache_hit": True}
                return jsonify(cached_result)

        hybrid_rag = get_tarot_hybrid_rag()

        # Convert cards to expected format
        drawn_cards = [
            {"name": c.get("name", ""), "isReversed": c.get("is_reversed", False)}
            for c in cards
        ]

        # Build enhanced context if saju/astro data is available
        enhanced_question = user_question
        if saju_context or astro_context:
            context_parts = []
            if saju_context:
                day_master = saju_context.get("day_master", {})
                if day_master:
                    context_parts.append(f"일간: {day_master.get('element', '')} {day_master.get('stem', '')}")
                five_elements = saju_context.get("five_elements", {})
                if five_elements:
                    dominant = max(five_elements.items(), key=lambda x: x[1])[0] if five_elements else None
                    if dominant:
                        context_parts.append(f"주요 오행: {dominant}")

            if astro_context:
                sun_sign = astro_context.get("sun_sign", "")
                moon_sign = astro_context.get("moon_sign", "")
                if sun_sign:
                    context_parts.append(f"태양 별자리: {sun_sign}")
                if moon_sign:
                    context_parts.append(f"달 별자리: {moon_sign}")

            if context_parts:
                enhanced_question = f"[배경: {', '.join(context_parts)}] {user_question}"

        # Map theme/spread
        mapped_theme, mapped_spread = _map_tarot_theme(category, spread_id, user_question)
        logger.info(f"[TAROT] Mapped {category}/{spread_id} → {mapped_theme}/{mapped_spread}")

        # === PARALLEL PROCESSING ===
        def build_rag_context():
            if birthdate:
                return hybrid_rag.build_premium_reading_context(
                    theme=mapped_theme,
                    sub_topic=mapped_spread,
                    drawn_cards=drawn_cards,
                    question=enhanced_question,
                    birthdate=birthdate,
                    moon_phase=moon_phase
                )
            else:
                return hybrid_rag.build_reading_context(
                    theme=mapped_theme,
                    sub_topic=mapped_spread,
                    drawn_cards=drawn_cards,
                    question=enhanced_question
                )

        def build_advanced_analysis():
            return hybrid_rag.get_advanced_analysis(drawn_cards)

        with ThreadPoolExecutor(max_workers=2) as executor:
            rag_future = executor.submit(build_rag_context)
            advanced_future = executor.submit(build_advanced_analysis)
            rag_context = rag_future.result()
            advanced = advanced_future.result()

        # Build prompt
        is_korean = language == "ko"
        cards_str = ", ".join([
            f"{c.get('name', '')}{'(역방향)' if c.get('isReversed') else ''}"
            for c in drawn_cards
        ])

        now = datetime.now()
        weekday_names_ko = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"]

        if is_korean:
            date_str = f"{now.year}년 {now.month}월 {now.day}일 ({weekday_names_ko[now.weekday()]})"
            season = "봄" if now.month in [3, 4, 5] else "여름" if now.month in [6, 7, 8] else "가을" if now.month in [9, 10, 11] else "겨울"
        else:
            date_str = now.strftime("%B %d, %Y (%A)")
            season = "Spring" if now.month in [3, 4, 5] else "Summer" if now.month in [6, 7, 8] else "Fall" if now.month in [9, 10, 11] else "Winter"

        # Detect question intent
        question_context = ""
        if user_question:
            q = user_question.lower()
            if mapped_spread == "entrepreneurship" or any(kw in q for kw in ["사업", "창업", "business"]):
                question_context = "질문자는 사업/창업에 대해 묻고 있습니다. 사업 시작 시기, 성공 가능성, 주의점 위주로 해석하세요."
            elif mapped_spread == "job_search" or any(kw in q for kw in ["취업", "취직", "job"]):
                question_context = "질문자는 취업에 대해 묻고 있습니다. 합격 가능성, 준비 방향, 시기 위주로 해석하세요."
            elif mapped_spread == "career_change" or any(kw in q for kw in ["이직", "퇴사"]):
                question_context = "질문자는 이직/퇴사를 고민 중입니다. 현 직장 vs 새 직장, 시기, 리스크 위주로 해석하세요."
            elif any(kw in q for kw in ["vs", "아니면", "할까요", "or"]):
                question_context = "질문자는 양자택일 상황입니다. 각 선택지의 장단점과 카드가 어느 쪽을 가리키는지 명확히 해석하세요."

        tarot_prompt = f"""당신은 10년 경력의 타로 리더입니다. 카드 상징과 이미지를 직관적으로 읽어내며, 질문자의 상황에 맞는 실질적인 통찰을 전달합니다.

## 오늘: {date_str} ({season})

## 리딩 정보
카테고리: {category}
스프레드: {spread_title}
카드: {cards_str}

## ⭐ 질문자의 질문 (반드시 이 질문에 직접 답하세요)
"{enhanced_question or '일반 운세'}"
{question_context}

## 카드 컨텍스트
{rag_context}

## 좋은 해석 예시
"탑 카드가 첫 위치에 나왔다. 번개가 왕관을 치고 두 사람이 추락하는 그림—지금 뭔가가 무너지고 있거나, 곧 무너질 것이다. 하지만 두 번째 위치의 별 카드를 보라. 폭풍 후 벌거벗은 여인이 물을 붓고 있다. 무너진 후에 치유가 온다. 세 번째 황제 카드는 그 잔해 위에 새로운 질서를 세우라고 한다. 지금 무너지는 게 뭐든, 그건 이미 금이 가 있었다."

## 피해야 할 AI스러운 해석
"이 카드는 변화를 나타내며, 새로운 시작의 가능성을 보여주고 있습니다. 긍정적인 에너지가 느껴지네요. 자신감을 가지고 앞으로 나아가시면 좋을 것 같습니다."

## 해석 방향
- 질문에 직접 답변 (취업 vs 사업이면 어느 쪽이 유리한지, 시기는 언제인지 등)
- 카드 이미지의 상징을 구체적으로 언급
- 위치별 카드가 서로 어떤 이야기를 만들어내는지 연결
- 막연한 격려 대신 구체적인 상황 해석
- {('자연스러운 한국어' if is_korean else 'Natural English')}
- 500-700자"""

        # Generate with GPT-4o-mini
        try:
            reading_text = _generate_with_gpt4(tarot_prompt, max_tokens=1200, temperature=0.8, use_mini=True)
            reading_text = _clean_ai_phrases(reading_text)
        except Exception as llm_e:
            logger.warning(f"[TAROT] GPT-4o-mini failed: {llm_e}, using fallback")
            reading_text = f"카드 해석: {cards_str}. {rag_context[:500]}"

        # Get card insights
        card_insights = []
        for i, card in enumerate(drawn_cards):
            card_name = card.get("name", "")
            is_reversed = card.get("isReversed", False)
            position = cards[i].get("position", f"Card {i+1}") if i < len(cards) else f"Card {i+1}"

            insights = hybrid_rag.get_card_insights(card_name)

            card_insight = {
                "position": position,
                "card_name": card_name,
                "is_reversed": is_reversed,
                "interpretation": reading_text[:300] if i == 0 else "",
                "spirit_animal": insights.get("spirit_animal"),
                "chakra": None,
                "element": None,
                "shadow": insights.get("shadow_work")
            }

            chakras = insights.get("chakras", [])
            if chakras:
                first_chakra = chakras[0]
                card_insight["chakra"] = {
                    "name": first_chakra.get("korean", first_chakra.get("name", "")),
                    "color": first_chakra.get("color", "#8a2be2"),
                    "guidance": first_chakra.get("healing_affirmation", "")
                }

            astro = insights.get("astrology", {})
            if astro:
                card_insight["element"] = astro.get("element")

            card_insights.append(card_insight)

        # Build response
        static_followup = hybrid_rag.advanced_rules.get_followup_questions(category, "neutral") if hasattr(hybrid_rag, 'advanced_rules') else []

        dynamic_followup = generate_dynamic_followup_questions(
            interpretation=reading_text,
            cards=drawn_cards,
            category=category,
            user_question=enhanced_question or user_question or "",
            language=language,
            static_questions=static_followup
        )

        result = {
            "overall_message": reading_text,
            "card_insights": card_insights,
            "guidance": advanced.get("elemental_analysis", {}).get("dominant_advice", "카드의 지혜에 귀 기울이세요."),
            "affirmation": "나는 우주의 지혜를 신뢰합니다.",
            "combinations": [],
            "followup_questions": dynamic_followup
        }

        combo = advanced.get("special_combination")
        if combo:
            result["combinations"].append({
                "cards": combo.get("cards", []),
                "meaning": combo.get("korean", combo.get("meaning", ""))
            })

        # Add premium personalization if birthdate provided
        if birthdate:
            try:
                birth_card = hybrid_rag.get_birth_card(birthdate)
                year_card = hybrid_rag.get_year_card(birthdate)
                personalization = hybrid_rag.get_personalized_reading(drawn_cards, birthdate)
                narrative = hybrid_rag.get_reading_narrative(drawn_cards, mapped_theme)

                result["personalization"] = {
                    "birth_card": {
                        "name": birth_card.get("primary_card"),
                        "korean": birth_card.get("korean"),
                        "traits": birth_card.get("traits", [])
                    },
                    "year_card": {
                        "name": year_card.get("year_card"),
                        "korean": year_card.get("year_card_korean"),
                        "theme": year_card.get("korean"),
                        "advice": year_card.get("advice")
                    },
                    "personal_connections": personalization.get("personal_connections", [])
                }

                result["narrative"] = {
                    "opening_hook": narrative.get("opening_hook"),
                    "tone": narrative.get("tone", {}).get("mood"),
                    "resolution": narrative.get("resolution"),
                    "card_connections": hybrid_rag.get_card_connections(drawn_cards)[:5]
                }
            except Exception as pers_e:
                logger.warning(f"[TAROT] Personalization failed: {pers_e}")

        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(f"[TAROT] id={getattr(g, 'request_id', 'N/A')} completed in {duration_ms}ms")
        result["performance"] = {"duration_ms": duration_ms, "cache_hit": False}

        # Cache result
        if use_cache and cache:
            try:
                cache.set(cache_key, result, ttl=3600)
                logger.info(f"[TAROT] Cached result for key: {cache_key[:50]}...")
            except Exception as cache_err:
                logger.warning(f"[TAROT] Failed to cache: {cache_err}")

        return jsonify(result)

    except Exception as e:
        logger.exception(f"[ERROR] /api/tarot/interpret failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@tarot_bp.route('/prefetch', methods=['POST'])
def tarot_prefetch():
    """
    Prefetch RAG context while user is selecting cards.
    """
    if not _has_tarot():
        return jsonify({"status": "error", "message": "Tarot module not available"}), 501

    try:
        data = request.get_json(force=True)
        category = data.get("category", "general")
        spread_id = data.get("spread_id", "three_card")

        logger.info(f"[TAROT_PREFETCH] id={getattr(g, 'request_id', 'N/A')} Prefetching for {category}/{spread_id}")

        start_time = time.time()
        hybrid_rag = get_tarot_hybrid_rag()

        mapped_theme, mapped_spread = _map_tarot_theme(category, spread_id)

        try:
            hybrid_rag._ensure_loaded()

            if hasattr(hybrid_rag, 'advanced_rules'):
                hybrid_rag.advanced_rules.get_followup_questions(category, "neutral")

            duration_ms = int((time.time() - start_time) * 1000)
            logger.info(f"[TAROT_PREFETCH] Completed in {duration_ms}ms")

            return jsonify({
                "status": "ready",
                "category": category,
                "spread_id": spread_id,
                "mapped_theme": mapped_theme,
                "mapped_spread": mapped_spread,
                "duration_ms": duration_ms
            })

        except Exception as warm_e:
            logger.warning(f"[TAROT_PREFETCH] Warm-up failed: {warm_e}")
            return jsonify({
                "status": "partial",
                "message": str(warm_e)
            })

    except Exception as e:
        logger.exception(f"[ERROR] /api/tarot/prefetch failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@tarot_bp.route('/themes', methods=['GET'])
def tarot_themes():
    """Get available tarot themes and spreads."""
    if not _has_tarot():
        return jsonify({"status": "error", "message": "Tarot module not available"}), 501

    try:
        hybrid_rag = get_tarot_hybrid_rag()
        themes = hybrid_rag.get_available_themes()

        result = []
        for theme in themes:
            sub_topics = hybrid_rag.get_sub_topics(theme)
            result.append({
                "id": theme,
                "sub_topics": sub_topics
            })

        return jsonify({
            "status": "success",
            "themes": result
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/tarot/themes failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@tarot_bp.route('/search', methods=['GET'])
def tarot_search():
    """Semantic search across tarot knowledge."""
    if not _has_tarot():
        return jsonify({"status": "error", "message": "Tarot module not available"}), 501

    try:
        query = request.args.get("q", "")
        top_k = int(request.args.get("top_k", 5))
        category = request.args.get("category")

        hybrid_rag = get_tarot_hybrid_rag()
        results = hybrid_rag.search_advanced_rules(query, top_k=top_k, category=category)

        return jsonify({
            "status": "success",
            "results": results
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/tarot/search failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@tarot_bp.route('/detect-topic', methods=['POST'])
def tarot_detect_topic():
    """
    Detect tarot theme and sub-topic from chat conversation.
    """
    try:
        data = request.get_json(force=True)

        if "messages" in data:
            user_messages = [
                m.get("content", "")
                for m in data["messages"]
                if m.get("role") == "user"
            ]
            text = " ".join(user_messages[-3:])
        else:
            text = data.get("text", "")

        if not text:
            return jsonify({
                "status": "error",
                "message": "No text provided for analysis"
            }), 400

        detected = detect_tarot_topic(text)

        logger.info(f"[TAROT-DETECT] Detected {detected['theme']}/{detected['sub_topic']} "
                   f"(confidence: {detected['confidence']}) from: {text[:100]}...")

        return jsonify({
            "status": "success",
            "detected": detected
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/tarot/detect-topic failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# ===============================================================
# TAROT CHAT STREAM - RAG-Enhanced Streaming Response
# ===============================================================

@tarot_bp.route('/chat-stream', methods=['POST'])
def tarot_chat_stream():
    """
    Streaming tarot chat with RAG-enhanced context.
    Returns Server-Sent Events (SSE) for real-time text streaming.
    """
    from flask import Response, stream_with_context

    try:
        data = request.get_json(force=True)
        logger.info(f"[TAROT-CHAT] id={getattr(g, 'request_id', 'N/A')} Starting chat stream")

        messages = data.get("messages", [])
        context = data.get("context", {})
        language = data.get("language", "ko")
        counselor_id = data.get("counselor_id")
        counselor_style = data.get("counselor_style")

        # Sanitize messages
        messages = sanitize_messages(messages, max_content_length=2000)

        if not messages:
            return jsonify({"error": "No messages provided"}), 400

        # Extract card info from context
        cards = context.get("cards", [])
        spread_title = context.get("spread_title", "Tarot Reading")
        category = context.get("category", "general")
        overall_message = context.get("overall_message", "")
        guidance = context.get("guidance", "")

        # Get the latest user question
        user_messages = [m for m in messages if m.get("role") == "user"]
        latest_question = user_messages[-1].get("content", "") if user_messages else ""

        # Build card context string
        card_lines = []
        for i, card in enumerate(cards):
            pos = card.get("position", f"Card {i+1}")
            name = card.get("name", "Unknown")
            reversed_str = "(역방향)" if card.get("is_reversed") else "(정방향)"
            meaning = card.get("meaning", "")[:200]
            card_lines.append(f"- {pos}: {name} {reversed_str}\n  의미: {meaning}")
        cards_context = "\n".join(card_lines) if card_lines else "(카드 없음)"

        # Build RAG context if available
        rag_context = ""
        try:
            hybrid_rag = get_tarot_hybrid_rag()
            if hybrid_rag and cards:
                drawn_cards = [
                    {"name": c.get("name", ""), "isReversed": c.get("is_reversed", False)}
                    for c in cards
                ]
                mapped_theme, mapped_spread = _map_tarot_theme(category, spread_title, latest_question)
                rag_context = hybrid_rag.build_reading_context(
                    theme=mapped_theme,
                    sub_topic=mapped_spread,
                    drawn_cards=drawn_cards,
                    question=latest_question
                )
        except Exception as rag_err:
            logger.warning(f"[TAROT-CHAT] RAG context failed: {rag_err}")

        # Build system prompt
        is_korean = language == "ko"

        if is_korean:
            system_prompt = f"""너는 따뜻하고 통찰력 있는 타로 상담사다. 실제로 뽑힌 카드를 기반으로 질문에 답변해.

## 현재 스프레드: {spread_title} ({category})

## 뽑힌 카드들
{cards_context}

## RAG 컨텍스트 (참고용)
{rag_context[:1500] if rag_context else '(없음)'}

## 이전 해석 요약
{overall_message[:500] if overall_message else '(없음)'}

## 응답 지침
1) 질문에 직접 답변하되, 반드시 뽑힌 카드를 근거로 해석
2) 카드 이름과 위치를 명시하며 설명
3) 카드의 상징과 이미지를 구체적으로 언급
4) 실용적이고 구체적인 조언 제공
5) 150-250자 분량으로 간결하게 응답
6) AI스러운 표현(~하시면 좋을 것 같습니다, 긍정적인 에너지 등) 피하기"""
        else:
            system_prompt = f"""You are a warm and insightful tarot counselor. Answer questions based on the actual drawn cards.

## Current Spread: {spread_title} ({category})

## Drawn Cards
{cards_context}

## RAG Context (Reference)
{rag_context[:1500] if rag_context else '(none)'}

## Previous Interpretation Summary
{overall_message[:500] if overall_message else '(none)'}

## Response Guidelines
1) Answer directly, always grounding in the drawn cards
2) Mention card names and positions explicitly
3) Reference specific card symbolism and imagery
4) Provide practical, actionable advice
5) Keep response concise (150-250 words)
6) Avoid AI-sounding phrases"""

        # Add counselor style if specified
        if counselor_style:
            system_prompt += f"\n\n## 상담사 스타일: {counselor_style}"

        # Prepare messages for OpenAI
        openai_messages = [{"role": "system", "content": system_prompt}]

        # Add conversation history (last 10 messages)
        for msg in messages[-10:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role in ["user", "assistant"] and content:
                openai_messages.append({"role": role, "content": content})

        def generate_stream():
            """Generator for SSE streaming."""
            try:
                client = _get_openai_client()
                if not client:
                    yield f"data: {json.dumps({'error': 'OpenAI client not available'})}\n\n"
                    return

                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=openai_messages,
                    max_tokens=800,
                    temperature=0.8,
                    stream=True
                )

                for chunk in response:
                    if chunk.choices and chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        # Clean AI phrases on the fly
                        content = _clean_ai_phrases(content)
                        yield f"data: {json.dumps({'content': content})}\n\n"

                yield f"data: {json.dumps({'done': True})}\n\n"

            except Exception as stream_err:
                logger.exception(f"[TAROT-CHAT] Stream error: {stream_err}")
                yield f"data: {json.dumps({'error': str(stream_err)})}\n\n"

        return Response(
            stream_with_context(generate_stream()),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no'
            }
        )

    except Exception as e:
        logger.exception(f"[ERROR] /api/tarot/chat-stream failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@tarot_bp.route('/chat', methods=['POST'])
def tarot_chat():
    """
    Non-streaming tarot chat (fallback).
    """
    try:
        data = request.get_json(force=True)
        logger.info(f"[TAROT-CHAT] id={getattr(g, 'request_id', 'N/A')} Non-streaming chat")

        messages = data.get("messages", [])
        context = data.get("context", {})
        language = data.get("language", "ko")

        messages = sanitize_messages(messages, max_content_length=2000)

        if not messages:
            return jsonify({"error": "No messages provided"}), 400

        # Extract info
        cards = context.get("cards", [])
        spread_title = context.get("spread_title", "Tarot Reading")
        overall_message = context.get("overall_message", "")

        user_messages = [m for m in messages if m.get("role") == "user"]
        latest_question = user_messages[-1].get("content", "") if user_messages else ""

        # Build simple response using GPT
        card_names = [f"{c.get('name', '')}{'(역)' if c.get('is_reversed') else ''}" for c in cards]
        cards_str = ", ".join(card_names) if card_names else "카드 없음"

        is_korean = language == "ko"

        if is_korean:
            prompt = f"""타로 상담사로서 답변해주세요.
스프레드: {spread_title}
카드: {cards_str}
이전 해석: {overall_message[:300] if overall_message else '없음'}
질문: {latest_question}

카드를 기반으로 150자 이내로 간결하게 답변하세요."""
        else:
            prompt = f"""As a tarot counselor, please respond.
Spread: {spread_title}
Cards: {cards_str}
Previous reading: {overall_message[:300] if overall_message else 'none'}
Question: {latest_question}

Respond concisely in under 150 words, based on the cards."""

        try:
            reply = _generate_with_gpt4(prompt, max_tokens=400, temperature=0.8, use_mini=True)
            reply = _clean_ai_phrases(reply)
        except Exception as llm_err:
            logger.warning(f"[TAROT-CHAT] GPT failed: {llm_err}")
            reply = f"카드 {cards_str}가 전하는 메시지입니다. {overall_message[:200] if overall_message else '내면의 직관을 믿으세요.'}"

        return jsonify({"reply": reply})

    except Exception as e:
        logger.exception(f"[ERROR] /api/tarot/chat failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
