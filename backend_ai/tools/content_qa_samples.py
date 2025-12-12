"""
Generate QA sampling files for manual content review.

Outputs:
  - qa_samples_saju.csv  (random sample of Saju relation descriptions)
  - qa_samples_tarot.csv (random sample of Tarot interpretations)

Usage:
  python backend_ai/tools/content_qa_samples.py --saju 60 --tarot 40 --seed 42
"""

import argparse
import csv
import json
import random
from pathlib import Path
from typing import List, Dict, Any


def load_saju_rows(base: Path) -> List[Dict[str, str]]:
    path = base / "saju" / "relations_saju_run_interactions_deep.csv.fixed.csv"
    with path.open(encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        return list(reader)


def load_tarot_texts(base: Path) -> List[str]:
    path = base / "rules" / "tarot" / "complete_interpretations.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    texts: List[str] = []

    def collect(obj: Any):
        if isinstance(obj, str):
            texts.append(obj.strip())
        elif isinstance(obj, dict):
            for v in obj.values():
                collect(v)
        elif isinstance(obj, list):
            for v in obj:
                collect(v)

    collect(data)
    # filter very short strings (keywords etc.)
    return [t for t in texts if len(t) >= 30]


def write_csv(path: Path, rows: List[Dict[str, str]]):
    if not rows:
        return
    fieldnames = list(rows[0].keys())
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main():
    parser = argparse.ArgumentParser(description="Generate QA samples for manual content review.")
    parser.add_argument("--saju", type=int, default=60, help="Number of saju rows to sample")
    parser.add_argument("--tarot", type=int, default=40, help="Number of tarot strings to sample")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    base = Path(__file__).resolve().parents[1] / "data" / "graph"
    random.seed(args.seed)

    # Saju sample
    saju_rows = load_saju_rows(base)
    saju_sample = random.sample(saju_rows, k=min(args.saju, len(saju_rows)))
    saju_out = Path(__file__).resolve().parent / "qa_samples_saju.csv"
    write_csv(saju_out, saju_sample)

    # Tarot sample
    tarot_texts = load_tarot_texts(base)
    tarot_sample = random.sample(tarot_texts, k=min(args.tarot, len(tarot_texts)))
    tarot_out = Path(__file__).resolve().parent / "qa_samples_tarot.csv"
    write_csv(tarot_out, [{"text": t} for t in tarot_sample])

    print(f"[QA] wrote {len(saju_sample)} saju rows -> {saju_out}")
    print(f"[QA] wrote {len(tarot_sample)} tarot texts -> {tarot_out}")


if __name__ == "__main__":
    main()
