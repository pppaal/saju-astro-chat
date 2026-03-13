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
from .context_detector import (
    INTENT_LABELS,
    build_intent_focus_instruction,
    detect_question_context,
    resolve_question_intent,
)
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


INTENT_RETRIEVAL_TERMS: Dict[str, List[str]] = {
    "reconciliation": ["재회", "다시", "연락", "속마음", "reconciliation", "contact"],
    "feelings": ["감정", "속마음", "진심", "마음", "feelings", "emotion"],
    "confession": ["고백", "표현", "용기", "confession", "express"],
    "commitment": ["결혼", "약속", "장기", "marriage", "commitment"],
    "breakup": ["이별", "거리", "종료", "breakup", "separation"],
    "new_connection": ["새 인연", "만남", "유입", "dating", "new connection"],
    "conflict_resolution": ["갈등", "화해", "사과", "conflict", "repair"],
    "career_change": ["이직", "변화", "퇴사", "career change", "transition"],
    "job_search": ["취업", "합격", "면접", "job search", "offer"],
    "entrepreneurship": ["사업", "창업", "리스크", "business", "startup"],
    "promotion": ["승진", "평가", "인정", "promotion", "recognition"],
    "workplace_relationship": ["상사", "동료", "직장 관계", "boss", "coworker"],
    "finance": ["금전", "수입", "지출", "money", "income"],
    "investment": ["투자", "변동성", "진입", "investment", "risk"],
    "debt": ["대출", "부채", "상환", "debt", "loan"],
    "health": ["건강", "회복", "무리", "health", "recovery"],
    "emotional_healing": ["불안", "회복", "감정", "anxiety", "healing"],
    "comparison": ["비교", "선택지", "장단점", "compare", "options"],
    "decision": ["결정", "선택", "리스크", "decision", "choice"],
    "timing": ["시기", "타이밍", "언제", "timing", "when"],
    "daily_flow": ["흐름", "주간", "월간", "flow", "period"],
    "self_identity": ["본질", "강점", "패턴", "identity", "self"],
    "shadow_work": ["내면", "그림자", "무의식", "shadow", "subconscious"],
    "growth": ["성장", "변화", "다음 단계", "growth", "development"],
}


INTENT_RULE_PRIORITIES: Dict[str, List[str]] = {
    "reconciliation": ["combination", "multi_card", "timing", "graph", "crisis"],
    "feelings": ["combination", "graph", "archetype", "multi_card", "timing"],
    "confession": ["timing", "combination", "graph", "multi_card"],
    "commitment": ["combination", "timing", "multi_card", "graph"],
    "breakup": ["crisis", "combination", "multi_card", "timing"],
    "new_connection": ["timing", "graph", "combination", "archetype"],
    "conflict_resolution": ["multi_card", "combination", "graph", "timing"],
    "career_change": ["timing", "combination", "multi_card", "graph"],
    "job_search": ["timing", "graph", "combination", "multi_card"],
    "entrepreneurship": ["decision", "timing", "graph", "combination"],
    "promotion": ["timing", "graph", "combination", "multi_card"],
    "workplace_relationship": ["graph", "multi_card", "combination", "timing"],
    "exam": ["timing", "graph", "combination"],
    "finance": ["graph", "combination", "timing", "multi_card"],
    "investment": ["timing", "graph", "combination", "multi_card"],
    "debt": ["crisis", "graph", "timing", "combination"],
    "health": ["crisis", "timing", "graph", "archetype"],
    "emotional_healing": ["crisis", "archetype", "graph", "combination"],
    "comparison": ["multi_card", "combination", "timing", "graph"],
    "decision": ["multi_card", "combination", "timing", "graph"],
    "timing": ["timing", "multi_card", "combination", "graph"],
    "daily_flow": ["timing", "graph", "combination", "multi_card"],
    "self_identity": ["archetype", "graph", "combination"],
    "shadow_work": ["archetype", "graph", "crisis"],
    "growth": ["archetype", "graph", "combination", "timing"],
}


