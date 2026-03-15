from app.routers.tarot import classify_question_intent, resolve_question_intent


def test_classify_question_intent_assigns_counseling_frame():
    result = classify_question_intent(
        "재회는 가능할까? 언제 다시 연락이 올까?",
        mapped_theme="love",
        mapped_spread="reconciliation",
    )

    assert result["primary_intent"] == "reconciliation"
    assert result["counseling_frame"] == "relationship_repair"
    assert result["open_intent_used"] is False


def test_resolve_question_intent_keeps_counseling_frame_with_gpt_first():
    def _fake_llm(*_args, **_kwargs):
        return """
        {
          "primary_intent": "decision",
          "secondary_intents": ["timing"],
          "confidence": 0.81,
          "reason": "짧지만 결정과 시기를 함께 묻는 질문"
        }
        """

    result = resolve_question_intent(
        "어떨까?",
        mapped_theme="general",
        mapped_spread="single_card",
        llm_fn=_fake_llm,
    )

    assert result["primary_intent"] == "decision"
    assert result["counseling_frame"] == "decision_planning"
    assert result["understanding_source"] == "gpt_first"


def test_classify_question_intent_uses_open_reading_for_novel_question():
    result = classify_question_intent(
        "내 삶에서 지금 놓치고 있는 보이지 않는 결은 뭐야",
        mapped_theme="general",
        mapped_spread="single_card",
    )

    assert result["primary_intent"] == "general_guidance"
    assert result["counseling_frame"] == "open_reading"
    assert result["open_intent_used"] is True


def test_classify_question_intent_uses_weekly_spread_hint():
    result = classify_question_intent(
        "Use a weekly spread with challenge, support, and action cards.",
        mapped_theme="general",
        mapped_spread="weekly",
    )

    assert result["primary_intent"] == "daily_flow"
    assert result["counseling_frame"] == "timing_window"


def test_classify_question_intent_does_not_treat_contradiction_as_reconciliation():
    result = classify_question_intent(
        "One card says expansion but another says delay; how should I reconcile this?",
        mapped_theme="general",
        mapped_spread="single_card",
    )

    assert result["primary_intent"] == "comparison"
