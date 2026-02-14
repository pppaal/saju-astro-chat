#!/usr/bin/env python3
"""
Tarot retrieval quality evaluation harness.

Supports separate reporting for:
- auto eval dataset (corpus-derived)
- realstyle eval dataset (user-like queries)
"""

from __future__ import annotations

import argparse
import json
import os
import random
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from tarot_pipeline_utils import DEFAULT_CORPUS_PATH, load_jsonl_records


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate tarot retrieval quality")
    parser.add_argument("--eval-path", default=None, help="Backward-compatible single eval dataset path")
    parser.add_argument("--eval-auto-path", default="data/eval/eval_auto.jsonl")
    parser.add_argument("--eval-realstyle-path", default="data/eval/eval_realstyle_draws.jsonl")
    parser.add_argument("--corpus-path", default=str(DEFAULT_CORPUS_PATH))
    parser.add_argument("--top-k", type=int, default=5)
    parser.add_argument("--context-top-n", type=int, default=3)
    parser.add_argument("--min-score", type=float, default=None)
    parser.add_argument("--sample-size", type=int, default=None, help="Evaluate first N shuffled samples per dataset")
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument(
        "--output-json",
        default=None,
        help="Path to write evaluation summary JSON (default: data/eval/results/tarot_eval_<ts>.json)",
    )
    return parser.parse_args()


def _load_eval_samples(eval_path: Path) -> List[Dict]:
    samples: List[Dict] = []
    with eval_path.open("r", encoding="utf-8-sig") as f:
        for line_no, line in enumerate(f, start=1):
            stripped = line.strip()
            if not stripped:
                continue
            try:
                data = json.loads(stripped)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid eval jsonl line {line_no}: {exc}") from exc
            if not isinstance(data, dict):
                raise ValueError(f"Eval line {line_no} must be object")
            samples.append(data)
    return samples


def _build_card_name_map(corpus_path: Path) -> Dict[str, str]:
    mapping: Dict[str, str] = {}
    for row in load_jsonl_records(corpus_path):
        card_id = str(row.get("card_id") or "").strip()
        card_name = str(row.get("card_name") or "").strip()
        if card_id and card_name and card_id not in mapping:
            mapping[card_id] = card_name
    return mapping


def _expected_cards_hit(expected_cards: List[str], context_text: str, card_name_map: Dict[str, str]) -> bool:
    if not expected_cards:
        return True
    lowered = context_text.lower()
    for card_id in expected_cards:
        cid = str(card_id).strip().lower()
        cname = card_name_map.get(card_id, "").lower()
        if cid and cid in lowered:
            return True
        if cname and cname in lowered:
            return True
    return False


def _sample_rows(rows: List[Dict], sample_size: Optional[int], seed: int) -> List[Dict]:
    if not sample_size or sample_size <= 0 or len(rows) <= sample_size:
        return rows
    rng = random.Random(seed)
    copied = list(rows)
    rng.shuffle(copied)
    return copied[:sample_size]


def _tag_leakage_detected(query: str, expected_tags: List[str]) -> bool:
    query_lower = query.lower()
    return any(tag and tag in query_lower for tag in expected_tags)


