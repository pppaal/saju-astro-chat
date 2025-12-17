"""
Rebuild RAG embeddings and graph caches after data changes.

Usage:
  python backend_ai/scripts/rebuild_embeddings.py [--device cpu|cuda] [--clear-cache]

Steps:
  1) Regenerate graph/QA embeddings (graph_rag_embeds.pt, corpus_embeds.pt).
  2) (Optional) Clear Redis/in-memory caches via /cache/clear.
"""

import argparse
import requests
import subprocess
import sys
from pathlib import Path


def run(cmd: list[str], cwd: Path):
    print(f"[cmd] {' '.join(cmd)}")
    res = subprocess.run(cmd, cwd=cwd, check=True)
    return res


def clear_cache(endpoint: str):
    try:
        resp = requests.post(f"{endpoint}/cache/clear", json={"pattern": "fusion:*"}, timeout=10)
        print(f"[cache] status={resp.status_code} body={resp.text[:200]}")
    except Exception as e:
        print(f"[cache] clear failed: {e}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--device", choices=["cpu", "cuda"], default="cpu", help="Device for embedding scripts")
    parser.add_argument("--clear-cache", action="store_true", help="Call /cache/clear after rebuild")
    parser.add_argument("--endpoint", default="http://127.0.0.1:5000", help="Backend base URL for cache clear")
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    env = dict(**os.environ, RAG_DEVICE=args.device)

    # 1) Rebuild graph embeddings
    run([sys.executable, "-m", "backend_ai.app.saju_astro_rag"], cwd=root)

    # 2) Rebuild corpus embeddings (if script exists)
    corpus_script = root / "app" / "corpus_rag.py"
    if corpus_script.exists():
        run([sys.executable, str(corpus_script)], cwd=root)

    if args.clear_cache:
        clear_cache(args.endpoint)


if __name__ == "__main__":
    import os
    main()