EVIDENCE_LABELS_KO = {
    "combination": "카드 조합",
    "multi_card": "멀티카드 패턴",
    "timing": "시기 힌트",
    "graph": "GraphRAG 근거",
    "crisis": "위기 신호",
    "archetype": "심리 원형",
    "elemental": "원소 균형",
    "decision": "결정 포인트",
}


def _normalize_graph_text(text: str) -> str:
    """Normalize free text for lightweight tarot domain filtering."""
    return re.sub(r"\s+", " ", re.sub(r"[^0-9a-zA-Z가-힣]+", " ", str(text or "").lower())).strip()


def _build_card_name_signals(card_names: List[str]) -> List[str]:
    signals: List[str] = []
    for card_name in card_names:
        normalized = _normalize_graph_text(card_name)
        if not normalized:
            continue
        signals.append(normalized)
        for token in normalized.split():
            if len(token) >= 3 or re.search(r"[가-힣]", token):
                signals.append(token)
    return list(dict.fromkeys([signal for signal in signals if signal]))


def _get_intent_retrieval_terms(
    intent_payload: Optional[Dict[str, Any]],
    mapped_theme: str = "",
    mapped_spread: str = "",
) -> List[str]:
    if not intent_payload:
        return []

    terms: List[str] = []
    primary_intent = str(intent_payload.get("primary_intent", "")).strip()
    secondary_intents = [str(intent).strip() for intent in intent_payload.get("secondary_intents", []) or []]

    for intent in [primary_intent] + secondary_intents:
        terms.extend(INTENT_RETRIEVAL_TERMS.get(intent, []))
    if mapped_theme:
        terms.append(mapped_theme)
    if mapped_spread and mapped_spread not in {mapped_theme, "single_card", "three_card"}:
        terms.append(mapped_spread)

    return list(dict.fromkeys([term.strip() for term in terms if str(term).strip()]))


def _build_intent_aware_retrieval_query(
    question: str,
    card_names: List[str],
    intent_payload: Optional[Dict[str, Any]],
    mapped_theme: str = "",
    mapped_spread: str = "",
) -> str:
    terms = _get_intent_retrieval_terms(intent_payload, mapped_theme=mapped_theme, mapped_spread=mapped_spread)
    parts = ["타로", question]
    if card_names:
        parts.extend(card_names[:3])
    parts.extend(terms[:6])
    return " ".join([str(part).strip() for part in parts if str(part).strip()])


def _score_intent_relevance(text: str, intent_terms: List[str], card_signals: List[str]) -> float:
    normalized = _normalize_graph_text(text)
    score = 0.0
    score += min(0.8, 0.18 * sum(1 for term in intent_terms if _normalize_graph_text(term) and _normalize_graph_text(term) in normalized))
    score += min(0.4, 0.12 * sum(1 for signal in card_signals if signal and signal in normalized))
    return score


