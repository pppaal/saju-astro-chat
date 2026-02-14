"""
Streaming Service

Business logic for streaming AI responses with Server-Sent Events (SSE).
Handles fortune telling, dream interpretation, and counseling with real-time streaming.

Moved from app.py to separate business logic from routing.
"""
import logging
import os
import time
from datetime import datetime
from typing import Dict, Any, Optional, Generator, List
from flask import Response, stream_with_context, g

logger = logging.getLogger(__name__)


class StreamingService:
    """
    Streaming service for AI-powered fortune telling with SSE.

    Methods:
        stream_fortune: Streaming fortune calculation with RAG and context
    """

    def __init__(self):
        """Initialize Streaming Service."""
        pass

    def stream_fortune(
        self,
        saju_data: Dict[str, Any],
        astro_data: Dict[str, Any],
        advanced_astro: Dict[str, Any],
        birth_data: Dict[str, Any],
        theme: str = "chat",
        locale: str = "ko",
        prompt: str = "",
        session_id: Optional[str] = None,
        conversation_history: List[Dict[str, Any]] = None,
        user_context: Dict[str, Any] = None,
        cv_text: str = "",
        request_id: Optional[str] = None
    ) -> Response:
        """
        Stream fortune telling with SSE (Server-Sent Events).

        This is the core business logic moved from app.py ask_stream() function.
        Logic remains 100% identical to ensure compatibility.

        Args:
            saju_data: Saju birth chart data
            astro_data: Astrology birth chart data
            advanced_astro: Advanced astrology features
            birth_data: Normalized birth data
            theme: Fortune theme (chat, career, love, etc.)
            locale: Language locale (en, ko)
            prompt: User's question/prompt (may be structured from frontend)
            session_id: Optional session ID for pre-fetched RAG data
            conversation_history: Previous messages for context
            user_context: Premium user context (persona, sessions, personality type)
            cv_text: CV/Resume text for career consultations
            request_id: Optional request ID for logging

        Returns:
            Flask Response with SSE stream (text/event-stream)
        """
        try:
            # Import dependencies (lazy loaded in app.py)
            from backend_ai.app.sanitizer import (
                is_suspicious_input,
                sanitize_user_input,
                sanitize_messages,
            )
            from backend_ai.app.app import (
                normalize_day_master,
                _has_saju_payload,
                _has_astro_payload,
                _calculate_simple_saju,
                validate_birth_data,
                _build_missing_payload_message,
                _build_birth_format_message,
                _sse_error_response,
                _build_detailed_saju,
                _build_detailed_astro,
                _build_advanced_astro_context,
                get_cross_analysis_for_chart,
                get_session_rag_cache,
                get_lifespan_guidance,
                get_theme_fusion_rules,
                get_active_imagination_prompts,
                _is_truthy,
                _bool_env,
                _get_int_env,
                _add_months,
                _format_date_ymd,
                _ensure_ko_prefix,
                _build_missing_requirements_addendum,
                _insert_addendum,
                _build_rag_debug_addendum,
                _format_korean_spacing,
                _to_sse_event,
                _chunk_text,
                _get_stream_chunk_size,
                _select_model_and_temperature,
                _clamp_temperature,
                _coerce_float,
            )

            # Crisis detection (if available)
            HAS_COUNSELING = False
            CrisisDetector = None
            try:
                from backend_ai.counseling.crisis import CrisisDetector
                HAS_COUNSELING = True
            except ImportError:
                pass

            # Corpus RAG (Jung psychology quotes)
            HAS_CORPUS_RAG = False
            get_corpus_rag = None
            try:
                from backend_ai.app.app import get_corpus_rag
                HAS_CORPUS_RAG = True
            except ImportError:
                pass

            if conversation_history is None:
                conversation_history = []
            if user_context is None:
                user_context = {}

            logger.info(f"[StreamingService] request_id={request_id} theme={theme} locale={locale} session={session_id or 'none'} history_len={len(conversation_history)} has_user_ctx={bool(user_context)} cv_len={len(cv_text)}")

            # Input validation - check for suspicious patterns
            if is_suspicious_input(prompt):
                logger.warning(f"[StreamingService] Suspicious input detected: {prompt[:100]}...")

            # Detect if frontend already sent a fully structured prompt
            is_frontend_structured = (
                "당신은 따뜻하고 전문적인 운명 상담사" in prompt or
                "You are a warm, professional destiny counselor" in prompt or
                "[사주/점성 기본 데이터]" in prompt or
                "★★★ 핵심 규칙 ★★★" in prompt
            )

            # Sanitize prompt
            sanitized_prompt = sanitize_user_input(prompt, max_length=8000 if is_frontend_structured else 1500, allow_newlines=True)

            # Debug flags
            debug_rag = _is_truthy(os.getenv("RAG_DEBUG_RESPONSE", ""))
            debug_log = _is_truthy(os.getenv("RAG_DEBUG_LOG", "")) or debug_rag

            # Extract current user question
            current_user_question = ""
            if "질문:" in sanitized_prompt:
                current_user_question = sanitized_prompt.split("질문:")[-1].strip()[:500]
            elif "Q:" in sanitized_prompt:
                current_user_question = sanitized_prompt.split("Q:")[-1].strip()[:500]
            else:
                current_user_question = sanitized_prompt[-500:] if sanitized_prompt else ""

            if is_frontend_structured:
                logger.info(f"[StreamingService] Detected STRUCTURED frontend prompt (len={len(prompt)})")

            # Normalize dayMaster structure (nested -> flat)
            saju_data = normalize_day_master(saju_data)

            logger.info(f"[StreamingService] saju dayMaster: {saju_data.get('dayMaster', {})}")

            # Check for pre-fetched RAG data from session
            session_cache = None
            session_rag_data = {}
            persona_context = {}
            rag_context = ""

            if session_id:
                session_cache = get_session_rag_cache(session_id)
                if session_cache:
                    logger.info(f"[StreamingService] Using pre-fetched session data for {session_id}")
                    # Use cached saju/astro if not provided in request
                    if not saju_data:
                        saju_data = session_cache.get("saju_data", {})
                    if not astro_data:
                        astro_data = session_cache.get("astro_data", {})

                    # Build rich RAG context from pre-fetched data
                    rag_data = session_cache.get("rag_data", {})
                    session_rag_data = rag_data

                    # GraphRAG context
                    if rag_data.get("graph_nodes"):
                        rag_context += "\n[📊 관련 지식 그래프]\n"
                        rag_context += "\n".join(rag_data["graph_nodes"][:8])

                    # Jung quotes
                    if rag_data.get("corpus_quotes"):
                        rag_context += "\n\n[📚 관련 융 심리학 인용]\n"
                        for q in rag_data["corpus_quotes"][:3]:
                            rag_context += f"• {q.get('text_ko', q.get('text_en', ''))} ({q.get('source', '')})\n"

                    # Persona insights
                    persona_context = rag_data.get("persona_context", {})
                    if persona_context.get("jung"):
                        rag_context += "\n[🧠 분석가 관점]\n"
                        rag_context += "\n".join(f"• {i}" for i in persona_context["jung"][:3])
                    if persona_context.get("stoic"):
                        rag_context += "\n\n[⚔️ 스토아 철학 관점]\n"
                        rag_context += "\n".join(f"• {i}" for i in persona_context["stoic"][:3])

                    logger.info(f"[StreamingService] RAG context from session: {len(rag_context)} chars")
                else:
                    logger.warning(f"[StreamingService] Session {session_id} not found or expired")

            # Allow birth-only computation if enabled
            allow_birth_compute = _bool_env("ALLOW_BIRTH_ONLY")
            if allow_birth_compute and (not _has_saju_payload(saju_data)) and birth_data.get("date") and birth_data.get("time"):
                try:
                    saju_data = _calculate_simple_saju(
                        birth_data["date"],
                        birth_data["time"],
                    )
                    saju_data = normalize_day_master(saju_data)
                    logger.info(f"[StreamingService] Computed simple saju from birth: {saju_data.get('dayMaster', {})}")
                except Exception as e:
                    logger.warning(f"[StreamingService] Failed to compute simple saju: {e}")

            # Validate required payloads
            has_saju_payload = _has_saju_payload(saju_data)
            has_astro_payload = _has_astro_payload(astro_data)
            require_computed_payload = _is_truthy(os.getenv("REQUIRE_COMPUTED_PAYLOAD", "1"))

            if require_computed_payload and (not has_saju_payload or not has_astro_payload):
                if birth_data.get("date") or birth_data.get("time"):
                    valid_birth, _err = validate_birth_data(birth_data.get("date"), birth_data.get("time"))
                    if not valid_birth:
                        logger.warning("[StreamingService] Invalid birth format for missing payload")
                        return _sse_error_response(_build_birth_format_message(locale))

                missing_message = _build_missing_payload_message(
                    locale,
                    missing_saju=not has_saju_payload,
                    missing_astro=not has_astro_payload,
                )
                logger.warning("[StreamingService] Missing computed payload(s)")
                return _sse_error_response(missing_message)

            # Build DETAILED chart context (not just summary)
            saju_detail = _build_detailed_saju(saju_data)
            astro_detail = _build_detailed_astro(astro_data)
            advanced_astro_detail = _build_advanced_astro_context(advanced_astro)

            logger.info(f"[StreamingService] saju_detail length: {len(saju_detail)}")
            logger.info(f"[StreamingService] astro_detail length: {len(astro_detail)}")
            if advanced_astro_detail:
                logger.info(f"[StreamingService] advanced_astro_detail length: {len(advanced_astro_detail)}")

            exclude_non_saju = os.getenv("EXCLUDE_NON_SAJU_ASTRO", "0") == "1"
            trace_enabled = os.getenv("RAG_TRACE", "0") == "1"

            # Get cross-analysis (from session or instant lookup)
            cross_rules = ""
            if session_cache and session_cache.get("rag_data", {}).get("cross_analysis"):
                cross_rules = session_cache["rag_data"]["cross_analysis"]
            else:
                try:
                    if exclude_non_saju and os.getenv("USE_CHROMADB", "0") == "1":
                        from backend_ai.app.rag.cross_store import (  # pylint: disable=import-outside-toplevel
                            build_cross_summary,
                        )
                        dm = saju_data.get("dayMaster", {}).get("heavenlyStem", "")
                        dm_element = saju_data.get("dayMaster", {}).get("element", "")
                        dominant_element = saju_data.get("dominantElement", "")
                        ten_gods = saju_data.get("tenGods", {}) or {}
                        dominant_god = ten_gods.get("dominant", "")
                        if isinstance(dominant_god, dict):
                            dominant_god = dominant_god.get("name", "") or dominant_god.get("ko", "") or ""

                        sun_sign = astro_data.get("sun", {}).get("sign", "")
                        moon_sign = astro_data.get("moon", {}).get("sign", "")
                        rising = astro_data.get("rising", {}).get("sign", "")
                        query_parts = [theme, dm, sun_sign, moon_sign, current_user_question[:120]]
                        cross_query = " ".join([p for p in query_parts if p])

                        cross_rules = build_cross_summary(
                            cross_query,
                            saju_seed=[dm, dm_element, dominant_element, dominant_god],
                            astro_seed=[sun_sign, moon_sign, rising],
                            top_k=12,
                        )
                        if cross_rules:
                            logger.info(f"[StreamingService] Cross-analysis from saju_astro_cross_v1 ({len(cross_rules)} chars)")
                    else:
                        cross_rules = get_cross_analysis_for_chart(saju_data, astro_data, theme, locale)
                        if cross_rules:
                            logger.info(f"[StreamingService] Instant cross-analysis: {len(cross_rules)} chars, theme={theme}")
                except Exception as e:
                    logger.warning(f"[StreamingService] Cross-analysis lookup failed: {e}")

            # Get Jung/Stoic insights if not from session (instant lookup)
            instant_quotes = []
            if not exclude_non_saju and not rag_context and HAS_CORPUS_RAG and get_corpus_rag:
                try:
                    _corpus_rag_inst = get_corpus_rag()
                    if _corpus_rag_inst:
                        # Build query from user context
                        theme_concepts = {
                            "career": "vocation calling purpose 소명 직업 자아실현",
                            "love": "anima animus relationship 관계 사랑 그림자",
                            "health": "healing wholeness 치유 통합",
                            "life_path": "individuation meaning 개성화 의미 성장",
                            "family": "complex archetype 콤플렉스 원형 가족",
                        }
                        jung_query = f"{theme_concepts.get(theme, theme)} {sanitized_prompt[:50] if sanitized_prompt else ''}"
                        quotes = _corpus_rag_inst.search(jung_query, top_k=3, min_score=0.15)
                        if quotes:
                            instant_quotes = quotes
                            rag_context += "\n\n[📚 융 심리학 통찰]\n"
                            for q in quotes[:2]:
                                quote_text = q.get('quote_kr') or q.get('quote_en', '')
                                if quote_text:
                                    rag_context += f"• \"{quote_text[:150]}...\" — 칼 융, {q.get('source', '')}\n"
                            logger.info(f"[StreamingService] Instant Jung quotes: {len(quotes)} found")
                except Exception as e:
                    logger.debug(f"[StreamingService] Instant Jung quotes failed: {e}")

            if exclude_non_saju and trace_enabled:
                logger.info("[RAG_TRACE] corpus_rag skipped count=0 reason=EXCLUDE_NON_SAJU_ASTRO")
                logger.info("[RAG_TRACE] persona_rag skipped count=0 reason=EXCLUDE_NON_SAJU_ASTRO")
                logger.info("[RAG_TRACE] domain_rag skipped count=0 reason=EXCLUDE_NON_SAJU_ASTRO")

            # Build cross-analysis section
            cross_section = ""
            if cross_rules:
                cross_section = f"\n[사주+점성 교차 해석 규칙]\n{cross_rules}\n"

            # Current date for time-relevant advice
            now = datetime.now()
            today_date = now.date()
            six_month_date = _add_months(today_date, 6)
            weekdays_ko = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"]
            current_date_str = f"오늘: {now.year}년 {now.month}월 {now.day}일 ({weekdays_ko[now.weekday()]})"
            timing_window_str = (
                f"타이밍 기준: {_format_date_ymd(today_date)} ~ {_format_date_ymd(six_month_date)}"
                if locale == "ko"
                else f"Timing window: {_format_date_ymd(today_date)} to {_format_date_ymd(six_month_date)}"
            )

            # Build user context section for returning users (premium feature)
            user_context_section = self._build_user_context_section(user_context, locale)

            # Build CV/Resume section
            cv_section = ""
            if cv_text:
                cv_section = f"""
[📄 사용자 이력서/CV]
{cv_text}

→ 위 이력서 내용을 참고하여 사용자의 경력, 기술, 경험에 맞는 구체적인 조언을 제공하세요.
→ 사주/점성 해석과 이력서 내용을 연결하여 개인화된 조언을 해주세요.
→ 커리어, 직업, 적성 관련 질문에는 이력서 정보를 적극 활용하세요.
"""
                logger.info(f"[StreamingService] CV section added: {len(cv_text)} chars, theme={theme}")

            # Lifespan guidance
            lifespan_section = self._build_lifespan_section(birth_data, saju_data)

            # Theme fusion rules
            theme_fusion_section = self._build_theme_fusion_section(saju_data, astro_data, theme, locale, birth_data)

            # Active imagination prompts
            imagination_section = self._build_imagination_section(sanitized_prompt)

            # Crisis detection
            crisis_response = None
            crisis_check = {"is_crisis": False, "max_severity": "none", "requires_immediate_action": False}
            if HAS_COUNSELING and CrisisDetector and current_user_question:
                crisis_check = CrisisDetector.detect_crisis(current_user_question)
                if crisis_check["is_crisis"]:
                    logger.warning(f"[StreamingService] Crisis detected! severity={crisis_check['max_severity']}")
                    crisis_response = CrisisDetector.get_crisis_response(
                        crisis_check["max_severity"],
                        locale=locale
                    )
                    if crisis_check["requires_immediate_action"]:
                        # Return safety response immediately via SSE
                        def crisis_generator():
                            msg = crisis_response.get("immediate_message", "")
                            if crisis_response.get("follow_up"):
                                msg += "\n\n" + crisis_response["follow_up"]
                            if crisis_response.get("closing"):
                                msg += "\n\n" + crisis_response["closing"]
                            yield f"data: {msg}\n\n"
                            yield "data: [DONE]\n\n"

                        return Response(
                            stream_with_context(crisis_generator()),
                            mimetype="text/event-stream",
                            headers={
                                "Cache-Control": "no-cache",
                                "Connection": "keep-alive",
                                "X-Accel-Buffering": "no",
                            }
                        )

            # Build crisis context for medium/medium_high severity
            crisis_context_section = self._build_crisis_context(crisis_response, crisis_check)

            # Build therapeutic context based on question type
            therapeutic_section = self._build_therapeutic_section(sanitized_prompt, locale, HAS_COUNSELING)

            # RAG metadata for debugging
            rag_meta = {}
            if debug_rag or debug_log:
                rag_meta = {
                    "enabled": True,
                    "theme": theme,
                    "question": current_user_question[:120],
                    "graph_nodes": len(session_rag_data.get("graph_nodes", [])),
                    "corpus_quotes": len(session_rag_data.get("corpus_quotes", [])) or len(instant_quotes),
                    "persona_jung": len(persona_context.get("jung", [])),
                    "persona_stoic": len(persona_context.get("stoic", [])),
                    "cross_analysis": bool(cross_rules),
                    "theme_fusion": bool(theme_fusion_section),
                    "lifespan": bool(lifespan_section),
                    "therapeutic": bool(therapeutic_section),
                    "session_rag": bool(session_cache),
                }
                if debug_log:
                    logger.info(
                        "[RAG-DEBUG] theme=%s q=%s graph=%s corpus=%s persona=%s cross=%s fusion=%s session=%s",
                        theme,
                        current_user_question[:80],
                        rag_meta["graph_nodes"],
                        rag_meta["corpus_quotes"],
                        rag_meta["persona_jung"] + rag_meta["persona_stoic"],
                        rag_meta["cross_analysis"],
                        rag_meta["theme_fusion"],
                        rag_meta["session_rag"],
                    )

            # Build system prompt
            system_prompt = self._build_system_prompt(
                is_frontend_structured=is_frontend_structured,
                locale=locale,
                theme=theme,
                timing_window_str=timing_window_str,
                current_date_str=current_date_str,
                rag_context=rag_context,
                cross_rules=cross_rules,
                saju_detail=saju_detail,
                astro_detail=astro_detail,
                advanced_astro_detail=advanced_astro_detail,
                cross_section=cross_section,
                user_context_section=user_context_section,
                cv_section=cv_section,
                lifespan_section=lifespan_section,
                theme_fusion_section=theme_fusion_section,
                imagination_section=imagination_section,
                crisis_context_section=crisis_context_section,
                therapeutic_section=therapeutic_section,
                sanitized_prompt=sanitized_prompt,
            )

            # Emotion tracking
            emotion_context = self._build_emotion_context(sanitized_prompt)
            if emotion_context:
                system_prompt = system_prompt.replace("[📏 응답 구조]", f"{emotion_context}\n[📏 응답 구조]")

            # Generate streaming response
            def generate():
                """SSE generator for streaming response."""
                try:
                    from openai import OpenAI
                    import httpx
                    client = OpenAI(
                        api_key=os.getenv("OPENAI_API_KEY"),
                        timeout=httpx.Timeout(60.0, connect=10.0)
                    )

                    # Build messages with conversation history
                    messages = [{"role": "system", "content": system_prompt}]

                    # Add conversation history - increased limit for better context
                    history_limit = 12  # 6 user + 6 assistant messages
                    recent_history = conversation_history[-history_limit:] if conversation_history else []

                    # Generate conversation summary for long sessions (>6 messages)
                    conversation_summary = ""
                    if len(conversation_history) > 6:
                        # Extract key topics from older messages
                        older_msgs = conversation_history[:-6]
                        topics = []
                        for m in older_msgs:
                            if m.get("role") == "user" and m.get("content"):
                                content = m["content"][:100]
                                if any(k in content for k in ["연애", "사랑", "결혼"]):
                                    topics.append("연애/관계")
                                elif any(k in content for k in ["취업", "이직", "커리어", "진로"]):
                                    topics.append("커리어/진로")
                                elif any(k in content for k in ["힘들", "우울", "지쳐"]):
                                    topics.append("감정적 어려움")
                                elif any(k in content for k in ["나는", "성격", "어떤 사람"]):
                                    topics.append("자기탐색")
                        if topics:
                            unique_topics = list(dict.fromkeys(topics))[:3]
                            conversation_summary = f"[📋 이전 대화 요약: {', '.join(unique_topics)} 주제로 대화함]\n"

                    # Add summary if available
                    if conversation_summary:
                        messages.append({
                            "role": "system",
                            "content": conversation_summary
                        })

                    # Smart truncation: recent messages get more space
                    for idx, msg in enumerate(recent_history):
                        if msg.get("role") in ("user", "assistant") and msg.get("content"):
                            # Older messages: shorter, Recent messages: longer
                            is_recent = idx >= len(recent_history) - 4
                            max_len = 800 if is_recent else 300
                            messages.append({
                                "role": msg["role"],
                                "content": msg["content"][:max_len]
                            })

                    # Add current user message
                    messages.append({"role": "user", "content": sanitized_prompt})

                    # Model selection
                    default_model = os.getenv("CHAT_MODEL") or os.getenv("FUSION_MODEL") or "gpt-4.1"
                    default_temp = _clamp_temperature(_coerce_float(os.getenv("CHAT_TEMPERATURE")), 0.75)
                    model_name, temperature, ab_variant = _select_model_and_temperature(
                        {"session_id": session_id},
                        default_model,
                        default_temp,
                        session_id,
                        request_id,
                    )

                    if debug_rag or debug_log:
                        rag_meta["model"] = model_name
                        rag_meta["temperature"] = temperature
                        rag_meta["ab_variant"] = ab_variant or ""

                    max_tokens = _get_int_env("ASK_STREAM_MAX_TOKENS", 1600, min_value=400, max_value=4000)

                    # Stream from OpenAI
                    stream = client.chat.completions.create(
                        model=model_name,
                        messages=messages,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        stream=True
                    )

                    full_text = ""

                    for chunk in stream:
                        if not chunk.choices or not chunk.choices[0].delta.content:
                            continue
                        token = chunk.choices[0].delta.content
                        full_text += token
                        yield _to_sse_event(token)

                    # Post-processing: send as final events
                    full_text = _ensure_ko_prefix(full_text, locale)

                    if full_text.strip().startswith("[ERROR]") or not full_text.strip():
                        yield "data: [DONE]\n\n"
                        return

                    # Build addendum
                    addendum = _build_missing_requirements_addendum(
                        full_text,
                        locale,
                        saju_data,
                        astro_data,
                        today_date,
                    )
                    if addendum:
                        yield _to_sse_event(f"\n\n{addendum}")

                    # Add RAG debug info
                    if debug_rag:
                        debug_addendum = _build_rag_debug_addendum(rag_meta, locale)
                        if debug_addendum:
                            yield _to_sse_event(f"\n\n{debug_addendum}")

                    # Add follow-up question if missing
                    if locale == "ko" and not full_text.rstrip().endswith("?"):
                        followup = " 혹시 지금 가장 궁금한 포인트가 뭐예요?"
                        yield _to_sse_event(followup)

                    # Signal end of stream
                    yield "data: [DONE]\n\n"

                except Exception as e:
                    logger.error(f"[StreamingService] Streaming error: {e}")
                    yield "data: [ERROR] 일시적인 오류가 발생했습니다.\n\n"

            return Response(
                stream_with_context(generate()),
                mimetype="text/event-stream",
                headers={
                    "Content-Type": "text/event-stream; charset=utf-8",
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",  # Disable nginx buffering
                }
            )

        except Exception as e:
            logger.exception(f"[StreamingService] request_id={request_id} stream_fortune failed: {e}")
            from flask import jsonify
            return jsonify({"status": "error", "message": str(e)}), 500

    def _build_user_context_section(self, user_context: Dict[str, Any], locale: str) -> str:
        """Build user context section for returning users (premium feature)."""
        if not user_context:
            return ""

        user_context_section = ""
        persona = user_context.get("persona", {})
        recent_sessions = user_context.get("recentSessions", [])
        personality_type = user_context.get("personalityType", {})

        # Nova Personality Type (from personality quiz)
        if personality_type.get("typeCode"):
            type_code = personality_type["typeCode"]
            type_name = personality_type.get("personaName", "")
            user_context_section = f"\n[🎭 사용자 성격 유형: {type_code}]\n"
            if type_name:
                user_context_section += f"• 유형명: {type_name}\n"

            # Lookup archetype details for counseling approach
            archetype_hints = {
                "RVLA": "전략적 관점에서 조언. 큰 그림과 실행 계획 제시. 직접적 소통 선호.",
                "RVLF": "다양한 옵션과 가능성 제시. 실험적 접근 권장. 창의적 해결책 탐색.",
                "RVHA": "비전과 의미 연결. 스토리텔링 활용. 동기부여 중심 조언.",
                "RVHF": "영감과 새로운 관점 제시. 사회적 연결 강조. 열정적 소통.",
                "RSLA": "명확한 단계별 실행 계획 제시. 책임과 결과 강조. 효율적 조언.",
                "RSLF": "즉각적이고 실용적인 해결책. 현장 감각 활용. 위기 대응 관점.",
                "RSHA": "관계와 성장 중심. 따뜻하면서도 체계적. 안정적 환경 강조.",
                "RSHF": "참여와 소통 중심. 다양한 관점 포용. 함께하는 해결.",
                "GVLA": "근본 원인 분석. 장기적 관점. 체계적이고 깊은 해결책.",
                "GVLF": "데이터와 증거 기반 접근. 체계적 분석. 패턴 활용.",
                "GVHA": "성장과 발전 중심. 장기적 관계. 멘토링 관점.",
                "GVHF": "의미와 목적 연결. 깊은 질문. 진정성 있는 대화.",
                "GSLA": "단계별 검증된 방법 권장. 안정적 실행 지원. 리스크 관리.",
                "GSLF": "문제를 작게 분해. 하나씩 체계적 해결. 정밀한 접근.",
                "GSHA": "안정과 신뢰 기반. 점진적 변화 권장. 꾸준한 지원.",
                "GSHF": "갈등 해소와 조화 중심. 경청과 중재. 부드러운 접근.",
            }
            if type_code in archetype_hints:
                user_context_section += f"• 상담 스타일: {archetype_hints[type_code]}\n"

            user_context_section += "\n→ 이 사용자의 성격 유형에 맞게 소통 스타일을 조절하세요.\n"
            logger.info(f"[StreamingService] Personality type: {type_code}")

        if persona.get("sessionCount", 0) > 0 or recent_sessions:
            if not user_context_section:
                user_context_section = "\n[🔄 이전 상담 맥락]\n"
            else:
                user_context_section += "\n[🔄 이전 상담 맥락]\n"

            # Persona memory
            if persona.get("sessionCount"):
                user_context_section += f"• 총 {persona['sessionCount']}회 상담한 재방문 고객\n"
            if persona.get("lastTopics"):
                topics = persona["lastTopics"][:3] if isinstance(persona["lastTopics"], list) else []
                if topics:
                    user_context_section += f"• 주요 관심사: {', '.join(topics)}\n"
            if persona.get("emotionalTone"):
                user_context_section += f"• 감정 상태: {persona['emotionalTone']}\n"
            if persona.get("recurringIssues"):
                issues = persona["recurringIssues"][:2] if isinstance(persona["recurringIssues"], list) else []
                if issues:
                    user_context_section += f"• 반복 이슈: {', '.join(issues)}\n"

            # Recent session summaries
            if recent_sessions:
                user_context_section += "\n[최근 대화]\n"
                for sess in recent_sessions[:2]:  # Last 2 sessions
                    if sess.get("summary"):
                        user_context_section += f"• {sess['summary']}\n"
                    elif sess.get("keyTopics"):
                        topics_str = ", ".join(sess["keyTopics"][:3]) if isinstance(sess["keyTopics"], list) else ""
                        if topics_str:
                            user_context_section += f"• 주제: {topics_str}\n"

            user_context_section += "\n→ 재방문 고객이니 '또 오셨네요' 같은 친근한 인사로 시작하고, 이전 상담 내용을 자연스럽게 참조하세요.\n"
            logger.info(f"[StreamingService] User context section: {len(user_context_section)} chars")

        return user_context_section

    def _build_lifespan_section(self, birth_data: Dict[str, Any], saju_data: Dict[str, Any]) -> str:
        """Build lifespan guidance section (age-appropriate psychological tasks)."""
        from backend_ai.app.app import get_lifespan_guidance

        lifespan_section = ""
        birth_year = None
        try:
            # Extract birth year from birth_data or saju_data
            if birth_data.get("date"):
                birth_year = int(birth_data["date"].split("-")[0])
            elif saju_data.get("birthYear"):
                birth_year = int(saju_data["birthYear"])
        except (ValueError, KeyError, TypeError, AttributeError):
            pass

        if birth_year:
            lifespan_guidance = get_lifespan_guidance(birth_year)
            if lifespan_guidance and lifespan_guidance.get("stage_name"):
                stage = lifespan_guidance
                lifespan_section = f"""
[🌱 생애주기별 심리 과제: {stage['stage_name']} ({stage['age']}세)]
• 발달 과제: {', '.join(stage.get('psychological_tasks', [])[:3])}
• 핵심 원형: {stage.get('archetypal_themes', {}).get('primary', [''])[0] if isinstance(stage.get('archetypal_themes', {}).get('primary'), list) else ''}
• 흔한 위기: {', '.join(stage.get('developmental_crises', stage.get('shadow_challenges', []))[:2])}
• 사주 연결: {stage.get('saju_parallel', {}).get('theme', '')}
• 점성 연결: {stage.get('astro_parallel', {}).get('theme', '')}

→ 이 생애 단계에 맞는 조언을 해주세요. 나이에 맞지 않는 조언(예: 20대에게 '은퇴 준비')은 피하세요.
"""
                logger.info(f"[StreamingService] Lifespan guidance: {stage['stage_name']} (age {stage['age']})")

        return lifespan_section

    def _build_theme_fusion_section(self, saju_data: Dict[str, Any], astro_data: Dict[str, Any],
                                   theme: str, locale: str, birth_data: Dict[str, Any]) -> str:
        """Build theme fusion rules section (daily/monthly/yearly guidance)."""
        from backend_ai.app.app import get_theme_fusion_rules

        theme_fusion_section = ""
        birth_year = None
        try:
            if birth_data.get("date"):
                birth_year = int(birth_data["date"].split("-")[0])
            elif saju_data.get("birthYear"):
                birth_year = int(saju_data["birthYear"])
        except (ValueError, KeyError, TypeError, AttributeError):
            pass

        try:
            theme_fusion = get_theme_fusion_rules(saju_data, astro_data, theme, locale, birth_year)
            if theme_fusion:
                theme_fusion_section = f"""
[🎯 테마별 융합 해석]
{theme_fusion}

→ 위 테마별 해석을 상담 내용에 자연스럽게 녹여서 전달하세요.
"""
                logger.info(f"[StreamingService] Theme fusion rules added: {len(theme_fusion)} chars, theme={theme}")
        except Exception as e:
            logger.warning(f"[StreamingService] Theme fusion rules failed: {e}")

        return theme_fusion_section

    def _build_imagination_section(self, prompt: str) -> str:
        """Build active imagination prompts section (deep therapeutic work)."""
        from backend_ai.app.app import get_active_imagination_prompts

        imagination_section = ""
        if prompt and any(k in prompt.lower() for k in ["깊이", "내면", "무의식", "그림자", "명상", "상상"]):
            ai_prompts = get_active_imagination_prompts(prompt)
            if ai_prompts:
                imagination_section = f"""
[🎨 적극적 상상 기법 - 심층 작업용]
• 시작 질문: {ai_prompts.get('opening', [''])[0] if ai_prompts.get('opening') else ''}
• 심화 질문: {ai_prompts.get('deepening', [''])[0] if ai_prompts.get('deepening') else ''}
• 통합 질문: {ai_prompts.get('integration', [''])[0] if ai_prompts.get('integration') else ''}

→ 사용자가 깊은 내면 작업을 원할 때만 이 질문들을 활용하세요. 강요하지 마세요.
"""
                logger.info(f"[StreamingService] Active imagination prompts added")

        return imagination_section

    def _build_crisis_context(self, crisis_response: Optional[Dict], crisis_check: Dict) -> str:
        """Build crisis context section for medium/medium_high severity."""
        crisis_context_section = ""
        if crisis_response and not crisis_check.get("requires_immediate_action"):
            severity = crisis_check.get("max_severity", "")
            if severity == "medium_high":
                crisis_context_section = """
[⚠️ 사용자 감정 상태: 높은 스트레스]
- 공감과 안정감을 주는 톤으로 응답하세요
- 먼저 감정을 인정하고 호흡/그라운딩 기법을 안내하세요
- 점술 해석은 희망적인 관점으로 부드럽게 전달하세요
- 필요시 전문 상담 권유: 정신건강위기상담전화 1577-0199
"""
            elif severity == "medium":
                crisis_context_section = """
[⚠️ 사용자 감정 상태: 희망 저하]
- 공감과 따뜻함을 담아 응답하세요
- 작은 희망이라도 찾을 수 있도록 도와주세요
- 점술 해석에서 긍정적 가능성을 강조하세요
- "혼자가 아니에요"라는 메시지를 자연스럽게 전달하세요
"""
            logger.info(f"[StreamingService] Added crisis context for severity={severity}")

        return crisis_context_section

    def _build_therapeutic_section(self, prompt: str, locale: str, has_counseling: bool) -> str:
        """Build therapeutic guidance based on question type (Jung psychology enhanced)."""
        therapeutic_section = ""
        if not (has_counseling and prompt):
            return therapeutic_section

        prompt_lower = prompt.lower()

        # Detect question themes and add therapeutic guidance
        if any(k in prompt_lower for k in ["힘들", "우울", "지쳐", "포기", "의미없", "허무"]):
            therapeutic_section = """
[🧠 심리상담 가이드: 의미/정서 지지]
- 먼저 감정을 충분히 인정: "정말 힘드셨겠어요... 그 무게를 혼자 지고 계셨군요"
- 융 관점: "영혼의 어두운 밤(dark night of soul)"은 변화의 전조
- 사주/점성에서 '전환점'이나 '성장기'를 찾아 희망 연결
- 그림자 작업: "이 힘듦이 당신에게 가르치려는 게 있다면?"
- 작은 액션 제안: "오늘 하나만 자신을 위해 한다면 뭘 하고 싶으세요?"
"""
        elif any(k in prompt_lower for k in ["연애", "사랑", "결혼", "이별", "짝사랑", "썸"]):
            therapeutic_section = """
[🧠 심리상담 가이드: 관계/사랑]
- 감정의 깊이를 인정: "마음이 많이 쓰이시네요"
- 융 관점 - 아니마/아니무스 투사: "끌리는 그 특성이 혹시 내 안에도 있다면?"
- 그림자 투사: "싫은 그 점... 내 그림자는 아닐까요?"
- 사주 관성(官星)/점성 금성-7하우스 해석을 심리적 패턴과 연결
- 질문으로 마무리: "상대에게 진짜 원하는 건 뭘까요?" / "완벽한 관계란 어떤 모습이에요?"
"""
        elif any(k in prompt_lower for k in ["취업", "이직", "진로", "사업", "퇴사", "커리어"]):
            therapeutic_section = """
[🧠 심리상담 가이드: 커리어/정체성]
- 불안감 인정: "중요한 결정 앞에서 고민이 깊으시네요"
- 융 관점 - 소명(calling): "돈을 떠나서, 진짜 하고 싶은 일은 뭐예요?"
- 페르소나 vs 자기(Self): "일하는 나 vs 진짜 나, 얼마나 다른가요?"
- 사주 식상/재성과 점성 10하우스/MC 연결하여 적성 분석
- 구체적 시기 제시: "2025년 상반기가 전환점" 식으로
- 질문: "돈 vs 보람, 지금 더 중요한 건?" / "5년 뒤 어떤 모습이고 싶으세요?"
"""
        elif any(k in prompt_lower for k in ["언제", "시기", "타이밍", "몇 월", "올해", "내년"]):
            therapeutic_section = """
[🧠 심리상담 가이드: 시기/타이밍]
- 구체적 시기 제시 필수: 사주 대운/세운 + 점성 트랜짓 분석
- 월/분기 단위로 명확하게: "2025년 3-4월이 좋아요"
- 왜 그 시기인지 설명: "목성이 ~에 들어오면서..."
- 그 시기에 할 일 제안: "이 시기에 [구체적 행동]을 시작하면 좋겠어요"
- 주의할 시기도 함께: "다만 ~월은 신중하게"
"""

        return therapeutic_section

    def _build_system_prompt(self, **kwargs) -> str:
        """Build system prompt for OpenAI (full structured prompt)."""
        # Extract all kwargs
        is_frontend_structured = kwargs.get("is_frontend_structured", False)
        locale = kwargs.get("locale", "ko")
        theme = kwargs.get("theme", "chat")
        timing_window_str = kwargs.get("timing_window_str", "")
        current_date_str = kwargs.get("current_date_str", "")
        rag_context = kwargs.get("rag_context", "")
        cross_rules = kwargs.get("cross_rules", "")
        saju_detail = kwargs.get("saju_detail", "")
        astro_detail = kwargs.get("astro_detail", "")
        advanced_astro_detail = kwargs.get("advanced_astro_detail", "")
        cross_section = kwargs.get("cross_section", "")
        user_context_section = kwargs.get("user_context_section", "")
        cv_section = kwargs.get("cv_section", "")
        lifespan_section = kwargs.get("lifespan_section", "")
        theme_fusion_section = kwargs.get("theme_fusion_section", "")
        imagination_section = kwargs.get("imagination_section", "")
        crisis_context_section = kwargs.get("crisis_context_section", "")
        therapeutic_section = kwargs.get("therapeutic_section", "")

        # FRONTEND STRUCTURED PROMPT - Use simplified backend system prompt
        if is_frontend_structured:
            # Build RAG-only enrichment section
            rag_enrichment_parts = []

            # 1. Cross-analysis rules
            if cross_rules:
                rag_enrichment_parts.append(f"[🔗 사주+점성 교차 해석 규칙]\n{cross_rules[:1500]}")

            # 2. Jung/Stoic quotes from RAG
            if rag_context:
                rag_enrichment_parts.append(rag_context)

            # 3. Lifespan guidance
            if lifespan_section:
                rag_enrichment_parts.append(lifespan_section)

            # 4. Theme fusion rules
            if theme_fusion_section:
                rag_enrichment_parts.append(theme_fusion_section)

            # 5. Therapeutic guidance
            if therapeutic_section:
                rag_enrichment_parts.append(therapeutic_section)

            # 6. Crisis context
            if crisis_context_section:
                rag_enrichment_parts.append(crisis_context_section)

            # 7. User context
            if user_context_section:
                rag_enrichment_parts.append(user_context_section)

            # 8. CV section
            if cv_section:
                rag_enrichment_parts.append(cv_section)

            rag_enrichment = "\n\n".join(rag_enrichment_parts) if rag_enrichment_parts else ""

            # Simplified system prompt for frontend-structured requests
            if locale == "en":
                system_prompt = f"""You are a Saju+Astrology integrated counselor. Speak naturally and weave the data into your sentences. Start the first sentence directly with an answer (e.g., "So," or "Right now,").

ABSOLUTELY AVOID:
- Formal greetings ("Hello", "Nice to meet you")
- Self-introductions
- Bullet lists or numbered lists
- Bold text

STYLE:
- Conversational and warm, but concise
- Use 3 short paragraphs (summary -> evidence/patterns -> timing/action + question)
- End with exactly one follow-up question

EVIDENCE REQUIRED (inline, not as a list):
- At least one Saju reference (day master / ten gods / five elements / daeun or annual fortune)
- At least one Astrology reference (Sun/Moon/ASC plus a planet+house if possible)
- Give 2-3 timing windows within 6 months using month+week phrasing, and include one caution point
- Theme lock: focus strictly on theme="{theme}". Do not drift to other domains.

{timing_window_str}

Additional knowledge:
{rag_enrichment if rag_enrichment else "(none)"}

Response length: 400-600 words, {locale}, natural spoken tone."""
            else:
                system_prompt = f"""사주+점성 통합 상담사. 친구에게 말하듯 자연스럽게, 데이터를 녹여서 해석해. 첫 문장은 '이야'로 시작해(말줄임표 가능).

🚫 절대 금지:
- "일간이 X입니다" 나열식 설명 (사용자는 이미 자기 차트 알고 있음)
- "안녕하세요" 인사
- "조심하세요" "좋아질 거예요" 뜬구름 말
- **볼드체**, 번호 매기기, 목록 나열

✅ 올바른 스타일:
- 카페에서 친구한테 얘기하듯 자연스럽게
- 데이터를 문장 속에 녹여서 (나열 X)
- 실생활과 연결해서 설명
- 해요체로 친근하게 (너무 딱딱한 문어체 금지)
- 말투는 부드럽고 다정하게, 단정 대신 '~같아/가능성' 표현 사용
- 문단 3개 내외 (핵심 요약 → 근거/패턴 → 타이밍/행동 + 질문)

✅ 근거 필수:
- 사주 근거 1개 이상(일간/대운/세운 중 1개) + 오행/십성 반드시 언급
- 점성 근거 1개 이상(태양/달/ASC 중 1개) + 행성/하우스 반드시 언급(가능하면 각 1개)
- 근거는 문장 속에 자연스럽게 포함 (나열 금지)
- 6개월 타이밍 2~3개를 월+주 단위로 제시(예: 3월 2~3주차)
- 타이밍 중 1개는 주의점/피해야 할 포인트 포함
- 테마 고정: theme="{theme}"만 다루고 다른 테마로 흐르지 말 것.
- 마지막에 후속 질문 1개

📅 {timing_window_str}

📚 추가 지식:
{rag_enrichment if rag_enrichment else "(없음)"}

📌 500-800자, {locale}, 자연스러운 구어체"""

            logger.info(f"[StreamingService] Using SIMPLIFIED system prompt for frontend-structured request (RAG enrichment: {len(rag_enrichment)} chars)")

        else:
            # LEGACY PATH - Build full system prompt (for non-frontend requests)
            counselor_persona = """당신은 사주+점성술 통합 상담사입니다.

⚠️ 절대 규칙:
1. 인사 금지 - "안녕하세요", "반가워요" 등 인사 절대 금지
2. 신상 소개 금지 - "일간이 X입니다", "당신은 Y 성향" 같은 기본 설명 금지. 사용자는 이미 자기 사주를 안다. 바로 질문에 답해.
3. 제공된 데이터만 사용 - 대운/세운을 지어내지 마세요. 아래 [사주 분석]에 있는 그대로만 인용
4. 첫 문장부터 사용자 질문에 대한 답변으로 시작

💬 상담 스타일:
• 상세하고 깊이 있는 분석 (400-600단어)
• 사주와 점성술 균형있게 활용하되 자연스럽게 녹여내
• 구체적 날짜/시기 제시
• '왜 그런지' 이유를 충분히 설명
• 융 심리학 인용이 있으면 해석에 자연스럽게 녹여서 깊이 더하기"""

            if locale == "en":
                counselor_persona = """You are an integrated Saju + Astrology counselor.

ABSOLUTE RULES:
1. No greetings or self-introductions.
2. Answer the user's question from the first sentence.
3. Use only provided data; do not invent 운 or placements.

STYLE:
- 3 short paragraphs (summary -> evidence/patterns -> timing/action + question)
- Provide concrete timing windows within 6 months, including one caution
- Keep the tone warm and practical
"""

            # Build advanced astrology section
            advanced_astro_section = ""
            if advanced_astro_detail:
                advanced_astro_section = f"""

[🔭 심층 점성 분석]
{advanced_astro_detail}
"""

            if locale == "en":
                system_prompt = f"""{counselor_persona}

{timing_window_str}

[SAJU ANALYSIS]
{saju_detail}

[ASTROLOGY ANALYSIS]
{astro_detail}
{advanced_astro_section}{cross_section}
{rag_context}
{user_context_section}{cv_section}{lifespan_section}{theme_fusion_section}{imagination_section}{crisis_context_section}{therapeutic_section}

[RESPONSE RULES]
- Include at least one Saju reference (day master / ten gods / five elements / daeun or annual fortune)
- Include at least one Astrology reference (Sun/Moon/ASC + planet+house if possible)
- 2-3 timing windows within 6 months (month+week phrasing), include one caution
- End with exactly one follow-up question
- Theme lock: focus strictly on theme="{theme}". Do not drift to other domains.
- Respond in English only
"""
            else:
                system_prompt = f"""{counselor_persona}

⚠️ {current_date_str} - 과거 날짜를 미래처럼 말하지 마세요
⚠️ {timing_window_str} - 이 범위 안에서 2~3개 시기를 제시하세요

[📊 사주 분석]
{saju_detail}

[🌟 점성 분석]
{astro_detail}
{advanced_astro_section}{cross_section}
{rag_context}
{user_context_section}{cv_section}{lifespan_section}{theme_fusion_section}{imagination_section}{crisis_context_section}{therapeutic_section}

[🎯 응답 스타일]
• 첫 문장부터 사용자 질문에 직접 답변 - 신상 소개 NO
• 사주와 점성술 통찰을 자연스럽게 녹여서 설명
• '왜 그런지' 이유를 상세히 풀어서 설명
• 구체적인 날짜/시기 반드시 포함
• 실천 가능한 구체적 조언 제공
• 융 심리학 인용이 있으면 1-2문장 자연스럽게 활용 (딱딱하게 인용 X)

❌ 절대 금지:
• 인사/환영 멘트 ("안녕하세요", "다시 찾아주셨네요")
• 신상 소개 ("일간이 X입니다", "당신은 Y 성향" 등)
• 대운/세운 지어내기 (위 데이터에 없는 것 언급)
• 추상적 말만 나열 (구체적 시기 없이)
• 피상적이고 짧은 답변

📌 응답 길이: 400-600단어로 충분히 상세하게 ({locale})"""

        return system_prompt

    def _build_emotion_context(self, prompt: str) -> str:
        """Build emotion tracking context."""
        emotion_context = ""
        if not prompt:
            return emotion_context

        prompt_lower = prompt.lower()

        # Detect emotional indicators
        emotions_detected = []
        if any(k in prompt_lower for k in ["힘들", "지쳐", "피곤", "지침"]):
            emotions_detected.append("exhausted")
        if any(k in prompt_lower for k in ["우울", "슬퍼", "눈물", "울고"]):
            emotions_detected.append("sad")
        if any(k in prompt_lower for k in ["불안", "걱정", "두려", "무서"]):
            emotions_detected.append("anxious")
        if any(k in prompt_lower for k in ["화나", "짜증", "억울", "분노"]):
            emotions_detected.append("angry")
        if any(k in prompt_lower for k in ["외로", "혼자", "고독"]):
            emotions_detected.append("lonely")
        if any(k in prompt_lower for k in ["설레", "기대", "행복", "좋아"]):
            emotions_detected.append("hopeful")
        if any(k in prompt_lower for k in ["혼란", "모르겠", "어떻게", "뭘 해야"]):
            emotions_detected.append("confused")

        if emotions_detected:
            emotion_map = {
                "exhausted": "지침/피로",
                "sad": "슬픔/우울",
                "anxious": "불안/걱정",
                "angry": "분노/답답",
                "lonely": "외로움",
                "hopeful": "희망/설렘",
                "confused": "혼란/방향상실"
            }
            detected_ko = [emotion_map.get(e, e) for e in emotions_detected]
            emotion_context = f"\n[💭 감지된 감정 상태: {', '.join(detected_ko)}]\n→ 이 감정을 먼저 인정하고 공감하세요. 성급히 해결책으로 넘어가지 마세요.\n"
            logger.info(f"[StreamingService] Emotion detected: {emotions_detected}")

        return emotion_context
