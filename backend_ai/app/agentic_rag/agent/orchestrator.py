# backend_ai/app/agentic_rag/agent/orchestrator.py
"""
LangGraph-style Agent Orchestrator for multi-step reasoning.
Manages agent execution flow with workflow control.
"""

import json
from datetime import datetime
from typing import Dict, Optional

from .state import AgentAction, AgentState, AgentNode
from ..entity_extractor import EntityExtractor
from ..graph_traversal import DeepGraphTraversal

# Phase 3: 개선된 엔티티 추출기 (fallback: 기존 EntityExtractor)
try:
    from ..llm_entity_extractor import LLMEntityExtractor
    _HAS_LLM_EXTRACTOR = True
except ImportError:
    _HAS_LLM_EXTRACTOR = False

# Phase 4: 계층적 커뮤니티 요약 (fallback: 사용 안함)
try:
    from app.rag.community_summarizer import (
        HierarchicalSummarizer,
        get_hierarchical_summarizer,
        USE_COMMUNITY_SUMMARY,
    )
    _HAS_SUMMARIZER = True
except ImportError:
    _HAS_SUMMARIZER = False
    USE_COMMUNITY_SUMMARY = False

# Optional: Try to import GraphRAG
try:
    from saju_astro_rag import get_graph_rag, search_graphs
    HAS_GRAPH_RAG = True
except ImportError:
    HAS_GRAPH_RAG = False


