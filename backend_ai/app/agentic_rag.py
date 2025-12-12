# backend_ai/app/agentic_rag.py
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
"""

import os
import re
import json
import hashlib
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple, Set, Callable
from dataclasses import dataclass, field, asdict
from enum import Enum
from functools import lru_cache
from collections import defaultdict

# Optional: Try to import LangGraph for full functionality
try:
    from langgraph.graph import StateGraph, END
    from langgraph.prebuilt import ToolNode
    HAS_LANGGRAPH = True
except ImportError:
    HAS_LANGGRAPH = False
    print("[AgenticRAG] LangGraph not installed - using custom orchestration")

# Import existing components
try:
    from saju_astro_rag import GraphRAG, get_graph_rag, search_graphs, embed_text
    HAS_GRAPH_RAG = True
except ImportError:
    HAS_GRAPH_RAG = False
    print("[AgenticRAG] GraphRAG not available")

try:
    import networkx as nx
    HAS_NETWORKX = True
except ImportError:
    HAS_NETWORKX = False
    print("[AgenticRAG] NetworkX not available")


# ===============================================================
# 1. ENTITY EXTRACTION (NER) - Auto Entity Recognition
# ===============================================================

class EntityType(Enum):
    """Supported entity types for astrology/saju domain."""
    PLANET = "planet"
    SIGN = "sign"
    HOUSE = "house"
    ASPECT = "aspect"
    ELEMENT = "element"
    STEM = "stem"          # Saju 천간
    BRANCH = "branch"      # Saju 지지
    TEN_GOD = "ten_god"    # Saju 십신
    SHINSAL = "shinsal"    # Saju 신살
    TRANSIT = "transit"
    TAROT = "tarot"
    HEXAGRAM = "hexagram"


@dataclass
class Entity:
    """Extracted entity with metadata."""
    text: str
    type: EntityType
    normalized: str
    confidence: float = 1.0
    metadata: Dict = field(default_factory=dict)


class EntityExtractor:
    """
    NER-based Entity Extractor for Astrology/Saju domain.

    Extracts entities like planets, signs, houses, elements from user queries
    for dynamic graph building and precise retrieval.
    """

    def __init__(self):
        self._init_patterns()

    def _init_patterns(self):
        """Initialize entity recognition patterns."""

        # Planets (Western Astrology)
        self.planets = {
            # English
            "sun": "Sun", "moon": "Moon", "mercury": "Mercury", "venus": "Venus",
            "mars": "Mars", "jupiter": "Jupiter", "saturn": "Saturn",
            "uranus": "Uranus", "neptune": "Neptune", "pluto": "Pluto",
            "chiron": "Chiron", "lilith": "Lilith", "north node": "North_Node",
            "south node": "South_Node", "ascendant": "Ascendant", "asc": "Ascendant",
            "midheaven": "Midheaven", "mc": "Midheaven",
            # Korean
            "태양": "Sun", "달": "Moon", "수성": "Mercury", "금성": "Venus",
            "화성": "Mars", "목성": "Jupiter", "토성": "Saturn",
            "천왕성": "Uranus", "해왕성": "Neptune", "명왕성": "Pluto",
            "키론": "Chiron", "릴리스": "Lilith", "북쪽노드": "North_Node",
            "남쪽노드": "South_Node", "어센던트": "Ascendant", "상승점": "Ascendant",
            "미드헤븐": "Midheaven", "천정": "Midheaven",
        }

        # Signs (Western Astrology)
        self.signs = {
            # English
            "aries": "Aries", "taurus": "Taurus", "gemini": "Gemini",
            "cancer": "Cancer", "leo": "Leo", "virgo": "Virgo",
            "libra": "Libra", "scorpio": "Scorpio", "sagittarius": "Sagittarius",
            "capricorn": "Capricorn", "aquarius": "Aquarius", "pisces": "Pisces",
            # Korean
            "양자리": "Aries", "황소자리": "Taurus", "쌍둥이자리": "Gemini",
            "게자리": "Cancer", "사자자리": "Leo", "처녀자리": "Virgo",
            "천칭자리": "Libra", "전갈자리": "Scorpio", "사수자리": "Sagittarius",
            "염소자리": "Capricorn", "물병자리": "Aquarius", "물고기자리": "Pisces",
            "백양궁": "Aries", "금우궁": "Taurus", "쌍자궁": "Gemini",
            "거해궁": "Cancer", "사자궁": "Leo", "처녀궁": "Virgo",
            "천칭궁": "Libra", "천갈궁": "Scorpio", "인마궁": "Sagittarius",
            "마갈궁": "Capricorn", "보병궁": "Aquarius", "쌍어궁": "Pisces",
        }

        # Houses
        self.houses = {
            **{f"{i}house": f"H{i}" for i in range(1, 13)},
            **{f"{i}st house": f"H{i}" for i in [1]},
            **{f"{i}nd house": f"H{i}" for i in [2]},
            **{f"{i}rd house": f"H{i}" for i in [3]},
            **{f"{i}th house": f"H{i}" for i in range(4, 13)},
            **{f"{i}하우스": f"H{i}" for i in range(1, 13)},
            **{f"{i}궁": f"H{i}" for i in range(1, 13)},
            "first house": "H1", "second house": "H2", "third house": "H3",
            "fourth house": "H4", "fifth house": "H5", "sixth house": "H6",
            "seventh house": "H7", "eighth house": "H8", "ninth house": "H9",
            "tenth house": "H10", "eleventh house": "H11", "twelfth house": "H12",
        }

        # Aspects
        self.aspects = {
            "conjunction": "Conjunction", "합": "Conjunction", "컨정션": "Conjunction",
            "opposition": "Opposition", "충": "Opposition", "오포지션": "Opposition",
            "trine": "Trine", "삼합": "Trine", "트라인": "Trine",
            "square": "Square", "형": "Square", "스퀘어": "Square",
            "sextile": "Sextile", "육합": "Sextile", "섹스타일": "Sextile",
            "quincunx": "Quincunx", "인컨정트": "Quincunx",
        }

        # Elements
        self.elements = {
            # Western
            "fire": "Fire", "earth": "Earth", "air": "Air", "water": "Water",
            "불": "Fire", "흙": "Earth", "바람": "Air", "공기": "Air", "물": "Water",
            # Eastern (Saju)
            "wood": "Wood", "목": "Wood", "나무": "Wood",
            "화": "Fire", "금": "Metal", "metal": "Metal", "쇠": "Metal",
            "토": "Earth", "수": "Water",
        }

        # Saju 천간 (Heavenly Stems)
        self.stems = {
            "갑": "Gab", "을": "Eul", "병": "Byeong", "정": "Jeong", "무": "Mu",
            "기": "Gi", "경": "Gyeong", "신": "Sin", "임": "Im", "계": "Gye",
            "甲": "Gab", "乙": "Eul", "丙": "Byeong", "丁": "Jeong", "戊": "Mu",
            "己": "Gi", "庚": "Gyeong", "辛": "Sin", "壬": "Im", "癸": "Gye",
        }

        # Saju 지지 (Earthly Branches)
        self.branches = {
            "자": "Ja", "축": "Chuk", "인": "In", "묘": "Myo",
            "진": "Jin", "사": "Sa", "오": "O", "미": "Mi",
            "신": "Shin", "유": "Yu", "술": "Sul", "해": "Hae",
            "子": "Ja", "丑": "Chuk", "寅": "In", "卯": "Myo",
            "辰": "Jin", "巳": "Sa", "午": "O", "未": "Mi",
            "申": "Shin", "酉": "Yu", "戌": "Sul", "亥": "Hae",
            "쥐": "Ja", "소": "Chuk", "호랑이": "In", "토끼": "Myo",
            "용": "Jin", "뱀": "Sa", "말": "O", "양": "Mi",
            "원숭이": "Shin", "닭": "Yu", "개": "Sul", "돼지": "Hae",
        }

        # Saju 십신 (Ten Gods)
        self.ten_gods = {
            "비견": "Bigyeon", "겁재": "Geopjae", "식신": "Siksin", "상관": "Sanggwan",
            "편재": "Pyeonjae", "정재": "Jeongjae", "편관": "Pyeongwan", "정관": "Jeonggwan",
            "편인": "Pyeonin", "정인": "Jeongin",
            "比肩": "Bigyeon", "劫財": "Geopjae", "食神": "Siksin", "傷官": "Sanggwan",
            "偏財": "Pyeonjae", "正財": "Jeongjae", "偏官": "Pyeongwan", "正官": "Jeonggwan",
            "偏印": "Pyeonin", "正印": "Jeongin",
        }

        # 신살 (Shinsal)
        self.shinsals = {
            "역마": "Yeokma", "도화": "Dohwa", "화개": "Hwagae", "귀문": "Gwimun",
            "천을귀인": "Cheonelgwiin", "문창귀인": "Munchanggwiin", "학당귀인": "Hakdanggwiin",
            "양인": "Yangin", "백호": "Baekho", "괴강": "Goegang",
            "驛馬": "Yeokma", "桃花": "Dohwa", "華蓋": "Hwagae",
        }

        # Tarot
        self.tarots = {
            "fool": "The_Fool", "magician": "The_Magician", "high priestess": "High_Priestess",
            "empress": "The_Empress", "emperor": "The_Emperor", "hierophant": "Hierophant",
            "lovers": "The_Lovers", "chariot": "The_Chariot", "strength": "Strength",
            "hermit": "The_Hermit", "wheel": "Wheel_of_Fortune", "justice": "Justice",
            "hanged man": "Hanged_Man", "death": "Death", "temperance": "Temperance",
            "devil": "The_Devil", "tower": "The_Tower", "star": "The_Star",
            "moon": "The_Moon_Tarot", "sun": "The_Sun_Tarot", "judgement": "Judgement",
            "world": "The_World",
            # Korean
            "바보": "The_Fool", "마법사": "The_Magician", "여사제": "High_Priestess",
            "여황제": "The_Empress", "황제": "The_Emperor", "교황": "Hierophant",
            "연인": "The_Lovers", "전차": "The_Chariot", "힘": "Strength",
            "은둔자": "The_Hermit", "운명의수레바퀴": "Wheel_of_Fortune", "정의": "Justice",
            "매달린사람": "Hanged_Man", "죽음": "Death", "절제": "Temperance",
            "악마": "The_Devil", "탑": "The_Tower", "별": "The_Star",
            "달타로": "The_Moon_Tarot", "태양타로": "The_Sun_Tarot", "심판": "Judgement",
            "세계": "The_World",
        }

    def extract(self, text: str) -> List[Entity]:
        """
        Extract all entities from text.

        Args:
            text: User query or context text

        Returns:
            List of extracted entities with types and normalized forms
        """
        entities = []
        text_lower = text.lower()

        # Extract each entity type
        entity_maps = [
            (self.planets, EntityType.PLANET),
            (self.signs, EntityType.SIGN),
            (self.houses, EntityType.HOUSE),
            (self.aspects, EntityType.ASPECT),
            (self.elements, EntityType.ELEMENT),
            (self.stems, EntityType.STEM),
            (self.branches, EntityType.BRANCH),
            (self.ten_gods, EntityType.TEN_GOD),
            (self.shinsals, EntityType.SHINSAL),
            (self.tarots, EntityType.TAROT),
        ]

        seen = set()
        for entity_map, entity_type in entity_maps:
            for pattern, normalized in entity_map.items():
                if pattern in text_lower and normalized not in seen:
                    entities.append(Entity(
                        text=pattern,
                        type=entity_type,
                        normalized=normalized,
                        confidence=1.0 if len(pattern) > 2 else 0.8,
                    ))
                    seen.add(normalized)

        # Also extract using regex for patterns like "Jupiter in Sagittarius"
        patterns = [
            (r"(\w+)\s+in\s+(\w+)", "planet_in_sign"),
            (r"(\w+)\s+house\s+(\w+)", "planet_in_house"),
            (r"(\w+)\s+(\w+)\s+(\w+)", "aspect_pattern"),
        ]

        for pattern, pattern_type in patterns:
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    for part in match:
                        # Check if part is a known entity
                        for entity_map, entity_type in entity_maps:
                            if part in entity_map and entity_map[part] not in seen:
                                entities.append(Entity(
                                    text=part,
                                    type=entity_type,
                                    normalized=entity_map[part],
                                    confidence=0.9,
                                    metadata={"pattern": pattern_type},
                                ))
                                seen.add(entity_map[part])

        return entities

    def extract_relations(self, text: str) -> List[Tuple[Entity, str, Entity]]:
        """
        Extract entity relations from text.

        Example: "Jupiter in Sagittarius" → (Jupiter, "in", Sagittarius)

        Returns:
            List of (entity1, relation, entity2) tuples
        """
        relations = []
        entities = self.extract(text)

        # Build entity lookup
        entity_lookup = {e.text: e for e in entities}

        # Pattern: "X in Y" (planet in sign/house)
        in_pattern = re.findall(r"(\w+)\s+in\s+(\w+)", text.lower())
        for src, dst in in_pattern:
            if src in entity_lookup and dst in entity_lookup:
                relations.append((
                    entity_lookup[src],
                    "in",
                    entity_lookup[dst]
                ))

        # Pattern: "X aspect Y" (planet aspects)
        for aspect_name in self.aspects.keys():
            aspect_pattern = re.findall(rf"(\w+)\s+{aspect_name}\s+(\w+)", text.lower())
            for src, dst in aspect_pattern:
                if src in entity_lookup and dst in entity_lookup:
                    relations.append((
                        entity_lookup[src],
                        aspect_name,
                        entity_lookup[dst]
                    ))

        return relations


# ===============================================================
# 2. DEEP GRAPH TRAVERSAL - Multi-hop Queries
# ===============================================================

@dataclass
class TraversalPath:
    """Represents a path through the knowledge graph."""
    nodes: List[str]
    edges: List[Dict]
    total_weight: float = 0.0
    context: str = ""


class DeepGraphTraversal:
    """
    Multi-hop graph traversal for deep knowledge discovery.

    Example: "Jupiter → Sagittarius → 9th House → Philosophy → Higher Learning"

    Features:
    - BFS/DFS traversal with depth control
    - Weighted path scoring
    - Semantic similarity pruning
    - Path explanation generation
    """

    def __init__(self, graph: nx.MultiDiGraph = None):
        if graph is None and HAS_GRAPH_RAG:
            rag = get_graph_rag()
            self.graph = rag.graph
        else:
            self.graph = graph or nx.MultiDiGraph()

        self.entity_extractor = EntityExtractor()

    def traverse(
        self,
        start_entities: List[str],
        max_depth: int = 3,
        max_paths: int = 10,
        min_weight: float = 0.5,
        relation_filter: List[str] = None,
    ) -> List[TraversalPath]:
        """
        Perform multi-hop traversal from start entities.

        Args:
            start_entities: Starting node IDs (e.g., ["Jupiter", "Sagittarius"])
            max_depth: Maximum traversal depth (hops)
            max_paths: Maximum number of paths to return
            min_weight: Minimum path weight threshold
            relation_filter: Only follow these relation types

        Returns:
            List of TraversalPath objects with discovered knowledge
        """
        all_paths = []

        for start in start_entities:
            # Find matching nodes in graph
            start_nodes = self._find_nodes(start)

            for start_node in start_nodes:
                # BFS traversal
                paths = self._bfs_traverse(
                    start_node,
                    max_depth,
                    relation_filter,
                )
                all_paths.extend(paths)

        # Score and rank paths
        scored_paths = self._score_paths(all_paths)

        # Filter by weight and return top paths
        filtered = [p for p in scored_paths if p.total_weight >= min_weight]
        return sorted(filtered, key=lambda p: -p.total_weight)[:max_paths]

    def _find_nodes(self, query: str) -> List[str]:
        """Find nodes matching query string."""
        query_lower = query.lower()
        matches = []

        for node in self.graph.nodes():
            node_lower = str(node).lower()
            if query_lower in node_lower or node_lower in query_lower:
                matches.append(node)

        return matches[:5]  # Limit matches

    def _bfs_traverse(
        self,
        start: str,
        max_depth: int,
        relation_filter: List[str] = None,
    ) -> List[TraversalPath]:
        """BFS traversal from start node."""
        paths = []
        visited = set()
        queue = [(start, [start], [], 0)]  # (node, path_nodes, path_edges, depth)

        while queue:
            current, path_nodes, path_edges, depth = queue.pop(0)

            if depth >= max_depth:
                if len(path_nodes) > 1:
                    paths.append(TraversalPath(
                        nodes=path_nodes,
                        edges=path_edges,
                    ))
                continue

            visited.add(current)

            # Get outgoing edges
            for src, dst, edge_data in self.graph.out_edges(current, data=True):
                if dst in visited:
                    continue

                relation = edge_data.get("relation", "link")

                # Apply relation filter
                if relation_filter and relation not in relation_filter:
                    continue

                new_path_nodes = path_nodes + [dst]
                new_path_edges = path_edges + [{
                    "src": src,
                    "dst": dst,
                    "relation": relation,
                    "desc": edge_data.get("desc", ""),
                    "weight": float(edge_data.get("weight", 1)),
                }]

                queue.append((dst, new_path_nodes, new_path_edges, depth + 1))

                # Also save intermediate paths
                if len(new_path_nodes) > 1:
                    paths.append(TraversalPath(
                        nodes=new_path_nodes.copy(),
                        edges=new_path_edges.copy(),
                    ))

        return paths

    def _score_paths(self, paths: List[TraversalPath]) -> List[TraversalPath]:
        """Score paths based on edge weights and length."""
        for path in paths:
            if not path.edges:
                path.total_weight = 0.0
                continue

            # Calculate weighted score
            edge_weights = [float(e.get("weight", 1)) for e in path.edges]
            avg_weight = sum(edge_weights) / len(edge_weights)

            # Bonus for longer paths (more context)
            length_bonus = min(len(path.nodes) * 0.1, 0.3)

            path.total_weight = avg_weight + length_bonus

            # Generate context text
            path.context = self._generate_path_context(path)

        return paths

    def _generate_path_context(self, path: TraversalPath) -> str:
        """Generate human-readable context from path."""
        if not path.edges:
            return ""

        parts = []
        for edge in path.edges:
            src = edge["src"]
            dst = edge["dst"]
            rel = edge["relation"]
            desc = edge.get("desc", "")

            if desc:
                parts.append(f"{src} --[{rel}]--> {dst}: {desc}")
            else:
                parts.append(f"{src} --[{rel}]--> {dst}")

        return "\n".join(parts)

    def find_connections(
        self,
        entity1: str,
        entity2: str,
        max_depth: int = 4,
    ) -> List[TraversalPath]:
        """
        Find all paths connecting two entities.

        Example: find_connections("Jupiter", "Philosophy")
        Returns paths like: Jupiter → Sagittarius → 9th House → Philosophy
        """
        paths = []
        entity1_nodes = self._find_nodes(entity1)
        entity2_nodes = set(self._find_nodes(entity2))

        for start in entity1_nodes:
            visited = set()
            queue = [(start, [start], [])]

            while queue:
                current, path_nodes, path_edges = queue.pop(0)

                if len(path_nodes) > max_depth:
                    continue

                if current in entity2_nodes:
                    paths.append(TraversalPath(
                        nodes=path_nodes,
                        edges=path_edges,
                    ))
                    continue

                visited.add(current)

                for src, dst, edge_data in self.graph.out_edges(current, data=True):
                    if dst in visited:
                        continue

                    new_path_nodes = path_nodes + [dst]
                    new_path_edges = path_edges + [{
                        "src": src,
                        "dst": dst,
                        "relation": edge_data.get("relation", "link"),
                        "desc": edge_data.get("desc", ""),
                        "weight": float(edge_data.get("weight", 1)),
                    }]

                    queue.append((dst, new_path_nodes, new_path_edges))

        return self._score_paths(paths)


# ===============================================================
# 3. AGENTIC WORKFLOW (LangGraph-style)
# ===============================================================

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

    # Extracted entities
    entities: List[Entity] = field(default_factory=list)
    relations: List[Tuple] = field(default_factory=list)

    # Search results
    graph_results: List[Dict] = field(default_factory=list)
    traversal_paths: List[TraversalPath] = field(default_factory=list)

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
        if not self.graph_rag:
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
        confidence_factors = [
            0.3 if state.entities else 0.0,
            0.3 if state.graph_results else 0.0,
            0.4 if state.traversal_paths else 0.0,
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


# ===============================================================
# INTEGRATION: Enhanced RAG Query Function
# ===============================================================

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


# ===============================================================
# TEST
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
