from backend_ai.app.routers.tarot_utils import map_tarot_theme


def test_map_tarot_theme_recognizes_english_spread_phrases():
    theme, spread = map_tarot_theme(
        "general",
        "single_card",
        "Use a three-card spread for past, present, and future about my career.",
    )
    assert spread == "three_card"

    theme, spread = map_tarot_theme(
        "general",
        "single_card",
        "Do a reconciliation spread for someone I recently stopped talking to.",
    )
    assert theme == "love"
    assert spread == "reconciliation"


def test_map_tarot_theme_infers_theme_from_general_question():
    theme, spread = map_tarot_theme(
        "general",
        "single_card",
        "Use a love spread for communication issues with my partner.",
    )
    assert theme == "love"


def test_map_tarot_theme_preserves_explicit_decision_spread():
    theme, spread = map_tarot_theme(
        "general",
        "single_card",
        "Run a decision spread: stay at my job or switch this quarter.",
    )

    assert theme == "career"
    assert spread == "decision"
