#!/usr/bin/env python3
"""
Tarot corpus/graph lint.

Fails fast with exit code 1 when data quality rules are violated.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from tarot_pipeline_utils import (
    DEFAULT_COMPLETE_INTERPRETATIONS_PATH,
    DEFAULT_CORPUS_PATH,
    DEFAULT_EDGES_PATH,
    DEFAULT_TAROT_GRAPH_DIR,
    lint_tarot_dataset,
    summarize_lint_result,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Lint tarot corpus + graph edge quality")
    parser.add_argument(
        "--corpus-path",
        default=str(DEFAULT_CORPUS_PATH),
        help="Path to tarot corpus JSONL",
    )
    parser.add_argument(
        "--edges-path",
        default=str(DEFAULT_EDGES_PATH),
        help="Path to tarot edges CSV",
    )
    parser.add_argument(
        "--tarot-graph-dir",
        default=str(DEFAULT_TAROT_GRAPH_DIR),
        help="Path to tarot graph directory containing nodes_*.csv",
    )
    parser.add_argument(
        "--complete-interpretations-path",
        default=str(DEFAULT_COMPLETE_INTERPRETATIONS_PATH),
        help="Path to complete_interpretations.json used as card-id source of truth",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    lint_result = lint_tarot_dataset(
        corpus_path=Path(args.corpus_path),
        edges_path=Path(args.edges_path),
        tarot_graph_dir=Path(args.tarot_graph_dir),
        complete_interpretations_path=Path(args.complete_interpretations_path),
    )
    print(summarize_lint_result(lint_result))
    return 0 if lint_result.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
