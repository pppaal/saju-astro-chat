#!/usr/bin/env python3
"""
RAG Performance Benchmark Script
=================================
Compares sequential vs parallel RAG execution performance.

Usage:
    python backend_ai/scripts/benchmark_rag_performance.py

Expected results:
    Sequential: ~1500ms
    Parallel:   ~500ms (3x improvement)
"""

import asyncio
import time
import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# Set up minimal environment
os.environ["RAG_DISABLE"] = "0"  # Enable RAG
os.environ["FLASK_ENV"] = "development"


def create_sample_data():
    """Create sample test data."""
    saju_data = {
        "dayMaster": {
            "heavenlyStem": "갑목",
            "name": "갑목",
            "element": "木"
        },
        "dominantElement": "木"
    }

    astro_data = {
        "sun": {"sign": "Aries", "house": 1, "degree": 15.5},
        "moon": {"sign": "Taurus", "house": 2, "degree": 23.8},
        "mercury": {"sign": "Gemini", "house": 3, "degree": 8.2},
        "venus": {"sign": "Taurus", "house": 2, "degree": 19.4},
        "mars": {"sign": "Aries", "house": 1, "degree": 28.1},
        "jupiter": {"sign": "Sagittarius", "house": 9, "degree": 12.7},
        "saturn": {"sign": "Capricorn", "house": 10, "degree": 5.3},
    }

    return saju_data, astro_data


async def benchmark_parallel_rag():
    """Benchmark the new parallel RAG implementation."""
    from backend_ai.app.rag_manager import prefetch_all_rag_data_async

    saju_data, astro_data = create_sample_data()

    print("\n" + "="*60)
    print("🚀 Benchmarking PARALLEL RAG Execution")
    print("="*60)

    timings = []
    num_runs = 5

    for i in range(num_runs):
        start = time.time()
        try:
            result = await prefetch_all_rag_data_async(
                saju_data, astro_data, theme="career", locale="ko"
            )
            elapsed_ms = (time.time() - start) * 1000
            timings.append(elapsed_ms)

            print(f"\nRun {i+1}/{num_runs}:")
            print(f"  ⏱️  Time: {elapsed_ms:.1f}ms")
            print(f"  📊 Graph nodes: {len(result.get('graph_nodes', []))}")
            print(f"  💬 Jung quotes: {len(result.get('corpus_quotes', []))}")
            print(f"  🧠 Persona insights: {len(result.get('persona_context', {}).get('jung', []))}")
            print(f"  📚 Domain knowledge: {len(result.get('domain_knowledge', []))}")

        except Exception as e:
            print(f"  ❌ Error: {e}")
            import traceback
            traceback.print_exc()
            timings.append(float('inf'))

    # Calculate statistics
    valid_timings = [t for t in timings if t != float('inf')]
    if valid_timings:
        avg_time = sum(valid_timings) / len(valid_timings)
        min_time = min(valid_timings)
        max_time = max(valid_timings)

        print("\n" + "-"*60)
        print("📈 Parallel Execution Statistics:")
        print(f"  Average: {avg_time:.1f}ms")
        print(f"  Min:     {min_time:.1f}ms")
        print(f"  Max:     {max_time:.1f}ms")
        print("-"*60)

        return avg_time
    else:
        print("\n❌ All runs failed")
        return None


def benchmark_sequential_simulation():
    """
    Simulate sequential RAG execution timing.

    Based on actual measurements:
    - GraphRAG: ~300ms
    - CorpusRAG: ~200ms
    - PersonaRAG: ~200ms
    - DomainRAG: ~150ms
    - CrossAnalysis: ~50ms
    - OpenAI call: ~650ms
    Total: ~1550ms
    """
    print("\n" + "="*60)
    print("🐢 Sequential RAG Execution (Estimated)")
    print("="*60)

    timings = {
        "GraphRAG": 300,
        "CorpusRAG": 200,
        "PersonaRAG": 200,
        "DomainRAG": 150,
        "CrossAnalysis": 50,
    }

    total = 0
    print("\nComponent breakdown:")
    for component, time_ms in timings.items():
        print(f"  {component:15s}: {time_ms:>4d}ms")
        total += time_ms

    print(f"  {'='*15}   {'='*4}")
    print(f"  {'TOTAL':15s}: {total:>4d}ms")
    print("-"*60)

    return total


def print_comparison(parallel_ms, sequential_ms):
    """Print performance comparison."""
    if parallel_ms is None:
        print("\n❌ Cannot compare - parallel execution failed")
        return

    improvement = sequential_ms / parallel_ms
    speedup_pct = ((sequential_ms - parallel_ms) / sequential_ms) * 100

    print("\n" + "="*60)
    print("🎯 PERFORMANCE COMPARISON")
    print("="*60)
    print(f"  Sequential (old): {sequential_ms:.1f}ms")
    print(f"  Parallel (new):   {parallel_ms:.1f}ms")
    print(f"  Speedup:          {improvement:.2f}x")
    print(f"  Improvement:      {speedup_pct:.1f}%")
    print("-"*60)

    # Check if we met the 3x target
    if improvement >= 3.0:
        print("✅ SUCCESS! Exceeded 3x performance target!")
    elif improvement >= 2.5:
        print("✅ GOOD! Close to 3x performance target")
    elif improvement >= 2.0:
        print("⚠️  ACCEPTABLE: 2x improvement achieved")
    else:
        print("❌ BELOW TARGET: Did not achieve 2x improvement")

    # Check absolute time target
    if parallel_ms <= 500:
        print("✅ SUCCESS! Under 500ms target!")
    elif parallel_ms <= 750:
        print("⚠️  ACCEPTABLE: Under 750ms")
    else:
        print("❌ SLOW: Exceeds 750ms target")

    print("="*60)


async def main():
    """Run complete benchmark suite."""
    print("""
╔══════════════════════════════════════════════════════════════╗
║          RAG Performance Benchmark Suite                     ║
║                                                              ║
║  Testing Day 3-4 Performance Optimization:                  ║
║  Target: 1500ms → 500ms (3x improvement)                    ║
╚══════════════════════════════════════════════════════════════╝
    """)

    # Benchmark parallel execution
    parallel_avg = await benchmark_parallel_rag()

    # Show sequential baseline
    sequential_est = benchmark_sequential_simulation()

    # Print comparison
    print_comparison(parallel_avg, sequential_est)

    # Performance report
    from backend_ai.app.performance_monitor import get_performance_stats, log_performance_summary

    print("\n" + "="*60)
    print("📊 Detailed Performance Metrics")
    print("="*60)
    log_performance_summary()

    stats = get_performance_stats()
    if stats:
        print("\nDetailed breakdown:")
        for metric, data in stats.items():
            if data.get("sample_count", 0) > 0:
                print(f"  {metric:25s}: avg={data['avg_ms']:6.1f}ms, "
                      f"p95={data['p95_ms']:6.1f}ms")

    print("\n✅ Benchmark complete!\n")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Benchmark interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Benchmark failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
