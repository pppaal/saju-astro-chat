#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Phase 7 (CrossEncoder + HyDE) 통합 테스트

4가지 구성 비교:
1. Legacy (PyTorch O(n))
2. Phase 1+2 (ChromaDB + PageRank)
3. Phase 1+2+7a (+ CrossEncoder)
4. Phase 1+2+7 Full (+ CrossEncoder + HyDE)
"""

import os
import sys
import time
import json

# Fix Windows encoding
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.saju_astro_rag import GraphRAG


def test_configuration(config_name, use_chromadb, use_reranker, use_hyde):
    """특정 구성으로 테스트 실행."""
    print(f"\n{'='*70}")
    print(f" {config_name}")
    print(f"{'='*70}")

    # 환경변수 설정
    os.environ["USE_CHROMADB"] = "1" if use_chromadb else "0"
    os.environ["USE_RERANKER"] = "1" if use_reranker else "0"
    os.environ["USE_HYDE"] = "1" if use_hyde else "0"

    print(f"\n설정:")
    print(f"  USE_CHROMADB  = {os.environ['USE_CHROMADB']}")
    print(f"  USE_RERANKER  = {os.environ['USE_RERANKER']}")
    print(f"  USE_HYDE      = {os.environ['USE_HYDE']}")

    # GraphRAG 초기화
    print(f"\n[1/3] GraphRAG 초기화...")
    start = time.time()
    graph_rag = GraphRAG()
    init_time = time.time() - start
    print(f"  ✓ 초기화 완료 ({init_time:.2f}s)")

    # 테스트 쿼리
    test_queries = [
        {"query": "갑목과 임수의 궁합은?", "type": "compatibility"},
        {"query": "병화가 강한 사람의 성격", "type": "saju"},
        {"query": "목성 역행의 영향", "type": "astro"},
        {"query": "갑목 일간", "type": "saju"},  # 짧은 쿼리 (HyDE 테스트)
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
        backend = result.get("stats", {}).get("backend", "unknown")
        phases = result.get("stats", {}).get("phases", "unknown")

        print(f"  ✓ {matched_count} contexts, {elapsed_ms:.0f}ms")
        print(f"    backend={backend}, phases={phases}")

        # 상위 3개 결과 출력
        for j, node in enumerate(result.get("matched_nodes", [])[:3], 1):
            preview = node[:60] + "..." if len(node) > 60 else node
            print(f"    [{j}] {preview}")

        results.append({
            "question": question,
            "latency_ms": elapsed_ms,
            "contexts_count": matched_count,
            "backend": backend,
            "phases": phases,
        })

    # 통계
    print(f"\n[3/3] 성능 통계")
    print("-" * 70)
    avg_latency = sum(r["latency_ms"] for r in results) / len(results)
    avg_contexts = sum(r["contexts_count"] for r in results) / len(results)

    print(f"  평균 레이턴시  : {avg_latency:.0f}ms")
    print(f"  평균 contexts  : {avg_contexts:.1f}개")
    print(f"  백엔드         : {results[0]['backend']}")
    print(f"  활성 Phases    : {results[0]['phases']}")

    return {
        "config": config_name,
        "avg_latency_ms": avg_latency,
        "avg_contexts": avg_contexts,
        "results": results,
    }


def run_full_comparison():
    """전체 구성 비교."""
    print("\n" + "="*70)
    print(" Phase 7 (CrossEncoder + HyDE) 통합 테스트")
    print(" 4가지 구성 비교")
    print("="*70)

    configs = [
        ("1. Legacy (PyTorch O(n))", False, False, False),
        ("2. Phase 1+2 (ChromaDB + PageRank)", True, False, False),
        ("3. Phase 1+2+7a (+ CrossEncoder)", True, True, False),
        ("4. Phase 1+2+7 Full (+ CrossEncoder + HyDE)", True, True, True),
    ]

    all_results = []
    for config_name, chromadb, reranker, hyde in configs:
        result = test_configuration(config_name, chromadb, reranker, hyde)
        all_results.append(result)
        time.sleep(1)  # 다음 테스트 전 잠깐 대기

    # 최종 비교 리포트
    print("\n\n" + "="*70)
    print(" 📊 최종 비교 리포트")
    print("="*70)

    baseline = all_results[0]["avg_latency_ms"]

    print(f"\n⚡ 레이턴시 비교:")
    for r in all_results:
        improvement = ((baseline - r["avg_latency_ms"]) / baseline * 100) if baseline > 0 else 0
        print(f"  {r['config']}")
        print(f"    → {r['avg_latency_ms']:.0f}ms ({improvement:+.1f}% vs baseline)")

    print(f"\n📚 검색 결과:")
    for r in all_results:
        print(f"  {r['config']}")
        print(f"    → {r['avg_contexts']:.1f} contexts")

    # 결과 저장
    output_path = "data/phase7_comparison.json"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "results": all_results,
            "baseline_latency_ms": baseline,
        }, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 결과 저장: {output_path}")

    # Phase 7 효과 계산
    phase12 = all_results[1]["avg_latency_ms"]
    phase127 = all_results[3]["avg_latency_ms"]
    phase7_improvement = ((phase12 - phase127) / phase12 * 100) if phase12 > 0 else 0

    print(f"\n🎯 Phase 7 효과:")
    print(f"  Phase 1+2          : {phase12:.0f}ms")
    print(f"  Phase 1+2+7 (Full) : {phase127:.0f}ms")
    print(f"  Phase 7 추가 개선  : {phase7_improvement:+.1f}%")

    if phase7_improvement > 0:
        print(f"\n⚠️  Phase 7은 정확도는 향상시키지만 속도는 {-phase7_improvement:.1f}% 느려집니다.")
        print(f"   (CrossEncoder 연산 추가로 인한 trade-off)")
    else:
        print(f"\n✅ Phase 7 적용 권장!")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["full", "phase7-only"], default="full")
    args = parser.parse_args()

    if args.mode == "phase7-only":
        # Phase 1+2+7 Full만 테스트
        test_configuration("Phase 1+2+7 Full", True, True, True)
    else:
        # 전체 비교
        run_full_comparison()