def _extract_tarot_graph_context(
    graph_results: Any,
    card_names: List[str],
    intent_payload: Optional[Dict[str, Any]] = None,
    mapped_theme: str = "",
    mapped_spread: str = "",
    limit: int = 3,
) -> Dict[str, Any]:
    """Filter shared graph results down to tarot-looking snippets for this draw."""
    tarot_signals = ["타로", "tarot", "card", "cards", "arcana", "정방향", "역방향", "upright", "reversed"]
    card_signals = _build_card_name_signals(card_names)
    intent_terms = _get_intent_retrieval_terms(intent_payload, mapped_theme=mapped_theme, mapped_spread=mapped_spread)
    snippets: List[Dict[str, Any]] = []
    seen_texts = set()
    candidate_count = len(graph_results) if isinstance(graph_results, list) else 0
    filtered_out = 0

    if not isinstance(graph_results, list):
        return {
            "context": "",
            "candidate_count": 0,
            "snippet_count": 0,
            "filtered_out_count": 0,
            "snippets": [],
            "node_ids": [],
        }

    candidates: List[Dict[str, Any]] = []
    for row in graph_results:
        if not isinstance(row, dict):
            filtered_out += 1
            continue
        text = str(row.get("text", row.get("description", row.get("content", ""))) or "").strip()
        normalized = _normalize_graph_text(text)
        if not normalized:
            filtered_out += 1
            continue

        has_tarot_signal = any(signal in normalized for signal in tarot_signals)
        has_card_signal = any(signal in normalized for signal in card_signals)
        if not (has_tarot_signal or has_card_signal):
            filtered_out += 1
            continue

        snippet_text = text[:280].strip()
        if not snippet_text or snippet_text in seen_texts:
            continue

        node_id = str(row.get("node_id") or row.get("original_id") or row.get("id") or "").strip()
        source = str(row.get("source", "")).strip()
        label = str(row.get("label", "")).strip()
        seen_texts.add(snippet_text)
        candidates.append(
            {
                "node_id": node_id,
                "original_id": str(row.get("original_id") or node_id).strip(),
                "source": source,
                "label": label,
                "type": str(row.get("type", "")).strip(),
                "score": row.get("score"),
                "text": snippet_text,
                "intent_relevance": round(
                    _score_intent_relevance(snippet_text, intent_terms, card_signals),
                    4,
                ),
            }
        )

    candidates.sort(
        key=lambda row: (
            -float(row.get("intent_relevance", 0.0) or 0.0),
            -float(row.get("score", 0.0) or 0.0),
            row.get("label", ""),
        )
    )
    snippets = candidates[:limit]

    return {
        "context": "\n".join([row["text"] for row in snippets]),
        "candidate_count": candidate_count,
        "snippet_count": len(snippets),
        "filtered_out_count": filtered_out,
        "snippets": snippets,
        "node_ids": [row["node_id"] for row in snippets if row.get("node_id")],
        "intent_terms": intent_terms,
    }


def _build_intent_support_context(
    hybrid_rag,
    question: str,
    card_names: List[str],
    intent_payload: Optional[Dict[str, Any]],
    mapped_theme: str = "",
    mapped_spread: str = "",
    limit: int = 3,
) -> Dict[str, Any]:
    query = _build_intent_aware_retrieval_query(
        question=question,
        card_names=card_names,
        intent_payload=intent_payload,
        mapped_theme=mapped_theme,
        mapped_spread=mapped_spread,
    )
    category_filter = mapped_theme if mapped_theme in {"love", "career", "wealth"} else None
    search_results: List[Dict[str, Any]] = []

    try:
        advanced_embeddings = getattr(hybrid_rag, "advanced_embeddings", None)
        if advanced_embeddings and hasattr(advanced_embeddings, "search_hybrid"):
            search_results = advanced_embeddings.search_hybrid(query, top_k=max(limit * 2, 6), category=category_filter) or []
        elif hasattr(hybrid_rag, "search_advanced_rules"):
            search_results = hybrid_rag.search_advanced_rules(query, top_k=max(limit * 2, 6), category=category_filter) or []
    except Exception as retrieval_err:
        logger.warning(f"[TAROT] Intent support retrieval failed: {retrieval_err}")
        search_results = []

    intent_terms = _get_intent_retrieval_terms(intent_payload, mapped_theme=mapped_theme, mapped_spread=mapped_spread)
    card_signals = _build_card_name_signals(card_names)
    ranked_results: List[Dict[str, Any]] = []
    for row in search_results:
        if not isinstance(row, dict):
            continue
        text = str(row.get("text", "") or "").strip()
        if not text:
            continue
        ranked = row.copy()
        ranked["intent_relevance"] = round(_score_intent_relevance(text, intent_terms, card_signals), 4)
        ranked_results.append(ranked)

    ranked_results.sort(
        key=lambda row: (
            -float(row.get("intent_relevance", 0.0) or 0.0),
            -float(row.get("score", 0.0) or 0.0),
            row.get("category", ""),
        )
    )
    selected = ranked_results[:limit]
    context = "\n".join([f"- {str(row.get('text', '')).strip()[:220]}" for row in selected if str(row.get("text", "")).strip()])
    return {
        "query": query,
        "category_filter": category_filter or "",
        "candidate_count": len(search_results),
        "selected_count": len(selected),
        "context": context,
        "results": [
            {
                "category": str(row.get("category", "")).strip(),
                "score": row.get("score"),
                "intent_relevance": row.get("intent_relevance"),
                "text": str(row.get("text", "")).strip()[:220],
            }
            for row in selected
        ],
        "intent_terms": intent_terms,
    }


