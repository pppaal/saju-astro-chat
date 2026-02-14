"""Tests for tarot answer quality helpers (evidence + draws validation)."""

from backend_ai.app.routers.tarot.draws_validation import validate_draws
from backend_ai.app.routers.tarot.interpret import (
    _fallback_card_evidence,
    _has_required_evidence,
    _parse_unified_output,
    _render_card_evidence_section,
)


def test_validate_draws_reports_field_errors():
    draws = [
        {"card_id": "UNKNOWN_ID", "orientation": "up", "domain": "romance", "position": "past"},
    ]
    _, errors = validate_draws(draws, default_domain="general", allowed_positions=["present", "future"])

    fields = {e.field for e in errors}
    assert "card_id" in fields
    assert "orientation" in fields
    assert "position" in fields


def test_parse_unified_output_extracts_card_evidence():
    raw = """
    {
      "overall": "요약",
      "cards": [{"position": "현재", "interpretation": "설명"}],
      "card_evidence": [{
        "card_id": "MAJOR_0",
        "orientation": "upright",
        "domain": "love",
        "position": "현재",
        "evidence": "첫 문장. 둘째 문장."
      }],
      "advice": [{"title": "행동", "detail": "실행"}]
    }
    """
    parsed = _parse_unified_output(raw, 1)
    assert parsed["overall"] == "요약"
    assert len(parsed["card_evidence"]) == 1
    assert parsed["card_evidence"][0]["card_id"] == "MAJOR_0"
    assert _has_required_evidence(parsed["card_evidence"], 1) is True


def test_has_required_evidence_rejects_non_2_to_3_sentences():
    one_sentence = [
        {
            "card_id": "MAJOR_0",
            "orientation": "upright",
            "domain": "love",
            "position": "present",
            "evidence": "Only one sentence.",
        }
    ]
    four_sentences = [
        {
            "card_id": "MAJOR_0",
            "orientation": "upright",
            "domain": "love",
            "position": "present",
            "evidence": "One. Two. Three. Four.",
        }
    ]

    assert _has_required_evidence(one_sentence, 1) is False
    assert _has_required_evidence(four_sentences, 1) is False


def test_has_required_evidence_requires_exact_draw_count():
    rows = [
        {
            "card_id": "MAJOR_0",
            "orientation": "upright",
            "domain": "love",
            "position": "present",
            "evidence": "Sentence one. Sentence two.",
        },
        {
            "card_id": "MAJOR_1",
            "orientation": "reversed",
            "domain": "career",
            "position": "future",
            "evidence": "Sentence one. Sentence two.",
        },
    ]

    assert _has_required_evidence(rows, 1) is False
    assert _has_required_evidence(rows, 2) is True


def test_render_card_evidence_section_contains_schema_fields():
    section = _render_card_evidence_section(
        [
            {
                "card_id": "MAJOR_1",
                "orientation": "reversed",
                "domain": "career",
                "position": "현재",
                "evidence": "핵심 근거 문장 2개.",
            }
        ]
    )
    assert "Card Evidence" in section
    assert "MAJOR_1" in section
    assert "reversed" in section
    assert "career" in section


def test_fallback_card_evidence_matches_card_count():
    card_details = [
        {"card_id": "MAJOR_0", "orientation": "upright", "domain": "love", "position": "현재", "name": "The Fool", "meaning": "의미", "symbolism": "상징", "advice": "조언"},
        {"card_id": "MAJOR_1", "orientation": "reversed", "domain": "career", "position": "미래", "name": "The Magician", "meaning": "의미2", "symbolism": "상징2", "advice": "조언2"},
    ]
    draws = [
        {"card_id": "MAJOR_0", "orientation": "upright", "domain": "love", "position": "현재"},
        {"card_id": "MAJOR_1", "orientation": "reversed", "domain": "career", "position": "미래"},
    ]
    evidence = _fallback_card_evidence(card_details, draws, max_items=2)
    assert len(evidence) == 2
    assert _has_required_evidence(evidence, 2) is True
