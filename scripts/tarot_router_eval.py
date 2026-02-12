#!/usr/bin/env python3
"""
Router audit for searchbox-style tarot queries.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Dict, List, Tuple

from tarot_audit_common import REPO_ROOT, ensure_artifacts_dir, read_jsonl, write_markdown

if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(REPO_ROOT / "backend_ai") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "backend_ai"))

from backend_ai.services.tarot_service import TarotService  # noqa: E402
from backend_ai.app.tarot.spread_loader import get_spread_loader  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate tarot routing quality")
    parser.add_argument("--input-path", default="data/eval/searchbox_queries.jsonl")
    parser.add_argument("--sample-size", type=int, default=None)
    parser.add_argument("--output-md", default="artifacts/router_eval_report.md")
    parser.add_argument("--output-json", default="artifacts/router_eval_report.json")
    return parser.parse_args()


def _is_yes_no(q: str) -> bool:
    ql = q.lower()
    markers = ("할까", "될까", "맞아", "가능성", "should i", "can i", "may i", "할까여")
    return any(m in ql for m in markers)


def _is_contact_reconcile(q: str) -> bool:
    ql = q.lower()
    markers = ("재회", "연락", "전남친", "전여친", "다시 만나", "ex", "reconcile")
    return any(m in ql for m in markers)


def _is_career(q: str) -> bool:
    ql = q.lower()
    markers = ("이직", "면접", "퇴사", "승진", "직장", "career", "job", "interview")
    return any(m in ql for m in markers)


def _is_money(q: str) -> bool:
    ql = q.lower()
    return any(m in ql for m in ("돈", "주식", "코인", "빚", "투자", "money", "investment"))


def _classify_spread(theme: str, sub_topic: str, spread_catalog: Dict[str, set]) -> Tuple[str, str]:
    if theme in spread_catalog and sub_topic in spread_catalog[theme]:
        return theme, sub_topic
    if theme in spread_catalog:
        return theme, "three_card" if "three_card" in spread_catalog[theme] else next(iter(spread_catalog[theme]))
    return "life_path", "general"


def _low_confidence(confidence: float) -> bool:
    return confidence < 0.6


def run_eval(rows: List[Dict]) -> Dict:
    spread_loader = get_spread_loader()
    spread_catalog = {
        theme: {x["id"] for x in spread_loader.get_sub_topics(theme)}
        for theme in spread_loader.get_available_themes()
    }
    service = TarotService()

    domain_dist = Counter()
    spread_dist = Counter()
    anomalies: List[Dict] = []
    low_conf_rows: List[Dict] = []
    label_mismatch = 0
    eval_rows = 0

    for row in rows:
        query = str(row.get("query") or "").strip()
        if not query:
            continue
        eval_rows += 1
        detected = service.detect_tarot_topic(query)
        theme = str(detected.get("theme") or "")
        sub_topic = str(detected.get("sub_topic") or "")
        confidence = float(detected.get("confidence") or 0.0)

        domain_dist[theme] += 1
        spread_key = f"{theme}/{sub_topic}"
        spread_dist[spread_key] += 1

        picked_theme, picked_spread = _classify_spread(theme, sub_topic, spread_catalog)
        expected_spread = str(row.get("expected_spread_class") or "").strip()
        if expected_spread and expected_spread != picked_spread:
            label_mismatch += 1

        reasons = []
        if _is_yes_no(query) and picked_spread in {"celtic_cross", "celtic-cross"}:
            reasons.append("yes/no question selected celtic-cross")
        if _is_contact_reconcile(query) and picked_theme == "career":
            reasons.append("contact/reconciliation query routed to career")
        if _is_career(query) and picked_theme == "love":
            reasons.append("career query routed to love")
        if _is_money(query) and picked_theme not in {"wealth", "money", "money-finance"}:
            reasons.append("money query not routed to money domain")
        if picked_theme not in spread_catalog:
            reasons.append("theme not in spread catalog")
        elif picked_spread not in spread_catalog[picked_theme]:
            reasons.append("spread outside theme catalog")

        if reasons:
            anomalies.append(
                {
                    "query": query,
                    "picked_theme": picked_theme,
                    "picked_spread": picked_spread,
                    "confidence": confidence,
                    "reasons": reasons,
                }
            )
        if _low_confidence(confidence):
            low_conf_rows.append(
                {
                    "query": query,
                    "theme": picked_theme,
                    "spread": picked_spread,
                    "confidence": confidence,
                }
            )

    low_conf_rows.sort(key=lambda x: x["confidence"])
    anomalies.sort(key=lambda x: x["confidence"])
    pattern_counter = Counter()
    for row in anomalies:
        for reason in row.get("reasons", []):
            pattern_counter[reason] += 1
    return {
        "total": eval_rows,
        "domain_distribution": dict(domain_dist),
        "spread_distribution": dict(spread_dist),
        "anomaly_count": len(anomalies),
        "anomaly_rate": (len(anomalies) / eval_rows) if eval_rows else 0.0,
        "label_mismatch_count": label_mismatch,
        "label_mismatch_rate": (label_mismatch / eval_rows) if eval_rows else 0.0,
        "low_confidence_top30": low_conf_rows[:30],
        "anomalies_top50": anomalies[:50],
        "anomaly_patterns_top5": [
            {"pattern": k, "count": v} for k, v in pattern_counter.most_common(5)
        ],
    }


def build_markdown(report: Dict) -> List[str]:
    lines = [
        "# Tarot Router Eval Report",
        "",
        "## Summary",
        f"- total_queries: {report['total']}",
        f"- anomaly_count: {report['anomaly_count']}",
        f"- anomaly_rate: {report['anomaly_rate']:.4f}",
        f"- label_mismatch_count: {report['label_mismatch_count']}",
        f"- label_mismatch_rate: {report['label_mismatch_rate']:.4f}",
        "",
        "## Domain Distribution",
    ]
    for k, v in sorted(report["domain_distribution"].items(), key=lambda x: (-x[1], x[0])):
        lines.append(f"- {k}: {v}")
    lines.extend(["", "## Spread Distribution (Top 20)"])
    for k, v in sorted(report["spread_distribution"].items(), key=lambda x: (-x[1], x[0]))[:20]:
        lines.append(f"- {k}: {v}")
    lines.extend(["", "## Low Confidence Top 30"])
    if not report["low_confidence_top30"]:
        lines.append("- none")
    else:
        for row in report["low_confidence_top30"]:
            lines.append(
                f"- conf={row['confidence']:.3f} | {row['theme']}/{row['spread']} | {row['query']}"
            )
    lines.extend(["", "## Anomalies Top 30"])
    if not report["anomalies_top50"]:
        lines.append("- none")
    else:
        for row in report["anomalies_top50"][:30]:
            lines.append(
                f"- conf={row['confidence']:.3f} | {row['picked_theme']}/{row['picked_spread']} | "
                f"{'; '.join(row['reasons'])} | {row['query']}"
            )
    lines.extend(["", "## Anomaly Patterns Top 5"])
    if not report.get("anomaly_patterns_top5"):
        lines.append("- none")
    else:
        for row in report["anomaly_patterns_top5"]:
            lines.append(f"- {row['pattern']}: {row['count']}")
    return lines


def main() -> int:
    args = parse_args()
    rows = read_jsonl(Path(args.input_path))
    if args.sample_size and args.sample_size > 0:
        rows = rows[: args.sample_size]

    report = run_eval(rows)
    ensure_artifacts_dir()
    write_markdown(Path(args.output_md), build_markdown(report))
    Path(args.output_json).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[router_eval] total={report['total']} anomaly_rate={report['anomaly_rate']:.4f}")
    print(f"[router_eval] wrote: {args.output_md}")
    print(f"[router_eval] wrote: {args.output_json}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
