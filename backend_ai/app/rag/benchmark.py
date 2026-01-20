# backend_ai/app/rag/benchmark.py
"""
RAG Performance Benchmark
=========================

Tests RAG system performance against target: p95 < 700ms

Usage:
    python -m backend_ai.app.rag.benchmark

    # With warmup
    python -m backend_ai.app.rag.benchmark --warmup

    # Custom iterations
    python -m backend_ai.app.rag.benchmark --iterations 50
"""

import asyncio
import argparse
import logging
import statistics
import sys
import time
from typing import List, Dict, Any

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)


# Test data samples
SAMPLE_SAJU_DATA = [
    {
        "dayMaster": {"heavenlyStem": "甲", "element": "wood", "name": "Jia Wood"},
        "dominantElement": "wood",
        "yearPillar": {"stem": "庚", "branch": "子"},
        "monthPillar": {"stem": "丁", "branch": "丑"},
    },
    {
        "dayMaster": {"heavenlyStem": "丙", "element": "fire", "name": "Bing Fire"},
        "dominantElement": "fire",
        "yearPillar": {"stem": "壬", "branch": "寅"},
        "monthPillar": {"stem": "癸", "branch": "卯"},
    },
    {
        "dayMaster": {"heavenlyStem": "庚", "element": "metal", "name": "Geng Metal"},
        "dominantElement": "metal",
        "yearPillar": {"stem": "甲", "branch": "辰"},
        "monthPillar": {"stem": "乙", "branch": "巳"},
    },
]

SAMPLE_ASTRO_DATA = [
    {
        "sun": {"sign": "Aries", "degree": 15.5, "house": 1},
        "moon": {"sign": "Cancer", "degree": 22.3, "house": 4},
        "mercury": {"sign": "Pisces", "degree": 8.7, "house": 12},
        "venus": {"sign": "Taurus", "degree": 12.1, "house": 2},
        "mars": {"sign": "Leo", "degree": 5.9, "house": 5},
    },
    {
        "sun": {"sign": "Libra", "degree": 3.2, "house": 7},
        "moon": {"sign": "Scorpio", "degree": 18.6, "house": 8},
        "mercury": {"sign": "Virgo", "degree": 25.4, "house": 6},
        "venus": {"sign": "Leo", "degree": 9.8, "house": 5},
        "mars": {"sign": "Capricorn", "degree": 14.3, "house": 10},
    },
    {
        "sun": {"sign": "Gemini", "degree": 20.1, "house": 3},
        "moon": {"sign": "Aquarius", "degree": 7.5, "house": 11},
        "mercury": {"sign": "Gemini", "degree": 28.9, "house": 3},
        "venus": {"sign": "Cancer", "degree": 1.2, "house": 4},
        "mars": {"sign": "Aries", "degree": 22.7, "house": 1},
    },
]

THEMES = ["career", "love", "health", "life_path", "chat"]


async def run_single_benchmark(
    manager,
    saju_data: dict,
    astro_data: dict,
    theme: str,
    use_cache: bool = True
) -> float:
    """Run a single benchmark iteration and return elapsed time in ms."""
    start = time.perf_counter()
    await manager.fetch_all(saju_data, astro_data, theme, "ko", use_cache=use_cache)
    elapsed_ms = (time.perf_counter() - start) * 1000
    return elapsed_ms


async def run_benchmark(
    iterations: int = 20,
    warmup: bool = True,
    use_cache: bool = True
) -> Dict[str, Any]:
    """
    Run performance benchmark.

    Args:
        iterations: Number of benchmark iterations
        warmup: Whether to warmup before benchmark
        use_cache: Whether to use query cache

    Returns:
        Dict with benchmark results
    """
    from backend_ai.app.rag.optimized_manager import (
        get_optimized_rag_manager,
        warmup_optimized_rag
    )

    results = {
        "iterations": iterations,
        "warmup": warmup,
        "use_cache": use_cache,
        "timings": [],
        "errors": [],
    }

    # Get manager
    manager = get_optimized_rag_manager()

    # Warmup if requested
    if warmup:
        logger.info("Running warmup...")
        warmup_start = time.perf_counter()
        warmup_result = warmup_optimized_rag()
        warmup_elapsed = (time.perf_counter() - warmup_start) * 1000
        results["warmup_time_ms"] = warmup_elapsed
        results["warmup_systems"] = warmup_result.get("systems", {})
        logger.info(f"Warmup completed in {warmup_elapsed:.1f}ms")

    # Run benchmark iterations
    logger.info(f"Running {iterations} benchmark iterations...")
    timings: List[float] = []

    for i in range(iterations):
        # Rotate through sample data for variety
        saju = SAMPLE_SAJU_DATA[i % len(SAMPLE_SAJU_DATA)]
        astro = SAMPLE_ASTRO_DATA[i % len(SAMPLE_ASTRO_DATA)]
        theme = THEMES[i % len(THEMES)]

        try:
            elapsed = await run_single_benchmark(
                manager, saju, astro, theme, use_cache
            )
            timings.append(elapsed)

            if (i + 1) % 5 == 0:
                logger.info(f"  Iteration {i + 1}/{iterations}: {elapsed:.1f}ms")

        except Exception as e:
            results["errors"].append({"iteration": i, "error": str(e)})
            logger.error(f"  Iteration {i + 1} failed: {e}")

    results["timings"] = timings

    # Calculate statistics
    if timings:
        sorted_timings = sorted(timings)
        count = len(sorted_timings)

        results["stats"] = {
            "count": count,
            "avg_ms": statistics.mean(sorted_timings),
            "min_ms": min(sorted_timings),
            "max_ms": max(sorted_timings),
            "stdev_ms": statistics.stdev(sorted_timings) if count > 1 else 0,
            "p50_ms": sorted_timings[int(count * 0.5)],
            "p90_ms": sorted_timings[int(count * 0.9)],
            "p95_ms": sorted_timings[int(count * 0.95)] if count > 1 else sorted_timings[0],
            "p99_ms": sorted_timings[int(count * 0.99)] if count > 1 else sorted_timings[0],
        }

        # Check against target
        p95 = results["stats"]["p95_ms"]
        target = 700
        results["target_met"] = p95 < target
        results["target_ms"] = target

    # Get manager stats
    results["manager_stats"] = manager.get_stats()

    return results


