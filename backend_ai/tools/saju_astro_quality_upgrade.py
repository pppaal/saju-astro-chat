"""
Upgrade data quality for saju x astrology focus:
1) Add explicit bridge nodes for dangling edge references.
2) Build a normalized saju-astro crosswalk table with confidence/evidence.
3) Emit a report for quick review.

Usage:
  python backend_ai/tools/saju_astro_quality_upgrade.py
"""

from __future__ import annotations

import csv
import datetime as dt
import hashlib
import os
from collections import defaultdict
from pathlib import Path


GRAPH_ROOT = Path(__file__).resolve().parents[1] / "data" / "graph"
REPORT_DIR = Path(__file__).resolve().parents[2] / "reports"

BRIDGE_NODES_PATH = GRAPH_ROOT / "fusion" / "nodes_saju_astro_bridge_concepts.csv"
CROSSWALK_PATH = GRAPH_ROOT / "fusion" / "saju_astro_crosswalk.csv"

EDGE_SRC_KEYS = ("src", "source", "source_id", "source_iching", "from", "base_ganji")
EDGE_DST_KEYS = ("dst", "target", "target_id", "target_tarot", "to", "flow_ganji")
EDGE_REL_KEYS = ("relation", "relation_type", "type")
EDGE_DESC_KEYS = ("description", "desc", "meaning_ko")

EXCLUDE_PATH_KEYWORDS = ("numerology", "iching", "dream", "jung", "persona")
EXCLUDE_ID_TOKENS = (
    "HEX_",
    "ICHING",
    "HEXAGRAM_",
    "NUM_",
    "NM_",
    "NB_",
    "NC_",
    "NE_",
    "NMF_",
    "NP_",
    "NSU_",
    "NKD_",
    "NEXPR_",
    "DREAM_",
    "DS_",
    "DAN_",
    "DLOC_",
    "DSET_",
    "DACT_",
    "JDS_",
    "JC_",
    "JS_",
    "JA_",
    "JUNG_",
    "PERSONA_",
    "STOIC_",
    "NOVA_",
)

PLANETS = {
    "Sun",
    "Moon",
    "Mercury",
    "Venus",
    "Mars",
    "Jupiter",
    "Saturn",
    "Uranus",
    "Neptune",
    "Pluto",
    "Chiron",
    "NorthNode",
    "SouthNode",
    "Node",
}
SIGNS = {
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces",
}
ASTRO_POINTS = {"Asc", "Desc", "MC", "IC", "Vertex", "PartOfFortune"}
SAJU_PREFIXES = ("ST_", "BR_", "SS_", "TS_", "YS_", "EL_", "GK_", "SAJU_", "GJ_", "SG_", "JS_", "JC_")
ASTRO_PREFIXES = ("AS_", "AP_", "ASTRO_")
MIN_CROSSWALK_CONFIDENCE = float(os.getenv("SAJU_ASTRO_CROSSWALK_MIN_CONFIDENCE", "0.75"))


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


def is_excluded_path(path: Path) -> bool:
    normalized = str(path).replace("\\", "/").lower()
    return any(k in normalized for k in EXCLUDE_PATH_KEYWORDS)


def is_excluded_id(node_id: str | None) -> bool:
    if not node_id:
        return False
    upper = node_id.upper()
    return any(token in upper for token in EXCLUDE_ID_TOKENS)


def is_edge_csv(fieldnames: list[str]) -> bool:
    if not fieldnames:
        return False
    lower = {f.lower() for f in fieldnames}
    has_src = any(k in lower for k in EDGE_SRC_KEYS) or any(f.startswith("source_") or f.startswith("src_") for f in lower)
    has_dst = any(k in lower for k in EDGE_DST_KEYS) or any(f.startswith("target_") or f.startswith("dst_") for f in lower)
    return has_src and has_dst


