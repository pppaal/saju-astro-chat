#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Test script for Agentic RAG features."""

import sys
import os
import io

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Ensure proper path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("=" * 60)
print("Testing Agentic RAG System")
print("=" * 60)

# Test 1: Entity Extraction
print("\n[Test 1] Entity Extraction (NER)")
print("-" * 40)

try:
    from agentic_rag import EntityExtractor

    extractor = EntityExtractor()

    test_texts = [
        "Jupiter in Sagittarius in the 9th house",
        "목성이 사수자리 9하우스",
        "태양 사자자리 화성 충",
        "갑목 일간 편관",
        "역마살 도화살",
    ]

    for text in test_texts:
        entities = extractor.extract(text)
        print(f"Query: {text}")
        if entities:
            for e in entities:
                print(f"  - {e.normalized} ({e.type.value})")
        else:
            print("  (no entities found)")
        print()

    print("[Test 1] PASSED - Entity extraction working")

except Exception as e:
    print(f"[Test 1] FAILED: {e}")
    import traceback
    traceback.print_exc()

# Test 2: Deep Graph Traversal
print("\n[Test 2] Deep Graph Traversal")
print("-" * 40)

try:
    from agentic_rag import get_deep_traversal

    traversal = get_deep_traversal()

    if traversal:
        paths = traversal.traverse(
            start_entities=["Jupiter", "목성"],
            max_depth=2,
            max_paths=3,
        )

        print(f"Found {len(paths)} paths")
        for i, path in enumerate(paths[:3]):
            print(f"  Path {i+1}: {' -> '.join(path.nodes[:5])}")

        print("[Test 2] PASSED - Deep traversal working")
    else:
        print("[Test 2] SKIPPED - GraphRAG not available")

except Exception as e:
    print(f"[Test 2] FAILED: {e}")
    import traceback
    traceback.print_exc()

# Test 3: Full Agentic Query
print("\n[Test 3] Full Agentic Query")
print("-" * 40)

try:
    from agentic_rag import agentic_query

    result = agentic_query(
        query="목성이 사수자리에 있을 때",
        facts={"birth": {"year": 1990, "month": 5, "day": 15}},
        locale="ko",
        theme="life_path",
    )

    print(f"Status: {result['status']}")
    print(f"Entities: {len(result.get('entities', []))}")
    print(f"Paths: {len(result.get('traversal_paths', []))}")
    print(f"Graph Results: {len(result.get('graph_results', []))}")
    print(f"Confidence: {result.get('confidence', 0):.2f}")

    if result.get('entities'):
        print("\nExtracted Entities:")
        for e in result['entities'][:5]:
            print(f"  - {e['normalized']} ({e['type']})")

    print("[Test 3] PASSED - Full agentic query working")

except Exception as e:
    print(f"[Test 3] FAILED: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("Test Complete!")
print("=" * 60)
