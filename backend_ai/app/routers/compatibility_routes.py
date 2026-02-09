"""
Compatibility Analysis Routes
궁합 분석 API (사주 + 점성술 융합)
"""
import logging
import time
from datetime import datetime
from flask import Blueprint, request, jsonify, g
from ..utils.request_utils import get_json_or_400

from backend_ai.app.exceptions import (
    BackendAIError,
    ServiceUnavailableError,
    ValidationError,
)

logger = logging.getLogger(__name__)

compatibility_bp = Blueprint('compatibility', __name__, url_prefix='/api/compatibility')

# Lazy load
_compatibility_module = None
_fusion_generate_module = None
HAS_COMPATIBILITY = True


def _get_compatibility():
    global _compatibility_module, HAS_COMPATIBILITY
    if _compatibility_module is None:
        try:
            from backend_ai.app.compatibility import (
                interpret_compatibility,
                interpret_compatibility_group
            )
            _compatibility_module = type('CompatibilityModule', (), {
                'interpret_compatibility': interpret_compatibility,
                'interpret_compatibility_group': interpret_compatibility_group
            })()
        except ImportError:
            HAS_COMPATIBILITY = False
            return None
    return _compatibility_module


def _get_fusion_generate():
    global _fusion_generate_module
    if _fusion_generate_module is None:
        try:
            from backend_ai.model import fusion_generate as _fg
            _fusion_generate_module = _fg
        except ImportError:
            return None
    return _fusion_generate_module


@compatibility_bp.route("", methods=["POST"])
@compatibility_bp.route("/", methods=["POST"])
def compatibility_analysis():
    """
    Relationship compatibility (Saju + Astrology fusion with GPT).
    Accepts 2~4 people; uses group mode for 3-4 people.
    """
    m = _get_compatibility()
    if not m:
        raise ServiceUnavailableError("Compatibility engine not available")

    try:
        data, json_error = get_json_or_400(request, force=True)
        if json_error:
            return json_error
        people = data.get("people") or []

        # Backward compatibility: allow person1/person2 fields
        if not people:
            p1 = data.get("person1") or {}
            p2 = data.get("person2") or {}
            if p1 and p2:
                people = [p1, p2]

        relationship_type = data.get("relationship_type") or data.get("relationshipType") or "lover"
        locale = data.get("locale", "ko")

        if len(people) < 2:
            raise ValidationError("At least two people are required", field="people")
        if len(people) > 5:
            raise ValidationError("Maximum 5 people supported", field="people")

        if len(people) <= 2:
            result = m.interpret_compatibility(people, relationship_type, locale)
        else:
            result = m.interpret_compatibility_group(people, relationship_type, locale)

        status_code = 200 if result.get("status") == "success" else 500
        return jsonify(result), status_code

    except BackendAIError:
        raise  # Re-raise BackendAIError subclasses for global handler
    except Exception as e:
        logger.exception(f"[ERROR] /api/compatibility failed: {e}")
        raise BackendAIError(str(e), "INTERNAL_ERROR")


@compatibility_bp.route("/chat", methods=["POST"])
def compatibility_chat():
    """
    Compatibility chat consultation - follow-up questions about a compatibility reading.
    """
    m = _get_compatibility()
    if not m:
        raise ServiceUnavailableError("Compatibility engine not available")

    try:
        data, json_error = get_json_or_400(request, force=True)
        if json_error:
            return json_error
        request_id = getattr(g, 'request_id', 'unknown')
        logger.info(f"[COMPAT_CHAT] id={request_id} Processing chat message")

        persons = data.get("persons", [])
        question = data.get("question", "")
        history = data.get("history", [])
        locale = data.get("locale", "ko")
        compatibility_context = data.get("compatibility_context", "")
        prompt = data.get("prompt", "")

        if not persons or len(persons) < 2:
            raise ValidationError("At least 2 persons required", field="persons")

        if not question and not prompt:
            raise ValidationError("No question provided", field="question")

        start_time = time.time()
        is_korean = locale == "ko"

        # Current date for contextual responses
        now = datetime.now()
        weekday_names_ko = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"]
        if is_korean:
            date_str = f"{now.year}년 {now.month}월 {now.day}일 ({weekday_names_ko[now.weekday()]})"
        else:
            date_str = now.strftime("%B %d, %Y (%A)")

        # Format persons info
        persons_info = []
        for i, p in enumerate(persons):
            name = p.get("name") or f"Person {i + 1}"
            birth_date = p.get("birthDate") or p.get("date", "")
            birth_time = p.get("birthTime") or p.get("time", "")
            relation = p.get("relation", "")
            persons_info.append(f"- {name}: {birth_date} {birth_time}" + (f" ({relation})" if relation else ""))

        persons_str = "\n".join(persons_info)

        # Build conversation history
        conversation_history = []
        for msg in history[-6:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role != "system":
                conversation_history.append(f"{'사용자' if role == 'user' else 'AI'}: {content[:300]}")

        history_str = "\n".join(conversation_history) if conversation_history else "(첫 질문)"

        # Build chat prompt
        if is_korean:
            system_instruction = """당신은 따뜻하고 공감 능력이 뛰어난 궁합 상담사입니다.
마치 오랜 언니/오빠처럼 편안하게 대화하면서, 두 사람의 관계에 대해 진심 어린 조언을 해주세요.

상담 스타일:
- 공감하며 경청하는 말투 ("그러시군요", "이해해요", "~하실 수 있어요")
- 사주·점성학 전문 용어는 쉽게 풀어서 설명
- 단정적 판단보다는 가능성과 노력의 방향 제시
- 관계의 강점을 먼저 짚어주고, 개선점은 건설적으로
- 3-4문장으로 자연스럽게 대화하듯 답변"""
        else:
            system_instruction = """You are a warm and empathetic relationship counselor.
Talk like a trusted friend while sharing genuine insights about their relationship.

Counseling style:
- Use empathetic, listening language
- Explain Saju/Astrology terms simply
- Focus on possibilities rather than definitive judgments
- Highlight relationship strengths first, then constructive improvements
- Answer naturally in 3-4 sentences like a conversation"""

        chat_prompt = f"""{system_instruction}

## 오늘: {date_str}

## 분석 대상
{persons_str}

## 궁합 분석 결과
{compatibility_context[:1500] if compatibility_context else '(분석 결과 없음)'}

## 대화
{history_str}

## 질문
{question or prompt}"""

        try:
            fg = _get_fusion_generate()
            if fg:
                reply = fg._generate_with_gpt4(chat_prompt, max_tokens=400, temperature=0.5, use_mini=True)
            else:
                reply = "AI 응답을 생성할 수 없습니다." if is_korean else "Unable to generate AI response."
        except Exception as llm_e:
            logger.warning(f"[COMPAT_CHAT] GPT-4 failed: {llm_e}")
            reply = "죄송합니다. 현재 AI 응답을 생성할 수 없습니다." if is_korean else "Sorry, unable to generate AI response."

        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(f"[COMPAT_CHAT] id={request_id} completed in {duration_ms}ms")

        return jsonify({
            "status": "success",
            "response": reply,
            "data": {"response": reply},
            "performance": {"duration_ms": duration_ms}
        })

    except BackendAIError:
        raise  # Re-raise BackendAIError subclasses for global handler
    except Exception as e:
        logger.exception(f"[ERROR] /api/compatibility/chat failed: {e}")
        raise BackendAIError(str(e), "INTERNAL_ERROR")
