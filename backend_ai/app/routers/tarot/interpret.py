# backend_ai/app/routers/tarot/interpret.py
"""
Tarot interpretation route handler.
Premium tarot interpretation using Hybrid RAG + GPT.
"""

import json
import logging
import re
import time
from typing import Any, Dict, List, Optional

from flask import Blueprint, request, jsonify, g
from ...utils.request_utils import get_json_or_400

from ..tarot_utils import map_tarot_theme, clean_ai_phrases
from .dependencies import (
    get_tarot_hybrid_rag,
    has_tarot,
    get_cache,
    sanitize_user_input,
    is_suspicious_input,
    generate_with_gpt4,
    generate_dynamic_followup_questions,
)
from .context_detector import detect_question_context
from .prompt_builder import (
    build_enhanced_question,
    build_card_details,
    build_combinations_text,
    build_elemental_text,
    build_archetype_text,
    build_unified_prompt,
)
from .draws_validation import (
    default_domain_from_category,
    derive_draws_from_cards,
    validate_draws,
)

# GraphRAG import for enhanced context
try:
    from backend_ai.app.saju_astro_rag import search_graphs
    HAS_GRAPH_RAG = True
except ImportError:
    HAS_GRAPH_RAG = False
    search_graphs = None

logger = logging.getLogger(__name__)


