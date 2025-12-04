"""
Simple smoke test: load latest logs/destinymap-*.json (or a given file),
run signal_extractor.extract_signals, and print the summary.

Usage:
  python backend_ai/tools/test_signals.py            # latest log
  python backend_ai/tools/test_signals.py path.json  # specific log
"""

import sys
import json
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1] / "app"))

from signal_extractor import extract_signals  # noqa: E402


def load_json(path: Path):
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def find_latest_log() -> Path:
    logs_dir = Path("logs")
    candidates = sorted(logs_dir.glob("destinymap-*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not candidates:
        raise FileNotFoundError("No logs/destinymap-*.json found. Run computeDestinyMap first.")
    return candidates[0]


def main():
    if len(sys.argv) > 1:
        path = Path(sys.argv[1])
    else:
        path = find_latest_log()

    data = load_json(path)
    report = data.get("report") or data
    # Prefer top-level astrology/saju; fall back to raw.* if present
    raw = report.get("raw") or {}
    astro = report.get("astrology") or raw.get("astrology") or {}
    saju = report.get("saju") or raw.get("saju") or {}

    facts = {"astro": astro, "saju": saju}
    signals = extract_signals(facts)

    print(f"# Signals for {path}")
    out = json.dumps(signals, ensure_ascii=False, indent=2)
    try:
        print(out)
    except UnicodeEncodeError:
        sys.stdout.buffer.write(out.encode("utf-8", "ignore"))


if __name__ == "__main__":
    main()