def _collect_timing_details(
    card_names: List[str],
    advanced_rules,
    hybrid_rag,
    include_all: bool = False,
) -> List[Dict[str, str]]:
    timing_items: List[Dict[str, str]] = []

    for card_name in card_names[: (len(card_names) if include_all else 1)]:
        item: Dict[str, str] = {}
        if advanced_rules and hasattr(advanced_rules, "get_timing_hint_details"):
            item = advanced_rules.get_timing_hint_details(card_name) or {}
        if not item:
            timing_hint = hybrid_rag.get_timing_hint(card_name) if hasattr(hybrid_rag, "get_timing_hint") else ""
            if timing_hint:
                item = {
                    "rule_id": "",
                    "category": "",
                    "card_name": card_name,
                    "message": str(timing_hint).strip(),
                }
        if item and str(item.get("message", "")).strip():
            timing_items.append(
                {
                    "rule_id": str(item.get("rule_id", "")).strip(),
                    "category": str(item.get("category", "")).strip(),
                    "card_name": str(item.get("card_name", card_name)).strip(),
                    "message": str(item.get("message", "")).strip(),
                }
            )
        if timing_items and not include_all:
            break

    unique_items: List[Dict[str, str]] = []
    seen_keys = set()
    for item in timing_items:
        dedupe_key = (item.get("rule_id", ""), item.get("card_name", ""), item.get("message", ""))
        if dedupe_key in seen_keys:
            continue
        seen_keys.add(dedupe_key)
        unique_items.append(item)
    return unique_items