def print_results(results: Dict[str, Any]) -> None:
    """Print benchmark results in a readable format."""
    print("\n" + "=" * 60)
    print("RAG PERFORMANCE BENCHMARK RESULTS")
    print("=" * 60)

    print(f"\nConfiguration:")
    print(f"  Iterations: {results['iterations']}")
    print(f"  Warmup: {results['warmup']}")
    print(f"  Use Cache: {results['use_cache']}")

    if "warmup_time_ms" in results:
        print(f"  Warmup Time: {results['warmup_time_ms']:.1f}ms")

    if "stats" in results:
        stats = results["stats"]
        print(f"\nTiming Statistics:")
        print(f"  Samples: {stats['count']}")
        print(f"  Average: {stats['avg_ms']:.1f}ms")
        print(f"  Min: {stats['min_ms']:.1f}ms")
        print(f"  Max: {stats['max_ms']:.1f}ms")
        print(f"  Std Dev: {stats['stdev_ms']:.1f}ms")
        print(f"\nPercentiles:")
        print(f"  p50: {stats['p50_ms']:.1f}ms")
        print(f"  p90: {stats['p90_ms']:.1f}ms")
        print(f"  p95: {stats['p95_ms']:.1f}ms <-- TARGET")
        print(f"  p99: {stats['p99_ms']:.1f}ms")

        print(f"\nTarget Check:")
        target = results.get("target_ms", 700)
        p95 = stats["p95_ms"]
        status = "PASS" if results.get("target_met") else "FAIL"
        print(f"  p95 ({p95:.1f}ms) < {target}ms: {status}")

    if results.get("errors"):
        print(f"\nErrors: {len(results['errors'])}")
        for err in results["errors"][:5]:
            print(f"  - Iteration {err['iteration']}: {err['error']}")

    if "manager_stats" in results:
        mstats = results["manager_stats"]
        print(f"\nManager Stats:")
        print(f"  Total Requests: {mstats.get('total_requests', 0)}")
        print(f"  Cache Hits: {mstats.get('cache_hits', 0)}")
        print(f"  Cache Hit Rate: {mstats.get('cache_hit_rate', 0):.1%}")

        if "query_cache" in mstats:
            qc = mstats["query_cache"]
            print(f"  Query Cache Size: {qc.get('size', 0)}/{qc.get('maxsize', 0)}")

    print("\n" + "=" * 60)


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="RAG Performance Benchmark")
    parser.add_argument(
        "--iterations", "-n",
        type=int,
        default=20,
        help="Number of benchmark iterations (default: 20)"
    )
    parser.add_argument(
        "--warmup", "-w",
        action="store_true",
        help="Run warmup before benchmark"
    )
    parser.add_argument(
        "--no-cache",
        action="store_true",
        help="Disable query result cache for benchmark"
    )
    parser.add_argument(
        "--quiet", "-q",
        action="store_true",
        help="Suppress progress logging"
    )

    args = parser.parse_args()

    if args.quiet:
        logging.getLogger().setLevel(logging.WARNING)

    results = await run_benchmark(
        iterations=args.iterations,
        warmup=args.warmup,
        use_cache=not args.no_cache
    )

    print_results(results)

    # Return exit code based on target
    sys.exit(0 if results.get("target_met", False) else 1)


if __name__ == "__main__":
    asyncio.run(main())
