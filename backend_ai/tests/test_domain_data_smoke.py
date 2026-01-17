import json
from pathlib import Path


def _get_data_base() -> Path:
    """Get the base path for data files, works both from project root and backend_ai folder."""
    # Try relative to backend_ai folder first (when running pytest from backend_ai)
    base = Path("data/graph")
    if base.exists():
        return base
    # Fallback to project root
    base = Path("backend_ai/data/graph")
    if base.exists():
        return base
    # Try absolute path based on this file's location
    return Path(__file__).parent.parent / "data" / "graph"


def test_tarot_rules_present():
    base = _get_data_base() / "rules" / "tarot"
    assert base.exists(), f"Tarot rules folder not found at {base}"
    cards = json.loads((base / "complete_interpretations.json").read_text(encoding="utf-8"))
    assert isinstance(cards, (list, dict))
    assert len(cards) > 0


def test_dream_rules_present():
    base = _get_data_base() / "rules" / "dream"
    assert base.exists(), f"Dream rules folder not found at {base}"
    files = list(base.glob("*.json"))
    assert files, "dream rules json missing"
    data = json.loads(files[0].read_text(encoding="utf-8"))
    assert data, "dream rules empty"


def test_numerology_data_present():
    base = _get_data_base() / "numerology"
    assert base.exists(), f"Numerology folder not found at {base}"
    files = list(base.glob("**/*.json")) + list(base.glob("**/*.csv"))
    assert files, "numerology data missing"
