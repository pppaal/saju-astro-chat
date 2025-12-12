"""
Quick data validation for graph/rules corpus.
- Checks required fields for nodes/edges CSVs
- Checks rules JSON shape and emptiness

Usage:
  python backend_ai/tools/validate_graph_data.py
"""

import csv
import json
import os
from pathlib import Path


def validate_csv(path: Path, issues: list):
    name = path.name
    lower = name.lower()
    if ".fixed.csv" in lower:
        original = path.with_suffix("")
        # Skip validating the unfixed version if fixed exists
    else:
        fixed = Path(str(path) + ".fixed.csv")
        if fixed.exists():
            return  # fixed version will be validated separately
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader, 1):
            if "node" in lower:
                is_edge = False
            else:
                is_edge = any(k in lower for k in ["edge", "relation", "link", "interaction", "run"])
            if is_edge:
                src = row.get("src") or row.get("source") or row.get("from")
                dst = row.get("dst") or row.get("target") or row.get("to")
                if not src or not dst:
                    issues.append(f"Edge missing src/dst in {name}:{idx}")
            else:
                node_id = row.get("id") or row.get("label") or row.get("name")
                desc = row.get("description") or row.get("content") or row.get("desc")
                if not node_id:
                    issues.append(f"Node missing id/label in {name}:{idx}")
                if not desc:
                    issues.append(f"Node missing description in {name}:{idx}")


def validate_json_rules(path: Path, issues: list):
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        issues.append(f"Invalid JSON {path.name}: {e}")
        return
    if not isinstance(data, (dict, list)):
        issues.append(f"Rules file {path.name} is not dict/list")
    elif not data:
        issues.append(f"Rules file {path.name} is empty")


def main():
    base = Path(__file__).resolve().parents[1] / "data" / "graph"
    issues = []
    if not base.is_dir():
        print(f"Graph dir not found: {base}")
        return

    for root, _, files in os.walk(base):
        for f in files:
            path = Path(root) / f
            lower = f.lower()
            if lower.endswith(".csv"):
                try:
                    validate_csv(path, issues)
                except Exception as e:
                    issues.append(f"CSV error {f}: {e}")
            elif lower.endswith(".json") and "dream" not in root.lower():
                validate_json_rules(path, issues)

    if issues:
        print("[VALIDATION] Issues found:")
        for i in issues:
            print("-", i)
        print(f"Total issues: {len(issues)}")
    else:
        print("[VALIDATION] OK: no blocking issues detected")


if __name__ == "__main__":
    main()
