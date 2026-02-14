"""
Create non-ASTRO alias nodes and rewrite edge references to canonical IDs when safe.

Targets:
- SAJU / JIJI / BR variants
- DS / DREAM variants
- HEX / ICHING / hexagram variants
- NUM / NM variants
- A_/B_/SIGN_/planet_ / HOUSE_ / AS_ helper aliases

Usage:
  python backend_ai/tools/graph_multidomain_alias_rewrite.py
"""

from __future__ import annotations

import csv
import datetime as dt
import hashlib
import re
from collections import Counter, defaultdict
from pathlib import Path

GRAPH_DIR = Path(__file__).resolve().parents[1] / "data" / "graph"
REPORT_DIR = Path(__file__).resolve().parents[2] / "reports"

EDGE_SRC_KEYS = ("source", "src", "from")
EDGE_DST_KEYS = ("target", "dst", "to")

PLANETS = [
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
]
SIGNS = [
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
]

BRANCH_CN_TO_KO = {
    "子": "자",
    "丑": "축",
    "寅": "인",
    "卯": "묘",
    "辰": "진",
    "巳": "사",
    "午": "오",
    "未": "미",
    "申": "신",
    "酉": "유",
    "戌": "술",
    "亥": "해",
}
STEM_CN_TO_KO = {
    "甲": "갑",
    "乙": "을",
    "丙": "병",
    "丁": "정",
    "戊": "무",
    "己": "기",
    "庚": "경",
    "辛": "신",
    "壬": "임",
    "癸": "계",
}
ILGAN_ROMA_TO_KO = {
    "gap": "갑",
    "eul": "을",
    "byeong": "병",
    "jeong": "정",
    "mu": "무",
    "gi": "기",
    "gyeong": "경",
    "sin": "신",
    "im": "임",
    "gye": "계",
}


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
    return any(k in lower for k in EDGE_SRC_KEYS) and any(k in lower for k in EDGE_DST_KEYS)


def get_edge_value(row: dict, keys: tuple[str, ...]) -> str | None:
    for key in keys:
        if key in row and row[key]:
            return row[key]
    return None


def set_edge_value(row: dict, keys: tuple[str, ...], value: str) -> bool:
    for key in keys:
        if key in row:
            row[key] = value
            return True
    return False


def normalize_text(value: str) -> str:
    cleaned = re.sub(r"[\s/(),\-_.]+", "", value)
    return cleaned.strip().lower()


def build_indices():
    node_ids: set[str] = set()
    rows_by_file = {}

    for path in GRAPH_DIR.rglob("*.csv"):
        fieldnames, rows = read_csv(path)
        rows_by_file[path] = (fieldnames, rows)
        if is_edge_csv(fieldnames):
            continue
        for row in rows:
            node_id = row.get("id") or row.get("label") or row.get("name")
            if node_id:
                node_ids.add(node_id)

    planet_ids = {p for p in PLANETS if p in node_ids}
    sign_ids = {s for s in SIGNS if s in node_ids}
    house_ids = {f"H{i}" for i in range(1, 13) if f"H{i}" in node_ids}

    stem_ids = {f"ST_{v}" for v in STEM_CN_TO_KO.values() if f"ST_{v}" in node_ids}
    branch_ids = {f"BR_{v}" for v in BRANCH_CN_TO_KO.values() if f"BR_{v}" in node_ids}
    sibsin_ids = {nid for nid in node_ids if nid.startswith("SS_")}
    lifestage_ids = {nid for nid in node_ids if nid.startswith("TS_")}
    yongsin_ids = {nid for nid in node_ids if nid.startswith("YS_")}

    ds_label_index: dict[str, str] = {}
    ds_conflict: set[str] = set()
    for path, (fieldnames, rows) in rows_by_file.items():
        if is_edge_csv(fieldnames):
            continue
        if "dream" not in str(path).lower():
            continue
        for row in rows:
            node_id = row.get("id", "")
            if not node_id.startswith("DS_"):
                continue
            for field in ("label", "korean_name", "symbol"):
                value = row.get(field, "")
                if not value:
                    continue
                for part in re.split(r"[\/,]", value):
                    key = normalize_text(part)
                    if not key:
                        continue
                    if key in ds_label_index and ds_label_index[key] != node_id:
                        ds_conflict.add(key)
                    else:
                        ds_label_index[key] = node_id
    for key in ds_conflict:
        ds_label_index.pop(key, None)

    return {
        "node_ids": node_ids,
        "rows_by_file": rows_by_file,
        "planet_ids": planet_ids,
        "sign_ids": sign_ids,
        "house_ids": house_ids,
        "stem_ids": stem_ids,
        "branch_ids": branch_ids,
        "sibsin_ids": sibsin_ids,
        "lifestage_ids": lifestage_ids,
        "yongsin_ids": yongsin_ids,
        "ds_label_index": ds_label_index,
    }


