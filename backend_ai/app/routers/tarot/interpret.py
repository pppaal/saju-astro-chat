# backend_ai/app/routers/tarot/interpret.py
"""
Tarot interpretation route handler.
Premium tarot interpretation using Hybrid RAG + GPT.
"""

import logging
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
from .context_detector import (
    build_intent_focus_instruction,
    detect_question_context,
    resolve_question_intent,
)
from .prompt_builder import (
    build_enhanced_question,
    build_card_details,
    build_elemental_text,
    build_archetype_text,
    build_confidence_guardrail,
    build_spread_response_strategy,
    build_unified_prompt,
)
from .draws_validation import (
    default_domain_from_category,
    derive_draws_from_cards,
    validate_draws,
)
from .interpret_response import (
    _add_personalization,
    _build_card_insights,
    _build_combinations_payload,
    _build_evidence_repair_prompt,
    _build_forced_facet_context,
    _fallback_card_evidence,
    _get_combination_summaries,
    _has_required_evidence,
    _parse_unified_output,
    _render_card_evidence_section,
    _render_combinations_text,
)
from .interpret_retrieval import (
    _build_intent_aware_retrieval_query,
    _build_intent_priority_context,
    _build_intent_support_context,
    _collect_timing_details,
    _extract_tarot_graph_context,
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
            cache = None
            if use_cache:
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
            raw_card_names = [str(c.get("name", "")).strip() for c in cards if str(c.get("name", "")).strip()]

            # Build enhanced context
            enhanced_question = build_enhanced_question(user_question, saju_context, astro_context)

            # Map theme/spread
            mapped_theme, mapped_spread = map_tarot_theme(category, spread_id, user_question)
            logger.info(f"[TAROT] Mapped {category}/{spread_id} â†’ {mapped_theme}/{mapped_spread}")

            # Resolve question intent before retrieval so search/rerank can follow it
            q = enhanced_question or 'ì¼ë°˜ ìš´ì„¸'
            intent_question = user_question or enhanced_question or ""
            intent_payload = resolve_question_intent(
                intent_question,
                mapped_theme=mapped_theme,
                mapped_spread=mapped_spread,
                llm_fn=generate_with_gpt4,
            )
            retrieval_query = _build_intent_aware_retrieval_query(
                question=intent_question or q,
                card_names=raw_card_names,
                intent_payload=intent_payload,
                mapped_theme=mapped_theme,
                mapped_spread=mapped_spread,
            )
            question_context, is_playful_context = detect_question_context(intent_question or q, mapped_spread)
            is_korean = language == "ko"
            intent_summary = build_intent_focus_instruction(intent_payload, is_korean=is_korean)
            if intent_payload.get("is_playful"):
                is_playful_context = True

            # Build RAG context
            if birthdate:
                rag_context = hybrid_rag.build_premium_reading_context(
                    theme=mapped_theme,
                    sub_topic=mapped_spread,
                    drawn_cards=drawn_cards,
                    question=retrieval_query,
                    birthdate=birthdate,
                    moon_phase=moon_phase,
                    include_semantic_context=False,
                )
            else:
                rag_context = hybrid_rag.build_reading_context(
                    theme=mapped_theme,
                    sub_topic=mapped_spread,
                    drawn_cards=drawn_cards,
                    question=retrieval_query,
                    include_semantic_context=False,
                )

            logger.info(f"[TAROT] RAG context length: {len(rag_context) if rag_context else 0}")

            intent_support_trace = _build_intent_support_context(
                hybrid_rag=hybrid_rag,
                question=intent_question or q,
                card_names=raw_card_names,
                intent_payload=intent_payload,
                mapped_theme=mapped_theme,
                mapped_spread=mapped_spread,
                limit=3,
            )

            # GraphRAG enhancement - search for card-specific knowledge
            graph_rag_context = ""
            graph_trace: Dict[str, Any] = {
                "enabled": bool(HAS_GRAPH_RAG and search_graphs),
                "query": "",
                "candidate_count": 0,
                "snippet_count": 0,
                "filtered_out_count": 0,
                "used": False,
                "error": False,
                "snippets": [],
                "node_ids": [],
                "sources": [],
                "intent_terms": [],
            }
            if HAS_GRAPH_RAG and search_graphs:
                try:
                    graph_query = retrieval_query
                    graph_trace["query"] = graph_query
                    graph_results = search_graphs(graph_query, top_k=6)
                    graph_payload = _extract_tarot_graph_context(
                        graph_results,
                        raw_card_names,
                        intent_payload=intent_payload,
                        mapped_theme=mapped_theme,
                        mapped_spread=mapped_spread,
                        limit=3,
                    )
                    graph_rag_context = graph_payload["context"]
                    graph_trace.update(
                        {
                            "candidate_count": graph_payload["candidate_count"],
                            "snippet_count": graph_payload["snippet_count"],
                            "filtered_out_count": graph_payload["filtered_out_count"],
                            "used": bool(graph_payload["snippet_count"]),
                            "snippets": graph_payload["snippets"],
                            "node_ids": graph_payload["node_ids"],
                            "intent_terms": graph_payload.get("intent_terms", []),
                            "sources": list(
                                dict.fromkeys(
                                    [
                                        str(item.get("source", "")).strip()
                                        for item in graph_payload["snippets"]
                                        if str(item.get("source", "")).strip()
                                    ]
                                )
                            ),
                        }
                    )
                    if graph_rag_context:
                        logger.info(f"[TAROT] GraphRAG context added: {len(graph_rag_context)} chars")
                except Exception as graph_err:
                    logger.warning(f"[TAROT] GraphRAG search failed: {graph_err}")
                    graph_trace["error"] = True

            forced_facet_context = _build_forced_facet_context(cards, card_limit=5)
            retrieved_support_context = (rag_context or "")[:900]
            if intent_support_trace.get("context"):
                retrieved_support_context = f"{retrieved_support_context}\n\n{intent_support_trace['context']}"[:900]
            if graph_rag_context:
                retrieved_support_context = f"{retrieved_support_context}\n\n{graph_rag_context}"[:900]

            # Build card details
            card_details = build_card_details(
                drawn_cards,
                cards,
                hybrid_rag,
                default_domain=tarot_domain,
            )
            card_names = [cd['name'] for cd in card_details]
            advanced_rules = getattr(hybrid_rag, "advanced_rules", None)

            # Build additional context
            raw_combination_items = _get_combination_summaries(
                hybrid_rag,
                card_names,
                mapped_theme,
                limit=8,
            )
            combinations_text = _render_combinations_text(raw_combination_items, is_korean=is_korean)
            elemental_text = build_elemental_text(hybrid_rag, card_names)
            combination_items = _build_combinations_payload(raw_combination_items, is_korean)

            # Timing hint
            timing_text = ""
            timing_rule: Dict[str, str] = {}
            timing_items: List[Dict[str, str]] = []
            needs_broad_timing = "timing" in {
                str(intent_payload.get("primary_intent", "")).strip(),
                *[str(item).strip() for item in intent_payload.get("secondary_intents", []) or []],
            }
            if card_names:
                timing_items = _collect_timing_details(
                    card_names,
                    advanced_rules,
                    hybrid_rag,
                    include_all=needs_broad_timing,
                )
                if timing_items:
                    timing_rule = timing_items[0]
                    timing_text = " | ".join(
                        [
                            f"{item.get('card_name', '')}: {item.get('message', '')}".strip(": ")
                            for item in timing_items[:3]
                            if str(item.get("message", "")).strip()
                        ]
                    )

            # Archetype text
            archetype_text = build_archetype_text(hybrid_rag, card_names)

            crisis_rule: Dict[str, Any] = {}
            if advanced_rules and hasattr(advanced_rules, "detect_crisis_situation"):
                try:
                    crisis_rule = advanced_rules.detect_crisis_situation(drawn_cards, q) or {}
                except Exception as crisis_err:
                    logger.warning(f"[TAROT] Crisis detection failed: {crisis_err}")

            multi_card_rules: List[Dict[str, str]] = []
            if len(drawn_cards) >= 3 and advanced_rules and hasattr(advanced_rules, "get_multi_card_rule_matches"):
                try:
                    spread_info = None
                    if hasattr(hybrid_rag, "get_spread_info"):
                        spread_info = hybrid_rag.get_spread_info(mapped_theme, mapped_spread)
                    pattern = {}
                    if hasattr(hybrid_rag, "get_pattern_analysis"):
                        pattern = hybrid_rag.get_pattern_analysis(drawn_cards) or {}
                    multi_card_rules = advanced_rules.get_multi_card_rule_matches(
                        pattern,
                        theme=mapped_theme,
                        spread=spread_info,
                    ) or []
                except Exception as multi_err:
                    logger.warning(f"[TAROT] Multi-card rule matching failed: {multi_err}")

            intent_priority = _build_intent_priority_context(
                intent_payload=intent_payload,
                combination_items=combination_items,
                timing_items=timing_items,
                crisis_rule=crisis_rule,
                multi_card_rules=multi_card_rules,
                elemental_text=elemental_text,
                archetype_text=archetype_text,
                graph_trace=graph_trace,
                is_korean=is_korean,
            )
            confidence_guardrail = build_confidence_guardrail(
                intent_payload=intent_payload,
                support_summary={
                    "combination_count": len(combination_items),
                    "timing_count": len(timing_items),
                    "graph_count": len(graph_trace.get("snippets", []) or []),
                    "multi_count": len(multi_card_rules),
                },
                is_korean=is_korean,
            )
            spread_strategy = build_spread_response_strategy(
                spread_title=spread_title,
                card_count=len(card_details),
                is_korean=is_korean,
            )

            # Build unified prompt
            unified_prompt = build_unified_prompt(
                spread_title=spread_title,
                question=q,
                card_details=card_details,
                question_intent_summary=intent_summary,
                question_context=question_context,
                forced_facet_context=forced_facet_context,
                retrieved_support_context=retrieved_support_context,
                intent_priority_text=intent_priority.get("prompt_text", ""),
                confidence_guardrail_text=confidence_guardrail.get("prompt_text", ""),
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
            evidence_repair_used = False
            evidence_fallback_used = False
            llm_fallback_used = False

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
                    evidence_repair_used = True
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
                        evidence_fallback_used = True

            except Exception as llm_e:
                logger.warning(f"[TAROT] Unified GPT call failed: {llm_e}, using fallback")
                cards_str = ", ".join([c.get("name", "") for c in drawn_cards])
                reading_text = f"카드 해석: {cards_str}. {(retrieved_support_context or '')[:500]}"
                card_evidence = _fallback_card_evidence(card_details, draws, max_items=len(drawn_cards))
                llm_fallback_used = True
                evidence_fallback_used = True

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
                evidence_fallback_used = True
            evidence_section = _render_card_evidence_section(card_evidence)

            combination_trace = [
                {
                    "title": item.get("title", ""),
                    "type": item.get("type", "pair"),
                    "rule_id": item.get("rule_id", ""),
                    "source": item.get("source", ""),
                    "theme_field": item.get("theme_field", ""),
                    "pair_key": item.get("pair_key", ""),
                }
                for item in combination_items[:5]
            ]
            used_rule_ids = list(
                dict.fromkeys(
                    [
                        str(item.get("rule_id", "")).strip()
                        for item in combination_items
                        if str(item.get("rule_id", "")).strip()
                    ]
                    + [
                        str(item.get("rule_id", "")).strip()
                        for item in timing_items
                        if str(item.get("rule_id", "")).strip()
                    ]
                    + ([str(crisis_rule.get("rule_id", "")).strip()] if str(crisis_rule.get("rule_id", "")).strip() else [])
                    + [
                        str(item.get("rule_id", "")).strip()
                        for item in multi_card_rules
                        if str(item.get("rule_id", "")).strip()
                    ]
                )
            )

            trace = {
                "mapped_theme": mapped_theme,
                "mapped_spread": mapped_spread,
                "intent": intent_payload,
                "retrieval": {
                    "query": retrieval_query,
                    "embedded_semantic_context": False,
                    "intent_support": intent_support_trace,
                },
                "question_context_applied": bool(question_context.strip()),
                "playful_question": is_playful_context,
                "graph_rag": graph_trace,
                "used_graph_node_ids": graph_trace.get("node_ids", []),
                "timing_rule": timing_rule,
                "timing_rules": timing_items[:3],
                "crisis_rule": crisis_rule,
                "multi_card_rules": multi_card_rules[:6],
                "combination_sources": combination_trace,
                "intent_priority": intent_priority,
                "confidence_guardrail": confidence_guardrail,
                "spread_strategy": spread_strategy,
                "used_rule_ids": used_rule_ids,
                "fallbacks": {
                    "evidence_repair_used": evidence_repair_used,
                    "evidence_fallback_used": evidence_fallback_used,
                    "llm_fallback_used": llm_fallback_used,
                },
            }

            result = {
                "overall_message": f"{reading_text}\n\n{evidence_section}" if evidence_section else reading_text,
                "card_insights": card_insights,
                "card_evidence": card_evidence,
                "guidance": advice_text if advice_text else "ì¹´ë“œì˜ ì§€í˜œì— ê·€ ê¸°ìš¸ì´ì„¸ìš”.",
                "affirmation": "ë‚˜ëŠ” ìš°ì£¼ì˜ ì§€í˜œë¥¼ ì‹ ë¢°í•©ë‹ˆë‹¤.",
                "combinations": combination_items,
                "confidence_guardrail": confidence_guardrail,
                "spread_strategy": spread_strategy,
                "used_rule_ids": used_rule_ids,
                "followup_questions": dynamic_followup,
                "trace": trace,
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



