"""
Tarot Reading API Routes
Card interpretation, chat, streaming responses, and topic detection.
Extracted from app.py for better maintainability.

Phase 3.4 Refactored: Uses TarotService for generate_dynamic_followup_questions and detect_tarot_topic.
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


# ===============================================================
# TarotService lazy loader
# ===============================================================
_tarot_service_instance = None


def _get_tarot_service():
    """Lazy load TarotService to avoid circular imports."""
    global _tarot_service_instance
    if _tarot_service_instance is None:
        from backend_ai.services.tarot_service import TarotService
        _tarot_service_instance = TarotService()
    return _tarot_service_instance


def generate_dynamic_followup_questions(
    interpretation: str,
    cards: list,
    category: str,
    user_question: str = "",
    language: str = "ko",
    static_questions: list = None
) -> list:
    """Wrapper for TarotService.generate_dynamic_followup_questions()."""
    return _get_tarot_service().generate_dynamic_followup_questions(
        interpretation=interpretation,
        cards=cards,
        category=category,
        user_question=user_question,
        language=language,
        static_questions=static_questions
    )


def detect_tarot_topic(text: str) -> dict:
    """Wrapper for TarotService.detect_tarot_topic()."""
    return _get_tarot_service().detect_tarot_topic(text)

# Blueprint definition
tarot_bp = Blueprint('tarot', __name__, url_prefix='/api/tarot')

# ===============================================================
# Lazy-loaded dependencies (to avoid circular imports)
# ===============================================================
_tarot_hybrid_rag_module = None
_corpus_rag_module = None
_fusion_generate_module = None
_openai_client = None
_tarot_service = None


def _get_tarot_service():
    """Lazy load TarotService to avoid circular imports."""
    global _tarot_service
    if _tarot_service is None:
        from backend_ai.services.tarot_service import TarotService
        _tarot_service = TarotService()
    return _tarot_service


def generate_dynamic_followup_questions(
    interpretation: str,
    cards: list,
    category: str,
    user_question: str = "",
    language: str = "ko",
    static_questions: list = None
) -> list:
    """Delegate to TarotService.generate_dynamic_followup_questions()."""
    service = _get_tarot_service()
    return service.generate_dynamic_followup_questions(
        interpretation=interpretation,
        cards=cards,
        category=category,
        user_question=user_question,
        language=language,
        static_questions=static_questions
    )


def detect_tarot_topic(text: str) -> dict:
    """Delegate to TarotService.detect_tarot_topic()."""
    service = _get_tarot_service()
    return service.detect_tarot_topic(text)


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
    return mod.get_tarot_hybrid_rag()


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


# Phase 3.4: Functions moved to TarotService (backend_ai/services/tarot_service.py)
# - generate_dynamic_followup_questions()
# - detect_tarot_topic()
# - _TAROT_TOPIC_KEYWORDS
# - _load_spread_config()

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

        # 심층해석 제거 - 속도 개선을 위해 RAG 컨텍스트만 사용
        rag_context = build_rag_context()
        advanced = {}  # 심층해석 비활성화

        logger.info(f"[TAROT] RAG context length: {len(rag_context) if rag_context else 0}")
        logger.info(f"[TAROT] RAG context preview: {rag_context[:200] if rag_context else 'EMPTY'}...")

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
        is_playful_question = False
        if user_question:
            q = user_question.lower()

            # 장난스러운/이상한 질문 감지
            playful_keywords = [
                "개한테", "고양이한테", "강아지한테", "동물",
                "키스", "뽀뽀", "핥", "물어",
                "라면", "밥 먹", "치킨", "피자", "짜장면",
                "게임", "유튜브", "넷플릭스", "틱톡",
                "머리 염색", "문신", "타투", "피어싱",
                "술 마", "담배", "복권", "로또",
                "외계인", "귀신", "유령", "좀비",
                "kiss a dog", "kiss my dog", "pet", "lotto", "lottery"
            ]
            if any(kw in q for kw in playful_keywords):
                is_playful_question = True
                question_context = """질문자가 가벼운/재미있는 질문을 하고 있습니다.
