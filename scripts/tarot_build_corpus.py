#!/usr/bin/env python3
"""
Build deterministic tarot corpus JSONL from source data.

Default combo policy is graph-only to avoid duplicate retrieval indexes:
- card docs -> Chroma `domain_tarot`
- combo relations -> graph edges/nodes

Optional combo docs can still be generated with `--combo-mode docs`.
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Dict, List

from tarot_pipeline_utils import load_combo_source_stats, make_doc_id


DOMAIN_MAP = {
    "general": "general",
    "love": "love",
    "career": "career",
    "finance": "money",
}


COMBO_TEXT_BY_DOMAIN = {
    "love": "love_interpretation",
    "career": "career_interpretation",
    "money": "finance_interpretation",
    "general": "description",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build tarot corpus JSONL")
    parser.add_argument(
        "--source-json",
        default="backend_ai/data/graph/rules/tarot/complete_interpretations.json",
    )
    parser.add_argument(
        "--combo-source-csv",
        default="backend_ai/data/graph/rules/tarot/tarot_combinations.csv",
    )
    parser.add_argument(
        "--output-jsonl",
        default="backend_ai/data/tarot_corpus/tarot_corpus_v1.jsonl",
    )
    parser.add_argument("--version", default="v1")
    parser.add_argument(
        "--combo-mode",
        choices=["graph_only", "docs"],
        default="graph_only",
        help="graph_only: combo is graph-edge only (default), docs: emit combo documents",
    )
    return parser.parse_args()


def _extract_card_name(card: Dict) -> str:
    name = card.get("name")
    if isinstance(name, dict):
        ko = str(name.get("ko") or "").strip()
        en = str(name.get("en") or "").strip()
        if ko and en:
            return f"{ko} / {en}"
        return ko or en
    return str(name or "").strip()


def _slugify(value: str) -> str:
    out = "".join(ch.lower() if ch.isalnum() else "_" for ch in value)
    while "__" in out:
        out = out.replace("__", "_")
    return out.strip("_") or "item"


def _card_records(data: Dict, version: str) -> List[Dict]:
    records: List[Dict] = []
    source = "complete_interpretations.json"

    for section in ("major_arcana", "minor_arcana"):
        arcana_label = section.replace("_arcana", "")
        for card in data.get(section, []):
            card_id = str(card.get("id") or "").strip()
            if not card_id:
                continue
            card_name = _extract_card_name(card)
            keywords = [str(k).strip() for k in (card.get("keywords") or []) if str(k).strip()]
            keyword_text = ", ".join(keywords[:6])

            for orientation in ("upright", "reversed"):
                block = card.get(orientation) or {}
                for raw_domain, domain in DOMAIN_MAP.items():
                    meaning = str(block.get(raw_domain) or "").strip()
                    if not meaning:
                        continue
                    advice = str(block.get("advice") or "").strip()
                    position = ""
                    doc_id = make_doc_id(card_id, orientation, domain, position, version)
                    parts = [
                        f"Card: {card_name}",
                        f"Orientation: {orientation}",
                        f"Domain: {domain}",
                        f"Meaning: {meaning}",
                    ]
                    if advice:
                        parts.append(f"Advice: {advice}")
                    if keyword_text:
                        parts.append(f"Keywords: {keyword_text}")

                    records.append(
                        {
                            "doc_id": doc_id,
                            "doc_type": "card",
                            "card_id": card_id,
                            "card_name": card_name,
                            "orientation": orientation,
                            "domain": domain,
                            "position": position,
                            "source": source,
                            "version": version,
                            "text": " | ".join(parts),
                            "tags": [domain, orientation, arcana_label],
                        }
                    )

    return records


def _combo_records_from_rules_csv(combo_source_csv: Path, version: str) -> List[Dict]:
    if not combo_source_csv.exists():
        return []

    records: List[Dict] = []
    with combo_source_csv.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            c1_id = str(row.get("card1_id") or "").strip()
            c2_id = str(row.get("card2_id") or "").strip()
            c1_name = str(row.get("card1_name") or c1_id).strip()
            c2_name = str(row.get("card2_name") or c2_id).strip()
            if not c1_id or not c2_id:
                continue

            combo_id = f"combo:{_slugify(c1_id)}+{_slugify(c2_id)}"
            combo_name = f"{c1_name} + {c2_name}"
            orientation = "upright"
            position = "combo"

            for domain, field_name in COMBO_TEXT_BY_DOMAIN.items():
                meaning = str(row.get(field_name) or "").strip()
                if not meaning:
                    continue
                doc_id = make_doc_id(combo_id, orientation, domain, position, version)
                records.append(
                    {
                        "doc_id": doc_id,
                        "doc_type": "combo",
                        "card_id": combo_id,
                        "card_name": combo_name,
                        "orientation": orientation,
                        "domain": domain,
                        "position": position,
                        "source": "tarot_combinations.csv",
                        "version": version,
                        "text": f"Combo: {combo_name} | Domain: {domain} | Meaning: {meaning}",
                        "tags": ["combo", domain],
                    }
                )

    return records


def _build_records(data: Dict, version: str, combo_mode: str, combo_source_csv: Path) -> List[Dict]:
    records = _card_records(data, version=version)

    if combo_mode == "docs":
        records.extend(_combo_records_from_rules_csv(combo_source_csv=combo_source_csv, version=version))

    records.sort(
        key=lambda r: (r["doc_type"], r["card_id"], r["orientation"], r["domain"], r["position"])
    )
    return records


def main() -> int:
    args = parse_args()
    src = Path(args.source_json)
    combo_source_csv = Path(args.combo_source_csv)
    dst = Path(args.output_jsonl)
    dst.parent.mkdir(parents=True, exist_ok=True)

    data = json.loads(src.read_text(encoding="utf-8-sig"))
    records = _build_records(
        data,
        version=args.version,
        combo_mode=args.combo_mode,
        combo_source_csv=combo_source_csv,
    )

    with dst.open("w", encoding="utf-8", newline="\n") as f:
        for row in records:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    combo_stats = load_combo_source_stats()
    card_count = sum(1 for r in records if r["doc_type"] == "card")
    combo_count = sum(1 for r in records if r["doc_type"] == "combo")

    print(
        "[tarot_build_corpus] "
        f"combo_policy={args.combo_mode} "
        f"expected_combo_sources="
        f"complete_interpretations:{combo_stats.complete_interpretations_count},"
        f"rules_csv:{combo_stats.rules_combo_rows},"
        f"nodes_csv:{combo_stats.nodes_combo_rows}"
    )
    print(
        "[tarot_build_corpus] "
        f"expected_combo_doc_floor={combo_stats.expected_combo_doc_floor} "
        f"(applies when combo_mode=docs)"
    )
    print(
        f"[tarot_build_corpus] wrote={dst} total={len(records)} "
        f"card={card_count} combo={combo_count}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
