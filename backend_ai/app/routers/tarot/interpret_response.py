"""
Response and evidence helpers for tarot interpretation.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


def _parse_unified_output(raw_text: str, card_count: int) -> Dict[str, Any]:
    parsed: Dict[str, Any] = {}
    try:
        json_match = re.search(r"\{[\s\S]*\}", raw_text)
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


def _get_combination_summaries(
    hybrid_rag,
    card_names: List[str],
    theme: str,
    limit: int = 8,
) -> List[Dict[str, Any]]:
    advanced_rules = getattr(hybrid_rag, "advanced_rules", None)
    if advanced_rules and hasattr(advanced_rules, "build_combination_summaries"):
        try:
            return advanced_rules.build_combination_summaries(card_names, theme=theme, limit=limit) or []
        except Exception as combo_err:
            logger.warning(f"[TAROT] Failed to build combination summaries: {combo_err}")
            return []

    fallback_items: List[Dict[str, Any]] = []
    try:
        pair_interpretations = hybrid_rag.get_all_card_pair_interpretations(card_names)
    except Exception as combo_err:
        logger.warning(f"[TAROT] Failed to build fallback pair interpretations: {combo_err}")
        return []

    for pair_data in pair_interpretations[:limit]:
        if not isinstance(pair_data, dict):
            continue
        card1 = str(pair_data.get("card1", "")).strip()
        card2 = str(pair_data.get("card2", "")).strip()
        focus = str(
            pair_data.get("love")
            or pair_data.get("career")
            or pair_data.get("finance")
            or pair_data.get("advice")
            or ""
        ).strip()
        if not card1 or not card2 or not focus:
            continue
        fallback_items.append(
            {
                "type": "pair",
                "cards": [card1, card2],
                "focus": focus,
                "advice": str(pair_data.get("advice", "")).strip(),
                "category": str(theme or "").strip(),
                "rule_id": "",
                "source": "pair_fallback",
                "theme_field": str(theme or "").strip(),
                "pair_key": f"{card1} + {card2}",
                "element_relation": "",
            }
        )
    return fallback_items


def _render_combinations_text(
    raw_items: List[Dict[str, Any]],
    is_korean: bool,
) -> str:
    combo_parts: List[str] = []

    for item in raw_items:
        cards = item.get("cards", []) or []
        cards_key = " + ".join([str(card).strip() for card in cards if str(card).strip()])
        if not cards_key:
            continue
        focus = str(item.get("focus", "")).strip()
        advice = str(item.get("advice", "")).strip()
        category = str(item.get("category", "")).strip()

        if item.get("type") == "special":
            if focus:
                title = f"✦ SPECIAL ({category}) {cards_key}" if category else f"✦ SPECIAL {cards_key}"
                combo_parts.append(f"{title}: {focus[:180]}")
                if advice:
                    combo_parts.append(f"  {'조언' if is_korean else 'Advice'}: {advice[:140]}")
            continue

        if focus:
            combo_parts.append(f"• {cards_key}: {focus[:170]}")
        if advice:
            combo_parts.append(f"  {'조언' if is_korean else 'Advice'}: {advice[:120]}")

    return "\n".join(combo_parts) if combo_parts else ""


def _build_combinations_payload(
    raw_items: List[Dict[str, Any]],
    is_korean: bool,
    limit: int = 8,
) -> List[Dict[str, Any]]:
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
    hybrid_rag,
) -> List[Dict]:
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
            "shadow": insights.get("shadow_work"),
        }

        chakras = insights.get("chakras", [])
        if chakras:
            first_chakra = chakras[0]
            card_insight["chakra"] = {
                "name": first_chakra.get("korean", first_chakra.get("name", "")),
                "color": first_chakra.get("color", "#8a2be2"),
                "guidance": first_chakra.get("healing_affirmation", ""),
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
    mapped_theme: str,
) -> Dict:
    try:
        birth_card = hybrid_rag.get_birth_card(birthdate)
        year_card = hybrid_rag.get_year_card(birthdate)
        personalization = hybrid_rag.get_personalized_reading(drawn_cards, birthdate)
        narrative = hybrid_rag.get_reading_narrative(drawn_cards, mapped_theme)

        result["personalization"] = {
            "birth_card": {
                "name": birth_card.get("primary_card"),
                "korean": birth_card.get("korean"),
                "traits": birth_card.get("traits", []),
            },
            "year_card": {
                "name": year_card.get("year_card"),
                "korean": year_card.get("year_card_korean"),
                "theme": year_card.get("korean"),
                "advice": year_card.get("advice"),
            },
            "personal_connections": personalization.get("personal_connections", []),
        }

        result["narrative"] = {
            "opening_hook": narrative.get("opening_hook"),
            "tone": narrative.get("tone", {}).get("mood"),
            "resolution": narrative.get("resolution"),
            "card_connections": hybrid_rag.get_card_connections(drawn_cards)[:5],
        }
    except Exception as e:
        logger.warning(f"[TAROT] Premium personalization failed: {e}")

    return result
