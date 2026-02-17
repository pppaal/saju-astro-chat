"""Safety contract tests for tarot crisis detection logic."""

from __future__ import annotations

from backend_ai.app.tarot.rules_loader import AdvancedRulesLoader


def _loader_with_contract_data() -> AdvancedRulesLoader:
    loader = AdvancedRulesLoader(rules_dir="__missing__")
    loader.crisis_support = {
        "safety_guidelines": {
            "warning_phrases": [
                "죽고 싶다",
                "살고 싶지 않다",
            ]
        },
        "crisis_types": {
            "breakup": {
                "name": "이별/관계 종료",
                "severity": "moderate",
                "professional_help_trigger": False,
                "supportive_cards": {"Three of Swords": {"validation": "x"}},
            },
            "health_crisis": {
                "name": "건강 문제",
                "severity": "high",
                "professional_help_trigger": True,
                "supportive_cards": {"Nine of Swords": {"validation": "x"}},
            },
        },
    }
    return loader


def test_detect_crisis_from_question_warning_phrase():
    loader = _loader_with_contract_data()
    result = loader.detect_crisis_situation(cards=[], question="요즘 죽고 싶다 라는 생각이 자주 들어요")
    assert result is not None
    assert result.get("detected") is True
    assert result.get("crisis_type") == "safety"
    assert result.get("severity") == "high"
    assert result.get("professional_help_needed") is True


def test_detect_crisis_from_question_keywords():
    loader = _loader_with_contract_data()
    result = loader.detect_crisis_situation(cards=[], question="이별 후 너무 힘들고 공허해요")
    assert result is not None
    assert result.get("detected") is True
    assert result.get("crisis_type") == "breakup"
    assert result.get("crisis_name") == "이별/관계 종료"


def test_detect_crisis_from_supportive_card_mapping():
    loader = _loader_with_contract_data()
    result = loader.detect_crisis_situation(cards=[{"name": "Nine of Swords"}], question="")
    assert result is not None
    assert result.get("detected") is True
    assert result.get("crisis_type") == "health_crisis"
    assert result.get("professional_help_needed") is True


def test_returns_none_for_neutral_case():
    loader = _loader_with_contract_data()
    result = loader.detect_crisis_situation(cards=[{"name": "The Fool"}], question="오늘 커리어 방향이 궁금해요")
    assert result is None
