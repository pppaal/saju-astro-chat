"""
Summarize domain data quality (counts, empty descriptions, duplicate ids) across key folders.

Usage:
  python backend_ai/tools/domain_quality_report.py
"""

import os
import csv
import json
from pathlib import Path
from collections import Counter


def summarize_csv(path: Path):
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    # Description quality
    descs = [(r.get("description") or r.get("desc") or r.get("content") or "").strip() for r in rows]
    empty_desc = sum(1 for d in descs if not d)

    # Duplicate detection
    # 1) Prefer explicit row id/label.
    id_keys = [(r.get("id") or r.get("label") or "").strip() for r in rows]
    valid_id_keys = [k for k in id_keys if k]

    if valid_id_keys:
        dup_count = sum(c > 1 for c in Counter(valid_id_keys).values())
    else:
        # 2) Fallback for edge-like CSVs without id/label.
        #    Use (source, target, relation) tuple as a logical key.
        edge_keys = []
        for r in rows:
            src = (r.get("source") or r.get("src") or "").strip()
            dst = (r.get("target") or r.get("dst") or "").strip()
            rel = (r.get("relation") or "").strip()
            if src and dst:
                edge_keys.append((src, dst, rel))
        dup_count = sum(c > 1 for c in Counter(edge_keys).values()) if edge_keys else 0

    return {"rows": len(rows), "empty_desc": empty_desc, "dup_ids": dup_count}


def summarize_json(path: Path):
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        return {"error": str(e)}
    if isinstance(data, dict):
        size = len(data)
    elif isinstance(data, list):
        size = len(data)
    else:
        size = 0
    return {"items": size}


def main():
    base = Path(__file__).resolve().parents[1] / "data" / "graph"
    domains = {
        "saju": ["saju", "saju_literary"],
        "astro": ["astro", "astro_database", "cross_analysis"],
        "tarot": ["rules/tarot", "tarot"],
        "dream": ["rules/dream", "dream"],
        "numerology": ["numerology"],
        "jung": ["jung_psychology", "rules/jung", "persona"],
    }

    for domain, folders in domains.items():
        print(f"\n[DOMAIN] {domain}")
        for folder in folders:
            root = base / folder
            if not root.exists():
                print(f"  - {folder}: missing")
                continue
            csvs = list(root.rglob("*.csv"))
            jsons = list(root.rglob("*.json"))
            for c in csvs:
                summary = summarize_csv(c)
                print(f"  - {folder}/{c.name}: rows={summary['rows']}, empty_desc={summary['empty_desc']}, dup_ids={summary['dup_ids']}")
            for j in jsons:
                summary = summarize_json(j)
                if "error" in summary:
                    print(f"  - {folder}/{j.name}: error {summary['error']}")
                else:
                    print(f"  - {folder}/{j.name}: items={summary['items']}")


if __name__ == "__main__":
    main()