class AgentOrchestrator:
    """
    LangGraph-style Agent Orchestrator for multi-step reasoning.

    Workflow:
    1. ANALYZE: Understand user query intent
    2. EXTRACT_ENTITIES: NER-based entity extraction
    3. SEARCH_GRAPH: Vector similarity search
    4. DEEP_TRAVERSE: Multi-hop graph traversal
    5. SYNTHESIZE: Combine results into coherent context
    6. COMPLETE: Finalize output

    Supports:
    - Conditional branching based on state
    - Iterative refinement
    - Error recovery
    - Lazy loading for performance
    """

    def __init__(self, lazy_load: bool = True):
        if _HAS_LLM_EXTRACTOR:
            self.entity_extractor = LLMEntityExtractor()
        else:
            self.entity_extractor = EntityExtractor()
        self._lazy_load = lazy_load
        self._deep_traversal = None
        self._graph_rag = None

        # Only eager load if lazy_load is False
        if not lazy_load and HAS_GRAPH_RAG:
            self._graph_rag = get_graph_rag()
            self._deep_traversal = DeepGraphTraversal()

    @property
    def deep_traversal(self) -> Optional[DeepGraphTraversal]:
        """Lazy load DeepGraphTraversal on first access."""
        if self._deep_traversal is None and HAS_GRAPH_RAG:
            self._deep_traversal = DeepGraphTraversal()
        return self._deep_traversal

    @property
    def graph_rag(self):
        """Lazy load GraphRAG on first access."""
        if self._graph_rag is None and HAS_GRAPH_RAG:
            self._graph_rag = get_graph_rag()
        return self._graph_rag

    def _get_nodes(self):
        """Get workflow nodes (lazy initialization)."""
        return {
            AgentAction.ANALYZE: AgentNode("Analyze", self._analyze),
            AgentAction.EXTRACT_ENTITIES: AgentNode("ExtractEntities", self._extract_entities),
            AgentAction.SEARCH_GRAPH: AgentNode("SearchGraph", self._search_graph),
            AgentAction.DEEP_TRAVERSE: AgentNode("DeepTraverse", self._deep_traverse),
            AgentAction.SYNTHESIZE: AgentNode("Synthesize", self._synthesize),
            AgentAction.COMPLETE: AgentNode("Complete", self._complete),
        }

    def _get_transitions(self):
        """Get workflow transitions."""
        return {
            AgentAction.ANALYZE: AgentAction.EXTRACT_ENTITIES,
            AgentAction.EXTRACT_ENTITIES: AgentAction.SEARCH_GRAPH,
            AgentAction.SEARCH_GRAPH: AgentAction.DEEP_TRAVERSE,
            AgentAction.DEEP_TRAVERSE: AgentAction.SYNTHESIZE,
            AgentAction.SYNTHESIZE: AgentAction.COMPLETE,
            AgentAction.COMPLETE: None,
        }

    def run(self, query: str, facts: Dict = None, locale: str = "ko", theme: str = "life_path") -> AgentState:
        """
        Execute the full agent workflow.

        Args:
            query: User query
            facts: Additional context facts
            locale: Language (ko/en)
            theme: Fortune theme

        Returns:
            Final AgentState with all results
        """
        state = AgentState(
            query=query,
            facts=facts or {},
            locale=locale,
            theme=theme,
        )

        # Execute workflow
        max_steps = 10
        step = 0
        nodes = self._get_nodes()
        transitions = self._get_transitions()

        while state.current_action and step < max_steps:
            try:
                # Get current node
                node = nodes.get(state.current_action)
                if not node:
                    break

                # Execute node
                state = node(state)

                # Log reasoning step
                state.reasoning_steps.append({
                    "step": step,
                    "action": state.current_action.value,
                    "timestamp": datetime.utcnow().isoformat(),
                })

                # Get next action
                next_action = transitions.get(state.current_action)
                state.current_action = next_action

                step += 1

            except Exception as e:
                state.error = str(e)
                state.completed = True
                break

        return state

    def _analyze(self, state: AgentState) -> AgentState:
        """Analyze user query to understand intent."""
        query = state.query
        facts = state.facts

        # Determine query complexity
        query_length = len(query)
        has_birth_data = bool(facts.get("birth") or facts.get("saju"))
        has_transit_data = bool(facts.get("transit") or facts.get("astro"))

        state.reasoning_steps.append({
            "analysis": {
                "query_length": query_length,
                "has_birth_data": has_birth_data,
                "has_transit_data": has_transit_data,
                "locale": state.locale,
                "theme": state.theme,
            }
        })

        return state

    def _extract_entities(self, state: AgentState) -> AgentState:
        """Extract entities from query using NER."""
        # Extract from query
        entities = self.entity_extractor.extract(state.query)

        # Also extract from facts
        facts_str = json.dumps(state.facts, ensure_ascii=False)
        entities.extend(self.entity_extractor.extract(facts_str))

        # Deduplicate
        seen = set()
        unique_entities = []
        for e in entities:
            if e.normalized not in seen:
                unique_entities.append(e)
                seen.add(e.normalized)

        state.entities = unique_entities

        # Extract relations
        state.relations = self.entity_extractor.extract_relations(state.query)

        state.reasoning_steps.append({
            "entities_extracted": len(unique_entities),
            "relations_found": len(state.relations),
            "entity_types": list(set(e.type.value for e in unique_entities)),
        })

        return state

    def _search_graph(self, state: AgentState) -> AgentState:
        """Search knowledge graph using entities."""
        if not self.graph_rag or not HAS_GRAPH_RAG:
            return state

        # Search using query and facts
        search_query = f"{state.query} {json.dumps(state.facts, ensure_ascii=False)}"

        # Vector search
        results = search_graphs(search_query, top_k=10)
        state.graph_results = results

        state.reasoning_steps.append({
            "graph_search": {
                "query": search_query[:100],
                "results_count": len(results),
            }
        })

        return state

    def _deep_traverse(self, state: AgentState) -> AgentState:
        """Perform multi-hop graph traversal."""
        if not self.deep_traversal:
            return state

        # Get start entities from extracted entities
        start_entities = [e.normalized for e in state.entities]

        if not start_entities:
            return state

        # Traverse graph
        paths = self.deep_traversal.traverse(
            start_entities=start_entities,
            max_depth=3,
            max_paths=5,
        )

        state.traversal_paths = paths

        state.reasoning_steps.append({
            "deep_traverse": {
                "start_entities": start_entities[:5],
                "paths_found": len(paths),
                "max_path_length": max(len(p.nodes) for p in paths) if paths else 0,
            }
        })

        return state

    def _synthesize(self, state: AgentState) -> AgentState:
        """Synthesize all results into coherent context."""
        context_parts = []

        # Phase 4: 계층적 커뮤니티 요약 (최상위에 배치 → 큰 그림 먼저)
        hierarchical_context = ""
        if _HAS_SUMMARIZER and USE_COMMUNITY_SUMMARY:
            try:
                summarizer = get_hierarchical_summarizer()
                relevant = summarizer.get_relevant_summaries(state.query, top_k=3)
                if relevant:
                    hierarchical_context = summarizer.format_hierarchical_context(relevant)
                    context_parts.append(hierarchical_context)
            except Exception:
                pass

        # Add entity summary
        if state.entities:
            entity_summary = ", ".join(f"{e.normalized}({e.type.value})" for e in state.entities[:10])
            context_parts.append(f"[Extracted Entities]\n{entity_summary}")

        # Add graph search results
        if state.graph_results:
            graph_context = "\n".join(
                f"• {r.get('label', '?')}: {r.get('description', '')[:100]}"
                for r in state.graph_results[:5]
            )
            context_parts.append(f"\n[Knowledge Graph Results]\n{graph_context}")

        # Add traversal paths
        if state.traversal_paths:
            path_contexts = []
            for path in state.traversal_paths[:3]:
                if path.context:
                    path_contexts.append(path.context)
                else:
                    path_str = " → ".join(path.nodes)
                    path_contexts.append(path_str)

            context_parts.append(f"\n[Deep Graph Paths]\n" + "\n---\n".join(path_contexts))

        # Combine all context
        state.context = "\n\n".join(context_parts)

        # Calculate confidence
        has_summary = bool(hierarchical_context)
        confidence_factors = [
            0.2 if state.entities else 0.0,
            0.25 if state.graph_results else 0.0,
            0.35 if state.traversal_paths else 0.0,
            0.2 if has_summary else 0.0,
        ]
        state.confidence = sum(confidence_factors)

        state.reasoning_steps.append({
            "synthesis": {
                "context_length": len(state.context),
                "confidence": state.confidence,
            }
        })

        return state

    def _complete(self, state: AgentState) -> AgentState:
        """Mark workflow as complete."""
        state.completed = True
        return state