def _eval_one_dataset(
    rag,
    samples: List[Dict],
    top_k: int,
    context_top_n: int,
    min_score: Optional[float],
    card_name_map: Dict[str, str],
) -> Dict:
    zero_hits = 0
    tag_hits = 0
    card_hits = 0
    card_eval_eligible = 0
    card_hits_raw = 0
    leakage_hits = 0
    draws_samples = 0
    details: List[Dict] = []

    for sample in samples:
        query = str(sample.get("query") or "").strip()
        if not query:
            continue
        expected_tags = [str(x).strip().lower() for x in (sample.get("expected_tags") or []) if str(x).strip()]
        expected_cards = [str(x).strip() for x in (sample.get("expected_cards") or []) if str(x).strip()]
        draws = sample.get("draws") if isinstance(sample.get("draws"), list) else []
        has_draws = len(draws) > 0
        if has_draws:
            draws_samples += 1

        leakage = _tag_leakage_detected(query, expected_tags)
        if leakage:
            leakage_hits += 1

        results = rag.search("tarot", query, top_k=top_k, min_score=min_score, draws=draws)
        top_context = " ".join(r.get("text", "") for r in results[:context_top_n]).lower()

        is_zero = len(results) == 0
        if is_zero:
            zero_hits += 1

        tag_hit = (not expected_tags) or any(tag in top_context for tag in expected_tags)
        if tag_hit:
            tag_hits += 1

        card_hit = _expected_cards_hit(expected_cards, top_context, card_name_map)
        if card_hit:
            card_hits_raw += 1
        if has_draws:
            card_eval_eligible += 1
            if card_hit:
                card_hits += 1

        details.append(
            {
                "query": query,
                "result_count": len(results),
                "tag_hit": tag_hit,
                "card_hit": card_hit,
                "tag_leakage": leakage,
                "has_draws": has_draws,
            }
        )

    total = len(details)
    coverage_draws = None
    if card_eval_eligible > 0:
        coverage_draws = card_hits / card_eval_eligible
    return {
        "total_samples": total,
        "draws_samples": draws_samples,
        "zero_hit_rate": (zero_hits / total) if total else 0.0,
        "tag_hit_rate": (tag_hits / total) if total else 0.0,
        "card_facet_coverage": coverage_draws,
        "card_facet_coverage_raw": (card_hits_raw / total) if total else 0.0,
        "tag_leakage_rate": (leakage_hits / total) if total else 0.0,
        "counts": {
            "zero_hits": zero_hits,
            "tag_hits": tag_hits,
            "card_hits": card_hits,
            "card_hits_raw": card_hits_raw,
            "card_eval_eligible": card_eval_eligible,
            "tag_leakage_hits": leakage_hits,
        },
        "samples_preview": details[:20],
    }


def _print_dataset_summary(name: str, metrics: Dict):
    print(f"Tarot Eval Summary [{name}]")
    print(f"- total_samples: {metrics['total_samples']}")
    print(f"- zero_hit_rate: {metrics['zero_hit_rate']:.4f}")
    print(f"- tag_hit_rate: {metrics['tag_hit_rate']:.4f}")
    coverage = metrics.get("card_facet_coverage")
    coverage_text = "NA" if coverage is None else f"{coverage:.4f}"
    print(f"- draws_samples: {metrics.get('draws_samples', 0)}")
    print(f"- card_facet_coverage: {coverage_text}")
    print(f"- card_facet_coverage_raw: {metrics['card_facet_coverage_raw']:.4f}")
    print(f"- tag_leakage_rate: {metrics['tag_leakage_rate']:.4f}")


def main() -> int:
    args = parse_args()
    os.environ.setdefault("USE_CHROMADB", "1")

    corpus_path = Path(args.corpus_path)
    card_name_map = _build_card_name_map(corpus_path)

    from backend_ai.app.domain_rag import DomainRAG

    rag = DomainRAG()

    datasets: Dict[str, Path] = {}
    if args.eval_path:
        datasets["single"] = Path(args.eval_path)
    else:
        datasets["auto"] = Path(args.eval_auto_path)
        datasets["realstyle"] = Path(args.eval_realstyle_path)

    per_dataset: Dict[str, Dict] = {}
    for name, path in datasets.items():
        rows = _load_eval_samples(path)
        rows = _sample_rows(rows, args.sample_size, args.seed)
        metrics = _eval_one_dataset(
            rag=rag,
            samples=rows,
            top_k=args.top_k,
            context_top_n=args.context_top_n,
            min_score=args.min_score,
            card_name_map=card_name_map,
        )
        per_dataset[name] = {
            "path": str(path),
            **metrics,
        }
        _print_dataset_summary(name, metrics)

    summary = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "top_k": args.top_k,
        "context_top_n": args.context_top_n,
        "min_score": args.min_score,
        "sample_size": args.sample_size,
        "datasets": per_dataset,
    }

    if args.output_json:
        output_path = Path(args.output_json)
    else:
        ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        output_path = Path("data/eval/results") / f"tarot_eval_{ts}.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"- output_json: {output_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
