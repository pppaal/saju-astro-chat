#!/usr/bin/env python3
"""
Build searchbox-style korean query dataset for tarot router audit.
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path
from typing import Dict, List


BASE_SEEDS: List[Dict] = [
    {"query": "걔 나 좋아함?", "expected_intent_class": "crush", "expected_spread_class": "crush-feelings"},
    {"query": "전남친한테 연락할까", "expected_intent_class": "yes_no", "expected_spread_class": "yes-no-why"},
    {"query": "재회 가능성 있나", "expected_intent_class": "reconciliation", "expected_spread_class": "reconciliation"},
    {"query": "소개팅 계속 만나도 될까?", "expected_intent_class": "yes_no", "expected_spread_class": "yes-no-why"},
    {"query": "면접 붙을까", "expected_intent_class": "interview", "expected_spread_class": "interview-result"},
    {"query": "이직 지금 타이밍 맞아?", "expected_intent_class": "timing", "expected_spread_class": "timing-window"},
    {"query": "퇴사할까 말까", "expected_intent_class": "yes_no", "expected_spread_class": "yes-no-why"},
    {"query": "상사가 나 싫어하는듯", "expected_intent_class": "work_relation", "expected_spread_class": "relationship-cross"},
    {"query": "돈관리 언제부터 정리될까", "expected_intent_class": "timing", "expected_spread_class": "timing-window"},
    {"query": "코인 계속 들고가?", "expected_intent_class": "yes_no", "expected_spread_class": "yes-no-why"},
    {"query": "빚 정리 가능할까", "expected_intent_class": "yes_no", "expected_spread_class": "yes-no-why"},
    {"query": "부모님 건강 너무 걱정돼", "expected_intent_class": "health", "expected_spread_class": "mind-body-scan"},
    {"query": "요즘 불안이 심한데 어떡하지", "expected_intent_class": "health", "expected_spread_class": "mind-body-scan"},
    {"query": "소송 걸어도 될까", "expected_intent_class": "yes_no", "expected_spread_class": "yes-no-why"},
    {"query": "계약서 사인해도돼?", "expected_intent_class": "yes_no", "expected_spread_class": "yes-no-why"},
    {"query": "친구랑 계속 같이 갈까", "expected_intent_class": "yes_no", "expected_spread_class": "yes-no-why"},
    {"query": "번아웃왔어.. 일 그만둘까", "expected_intent_class": "yes_no", "expected_spread_class": "yes-no-why"},
    {"query": "오늘운세", "expected_intent_class": "today", "expected_spread_class": "day-card"},
    {"query": "이번주 흐름", "expected_intent_class": "weekly_monthly", "expected_spread_class": "weekly-forecast"},
    {"query": "내 미래 전반적으로 어때", "expected_intent_class": "general", "expected_spread_class": "past-present-future"},
]


PREFIXES = ["", "진짜 ", "아 ", "하.. ", "급질문 ", "ㅈㅂ ", "pls ", "헬프 ", "ㅠㅠ "]
SUFFIXES = ["", "?", "??", "ㅠ", " ㅋㅋ", " ㅜㅜ", "…", " 🙏", " plz", " asap"]
NOISE_TOKENS = ["", "", " ㄹㅇ", " ㅅㅂ", " omg", " fr", " lol", " 제발", "ㅠㅠ", "^^"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build searchbox query dataset")
    parser.add_argument("--output-path", default="tests/fixtures/tarot-eval/searchbox_queries.jsonl")
    parser.add_argument("--target-size", type=int, default=220)
    parser.add_argument("--seed", type=int, default=23)
    return parser.parse_args()


def mutate_query(q: str, rng: random.Random) -> str:
    x = q
    if rng.random() < 0.35:
        x = x.replace(" ", "")
    if rng.random() < 0.2:
        x = x.replace("할까", "할까여").replace("될까", "되나").replace("어때", "어떰")
    if rng.random() < 0.15:
        x = x.replace("재회", "다시 만남").replace("면접", "인터뷰")
    return f"{rng.choice(PREFIXES)}{x}{rng.choice(NOISE_TOKENS)}{rng.choice(SUFFIXES)}".strip()


def build_rows(target_size: int, seed: int) -> List[Dict]:
    rng = random.Random(seed)
    rows: List[Dict] = []
    manual_label_cut = min(30, len(BASE_SEEDS))

    for idx, item in enumerate(BASE_SEEDS):
        row = dict(item)
        row["label_source"] = "manual" if idx < manual_label_cut else "heuristic"
        rows.append(row)

    while len(rows) < target_size:
        base = BASE_SEEDS[len(rows) % len(BASE_SEEDS)]
        rows.append(
            {
                "query": mutate_query(base["query"], rng),
                "expected_intent_class": base["expected_intent_class"],
                "expected_spread_class": base["expected_spread_class"],
                "label_source": "heuristic",
            }
        )
    return rows[:target_size]


def main() -> int:
    args = parse_args()
    rows = build_rows(target_size=args.target_size, seed=args.seed)
    out_path = Path(args.output_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8", newline="\n") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    manual_count = sum(1 for r in rows if r["label_source"] == "manual")
    print(f"[searchbox] wrote {len(rows)} rows -> {out_path}")
    print(f"[searchbox] manual_labeled={manual_count}, heuristic={len(rows)-manual_count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

