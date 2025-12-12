"""
Quick performance profile for embedding and graph search.

Usage:
  python backend_ai/tools/performance_profile.py
"""

import time
import sys
import os
import argparse
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="Embed/search performance profile")
    parser.add_argument("--device", default="auto", help="Device preference: auto|cuda|cpu")
    args = parser.parse_args()

    # Hint device for SentenceTransformer loader
    os.environ["RAG_DEVICE"] = args.device

    sys.path.append(str(Path(__file__).resolve().parents[2]))
    start = time.time()
    from backend_ai.app import saju_astro_rag as rag  # noqa
    import torch  # noqa

    load_time = time.time() - start

    t0 = time.time()
    _ = rag.embed_text("performance warmup unique string")
    embed_time = time.time() - t0

    t1 = time.time()
    res = rag.search_graphs("사주 궁합", top_k=5)
    search_time = time.time() - t1

    model = rag.get_model()
    device = str(getattr(model, "device", "cpu"))

    print(f"Model load import sec: {round(load_time, 3)} | device: {device}")
    print(f"Embed warmup sec: {round(embed_time, 3)}")
    print(f"search_graphs sec: {round(search_time, 3)} | results: {len(res)}")


if __name__ == "__main__":
    main()
