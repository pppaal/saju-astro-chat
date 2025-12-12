"""
Offline analysis script for Aura/Nova responses.

What it does:
- Loads a CSV of anonymous responses (columns: answers JSON, optional consistencyScore/typeCode).
- Converts A/B answers to numeric (1/0) per axis.
- Calculates Cronbach’s alpha per axis (internal consistency).
- Calculates item-total correlations to spot weak items.
- Emits a simple weight-suggestion JSON (flagging low-correlation items).

Usage:
    python scripts/aura_analysis.py --csv path/to/aura_responses.csv

Expected CSV schema (minimum):
    answers  (JSON string: {"q1_energy_network":"A", ...})
Optional columns:
    typeCode, consistencyScore, timestamp, respondent_id (ignored in math)

Dependencies: pandas (pip install pandas)
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List
import warnings

import pandas as pd

# Reduce pandas FutureWarning noise for replace downcasting
pd.set_option("future.no_silent_downcasting", True)
warnings.filterwarnings("ignore", message="Downcasting behavior in `replace` is deprecated", category=FutureWarning)


AXIS_ITEMS: Dict[str, List[str]] = {
    "energy": [
        "q1_energy_network",
        "q2_energy_weekend",
        "q3_energy_spontaneous",
        "q4_energy_transit",
        "q5_energy_idealday",
    ],
    "cognition": [
        "q6_cog_problem",
        "q7_cog_explain",
        "q8_cog_evaluate",
        "q9_cog_basis",
        "q10_cog_constraints",
    ],
    "decision": [
        "q11_decision_conflict",
        "q12_decision_feedback",
        "q13_decision_resources",
        "q14_decision_rules",
        "q15_decision_delay",
    ],
    "rhythm": [
        "q16_rhythm_deadline",
        "q17_rhythm_change",
        "q18_rhythm_workstyle",
        "q19_rhythm_holiday",
        "q20_rhythm_feeling",
    ],
}

AB_MAP = {"A": 1, "B": 0}


def cronbach_alpha(df: pd.DataFrame) -> float:
    items = df.dropna()
    k = items.shape[1]
    if k <= 1:
        return float("nan")
    variances = items.var(axis=0, ddof=1)
    total_var = items.sum(axis=1).var(ddof=1)
    if total_var == 0:
        return float("nan")
    return (k / (k - 1)) * (1 - variances.sum() / total_var)


def load_answers(path: str) -> pd.DataFrame:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"File not found: {path}")
    if p.suffix.lower() == ".json":
        data = json.loads(p.read_text(encoding="utf-8"))
        if not isinstance(data, list):
            raise ValueError("JSON must be a list of objects with an 'answers' field.")
        answers_series = pd.Series([row.get("answers", {}) for row in data])
        answers_df = answers_series.apply(pd.Series)
    else:
        df = pd.read_csv(path)
        if "answers" not in df.columns:
            raise ValueError("CSV must contain an 'answers' column with JSON string answers.")
        answers_df = df["answers"].apply(json.loads).apply(pd.Series)
    return answers_df


def analyze_axis(answers_df: pd.DataFrame, axis_items: List[str]) -> Dict[str, object]:
    subset = answers_df[axis_items].replace(AB_MAP).infer_objects(copy=False)
    total = subset.sum(axis=1)
    item_total_corr = subset.apply(lambda c: c.corr(total))
    alpha = cronbach_alpha(subset)
    return {"alpha": alpha, "item_total_corr": item_total_corr}


def main():
    parser = argparse.ArgumentParser(description="Aura/Nova response analysis (alpha, item-total corr).")
    parser.add_argument("--csv", required=True, help="Path to aura_responses.csv with an 'answers' column (JSON).")
    parser.add_argument("--low-corr-threshold", type=float, default=0.2, help="Flag items below this correlation.")
    args = parser.parse_args()

    answers_df = load_answers(args.csv)

    print("=== Aura/Nova Reliability Snapshot ===")
    suggestions = {}

    for axis, items in AXIS_ITEMS.items():
        result = analyze_axis(answers_df, items)
        alpha = result["alpha"]
        print(f"\n[{axis}] Cronbach alpha: {alpha:.3f}" if pd.notna(alpha) else f"\n[{axis}] alpha: nan")

        corr: pd.Series = result["item_total_corr"]
        for item_id, corr_val in corr.items():
            flag = " <-- weak" if pd.notna(corr_val) and corr_val < args.low_corr_threshold else ""
            print(f"  {item_id:25s}: {corr_val:.3f}" if pd.notna(corr_val) else f"  {item_id:25s}: nan", flag)
            if pd.notna(corr_val) and corr_val < args.low_corr_threshold:
                suggestions[item_id] = {
                    "current_weight": "see src/lib/aura/analysis.ts EFFECTS",
                    "suggested_weight": 0.5,
                    "reason": f"low item-total corr {corr_val:.3f}",
                }

    if suggestions:
        print("\nSuggested weight tweaks (manual review needed):")
        print(json.dumps(suggestions, indent=2, ensure_ascii=False))
    else:
        print("\nNo low-correlation items under the given threshold.")


if __name__ == "__main__":
    main()
