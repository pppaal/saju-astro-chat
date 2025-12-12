import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1] / "app"))

from signal_summary import summarize_signals  # noqa: E402


def test_summarize_signals_includes_keys():
    signals = {
        "astro": {
            "meta": {
                "dominant_element": "fire",
                "weakest_element": "water",
                "angular_planets": [("Sun", 10), ("Venus", 7)],
                "benefics_on_angles": 1,
                "malefics_on_angles": 2,
                "element_counts": {"fire": 2, "earth": 1},
            }
        },
        "saju": {
            "meta": {
                "dominant_element": "wood",
                "lucky_element": "metal",
                "five_element_counts": {"wood": 3, "fire": 1, "metal": 0},
            }
        },
    }

    summary = summarize_signals(signals)

    assert "Dominant element: fire" in summary
    assert "Angular planets: Sun@H10, Venus@H7" in summary
    assert "Benefics@angles" in summary and "Malefics@angles" in summary
    assert "Five-element counts" in summary
