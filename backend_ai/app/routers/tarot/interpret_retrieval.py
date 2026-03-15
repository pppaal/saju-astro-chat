"""
Retrieval helpers for tarot interpretation.
"""

from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional

from .context_detector import INTENT_LABELS

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
