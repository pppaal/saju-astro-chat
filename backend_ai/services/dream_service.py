"""
Dream Service

Business logic for dream interpretation chat with SSE streaming.
This service is independent of Flask and can be tested in isolation.

Moved from app.py to separate business logic from routing.
"""
import logging
import json
from typing import Dict, Any, List, Optional
from flask import Response, jsonify

logger = logging.getLogger(__name__)


class DreamService:
    """
    Dream interpretation service with RAG + Jung + Saju + Celestial context.

    Methods:
        stream_dream_chat: Streaming dream follow-up chat with SSE
    """

    def __init__(self):
        """Initialize Dream Service."""
        pass

    def stream_dream_chat(
        self,
        messages: List[Dict[str, Any]],
        dream_context: Dict[str, Any],
        language: str = "ko",
        session_id: Optional[str] = None,
        request_id: Optional[str] = None
    ) -> Response:
        """
        Stream dream follow-up chat with enhanced RAG + Saju + Celestial context.

        This is the core business logic moved from app.py dream_chat_stream() function.
        Logic remains 100% identical to ensure compatibility.

        Args:
            messages: List of conversation messages [{"role": "user"|"assistant", "content": "..."}]
            dream_context: Dream context dict with:
                - dream_text: Original dream content
                - summary: Interpretation summary
                - symbols: List of symbols
                - emotions: List of emotions
                - themes: List of themes
                - recommendations: List of recommendations
                - cultural_notes: Korean/Western interpretations
                - celestial: Moon phase and planetary data
                - saju: Birth data for fortune context
                - previous_consultations: Previous dream consultations
                - persona_memory: User personalization data
            language: Language locale ("ko" or "en")
            session_id: Optional session ID for continuity
            request_id: Optional request ID for logging

        Returns:
            Flask Response with SSE stream (text/event-stream)
        """
        try:
            # Import dependencies (lazy loaded in app.py)
            from flask import g, request
            from backend_ai.app.sanitizer import sanitize_messages
            from backend_ai.app.app import (
                get_counseling_engine,
                calculate_saju_data,
                get_current_transits,
                HAS_REALTIME,
                OPENAI_AVAILABLE,
                openai_client
            )

            logger.info(f"[DreamService] request_id={request_id} Processing enhanced streaming chat with RAG")

            # Sanitize all messages
            messages = sanitize_messages(messages)

            if not messages:
                return jsonify({"status": "error", "message": "No messages provided"}), 400

            # Extract dream context
            dream_text = dream_context.get("dream_text", "")
            summary = dream_context.get("summary", "")
            symbols = dream_context.get("symbols", [])
            emotions = dream_context.get("emotions", [])
            themes = dream_context.get("themes", [])
            recommendations = dream_context.get("recommendations", [])
            cultural_notes = dream_context.get("cultural_notes", {})
            celestial = dream_context.get("celestial", {})
            saju_data = dream_context.get("saju", {})

            # Get last user message for RAG search
            last_user_message = ""
            for msg in reversed(messages):
                if msg.get("role") == "user":
                    last_user_message = msg.get("content", "")
                    break

            # ============================================================
            # SESSION MANAGEMENT: Get or create counseling session
            # ============================================================
            counseling_engine = None
            counseling_session = None
            try:
                counseling_engine = get_counseling_engine()
                if counseling_engine and session_id:
                    # Try to retrieve existing session
                    counseling_session = counseling_engine.get_session(session_id)
                    if counseling_session:
                        logger.info(f"[DreamService] Retrieved existing session: {session_id}, phase: {counseling_session.current_phase}")
                    else:
                        # Create new session with provided ID
                        counseling_session = counseling_engine.create_session()
                        counseling_session.session_id = session_id
                        counseling_engine.sessions[session_id] = counseling_session
                        logger.info(f"[DreamService] Created new session: {session_id}")
                elif counseling_engine:
                    # Create new session
                    counseling_session = counseling_engine.create_session()
                    logger.info(f"[DreamService] Created new session: {counseling_session.session_id}")
            except Exception as session_error:
                logger.warning(f"[DreamService] Session management failed: {session_error}")

            # ============================================================
            # CRISIS DETECTION: Use CounselingEngine's advanced crisis detection
            # ============================================================
            crisis_response = None
            try:
                # Use advanced CounselingEngine crisis detector (5-level severity)
                if not counseling_engine:
                    counseling_engine = get_counseling_engine()
                if counseling_engine:
                    crisis_detector = counseling_engine.crisis_detector
                    crisis_check = crisis_detector.detect_crisis(last_user_message)

                    if crisis_check["is_crisis"]:
                        # Get detailed crisis response
                        crisis_data = crisis_detector.get_crisis_response(
                            crisis_check["max_severity"],
                            locale=language
                        )
                        crisis_response = {
                            "type": "crisis",
                            "severity": crisis_check["max_severity"],
                            "response": crisis_data.get("immediate_message", ""),
                            "resources": crisis_data.get("resources", {}),
                            "requires_immediate_action": crisis_check["requires_immediate_action"]
                        }
                        logger.warning(f"[DreamService] Advanced crisis detected: severity={crisis_check['max_severity']}, immediate_action={crisis_check['requires_immediate_action']}")
                else:
                    # Fallback to dream_embeddings CrisisDetector
                    from backend_ai.app.dream_embeddings import CrisisDetector
                    crisis_check = CrisisDetector.check_crisis(last_user_message)
                    if crisis_check:
                        crisis_response = crisis_check
                        logger.warning(f"[DreamService] Fallback crisis detected: type={crisis_check['type']}")
            except Exception as crisis_error:
                logger.warning(f"[DreamService] Crisis detection failed: {crisis_error}")

            # ============================================================
            # RAG SEARCH: Find relevant dream interpretations for the question
            # ============================================================
            rag_context = ""
            therapeutic_context = ""
            counseling_context = ""

            try:
                from backend_ai.app.dream_logic import get_dream_embed_rag
                dream_rag = get_dream_embed_rag()

                # Search based on: original dream + user's current question
                search_query = f"{dream_text[:300]} {last_user_message}"
                rag_results = dream_rag.get_interpretation_context(search_query, top_k=6)

                if rag_results.get("texts"):
                    rag_texts = rag_results.get("texts", [])[:5]
                    korean_notes_rag = rag_results.get("korean_notes", [])[:3]
                    specifics = rag_results.get("specifics", [])[:4]
                    advice_rag = rag_results.get("advice", [])[:3]
                    categories = rag_results.get("categories", [])

                    rag_context = "\n\n[📚 지식베이스 검색 결과 - 이 정보를 활용하여 답변하세요]\n"

                    if rag_texts:
                        rag_context += "\n관련 해석:\n" + "\n".join([f"• {t}" for t in rag_texts])

                    if korean_notes_rag:
                        rag_context += "\n\n한국 전통 해몽:\n" + "\n".join([f"• {n}" for n in korean_notes_rag])

                    if specifics:
                        rag_context += "\n\n상세 상황별 해석:\n" + "\n".join([f"• {s}" for s in specifics])

                    if advice_rag:
                        rag_context += "\n\n전통 조언:\n" + "\n".join([f"• {a}" for a in advice_rag])

                    if categories:
                        rag_context += f"\n\n꿈 카테고리: {', '.join(categories)}"

                    logger.info(f"[DreamService] RAG found {len(rag_texts)} relevant texts, quality={rag_results.get('match_quality')}")

                # ============================================================
                # THERAPEUTIC QUESTIONS: Get Jung-based therapeutic questions
                # ============================================================
                therapeutic_data = dream_rag.get_therapeutic_questions(dream_text + " " + last_user_message)
                if therapeutic_data.get("therapeutic_questions"):
                    therapeutic_context = "\n\n[🧠 융 심리학 치료적 질문 - 적절히 활용하세요]\n"
                    therapeutic_context += f"통찰: {therapeutic_data.get('insight', '')}\n"
                    therapeutic_context += "치료적 질문:\n" + "\n".join([f"• {q}" for q in therapeutic_data['therapeutic_questions'][:3]])

                # ============================================================
                # COUNSELING CONTEXT: Get scenario-based counseling insights
                # ============================================================
                counseling_data = dream_rag.get_counseling_context(last_user_message)
                if counseling_data.get("jungian_concept"):
                    counseling_context = "\n\n[💭 상담 시나리오 컨텍스트]\n"
                    counseling_context += f"융 개념: {counseling_data.get('jungian_concept', '')}\n"
                    counseling_context += f"해석: {counseling_data.get('interpretation', '')}\n"
                    if counseling_data.get("key_questions"):
                        counseling_context += "핵심 질문:\n" + "\n".join([f"• {q}" for q in counseling_data['key_questions'][:2]])
                    if counseling_data.get("reframes"):
                        counseling_context += "\n리프레이밍:\n" + "\n".join([f"• {r}" for r in counseling_data['reframes']])

            except Exception as rag_error:
                logger.warning(f"[DreamService] RAG search failed (continuing without): {rag_error}")

            # ============================================================
            # CELESTIAL CONTEXT: Moon phase and planetary influences
            # ============================================================
            celestial_context = self._build_celestial_context(celestial)

            # ============================================================
            # SAJU CONTEXT: User's fortune influence on dreams
            # ============================================================
            saju_context = self._build_saju_context(saju_data, language, calculate_saju_data)

            # Format basic context
            symbols_str = ", ".join(symbols) if symbols else "없음"
            emotions_str = ", ".join(emotions) if emotions else "없음"
            themes_str = ", ".join(themes) if themes else "없음"
            recommendations_str = " / ".join(recommendations) if recommendations else "없음"

            # ============================================================
            # PREVIOUS CONSULTATIONS CONTEXT (Memory/Continuity)
            # ============================================================
            previous_context = self._build_previous_context(dream_context)

            # ============================================================
            # PERSONA MEMORY (Personalization)
            # ============================================================
            persona_context = self._build_persona_context(dream_context)

            # ============================================================
            # JUNGIAN ENHANCED CONTEXT (from CounselingEngine)
            # ============================================================
            jung_context_str = self._build_jung_context(counseling_engine, last_user_message, saju_data)

            # ============================================================
            # SESSION PHASE TRACKING
            # ============================================================
            session_phase_context = self._build_session_phase_context(counseling_session, last_user_message)

            # Build conversation history
            conversation_history = []
            for msg in messages:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if role == "system":
                    continue
                conversation_history.append(f"{'사용자' if role == 'user' else 'AI'}: {content}")

            is_korean = language == "ko"

            # ============================================================
            # BUILD ENHANCED SYSTEM PROMPT (Jung + Stoic + Korean Haemong)
            # ============================================================
            system_prompt, chat_prompt = self._build_prompts(
                is_korean=is_korean,
                dream_text=dream_text,
                summary=summary,
                symbols_str=symbols_str,
                emotions_str=emotions_str,
                themes_str=themes_str,
                recommendations_str=recommendations_str,
                cultural_notes=cultural_notes,
                rag_context=rag_context,
                therapeutic_context=therapeutic_context,
                counseling_context=counseling_context,
                jung_context_str=jung_context_str,
                session_phase_context=session_phase_context,
                celestial_context=celestial_context,
                saju_context=saju_context,
                previous_context=previous_context,
                persona_context=persona_context,
                conversation_history=conversation_history,
                last_user_message=last_user_message,
                crisis_response=crisis_response
            )

            def generate_stream():
                """Generator for SSE streaming"""
                try:
                    if not OPENAI_AVAILABLE or not openai_client:
                        yield f"data: {json.dumps({'error': 'OpenAI not available'})}\n\n"
                        return

                    stream = openai_client.chat.completions.create(
                        model="gpt-4o",  # Upgraded from gpt-4o-mini for better Jung psychology + Korean haemong fusion
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": chat_prompt}
                        ],
                        temperature=0.75,
                        max_tokens=2000,  # Increased for comprehensive dream interpretation responses
                        stream=True
                    )

                    for chunk in stream:
                        if chunk.choices[0].delta.content:
                            content = chunk.choices[0].delta.content
                            yield f"data: {json.dumps({'content': content})}\n\n"

                    yield f"data: {json.dumps({'done': True})}\n\n"

                except Exception as stream_error:
                    logger.exception(f"[DreamService] Streaming error: {stream_error}")
                    yield f"data: {json.dumps({'error': str(stream_error)})}\n\n"

            return Response(
                generate_stream(),
                mimetype='text/event-stream',
                headers={
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'X-Accel-Buffering': 'no'
                }
            )

        except Exception as e:
            logger.exception(f"[DreamService] request_id={request_id} stream_dream_chat failed: {e}")
            return jsonify({"status": "error", "message": str(e)}), 500

    def _build_celestial_context(self, celestial: Dict[str, Any]) -> str:
        """Build celestial context (moon phase, retrogrades)."""
        from backend_ai.app.app import get_current_transits, HAS_REALTIME

        celestial_context = ""
        if celestial:
            moon_phase = celestial.get("moon_phase", {})
            moon_sign = celestial.get("moon_sign", {})
            retrogrades = celestial.get("retrogrades", [])

            if moon_phase or moon_sign:
                celestial_context = "\n\n[🌙 현재 천체 상황]\n"

                if moon_phase:
                    phase_name = moon_phase.get("korean", moon_phase.get("name", ""))
                    phase_emoji = moon_phase.get("emoji", "🌙")
                    dream_meaning = moon_phase.get("dream_meaning", "")
                    celestial_context += f"달의 위상: {phase_emoji} {phase_name}\n"
                    if dream_meaning:
                        celestial_context += f"꿈에 미치는 영향: {dream_meaning}\n"

                if moon_sign:
                    sign_korean = moon_sign.get("korean", moon_sign.get("sign", ""))
                    dream_flavor = moon_sign.get("dream_flavor", "")
                    celestial_context += f"달 별자리: {sign_korean}\n"
                    if dream_flavor:
                        celestial_context += f"꿈 성격: {dream_flavor}\n"

                if retrogrades:
                    retro_names = [r.get("korean", r.get("planet", "")) for r in retrogrades[:3]]
                    celestial_context += f"역행 중인 행성: {', '.join(retro_names)}\n"
        else:
            # Try to get current celestial data if not provided
            try:
                if HAS_REALTIME:
                    transits = get_current_transits()
                    if transits:
                        moon_phase = transits.get("moon_phase", {})
                        if moon_phase:
                            phase_name = moon_phase.get("korean", moon_phase.get("name", ""))
                            phase_emoji = moon_phase.get("emoji", "🌙")
                            celestial_context = f"\n\n[🌙 현재 달 위상: {phase_emoji} {phase_name}]\n"
            except Exception:
                pass

        return celestial_context

    def _build_saju_context(self, saju_data: Dict[str, Any], language: str, calculate_saju_data) -> str:
        """Build saju fortune context."""
        saju_context = ""
        if saju_data and saju_data.get("birth_date"):
            try:
                birth_date = saju_data.get("birth_date", "")
                birth_time = saju_data.get("birth_time", "")

                # Calculate current saju if we have birth data
                saju_result = calculate_saju_data(
                    birth_date=birth_date,
                    birth_time=birth_time or "12:00",
                    birth_city=saju_data.get("birth_city", "Seoul"),
                    timezone=saju_data.get("timezone", "Asia/Seoul"),
                    language=language
                )

                if saju_result:
                    day_master = saju_result.get("dayMaster", {})
                    current_daeun = saju_result.get("currentDaeun", {})
                    today_iljin = saju_result.get("todayIljin", {})

                    saju_context = "\n\n[🔮 사용자 사주 운세 컨텍스트]\n"

                    if day_master:
                        dm_stem = day_master.get("stem", "")
                        dm_element = day_master.get("element", "")
                        saju_context += f"일간(본질): {dm_stem} ({dm_element})\n"

                    if current_daeun:
                        daeun_info = f"{current_daeun.get('stem', '')} {current_daeun.get('branch', '')}"
                        saju_context += f"현재 대운(10년): {daeun_info}\n"

                    if today_iljin:
                        iljin_info = f"{today_iljin.get('stem', '')} {today_iljin.get('branch', '')}"
                        saju_context += f"오늘 일진: {iljin_info}\n"

                    saju_context += "→ 이 운세 흐름이 꿈의 내용과 시점에 영향을 미칩니다.\n"

                    logger.info(f"[DreamService] Added saju context for user")
            except Exception as saju_error:
                logger.warning(f"[DreamService] Saju calculation failed: {saju_error}")

        return saju_context

    def _build_previous_context(self, dream_context: Dict[str, Any]) -> str:
        """Build previous consultations context."""
        previous_context = ""
        previous_consultations = dream_context.get("previous_consultations", [])
        if previous_consultations:
            previous_context = "\n\n[🔄 이전 상담 기록 - 사용자와의 연속성 유지]\n"
            for i, prev in enumerate(previous_consultations[:3], 1):
                prev_summary = prev.get("summary", "")[:150]
                prev_dream = prev.get("dreamText", "")[:100]
                prev_date = prev.get("date", "")[:10]
                if prev_summary:
                    previous_context += f"{i}. ({prev_date}) {prev_summary}\n"
                    if prev_dream:
                        previous_context += f"   이전 꿈: {prev_dream}...\n"
            previous_context += "→ 이전 상담 내용을 참고하여 연속성 있는 답변을 제공하세요.\n"

        return previous_context

    def _build_persona_context(self, dream_context: Dict[str, Any]) -> str:
        """Build persona memory context (personalization)."""
        persona_context = ""
        persona_memory = dream_context.get("persona_memory", {})
        if persona_memory:
            session_count = persona_memory.get("sessionCount", 0)
            key_insights = persona_memory.get("keyInsights", [])
            emotional_tone = persona_memory.get("emotionalTone", "")

            if session_count > 1 or key_insights or emotional_tone:
                persona_context = "\n\n[👤 사용자 프로필 (개인화)]\n"
                if session_count > 1:
                    persona_context += f"상담 횟수: {session_count}회 (단골 사용자)\n"
                if emotional_tone:
                    persona_context += f"전반적 감정 톤: {emotional_tone}\n"
                if key_insights:
                    persona_context += f"핵심 인사이트: {', '.join(key_insights[:3])}\n"
                persona_context += "→ 이전 통찰을 바탕으로 개인화된 답변을 제공하세요.\n"

        return persona_context

    def _build_jung_context(self, counseling_engine, last_user_message: str, saju_data: Dict[str, Any]) -> str:
        """Build Jungian enhanced context from CounselingEngine."""
        jung_context_str = ""
        if counseling_engine:
            try:
                # Get enhanced Jung context from counseling engine
                jung_context = counseling_engine.get_enhanced_context(
                    user_message=last_user_message,
                    saju_data=saju_data if saju_data else None
                )

                if jung_context:
                    jung_context_str = "\n\n[🧠 융 심리학 고급 컨텍스트 - CounselingEngine]\n"

                    # Psychological Type (from Saju mapping)
                    if jung_context.get("psychological_type"):
                        ptype = jung_context["psychological_type"]
                        jung_context_str += f"심리 유형: {ptype.get('name_ko', ptype.get('name', ''))}\n"
                        jung_context_str += f"  특징: {ptype.get('description', '')[:100]}\n"

                    # Alchemical Stage (Nigredo→Albedo→Rubedo)
                    if jung_context.get("alchemy_stage"):
                        stage = jung_context["alchemy_stage"]
                        jung_context_str += f"연금술 단계: {stage.get('name_ko', stage.get('name', ''))}\n"
                        jung_context_str += f"  초점: {stage.get('therapeutic_focus', '')[:100]}\n"

                    # Scenario Guidance
                    if jung_context.get("scenario_guidance"):
                        scenario = jung_context["scenario_guidance"]
                        jung_context_str += f"상담 접근: {scenario.get('approach', '')[:100]}\n"

                    # RAG-based recommended questions
                    if jung_context.get("rag_questions"):
                        jung_context_str += "추천 치료적 질문:\n"
                        for q in jung_context["rag_questions"][:2]:
                            jung_context_str += f"  • {q}\n"

                    # RAG insights
                    if jung_context.get("rag_insights"):
                        jung_context_str += "관련 통찰:\n"
                        for insight in jung_context["rag_insights"][:2]:
                            jung_context_str += f"  • {insight[:80]}...\n"

                    jung_context_str += "→ 이 융 심리학 컨텍스트를 꿈 해석에 자연스럽게 통합하세요.\n"

                    logger.info(f"[DreamService] Added Jung enhanced context from CounselingEngine")
            except Exception as jung_error:
                logger.warning(f"[DreamService] Jung context generation failed: {jung_error}")

        return jung_context_str

    def _build_session_phase_context(self, counseling_session, last_user_message: str) -> str:
        """Build session phase tracking context."""
        session_phase_context = ""
        if counseling_session:
            try:
                # Add user message to session
                counseling_session.add_message("user", last_user_message)

                # Get current phase info
                phase_info = counseling_session.get_phase_info()
                session_phase_context = f"\n\n[📍 상담 진행 단계: {phase_info.get('name', '')}]\n"
                session_phase_context += f"목표: {', '.join(phase_info.get('goals', []))}\n"
                session_phase_context += f"→ 현재 단계의 목표에 맞춰 답변하세요.\n"

                logger.info(f"[DreamService] Session phase: {counseling_session.current_phase}")
            except Exception as phase_error:
                logger.warning(f"[DreamService] Session phase tracking failed: {phase_error}")

        return session_phase_context

    def _build_prompts(self, **kwargs) -> tuple:
        """Build system prompt and chat prompt."""
        is_korean = kwargs.get("is_korean", True)
        dream_text = kwargs.get("dream_text", "")
        summary = kwargs.get("summary", "")
        symbols_str = kwargs.get("symbols_str", "없음")
        emotions_str = kwargs.get("emotions_str", "없음")
        themes_str = kwargs.get("themes_str", "없음")
        recommendations_str = kwargs.get("recommendations_str", "없음")
        cultural_notes = kwargs.get("cultural_notes", {})
        rag_context = kwargs.get("rag_context", "")
        therapeutic_context = kwargs.get("therapeutic_context", "")
        counseling_context = kwargs.get("counseling_context", "")
        jung_context_str = kwargs.get("jung_context_str", "")
        session_phase_context = kwargs.get("session_phase_context", "")
        celestial_context = kwargs.get("celestial_context", "")
        saju_context = kwargs.get("saju_context", "")
        previous_context = kwargs.get("previous_context", "")
        persona_context = kwargs.get("persona_context", "")
        conversation_history = kwargs.get("conversation_history", [])
        last_user_message = kwargs.get("last_user_message", "")
        crisis_response = kwargs.get("crisis_response")

        if is_korean:
            system_prompt = """전문 꿈 해석 상담사. 융 심리학 + 스토아 철학 + 한국 해몽 융합.

🚫 절대 금지:
- "좋은 꿈이에요" "조심하세요" 같은 뜬구름 말
- 모든 꿈에 적용되는 일반론
- 데이터 없이 추측

✅ 올바른 답변:
- 아래 컨텍스트(사주, 천체, 문화별 해석)를 반드시 인용
- "왜 지금 이 꿈을 꾸었는지" 현재 운세/천체로 설명
- 구체적 시기/행동 제시 (예: "이번 달은 물 근처 피하세요")

예시:
❌ 나쁜 답: "뱀은 변화를 의미해요."
✅ 좋은 답: "현재 병자(丙子) 대운에서 수(水)기운이 강한데, 뱀은 수 에너지의 상징이에요. 달이 전갈자리에 있어 깊은 변환 욕구가 꿈에 나타났습니다. 융 심리학에서 뱀은 무의식의 지혜를 상징하는데, 지금 당신에게 어떤 변화가 필요한지 스스로 물어보세요."

핵심 해석 틀:
- 한국 해몽: 길몽/흉몽, 태몽, 재물몽
- 융 심리학: 그림자, 아니마/아니무스 (치료적 질문 활용)
- 스토아: 실용적 행동 조언"""

            # Build enhanced chat prompt with all context
            chat_prompt = f"""[꿈 해석 컨텍스트]
원래 꿈: {dream_text[:600] if dream_text else "(없음)"}
해석 요약: {summary[:400] if summary else "(없음)"}
주요 심볼: {symbols_str}
감정: {emotions_str}
테마: {themes_str}
기존 조언: {recommendations_str}"""

            # Add cultural notes if available
            if cultural_notes:
                if cultural_notes.get("korean"):
                    chat_prompt += f"\n한국 해몽 해석: {cultural_notes['korean'][:200]}"
                if cultural_notes.get("western"):
                    chat_prompt += f"\n서양 심리학 해석: {cultural_notes['western'][:200]}"

            # Add RAG context
            chat_prompt += rag_context

            # Add therapeutic context (Jung-based questions from DreamRAG)
            chat_prompt += therapeutic_context

            # Add counseling context (scenario-based from DreamRAG)
            chat_prompt += counseling_context

            # Add Jung enhanced context (from CounselingEngine) ⭐ NEW
            chat_prompt += jung_context_str

            # Add session phase tracking ⭐ NEW
            chat_prompt += session_phase_context

            # Add celestial context
            chat_prompt += celestial_context

            # Add saju context
            chat_prompt += saju_context

            # Add previous consultations
            chat_prompt += previous_context

            # Add persona memory
            chat_prompt += persona_context

            # Add crisis context if detected
            crisis_instruction = ""
            if crisis_response:
                crisis_instruction = f"""

[⚠️ 위기 상황 감지 - 우선 대응 필요]
감지 유형: {crisis_response['type']}
심각도: {crisis_response['severity']}
권장 대응: {crisis_response['response']}
전문 기관: {', '.join([f"{k}: {v}" for k, v in crisis_response['resources'].items()])}

중요: 먼저 공감과 지지를 표현하고, 전문 상담 기관 연락처를 안내하세요."""

            chat_prompt += f"""

[대화 기록]
{chr(10).join(conversation_history[-6:])}

[사용자 질문]
{last_user_message}
{crisis_instruction}

위의 모든 컨텍스트(지식베이스, 천체, 사주, 이전 상담, 치료적 질문)를 활용하여:
1. 한국 해몽 관점의 구체적 해석
2. 융 심리학적 통찰 (필요시 원형 언급, 치료적 질문 활용)
3. 스토아 철학의 실용적 조언
을 자연스럽게 융합한 답변을 제공하세요."""

        else:
            system_prompt = """Expert dream counselor. Jung psychology + Stoic philosophy + Korean Haemong.

🚫 FORBIDDEN:
- "Good dream" "Be careful" vague statements
- Generic interpretations applicable to any dream
- Speculation without data

✅ CORRECT ANSWERS:
- MUST cite context below (saju fortune, celestial, cultural interpretations)
- Explain "why this dream NOW" using current fortune/celestial data
- Specific timing/actions (e.g., "avoid water activities this month")

Example:
❌ Bad: "Snake represents transformation."
✅ Good: "In your current Byeongja (丙子) major fortune, Water energy is strong - snake symbolizes this Water energy. Moon in Scorpio amplifies transformation urges in your dream. In Jungian terms, snake represents unconscious wisdom. Ask yourself: what change do you need right now?"

Core frameworks:
- Korean Haemong: auspicious/inauspicious, conception, wealth dreams
- Jungian: Shadow, Anima/Animus (use therapeutic questions)
- Stoic: practical action advice"""

            chat_prompt = f"""[Dream Interpretation Context]
Original Dream: {dream_text[:600] if dream_text else "(none)"}
Summary: {summary[:400] if summary else "(none)"}
Key Symbols: {symbols_str}
Emotions: {emotions_str}
Themes: {themes_str}
Previous Recommendations: {recommendations_str}"""

            if cultural_notes:
                if cultural_notes.get("korean"):
                    chat_prompt += f"\nKorean Traditional: {cultural_notes['korean'][:200]}"
                if cultural_notes.get("western"):
                    chat_prompt += f"\nWestern Psychology: {cultural_notes['western'][:200]}"

            chat_prompt += rag_context
            chat_prompt += therapeutic_context
            chat_prompt += counseling_context
            chat_prompt += celestial_context
            chat_prompt += saju_context
            chat_prompt += previous_context
            chat_prompt += persona_context

            # Add crisis context if detected (English)
            crisis_instruction_en = ""
            if crisis_response:
                crisis_instruction_en = f"""

[⚠️ CRISIS DETECTED - PRIORITY RESPONSE NEEDED]
Type: {crisis_response['type']}
Severity: {crisis_response['severity']}
Recommended Response: First express empathy and support, then provide professional helpline information.
Korean Crisis Lines: Suicide Prevention 1393, Mental Health Crisis 1577-0199

Important: Prioritize emotional support and professional referral."""

            chat_prompt += f"""

[Conversation History]
{chr(10).join(conversation_history[-6:])}

[User Question]
{last_user_message}
{crisis_instruction_en}

Using all context (knowledge base, celestial, saju, previous consultations, therapeutic questions), provide a response that naturally blends:
1. Korean traditional dream interpretation
2. Jungian psychological insight (use therapeutic questions when appropriate)
3. Stoic practical wisdom"""

        return system_prompt, chat_prompt
