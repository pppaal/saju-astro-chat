"""
Dream Routes

Dream interpretation endpoints using DreamService.

Routes:
- POST /api/dream/interpret-stream - Streaming dream interpretation (SSE)
- POST /api/dream/chat-stream - Dream follow-up chat with RAG+Jung+Saju context

✅ Phase 2.4 Refactored: Now uses DreamService directly instead of app.py proxy.
"""
from flask import Blueprint, request, jsonify, Response, g
import logging

from backend_ai.app.exceptions import BackendAIError

logger = logging.getLogger(__name__)

# Create Blueprint
dream_bp = Blueprint('dream', __name__)


# ============================================================================
# Service Layer (Phase 2.4)
# ============================================================================

def _get_dream_service():
    """Lazy load DreamService to avoid import issues."""
    from backend_ai.services.dream_service import DreamService
    return DreamService()


# ============================================================================
# Routes
# ============================================================================

@dream_bp.route("/api/dream/interpret-stream", methods=["POST"])
def dream_interpret_stream():
    """
    Streaming dream interpretation - returns SSE for real-time display.

    ✅ Phase 2.4: Direct implementation (no service extraction needed - simple GPT streaming)

    Uses GPT-4o for fast streaming.
    Streams: summary → symbols → recommendations → done
    """
    try:
        # Import dependencies
        import json as json_mod
        from backend_ai.app.app import (
            openai_client,
            OPENAI_AVAILABLE,
            is_suspicious_input,
            sanitize_dream_text
        )

        data = request.get_json(force=True)
        logger.info(f"[DREAM_STREAM] id={g.request_id} Starting streaming interpretation")

        raw_dream_text = data.get("dream", "")
        symbols = data.get("symbols", [])
        emotions = data.get("emotions", [])
        themes = data.get("themes", [])
        context = data.get("context", [])
        locale = data.get("locale", "ko")

        # Input validation - sanitize dream text
        if is_suspicious_input(raw_dream_text):
            logger.warning(f"[DREAM_STREAM] Suspicious input detected")
        dream_text = sanitize_dream_text(raw_dream_text)

        # Cultural symbols
        cultural_parts = []
        if data.get("koreanTypes"):
            cultural_parts.append(f"Korean Types: {', '.join(data['koreanTypes'])}")
        if data.get("koreanLucky"):
            cultural_parts.append(f"Korean Lucky: {', '.join(data['koreanLucky'])}")
        if data.get("chinese"):
            cultural_parts.append(f"Chinese: {', '.join(data['chinese'])}")
        if data.get("islamicTypes"):
            cultural_parts.append(f"Islamic Types: {', '.join(data['islamicTypes'])}")
        if data.get("western"):
            cultural_parts.append(f"Western/Jungian: {', '.join(data['western'])}")
        if data.get("hindu"):
            cultural_parts.append(f"Hindu: {', '.join(data['hindu'])}")
        if data.get("japanese"):
            cultural_parts.append(f"Japanese: {', '.join(data['japanese'])}")

        cultural_context = '\n'.join(cultural_parts) if cultural_parts else 'None'

        is_korean = locale == "ko"
        lang_instruction = "Please respond entirely in Korean (한국어로 답변해주세요)." if is_korean else "Please respond in English."

        def generate_stream():
            """Generator for SSE streaming dream interpretation with parallel execution"""
            try:
                if not OPENAI_AVAILABLE or not openai_client:
                    yield f"data: {json_mod.dumps({'error': 'OpenAI not available'})}\n\n"
                    return

                # Import parallel streaming utility
                from backend_ai.app.services.parallel_streaming import create_parallel_stream, StreamConfig

                # === Build prompts for parallel execution ===
                summary_prompt = f"""당신은 따뜻하고 공감 능력이 뛰어난 꿈 상담사입니다.
마치 오랜 친구에게 이야기하듯 편안하게 꿈의 메시지를 전달해주세요.

{lang_instruction}

꿈 내용:
{dream_text[:1500]}

심볼: {', '.join(symbols) if symbols else '없음'}
감정: {', '.join(emotions) if emotions else '없음'}
유형: {', '.join(themes) if themes else '없음'}
상황: {', '.join(context) if context else '없음'}
문화적 맥락: {cultural_context}

상담 스타일:
- 따뜻하고 공감하는 말투 ("~하셨군요", "~느끼셨을 거예요")
- 꿈이 전하는 메시지를 부드럽게 해석
- 불안한 꿈이라도 긍정적 관점으로 재해석
- 3-4문장으로 자연스럽게 요약"""

                symbols_prompt = f"""당신은 따뜻한 꿈 상담사입니다. 꿈에 나타난 심볼들의 의미를 친근하게 설명해주세요.

{lang_instruction}

꿈 내용: {dream_text[:1000]}
심볼: {', '.join(symbols) if symbols else '꿈에서 추출'}
문화적 맥락: {cultural_context}

상담 스타일:
- 각 심볼을 개인의 상황과 연결하여 해석
- 문화적·심리학적 의미를 쉽게 풀어서 설명
- 부정적 심볼도 성장의 메시지로 재해석
- 번호 없이 자연스러운 대화체로 2-3개 심볼 분석"""

                # Note: rec_prompt will use summary from parallel results
                # For now, we'll use a simplified version that doesn't depend on summary
                rec_prompt = f"""당신은 따뜻한 꿈 상담사입니다. 꿈의 메시지를 실생활에 적용할 수 있는 조언을 해주세요.

{lang_instruction}

꿈 내용: {dream_text[:800]}
감정: {', '.join(emotions) if emotions else '없음'}
심볼: {', '.join(symbols) if symbols else '없음'}

상담 스타일:
- 친구에게 조언하듯 편안하고 실용적으로
- 작은 실천 가능한 행동 제안 (예: "오늘 잠깐 산책해보시는 건 어떨까요?")
- 꿈이 전하는 긍정적 메시지 강조
- 2-3가지 따뜻한 조언"""

                # === Configure parallel streams ===
                stream_configs = [
                    StreamConfig(
                        section_name="summary",
                        prompt=summary_prompt,
                        model="gpt-4o",
                        temperature=0.7,
                        max_tokens=400
                    ),
                    StreamConfig(
                        section_name="symbols",
                        prompt=symbols_prompt,
                        model="gpt-4o",
                        temperature=0.7,
                        max_tokens=500
                    ),
                    StreamConfig(
                        section_name="recommendations",
                        prompt=rec_prompt,
                        model="gpt-4o",
                        temperature=0.7,
                        max_tokens=300
                    ),
                ]

                # === Execute all streams in parallel (3x faster!) ===
                logger.info(f"[DREAM_STREAM] Starting parallel execution of 3 streams")
                for chunk in create_parallel_stream(openai_client, stream_configs):
                    yield chunk

                # === DONE ===
                yield f"data: {json_mod.dumps({'done': True})}\n\n"

            except Exception as stream_error:
                logger.exception(f"[DREAM_STREAM] Error: {stream_error}")
                yield f"data: {json_mod.dumps({'error': str(stream_error)})}\n\n"

        return Response(
            generate_stream(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no'
            }
        )

    except BackendAIError:
        raise
    except Exception as e:
        logger.exception(f"[ERROR] /api/dream/interpret-stream failed: {e}")
        raise BackendAIError(str(e), "INTERNAL_ERROR")