def canonical_if_exists(candidate: str | None, node_ids: set[str]) -> str | None:
    if candidate and candidate in node_ids:
        return candidate
    return None


def map_alias(alias_id: str, idx: dict) -> str | None:
    node_ids = idx["node_ids"]

    # HEX / ICHING / hexagram mappings by hex number
    m = re.match(r"^HEX_(\d{1,2})_.*$", alias_id)
    if m:
        return canonical_if_exists(f"HEX_{int(m.group(1)):02d}", node_ids)
    m = re.match(r"^hexagram_(\d{1,2})_.*$", alias_id)
    if m:
        return canonical_if_exists(f"HEX_{int(m.group(1)):02d}", node_ids)
    m = re.match(r"^ICHING_HEX_(\d{1,2})$", alias_id)
    if m:
        return canonical_if_exists(f"HEX_{int(m.group(1)):02d}", node_ids)
    m = re.match(r"^ICHING_(\d{1,2})$", alias_id)
    if m:
        return canonical_if_exists(f"HEX_{int(m.group(1)):02d}", node_ids)

    # Numerology direct mapping
    m = re.match(r"^NUM_LIFEPATH_(\d{1,2})$", alias_id)
    if m:
        return canonical_if_exists(f"NUM_{int(m.group(1))}", node_ids)
    m = re.match(r"^NM_life_path_(\d{1,2})$", alias_id)
    if m:
        return canonical_if_exists(f"NUM_{int(m.group(1))}", node_ids)
    m = re.match(r"^NM_master_(11|22|33)$", alias_id)
    if m:
        return canonical_if_exists(f"NUM_{m.group(1)}", node_ids)

    # Planet/sign/house aliases
    m = re.match(r"^[AB]_(%s)$" % "|".join(PLANETS), alias_id, flags=re.IGNORECASE)
    if m:
        return canonical_if_exists(m.group(1).title(), node_ids)
    m = re.match(r"^planet_(%s)$" % "|".join([p.lower() for p in PLANETS]), alias_id)
    if m:
        return canonical_if_exists(m.group(1).title(), node_ids)
    m = re.match(r"^B_H(\d{1,2})$", alias_id)
    if m:
        return canonical_if_exists(f"H{int(m.group(1))}", node_ids)
    m = re.match(r"^HOUSE_(\d{1,2})$", alias_id)
    if m:
        return canonical_if_exists(f"H{int(m.group(1))}", node_ids)
    m = re.match(r"^SIGN_(%s)$" % "|".join([s.lower() for s in SIGNS]), alias_id)
    if m:
        return canonical_if_exists(m.group(1).title(), node_ids)

    # JIJI / branch mappings
    m = re.match(r"^JIJI_([가-힣])$", alias_id)
    if m:
        return canonical_if_exists(f"BR_{m.group(1)}", node_ids)

    # SAJU mappings
    m = re.match(r"^SAJU_BRANCH_([子丑寅卯辰巳午未申酉戌亥])$", alias_id)
    if m:
        return canonical_if_exists(f"BR_{BRANCH_CN_TO_KO[m.group(1)]}", node_ids)
    m = re.match(r"^SAJU_ARCHETYPE_([甲乙丙丁戊己庚辛壬癸])$", alias_id)
    if m:
        return canonical_if_exists(f"ST_{STEM_CN_TO_KO[m.group(1)]}", node_ids)
    m = re.match(r"^SAJU_HIDDEN_([가-힣])$", alias_id)
    if m:
        return canonical_if_exists(f"ST_{m.group(1)}", node_ids)
    m = re.match(r"^SAJU_SIBSIN_([가-힣]+)$", alias_id)
    if m:
        return canonical_if_exists(f"SS_{m.group(1)}", node_ids)
    m = re.match(r"^SAJU_LIFESTAGE_([가-힣]+)$", alias_id)
    if m:
        return canonical_if_exists(f"TS_{m.group(1)}", node_ids)
    m = re.match(r"^SAJU_CONCEPT_([가-힣]+)$", alias_id)
    if m:
        return canonical_if_exists(f"YS_{m.group(1)}", node_ids)
    m = re.match(r"^saju_ilgan_([a-z]+)$", alias_id)
    if m and m.group(1) in ILGAN_ROMA_TO_KO:
        return canonical_if_exists(f"ST_{ILGAN_ROMA_TO_KO[m.group(1)]}", node_ids)
    if alias_id == "saju_yongsin":
        return canonical_if_exists("YS_용신", node_ids)

    # DS label to canonical DS id
    if alias_id.startswith("DS_"):
        suffix = alias_id[3:]
        key = normalize_text(suffix)
        mapped = idx["ds_label_index"].get(key)
        if mapped:
            return canonical_if_exists(mapped, node_ids)
        # fallback: first token exact match
        token = suffix.split("_")[0]
        mapped = idx["ds_label_index"].get(normalize_text(token))
        if mapped:
            return canonical_if_exists(mapped, node_ids)

    return None