def register_interpret_routes(bp: Blueprint):
    """Register interpretation routes on the blueprint."""

    @bp.route('/interpret', methods=['POST'])
    def tarot_interpret():
        """
        Premium tarot interpretation using Hybrid RAG + GPT.
        Supports optional saju/astrology context for enhanced readings.
        With caching for same card combinations.
        """
        if not has_tarot():
            return jsonify({"status": "error", "message": "Tarot module not available"}), 501

        try:
            data, json_error = get_json_or_400(request, force=True)
            if json_error:
                return json_error
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

            tarot_domain = default_domain_from_category(category)
            raw_draws = data.get("draws")
            allowed_positions = [str(c.get("position") or "").strip() for c in cards if str(c.get("position") or "").strip()]

            draws: List[Dict[str, Any]] = []
            if isinstance(raw_draws, list) and raw_draws:
                draws, draw_errors = validate_draws(
                    raw_draws,
                    default_domain=tarot_domain,
                    allowed_positions=allowed_positions or None,
                )
                if draw_errors:
                    return jsonify(
                        {
                            "status": "error",
                            "message": "Invalid draws payload",
                            "errors": [e.to_dict() for e in draw_errors],
                        }
                    ), 400
            else:
                draws = derive_draws_from_cards(cards, default_domain=tarot_domain)

            if draws:
                # Keep cards aligned with normalized draw metadata for prompt/evidence.
                for idx, draw in enumerate(draws):
                    if idx >= len(cards):
                        break
                    cards[idx]["card_id"] = draw.get("card_id", "")
                    cards[idx]["domain"] = draw.get("domain", tarot_domain)
                    if draw.get("position") and not cards[idx].get("position"):
                        cards[idx]["position"] = draw.get("position")

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

            # Build enhanced context
            enhanced_question = build_enhanced_question(user_question, saju_context, astro_context)

            # Map theme/spread
            mapped_theme, mapped_spread = map_tarot_theme(category, spread_id, user_question)
            logger.info(f"[TAROT] Mapped {category}/{spread_id} â†’ {mapped_theme}/{mapped_spread}")

            # Build RAG context
            if birthdate:
                rag_context = hybrid_rag.build_premium_reading_context(
                    theme=mapped_theme,
                    sub_topic=mapped_spread,
                    drawn_cards=drawn_cards,
                    question=enhanced_question,
                    birthdate=birthdate,
                    moon_phase=moon_phase
                )
            else:
                rag_context = hybrid_rag.build_reading_context(
                    theme=mapped_theme,
                    sub_topic=mapped_spread,
                    drawn_cards=drawn_cards,
                    question=enhanced_question
                )

            logger.info(f"[TAROT] RAG context length: {len(rag_context) if rag_context else 0}")

            # GraphRAG enhancement - search for card-specific knowledge
            graph_rag_context = ""
            if HAS_GRAPH_RAG and search_graphs:
                try:
                    # Build search query from cards and question
                    card_names_str = " ".join([c.get("name", "") for c in cards])
                    graph_query = f"íƒ€ë¡œ {card_names_str} {enhanced_question or category}"
                    graph_results = search_graphs(graph_query, top_k=3)
                    if graph_results:
                        graph_parts = []
                        seen_graph_texts = set()
                        for gr in graph_results[:3]:
                            if isinstance(gr, dict):
                                text = gr.get("text", gr.get("content", ""))
                                if text:
                                    snippet = text[:280]
                                    if snippet not in seen_graph_texts:
                                        seen_graph_texts.add(snippet)
                                        graph_parts.append(snippet)
                        graph_rag_context = "\n".join(graph_parts)
                        logger.info(f"[TAROT] GraphRAG context added: {len(graph_rag_context)} chars")
                except Exception as graph_err:
                    logger.warning(f"[TAROT] GraphRAG search failed: {graph_err}")

            forced_facet_context = _build_forced_facet_context(cards, card_limit=5)
            retrieved_support_context = (rag_context or "")[:900]
            if graph_rag_context:
                retrieved_support_context = f"{retrieved_support_context}\n\n{graph_rag_context}"[:900]
            is_korean = language == "ko"

            # Detect question context
            q = enhanced_question or 'ì¼ë°˜ ìš´ì„¸'
            question_context, _ = detect_question_context(q, mapped_spread)

            # Build card details
            card_details = build_card_details(
                drawn_cards,
                cards,
                hybrid_rag,
                default_domain=tarot_domain,
            )
            card_names = [cd['name'] for cd in card_details]

            # Build additional context
            combinations_text = build_combinations_text(hybrid_rag, card_names)
            elemental_text = build_elemental_text(hybrid_rag, card_names)

            # Timing hint
            timing_text = ""
            if card_names:
                timing_hint = hybrid_rag.get_timing_hint(card_names[0])
                if timing_hint:
                    timing_text = timing_hint

            # Archetype text
            archetype_text = build_archetype_text(hybrid_rag, card_names)

            # Build unified prompt
            unified_prompt = build_unified_prompt(
                spread_title=spread_title,
                question=q,
                card_details=card_details,
                question_context=question_context,
                forced_facet_context=forced_facet_context,
                retrieved_support_context=retrieved_support_context,
                combinations_text=combinations_text,
                elemental_text=elemental_text,
                timing_text=timing_text,
                archetype_text=archetype_text,
                is_korean=is_korean
            )

            # Generate interpretation
            reading_text = ""
            card_interpretations = [""] * len(drawn_cards)
            advice_text = ""
            card_evidence: List[Dict[str, str]] = []

            try:
                unified_result = generate_with_gpt4(unified_prompt, max_tokens=6000, temperature=0.75, use_mini=False)
                unified_result = clean_ai_phrases(unified_result)
                parsed_payload = _parse_unified_output(unified_result, len(drawn_cards))
                reading_text = parsed_payload["overall"]
                advice_text = parsed_payload["advice"]
                card_interpretations = parsed_payload["card_interpretations"]
                card_evidence = parsed_payload["card_evidence"]

                evidence_ok = _has_required_evidence(card_evidence, len(drawn_cards))
                if not evidence_ok:
                    repair_prompt = _build_evidence_repair_prompt(
                        original_prompt=unified_prompt,
                        raw_response=unified_result,
                        expected_draws=draws,
                    )
                    repair_result = generate_with_gpt4(
                        repair_prompt,
                        max_tokens=2200,
                        temperature=0.3,
                        use_mini=False,
                    )
                    repair_payload = _parse_unified_output(repair_result, len(drawn_cards))
                    if _has_required_evidence(repair_payload["card_evidence"], len(drawn_cards)):
                        card_evidence = repair_payload["card_evidence"]
                    else:
                        card_evidence = _fallback_card_evidence(card_details, draws, max_items=len(drawn_cards))

            except Exception as llm_e:
                logger.warning(f"[TAROT] Unified GPT call failed: {llm_e}, using fallback")
                cards_str = ", ".join([c.get("name", "") for c in drawn_cards])
                reading_text = f"카드 해석: {cards_str}. {(retrieved_support_context or '')[:500]}"
                card_evidence = _fallback_card_evidence(card_details, draws, max_items=len(drawn_cards))

            # Get card insights
            card_insights = _build_card_insights(drawn_cards, cards, card_interpretations, hybrid_rag)

            # Build response
            static_followup = []
            if hasattr(hybrid_rag, 'advanced_rules'):
                static_followup = hybrid_rag.advanced_rules.get_followup_questions(category, "neutral")

            dynamic_followup = generate_dynamic_followup_questions(
                interpretation=reading_text,
                cards=drawn_cards,
                category=category,
                user_question=enhanced_question or user_question or "",
                language=language,
                static_questions=static_followup
            )

            if not _has_required_evidence(card_evidence, len(drawn_cards)):
                card_evidence = _fallback_card_evidence(card_details, draws, max_items=len(drawn_cards))
            evidence_section = _render_card_evidence_section(card_evidence)

            result = {
                "overall_message": f"{reading_text}\n\n{evidence_section}" if evidence_section else reading_text,
                "card_insights": card_insights,
                "card_evidence": card_evidence,
                "guidance": advice_text if advice_text else "ì¹´ë“œì˜ ì§€í˜œì— ê·€ ê¸°ìš¸ì´ì„¸ìš”.",
                "affirmation": "ë‚˜ëŠ” ìš°ì£¼ì˜ ì§€í˜œë¥¼ ì‹ ë¢°í•©ë‹ˆë‹¤.",
                "combinations": [],
                "followup_questions": dynamic_followup
            }

            # Add premium personalization if birthdate provided
            if birthdate:
                result = _add_personalization(result, hybrid_rag, drawn_cards, birthdate, mapped_theme)

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

    @bp.route('/prefetch', methods=['POST'])
    def tarot_prefetch():
        """Prefetch RAG context while user is selecting cards."""
        if not has_tarot():
            return jsonify({"status": "error", "message": "Tarot module not available"}), 501

        try:
            data, json_error = get_json_or_400(request, force=True)
            if json_error:
                return json_error
            category = data.get("category", "general")
            spread_id = data.get("spread_id", "three_card")

            logger.info(f"[TAROT_PREFETCH] id={getattr(g, 'request_id', 'N/A')} Prefetching for {category}/{spread_id}")

            start_time = time.time()
            hybrid_rag = get_tarot_hybrid_rag()

            mapped_theme, mapped_spread = map_tarot_theme(category, spread_id)

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


