"""
Astrology Counselor Service

Provides astrology-only counselor functionality with streaming chat.
Focuses exclusively on Western Astrology (birth chart analysis).

Phase 3.3: Extracted from app.py (340 lines)
"""
import os
import json
import time
import logging
from typing import Dict, Any, Optional
from uuid import uuid4
from datetime import datetime
from flask import Response, jsonify, g, stream_with_context

logger = logging.getLogger(__name__)


class AstrologyCounselorService:
    """
    Astrology Counselor service for Western astrology-only fortune telling.

    Handles:
    - Session initialization with RAG pre-fetching
    - SSE streaming chat responses
    - Astrology-specific analysis (no saju)
    - Korean/English language support
    """

    def __init__(self):
        """Initialize AstrologyCounselorService."""
        pass

    def initialize_session(
        self,
        astro_data: dict,
        birth_data: dict,
        theme: str = "life",
        locale: str = "ko",
        request_id: str = None
    ) -> tuple:
        """
        Initialize astrology-only counselor session with pre-fetched RAG data.

        Args:
            astro_data: Astrology chart data
            birth_data: Birth information
            theme: Counseling theme
            locale: Language locale
            request_id: Request ID for logging

        Returns:
            Tuple of (response_dict, status_code)
        """
        from backend_ai.app.app import (
            _has_astro_payload,
            _is_truthy,
            validate_birth_data,
            _build_birth_format_message,
            _build_missing_payload_message,
            _bool_env,
            calculate_astrology_data,
            set_session_rag_cache,
        )

        has_astro_payload = _has_astro_payload(astro_data)
        require_computed_payload = _is_truthy(os.getenv("REQUIRE_COMPUTED_PAYLOAD", "1"))

        if require_computed_payload and not has_astro_payload:
            if birth_data.get("date") or birth_data.get("time"):
                valid_birth, _err = validate_birth_data(birth_data.get("date"), birth_data.get("time"))
                if not valid_birth:
                    logger.warning("[ASTROLOGY-COUNSELOR-INIT] Invalid birth format for missing payload")
                    return {"status": "error", "message": _build_birth_format_message(locale)}, 400
            missing_message = _build_missing_payload_message(
                locale,
                missing_saju=False,
                missing_astro=True,
            )
            logger.warning("[ASTROLOGY-COUNSELOR-INIT] Missing computed astro payload")
            return {"status": "error", "message": missing_message}, 400

        logger.info(f"[ASTROLOGY-COUNSELOR-INIT] id={request_id} theme={theme}")

        # Generate session ID
        session_id = str(uuid4())[:12]
        start_time = time.time()

        # Compute astrology if not provided but birth info is available
        if _bool_env("ALLOW_BIRTH_ONLY") and (not _has_astro_payload(astro_data)) and birth_data.get("date") and birth_data.get("time"):
            try:
                lat = birth_data.get("lat") or birth_data.get("latitude") or 37.5665
                lon = birth_data.get("lon") or birth_data.get("longitude") or 126.9780
                date_parts = birth_data["date"].split("-")
                time_parts = birth_data["time"].split(":")
                astro_data = calculate_astrology_data({
                    "year": int(date_parts[0]),
                    "month": int(date_parts[1]),
                    "day": int(date_parts[2]),
                    "hour": int(time_parts[0]),
                    "minute": int(time_parts[1]) if len(time_parts) > 1 else 0,
                    "latitude": lat,
                    "longitude": lon,
                })
            except Exception as e:
                logger.warning(f"[ASTROLOGY-COUNSELOR-INIT] Failed to compute astro: {e}")

        # Pre-fetch astrology-specific RAG data
        rag_data = {
            "graph_nodes": [],
            "corpus_quotes": [],
        }

        # Load astrology-specific graph rules
        try:
            from backend_ai.app.graph_rag import get_graph_rag
            graph_rag = get_graph_rag()
            if graph_rag:
                sun_sign = astro_data.get("sun", {}).get("sign", "")
                moon_sign = astro_data.get("moon", {}).get("sign", "")
                queries = [
                    f"태양 {sun_sign} 특성",
                    f"달 {moon_sign} 감정",
                    f"행성 트랜짓 영향",
                    f"점성술 {theme} 해석",
                ]
                for q in queries:
                    nodes = graph_rag.search(q, top_k=3)
                    rag_data["graph_nodes"].extend([n.get("text", "") for n in nodes if n.get("text")])
        except Exception as e:
            logger.warning(f"[ASTROLOGY-COUNSELOR-INIT] Graph RAG failed: {e}")

        prefetch_time_ms = int((time.time() - start_time) * 1000)
        rag_data["prefetch_time_ms"] = prefetch_time_ms

        # Store in session cache
        set_session_rag_cache(session_id, {
            "rag_data": rag_data,
            "saju_data": {},
            "astro_data": astro_data,
            "theme": theme,
            "counselor_type": "astrology",
        })

        return {
            "status": "success",
            "session_id": session_id,
            "astro": astro_data,
            "prefetch_time_ms": prefetch_time_ms,
            "data_summary": {
                "graph_nodes": len(rag_data.get("graph_nodes", [])),
            }
        }, 200

    def stream_chat(
        self,
        astro_data: dict,
        birth_data: dict,
        prompt: str,
        theme: str = "life",
        locale: str = "ko",
        session_id: str = None,
        conversation_history: list = None,
        user_context: dict = None,
        request_id: str = None
    ) -> Response:
        """
        Streaming chat for astrology-only counselor using SSE.

        Args:
            astro_data: Astrology chart data
            birth_data: Birth information
            prompt: User's question
            theme: Counseling theme
            locale: Language locale
            session_id: Session ID for cached RAG data
            conversation_history: Previous conversation
            user_context: User context information
            request_id: Request ID for logging

        Returns:
            Flask Response with SSE streaming
        """
        from backend_ai.app.app import (
            _has_astro_payload,
            _is_truthy,
            validate_birth_data,
            _build_birth_format_message,
            _build_missing_payload_message,
            _bool_env,
            calculate_astrology_data,
            get_session_rag_cache,
            _build_detailed_astro,
            _clamp_temperature,
            _coerce_float,
            _select_model_and_temperature,
            _get_int_env,
            openai_client,
            _build_missing_requirements_addendum,
            _insert_addendum,
            _format_korean_spacing,
            _get_stream_chunk_size,
            _chunk_text,
            _to_sse_event,
            _sse_error_response,
        )

        logger.info(f"[ASTROLOGY-ASK-STREAM] id={request_id} theme={theme} locale={locale}")

        # Check for pre-fetched RAG data from session
        session_cache = None
        rag_context = ""
        if session_id:
            session_cache = get_session_rag_cache(session_id)
            if session_cache:
                if not astro_data:
                    astro_data = session_cache.get("astro_data", {})

                rag_data = session_cache.get("rag_data", {})
                if rag_data.get("graph_nodes"):
                    rag_context += "\n[점성술 관련 지식]\n"
                    rag_context += "\n".join(rag_data["graph_nodes"][:8])

        # Compute astrology if not provided (optional fallback)
        if _bool_env("ALLOW_BIRTH_ONLY") and (not _has_astro_payload(astro_data)) and birth_data.get("date") and birth_data.get("time"):
            try:
                lat = birth_data.get("lat") or birth_data.get("latitude") or 37.5665
                lon = birth_data.get("lon") or birth_data.get("longitude") or 126.9780
                date_parts = birth_data["date"].split("-")
                time_parts = birth_data["time"].split(":")
                astro_data = calculate_astrology_data({
                    "year": int(date_parts[0]),
                    "month": int(date_parts[1]),
                    "day": int(date_parts[2]),
                    "hour": int(time_parts[0]),
                    "minute": int(time_parts[1]) if len(time_parts) > 1 else 0,
                    "latitude": lat,
                    "longitude": lon,
                })
            except Exception as e:
                logger.warning(f"[ASTROLOGY-ASK-STREAM] Failed to compute astro: {e}")

        has_astro_payload = _has_astro_payload(astro_data)
        require_computed_payload = _is_truthy(os.getenv("REQUIRE_COMPUTED_PAYLOAD", "1"))

        if require_computed_payload and not has_astro_payload:
            if birth_data.get("date") or birth_data.get("time"):
                valid_birth, _err = validate_birth_data(birth_data.get("date"), birth_data.get("time"))
                if not valid_birth:
                    logger.warning("[ASTROLOGY-ASK-STREAM] Invalid birth format for missing payload")
                    return _sse_error_response(_build_birth_format_message(locale))
            missing_message = _build_missing_payload_message(
                locale,
                missing_saju=False,
                missing_astro=True,
            )
            logger.warning("[ASTROLOGY-ASK-STREAM] Missing computed astro payload")
            return _sse_error_response(missing_message)

        # Build detailed astrology context (NO saju)
        astro_detail = _build_detailed_astro(astro_data)

        # Current date
        now = datetime.now()
        weekdays_ko = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"]
        current_date_str = f"오늘: {now.year}년 {now.month}월 {now.day}일 ({weekdays_ko[now.weekday()]})"

        # Build user context section
        user_context_section = ""
        if user_context:
            persona = user_context.get("persona", {})
            if persona.get("sessionCount", 0) > 0:
                user_context_section = f"\n[이전 상담]\n• {persona.get('sessionCount', 0)}회 방문 고객\n"

        # Build astrology-focused system prompt
        system_prompt = self._build_system_prompt(
            locale, current_date_str, astro_detail, rag_context, user_context_section
        )

        # Model selection
        default_model = os.getenv("CHAT_MODEL") or os.getenv("FUSION_MODEL") or "gpt-4.1"
        default_temp = _clamp_temperature(_coerce_float(os.getenv("CHAT_TEMPERATURE")), 0.75)
        model_name, temperature, _ab_variant = _select_model_and_temperature(
            {"model": default_model, "temperature": default_temp},
            default_model,
            default_temp,
            session_id,
            request_id,
        )

        def generate():
            try:
                max_tokens = _get_int_env("ASTRO_ASK_MAX_TOKENS", 700, min_value=300, max_value=2000)
                response = openai_client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    stream=True,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )

                full_text = ""
                for chunk in response:
                    if chunk.choices and chunk.choices[0].delta.content:
                        full_text += chunk.choices[0].delta.content

                if not full_text.strip():
                    yield "data: [DONE]\n\n"
                    return

                addendum = _build_missing_requirements_addendum(
                    full_text,
                    locale,
                    {},
                    astro_data,
                    now.date(),
                    require_saju=False,
                    require_astro=True,
                    require_timing=True,
                    require_caution=True,
                )
                if addendum:
                    full_text = _insert_addendum(full_text, addendum)

                full_text = _format_korean_spacing(full_text)
                if locale == "ko" and not full_text.rstrip().endswith("?"):
                    followup_inline = "지금 가장 궁금한 포인트가 뭐예요?"
                    separator = "" if (full_text.endswith((" ", "\n", "\t")) or not full_text) else " "
                    full_text += f"{separator}{followup_inline}"

                chunk_size = _get_stream_chunk_size()
                for piece in _chunk_text(full_text, chunk_size):
                    yield _to_sse_event(piece)

                # Add follow-up questions
                follow_ups = [
                    "현재 행성 트랜짓이 제게 어떤 영향을 주나요?",
                    "제 상승궁에 대해 더 알려주세요",
                    "올해 주요 점성술적 이벤트는 무엇인가요?",
                ] if locale == "ko" else [
                    "How do current transits affect me?",
                    "Tell me more about my rising sign",
                    "What are the major astrological events this year?",
                ]
                yield f"data: ||FOLLOWUP||{json.dumps(follow_ups, ensure_ascii=False)}\n\n"
                yield "data: [DONE]\n\n"

            except Exception as e:
                logger.error(f"[ASTROLOGY-ASK-STREAM] Streaming error: {e}")
                yield f"data: 오류가 발생했습니다: {str(e)}\n\n"
                yield "data: [DONE]\n\n"

        return Response(
            stream_with_context(generate()),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )

    def _build_system_prompt(
        self,
        locale: str,
        current_date_str: str,
        astro_detail: str,
        rag_context: str,
        user_context_section: str
    ) -> str:
        """Build astrology-focused system prompt."""
        if locale == "ko":
            return f"""너는 서양 점성술 전문 상담사다. 출생 차트 분석과 행성 트랜짓 전문가야.

절대 규칙:
1. 인사 금지 - 바로 분석 시작
2. 서양 점성술에만 집중 - 사주/동양 역술 언급 금지
3. 점성술 용어 사용 (별자리, 하우스, 애스펙트, 트랜짓 등)
4. 구체적인 행성 위치와 각도 언급

{current_date_str}

[출생 차트]
{astro_detail}

{rag_context}
{user_context_section}

응답 형식:
【태양/달】 태양과 달 별자리의 핵심 성격
【상승궁】 어센던트가 외적 페르소나에 미치는 영향
【트랜짓】 현재 행성 트랜짓과 그 영향
【하우스】 질문과 관련된 하우스 배치
【조언】 2-3개 실천 조언

200-300단어로 답변."""
        else:
            return f"""You are a Western Astrology counselor specializing in birth chart analysis.

RULES:
1. NO GREETING - Start directly with analysis
2. Focus ONLY on Western Astrology - NO Eastern fortune-telling
3. Use proper astrological terminology (signs, houses, aspects, transits)
4. Include specific planetary positions

{current_date_str}

[Birth Chart]
{astro_detail}

{rag_context}
{user_context_section}

Response format:
【Sun/Moon】 Core personality from Sun and Moon signs
【Rising】 Ascendant influence
【Transits】 Current planetary transits
【Houses】 Relevant house placements
【Guidance】 2-3 practical actions

200-300 words."""
