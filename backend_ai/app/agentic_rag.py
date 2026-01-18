# backend_ai/app/agentic_rag.py
"""
Backwards compatibility shim for agentic_rag module.

This module has been refactored into the agentic_rag/ package.
All imports are re-exported for backwards compatibility.

Package Structure:
- agentic_rag/
  - entity_extractor.py: EntityType, Entity, EntityExtractor
  - graph_traversal.py: TraversalPath, DeepGraphTraversal
  - agent/
    - state.py: AgentAction, AgentState, AgentNode
    - orchestrator.py: AgentOrchestrator
  - api.py: agentic_query, singletons
"""

# Re-export everything from the package
from .agentic_rag import (
    # Entity Extraction
    EntityType,
    Entity,
    EntityExtractor,
    # Graph Traversal
    TraversalPath,
    DeepGraphTraversal,
    HAS_GRAPH_RAG,
    HAS_NETWORKX,
    # Agent Workflow
    AgentAction,
    AgentState,
    AgentNode,
    AgentOrchestrator,
    # API Functions
    agentic_query,
    get_agent_orchestrator,
    get_entity_extractor,
    get_deep_traversal,
    HAS_LANGGRAPH,
)

__all__ = [
    # Entity Extraction
    "EntityType",
    "Entity",
    "EntityExtractor",
    # Graph Traversal
    "TraversalPath",
    "DeepGraphTraversal",
    "HAS_GRAPH_RAG",
    "HAS_NETWORKX",
    # Agent Workflow
    "AgentAction",
    "AgentState",
    "AgentNode",
    "AgentOrchestrator",
    # API Functions
    "agentic_query",
    "get_agent_orchestrator",
    "get_entity_extractor",
    "get_deep_traversal",
    "HAS_LANGGRAPH",
]


# ===============================================================
# TEST (preserved from original for backwards compatibility)
# ===============================================================
if __name__ == "__main__":
    print("=" * 60)
    print("Testing Agentic RAG System")
    print("=" * 60)

    # Test Entity Extraction
    print("\n[Test 1] Entity Extraction")
    extractor = EntityExtractor()

    test_texts = [
        "Jupiter in Sagittarius in the 9th house",
        "갑목 일간이 편관 칠살을 만나면",
        "태양이 사자자리에서 화성과 충",
        "역마살과 도화살이 동시에 있는 사주",
    ]

    for text in test_texts:
        entities = extractor.extract(text)
        print(f"\n  Query: {text}")
        print(f"  Entities: {[(e.normalized, e.type.value) for e in entities]}")

    # Test Deep Graph Traversal
    if HAS_GRAPH_RAG:
        print("\n[Test 2] Deep Graph Traversal")
        traversal = DeepGraphTraversal()

        paths = traversal.traverse(
            start_entities=["Jupiter", "목성"],
            max_depth=3,
            max_paths=3,
        )

        print(f"  Found {len(paths)} paths")
        for i, path in enumerate(paths[:3]):
            print(f"  Path {i+1}: {' → '.join(path.nodes[:5])}")

    # Test Full Agentic Query
    print("\n[Test 3] Full Agentic Query")
    result = agentic_query(
        query="목성이 사수자리에 있을 때 9하우스의 영향은?",
        facts={"birth": {"year": 1990, "month": 5, "day": 15}},
        locale="ko",
        theme="life_path",
    )

    print(f"  Status: {result['status']}")
    print(f"  Entities: {len(result['entities'])}")
    print(f"  Paths: {len(result['traversal_paths'])}")
    print(f"  Confidence: {result['confidence']:.2f}")
    print(f"  Context length: {len(result['context'])}")

    print("\n" + "=" * 60)
    print("Agentic RAG Test Complete!")
    print("=" * 60)
