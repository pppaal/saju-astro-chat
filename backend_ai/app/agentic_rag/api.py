# backend_ai/app/agentic_rag/api.py
"""
API functions and singleton factories for Agentic RAG.
Main entry points for the enhanced RAG system.
"""

from typing import Dict, Optional
from dataclasses import asdict

from .entity_extractor import EntityExtractor
from .graph_traversal import DeepGraphTraversal, HAS_GRAPH_RAG
from .agent import AgentOrchestrator

# Optional: Check for LangGraph
try:
    from langgraph.graph import StateGraph, END
    HAS_LANGGRAPH = True
except ImportError:
    HAS_LANGGRAPH = False


def agentic_query(
    query: str,
    facts: Dict = None,
    locale: str = "ko",
    theme: str = "life_path",
    use_deep_traversal: bool = True,
    use_ner: bool = True,
) -> Dict:
    """
    Execute agentic RAG query with all next-level features.

    This is the main entry point for the enhanced RAG system.

    Args:
        query: User query
        facts: Saju/Astrology facts dict
        locale: Language (ko/en)
        theme: Fortune theme
        use_deep_traversal: Enable multi-hop graph traversal
        use_ner: Enable NER entity extraction

    Returns:
        Dict with context, entities, paths, and reasoning steps
    """
    orchestrator = AgentOrchestrator()
    state = orchestrator.run(query, facts, locale, theme)

    return {
        "status": "success" if state.completed and not state.error else "error",
        "context": state.context,
        "entities": [asdict(e) for e in state.entities],
        "traversal_paths": [
            {
                "nodes": p.nodes,
                "edges": p.edges,
                "context": p.context,
                "weight": p.total_weight,
            }
            for p in state.traversal_paths
        ],
        "graph_results": state.graph_results,
        "reasoning_steps": state.reasoning_steps,
        "confidence": state.confidence,
        "error": state.error,
        "stats": {
            "entities_count": len(state.entities),
            "paths_count": len(state.traversal_paths),
            "graph_results_count": len(state.graph_results),
            "reasoning_steps_count": len(state.reasoning_steps),
            "has_langgraph": HAS_LANGGRAPH,
            "has_graph_rag": HAS_GRAPH_RAG,
        },
    }


# ===============================================================
# SINGLETON & FACTORY
# ===============================================================

_orchestrator_instance: Optional[AgentOrchestrator] = None
_entity_extractor_instance: Optional[EntityExtractor] = None
_deep_traversal_instance: Optional[DeepGraphTraversal] = None


def get_agent_orchestrator() -> AgentOrchestrator:
    """Get or create singleton AgentOrchestrator."""
    global _orchestrator_instance
    if _orchestrator_instance is None:
        _orchestrator_instance = AgentOrchestrator()
    return _orchestrator_instance


def get_entity_extractor() -> EntityExtractor:
    """Get or create singleton EntityExtractor."""
    global _entity_extractor_instance
    if _entity_extractor_instance is None:
        _entity_extractor_instance = EntityExtractor()
    return _entity_extractor_instance


def get_deep_traversal() -> Optional[DeepGraphTraversal]:
    """Get or create singleton DeepGraphTraversal."""
    global _deep_traversal_instance
    if _deep_traversal_instance is None and HAS_GRAPH_RAG:
        _deep_traversal_instance = DeepGraphTraversal()
    return _deep_traversal_instance
