# backend_ai/app/agentic_rag/__init__.py
"""
Agentic RAG System - Next Level Features
==========================================
Implements advanced AI agent capabilities for Oracle AI system.

Features:
1. LangGraph-style Agentic Workflow - Multi-step reasoning with state management
2. Deep Graph Traversal - Multi-hop queries (Jupiter → Sagittarius → 9th House → Philosophy)
3. Auto Entity Extraction - NER for dynamic graph building from user queries

Architecture:
- AgentState: Maintains conversation state across reasoning steps
- AgentNode: Individual reasoning nodes (Analyze, Search, Traverse, Synthesize)
- AgentOrchestrator: Manages agent execution flow (LangGraph-style)
- DeepGraphTraversal: Multi-hop graph exploration
- EntityExtractor: NER-based entity recognition for astrology/saju domains

Package Structure:
- entity_extractor.py: EntityType, Entity, EntityExtractor
- graph_traversal.py: TraversalPath, DeepGraphTraversal
- agent/: Agent state and orchestrator
  - state.py: AgentAction, AgentState, AgentNode
  - orchestrator.py: AgentOrchestrator
- api.py: agentic_query and singleton factories
"""

# Entity Extraction
from .entity_extractor import (
    EntityType,
    Entity,
    EntityExtractor,
)

# Graph Traversal
from .graph_traversal import (
    TraversalPath,
    DeepGraphTraversal,
    HAS_GRAPH_RAG,
    HAS_NETWORKX,
)

# Agent Workflow
from .agent import (
    AgentAction,
    AgentState,
    AgentNode,
    AgentOrchestrator,
)

# API Functions
from .api import (
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
