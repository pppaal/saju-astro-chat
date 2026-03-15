from backend_ai.app.routers.tarot.prompt_builder import build_confidence_guardrail


def test_confidence_guardrail_changes_with_support():
    cautious = build_confidence_guardrail(
        {"confidence": 0.61, "open_intent_used": True},
        {"combination_count": 0, "timing_count": 0, "graph_count": 0, "multi_count": 0},
        is_korean=True,
    )
    strong = build_confidence_guardrail(
        {"confidence": 0.88, "open_intent_used": False},
        {"combination_count": 2, "timing_count": 1, "graph_count": 2, "multi_count": 1},
        is_korean=True,
    )

    assert cautious["level"] == "cautious"
    assert strong["level"] == "strong"
