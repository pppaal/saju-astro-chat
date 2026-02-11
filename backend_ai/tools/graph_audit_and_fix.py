"""
Audit graph CSVs for missing node references and apply targeted fixes:
- Normalize SAJU_DAY_GAN_* -> GAN_* in cross-analysis edges.
- Add explicit composite nodes for ASTRO_SIGN_<Sign>_HOUSE_H<1-12>.
- Add explicit GAN_<ganji>_<sibsin> nodes with links to GAN_ and SS_ nodes.
- Write a report under /reports with counts and remaining missing IDs.

Usage:
  python backend_ai/tools/graph_audit_and_fix.py
"""

from __future__ import annotations

import csv
import datetime as dt
import re
from collections import Counter, defaultdict
from pathlib import Path

GRAPH_DIR = Path(__file__).resolve().parents[1] / "data" / "graph"
REPORT_DIR = Path(__file__).resolve().parents[2] / "reports"

EDGE_SRC_KEYS = ("source", "src", "from")
EDGE_DST_KEYS = ("target", "dst", "to")

COMBO_PATTERN = re.compile(r"^ASTRO_SIGN_(?P<sign>[A-Za-z]+)_HOUSE_H(?P<house>\d+)$")
GANJI_SIBSIN_PATTERN = re.compile(r"^GAN_(?P<ganji>[^_]+)_(?P<sibsin>[^_]+)$")


def read_csv(path: Path):
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    return reader.fieldnames or [], rows


def write_csv(path: Path, fieldnames: list[str], rows: list[dict]):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def is_edge_csv(fieldnames: list[str]) -> bool:
    if not fieldnames:
        return False
    lower = [f.lower() for f in fieldnames]
    has_src = any(k in lower for k in EDGE_SRC_KEYS)
    has_dst = any(k in lower for k in EDGE_DST_KEYS)
    return has_src and has_dst


def get_edge_value(row: dict, keys: tuple[str, ...]) -> str | None:
    for k in keys:
        if k in row and row[k]:
            return row[k]
    return None


def set_edge_value(row: dict, keys: tuple[str, ...], value: str) -> bool:
    for k in keys:
        if k in row:
            row[k] = value
            return True
    return False


def collect_nodes_and_edges(graph_dir: Path):
    node_ids: set[str] = set()
    node_sources: dict[str, str] = {}
    edge_refs: list[tuple[str, int, str, str]] = []

    for path in graph_dir.rglob("*.csv"):
        fieldnames, rows = read_csv(path)
        if is_edge_csv(fieldnames):
            for idx, row in enumerate(rows, 1):
                src = get_edge_value(row, EDGE_SRC_KEYS)
                dst = get_edge_value(row, EDGE_DST_KEYS)
                if src and dst:
                    edge_refs.append((str(path), idx, src, dst))
        else:
            for row in rows:
                node_id = row.get("id") or row.get("label") or row.get("name")
                if node_id:
                    if node_id not in node_ids:
                        node_sources[node_id] = str(path)
                    node_ids.add(node_id)

    return node_ids, node_sources, edge_refs


def normalize_edges_cross():
    path = GRAPH_DIR / "cross_analysis" / "edges_cross.csv"
    fieldnames, rows = read_csv(path)
    if not rows:
        return {"changed": False, "counts": Counter(), "path": str(path)}

    counts = Counter()
    changed = False

    for row in rows:
        for key in ("id", "source", "target"):
            if key in row and row[key]:
                if "SAJU_DAY_GAN_" in row[key]:
                    row[key] = row[key].replace("SAJU_DAY_GAN_", "GAN_")
                    counts[key] += 1
                    changed = True

    if changed:
        write_csv(path, fieldnames, rows)

    return {"changed": changed, "counts": counts, "path": str(path)}


def load_existing_rows(path: Path):
    if not path.exists():
        return [], []
    fieldnames, rows = read_csv(path)
    return fieldnames, rows


