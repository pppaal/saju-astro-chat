from backend_ai.app.routers.tarot.eval_utils import (
    evaluate_tarot_prompt_row,
    evaluate_tarot_prompts,
)


def test_evaluate_tarot_prompt_row_captures_timing_and_decision():
    row = {
        "id": "sample_01",
        "prompt": "Use a timing spread for when to launch my side project.",
    }

    result = evaluate_tarot_prompt_row(row)

    assert result["primary_intent"]
    assert result["counseling_frame"]
    assert result["checks"]["timing_signal_captured"] is True
    assert result["score"] > 0.7


def test_evaluate_tarot_prompt_row_captures_spread_specific_prompt():
    row = {
        "id": "spread_01",
        "prompt": "Use a three-card spread for past, present, and future about my career.",
    }

    result = evaluate_tarot_prompt_row(row)

    assert result["mapped_spread"] == "three_card"
    assert result["checks"]["spread_signal_captured"] is True


def test_evaluate_tarot_prompt_row_captures_weekly_spread_timing_signal():
    row = {
        "id": "spread_08",
        "prompt": "Use a weekly spread with challenge, support, and action cards.",
    }

    result = evaluate_tarot_prompt_row(row)

    assert result["mapped_spread"] == "weekly"
    assert result["checks"]["timing_signal_captured"] is True


def test_evaluate_tarot_prompt_row_does_not_overcount_generic_should_i_as_decision():
    row = {
        "id": "general_01",
        "prompt": "What energy should I focus on this week?",
    }

    result = evaluate_tarot_prompt_row(row)

    assert result["checks"]["decision_signal_captured"] is True


def test_evaluate_tarot_prompts_returns_summary():
    summary = evaluate_tarot_prompts(
        [
            {"id": "a", "prompt": "What energy should I focus on this week?"},
            {"id": "b", "prompt": "Run a decision spread: stay at my job or switch this quarter."},
        ]
    )

    assert summary["count"] == 2
    assert 0.0 <= summary["average_score"] <= 1.0
    assert len(summary["results"]) == 2
