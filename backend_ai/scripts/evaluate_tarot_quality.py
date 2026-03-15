#!/usr/bin/env python3
"""Deterministic tarot routing/intent/frame quality evaluation."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path


BACKEND_AI_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_AI_ROOT.parent
for path in (REPO_ROOT, BACKEND_AI_ROOT):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from backend_ai.app.routers.tarot.eval_utils import evaluate_tarot_prompts, load_tarot_eval_prompts


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--eval-file",
        default=str(REPO_ROOT / "docs" / "EVAL_TAROT_PROMPTS.jsonl"),
        help="Path to tarot eval prompt jsonl",
    )
    parser.add_argument(
        "--min-score",
        type=float,
        default=0.9,
        help="Fail if average score is below this threshold",
    )
    parser.add_argument(
        "--max-failures",
        type=int,
        default=8,
        help="Fail if more than this many rows are not perfect",
    )
    args = parser.parse_args()

    rows = load_tarot_eval_prompts(args.eval_file)
    summary = evaluate_tarot_prompts(rows)

    print(json.dumps(
        {
            "count": summary["count"],
            "average_score": summary["average_score"],
            "failing_count": summary["failing_count"],
            "top_failures": [
                {
                    "id": item["id"],
                    "score": item["score"],
                    "checks": item["checks"],
                    "primary_intent": item["primary_intent"],
                    "counseling_frame": item["counseling_frame"],
                    "mapped_spread": item["mapped_spread"],
                }
                for item in summary["results"]
                if item["score"] < 1.0
            ][:10],
        },
        ensure_ascii=False,
        indent=2,
    ))

    if summary["average_score"] < args.min_score or summary["failing_count"] > args.max_failures:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