def append_unique_rows(path: Path, fieldnames: list[str], rows: list[dict], id_key: str = "id"):
    existing_fieldnames, existing_rows = load_existing_rows(path)
    existing_ids = {r.get(id_key) for r in existing_rows if r.get(id_key)}

    new_rows = [r for r in rows if r.get(id_key) and r.get(id_key) not in existing_ids]
    if not new_rows and existing_rows:
        return {"path": str(path), "added": 0, "total": len(existing_rows)}

    final_fieldnames = existing_fieldnames or fieldnames
    final_rows = existing_rows + new_rows
    write_csv(path, final_fieldnames, final_rows)
    return {"path": str(path), "added": len(new_rows), "total": len(final_rows)}


def build_astro_combo_nodes_and_edges(edge_rows: list[dict]):
    combo_ids = set()
    for row in edge_rows:
        for key in ("source", "target"):
            value = row.get(key)
            if value and COMBO_PATTERN.match(value):
                combo_ids.add(value)

    nodes = []
    edges = []
    for combo_id in sorted(combo_ids):
        match = COMBO_PATTERN.match(combo_id)
        if not match:
            continue
        sign = match.group("sign")
        house_num = match.group("house")
        house_id = f"H{house_num}"
        label = f"{sign}/H{house_num}"
        nodes.append(
            {
                "id": combo_id,
                "label": label,
                "type": "astro_combo",
                "sign": sign,
                "house": house_id,
                "description": f"{sign} 별자리와 {house_id} 하우스의 결합 성향 노드.",
            }
        )
        edges.append(
            {
                "id": f"LINK_ASTRO_COMBO_{sign}_H{house_num}_SIGN",
                "source": combo_id,
                "target": sign,
                "relation": "has_sign",
                "description": f"{combo_id} -> {sign} 연결",
            }
        )
        edges.append(
            {
                "id": f"LINK_ASTRO_COMBO_{sign}_H{house_num}_HOUSE",
                "source": combo_id,
                "target": house_id,
                "relation": "has_house",
                "description": f"{combo_id} -> {house_id} 연결",
            }
        )

    return nodes, edges, combo_ids


def build_ganji_sibsin_nodes_and_edges(edge_rows: list[dict]):
    combo_ids = set()
    for row in edge_rows:
        for key in ("source", "target"):
            value = row.get(key)
            if value and GANJI_SIBSIN_PATTERN.match(value):
                combo_ids.add(value)

    nodes = []
    edges = []
    for combo_id in sorted(combo_ids):
        match = GANJI_SIBSIN_PATTERN.match(combo_id)
        if not match:
            continue
        ganji = match.group("ganji")
        sibsin = match.group("sibsin")
        label = f"{ganji}·{sibsin}"
        nodes.append(
            {
                "id": combo_id,
                "label": label,
                "type": "saju_ganji_sibsin",
                "ganji": ganji,
                "sibsin": sibsin,
                "description": f"GAN_{ganji} 일주의 {sibsin} 십신 결합 노드.",
            }
        )
        edges.append(
            {
                "id": f"LINK_GANJI_SIBSIN_{ganji}_{sibsin}_GAN",
                "source": combo_id,
                "target": f"GAN_{ganji}",
                "relation": "has_ganji",
                "description": f"{combo_id} -> GAN_{ganji} 연결",
            }
        )
        edges.append(
            {
                "id": f"LINK_GANJI_SIBSIN_{ganji}_{sibsin}_SS",
                "source": combo_id,
                "target": f"SS_{sibsin}",
                "relation": "has_sibsin",
                "description": f"{combo_id} -> SS_{sibsin} 연결",
            }
        )

    return nodes, edges, combo_ids


def write_report(report_lines: list[str]):
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    date_str = dt.date.today().isoformat()
    path = REPORT_DIR / f"graph_audit_{date_str}.md"
    path.write_text("\n".join(report_lines) + "\n", encoding="utf-8")
    return str(path)


