"""
Jungian Counseling API Routes
Session management, crisis detection, therapeutic questions.
Extracted from app.py for better maintainability.
"""
import json
import logging
import time
from datetime import datetime
from uuid import uuid4

from flask import Blueprint, request, jsonify, g
from ..utils.request_utils import get_json_or_400

logger = logging.getLogger(__name__)

# Blueprint definition
counseling_bp = Blueprint('counseling', __name__, url_prefix='/api/counseling')

# ===============================================================
# Lazy-loaded dependencies
# ===============================================================
_counseling_engine_module = None
_openai_client = None
HAS_COUNSELING = True
OPENAI_AVAILABLE = True


def _get_counseling_engine():
    """Lazy load counseling_engine module."""
    global _counseling_engine_module, HAS_COUNSELING
    if _counseling_engine_module is None:
        try:
            from backend_ai.app import counseling_engine as _ce
            _counseling_engine_module = _ce
        except ImportError as e:
            logger.warning(f"[COUNSELING] Could not import counseling_engine: {e}")
            HAS_COUNSELING = False
            return None
    return _counseling_engine_module


def get_counseling_engine():
    """Get counseling engine instance."""
    mod = _get_counseling_engine()
    if mod is None:
        raise RuntimeError("Counseling module not available")
    return mod.get_counseling_engine()


def _get_crisis_detector():
    """Get crisis detector class."""
    mod = _get_counseling_engine()
    if mod is None:
        return None
    return mod.CrisisDetector


def _get_openai_client():
    """Get shared OpenAI client."""
    global _openai_client, OPENAI_AVAILABLE
    if _openai_client is None:
        try:
            from backend_ai.app.app import openai_client
            _openai_client = openai_client
            OPENAI_AVAILABLE = _openai_client is not None
        except Exception:
            OPENAI_AVAILABLE = False
            return None
    return _openai_client


def normalize_day_master(saju_data: dict) -> dict:
    """Normalize dayMaster structure from nested to flat format."""
    if not saju_data:
        return saju_data

    day_master = saju_data.get("dayMaster", {})
    if isinstance(day_master, dict) and "element" in day_master:
        # Already nested format, flatten it
        saju_data["dayMaster"] = day_master.get("element", "")
        saju_data["dayMasterKorean"] = day_master.get("korean", "")
    return saju_data


# ===============================================================
# Jung data loader
# ===============================================================
_jung_data_cache = None


def _load_jung_data():
    """Load Jung psychological data."""
    global _jung_data_cache
    if _jung_data_cache is not None:
        return _jung_data_cache

    import os
    jung_file = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "data", "graph", "rules", "jung_psychology.json"
    )

    try:
        if os.path.exists(jung_file):
            with open(jung_file, "r", encoding="utf-8") as f:
                _jung_data_cache = json.load(f)
                return _jung_data_cache
    except Exception as e:
        logger.warning(f"Could not load jung_psychology.json: {e}")

    return {}


def get_lifespan_guidance(birth_year: int) -> dict:
    """Get lifespan guidance for a given birth year."""
    jung_data = _load_jung_data()
    lifespan_data = jung_data.get("lifespan_development", {}).get("stages", {})

    if not lifespan_data:
        return {}

    current_year = datetime.now().year
    age = current_year - birth_year

    # Find matching stage
    for stage_key, stage_data in lifespan_data.items():
        age_range = stage_data.get("age_range", "")
        # Parse age range like "13-19"
        if "-" in age_range:
            try:
                min_age, max_age = map(int, age_range.split("-"))
                if min_age <= age <= max_age:
                    return {
                        "stage": stage_key,
                        "age": age,
                        "data": stage_data
                    }
            except ValueError:
                pass
        elif "+" in age_range:
            try:
                min_age = int(age_range.replace("+", ""))
                if age >= min_age:
                    return {
                        "stage": stage_key,
                        "age": age,
                        "data": stage_data
                    }
            except ValueError:
                pass

    return {"age": age}


# ===============================================================
# ROUTE HANDLERS
# ===============================================================