def _parse_unified_output(raw_text: str, card_count: int) -> Dict[str, Any]:
    parsed: Dict[str, Any] = {}
    try:
        json_match = re.search(r'\{[\s\S]*\}', raw_text)
        if json_match:
            parsed = json.loads(json_match.group())
    except Exception:
        parsed = {}

    overall = parsed.get("overall", "") if isinstance(parsed, dict) else ""
    if not overall:
        overall = raw_text

    raw_advice = parsed.get("advice", "") if isinstance(parsed, dict) else ""
    advice = raw_advice if isinstance(raw_advice, (list, str)) else ""

    card_interpretations = [""] * card_count
    parsed_cards = parsed.get("cards", []) if isinstance(parsed, dict) else []
    if isinstance(parsed_cards, list):
        for i, card_data in enumerate(parsed_cards):
            if i >= card_count or not isinstance(card_data, dict):
                continue
            interp = str(card_data.get("interpretation") or "").strip()
            if interp:
                card_interpretations[i] = interp

    raw_evidence = parsed.get("card_evidence", []) if isinstance(parsed, dict) else []
    normalized_evidence: List[Dict[str, str]] = []
    if isinstance(raw_evidence, list):
        for row in raw_evidence:
            if not isinstance(row, dict):
                continue
            normalized_evidence.append(
                {
                    "card_id": str(row.get("card_id") or "").strip(),
                    "orientation": str(row.get("orientation") or "").strip().lower(),
                    "domain": str(row.get("domain") or "").strip().lower(),
                    "position": str(row.get("position") or "").strip(),
                    "evidence": str(row.get("evidence") or "").strip(),
                }
            )

    return {
        "overall": overall,
        "advice": advice,
        "card_interpretations": card_interpretations,
        "card_evidence": normalized_evidence,
    }


def _has_required_evidence(card_evidence: List[Dict[str, str]], card_count: int) -> bool:
    if len(card_evidence) != card_count:
        return False
    for row in card_evidence:
        if not row.get("card_id"):
            return False
        if row.get("orientation") not in {"upright", "reversed"}:
            return False
        if row.get("domain") not in {"love", "career", "money", "general"}:
            return False
        evidence = str(row.get("evidence") or "").strip()
        if not evidence:
            return False
        sentence_count = _count_sentences(evidence)
        if sentence_count < 2 or sentence_count > 3:
            return False
    return True


