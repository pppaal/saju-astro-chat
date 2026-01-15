"""
Saju Counselor Service

Provides saju-only counselor functionality with streaming chat.
Focuses exclusively on Eastern Four Pillars of Destiny (사주명리학).

Phase 3.2: Extracted from app.py (331 lines)
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


class SajuCounselorService:
    """
    Saju Counselor service for saju-only fortune telling.

    Handles:
    - Session initialization with RAG pre-fetching
    - SSE streaming chat responses
    - Saju-specific analysis (no astrology)
    - Korean/English language support
    """

    def __init__(self):
        """Initialize SajuCounselorService."""
        pass

    def initialize_session(
        self,
        saju_data: dict,
        birth_data: dict,
        theme: str = "life",
        locale: str = "ko",
        request_id: str = None
    ) -> tuple:
        """
        Initialize saju-only counselor session with pre-fetched RAG data.

        Args:
            saju_data: Saju chart data
            birth_data: Birth information
            theme: Counseling theme
            locale: Language locale
            request_id: Request ID for logging

        Returns:
            Tuple of (response_dict, status_code)
        """
        from backend_ai.app.app import (
            normalize_day_master,
            _has_saju_payload,
            _is_truthy,
            validate_birth_data,
            _build_birth_format_message,
            _build_missing_payload_message,
            _bool_env,
            _calculate_simple_saju,
            set_session_rag_cache,
            HAS_GRAPH_RAG,
        )

        # Normalize dayMaster structure
        saju_data = normalize_day_master(saju_data)

        has_saju_payload = _has_saju_payload(saju_data)
        require_computed_payload = _is_truthy(os.getenv("REQUIRE_COMPUTED_PAYLOAD", "1"))

        if require_computed_payload and not has_saju_payload:
            if birth_data.get("date") or birth_data.get("time"):
                valid_birth, _err = validate_birth_data(birth_data.get("date"), birth_data.get("time"))
                if not valid_birth:
                    logger.warning("[SAJU-COUNSELOR-INIT] Invalid birth format for missing payload")
                    return {"status": "error", "message": _build_birth_format_message(locale)}, 400
            missing_message = _build_missing_payload_message(
                locale,
                missing_saju=True,
                missing_astro=False,
            )
            logger.warning("[SAJU-COUNSELOR-INIT] Missing computed saju payload")
            return {"status": "error", "message": missing_message}, 400

        logger.info(f"[SAJU-COUNSELOR-INIT] id={request_id} theme={theme}")

        # Compute saju if not provided but birth info is available
        if _bool_env("ALLOW_BIRTH_ONLY") and (not _has_saju_payload(saju_data)) and birth_data.get("date") and birth_data.get("time"):
            try:
                saju_data = _calculate_simple_saju(
                    birth_data["date"],
                    birth_data["time"],
                )
                saju_data = normalize_day_master(saju_data)
                logger.info(f"[SAJU-COUNSELOR-INIT] Computed simple saju from birth: {saju_data.get('dayMaster', {})}")
            except Exception as e:
                logger.warning(f"[SAJU-COUNSELOR-INIT] Failed to compute simple saju: {e}")

        # Generate session ID
        session_id = str(uuid4())[:12]

        start_time = time.time()

        # Pre-fetch saju-specific RAG data only (no astrology)
        rag_data = {
            "graph_nodes": [],
            "corpus_quotes": [],
            "persona_context": {},
        }

        # Load saju-specific graph rules
        if HAS_GRAPH_RAG:
            try:
                from backend_ai.app.saju_astro_rag import search_graphs
                day_master = saju_data.get("dayMaster", {}).get("heavenlyStem", "")
                queries = [
                    f"사주 일간 {day_master} 특성",
                    f"오행 균형 분석",
                    f"대운 세운 해석",
                    f"사주 {theme} 운세",
                ]
                for q in queries:
                    nodes = search_graphs(q, top_k=3)
                    for node in nodes:
                        text = node.get("description") or node.get("label") or ""
                        if text:
                            rag_data["graph_nodes"].append(text)
            except Exception as e:
                logger.warning(f"[SAJU-COUNSELOR-INIT] Graph RAG failed: {e}")

        prefetch_time_ms = int((time.time() - start_time) * 1000)
        rag_data["prefetch_time_ms"] = prefetch_time_ms

        # Store in session cache
        set_session_rag_cache(session_id, {
            "rag_data": rag_data,
            "saju_data": saju_data,
            "astro_data": {},
            "theme": theme,
            "counselor_type": "saju",
        })

        return {
            "status": "success",
            "session_id": session_id,
            "prefetch_time_ms": prefetch_time_ms,
            "data_summary": {
                "graph_nodes": len(rag_data.get("graph_nodes", [])),
            }
        }, 200

    def stream_chat(
        self,
        saju_data: dict,
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
        Streaming chat for saju-only counselor using SSE.

        Args:
            saju_data: Saju chart data
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
            normalize_day_master,
            _has_saju_payload,
            _is_truthy,
            validate_birth_data,
            _build_birth_format_message,
            _build_missing_payload_message,
            _bool_env,
            _calculate_simple_saju,
            get_session_rag_cache,
            _build_detailed_saju,
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

        # Normalize dayMaster structure
        saju_data = normalize_day_master(saju_data)

        logger.info(f"[SAJU-ASK-STREAM] id={request_id} theme={theme} locale={locale}")

        # Check for pre-fetched RAG data from session
        session_cache = None
        rag_context = ""
        if session_id:
            session_cache = get_session_rag_cache(session_id)
            if session_cache:
                if not saju_data:
                    saju_data = session_cache.get("saju_data", {})

                rag_data = session_cache.get("rag_data", {})
                if rag_data.get("graph_nodes"):
                    rag_context += "\n[사주 관련 지식]\n"
                    rag_context += "\n".join(rag_data["graph_nodes"][:8])

        # Compute saju if not provided (optional fallback)
        if _bool_env("ALLOW_BIRTH_ONLY") and (not _has_saju_payload(saju_data)) and birth_data.get("date") and birth_data.get("time"):
            try:
                saju_data = _calculate_simple_saju(
                    birth_data["date"],
                    birth_data["time"],
                )
                saju_data = normalize_day_master(saju_data)
            except Exception as e:
                logger.warning(f"[SAJU-ASK-STREAM] Failed to compute simple saju: {e}")

        has_saju_payload = _has_saju_payload(saju_data)
        require_computed_payload = _is_truthy(os.getenv("REQUIRE_COMPUTED_PAYLOAD", "1"))

        if require_computed_payload and not has_saju_payload:
            if birth_data.get("date") or birth_data.get("time"):
                valid_birth, _err = validate_birth_data(birth_data.get("date"), birth_data.get("time"))
                if not valid_birth:
                    logger.warning("[SAJU-ASK-STREAM] Invalid birth format for missing payload")
                    return _sse_error_response(_build_birth_format_message(locale))
            missing_message = _build_missing_payload_message(
                locale,
                missing_saju=True,
                missing_astro=False,
            )
            logger.warning("[SAJU-ASK-STREAM] Missing computed saju payload")
            return _sse_error_response(missing_message)

        # Build detailed saju context (NO astrology)
        saju_detail = _build_detailed_saju(saju_data)

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

        # Build saju-focused system prompt
        system_prompt = self._build_system_prompt(
            locale, current_date_str, saju_detail, rag_context, user_context_section
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
                max_tokens = _get_int_env("SAJU_ASK_MAX_TOKENS", 700, min_value=300, max_value=2000)
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
                    saju_data,
                    {},
                    now.date(),
                    require_saju=True,
                    require_astro=False,
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
                    "올해 세운이 제 운세에 어떤 영향을 주나요?",
                    "제 용신은 무엇인가요?",
                    "오행 균형을 어떻게 맞출 수 있나요?",
                ] if locale == "ko" else [
                    "How does this year's luck affect me?",
                    "What is my favorable element?",
                    "How can I balance my five elements?",
                ]
                yield f"data: ||FOLLOWUP||{json.dumps(follow_ups, ensure_ascii=False)}\n\n"
                yield "data: [DONE]\n\n"

            except Exception as e:
                logger.error(f"[SAJU-ASK-STREAM] Streaming error: {e}")
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
        saju_detail: str,
        rag_context: str,
        user_context_section: str
    ) -> str:
        """Build saju-focused system prompt."""
        if locale == "ko":
            return f"""너는 사주(四柱) 전문 상담사다. 동양 명리학 전문가로서 상담해.

절대 규칙:
1. 인사 금지 - 바로 분석 시작
2. 사주 분석에만 집중 - 서양 점성술 언급 금지
3. 제공된 대운/세운 데이터만 사용
4. 한국 사주 용어 사용 (일간, 용신, 대운, 세운, 오행 등)

{current_date_str}

[사주 명식]
{saju_detail}

{rag_context}
{user_context_section}

응답 형식:
【일간】 일간의 특성과 현재 상태
【대운】 현재 대운 분석
【세운】 올해 세운 분석
【오행】 오행 균형과 보완 방법
【조언】 2-3개 실천 조언

200-300단어로 답변."""
        else:
            return f"""You are a Saju (Four Pillars of Destiny) counselor specializing in Eastern fortune-telling.

RULES:
1. NO GREETING - Start directly with analysis
2. Focus ONLY on Saju - NO Western astrology
3. Use only provided daeun/seun data
4. Use proper Saju terminology

{current_date_str}

[Saju Chart]
{saju_detail}

{rag_context}
{user_context_section}

Response format:
【Day Master】 Characteristics and current state
【Major Luck】 Current major luck cycle
【Annual Luck】 This year's luck
【Five Elements】 Balance and recommendations
【Advice】 2-3 practical actions

200-300 words."""
