#!/usr/bin/env python3
"""
src/lib/cities/data/city-names-kr.json 을 LLM batch 번역으로 채운다.

배경
----
public/data/cities.min.json 에 142k 도시가 있지만 city-names-kr.json 은 1.4k
entries (~1%) 만 한글 매핑이라 KO locale 사용자에게 99% 도시가 영어로 표시.

자동 한글명 source (GeoNames alternateNames / Wikidata / Wikipedia) 모두
호스트 차단 또는 API 제한으로 직접 fetch 불가. 가장 robust 한 길:
**Anthropic Claude API 로 batch 번역**. 비용 추정 ~$3-5 일회.

전제
----
- 사용자 컴퓨터 (혹은 vercel env pull 된 환경) 에서 실행
- 환경변수 ANTHROPIC_API_KEY 필요
- Python 3.9+, `requests` 만 외부 dep (대부분 환경 기본 포함)

사용
----
  export ANTHROPIC_API_KEY=sk-ant-...
  python3 scripts/translate-cities-kr.py
  # 진행 중 Ctrl+C 안전 — 부분 저장된 JSON 그대로 commit 가능.
  # 다시 실행하면 이미 매핑된 도시는 skip.

옵션
----
  --batch-size N   (default 60)  — 한 API call 당 도시 수
  --concurrency N  (default 5)   — 동시 in-flight API 호출 수
  --max-cities N                — 테스트용. N 개만 처리 후 종료.
  --model MODEL    (default claude-haiku-4-5)  — 다른 모델 강제 시 사용
  --dry-run                     — API 호출 안 하고 batch 수만 출력
"""

import argparse
import concurrent.futures
import json
import os
import random
import re
import signal
import sys
import time
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

ROOT = Path(__file__).resolve().parent.parent
CITIES_PATH = ROOT / "public" / "data" / "cities.min.json"
KR_PATH = ROOT / "src" / "lib" / "cities" / "data" / "city-names-kr.json"

ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages"
DEFAULT_MODEL = "claude-haiku-4-5-20251001"

SYSTEM_PROMPT = (
    "You are a Korean toponym (지명) translation assistant. "
    "Given a JSON array of English city names with their country and admin region, "
    "return a JSON object mapping each English name to the conventional Korean rendering. "
    "Use the established Korean 외래어 표기법 conventions:\n"
    "- Well-known cities: use the conventional Korean name (e.g. 'New York City' → '뉴욕', 'Paris' → '파리').\n"
    "- Less-known cities: transliterate using standard 외래어 표기법.\n"
    "- Korean cities (country='KR'): use the actual Korean name (e.g. 'Seoul' → '서울').\n"
    "- Japanese cities (country='JP'): use the Korean pronunciation (e.g. 'Tokyo' → '도쿄', 'Osaka' → '오사카').\n"
    "- Chinese cities (country='CN'): use the Korean reading of the Chinese characters (e.g. 'Beijing' → '베이징', 'Shanghai' → '상하이').\n"
    "Return STRICTLY valid JSON: {\"<English name>\": \"<한글>\", …}. No commentary, no markdown fences. "
    "Every key from the input MUST appear in the output."
)


# ────────────────────────────────── data load


def load_cities() -> list[dict]:
    with CITIES_PATH.open() as f:
        return json.load(f)


def load_existing_kr() -> dict[str, str]:
    if not KR_PATH.exists():
        return {}
    with KR_PATH.open() as f:
        return json.load(f)