def first_value(row: dict, keys: tuple[str, ...]) -> str | None:
    lower_map = {k.lower(): k for k in row.keys()}

    for key in keys:
        if key in row and row[key]:
            return str(row[key]).strip()
        mapped = lower_map.get(key)
        if mapped and row.get(mapped):
            return str(row[mapped]).strip()

    for key, value in row.items():
        if not value:
            continue
        kl = key.lower()
        if keys is EDGE_SRC_KEYS and (kl.startswith("source_") or kl.startswith("src_")):
            return str(value).strip()
        if keys is EDGE_DST_KEYS and (kl.startswith("target_") or kl.startswith("dst_")):
            return str(value).strip()
    return None


def parse_weight(value: str | None) -> float:
    if not value:
        return 0.65
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.65
    return max(0.0, min(1.0, number))


def looks_astro(node_id: str | None) -> bool:
    if not node_id:
        return False
    if node_id in PLANETS or node_id in SIGNS or node_id in ASTRO_POINTS:
        return True
    if node_id.startswith(ASTRO_PREFIXES):
        return True
    if node_id.startswith("H") and node_id[1:].isdigit():
        n = int(node_id[1:])
        return 1 <= n <= 12
    return False


def looks_saju(node_id: str | None) -> bool:
    if not node_id:
        return False
    if node_id.startswith(SAJU_PREFIXES):
        return True
    if looks_astro(node_id):
        return False
    # Treat unclassified Korean concept IDs as saju-side bridge concepts.
    return any("\uac00" <= ch <= "\ud7a3" for ch in node_id)


def merge_by_id(path: Path, fieldnames: list[str], new_rows: list[dict]) -> tuple[int, int]:
    if path.exists():
        existing_fields, existing_rows = read_csv(path)
        merged = {row.get("id"): row for row in existing_rows if row.get("id")}
        for row in new_rows:
            row_id = row.get("id")
            if row_id:
                merged[row_id] = row
        final_fields = existing_fields if existing_fields else fieldnames
        final_rows = [merged[k] for k in sorted(merged)]
        write_csv(path, final_fields, final_rows)
        return len(new_rows), len(final_rows)

    write_csv(path, fieldnames, new_rows)
    return len(new_rows), len(new_rows)


def collect_graph_state():
    node_ids: set[str] = set()
    references: set[str] = set()
    edge_records: list[dict] = []

    for path in sorted(GRAPH_ROOT.rglob("*.csv")):
        if is_excluded_path(path):
            continue

        fieldnames, rows = read_csv(path)
        if is_edge_csv(fieldnames):
            for idx, row in enumerate(rows, start=2):
                src = first_value(row, EDGE_SRC_KEYS)
                dst = first_value(row, EDGE_DST_KEYS)
                if not src or not dst:
                    continue
                if is_excluded_id(src) or is_excluded_id(dst):
                    continue

                rel = first_value(row, EDGE_REL_KEYS) or "linked"
                desc = first_value(row, EDGE_DESC_KEYS) or ""
                weight = parse_weight(row.get("weight"))

                references.add(src)
                references.add(dst)
                edge_records.append(
                    {
                        "source": src,
                        "target": dst,
                        "relation": rel,
                        "description": desc,
                        "weight": weight,
                        "evidence_source": f"{path.as_posix()}:{idx}",
                    }
                )
        else:
            for row in rows:
                node_id = row.get("id") or row.get("label") or row.get("name")
                if not node_id:
                    continue
                if is_excluded_id(node_id):
                    continue
                node_ids.add(str(node_id).strip())

    missing = sorted(references - node_ids)
    return node_ids, missing, edge_records


def build_bridge_nodes(missing_ids: list[str]) -> list[dict]:
    rows = []
    today = dt.date.today().isoformat()
    for node_id in missing_ids:
        domain = "astro" if looks_astro(node_id) else "saju"
        rows.append(
            {
                "id": node_id,
                "label": node_id,
                "type": f"{domain}_bridge_concept",
                "domain": domain,
                "description": f"Auto-generated bridge concept node for dangling reference {node_id}.",
                "status": "active",
                "version": "1.0.0",
                "updated_at": today,
            }
        )
    return rows


