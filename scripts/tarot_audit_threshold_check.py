#!/usr/bin/env python3
"""
Fail CI when tarot audit metrics exceed allowed thresholds.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Check tarot audit thresholds")
    parser.add_argument("--coverage-report", default="artifacts/coverage_report.json")
    parser.add_argument("--router-report", default="artifacts/router_eval_report.json")
    parser.add_argument("--e2e-report", default="artifacts/e2e_smoke_report.json")
    parser.add_argument("--deck-report-md", default="artifacts/deck_validation_report.md")
    parser.add_argument("--max-missing", type=int, default=0)
    parser.add_argument("--max-router-anomaly-rate", type=float, default=0.01)
    return parser.parse_args()


def _load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    args = parse_args()
    errors = []

    coverage = _load_json(Path(args.coverage_report))
    missing = int(coverage.get("summary", {}).get("missing_combo_count", 999999))
    if missing > args.max_missing:
        errors.append(f"coverage missing_combo_count={missing} > {args.max_missing}")

    router = _load_json(Path(args.router_report))
    anomaly_rate = float(router.get("anomaly_rate", 1.0))
    if anomaly_rate > args.max_router_anomaly_rate:
        errors.append(
            f"router anomaly_rate={anomaly_rate:.4f} > {args.max_router_anomaly_rate:.4f}"
        )

    e2e = _load_json(Path(args.e2e_report))
    failed_cases = int(e2e.get("failed_cases", 999999))
    if failed_cases > 0:
        errors.append(f"e2e failed_cases={failed_cases} > 0")

    deck_md = Path(args.deck_report_md).read_text(encoding="utf-8")
    if "- status: PASS" not in deck_md:
        errors.append("deck validation status is not PASS")

    if errors:
        print("[audit-threshold] FAIL")
        for e in errors:
            print(f"- {e}")
        return 1

    print("[audit-threshold] PASS")
    print(f"- coverage missing_combo_count={missing}")
    print(f"- router anomaly_rate={anomaly_rate:.4f}")
    print(f"- e2e failed_cases={failed_cases}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

