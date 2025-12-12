"""
Sample repeated interpretation text to flag rewrite candidates.

Usage:
  python backend_ai/tools/content_sampling.py
"""

import csv
import json
from collections import Counter
from pathlib import Path


def top_repeats_csv(path: Path, field: str, top_n: int = 10, min_len: int = 30):
    counts = Counter()
    with path.open(encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            txt = (row.get(field) or "").strip()
            if len(txt) >= min_len:
                counts[txt] += 1
    return counts.most_common(top_n)


def top_repeats_json(path: Path, min_len: int = 30, top_n: int = 10):
    data = json.loads(path.read_text(encoding="utf-8"))
    texts = []

    def collect(obj):
        if isinstance(obj, str):
            texts.append(obj)
        elif isinstance(obj, dict):
            for v in obj.values():
                collect(v)
        elif isinstance(obj, list):
            for v in obj:
                collect(v)

    collect(data)
    counts = Counter(t for t in texts if len(t) >= min_len)
    return counts.most_common(top_n)


def main():
    base = Path(__file__).resolve().parents[1] / "data" / "graph"

    saju_path = base / "saju" / "relations_saju_run_interactions_deep.csv.fixed.csv"
    tarot_path = base / "rules" / "tarot" / "complete_interpretations.json"

    print("[Saju] Top repeated descriptions")
    for desc, cnt in top_repeats_csv(saju_path, "desc", top_n=12):
        print(f"  {cnt}x {desc[:120]}")

    print("\n[Tarot] Top repeated long strings")
    for desc, cnt in top_repeats_json(tarot_path, top_n=12):
        print(f"  {cnt}x {desc[:120]}")


if __name__ == "__main__":
    main()
