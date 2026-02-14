#!/usr/bin/env python3
"""
Build deterministic tarot eval datasets.

Outputs two files:
- auto: corpus-derived (can be optimistic)
- realstyle: user-like queries (harder, less lexical leakage)
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List

from tarot_pipeline_utils import DEFAULT_CORPUS_PATH, load_jsonl_records


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build tarot eval datasets")
    parser.add_argument("--corpus-path", default=str(DEFAULT_CORPUS_PATH))
    parser.add_argument("--auto-output-path", default="data/eval/eval_auto.jsonl")
    parser.add_argument("--realstyle-output-path", default="data/eval/eval_realstyle.jsonl")
    parser.add_argument("--realstyle-draws-output-path", default="data/eval/eval_realstyle_draws.jsonl")
    parser.add_argument("--max-auto-card-samples", type=int, default=200)
    parser.add_argument("--realstyle-samples", type=int, default=100)
    return parser.parse_args()


def _build_auto_samples(records: List[Dict], max_card_samples: int) -> List[Dict]:
    card_records = [r for r in records if r.get("doc_type") == "card"]
    samples: List[Dict] = []

    for row in card_records[:max_card_samples]:
        samples.append(
            {
                "query": f"{row['card_name']} {row['orientation']} {row['domain']} meaning",
                "domain": row["domain"],
                "spread": None,
                "expected_tags": [row["domain"], row["orientation"]],
                "expected_cards": [row["card_id"]],
                "source": "auto",
            }
        )
    return samples


def _query_template(domain: str, orientation: str, card_name: str, idx: int) -> str:
    # Keep realistic wording and avoid direct tag tokens like "love/career/money/general/upright/reversed".
    templates = [
        "요즘 흐름이 답답한데 지금 가장 중요한 포인트가 뭘까?",
        "이번 주 선택에서 실수하지 않으려면 어디를 먼저 점검해야 할까?",
        "지금 상황에서 내가 놓치고 있는 신호를 알려줘.",
        "관계와 일 사이에서 균형을 잡으려면 어떤 태도가 필요할까?",
        "불안이 커질 때 우선순위를 어떻게 잡아야 할까?",
        "당장 실행 가능한 조언 3가지만 짧게 알려줘.",
        "지금 결정하면 나중에 후회할 가능성이 큰 부분이 뭐야?",
        "앞으로 한 달 동안 집중해야 할 한 가지를 정해줘.",
        "내가 반복하는 패턴이 있다면 이번에는 어떻게 끊을 수 있을까?",
        "상대의 의도를 너무 과하게 해석하는지 점검해줘.",
    ]

    domain_hints = {
        "love": "관계 이슈가 자주 흔들리는데",
        "career": "일과 진로가 계속 꼬이는데",
        "money": "지출과 수입 밸런스가 무너지는데",
        "general": "전체적으로 페이스가 흔들리는데",
    }
    orientation_hints = {
        "upright": "지금 에너지는 비교적 정돈된 편이고",
        "reversed": "지금 에너지는 뒤엉킨 느낌이 강하고",
    }

    lead = domain_hints.get(domain, domain_hints["general"])
    tone = orientation_hints.get(orientation, orientation_hints["upright"])
    body = templates[idx % len(templates)]

    # Include card name occasionally for partial facet checks, but not always.
    if idx % 4 == 0:
        return f"{lead} {tone} {body} ({card_name} 느낌)"
    return f"{lead} {tone} {body}"


def _build_realstyle_samples(records: List[Dict], n: int) -> List[Dict]:
    card_records = [r for r in records if r.get("doc_type") == "card"]
    card_records.sort(key=lambda r: (str(r.get("card_id")), str(r.get("orientation")), str(r.get("domain"))))

    if n <= 0:
        return []
    selected = card_records[: min(n, len(card_records))]

    samples: List[Dict] = []
    for idx, row in enumerate(selected):
        query = _query_template(
            domain=str(row.get("domain") or "general"),
            orientation=str(row.get("orientation") or "upright"),
            card_name=str(row.get("card_name") or "카드"),
            idx=idx,
        )
        samples.append(
            {
                "query": query,
                "domain": row["domain"],
                "spread": "single" if idx % 2 == 0 else "three",
                "expected_tags": [row["domain"], row["orientation"]],
                "expected_cards": [row["card_id"]],
                "source": "realstyle",
            }
        )
    return samples


def _build_realstyle_draws_samples(records: List[Dict], n: int) -> List[Dict]:
    card_records = [r for r in records if r.get("doc_type") == "card"]
    card_records.sort(key=lambda r: (str(r.get("card_id")), str(r.get("orientation")), str(r.get("domain"))))

    selected = card_records[: min(n, len(card_records))]
    positions = ["past", "present", "future"]

    samples: List[Dict] = []
    for idx, row in enumerate(selected):
        spread = "single" if idx % 2 == 0 else "three"
        position = "single" if spread == "single" else positions[idx % len(positions)]
        query = _query_template(
            domain=str(row.get("domain") or "general"),
            orientation=str(row.get("orientation") or "upright"),
            card_name=str(row.get("card_name") or "카드"),
            idx=idx,
        )
        samples.append(
            {
                "query": query,
                "domain": row["domain"],
                "spread": spread,
                "draws": [
                    {
                        "card_id": row["card_id"],
                        "orientation": row["orientation"],
                        "domain": row["domain"],
                        "position": position,
                    }
                ],
                "expected_tags": [row["domain"], row["orientation"]],
                "expected_cards": [row["card_id"]],
                "source": "realstyle_draws",
            }
        )
    return samples


def _write_jsonl(path: Path, rows: List[Dict]):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def main() -> int:
    args = parse_args()
    records = load_jsonl_records(Path(args.corpus_path))

    auto_samples = _build_auto_samples(records, max_card_samples=args.max_auto_card_samples)
    realstyle_samples = _build_realstyle_samples(records, n=args.realstyle_samples)
    realstyle_draws_samples = _build_realstyle_draws_samples(records, n=args.realstyle_samples)

    auto_out = Path(args.auto_output_path)
    realstyle_out = Path(args.realstyle_output_path)
    realstyle_draws_out = Path(args.realstyle_draws_output_path)

    _write_jsonl(auto_out, auto_samples)
    _write_jsonl(realstyle_out, realstyle_samples)
    _write_jsonl(realstyle_draws_out, realstyle_draws_samples)

    print(f"[tarot_build_eval_dataset] wrote auto={auto_out} samples={len(auto_samples)}")
    print(f"[tarot_build_eval_dataset] wrote realstyle={realstyle_out} samples={len(realstyle_samples)}")
    print(
        "[tarot_build_eval_dataset] "
        f"wrote realstyle_draws={realstyle_draws_out} samples={len(realstyle_draws_samples)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