def main():
    if not GRAPH_DIR.is_dir():
        raise SystemExit(f"Graph directory not found: {GRAPH_DIR}")

    edges_cross_path = GRAPH_DIR / "cross_analysis" / "edges_cross.csv"
    edges_cross_fieldnames, edges_cross_rows = read_csv(edges_cross_path)

    normalization = normalize_edges_cross()
    if normalization["changed"]:
        # Reload after normalization for accurate downstream processing
        edges_cross_fieldnames, edges_cross_rows = read_csv(edges_cross_path)

    combo_nodes, combo_edges, combo_ids = build_astro_combo_nodes_and_edges(edges_cross_rows)
    ganji_nodes, ganji_edges, ganji_ids = build_ganji_sibsin_nodes_and_edges(edges_cross_rows)

    combo_nodes_result = append_unique_rows(
        GRAPH_DIR / "cross_analysis" / "nodes_astro_sign_house_combos.csv",
        ["id", "label", "type", "sign", "house", "description"],
        combo_nodes,
    )
    combo_edges_result = append_unique_rows(
        GRAPH_DIR / "cross_analysis" / "edges_astro_sign_house_links.csv",
        ["id", "source", "target", "relation", "description"],
        combo_edges,
    )
    ganji_nodes_result = append_unique_rows(
        GRAPH_DIR / "saju" / "nodes_saju_ganji_sibsin.csv",
        ["id", "label", "type", "ganji", "sibsin", "description"],
        ganji_nodes,
    )
    ganji_edges_result = append_unique_rows(
        GRAPH_DIR / "saju" / "edges_saju_ganji_sibsin_links.csv",
        ["id", "source", "target", "relation", "description"],
        ganji_edges,
    )

    node_ids, node_sources, edge_refs = collect_nodes_and_edges(GRAPH_DIR)
    referenced = set()
    for _, _, src, dst in edge_refs:
        referenced.add(src)
        referenced.add(dst)

    missing = sorted(referenced - node_ids)
    missing_sample = missing[:50]
    missing_counter = Counter()
    for m in missing:
        if m.startswith("ASTRO_SIGN_") and "HOUSE_H" in m:
            missing_counter["ASTRO_SIGN_*_HOUSE_H*"] += 1
        elif m.startswith("GAN_") and m.count("_") >= 2:
            missing_counter["GAN_*_*"] += 1
        else:
            missing_counter["OTHER"] += 1

    report_lines = [
        "# Graph Audit Report",
        f"- Date: {dt.date.today().isoformat()}",
        "",
        "## Fixes Applied",
        f"- Normalized edges_cross.csv: {normalization['changed']}",
        f"- SAJU_DAY_GAN_ replacements: id={normalization['counts'].get('id', 0)}, "
        f"source={normalization['counts'].get('source', 0)}, "
        f"target={normalization['counts'].get('target', 0)}",
        f"- Composite nodes found: {len(combo_ids)}",
        f"- Composite nodes added: {combo_nodes_result['added']} ({combo_nodes_result['path']})",
        f"- Composite edges added: {combo_edges_result['added']} ({combo_edges_result['path']})",
        f"- GANJI+SIBSIN nodes found: {len(ganji_ids)}",
        f"- GANJI+SIBSIN nodes added: {ganji_nodes_result['added']} ({ganji_nodes_result['path']})",
        f"- GANJI+SIBSIN edges added: {ganji_edges_result['added']} ({ganji_edges_result['path']})",
        "",
        "## Missing Node References (After Fix)",
        f"- Total node IDs: {len(node_ids)}",
        f"- Total edge references: {len(referenced)}",
        f"- Missing referenced IDs: {len(missing)}",
        "",
        "## Missing Patterns",
        f"- ASTRO_SIGN_*_HOUSE_H*: {missing_counter.get('ASTRO_SIGN_*_HOUSE_H*', 0)}",
        f"- GAN_*_*: {missing_counter.get('GAN_*_*', 0)}",
        f"- OTHER: {missing_counter.get('OTHER', 0)}",
        "",
        "## Missing Sample (first 50)",
    ]
    report_lines.extend([f"- {m}" for m in missing_sample])

    report_path = write_report(report_lines)

    print("Graph audit complete.")
    print(f"Report: {report_path}")
    print(f"Missing IDs after fix: {len(missing)}")


if __name__ == "__main__":
    main()