유머러스하게 카드를 해석하되, 카드의 상징을 실제로 연결해주세요.
예: "개한테 키스할까?" → "광대 카드가 나왔네요—이 카드는 순수한 즐거움과 자유로운 행동을 나타내요. 반려견과의 교감은 순수한 사랑의 표현이에요. 다만 위생은 챙기시길!"
진지하게 거부하거나 무시하지 말고, 재치있게 답변하세요."""
            # ========== 연애/관계 ==========
            elif any(kw in q for kw in ["좋아", "관심", "호감", "날 어떻게", "마음이 있", "like me", "crush"]):
                question_context = "질문자는 상대의 감정이 궁금합니다. 상대가 질문자를 어떻게 생각하는지, 관심이 있는지, 발전 가능성은 어떤지 위주로 해석하세요."
            elif any(kw in q for kw in ["재회", "다시 만", "헤어진", "돌아올", "연락 올", "ex", "get back"]):
                question_context = "질문자는 헤어진 사람과의 재회를 고민합니다. 상대의 현재 마음, 재결합 가능성, 장애물, 권고사항 위주로 해석하세요."
            elif any(kw in q for kw in ["고백", "말할까", "표현", "먼저", "confess", "tell them"]):
                question_context = "질문자는 고백/표현을 고민합니다. 타이밍이 맞는지, 상대가 어떻게 받아들일지, 방법 위주로 해석하세요."
            elif any(kw in q for kw in ["결혼", "프로포즈", "약혼", "marriage", "propose"]):
                question_context = "질문자는 결혼/프로포즈를 고민합니다. 상대와의 궁합, 시기, 결혼 후 전망 위주로 해석하세요."
            elif any(kw in q for kw in ["이별", "헤어질", "끝낼", "break up", "end relationship"]):
                question_context = "질문자는 이별을 고민합니다. 관계를 끝내는 것이 맞는지, 아직 가능성이 있는지, 결정 후 전망 위주로 해석하세요."
            elif any(kw in q for kw in ["바람", "불륜", "양다리", "cheating", "affair"]):
                question_context = "질문자는 상대의 진실성을 걱정합니다. 상대가 정직한지, 숨기는 게 있는지 솔직하게 해석하세요."
            elif any(kw in q for kw in ["썸", "소개팅", "만남", "인연", "dating", "meeting"]):
                question_context = "질문자는 새로운 인연을 기대합니다. 좋은 인연이 언제 올지, 어떤 사람일지, 어떻게 준비할지 해석하세요."
            elif any(kw in q for kw in ["싸웠", "다퉜", "화해", "사과", "fight", "make up"]):
                question_context = "질문자는 상대와 갈등 상황입니다. 화해 가능성, 누가 먼저 다가가야 할지, 관계 회복 방법 위주로 해석하세요."

            # ========== 직장/커리어 ==========
            elif mapped_spread == "entrepreneurship" or any(kw in q for kw in ["사업", "창업", "business", "startup"]):
                question_context = "질문자는 사업/창업에 대해 묻고 있습니다. 사업 시작 시기, 성공 가능성, 주의점 위주로 해석하세요."
            elif mapped_spread == "job_search" or any(kw in q for kw in ["취업", "취직", "job", "employment"]):
                question_context = "질문자는 취업에 대해 묻고 있습니다. 합격 가능성, 준비 방향, 시기 위주로 해석하세요."
            elif mapped_spread == "career_change" or any(kw in q for kw in ["이직", "퇴사", "그만두", "quit", "resign"]):
                question_context = "질문자는 이직/퇴사를 고민 중입니다. 현 직장 vs 새 직장, 시기, 리스크 위주로 해석하세요."
            elif any(kw in q for kw in ["면접", "interview"]):
                question_context = "질문자는 면접 결과가 궁금합니다. 합격 가능성, 면접관의 인상, 보완할 점 위주로 해석하세요."
            elif any(kw in q for kw in ["승진", "promotion"]):
                question_context = "질문자는 승진을 기대합니다. 승진 가능성, 타이밍, 경쟁자 대비 강점 위주로 해석하세요."
            elif any(kw in q for kw in ["상사", "직장 상사", "팀장", "boss", "manager"]):
                question_context = "질문자는 상사와의 관계를 고민합니다. 상사가 어떻게 보는지, 관계 개선법 위주로 해석하세요."
            elif any(kw in q for kw in ["동료", "팀원", "직장 동료", "coworker", "colleague"]):
                question_context = "질문자는 동료 관계를 고민합니다. 협업 전망, 갈등 해결법 위주로 해석하세요."

            # ========== 시험/학업 ==========
            elif any(kw in q for kw in ["시험", "합격", "붙을", "자격증", "exam", "test", "pass"]):
                question_context = "질문자는 시험 합격 여부가 궁금합니다. 합격 가능성, 부족한 부분, 집중할 영역 위주로 해석하세요."
            elif any(kw in q for kw in ["수능", "입시", "대학", "college", "university"]):
                question_context = "질문자는 입시 결과가 궁금합니다. 합격 전망, 목표 학교와의 궁합, 준비 방향 위주로 해석하세요."
            elif any(kw in q for kw in ["공부", "성적", "학점", "study", "grade"]):
                question_context = "질문자는 학업 성과를 고민합니다. 성적 향상 가능성, 공부 방법, 집중해야 할 부분 위주로 해석하세요."

            # ========== 재물/금전 ==========
            elif any(kw in q for kw in ["돈", "재물", "금전", "수입", "money", "income", "wealth"]):
                question_context = "질문자는 재물운이 궁금합니다. 돈이 들어올 시기, 재정 상태 전망, 주의사항 위주로 해석하세요."
            elif any(kw in q for kw in ["투자", "주식", "코인", "부동산", "invest", "stock", "crypto"]):
                question_context = "질문자는 투자를 고민합니다. 투자 시기, 수익 가능성, 리스크 위주로 해석하세요. 구체적 투자 조언은 피하되 에너지 흐름을 설명하세요."
            elif any(kw in q for kw in ["사야", "살까", "구매", "구입", "buy", "purchase"]):
                question_context = "질문자는 큰 구매를 고민합니다. 지금 사도 되는지, 기다려야 할지, 숨은 변수 위주로 해석하세요."
            elif any(kw in q for kw in ["대출", "빚", "loan", "debt"]):
                question_context = "질문자는 대출/부채를 고민합니다. 재정 부담, 상환 전망, 주의사항 위주로 해석하세요."

            # ========== 건강/웰빙 ==========
            elif any(kw in q for kw in ["건강", "아픔", "병원", "수술", "health", "sick", "hospital"]):
                question_context = "질문자는 건강을 걱정합니다. 건강 상태 전망, 주의해야 할 부분, 회복 가능성 위주로 해석하세요. 의료 조언은 피하세요."
            elif any(kw in q for kw in ["다이어트", "살 빼", "운동", "diet", "weight", "exercise"]):
                question_context = "질문자는 체중/건강관리를 고민합니다. 성공 가능성, 동기부여, 주의점 위주로 해석하세요."
            elif any(kw in q for kw in ["스트레스", "우울", "불안", "멘탈", "힘들", "stress", "anxiety", "depression"]):
                question_context = "질문자는 정서적으로 힘든 상태입니다. 공감과 위로를 담아 해석하고, 상황이 나아질 방향을 제시하세요."
            elif any(kw in q for kw in ["잠", "수면", "불면", "피곤", "sleep", "tired", "insomnia"]):
                question_context = "질문자는 휴식이 필요한 상태입니다. 에너지 회복 방법, 마음 정리 방향 위주로 해석하세요."

            # ========== 선택/결정 ==========
            elif any(kw in q for kw in ["vs", "아니면", "or", "vs"]):
                question_context = "질문자는 양자택일 상황입니다. 각 선택지의 장단점과 카드가 어느 쪽을 가리키는지 명확히 해석하세요."
            elif any(kw in q for kw in ["할까 말까", "해야 할까", "결정", "선택", "decide", "choice"]):
                question_context = "질문자는 중요한 결정을 앞두고 있습니다. 각 방향의 전망과 카드가 권하는 방향을 명확히 해석하세요."
            elif any(kw in q for kw in ["언제", "시기", "타이밍", "when", "timing"]):
                question_context = "질문자는 적절한 타이밍이 궁금합니다. 지금이 맞는지, 기다려야 할지, 행동 시점 위주로 해석하세요."

            # ========== 가족/인간관계 ==========
            elif any(kw in q for kw in ["부모", "엄마", "아빠", "어머니", "아버지", "parent", "mom", "dad"]):
                question_context = "질문자는 부모님과의 관계를 고민합니다. 소통 방법, 이해받는 법, 관계 개선 위주로 해석하세요."
            elif any(kw in q for kw in ["자녀", "아이", "아들", "딸", "child", "kid", "son", "daughter"]):
                question_context = "질문자는 자녀에 대해 고민합니다. 자녀의 상태, 양육 방향, 관계 발전 위주로 해석하세요."
            elif any(kw in q for kw in ["친구", "우정", "friend", "friendship"]):
                question_context = "질문자는 친구 관계를 고민합니다. 진정한 친구인지, 관계 유지 방법 위주로 해석하세요."
            elif any(kw in q for kw in ["형제", "언니", "오빠", "누나", "동생", "sibling", "brother", "sister"]):
                question_context = "질문자는 형제자매 관계를 고민합니다. 갈등 해결, 관계 회복 방향 위주로 해석하세요."

            # ========== 이사/여행/이동 ==========
            elif any(kw in q for kw in ["이사", "move", "moving"]):
                question_context = "질문자는 이사를 고민합니다. 이사 시기, 새 집의 기운, 주의점 위주로 해석하세요."
            elif any(kw in q for kw in ["여행", "휴가", "travel", "trip", "vacation"]):
                question_context = "질문자는 여행을 계획합니다. 여행 운, 좋은 시기, 주의사항 위주로 해석하세요."
            elif any(kw in q for kw in ["유학", "이민", "해외", "abroad", "overseas"]):
                question_context = "질문자는 해외 진출을 고민합니다. 해외 운, 적응 가능성, 시기 위주로 해석하세요."

            # ========== 일상/기타 ==========
            elif any(kw in q for kw in ["오늘", "today"]):
                question_context = "질문자는 오늘 하루의 흐름이 궁금합니다. 오늘의 에너지, 주의할 점, 행운의 포인트 위주로 해석하세요."
            elif any(kw in q for kw in ["이번 주", "this week"]):
                question_context = "질문자는 이번 주 흐름이 궁금합니다. 주간 에너지, 좋은 날/주의할 날, 핵심 조언 위주로 해석하세요."
            elif any(kw in q for kw in ["이번 달", "this month"]):
                question_context = "질문자는 이번 달 운세가 궁금합니다. 월간 흐름, 기회, 주의사항 위주로 해석하세요."
            elif any(kw in q for kw in ["올해", "this year", "2025", "2024"]):
                question_context = "질문자는 연간 운세가 궁금합니다. 올해의 주요 테마, 기회와 도전, 전반적 흐름 위주로 해석하세요."
            elif any(kw in q for kw in ["반려동물", "강아지", "고양이", "펫", "pet", "dog", "cat"]):
                question_context = "질문자는 반려동물에 대해 묻습니다. 반려동물과의 인연, 관계, 케어 방향 위주로 해석하세요."
            elif any(kw in q for kw in ["임신", "출산", "아기", "pregnancy", "baby", "pregnant"]):
                question_context = "질문자는 임신/출산을 기대합니다. 임신 가능성, 시기, 준비 방향 위주로 해석하세요. 민감한 주제이므로 따뜻하게 해석하세요."
            elif any(kw in q for kw in ["계약", "서명", "contract", "sign"]):
                question_context = "질문자는 계약을 앞두고 있습니다. 계약 성사 가능성, 주의할 조항, 타이밍 위주로 해석하세요."
            elif any(kw in q for kw in ["소송", "법적", "재판", "lawsuit", "legal", "court"]):
                question_context = "질문자는 법적 문제가 있습니다. 결과 전망, 주의사항, 대응 방향 위주로 해석하세요."
            elif any(kw in q for kw in ["분실", "잃어버", "찾을", "lost", "find", "missing"]):
                question_context = "질문자는 분실물을 찾고 있습니다. 찾을 가능성, 방향, 시간 위주로 해석하세요."

            # ========== 자기 성장/내면 ==========
            elif any(kw in q for kw in ["나는 누구", "정체성", "본질", "내 강점", "약점", "identity", "who am i"]):
                question_context = "질문자는 자기 자신에 대해 탐구합니다. 핵심 동기, 강점, 약점, 성장 방향 위주로 깊이 있게 해석하세요."
            elif any(kw in q for kw in ["그림자", "내면", "무의식", "트라우마", "shadow", "subconscious"]):
                question_context = "질문자는 내면의 숨겨진 부분을 탐구합니다. 반복되는 패턴, 무의식적 두려움, 치유 방향 위주로 섬세하게 해석하세요."
            elif any(kw in q for kw in ["성장", "발전", "변화", "자기계발", "growth", "development"]):
                question_context = "질문자는 성장과 발전을 원합니다. 현재 배울 점, 극복할 과제, 다음 단계 위주로 해석하세요."
            elif any(kw in q for kw in ["메시지", "우주", "신호", "운명", "message", "universe", "destiny"]):
                question_context = "질문자는 우주/운명의 메시지를 듣고 싶어합니다. 카드가 전하는 심오한 메시지를 영적으로 해석하세요."
            elif any(kw in q for kw in ["직관", "영감", "꿈", "비전", "intuition", "dream", "vision"]):
                question_context = "질문자는 직관과 영감을 구합니다. 내면의 목소리, 꿈의 의미, 직관적 가이드 위주로 해석하세요."

            # ========== 현재 연인/커플 ==========
            elif any(kw in q for kw in ["사귀는", "연인", "남자친구", "여자친구", "남친", "여친", "boyfriend", "girlfriend"]):
                question_context = "질문자는 현재 연인과의 관계를 묻습니다. 상대의 마음, 관계 발전 가능성, 주의점 위주로 해석하세요."
            elif any(kw in q for kw in ["우리 관계", "앞으로", "미래", "relationship future"]):
                question_context = "질문자는 현재 관계의 미래를 알고 싶어합니다. 관계 발전 방향, 잠재력, 도전 과제 위주로 해석하세요."

            # ========== 솔로/인연 찾기 ==========
            elif any(kw in q for kw in ["솔로", "혼자", "짝", "배필", "single", "soulmate"]):
                question_context = "질문자는 인연을 찾고 있습니다. 좋은 인연이 언제/어디서 올지, 어떻게 준비할지, 본인의 매력 포인트 위주로 해석하세요."

            # ========== 워라밸/번아웃 ==========
            elif any(kw in q for kw in ["워라밸", "일과 삶", "번아웃", "지침", "work life", "burnout", "exhausted"]):
                question_context = "질문자는 일과 삶의 균형을 고민합니다. 에너지 분배, 우선순위, 회복 방법 위주로 해석하세요."

        # 스프레드 위치 정보 추출
        position_info = ""
        for i, card in enumerate(cards):
            pos = card.get("position", f"Card {i+1}")
            position_info += f"- {pos}: {drawn_cards[i].get('name', '')}{'(역방향)' if drawn_cards[i].get('isReversed') else ''}\n"

        # 질문 형태 분석
        q = enhanced_question or '일반 운세'
        is_yes_no_question = any(kw in q for kw in ["할까", "살까", "해야", "할지", "갈까", "볼까", "먹을까", "만날까", "시작할까", "그만둘까", "바꿀까"])

        conclusion_instruction = ""
        if is_yes_no_question:
            conclusion_instruction = f'마지막에 반드시 "결론: [질문에 대한 직접적인 답]" 형식으로 답하세요. 예: "결론: 지금은 하지 마라", "결론: 해도 좋다"'
        else:
            conclusion_instruction = '마지막에 "결론:" 으로 시작하는 핵심 메시지를 제시하세요.'

        tarot_prompt = f"""10년 경력 타로 리더. 뽑힌 카드를 근거로 답변해.

