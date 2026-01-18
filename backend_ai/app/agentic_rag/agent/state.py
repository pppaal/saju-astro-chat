# backend_ai/app/agentic_rag/agent/state.py
"""
Agent state management for agentic workflow.
Contains AgentAction enum, AgentState dataclass, and AgentNode class.
"""

from typing import Dict, List, Optional, Tuple, Callable, Any
from dataclasses import dataclass, field
from enum import Enum


class AgentAction(Enum):
    """Agent actions for workflow control."""
    ANALYZE = "analyze"
    EXTRACT_ENTITIES = "extract_entities"
    SEARCH_GRAPH = "search_graph"
    DEEP_TRAVERSE = "deep_traverse"
    SYNTHESIZE = "synthesize"
    COMPLETE = "complete"


@dataclass
class AgentState:
    """
    State maintained across agent reasoning steps.
    (LangGraph-style state management)
    """
    # Input
    query: str
    facts: Dict = field(default_factory=dict)
    locale: str = "ko"
    theme: str = "life_path"

    # Extracted entities (stored as list of dicts for JSON serialization)
    entities: List[Any] = field(default_factory=list)
    relations: List[Tuple] = field(default_factory=list)

    # Search results
    graph_results: List[Dict] = field(default_factory=list)
    traversal_paths: List[Any] = field(default_factory=list)

    # Reasoning steps
    reasoning_steps: List[Dict] = field(default_factory=list)
    current_action: AgentAction = AgentAction.ANALYZE

    # Output
    context: str = ""
    confidence: float = 0.0
    completed: bool = False
    error: Optional[str] = None


class AgentNode:
    """
    Individual agent node for workflow execution.
    Each node performs a specific reasoning task.
    """

    def __init__(self, name: str, action: Callable[[AgentState], AgentState]):
        self.name = name
        self.action = action

    def __call__(self, state: AgentState) -> AgentState:
        """Execute node action."""
        return self.action(state)
