# backend_ai/app/routers/tarot/chat.py
"""
Tarot chat route handlers.
Streaming and non-streaming chat endpoints for tarot conversations.
"""

import json
import logging
from typing import Dict, List

from flask import Blueprint, request, jsonify, Response, stream_with_context, g
from ...utils.request_utils import get_json_or_400

from ..tarot_utils import map_tarot_theme, clean_ai_phrases
from .dependencies import (
    get_tarot_hybrid_rag,
    get_openai_client,
    sanitize_messages,
    generate_with_gpt4,
)
from .context_detector import is_playful_question
from .prompt_builder import build_chat_system_prompt

logger = logging.getLogger(__name__)


def register_chat_routes(bp: Blueprint):
    """Register chat routes on the blueprint."""

    @bp.route('/chat-stream', methods=['POST'])
    def tarot_chat_stream():
        """
        Streaming tarot chat with RAG-enhanced context.
        Returns Server-Sent Events (SSE) for real-time text streaming.
        """
        try:
            data, json_error = get_json_or_400(request, force=True)
            if json_error:
                return json_error
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

            # Get the latest user question
            user_messages = [m for m in messages if m.get("role") == "user"]
            latest_question = user_messages[-1].get("content", "") if user_messages else ""

            # Build card context string
            cards_context = _build_cards_context(cards)

            # Build RAG context if available
            rag_context = _build_rag_context(cards, category, spread_title, latest_question)

            # Build system prompt
            is_korean = language == "ko"
            system_prompt = build_chat_system_prompt(
                spread_title=spread_title,
                category=category,
                cards_context=cards_context,
                rag_context=rag_context,
                overall_message=overall_message,
                latest_question=latest_question,
                counselor_style=counselor_style,
                is_korean=is_korean
            )

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
                    client = get_openai_client()
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
                            content = clean_ai_phrases(content)
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

    @bp.route('/chat', methods=['POST'])
    def tarot_chat():
        """Non-streaming tarot chat (fallback)."""
        try:
            data, json_error = get_json_or_400(request, force=True)
            if json_error:
                return json_error
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
                reply = generate_with_gpt4(prompt, max_tokens=400, temperature=0.8, use_mini=True)
                reply = clean_ai_phrases(reply)
            except Exception as llm_err:
                logger.warning(f"[TAROT-CHAT] GPT failed: {llm_err}")
                reply = f"카드 {cards_str}가 전하는 메시지입니다. {overall_message[:200] if overall_message else '내면의 직관을 믿으세요.'}"

            return jsonify({"reply": reply})

        except Exception as e:
            logger.exception(f"[ERROR] /api/tarot/chat failed: {e}")
            return jsonify({"status": "error", "message": str(e)}), 500


def _build_cards_context(cards: List[Dict]) -> str:
    """Build card context string for chat."""
    card_lines = []
    for i, card in enumerate(cards):
        pos = card.get("position", f"Card {i+1}")
        name = card.get("name", "Unknown")
        reversed_str = "(역방향)" if card.get("is_reversed") else "(정방향)"
        meaning = card.get("meaning", "")[:200]
        card_lines.append(f"- {pos}: {name} {reversed_str}\n  의미: {meaning}")
    return "\n".join(card_lines) if card_lines else "(카드 없음)"


def _build_rag_context(
    cards: List[Dict],
    category: str,
    spread_title: str,
    latest_question: str
) -> str:
    """Build RAG context for chat."""
    rag_context = ""
    try:
        hybrid_rag = get_tarot_hybrid_rag()
        if hybrid_rag and cards:
            drawn_cards = [
                {"name": c.get("name", ""), "isReversed": c.get("is_reversed", False)}
                for c in cards
            ]
            mapped_theme, mapped_spread = map_tarot_theme(category, spread_title, latest_question)
            rag_context = hybrid_rag.build_reading_context(
                theme=mapped_theme,
                sub_topic=mapped_spread,
                drawn_cards=drawn_cards,
                question=latest_question
            )
    except Exception as rag_err:
        logger.warning(f"[TAROT-CHAT] RAG context failed: {rag_err}")
    return rag_context
