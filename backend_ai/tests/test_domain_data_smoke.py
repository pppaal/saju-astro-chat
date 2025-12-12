import json
from pathlib import Path


def test_tarot_rules_present():
    base = Path("backend_ai/data/graph/rules/tarot")
    assert base.exists()
    cards = json.loads((base / "complete_interpretations.json").read_text(encoding="utf-8"))
    assert isinstance(cards, (list, dict))
    assert len(cards) > 0


def test_dream_rules_present():
    base = Path("backend_ai/data/graph/rules/dream")
    assert base.exists()
    files = list(base.glob("*.json"))
    assert files, "dream rules json missing"
    data = json.loads(files[0].read_text(encoding="utf-8"))
    assert data, "dream rules empty"


def test_numerology_data_present():
    base = Path("backend_ai/data/graph/numerology")
    assert base.exists()
    files = list(base.glob("**/*.json")) + list(base.glob("**/*.csv"))
    assert files, "numerology data missing"