@dream_bp.route("/api/dream/chat-stream", methods=["POST"])
def dream_chat_stream():
    """
    Dream follow-up chat with enhanced RAG + Jung + Saju + Celestial context.

    ✅ Phase 2.4 Refactored: Now uses DreamService directly.

    This is the main dream counselor chat endpoint with:
    - DreamRAG search (interpretation context, therapeutic questions, counseling scenarios)
    - CounselingEngine integration (5-level crisis detection, session management, Jung psychology)
    - Celestial context (moon phase, planetary influences)
    - Saju fortune context (day master, daeun, iljin)
    - Previous consultations memory (continuity)
    - Persona memory (personalization, session count, insights)
    """
    try:
        # Parse request data
        import json as json_mod
        raw_data = request.get_data(as_text=False)
        data = json_mod.loads(raw_data.decode('utf-8'))

        messages = data.get("messages", [])
        dream_context = data.get("dream_context", {})
        language = data.get("language", "ko")
        session_id = data.get("session_id")

        # Get request ID from Flask context
        request_id = getattr(g, 'request_id', None)

        # Call DreamService (business logic)
        service = _get_dream_service()
        return service.stream_dream_chat(
            messages=messages,
            dream_context=dream_context,
            language=language,
            session_id=session_id,
            request_id=request_id
        )

    except BackendAIError:
        raise
    except Exception as e:
        logger.exception(f"[dream/chat-stream] Failed: {e}")
        raise BackendAIError(str(e), "INTERNAL_ERROR")


# ============================================================================
# Route Registration Helper
# ============================================================================

def register_dream_routes(app):
    """
    Register dream routes blueprint.

    Args:
        app: Flask application instance
    """
    app.register_blueprint(dream_bp)
    logger.info("[DreamRoutes] Registered dream routes blueprint")