def _count_sentences(text: str) -> int:
    normalized = re.sub(r"\s+", " ", text.strip())
    if not normalized:
        return 0
    chunks = [c.strip() for c in re.split(r"(?<=[.!?。！？])\s+", normalized) if c.strip()]
    if not chunks:
        return 0
    return len(chunks)


def _build_evidence_repair_prompt(original_prompt: str, raw_response: str, expected_draws: List[Dict[str, Any]]) -> str:
    expected = [
        {
            "card_id": d.get("card_id", ""),
            "orientation": d.get("orientation", ""),
            "domain": d.get("domain", ""),
            "position": d.get("position", ""),
        }
        for d in expected_draws
    ]
    return f"""Return ONLY valid JSON.

Task:
1. Keep the original response meaning.
2. Ensure `card_evidence` exists and has one block per drawn card.
3. Each block must include card_id/orientation/domain/position/evidence.
4. `evidence` must be 2~3 sentences.

Expected draws:
{json.dumps(expected, ensure_ascii=False)}

Original prompt:
{original_prompt[:2200]}

Original response:
{raw_response[:2200]}
"""


def _build_forced_facet_context(cards: List[Dict], card_limit: int = 5) -> str:
    parts: List[str] = []
    for idx, card in enumerate(cards[:card_limit]):
        name = str(card.get("name") or "").strip()
        card_id = str(card.get("card_id") or "").strip() or "(unknown)"
        orientation = "reversed" if bool(card.get("is_reversed")) else "upright"
        domain = str(card.get("domain") or "general").strip().lower()
        position = str(card.get("position") or f"card_{idx+1}").strip()
        meaning = str(card.get("meaning") or "").strip()
        if len(meaning) > 220:
            meaning = meaning[:220]
        parts.append(
            f"- card_id={card_id} | orientation={orientation} | domain={domain} | position={position} | name={name} | meaning={meaning}"
        )
    return "\n".join(parts)


def _fallback_card_evidence(card_details: List[Dict], draws: List[Dict[str, Any]], max_items: int) -> List[Dict[str, str]]:
    evidence_rows: List[Dict[str, str]] = []
    for idx in range(min(max_items, len(card_details))):
        cd = card_details[idx]
        draw = draws[idx] if idx < len(draws) else {}
        card_id = str(draw.get("card_id") or cd.get("card_id") or "").strip()
        orientation = str(draw.get("orientation") or cd.get("orientation") or "upright").strip().lower()
        domain = str(draw.get("domain") or cd.get("domain") or "general").strip().lower()
        position = str(draw.get("position") or cd.get("position") or "").strip()
        meaning = str(cd.get("meaning") or "").strip()
        symbolism = str(cd.get("symbolism") or "").strip()
        advice = str(cd.get("advice") or "").strip()
        evidence = (
            f"{cd.get('name', '해당 카드')}는 {position} 위치에서 {meaning[:120]}의 흐름을 강조합니다. "
            f"{symbolism[:110]} 상징은 질문과 직접 연결되는 단서를 제공합니다. "
            f"실천 포인트는 {advice[:90]} 입니다."
        )
        evidence_rows.append(
            {
                "card_id": card_id,
                "orientation": orientation,
                "domain": domain,
                "position": position,
                "evidence": evidence,
            }
        )
    return evidence_rows


def _render_card_evidence_section(card_evidence: List[Dict[str, str]]) -> str:
    if not card_evidence:
        return ""
    lines = ["## Card Evidence"]
    for row in card_evidence:
        lines.append(
            "- "
            f"{row.get('card_id', '')} | {row.get('orientation', '')} | {row.get('domain', '')} | {row.get('position', '')}: "
            f"{row.get('evidence', '')}"
        )
    return "\n".join(lines)


def _build_card_insights(
    drawn_cards: List[Dict],
    cards: List[Dict],
    card_interpretations: List[str],
    hybrid_rag
) -> List[Dict]:
    """Build card insights for response."""
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

    return card_insights


def _add_personalization(
    result: Dict,
    hybrid_rag,
    drawn_cards: List[Dict],
    birthdate: str,
    mapped_theme: str
) -> Dict:
    """Add premium personalization to result."""
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

    return result