def save_kr(mapping: dict[str, str]) -> None:
    # Sort for stable diffs.
    out = {k: mapping[k] for k in sorted(mapping)}
    KR_PATH.parent.mkdir(parents=True, exist_ok=True)
    with KR_PATH.open("w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write("\n")


# ────────────────────────────────── API call


def call_anthropic(
    api_key: str,
    model: str,
    batch: list[dict],
    attempt: int = 0,
) -> dict[str, str]:
    """Translate one batch via Anthropic Messages API. Returns {English: 한글}.

    On HTTP 5xx / 429 / network blip we backoff and retry up to 4 attempts.
    """
    user_msg = (
        "Translate to Korean. Return ONLY a JSON object. Input:\n"
        + json.dumps(batch, ensure_ascii=False)
    )
    payload = {
        "model": model,
        "max_tokens": 4096,
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": user_msg}],
    }
    req = Request(
        ANTHROPIC_ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "content-type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )
    try:
        with urlopen(req, timeout=90) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except HTTPError as e:
        # 4xx surfaces immediately (probably malformed); 5xx + 429 retry.
        body = e.read().decode("utf-8", errors="replace")[:400]
        if e.code in (429, 500, 502, 503, 504) and attempt < 4:
            backoff = (2**attempt) + random.uniform(0, 1)
            time.sleep(backoff)
            return call_anthropic(api_key, model, batch, attempt + 1)
        raise RuntimeError(f"Anthropic HTTP {e.code}: {body}") from e
    except URLError as e:
        if attempt < 4:
            time.sleep((2**attempt) + random.uniform(0, 1))
            return call_anthropic(api_key, model, batch, attempt + 1)
        raise RuntimeError(f"Anthropic network error: {e}") from e

    # Extract text content. Claude responses: { content: [{type:'text', text:'…'}] }
    text = ""
    for block in data.get("content", []):
        if block.get("type") == "text":
            text += block.get("text", "")
    text = text.strip()

    # Some models occasionally wrap in ```json … ``` despite instruction.
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.MULTILINE)
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Anthropic returned non-JSON: {text[:300]}") from e
    if not isinstance(parsed, dict):
        raise RuntimeError(f"Anthropic returned non-object: {type(parsed)}")
    return {str(k): str(v) for k, v in parsed.items() if isinstance(v, str) and v.strip()}


# ────────────────────────────────── main loop


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--batch-size", type=int, default=60)
    parser.add_argument("--concurrency", type=int, default=5)
    parser.add_argument("--max-cities", type=int, default=None)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key and not args.dry_run:
        print("error: ANTHROPIC_API_KEY env var required (or use --dry-run)", file=sys.stderr)
        return 2

    cities = load_cities()
    print(f"loaded {len(cities)} cities")
    kr = load_existing_kr()
    print(f"existing KR mappings: {len(kr)}")

    # Build queue of (name, country, region) for cities without KR mapping.
    # Dedupe by name (multiple cities sharing a name get one translation).
    seen: set[str] = set()
    queue: list[dict] = []
    for c in cities:
        name = c.get("name")
        if not name or name in seen or name in kr:
            continue
        seen.add(name)
        queue.append({
            "name": name,
            "country": c.get("country", ""),
            "region": c.get("region", ""),
        })

    if args.max_cities:
        queue = queue[: args.max_cities]

    print(f"to translate: {len(queue)} unique names")
    batches = [queue[i : i + args.batch_size] for i in range(0, len(queue), args.batch_size)]
    print(f"batches: {len(batches)} (size {args.batch_size}, concurrency {args.concurrency})")

    if args.dry_run:
        return 0

    # 부분 저장 — Ctrl+C / SIGTERM 시 현재까지 결과 commit.
    stop_requested = False

    def _handle_signal(signum, frame):
        nonlocal stop_requested
        stop_requested = True
        print("\nstop requested — finishing in-flight batches and saving…", file=sys.stderr)

    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    total_added = 0
    started = time.time()
    # 매 N batch 마다 부분 저장 — 긴 작업 중 사고 시 손실 최소화.
    SAVE_EVERY = 20

    completed = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrency) as executor:
        futures = {
            executor.submit(call_anthropic, api_key, args.model, batch): batch
            for batch in batches
        }
        for fut in concurrent.futures.as_completed(futures):
            batch = futures[fut]
            try:
                result = fut.result()
            except Exception as e:
                print(f"batch failed (size {len(batch)}): {e}", file=sys.stderr)
                completed += 1
                continue
            new_keys = 0
            for entry in batch:
                name = entry["name"]
                if name in result and result[name] and name not in kr:
                    kr[name] = result[name]
                    new_keys += 1
            total_added += new_keys
            completed += 1
            elapsed = time.time() - started
            print(
                f"  [{completed}/{len(batches)}] +{new_keys} "
                f"(total {total_added}, {elapsed:.0f}s)",
                flush=True,
            )

            if completed % SAVE_EVERY == 0:
                save_kr(kr)
                print(f"  ↳ checkpoint saved ({len(kr)} entries)")

            if stop_requested:
                break

    save_kr(kr)
    print(f"\ndone. final mapping size: {len(kr)} (+{total_added} new)")
    print(f"elapsed: {time.time() - started:.0f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
