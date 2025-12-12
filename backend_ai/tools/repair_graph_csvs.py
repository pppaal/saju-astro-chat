"""
Repair graph CSVs by inferring src/dst/id/label columns and writing fixed copies.

Outputs:
- <original>.fixed.csv with src/dst/id/label/description normalized when possible

Usage:
  python backend_ai/tools/repair_graph_csvs.py
"""

import csv
import os
from pathlib import Path
from typing import Dict, List, Tuple


SRC_CANDIDATES = ["src", "source", "from", "from_node", "start", "pillar1", "pillar_a"]
DST_CANDIDATES = ["dst", "target", "to", "to_node", "end", "pillar2", "pillar_b"]
ID_CANDIDATES = ["id", "label", "name", "node", "node_id", "key"]
DESC_CANDIDATES = ["description", "desc", "content", "meaning", "text", "value"]


def pick_first(row: Dict[str, str], candidates: List[str]) -> str:
    for c in candidates:
        if c in row and row[c]:
            return row[c]
    return ""


def normalize_file(path: Path) -> Tuple[int, int]:
    name = path.name
    out_path = path.with_suffix(path.suffix + ".fixed.csv")
    rows_written = 0
    rows_total = 0

    with path.open(encoding="utf-8-sig", newline="") as f, out_path.open("w", encoding="utf-8", newline="") as out:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []
        lower_name = name.lower()
        is_node_file = "node" in lower_name
        is_edge = (not is_node_file) and any(k in lower_name for k in ["edge", "relation", "link", "interaction", "run"])

        if is_edge:
            out_fields = ["src", "dst", "rel", "desc"]
        else:
            out_fields = ["id", "label", "description", "type", "source"]

        writer = csv.DictWriter(out, fieldnames=out_fields)
        writer.writeheader()

        for row in reader:
            rows_total += 1
            if is_edge:
                # special-case saju flow/base columns
                src = row.get("base_ganji") or pick_first(row, SRC_CANDIDATES)
                dst = row.get("flow_ganji") or pick_first(row, DST_CANDIDATES)
                rel = row.get("relation") or pick_first(row, ["rel", "type", "kind"])
                desc = row.get("description") or pick_first(row, DESC_CANDIDATES)
                if not src or not dst:
                    continue
                writer.writerow({"src": src, "dst": dst, "rel": rel, "desc": desc})
                rows_written += 1
            else:
                node_id = pick_first(row, ID_CANDIDATES)
                label = node_id or pick_first(row, ["label"])
                desc = pick_first(row, DESC_CANDIDATES)
                node_type = pick_first(row, ["type", "category", "group"])
                source = pick_first(row, ["source", "folder"])
                if not node_id:
                    continue
                writer.writerow(
                    {
                        "id": node_id,
                        "label": label or node_id,
                        "description": desc,
                        "type": node_type,
                        "source": source,
                    }
                )
                rows_written += 1

    return rows_written, rows_total


def main():
    base = Path(__file__).resolve().parents[1] / "data" / "graph" / "saju"
    targets = [
        base / "nodes_saju_branch_relations.csv",
        base / "relations_saju_run_interactions_deep.csv",
    ]
    for p in targets:
        if not p.exists():
            print(f"[SKIP] Missing {p}")
            continue
        written, total = normalize_file(p)
        print(f"[REPAIR] {p.name}: {written}/{total} rows kept -> {p.name}.fixed.csv")


if __name__ == "__main__":
    main()