@counseling_bp.route('/session', methods=['POST'])
def counseling_session():
    """
    Create or continue a counseling session.
    융 심리학 기반 통합 심리상담 세션.
    """
    if not HAS_COUNSELING:
        return jsonify({"status": "error", "message": "Counseling module not available"}), 501

    try:
        data, json_error = get_json_or_400(request, force=True)
        if json_error:
            return json_error
        message = data.get("message", "")
        session_id = data.get("session_id")
        divination_context = data.get("divination_context")

        if not message:
            return jsonify({"status": "error", "message": "Message is required"}), 400

        engine = get_counseling_engine()

        # Get or create session
        session = None
        if session_id:
            session = engine.get_session(session_id)

        # Process message
        result = engine.process_message(
            user_message=message,
            session=session,
            divination_context=divination_context
        )

        return jsonify({
            "status": "success",
            "response": result["response"],
            "session_id": result["session_id"],
            "phase": result.get("phase", "opening"),
            "crisis_detected": result.get("crisis_detected", False),
            "severity": result.get("severity"),
            "should_continue": result.get("should_continue", True)
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/counseling/session failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@counseling_bp.route('/crisis-check', methods=['POST'])
def counseling_crisis_check():
    """
    Check text for crisis indicators.
    위기 신호 감지 (자살/자해 등).
    """
    if not HAS_COUNSELING:
        return jsonify({"status": "error", "message": "Counseling module not available"}), 501

    try:
        data, json_error = get_json_or_400(request, force=True)
        if json_error:
            return json_error
        text = data.get("text", "")

        if not text:
            return jsonify({"status": "error", "message": "Text is required"}), 400

        CrisisDetector = _get_crisis_detector()
        if not CrisisDetector:
            return jsonify({"status": "error", "message": "Crisis detector not available"}), 501

        result = CrisisDetector.detect_crisis(text)

        response_data = {
            "status": "success",
            "is_crisis": result["is_crisis"],
            "max_severity": result["max_severity"],
            "requires_immediate_action": result["requires_immediate_action"]
        }

        # Add resources if crisis detected
        if result["is_crisis"]:
            response_data["resources"] = CrisisDetector.EMERGENCY_RESOURCES.get("ko", {})
            response_data["crisis_response"] = CrisisDetector.get_crisis_response(
                result["max_severity"]
            )

        return jsonify(response_data)

    except Exception as e:
        logger.exception(f"[ERROR] /api/counseling/crisis-check failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@counseling_bp.route('/therapeutic-question', methods=['GET'])
def counseling_therapeutic_question():
    """
    Get a therapeutic question.
    치료적 질문 가져오기.
    """
    if not HAS_COUNSELING:
        return jsonify({"status": "error", "message": "Counseling module not available"}), 501

    try:
        theme = request.args.get("theme")
        archetype = request.args.get("archetype")
        question_type = request.args.get("type", "deepening")

        engine = get_counseling_engine()
        question = engine.get_therapeutic_question(
            theme=theme,
            archetype=archetype,
            question_type=question_type
        )

        return jsonify({
            "status": "success",
            "question": question,
            "theme": theme,
            "archetype": archetype,
            "type": question_type
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/counseling/therapeutic-question failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@counseling_bp.route('/emotional-response', methods=['POST'])
def counseling_emotional_response():
    """
    Get an emotional/empathic response.
    감동적인 공감 응답 생성.
    """
    if not HAS_COUNSELING:
        return jsonify({"status": "error", "message": "Counseling module not available"}), 501

    try:
        data, json_error = get_json_or_400(request, force=True)
        if json_error:
            return json_error
        emotion = data.get("emotion", "")
        situation = data.get("situation", "")

        if not emotion:
            return jsonify({"status": "error", "message": "Emotion is required"}), 400

        engine = get_counseling_engine()
        response = engine.get_emotional_response(emotion, situation)

        return jsonify({
            "status": "success",
            "responses": response
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/counseling/emotional-response failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@counseling_bp.route('/integrated', methods=['POST'])
def counseling_integrated():
    """
    Integrated counseling with saju/astrology/tarot context.
    사주+점성+타로 통합 심리상담.
    """
    if not HAS_COUNSELING:
        return jsonify({"status": "error", "message": "Counseling module not available"}), 501

    try:
        data, json_error = get_json_or_400(request, force=True)
        if json_error:
            return json_error
        message = data.get("message", "")
        session_id = data.get("session_id")

        # Divination data
        saju_data = data.get("saju") or {}
        astro_data = data.get("astro")
        tarot_data = data.get("tarot")

        # Normalize dayMaster
        saju_data = normalize_day_master(saju_data)

        if not message:
            return jsonify({"status": "error", "message": "Message is required"}), 400

        engine = get_counseling_engine()

        # Get or create session
        session = None
        if session_id:
            session = engine.get_session(session_id)

        # Build divination context
        divination_context = {}
        if saju_data:
            divination_context["saju"] = str(saju_data)
        if astro_data:
            divination_context["astrology"] = str(astro_data)
        if tarot_data:
            divination_context["tarot"] = str(tarot_data)

        # Process message
        result = engine.process_message(
            user_message=message,
            session=session,
            divination_context=divination_context if divination_context else None
        )

        return jsonify({
            "status": "success",
            "response": result["response"],
            "session_id": result["session_id"],
            "phase": result.get("phase", "opening"),
            "crisis_detected": result.get("crisis_detected", False),
            "should_continue": result.get("should_continue", True)
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/counseling/integrated failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@counseling_bp.route('/session-summary', methods=['POST'])
def counseling_session_summary():
    """
    Generate a summary for a counseling session.
    상담 세션 요약 자동 생성.
    """
    try:
        data, json_error = get_json_or_400(request, force=True)
        if json_error:
            return json_error
        messages = data.get("messages", [])
        locale = data.get("locale", "ko")

        if not messages or len(messages) < 2:
            return jsonify({"status": "error", "message": "At least 2 messages required"}), 400

        # Extract messages
        user_messages = [m["content"] for m in messages if m.get("role") == "user"]

        # Topic extraction
        topic_keywords = {
            "연애/관계": ["연애", "사랑", "결혼", "이별", "썸", "짝사랑"],
            "커리어/진로": ["취업", "이직", "진로", "사업", "퇴사", "회사"],
            "가족": ["부모", "엄마", "아빠", "가족", "형제", "자녀"],
            "자기탐색": ["성격", "나는", "어떤 사람", "장점", "단점"],
            "건강/스트레스": ["힘들", "우울", "지쳐", "스트레스", "불안"],
            "재정": ["돈", "재정", "경제", "투자"],
            "타이밍/시기": ["언제", "시기", "타이밍", "올해"],
        }

        detected_topics = []
        all_user_text = " ".join(user_messages).lower()
        for topic, keywords in topic_keywords.items():
            if any(kw in all_user_text for kw in keywords):
                detected_topics.append(topic)

        # Emotion detection
        emotions_timeline = []
        emotion_keywords = ["지침", "슬픔", "불안", "분노", "외로움", "희망", "혼란"]
        for msg in user_messages:
            msg_lower = msg.lower()
            for emotion in emotion_keywords:
                if emotion in msg_lower and emotion not in emotions_timeline:
                    emotions_timeline.append(emotion)

        # Generate summary with OpenAI if available
        summary_text = ""
        recommended_followup = []
        key_insight = ""
        emotional_journey = " → ".join(emotions_timeline) if emotions_timeline else "파악 불가"

        openai_client = _get_openai_client()
        if OPENAI_AVAILABLE and openai_client:
            try:
                from backend_ai.app.sanitizer import sanitize_dream_text as _sanitize_text
                conv_text = "\n".join([
                    f"{'사용자' if m['role'] == 'user' else '상담사'}: {_sanitize_text(m.get('content', '')[:300])}"
                    for m in messages[-10:]
                ])

                summary_prompt = f"""다음 상담 대화를 분석하고 요약해주세요.

{conv_text}

JSON 형식으로 응답:
{{"summary": "핵심 요약 2-3문장", "emotional_journey": "감정 변화", "key_insight": "핵심 통찰", "followup_questions": ["후속질문1", "후속질문2"]}}"""

                response = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": summary_prompt}],
                    temperature=0.5,
                    max_tokens=500,
                )

                try:
                    result = json.loads(response.choices[0].message.content)
                    summary_text = result.get("summary", "")
                    emotional_journey = result.get("emotional_journey", emotional_journey)
                    key_insight = result.get("key_insight", "")
                    recommended_followup = result.get("followup_questions", [])
                except (json.JSONDecodeError, KeyError):
                    summary_text = response.choices[0].message.content[:500]

            except Exception as e:
                logger.warning(f"[SESSION-SUMMARY] OpenAI failed: {e}")
                summary_text = f"주요 주제: {', '.join(detected_topics[:3]) if detected_topics else '일반 상담'}"
        else:
            summary_text = f"주요 주제: {', '.join(detected_topics[:3]) if detected_topics else '일반 상담'}"

        # Jung insights
        jung_insights = {}
        if "연애/관계" in detected_topics:
            jung_insights["archetype"] = "아니마/아니무스"
            jung_insights["theme"] = "관계 투사 작업"
        elif "자기탐색" in detected_topics:
            jung_insights["archetype"] = "페르소나/그림자"
            jung_insights["theme"] = "자기 통합"
        elif "가족" in detected_topics:
            jung_insights["archetype"] = "부모 콤플렉스"
            jung_insights["theme"] = "원가족 작업"

        return jsonify({
            "status": "success",
            "summary": summary_text,
            "key_topics": detected_topics[:5],
            "emotional_journey": emotional_journey,
            "key_insight": key_insight,
            "recommended_followup": recommended_followup[:2],
            "jung_insights": jung_insights,
            "message_count": len(messages),
            "user_message_count": len(user_messages),
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/counseling/session-summary failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@counseling_bp.route('/active-imagination', methods=['POST'])
def counseling_active_imagination():
    """
    Get active imagination exercise prompts.
    적극적 상상 기법 안내.
    """
    try:
        data, json_error = get_json_or_400(request, force=True)
        if json_error:
            return json_error
        context = data.get("context", "")
        archetype = data.get("archetype", "")

        jung_data = _load_jung_data()
        ai_data = jung_data.get("active_imagination", {})

        if not ai_data:
            return jsonify({"status": "error", "message": "Active imagination data not available"}), 501

        facilitation = ai_data.get("ai_facilitation_guide", {})
        practice_methods = ai_data.get("practice_methods", {})

        # Determine method based on context
        method = "dialogue_with_figure"
        context_lower = context.lower()

        if any(k in context_lower for k in ["꿈", "악몽"]):
            method = "dream_continuation"
        elif any(k in context_lower for k in ["몸", "아프", "통증"]):
            method = "body_symptom_dialogue"
        elif any(k in context_lower for k in ["화나", "슬퍼", "두려", "감정"]):
            method = "emotion_personification"

        method_data = practice_methods.get(method, {})

        response = {
            "status": "success",
            "method": method_data.get("name_ko", method),
            "description": method_data.get("description", ""),
            "steps": method_data.get("steps", []),
            "suggested_questions": method_data.get("suggested_questions", []),
            "opening_prompts": facilitation.get("opening_prompts", {}).get("general", []),
            "deepening_prompts": facilitation.get("deepening_prompts", [])[:3],
            "integration_prompts": facilitation.get("integration_prompts", [])[:2],
            "safety_notes": facilitation.get("safety_responses", {}).get("overwhelming", []),
        }

        # Add archetype approach if applicable
        if archetype:
            archetype_data = practice_methods.get("dialogue_with_figure", {}).get("archetype_specific", {}).get(archetype, {})
            if archetype_data:
                response["archetype_approach"] = archetype_data.get("approach", "")
                response["archetype_questions"] = archetype_data.get("questions", [])

        return jsonify(response)

    except Exception as e:
        logger.exception(f"[ERROR] /api/counseling/active-imagination failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@counseling_bp.route('/lifespan-guidance', methods=['GET'])
def counseling_lifespan_guidance():
    """
    Get age-appropriate psychological guidance.
    생애주기별 심리 발달 과제 안내.
    """
    try:
        birth_year = request.args.get("birth_year", type=int)

        if not birth_year:
            return jsonify({"status": "error", "message": "birth_year parameter required"}), 400

        guidance = get_lifespan_guidance(birth_year)

        if not guidance:
            return jsonify({"status": "error", "message": "Lifespan guidance data not available"}), 501

        return jsonify({
            "status": "success",
            **guidance
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/counseling/lifespan-guidance failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
