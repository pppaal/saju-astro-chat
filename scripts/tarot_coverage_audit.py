#!/usr/bin/env python3
"""
Coverage/quality audit for tarot corpus and spread mappings.
"""

from __future__ import annotations

import argparse
import difflib
import os
import sys
from collections import Counter, defaultdict
from pathlib import Path
from statistics import mean
from typing import Dict, List, Set, Tuple

from tarot_audit_common import (
    REPO_ROOT,
    ensure_artifacts_dir,
    write_json,
    write_markdown,
)
from tarot_pipeline_utils import (
    DEFAULT_CORPUS_PATH,
    DEFAULT_COMPLETE_INTERPRETATIONS_PATH,
    load_jsonl_records,
    load_tarot_card_set,
)

if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(REPO_ROOT / "backend_ai") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "backend_ai"))

from backend_ai.app.routers.tarot.draws_validation import DOMAIN_ENUM, ORIENTATION_ENUM  # noqa: E402
from backend_ai.app.tarot.spread_loader import get_spread_loader  # noqa: E402
from backend_ai.app.routers.tarot_constants import TAROT_SUBTOPIC_MAPPING, TAROT_THEME_MAPPING  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Tarot coverage and quality audit")
    parser.add_argument("--corpus-path", default=str(DEFAULT_CORPUS_PATH))
    parser.add_argument("--min-text-len", type=int, default=300)
    parser.add_argument("--similarity-threshold", type=float, default=0.96)
    parser.add_argument("--dup-top-n", type=int, default=30)
    parser.add_argument("--output-json", default="artifacts/coverage_report.json")
    parser.add_argument("--output-md", default="artifacts/coverage_report.md")
    return parser.parse_args()


def _similarity(a: str, b: str) -> float:
    return difflib.SequenceMatcher(a=a, b=b).ratio()


def _build_report(records: List[Dict], min_text_len: int, sim_threshold: float, dup_top_n: int) -> Dict:
    card_set = sorted(load_tarot_card_set(DEFAULT_COMPLETE_INTERPRETATIONS_PATH))
    domains = sorted(DOMAIN_ENUM)
    orientations = sorted(ORIENTATION_ENUM)
    card_records = [r for r in records if str(r.get("doc_type") or "") == "card"]
    facet_map: Dict[Tuple[str, str, str], Dict] = {}
    per_card_orientation: Dict[str, Set[str]] = defaultdict(set)
    short_facets: List[Dict] = []

    for row in card_records:
        card_id = str(row.get("card_id") or "").strip()
        if card_id.startswith("combo:"):
            continue
        orientation = str(row.get("orientation") or "").strip().lower()
        domain = str(row.get("domain") or "").strip().lower()
        key = (card_id, orientation, domain)
        facet_map[key] = row
        per_card_orientation[card_id].add(orientation)
        text = str(row.get("text") or "")
        if len(text) < min_text_len:
            short_facets.append(
                {
                    "card_id": card_id,
                    "orientation": orientation,
                    "domain": domain,
                    "text_len": len(text),
                    "doc_id": row.get("doc_id", ""),
                }
            )

    missing_combos: List[Dict] = []
    for card_id in card_set:
        for orientation in orientations:
            for domain in domains:
                if (card_id, orientation, domain) not in facet_map:
                    missing_combos.append(
                        {"card_id": card_id, "orientation": orientation, "domain": domain}
                    )

    missing_orientation_cards = [
        card_id for card_id in card_set if per_card_orientation.get(card_id, set()) != set(orientations)
    ]

    # Duplicate/fingerprint checks.
    facet_rows = [
        {
            "card_id": str(r.get("card_id") or "").strip(),
            "orientation": str(r.get("orientation") or "").strip().lower(),
            "domain": str(r.get("domain") or "").strip().lower(),
            "text": " ".join(str(r.get("text") or "").split()),
            "doc_id": str(r.get("doc_id") or "").strip(),
        }
        for r in card_records
        if not str(r.get("card_id") or "").startswith("combo:")
    ]

    near_duplicates: List[Dict] = []
    for i in range(len(facet_rows)):
        a = facet_rows[i]
        if len(a["text"]) < min_text_len:
            continue
        for j in range(i + 1, len(facet_rows)):
            b = facet_rows[j]
            if a["card_id"] == b["card_id"] and a["orientation"] == b["orientation"] and a["domain"] == b["domain"]:
                continue
            if len(b["text"]) < min_text_len:
                continue
            sim = _similarity(a["text"], b["text"])
            if sim >= sim_threshold:
                near_duplicates.append(
                    {
                        "sim": round(sim, 4),
                        "a": {k: a[k] for k in ("card_id", "orientation", "domain", "doc_id")},
                        "b": {k: b[k] for k in ("card_id", "orientation", "domain", "doc_id")},
                    }
                )
    near_duplicates.sort(key=lambda x: x["sim"], reverse=True)

    upright_reversed_similarity: List[Dict] = []
    for card_id in card_set:
        by_domain = {}
        for domain in domains:
            up = facet_map.get((card_id, "upright", domain))
            rev = facet_map.get((card_id, "reversed", domain))
            if not up or not rev:
                continue
            sim = _similarity(
                " ".join(str(up.get("text") or "").split()),
                " ".join(str(rev.get("text") or "").split()),
            )
            by_domain[domain] = round(sim, 4)
        if by_domain:
            max_domain = max(by_domain, key=by_domain.get)
            if by_domain[max_domain] >= sim_threshold:
                upright_reversed_similarity.append(
                    {
                        "card_id": card_id,
                        "max_sim": by_domain[max_domain],
                        "domain": max_domain,
                        "domain_scores": by_domain,
                    }
                )

    # Spread catalog and mapping validity.
    spread_loader = get_spread_loader()
    spread_catalog: Dict[str, Set[str]] = {
        theme: {st["id"] for st in spread_loader.get_sub_topics(theme)}
        for theme in spread_loader.get_available_themes()
    }
    mapping_outside_catalog: List[Dict] = []
    for (_src_theme, _src_spread), (dst_theme, dst_spread) in TAROT_SUBTOPIC_MAPPING.items():
        if dst_theme not in spread_catalog or dst_spread not in spread_catalog[dst_theme]:
            mapping_outside_catalog.append(
                {
                    "mapped_theme": dst_theme,
                    "mapped_spread": dst_spread,
                }
            )

    theme_density = []
    for theme, spreads in spread_catalog.items():
        theme_density.append({"theme": theme, "spread_count": len(spreads)})
    isolated_themes = [t["theme"] for t in theme_density if t["spread_count"] == 0]
    sparse_themes = [t["theme"] for t in theme_density if t["spread_count"] < 3]

    domain_dist = Counter(str(r.get("domain") or "").strip().lower() for r in card_records)
    text_lens = [len(str(r.get("text") or "")) for r in card_records]
    avg_text_len = round(mean(text_lens), 2) if text_lens else 0.0

    return {
        "summary": {
            "card_set_size": len(card_set),
            "domain_enum": domains,
            "orientation_enum": orientations,
            "card_records": len(card_records),
            "missing_combo_count": len(missing_combos),
            "missing_orientation_card_count": len(missing_orientation_cards),
            "short_facet_count": len(short_facets),
            "near_duplicate_count": len(near_duplicates),
            "upright_reversed_too_similar_count": len(upright_reversed_similarity),
            "mapping_outside_catalog_count": len(mapping_outside_catalog),
            "isolated_theme_count": len(isolated_themes),
            "sparse_theme_count": len(sparse_themes),
            "avg_text_len": avg_text_len,
            "domain_distribution": dict(domain_dist),
        },
        "missing_combos": missing_combos,
        "missing_orientation_cards": missing_orientation_cards,
        "short_facets": sorted(short_facets, key=lambda x: x["text_len"])[:200],
        "near_duplicates_top": near_duplicates[:dup_top_n],
        "upright_reversed_too_similar_top": sorted(
            upright_reversed_similarity, key=lambda x: x["max_sim"], reverse=True
        )[:dup_top_n],
        "spread": {
            "theme_density": sorted(theme_density, key=lambda x: x["theme"]),
            "isolated_themes": sorted(isolated_themes),
            "sparse_themes": sorted(sparse_themes),
            "mapping_outside_catalog": mapping_outside_catalog,
            "tarot_theme_mapping_keys": sorted(TAROT_THEME_MAPPING.keys()),
        },
    }


