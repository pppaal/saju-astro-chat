# backend_ai/app/iching/data_loader.py
"""
I Ching Data Loader
====================
Functions for loading hexagram and trigram data from JSON files.
"""
import os
import json
from typing import Dict, Tuple
from functools import lru_cache


# ===============================================================
# MODULE-LEVEL DATA CACHE
# ===============================================================
_HEXAGRAM_DATA = None
_TRIGRAM_DATA = None
_COMPLETE_HEXAGRAM_DATA = None
_CHANGING_LINES_DATA = None


def _get_data_path() -> str:
    """Get path to I Ching data directory."""
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    return os.path.join(base_dir, "data", "graph", "rules", "iching")


@lru_cache(maxsize=1)
def load_premium_data() -> Tuple[Dict, Dict]:
    """Load premium hexagram and trigram data."""
    global _HEXAGRAM_DATA, _TRIGRAM_DATA

    if _HEXAGRAM_DATA is not None:
        return _HEXAGRAM_DATA, _TRIGRAM_DATA

    data_path = os.path.join(_get_data_path(), "hexagrams_full.json")

    if os.path.exists(data_path):
        with open(data_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            _HEXAGRAM_DATA = data.get("hexagrams", {})
            _TRIGRAM_DATA = data.get("trigrams", {})
    else:
        _HEXAGRAM_DATA = {}
        _TRIGRAM_DATA = {}
        print(f"[IChingRAG] Warning: Premium data not found at {data_path}")

    return _HEXAGRAM_DATA, _TRIGRAM_DATA


def load_complete_hexagram_data() -> Dict:
    """Load complete hexagram data with line interpretations from all split files."""
    global _COMPLETE_HEXAGRAM_DATA

    if _COMPLETE_HEXAGRAM_DATA is not None:
        return _COMPLETE_HEXAGRAM_DATA

    _COMPLETE_HEXAGRAM_DATA = {}
    base_path = _get_data_path()

    try:
        # Load main complete file
        main_path = os.path.join(base_path, "hexagrams_complete_64.json")
        if os.path.exists(main_path):
            with open(main_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                _COMPLETE_HEXAGRAM_DATA.update(data.get("hexagrams", {}))

        # Load additional split files (7-16, 17-32, 33-48, 49-64)
        split_files = [
            "hexagrams_7_to_16.json",
            "hexagrams_17_to_32.json",
            "hexagrams_33_to_48.json",
            "hexagrams_49_to_64.json",
        ]

        for filename in split_files:
            filepath = os.path.join(base_path, filename)
            if os.path.exists(filepath):
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        if "hexagrams" in data:
                            _COMPLETE_HEXAGRAM_DATA.update(data["hexagrams"])
                        elif isinstance(data, dict):
                            for key, value in data.items():
                                if key.isdigit() or (isinstance(value, dict) and "name" in value):
                                    _COMPLETE_HEXAGRAM_DATA[key] = value
                except (json.JSONDecodeError, IOError) as e:
                    print(f"[IChingRAG] Warning: Failed to load {filename}: {e}")
                    continue

    except Exception as e:
        print(f"[IChingRAG] Error loading complete hexagram data: {e}")
        _COMPLETE_HEXAGRAM_DATA = {}

    return _COMPLETE_HEXAGRAM_DATA


def load_changing_lines_data() -> Dict:
    """Load advanced changing lines interpretation data."""
    global _CHANGING_LINES_DATA

    if _CHANGING_LINES_DATA is not None:
        return _CHANGING_LINES_DATA

    data_path = os.path.join(_get_data_path(), "changing_lines_advanced.json")

    try:
        if os.path.exists(data_path):
            with open(data_path, "r", encoding="utf-8") as f:
                _CHANGING_LINES_DATA = json.load(f)
        else:
            _CHANGING_LINES_DATA = {}
    except (json.JSONDecodeError, IOError) as e:
        print(f"[IChingRAG] Warning: Failed to load changing lines data: {e}")
        _CHANGING_LINES_DATA = {}

    return _CHANGING_LINES_DATA