🚫 절대 금지:
- "좋은 에너지" "긍정적으로" 같은 뜬구름 말
- 카드 언급 없이 일반론
- "~하시면 좋을 것 같습니다" AI스러운 표현

✅ 올바른 답변:
- 각 카드 이름+위치 반드시 언급
- 카드 그림 상징 구체적 인용 (예: "검 10번의 등에 꽂힌 칼처럼 지금 많이 힘들죠")
- 구체적 시기/행동 제시 (예: "이번 주 안에 결정하세요")

예시:
❌ 나쁜 답: "사랑운이 좋아지고 있어요. 기다리세요."
✅ 좋은 답: "현재 위치의 연인 카드가 정방향이에요. 두 사람이 서로를 마주보고 천사가 축복하는 그 그림처럼, 이번 달 안에 마음을 확인하는 대화가 필요해요. 다만 과거 위치에 탑이 있으니, 이전 상처에 대한 솔직한 대화가 먼저예요."

## 오늘: {date_str} ({season})
## 스프레드: {spread_title}

## 위치별 카드
{position_info}

## 질문: "{q}"

## 해석 규칙
1. 각 카드가 질문 "{q}"에 뭐라고 하는지 직접 해석
2. 위치별 의미 연결 (하라는 신호/말라는 신호/숨은 변수/과거/현재/미래)
3. 카드 이미지 상징을 질문과 연결 (칼, 컵, 인물 자세 등)
4. {conclusion_instruction}

