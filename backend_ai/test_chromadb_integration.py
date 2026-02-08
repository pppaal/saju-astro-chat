#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ChromaDB + PageRank Integration Test

Before/After Comparison:
- Before: PyTorch O(n) linear search
- After: ChromaDB O(log n) HNSW + PageRank re-ranking
"""

import os
import sys
import time
import json

# Fix Windows console encoding
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())

# 프로젝트 루트 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.saju_astro_rag import GraphRAG

def test_query(use_chromadb: bool = False):
    """GraphRAG 쿼리 테스트."""
    print("=" * 70)
    print(f"테스트 모드: {'ChromaDB + PageRank' if use_chromadb else 'Legacy PyTorch'}")
    print("=" * 70)

    # 환경변수 설정
    os.environ["USE_CHROMADB"] = "1" if use_chromadb else "0"

    # GraphRAG 초기화
    print("\n[1/3] GraphRAG 초기화 중...")
    start = time.time()
    graph_rag = GraphRAG()
    init_time = time.time() - start
    print(f"✓ 초기화 완료 ({init_time:.2f}s)")
    print(f"  - 노드: {len(graph_rag.node_ids)}")
    print(f"  - 그래프 엣지: {graph_rag.graph.number_of_edges()}")

    # 테스트 쿼리
    test_queries = [
        {"query": "갑목 일간 성격", "type": "saju"},
        {"query": "임수와 갑목 궁합", "type": "compatibility"},
        {"query": "병화가 강한 사람", "type": "saju"},
    ]

    print(f"\n[2/3] 쿼리 테스트 ({len(test_queries)}개)")
    print("-" * 70)

    results = []
    for i, query_data in enumerate(test_queries, 1):
        question = query_data["query"]
        print(f"\n질문 {i}: {question}")

        start = time.time()
        result = graph_rag.query(
            {"query": question, "type": query_data["type"]},
            top_k=8,
            domain_priority="saju"
        )
        elapsed_ms = (time.time() - start) * 1000

        matched_count = len(result.get("matched_nodes", []))
        backend = result.get("stats", {}).get("backend", "legacy")

        print(f"  ✓ {matched_count} contexts, {elapsed_ms:.0f}ms, backend={backend}")

        # 상위 3개 결과 출력
        for j, node in enumerate(result.get("matched_nodes", [])[:3], 1):
            preview = node[:80] + "..." if len(node) > 80 else node
            print(f"    [{j}] {preview}")

        results.append({
            "question": question,
            "latency_ms": elapsed_ms,
            "contexts_count": matched_count,
            "backend": backend,
        })

    # 통계
    print(f"\n[3/3] 성능 통계")
    print("-" * 70)
    avg_latency = sum(r["latency_ms"] for r in results) / len(results)
    avg_contexts = sum(r["contexts_count"] for r in results) / len(results)

    print(f"  평균 레이턴시  : {avg_latency:.0f}ms")
    print(f"  평균 contexts  : {avg_contexts:.1f}개")
    print(f"  백엔드         : {results[0]['backend']}")

    return {
        "mode": "chromadb" if use_chromadb else "legacy",
        "avg_latency_ms": avg_latency,
        "avg_contexts": avg_contexts,
        "results": results,
    }


def run_comparison():
    """Before/After 비교 실행."""
    print("\n" + "=" * 70)
    print(" ChromaDB + PageRank 통합 테스트 - Before/After 비교")
    print("=" * 70)

    # Before (Legacy)
    print("\n\n[BEFORE] Legacy PyTorch O(n) 검색")
    before = test_query(use_chromadb=False)

    # After (ChromaDB + PageRank)
    print("\n\n[AFTER] ChromaDB O(log n) + PageRank")
    after = test_query(use_chromadb=True)

    # 비교 리포트
    print("\n\n" + "=" * 70)
    print(" 📊 최종 비교 리포트")
    print("=" * 70)

    latency_improvement = ((before["avg_latency_ms"] - after["avg_latency_ms"])
                          / before["avg_latency_ms"] * 100)

    print(f"\n⚡ 성능 개선:")
    print(f"  Before: {before['avg_latency_ms']:.0f}ms")
    print(f"  After : {after['avg_latency_ms']:.0f}ms")
    print(f"  개선율: {latency_improvement:+.1f}%")

    print(f"\n📚 검색 결과:")
    print(f"  Before: {before['avg_contexts']:.1f} contexts")
    print(f"  After : {after['avg_contexts']:.1f} contexts")

    # 결과 저장
    output_path = "data/chromadb_comparison.json"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "before": before,
            "after": after,
            "improvement_pct": latency_improvement,
        }, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 결과 저장: {output_path}")

    # 성공 여부 판정
    if latency_improvement > 0:
        print(f"\n🎉 SUCCESS: {latency_improvement:.1f}% 성능 향상!")
    else:
        print(f"\n⚠️  WARNING: 성능이 {-latency_improvement:.1f}% 저하되었습니다.")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["legacy", "chromadb", "compare"],
                       default="compare", help="테스트 모드")
    args = parser.parse_args()

    if args.mode == "compare":
        run_comparison()
    elif args.mode == "chromadb":
        test_query(use_chromadb=True)
    else:
        test_query(use_chromadb=False)