def infer_mentions(alias_id: str, idx: dict) -> list[str]:
    targets = set()
    node_ids = idx["node_ids"]
    tokens = re.findall(r"[A-Za-z0-9가-힣]+", alias_id)

    for token in tokens:
        low = token.lower()
        for planet in PLANETS:
            if low == planet.lower() and planet in idx["planet_ids"]:
                targets.add(planet)
        for sign in SIGNS:
            if low == sign.lower() and sign in idx["sign_ids"]:
                targets.add(sign)
        if re.fullmatch(r"h(\d{1,2})", low):
            hid = f"H{int(low[1:])}"
            if hid in idx["house_ids"]:
                targets.add(hid)
        if re.fullmatch(r"\d{1,2}(st|nd|rd|th)", low):
            hid = f"H{int(re.sub(r'(st|nd|rd|th)$', '', low))}"
            if hid in idx["house_ids"]:
                targets.add(hid)
        if token in BRANCH_CN_TO_KO:
            bid = f"BR_{BRANCH_CN_TO_KO[token]}"
            if bid in node_ids:
                targets.add(bid)
        if token in STEM_CN_TO_KO:
            sid = f"ST_{STEM_CN_TO_KO[token]}"
            if sid in node_ids:
                targets.add(sid)
        if f"BR_{token}" in idx["branch_ids"]:
            targets.add(f"BR_{token}")
        if f"ST_{token}" in idx["stem_ids"]:
            targets.add(f"ST_{token}")
        if f"SS_{token}" in idx["sibsin_ids"]:
            targets.add(f"SS_{token}")
        if f"TS_{token}" in idx["lifestage_ids"]:
            targets.add(f"TS_{token}")
        if f"YS_{token}" in idx["yongsin_ids"]:
            targets.add(f"YS_{token}")

    # BR_사오미 style decomposition
    if alias_id.startswith("BR_"):
        suffix = alias_id[3:].replace("_", "")
        for ch in suffix:
            bid = f"BR_{ch}"
            if bid in idx["branch_ids"]:
                targets.add(bid)

    return sorted(targets)


