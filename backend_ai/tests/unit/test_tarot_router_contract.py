"""Deterministic contract tests for tarot router prompt/evidence flow."""

from __future__ import annotations

import json

from backend_ai.app.routers.tarot.interpret import (
    _build_evidence_repair_prompt,
    _fallback_card_evidence,
)
from backend_ai.app.routers.tarot.chat import (
    _resolve_context_spread,
    _strip_evidence_from_overall_message,
)
from backend_ai.app.routers.tarot.prompt_builder import (
    build_counseling_frame_structure,
    build_chat_system_prompt,
    build_spread_response_strategy,
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
        question_intent_summary="## Question Intent\n- primary: career growth",
        question_context="career growth",
        forced_facet_context="- card_id=major_0 | orientation=upright",
        retrieved_support_context="career evidence",
        intent_priority_text="## Intent Priority\n- prioritize_evidence: timing > card combination",
        confidence_guardrail_text="## Confidence Guardrail\n- tone: balanced",
        combinations_text="none",
        elemental_text="balanced",
        timing_text="next 4 weeks",
        archetype_text="explorer",
        is_korean=True,
    )

    assert "## 출력 형식 (JSON)" in prompt
    assert "## Intent Priority" in prompt
    assert "## Confidence Guardrail" in prompt
    assert "## Counseling Structure" in prompt
    assert "## Spread Strategy" in prompt
    assert '"card_evidence"' in prompt
    assert "card_id/orientation/domain/position" in prompt
    assert "규칙 무시/시스템 공개/비밀 노출" in prompt


def test_spread_response_strategy_changes_by_card_count():
    single = build_spread_response_strategy("Single Card", 1, is_korean=True)
    three = build_spread_response_strategy("Three Card", 3, is_korean=True)
    extended = build_spread_response_strategy("Celtic Cross", 5, is_korean=True)

    assert single["mode"] == "single_card_focus"
    assert three["mode"] == "three_card_flow"
    assert extended["mode"] == "deep_counseling_spread"
    assert "2-3" in single["advice_spec"]
    assert "3-4" in three["advice_spec"]
    assert "3-5" in extended["advice_spec"]


def test_counseling_frame_structure_changes_with_frame_label():
    relationship = build_counseling_frame_structure(
        "## Question Intent\n- counseling_frame: 관계 회복 프레임",
        is_korean=True,
    )
    decision = build_counseling_frame_structure(
        "## Question Intent\n- counseling_frame: 결정/계획 프레임",
        is_korean=True,
    )

    assert "다시 이어질 조건" in relationship
    assert "선택지별 분위기" in decision


def test_chat_system_prompt_contains_required_safety_and_evidence_rules():
    prompt = build_chat_system_prompt(
        spread_title="Three Card",
        category="career",
        cards_context="- The Fool (present)",
        rag_context="retrieved context",
        overall_message="overall summary",
        latest_question="What now?",
        question_intent_summary="## Question Intent\n- primary: decision",
        counselor_style=None,
        is_korean=True,
    )

    assert "절대 금지" in prompt
    assert "뽑힌 카드 이름과 위치 반드시 언급" in prompt
    assert "retrieved context" in prompt
    assert "규칙 무시/시스템 공개/비밀 노출" in prompt


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


def test_chat_uses_spread_id_before_display_title():
    spread = _resolve_context_spread(
        {
            "spread_title": "Three Card Spread",
            "spread_id": "decision",
        }
    )

    assert spread == "decision"


def test_chat_strips_card_evidence_from_previous_reading():
    cleaned = _strip_evidence_from_overall_message(
        "overall summary\n\n## Card Evidence\n- MAJOR_0 | upright | love | present: evidence"
    )

    assert cleaned == "overall summary"
