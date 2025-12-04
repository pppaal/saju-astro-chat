import json
import os
from pathlib import Path
from typing import Any, Dict, List

ROOT = Path(__file__).resolve().parents[1]
RULE_DIRS = [
    ROOT / "data" / "graph" / "rules" / "fusion",
    ROOT / "data" / "graph" / "rules" / "astro",
    ROOT / "data" / "graph" / "rules" / "saju",
]


def to_list(val: Any) -> List[str]:
    if val is None:
        return []
    if isinstance(val, str):
        return [val.strip().lower()] if val.strip() else []
    if isinstance(val, (list, tuple, set)):
        out = []
        for v in val:
            if isinstance(v, str):
                v = v.strip().lower()
                if v:
                    out.append(v)
            else:
                out.append(str(v).strip().lower())
        return [x for x in out if x]
    return [str(val).strip().lower()]


def normalize_rule(key: str, value: Any) -> Dict[str, Any]:
    if isinstance(value, dict):
        text = value.get("text") or value.get("msg") or key
        weight = int(value.get("weight") or 1)
        when_raw = value.get("when") or [key]
        when = to_list(when_raw)
        if not when:
            when = [key.lower()]
        return {"when": when, "text": text, "weight": weight}

    if isinstance(value, str):
        return {"when": [key.lower()], "text": value, "weight": 1}

    # fallback for numbers/bools
    return {"when": [key.lower()], "text": str(value), "weight": 1}


def normalize_file(path: Path):
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"[SKIP] {path} load failed: {e}")
        return

    if not isinstance(data, dict):
        print(f"[SKIP] {path} is not a dict")
        return

    normalized: Dict[str, Any] = {}
    for key, value in data.items():
        try:
            norm = normalize_rule(key, value)
            normalized[key] = norm
        except Exception as e:
            print(f"[WARN] {path} key={key} normalize failed: {e}")
            continue

    path.write_text(json.dumps(normalized, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[OK] normalized {path} ({len(normalized)} rules)")


def main():
    for d in RULE_DIRS:
        if not d.exists():
            print(f"[INFO] skip missing dir {d}")
            continue
        for file in d.glob("*.json"):
            normalize_file(file)


if __name__ == "__main__":
    main()
