"""Deterministic contract tests for tarot router prompt/evidence flow (no LLM call)."""

from __future__ import annotations

import json

from backend_ai.app.routers.tarot.interpret import (
    _build_evidence_repair_prompt,
    _fallback_card_evidence,
)
from backend_ai.app.routers.tarot.prompt_builder import (
    build_chat_system_prompt,
    build_unified_prompt,
)


def test_unified_prompt_contains_required_contract_sections():
    prompt = build_unified_prompt(
        spread_title="Three Card",
        question="What should I focus on this month?",
        card_details=[
            {
                "index": 0,
                "card_id": "major_0",
                "name": "The Fool",
                "orientation": "upright",
                "reversed_text": "",
                "domain": "career",
                "position": "present",
                "keywords": "new start, risk",
                "meaning": "new start",
                "symbolism": "cliff, bag, sun",
                "deep_meaning": "trust the process with grounded action",
            }
        ],
        question_context="career growth",
        forced_facet_context="- card_id=major_0 | orientation=upright",
        retrieved_support_context="career evidence",
        combinations_text="none",
        elemental_text="balanced",
        timing_text="next 4 weeks",
        archetype_text="explorer",
        is_korean=True,
    )

    assert "## 출력 형식 (JSON)" in prompt
    assert '"card_evidence"' in prompt
    assert "card_id/orientation/domain/position" in prompt


def test_chat_system_prompt_contains_required_safety_and_evidence_rules():
    prompt = build_chat_system_prompt(
        spread_title="Three Card",
        category="career",
        cards_context="- The Fool (present)",
        rag_context="retrieved context",
        overall_message="overall summary",
        latest_question="What now?",
        counselor_style=None,
        is_korean=True,
    )

    assert "🚫 절대 금지" in prompt
    assert "뽑힌 카드 이름과 위치 반드시 언급" in prompt
    assert "retrieved context" in prompt


def test_fallback_card_evidence_always_yields_required_keys():
    card_details = [
        {"card_id": "major_0", "orientation": "upright", "domain": "career", "position": "present"},
        {"card_id": "major_1", "orientation": "reversed", "domain": "career", "position": "challenge"},
    ]
    draws = [
        {"card_id": "major_0", "orientation": "upright", "domain": "career", "position": "present"},
        {"card_id": "major_1", "orientation": "reversed", "domain": "career", "position": "challenge"},
    ]

    rows = _fallback_card_evidence(card_details, draws, max_items=2)
    assert len(rows) == 2
    for row in rows:
        assert row["card_id"]
        assert row["orientation"] in {"upright", "reversed"}
        assert row["domain"]
        assert row["position"]
        assert row["evidence"]


def test_evidence_repair_prompt_includes_expected_draw_schema():
    expected_draws = [
        {"card_id": "major_0", "orientation": "upright", "domain": "career", "position": "present"},
        {"card_id": "major_1", "orientation": "reversed", "domain": "career", "position": "challenge"},
    ]
    prompt = _build_evidence_repair_prompt(
        original_prompt="orig",
        raw_response=json.dumps({"overall": "x", "card_evidence": []}),
        expected_draws=expected_draws,
    )

    assert "Return ONLY valid JSON" in prompt
    assert "card_id/orientation/domain/position" in prompt
    assert "major_0" in prompt
    assert "major_1" in prompt