def _to_markdown(report: Dict) -> List[str]:
    s = report["summary"]
    lines = [
        "# Tarot Coverage Audit",
        "",
        "## Summary",
        f"- card_set_size: {s['card_set_size']}",
        f"- card_records: {s['card_records']}",
        f"- domain_enum: {', '.join(s['domain_enum'])}",
        f"- orientation_enum: {', '.join(s['orientation_enum'])}",
        f"- missing_combo_count: {s['missing_combo_count']}",
        f"- missing_orientation_card_count: {s['missing_orientation_card_count']}",
        f"- short_facet_count(<300): {s['short_facet_count']}",
        f"- near_duplicate_count: {s['near_duplicate_count']}",
        f"- upright_reversed_too_similar_count: {s['upright_reversed_too_similar_count']}",
        f"- mapping_outside_catalog_count: {s['mapping_outside_catalog_count']}",
        f"- isolated_theme_count: {s['isolated_theme_count']}",
        f"- sparse_theme_count: {s['sparse_theme_count']}",
        f"- avg_text_len: {s['avg_text_len']}",
        "",
        "## Domain Distribution",
    ]
    for d, c in sorted(s["domain_distribution"].items()):
        lines.append(f"- {d}: {c}")

    lines.extend(["", "## Top Near-Duplicates"])
    if not report["near_duplicates_top"]:
        lines.append("- none")
    else:
        for row in report["near_duplicates_top"][:10]:
            lines.append(
                f"- sim={row['sim']}: "
                f"{row['a']['card_id']}:{row['a']['orientation']}:{row['a']['domain']} "
                f"<-> {row['b']['card_id']}:{row['b']['orientation']}:{row['b']['domain']}"
            )

    lines.extend(["", "## Top Upright/Reversed Similarity"])
    if not report["upright_reversed_too_similar_top"]:
        lines.append("- none")
    else:
        for row in report["upright_reversed_too_similar_top"][:10]:
            lines.append(
                f"- {row['card_id']} max_sim={row['max_sim']} domain={row['domain']}"
            )
    return lines


def main() -> int:
    args = parse_args()
    os.environ.setdefault("PYTHONUTF8", "1")

    records = load_jsonl_records(Path(args.corpus_path))
    report = _build_report(
        records=records,
        min_text_len=args.min_text_len,
        sim_threshold=args.similarity_threshold,
        dup_top_n=args.dup_top_n,
    )

    ensure_artifacts_dir()
    json_out = Path(args.output_json)
    md_out = Path(args.output_md)
    write_json(json_out, report)
    write_markdown(md_out, _to_markdown(report))

    print(f"[coverage] wrote: {json_out}")
    print(f"[coverage] wrote: {md_out}")
    print(f"[coverage] missing_combo_count={report['summary']['missing_combo_count']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

