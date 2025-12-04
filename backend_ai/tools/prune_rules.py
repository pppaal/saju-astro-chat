import json
from pathlib import Path
from typing import Any, Dict, List, Tuple

ROOT = Path(__file__).resolve().parents[1]
RULE_DIRS = [
    ROOT / "data" / "graph" / "rules" / "fusion",
    ROOT / "data" / "graph" / "rules" / "astro",
    ROOT / "data" / "graph" / "rules" / "saju",
]

# Keep at most this many rules per file after pruning (balanced coverage)
MAX_RULES = 800

# Theme-specific core keywords to boost weights
THEME_KEYWORDS = {
    "career": {"career", "job", "work", "business", "10", "mc", "saturn", "jupiter", "finance", "income", "6", "2"},
    "love": {"love", "relationship", "partner", "venus", "mars", "moon", "7", "5", "marriage", "dating"},
    "health": {"health", "wellbeing", "stress", "moon", "saturn", "mars", "6", "12", "1"},
    "life_path": {"life", "path", "asc", "mc", "sun", "moon", "element", "daeun", "annual", "luck"},
    "family": {"family", "home", "4", "moon", "parents", "children", "moving"},
    "daily": {"day", "iljin", "daily"},
    "monthly": {"month", "monthly", "month luck"},
    "year": {"year", "annual", "yearly", "new year"},
    "new_year": {"new year", "annual"},
    "next_year": {"next year", "annual"},
}


def score_rule(rule: Dict[str, Any], theme: str) -> Tuple[int, int, int]:
    """
    Higher is better: weight (with boosts), shorter when list, shorter text.
    Return tuple used for sorting (desc).
    """
    base_weight = int(rule.get("weight", 1))
    when = rule.get("when") or []
    if isinstance(when, str):
        when = [when]
    when_len = len(when)
    text = (rule.get("text") or "").lower()
    text_len = len(text.strip())

    core = THEME_KEYWORDS.get(theme, set())
    boost = 0
    if core:
        if any(k in core for k in when):
            boost += 2
        if any(k in text for k in core):
            boost += 1

    weight = base_weight + boost
    return (weight, -when_len, -text_len)


def prune_file(path: Path):
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"[SKIP] {path} load failed: {e}")
        return

    if not isinstance(data, dict):
        print(f"[SKIP] {path} is not a dict")
        return

    seen = set()
    rules: List[Dict[str, Any]] = []
    for key, val in data.items():
        if not isinstance(val, dict):
            continue
        when = val.get("when") or []
        if isinstance(when, str):
            when = [when]
        text = (val.get("text") or "").strip()
        weight = int(val.get("weight") or 1)
        if not when or not text:
            continue
        sig = (tuple(sorted(when)), text)
        if sig in seen:
            continue
        seen.add(sig)
        rules.append({"when": when, "text": text, "weight": weight})

    # sort by score desc
    theme = path.stem  # e.g., career.json -> career
    rules.sort(key=lambda r: score_rule(r, theme), reverse=True)
    pruned = rules[:MAX_RULES]

    # restore to dict with stable keys
    out: Dict[str, Any] = {}
    for idx, r in enumerate(pruned):
        out[f"rule_{idx+1}"] = r

    path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[OK] pruned {path.name}: {len(pruned)} kept (from {len(rules)})")


def main():
    for d in RULE_DIRS:
        if not d.exists():
            print(f"[INFO] missing dir {d}, skip")
            continue
        for f in d.glob("*.json"):
            prune_file(f)


if __name__ == "__main__":
    main()