def build_crosswalk(edge_records: list[dict]) -> list[dict]:
    best_rows: dict[tuple[str, str, str], dict] = {}
    today = dt.date.today().isoformat()

    for edge in edge_records:
        src = edge["source"]
        dst = edge["target"]
        rel = edge["relation"]
        desc = edge["description"]
        conf = edge["weight"]
        evidence = edge["evidence_source"]

        if looks_saju(src) and looks_astro(dst):
            saju_id, astro_id = src, dst
        elif looks_saju(dst) and looks_astro(src):
            saju_id, astro_id = dst, src
        else:
            continue

        key = (saju_id, astro_id, rel)
        rationale = desc if desc else f"{saju_id} {rel} {astro_id}"

        if conf < MIN_CROSSWALK_CONFIDENCE:
            continue
        if not rationale or len(rationale.strip()) < 4:
            continue

        candidate = {
            "id": "XW_" + hashlib.sha1(f"{saju_id}|{astro_id}|{rel}".encode("utf-8")).hexdigest()[:12],
            "saju_id": saju_id,
            "astro_id": astro_id,
            "mapping_type": rel,
            "confidence": f"{conf:.2f}",
            "rationale": rationale,
            "evidence_source": evidence,
            "enabled": "true",
            "status": "active",
            "version": "1.0.0",
            "updated_at": today,
        }

        existing = best_rows.get(key)
        if existing is None or float(existing["confidence"]) < conf:
            best_rows[key] = candidate

    return [best_rows[k] for k in sorted(best_rows.keys())]


def write_report(missing_before: int, missing_after: int, bridge_added: int, bridge_total: int, cw_written: int):
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    path = REPORT_DIR / f"saju_astro_quality_upgrade_{dt.date.today().isoformat()}.md"
    lines = [
        "# Saju Astro Quality Upgrade Report",
        f"- Date: {dt.date.today().isoformat()}",
        "",
        "## Summary",
        f"- Missing refs before bridge nodes: {missing_before}",
        f"- Missing refs after bridge nodes: {missing_after}",
        f"- Bridge nodes added this run: {bridge_added}, total: {bridge_total}",
        f"- Crosswalk min confidence: {MIN_CROSSWALK_CONFIDENCE:.2f}",
        f"- Crosswalk rows written this run: {cw_written}",
        "",
        "## Outputs",
        f"- {BRIDGE_NODES_PATH.as_posix()}",
        f"- {CROSSWALK_PATH.as_posix()}",
    ]
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def main():
    if not GRAPH_ROOT.is_dir():
        raise SystemExit(f"Graph root not found: {GRAPH_ROOT}")

    node_ids_before, missing_before_list, edge_records = collect_graph_state()
    bridge_rows = build_bridge_nodes(missing_before_list)

    bridge_fields = ["id", "label", "type", "domain", "description", "status", "version", "updated_at"]
    bridge_added, bridge_total = merge_by_id(BRIDGE_NODES_PATH, bridge_fields, bridge_rows)

    # Recompute missing after bridge nodes are materialized.
    node_ids_after = set(node_ids_before)
    node_ids_after.update(row["id"] for row in bridge_rows)
    refs_after = set()
    for edge in edge_records:
        refs_after.add(edge["source"])
        refs_after.add(edge["target"])
    missing_after_list = sorted(refs_after - node_ids_after)

    crosswalk_rows = build_crosswalk(edge_records)
    crosswalk_fields = [
        "id",
        "saju_id",
        "astro_id",
        "mapping_type",
        "confidence",
        "rationale",
        "evidence_source",
        "enabled",
        "status",
        "version",
        "updated_at",
    ]
    write_csv(CROSSWALK_PATH, crosswalk_fields, crosswalk_rows)
    cw_written = len(crosswalk_rows)

    report = write_report(
        missing_before=len(missing_before_list),
        missing_after=len(missing_after_list),
        bridge_added=bridge_added,
        bridge_total=bridge_total,
        cw_written=cw_written,
    )

    print("Saju Astro quality upgrade complete.")
    print(f"Report: {report}")
    print(f"Missing before: {len(missing_before_list)}")
    print(f"Missing after: {len(missing_after_list)}")
    print(f"Bridge nodes total: {bridge_total}")
    print(f"Crosswalk rows written: {cw_written}")


if __name__ == "__main__":
    main()