def alias_domain(alias_id: str) -> str:
    if alias_id.startswith(("SAJU_", "saju_", "JIJI_", "BR_", "GJ_")):
        return "saju"
    if alias_id.startswith(("DS_", "DREAM_", "dream_")):
        return "dream"
    if alias_id.startswith(("HEX_", "hexagram_", "ICHING_")):
        return "iching"
    if alias_id.startswith(("NUM_", "NM_", "soul_")):
        return "numerology"
    if alias_id.startswith(("A_", "B_", "AS_", "SIGN_", "planet_", "decan_", "HOUSE_")):
        return "astro"
    return "cross"


def edge_id(source: str, target: str, relation: str) -> str:
    digest = hashlib.md5(f"{source}->{target}:{relation}".encode("utf-8")).hexdigest()[:10]
    return f"XALIAS_{digest}"


def merge_rows(path: Path, fieldnames: list[str], rows: list[dict]):
    if path.exists():
        existing_fields, existing_rows = read_csv(path)
        final_fields = existing_fields or fieldnames
        merged = {r.get("id"): r for r in existing_rows if r.get("id")}
        for row in rows:
            row_id = row.get("id")
            if row_id:
                merged[row_id] = row
        write_csv(path, final_fields, [merged[k] for k in sorted(merged)])
        return len(rows), len(merged)
    write_csv(path, fieldnames, rows)
    return len(rows), len(rows)


def recompute_missing(rows_by_file: dict):
    node_ids = set()
    referenced = set()
    for fieldnames, rows in rows_by_file.values():
        if is_edge_csv(fieldnames):
            for row in rows:
                s = get_edge_value(row, EDGE_SRC_KEYS)
                t = get_edge_value(row, EDGE_DST_KEYS)
                if s and t:
                    referenced.add(s)
                    referenced.add(t)
        else:
            for row in rows:
                node_id = row.get("id") or row.get("label") or row.get("name")
                if node_id:
                    node_ids.add(node_id)
    return sorted(referenced - node_ids), len(referenced), len(node_ids)


