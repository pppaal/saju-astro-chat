"""Deterministic tarot quality eval helpers."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict, List

from ..tarot_utils import map_tarot_theme
from .context_detector import classify_question_intent


def load_tarot_eval_prompts(eval_file: str | Path) -> List[Dict[str, Any]]:
    path = Path(eval_file)
    rows: List[Dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))
    return rows


def _contains_pattern(text: str, patterns: List[str]) -> bool:
    return any(re.search(pattern, text) for pattern in patterns)


def _keyword_checks(prompt: str, result: Dict[str, Any]) -> Dict[str, bool]:
    lower = str(prompt or "").lower()
    primary = str(result.get("primary_intent", "")).strip()
    secondary = [str(x).strip() for x in result.get("secondary_intents", []) or []]
    mapped_spread = str(result.get("mapped_spread", "")).strip()
    counseling_frame = str(result.get("counseling_frame", "")).strip()

    checks = {
        "timing_signal_captured": True,
        "decision_signal_captured": True,
        "relationship_signal_captured": True,
        "spread_signal_captured": True,
    }

    if _contains_pattern(
        lower,
        [
            r"\bwhen\b",
            r"\btiming\b",
            r"\bthis month\b",
            r"\bthis week\b",
            r"\bweekly\b",
            r"\btoday\b",
        ],
    ):
        checks["timing_signal_captured"] = (
            primary in {"timing", "daily_flow"}
            or "timing" in secondary
            or counseling_frame in {"timing_window", "risk_timing"}
        )

    if _contains_pattern(
        lower,
        [
            r"\bshould i (stay|switch|leave|move|wait|go|quit|buy|sell|accept|reject|continue|start|stop|tell|reach out)\b",
            r"\bstay\b",
            r"\bswitch\b",
            r"\bdecide\b",
            r"\bdecision\b",
            r"\bdecisions\b",
            r"\bchoices?\b",
            r"\boptions?\b",
        ],
    ):
        checks["decision_signal_captured"] = (
            primary in {"decision", "comparison", "career_change", "investment", "entrepreneurship"}
            or counseling_frame == "decision_planning"
        )

    if _contains_pattern(
        lower,
        [
            r"\brelationship\b",
            r"\blove\b",
            r"\bpartner\b",
            r"\bdating\b",
            r"\breconciliation\b",
            r"\bstopped talking\b",
        ],
    ):
        checks["relationship_signal_captured"] = (
            counseling_frame.startswith("relationship_")
            or primary in {
                "reconciliation",
                "feelings",
                "confession",
                "commitment",
                "breakup",
                "new_connection",
                "relationship_general",
            }
            or ("love" in lower and primary in {"comparison", "decision"})
        )

    if _contains_pattern(
        lower,
        [
            r"\bspread\b",
            r"\bthree-card\b",
            r"\bthree card\b",
            r"\bceltic\b",
            r"\byes/no\b",
            r"\bweekly\b",
            r"\bshadow-work\b",
            r"\bshadow work\b",
        ],
    ):
        checks["spread_signal_captured"] = mapped_spread not in {"general", "", None}

    return checks


def evaluate_tarot_prompt_row(row: Dict[str, Any]) -> Dict[str, Any]:
    prompt = str(row.get("prompt", "")).strip()
    mapped_theme, mapped_spread = map_tarot_theme("general", "single_card", prompt)
    intent = classify_question_intent(prompt, mapped_theme=mapped_theme, mapped_spread=mapped_spread)

    result = {
        "id": row.get("id", ""),
        "prompt": prompt,
        "mapped_theme": mapped_theme,
        "mapped_spread": mapped_spread,
        "primary_intent": intent.get("primary_intent", ""),
        "secondary_intents": intent.get("secondary_intents", []),
        "confidence": float(intent.get("confidence", 0.0) or 0.0),
        "counseling_frame": intent.get("counseling_frame", ""),
        "open_intent_used": bool(intent.get("open_intent_used")),
    }

    checks = {
        "mapped_theme_present": bool(mapped_theme),
        "mapped_spread_present": bool(mapped_spread),
        "primary_intent_present": bool(result["primary_intent"]),
        "counseling_frame_present": bool(result["counseling_frame"]),
        "confidence_nonzero": result["confidence"] > 0.0,
    }
    checks.update(_keyword_checks(prompt, {**result, "mapped_spread": mapped_spread}))

    passed = sum(1 for ok in checks.values() if ok)
    total = len(checks)
    result["checks"] = checks
    result["score"] = round(passed / total, 4) if total else 0.0
    return result


def evaluate_tarot_prompts(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    results = [evaluate_tarot_prompt_row(row) for row in rows]
    average_score = round(sum(item["score"] for item in results) / len(results), 4) if results else 0.0
    failing = [item for item in results if item["score"] < 1.0]
    return {
        "count": len(results),
        "average_score": average_score,
        "failing_count": len(failing),
        "results": results,
    }