{question_context}

## 참고 RAG
{rag_context[:800] if rag_context else ''}

## 말투: 친구처럼 편하게 "~해요/~죠/~거든요"
## 형식: {('한국어' if is_korean else 'English')}, 500-700자"""

        # === 통합 GPT 호출 (속도 최적화: 전체 해석 + 카드별 해석을 하나로) ===
        # Build card info for unified prompt
        card_details = []
        for i, card in enumerate(drawn_cards):
            card_name = card.get("name", "")
            is_reversed = card.get("isReversed", False)
            position = cards[i].get("position", f"Card {i+1}") if i < len(cards) else f"Card {i+1}"
            reversed_text = "(역방향)" if is_reversed else ""

            # Get RAG context for card - 더 풍부하게
            card_rag = hybrid_rag.get_card_insights(card_name)
            card_meaning = card_rag.get("upright_meaning" if not is_reversed else "reversed_meaning", "")
            card_keywords = card_rag.get("keywords", [])
            card_symbolism = card_rag.get("symbolism", card_rag.get("imagery", ""))
            card_advice = card_rag.get("advice", card_rag.get("guidance", ""))

            # 심층 의미 추가 (get_card_deep_meaning)
            deep_meaning_data = hybrid_rag.get_card_deep_meaning(card_name)
            deep_meaning = ""
            if deep_meaning_data:
                deep_parts = []
                if deep_meaning_data.get("archetype"):
                    deep_parts.append(f"원형: {deep_meaning_data['archetype']}")
                if deep_meaning_data.get("journey_stage"):
                    deep_parts.append(f"여정: {deep_meaning_data['journey_stage']}")
                if deep_meaning_data.get("life_lesson"):
                    deep_parts.append(f"교훈: {deep_meaning_data['life_lesson']}")
                if deep_meaning_data.get("shadow_aspect"):
                    deep_parts.append(f"그림자: {deep_meaning_data['shadow_aspect']}")
                deep_meaning = " | ".join(deep_parts)

            card_details.append({
                "index": i,
                "name": card_name,
                "reversed_text": reversed_text,
                "position": position,
                "meaning": card_meaning[:400] if card_meaning else "",
                "keywords": ", ".join(card_keywords[:6]) if card_keywords else "",
                "symbolism": card_symbolism[:300] if card_symbolism else "",
                "advice": card_advice[:200] if card_advice else "",
                "deep_meaning": deep_meaning[:300] if deep_meaning else ""
            })

        # 카드 조합 해석 추가 (get_all_card_pair_interpretations)
        card_names = [cd['name'] for cd in card_details]
        pair_interpretations = hybrid_rag.get_all_card_pair_interpretations(card_names)
        combinations_text = ""
        if pair_interpretations:
            combo_parts = []
            for pair_data in pair_interpretations[:5]:  # 최대 5개 조합
                if isinstance(pair_data, dict):
                    pair_key = f"{pair_data.get('card1', '')} + {pair_data.get('card2', '')}"
                    # Get interpretation (love/career/finance or advice)
                    combo_meaning = (
                        pair_data.get("love") or
                        pair_data.get("career") or
                        pair_data.get("advice") or
                        ""
                    )
                    if combo_meaning:
                        combo_parts.append(f"• {pair_key}: {combo_meaning[:150]}")
            if combo_parts:
                combinations_text = "\n".join(combo_parts)

        # 원소 균형 분석 (analyze_elemental_balance)
        elemental_balance = hybrid_rag.analyze_elemental_balance(card_names)
        elemental_text = ""
        if elemental_balance:
            elem_parts = []
            if elemental_balance.get("dominant"):
                elem_parts.append(f"주요: {elemental_balance['dominant']}")
            if elemental_balance.get("missing"):
                missing_elements = elemental_balance['missing']
                if missing_elements:
                    elem_parts.append(f"부족: {', '.join(missing_elements)}")
            if elemental_balance.get("dominant_meaning"):
                elem_parts.append(elemental_balance['dominant_meaning'][:150])
            elemental_text = " | ".join(elem_parts)

        # 시기 힌트 (get_timing_hint) - returns string like "한국어: timeframe"
        timing_text = ""
        if card_names:
            timing_hint = hybrid_rag.get_timing_hint(card_names[0])
            if timing_hint:
                timing_text = timing_hint

        # 융 원형 (get_jungian_archetype)
        archetype_parts = []
        for cn in card_names[:3]:
            arch = hybrid_rag.get_jungian_archetype(cn)
            if arch and arch.get("archetype"):
                archetype_parts.append(f"{cn}: {arch['archetype']}")
        archetype_text = " | ".join(archetype_parts) if archetype_parts else ""

        # Unified prompt for overall + all card interpretations - RAG 정보 풍부하게 포함
        card_list_text = "\n\n".join([
            f"""### {cd['index']+1}. [{cd['position']}] {cd['name']}{cd['reversed_text']}
키워드: {cd['keywords']}
의미: {cd['meaning']}
상징: {cd['symbolism']}
심층: {cd['deep_meaning']}"""
            for cd in card_details
        ])

        unified_prompt = f"""당신은 10년 경력의 따뜻하고 직관적인 타로 상담사입니다. 마치 카페에서 오랜 친구에게 진심으로 조언하듯 깊이 있고 자연스럽게 해석해주세요.

## 오늘: {date_str} ({season})
## 스프레드: {spread_title}
## 질문: "{q}"

## 뽑힌 카드
{card_list_text}

{question_context}

## 참고 지식
{rag_context[:800] if rag_context else ''}

## 카드 조합 시너지
{combinations_text if combinations_text else '(조합 정보 없음)'}

## 원소 균형
{elemental_text if elemental_text else '(분석 없음)'}

## 시기 힌트
{timing_text if timing_text else '(시기 정보 없음)'}

## 심리 원형 (융)
{archetype_text if archetype_text else '(원형 정보 없음)'}

## 출력 형식 (JSON)
다음 형식으로 JSON 응답해:
{{
  "overall": "전체 메시지 (900-1200자, 최소 15줄). 친구에게 진심으로 이야기하듯 따뜻하게. 1) 질문의 핵심을 깊이 있게 짚고 2) 각 카드들이 함께 만드는 전체적인 이야기를 풀어내고 3) 카드들 사이의 연결과 흐름을 설명하고 4) 질문자의 상황에 대한 통찰을 풍부하게 제공하고 5) 마지막에 '결론:'으로 핵심 메시지를 정리해. 매우 풍성하고 깊이 있게 작성해.",
  "cards": [
    {{"position": "위치명", "interpretation": "이 카드의 매우 깊이 있는 해석 (500-700자, 최소 8-10줄). 1) 카드 이미지와 상징을 생생하게 묘사 (색깔, 인물, 배경 등) 2) 이 위치에서 이 카드가 나온 의미 3) 질문자의 현재 상황과 어떻게 연결되는지 구체적으로 4) 이 카드가 전하는 감정적/실용적 메시지 5) 구체적인 행동 조언까지. 매우 풍성하고 깊이 있게 작성해."}}
  ],
  "advice": [
    {{"title": "조언 제목 (구체적으로)", "detail": "매우 구체적이고 실천 가능한 조언 (300-400자, 최소 7-10줄). 1) 왜 이 조언이 지금 중요한지 배경 설명 2) 구체적으로 무엇을 어떻게 해야 하는지 단계별 안내 3) 언제, 어디서, 어떤 방식으로 실천할지 구체적 예시 4) 예상되는 효과나 변화까지 포함. 추상적인 조언이 아닌 오늘 당장 실천할 수 있는 구체적인 행동 지침을 매우 상세하게 제시해."}}
  ]
}}

## 규칙
1. 질문 "{q}"에 진심을 담아 직접 답변해
2. 각 카드의 이미지를 생생하게 묘사하며 질문과 연결해
3. 상담사처럼 따뜻하지만 솔직하게, 희망을 주되 현실적으로 말해
4. advice는 3-5개의 매우 구체적인 조언을 배열로 제공해 (각 300-400자씩)

## 말투 (매우 중요!)
- 친구에게 카페에서 이야기하듯 편하고 자연스럽게
- "~해요", "~죠", "~거든요", "~네요", "~예요" 같은 부드러운 존댓말 사용
- 절대 금지: "~하옵니다", "~하오", "~니이다", "~로다", "~하느니라" 같은 고어체/궁서체
- 절대 금지: "~것입니다", "~하겠습니다", "~드립니다", "~것 같습니다" 같은 딱딱한 격식체
- 절대 금지: "~하시면 좋겠습니다", "긍정적인 에너지" 같은 AI스러운 표현
- {('자연스러운 한국어로 작성' if is_korean else 'Write in natural English')}"""

        reading_text = ""
        card_interpretations = [""] * len(drawn_cards)
        advice_text = ""

        try:
            unified_result = _generate_with_gpt4(unified_prompt, max_tokens=6000, temperature=0.75, use_mini=True)
            unified_result = _clean_ai_phrases(unified_result)

            # Parse JSON response
            try:
                # Extract JSON from response (handle markdown code blocks)
                json_match = re.search(r'\{[\s\S]*\}', unified_result)
                if json_match:
                    parsed = json.loads(json_match.group())
                    reading_text = parsed.get("overall", "")
                    raw_advice = parsed.get("advice", "")

                    # Handle new advice format (array of {title, detail})
                    if isinstance(raw_advice, list):
                        advice_text = raw_advice  # Keep as array for frontend
                    else:
                        advice_text = raw_advice  # String fallback

                    # Use index-based assignment (GPT returns cards in order)
                    parsed_cards = parsed.get("cards", [])
                    for i, card_data in enumerate(parsed_cards):
                        if i < len(card_interpretations):
                            interp = card_data.get("interpretation", "")
                            if interp:
                                card_interpretations[i] = interp
                else:
                    # Fallback: use entire response as overall
                    reading_text = unified_result
            except json.JSONDecodeError:
                # JSON 파싱 실패 시 전체 텍스트 사용
                reading_text = unified_result

        except Exception as llm_e:
            logger.warning(f"[TAROT] Unified GPT call failed: {llm_e}, using fallback")
            reading_text = f"카드 해석: {cards_str}. {rag_context[:500] if rag_context else ''}"

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
                "interpretation": card_interpretations[i] if i < len(card_interpretations) else "",
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
            "guidance": advice_text if advice_text else advanced.get("elemental_analysis", {}).get("dominant_advice", "카드의 지혜에 귀 기울이세요."),
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

        # 장난스러운/이상한 질문 감지
        playful_instruction = ""
        if latest_question:
            q = latest_question.lower()
            playful_keywords = [
                "개한테", "고양이한테", "강아지한테", "동물",
                "키스", "뽀뽀", "핥", "물어",
                "라면", "밥 먹", "치킨", "피자", "짜장면",
                "게임", "유튜브", "넷플릭스", "틱톡",
                "머리 염색", "문신", "타투", "피어싱",
                "술 마", "담배", "복권", "로또",
                "외계인", "귀신", "유령", "좀비",
                "kiss a dog", "kiss my dog", "pet", "lotto", "lottery"
            ]
            if any(kw in q for kw in playful_keywords):
                playful_instruction = "\n7) 가벼운 질문에는 유머러스하게! 카드 상징을 재치있게 연결해줘."

        if is_korean:
            system_prompt = f"""타로 상담사. 뽑힌 카드를 근거로 답변해.

🚫 절대 금지:
- "좋은 에너지" "긍정적으로 보세요" 같은 뜬구름 말
- 카드 언급 없이 일반론만 말하기
- "~하시면 좋을 것 같습니다" AI스러운 표현

✅ 올바른 답변:
- 뽑힌 카드 이름과 위치 반드시 언급
- 카드 그림/상징 구체적 인용 (예: "검 10번의 등에 꽂힌 칼처럼...")
- 구체적 시기/행동 제시 (예: "2주 내로 결정하세요")

예시:
❌ 나쁜 답: "사랑운이 좋아지고 있어요. 긍정적으로 기다리세요."
✅ 좋은 답: "현재 위치의 연인 카드가 정방향이에요. 두 사람이 서로를 바라보며 천사가 축복하는 그림처럼, 이번 달 안에 감정 확인 대화가 필요해요. 다만 과거 위치의 탑 카드가 있으니 이전 상처에 대한 솔직한 대화가 먼저예요."

## 현재 스프레드: {spread_title} ({category})

## 뽑힌 카드들
{cards_context}

## RAG 컨텍스트
{rag_context[:1500] if rag_context else '(없음)'}

## 이전 해석
{overall_message[:500] if overall_message else '(없음)'}

## 말투: 친구처럼 편하게, "~해요/~죠/~거든요" 사용{playful_instruction}"""
        else:
            playful_en = ""
            if playful_instruction:
                playful_en = "\n\nFor playful questions, be witty! Connect card symbolism creatively."
            system_prompt = f"""Tarot counselor. Answer based on drawn cards.

🚫 FORBIDDEN:
- "Good energy" "Stay positive" vague statements
- Generic advice without card references
- AI-sounding phrases like "I recommend"

✅ CORRECT:
- MUST mention drawn card names and positions
- Cite specific card imagery (e.g., "like the swords in the 10 of Swords piercing the figure's back...")
- Give specific timing/actions (e.g., "decide within 2 weeks")

Example:
❌ Bad: "Love is improving. Stay positive and wait."
✅ Good: "The Lovers card in your present position is upright - two figures gazing at each other with an angel blessing them. Have a heart-to-heart talk this month. But the Tower in your past position means address old wounds honestly first."

## Current Spread: {spread_title} ({category})

## Drawn Cards
{cards_context}

## RAG Context
{rag_context[:1500] if rag_context else '(none)'}

## Previous Interpretation
{overall_message[:500] if overall_message else '(none)'}{playful_en}"""

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
            prompt = f"""타로 상담사로서 답변해줘.
스프레드: {spread_title}
카드: {cards_str}
이전 해석: {overall_message[:300] if overall_message else '없음'}
질문: {latest_question}

카드를 기반으로 150자 이내로 간결하게 답변해.
말투: 친구에게 카페에서 이야기하듯 "~해요", "~죠", "~네요" 사용.
절대 금지: "~하옵니다", "~하오", "~니이다" 같은 궁서체/고어체, "~것입니다", "~하겠습니다" 같은 딱딱한 격식체."""
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
