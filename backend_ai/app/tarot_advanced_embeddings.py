# backend_ai/app/tarot_advanced_embeddings.py
"""
Tarot Advanced Rules Embedding System - Backward Compatibility Shim
===================================================================
This module has been refactored into the tarot_embeddings/ package.
All functionality is now in:
- tarot_embeddings/search_methods.py: Search functionality
- tarot_embeddings/cache_methods.py: Cache and export/import
- tarot_embeddings/status_methods.py: Status and benchmark

This file provides backward compatibility for existing imports.
"""

# Import everything from the new package for backward compatibility
from .tarot_embeddings import (
    TarotAdvancedEmbeddings,
    get_tarot_advanced_embeddings,
    SearchMethodsMixin,
    CacheMethodsMixin,
    StatusMethodsMixin,
)

# Re-export for backward compatibility
__all__ = [
    "TarotAdvancedEmbeddings",
    "get_tarot_advanced_embeddings",
    "SearchMethodsMixin",
    "CacheMethodsMixin",
    "StatusMethodsMixin",
]


# ===============================================================
# TEST (v3.0)
# ===============================================================
if __name__ == "__main__":
    import sys
    if sys.platform == 'win32':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')

    print("=" * 70)
    print("[TAROT ADVANCED EMBEDDINGS TEST - v3.0 Enterprise]")
    print("=" * 70)

    embedder = get_tarot_advanced_embeddings()

    # System Status
    print("\n[System Status]")
    status = embedder.get_status()
    print(f"  Version: {status['version']}")
    print(f"  Device: {status['device']}")
    print(f"  Model: {status['model_name']}")
    print(f"  Entries: {status['total_entries']}")
    print(f"  Embeddings: {status['embeddings_shape']}")

    # Health Check
    print("\n[Health Check]")
    healthy, msg = embedder.health_check()
    print(f"  {msg}")

    # Test search
    print("\n[Search: 연애 타이밍]")
    results = embedder.search("연애 언제 시작될까 타이밍", top_k=5)
    for r in results:
        print(f"  [{r['category']}] {r['text'][:60]}... (score: {r['score']:.3f})")

    print("\n[Search: 소울메이트]")
    results = embedder.search("소울메이트 트윈플레임 인연", top_k=5)
    for r in results:
        print(f"  [{r['category']}] {r['text'][:60]}... (score: {r['score']:.3f})")

    # Batch search test
    print("\n[Batch Search Test]")
    batch_queries = ["연애 운세", "재물 운", "건강 조언"]
    batch_results = embedder.search_batch(batch_queries, top_k=2)
    for i, (q, res) in enumerate(zip(batch_queries, batch_results)):
        print(f"  Query: {q}")
        for r in res:
            print(f"    -> {r['text'][:50]}... ({r['score']:.3f})")

    # Hybrid search test
    print("\n[Hybrid Search Test]")
    hybrid_results = embedder.search_hybrid("차크라 에너지 치유", top_k=3)
    for r in hybrid_results:
        print(f"  [{r['category']}] {r['text'][:50]}...")
        print(f"    semantic: {r.get('semantic_score', 0):.3f}, keyword: {r.get('keyword_score', 0):.3f}")

    # Metrics
    print("\n[Search Metrics]")
    metrics = embedder.get_metrics()
    print(f"  Total searches: {metrics['total_searches']}")
    print(f"  Batch searches: {metrics['total_batch_searches']}")
    print(f"  Hybrid searches: {metrics['total_hybrid_searches']}")
    print(f"  Cache hit rate: {metrics['cache_hit_rate']:.2%}")
    print(f"  Avg latency: {metrics['avg_latency_ms']:.2f}ms")

    # Category stats
    print("\n[Category Summary]")
    for cat, count in embedder.get_categories_summary().items():
        print(f"  {cat}: {count} entries")

    # Quick benchmark (small scale)
    print("\n[Quick Benchmark]")
    bench = embedder.benchmark(iterations=3, include_hybrid=False)
    print(f"  Single search avg: {bench['benchmarks']['single_search']['avg_ms']:.1f}ms")
    print(f"  Batch search avg: {bench['benchmarks']['batch_search']['avg_ms']:.1f}ms")
    print(f"  Throughput: {bench['throughput']['single_qps']:.0f} queries/sec")

    print("\n" + "=" * 70)
    print(f"[COMPLETE: {len(embedder.entries)} entries on {status['device']}]")
    print("=" * 70)