def main():
    if not GRAPH_DIR.is_dir():
        raise SystemExit(f"Graph directory not found: {GRAPH_DIR}")

    idx = build_indices()
    rows_by_file = idx["rows_by_file"]

    # missing before rewrite
    missing_before, referenced_before, node_count_before = recompute_missing(rows_by_file)
    alias_candidates = sorted(missing_before)

    alias_to_canonical: dict[str, str] = {}
    mapping_counter = Counter()
    for alias_id in alias_candidates:
        mapped = map_alias(alias_id, idx)
        if mapped:
            alias_to_canonical[alias_id] = mapped
            mapping_counter[alias_domain(alias_id)] += 1

    # rewrite edge refs
    rewritten_files = Counter()
    rewritten_refs = 0
    for path, (fieldnames, rows) in rows_by_file.items():
        if not is_edge_csv(fieldnames):
            continue
        changed = False
        for row in rows:
            s = get_edge_value(row, EDGE_SRC_KEYS)
            t = get_edge_value(row, EDGE_DST_KEYS)
            if s in alias_to_canonical:
                if set_edge_value(row, EDGE_SRC_KEYS, alias_to_canonical[s]):
                    changed = True
                    rewritten_refs += 1
            if t in alias_to_canonical:
                if set_edge_value(row, EDGE_DST_KEYS, alias_to_canonical[t]):
                    changed = True
                    rewritten_refs += 1
        if changed:
            write_csv(path, fieldnames, rows)
            rewritten_files[str(path)] += 1

    # build alias nodes/edges for every unresolved original missing id
    alias_nodes = []
    alias_edges = []
    dedup_edges = set()

    for alias_id in alias_candidates:
        canonical = alias_to_canonical.get(alias_id, "")
        node_type = "alias" if canonical else "concept"
        domain = alias_domain(alias_id)
        alias_nodes.append(
            {
                "id": alias_id,
                "label": alias_id,
                "type": f"{domain}_{node_type}",
                "canonical_id": canonical,
                "domain": domain,
                "description": (
                    f"{alias_id} alias of {canonical}." if canonical else f"{alias_id} conceptual alias node."
                ),
            }
        )
        if canonical:
            key = (alias_id, canonical, "alias_of")
            if key not in dedup_edges:
                dedup_edges.add(key)
                alias_edges.append(
                    {
                        "id": edge_id(alias_id, canonical, "alias_of"),
                        "source": alias_id,
                        "target": canonical,
                        "relation": "alias_of",
                        "description": f"{alias_id} -> {canonical} alias",
                    }
                )
        for target in infer_mentions(alias_id, idx):
            if target == alias_id:
                continue
            relation = "mentions"
            key = (alias_id, target, relation)
            if key not in dedup_edges:
                dedup_edges.add(key)
                alias_edges.append(
                    {
                        "id": edge_id(alias_id, target, relation),
                        "source": alias_id,
                        "target": target,
                        "relation": relation,
                        "description": f"{alias_id} -> {target} ({relation})",
                    }
                )

    nodes_path = GRAPH_DIR / "fusion" / "nodes_multidomain_aliases.csv"
    edges_path = GRAPH_DIR / "fusion" / "edges_multidomain_alias_links.csv"
    nodes_added, nodes_total = merge_rows(
        nodes_path,
        ["id", "label", "type", "canonical_id", "domain", "description"],
        alias_nodes,
    )
    edges_added, edges_total = merge_rows(
        edges_path,
        ["id", "source", "target", "relation", "description"],
        alias_edges,
    )

    # refresh and report
    idx_after = build_indices()
    missing_after, referenced_after, node_count_after = recompute_missing(idx_after["rows_by_file"])

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    report_path = REPORT_DIR / f"graph_multidomain_alias_rewrite_{dt.date.today().isoformat()}.md"
    report_lines = [
        "# Graph Multidomain Alias Rewrite Report",
        f"- Date: {dt.date.today().isoformat()}",
        "",
        "## Summary",
        f"- Missing before: {len(missing_before)}",
        f"- Missing after: {len(missing_after)}",
        f"- Referenced before: {referenced_before}, nodes before: {node_count_before}",
        f"- Referenced after: {referenced_after}, nodes after: {node_count_after}",
        "",
        "## Mapping",
        f"- Alias candidates: {len(alias_candidates)}",
        f"- Canonical mapped: {len(alias_to_canonical)}",
        f"- Rewritten refs: {rewritten_refs}",
    ]
    for domain, count in sorted(mapping_counter.items()):
        report_lines.append(f"- Mapped ({domain}): {count}")

    report_lines += [
        "",
        "## Alias Files",
        f"- Nodes added this run: {nodes_added}, total: {nodes_total} ({nodes_path})",
        f"- Edges added this run: {edges_added}, total: {edges_total} ({edges_path})",
        "",
        "## Rewritten Files",
    ]
    if rewritten_files:
        for path, count in sorted(rewritten_files.items()):
            report_lines.append(f"- {path}: {count} rewrite batch")
    else:
        report_lines.append("- No edge rewrites applied")

    report_lines += ["", "## Remaining Missing Sample (first 50)"]
    report_lines.extend([f"- {m}" for m in missing_after[:50]])
    report_path.write_text("\n".join(report_lines) + "\n", encoding="utf-8")

    print("Graph multidomain alias rewrite complete.")
    print(f"Report: {report_path}")
    print(f"Missing before: {len(missing_before)}")
    print(f"Missing after: {len(missing_after)}")


if __name__ == "__main__":
    main()
