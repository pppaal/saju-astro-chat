# backend_ai/app/agentic_rag/graph_traversal.py
"""
Deep Graph Traversal for multi-hop knowledge discovery.
Supports BFS/DFS traversal with depth control and weighted path scoring.
"""

from typing import Dict, List, Optional
from dataclasses import dataclass

from .entity_extractor import EntityExtractor

# Optional: Try to import networkx
try:
    import networkx as nx
    HAS_NETWORKX = True
except ImportError:
    HAS_NETWORKX = False

# Optional: Try to import GraphRAG
try:
    from saju_astro_rag import get_graph_rag
    HAS_GRAPH_RAG = True
except ImportError:
    HAS_GRAPH_RAG = False


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

    def __init__(self, graph=None):
        if graph is None and HAS_GRAPH_RAG:
            rag = get_graph_rag()
            self.graph = rag.graph
        elif HAS_NETWORKX:
            self.graph = graph or nx.MultiDiGraph()
        else:
            self.graph = None

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
        if self.graph is None:
            return []

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
        if self.graph is None:
            return []

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
        if self.graph is None:
            return []

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
        if self.graph is None:
            return []

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