def _build_intent_priority_context(
    intent_payload: Optional[Dict[str, Any]],
    combination_items: List[Dict[str, Any]],
    timing_items: List[Dict[str, str]],
    crisis_rule: Dict[str, Any],
    multi_card_rules: List[Dict[str, str]],
    elemental_text: str,
    archetype_text: str,
    graph_trace: Dict[str, Any],
    is_korean: bool = True,
) -> Dict[str, Any]:
    primary_intent = str((intent_payload or {}).get("primary_intent", "")).strip()
    secondary_intents = [
        str(intent).strip()
        for intent in (intent_payload or {}).get("secondary_intents", []) or []
        if str(intent).strip()
    ]
    intents = [intent for intent in [primary_intent] + secondary_intents if intent]

    priority_order: List[str] = []
    seen = set()
    for intent in intents:
        for evidence_type in INTENT_RULE_PRIORITIES.get(intent, []):
            if evidence_type not in seen:
                seen.add(evidence_type)
                priority_order.append(evidence_type)

    for fallback_type in ["combination", "timing", "multi_card", "graph", "archetype", "crisis", "elemental"]:
        if fallback_type not in seen:
            priority_order.append(fallback_type)

    highlights_by_type: Dict[str, str] = {}
    if combination_items:
        top_combo = combination_items[0]
        highlights_by_type["combination"] = f"{top_combo.get('title', '')}: {top_combo.get('summary', '')[:180]}".strip()
    if timing_items:
        timing_preview = [
            f"{item.get('card_name', '')} {item.get('message', '')}".strip()
            for item in timing_items[:3]
            if str(item.get("message", "")).strip()
        ]
        if timing_preview:
            highlights_by_type["timing"] = " | ".join(timing_preview)
    if multi_card_rules:
        highlights_by_type["multi_card"] = str(multi_card_rules[0].get("message", "")).strip()
    if graph_trace.get("snippets"):
        top_snippet = graph_trace["snippets"][0]
        snippet_label = str(top_snippet.get("label", "")).strip()
        snippet_text = str(top_snippet.get("text", "")).strip()
        highlights_by_type["graph"] = f"{snippet_label}: {snippet_text[:180]}".strip(": ")
    if crisis_rule and str(crisis_rule.get("crisis_name", "")).strip():
        highlights_by_type["crisis"] = f"{crisis_rule.get('crisis_name', '')}: {crisis_rule.get('severity', 'moderate')}".strip()
    if archetype_text:
        highlights_by_type["archetype"] = archetype_text[:180]
    if elemental_text:
        highlights_by_type["elemental"] = elemental_text[:180]
    if primary_intent in {"decision", "comparison", "entrepreneurship"}:
        highlights_by_type["decision"] = "선택지별 리스크와 먼저 움직일 쪽을 분리해서 읽으세요." if is_korean else "Separate each option's risk before giving advice."

    prioritized_highlights: List[Dict[str, str]] = []
    for evidence_type in priority_order:
        preview = str(highlights_by_type.get(evidence_type, "")).strip()
        if not preview:
            continue
        prioritized_highlights.append(
            {
                "type": evidence_type,
                "label": EVIDENCE_LABELS_KO.get(evidence_type, evidence_type) if is_korean else evidence_type,
                "preview": preview,
            }
        )
        if len(prioritized_highlights) >= 4:
            break

    primary_label = INTENT_LABELS.get(primary_intent, primary_intent) if primary_intent else ""
    order_text = " > ".join(
        [EVIDENCE_LABELS_KO.get(item, item) if is_korean else item for item in priority_order[:4]]
    )
    lines = ["## Intent Priority"]
    if primary_label:
        lines.append(f"- primary_focus: {primary_label}")
    if order_text:
        lines.append(f"- prioritize_evidence: {order_text}")
    for item in prioritized_highlights:
        lines.append(f"- {item['label']}: {item['preview']}")

    return {
        "prompt_text": "\n".join(lines),
        "priority_order": priority_order,
        "highlights": prioritized_highlights,
    }


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
                    moon_phase=moon_phase
                )
            else:
                rag_context = hybrid_rag.build_reading_context(
                    theme=mapped_theme,
                    sub_topic=mapped_spread,
                    drawn_cards=drawn_cards,
                    question=retrieval_query
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
            combinations_text = build_combinations_text(hybrid_rag, card_names, mapped_theme)
            elemental_text = build_elemental_text(hybrid_rag, card_names)
            combination_items = _build_combinations_payload(hybrid_rag, card_names, mapped_theme, is_korean)

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


def _build_combinations_payload(
    hybrid_rag,
    card_names: List[str],
    theme: str,
    is_korean: bool,
    limit: int = 8
) -> List[Dict[str, Any]]:
    """Build normalized combination payload for client rendering."""
    advanced_rules = getattr(hybrid_rag, "advanced_rules", None)
    if not advanced_rules or not hasattr(advanced_rules, "build_combination_summaries"):
        return []

    try:
        raw_items = advanced_rules.build_combination_summaries(card_names, theme=theme, limit=limit)
    except Exception as combo_err:
        logger.warning(f"[TAROT] Failed to build combination payload: {combo_err}")
        return []

    normalized: List[Dict[str, Any]] = []
    for item in raw_items:
        cards = item.get("cards", []) or []
        focus = str(item.get("focus", "")).strip()
        advice = str(item.get("advice", "")).strip()
        category = str(item.get("category", "")).strip()
        if not cards or not focus:
            continue

        title = " + ".join([str(card).strip() for card in cards if str(card).strip()])
        if not title:
            continue

        summary = focus[:260]
        if advice:
            summary = f"{summary} {'조언' if is_korean else 'Advice'}: {advice[:180]}"

        normalized.append(
            {
                "type": item.get("type", "pair"),
                "title": title,
                "category": category,
                "summary": summary,
                "cards": cards,
                "rule_id": str(item.get("rule_id", "")).strip(),
                "source": str(item.get("source", "")).strip(),
                "theme_field": str(item.get("theme_field", "")).strip(),
                "pair_key": str(item.get("pair_key", "")).strip(),
                "element_relation": str(item.get("element_relation", "")).strip(),
            }
        )

    return normalized[:limit]


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

