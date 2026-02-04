# app/rag/graph_algorithms.py
"""
고급 그래프 알고리즘 엔진
==========================
NetworkX 그래프에 Community Detection, PageRank, Beam Search를 적용.

기존 단순 BFS 탐색을 보완하여:
- PageRank: 그래프 내 핵심 노드 식별
- Personalized PageRank: 쿼리 관점의 중요 노드 탐색
- Louvain Community Detection: 의미적 클러스터 발견
- Betweenness Centrality: 도메인 간 브릿지 노드 식별
- Beam Search: 유망 경로에 집중하는 효율적 탐색
"""

import logging
import math
from collections import defaultdict
from dataclasses import dataclass, field
from threading import Lock
from typing import Dict, List, Optional, Set, Tuple

import networkx as nx

logger = logging.getLogger(__name__)


@dataclass
class Community:
    """그래프 커뮤니티 (Louvain 클러스터)."""
    id: int
    nodes: List[str]
    summary: str = ""
    pagerank_leader: str = ""
    avg_pagerank: float = 0.0
    density: float = 0.0


@dataclass
class EnhancedTraversalPath:
    """고급 탐색 경로 (PPR + 커뮤니티 다양성 반영)."""
    nodes: List[str]
    edges: List[Dict]
    total_weight: float
    context: str
    community_ids: List[int] = field(default_factory=list)
    pagerank_score: float = 0.0
    diversity_score: float = 0.0
    combined_score: float = 0.0


class GraphAlgorithms:
    """NetworkX 그래프에 고급 알고리즘을 적용하는 엔진.

    현재 BFS만 사용하는 그래프 탐색을 Community Detection,
    PageRank, Personalized PageRank, Betweenness Centrality 등으로 강화.
    """

    def __init__(self, graph: nx.MultiDiGraph):
        self.graph = graph
        self._pagerank: Optional[Dict[str, float]] = None
        self._communities: Optional[Dict[str, int]] = None
        self._community_map: Optional[Dict[int, Community]] = None
        self._betweenness: Optional[Dict[str, float]] = None

    # ─── PageRank ───────────────────────────────────

    @property
    def pagerank(self) -> Dict[str, float]:
        """노드별 PageRank 점수 (lazy computation)."""
        if self._pagerank is None:
            try:
                self._pagerank = nx.pagerank(
                    self.graph,
                    alpha=0.85,
                    max_iter=100,
                    tol=1e-06,
                    weight="weight",
                )
            except Exception as e:
                logger.warning("PageRank 계산 실패: %s", e)
                self._pagerank = {
                    n: 1.0 / len(self.graph) for n in self.graph.nodes()
                }
        return self._pagerank

    def get_top_nodes(self, top_k: int = 20) -> List[Tuple[str, float]]:
        """PageRank 기준 상위 노드 반환."""
        return sorted(
            self.pagerank.items(), key=lambda x: x[1], reverse=True
        )[:top_k]

    def personalized_pagerank(
        self,
        seed_nodes: List[str],
        alpha: float = 0.85,
    ) -> Dict[str, float]:
        """Personalized PageRank (PPR).

        사용자 쿼리에서 추출한 엔티티를 seed로 하여
        해당 엔티티와 관련성이 높은 노드를 찾는다.
        """
        valid_seeds = [n for n in seed_nodes if self.graph.has_node(n)]
        if not valid_seeds:
            return self.pagerank

        weight = 1.0 / len(valid_seeds)
        personalization = {node: weight for node in valid_seeds}

        try:
            return nx.pagerank(
                self.graph,
                alpha=alpha,
                personalization=personalization,
                weight="weight",
                max_iter=100,
            )
        except Exception as e:
            logger.warning("PPR 계산 실패: %s", e)
            return self.pagerank

    # ─── Community Detection ───────────────────────

    @property
    def communities(self) -> Dict[str, int]:
        """노드별 커뮤니티 ID (Louvain 알고리즘)."""
        if self._communities is None:
            self._detect_communities()
        return self._communities

    @property
    def community_map(self) -> Dict[int, Community]:
        """커뮤니티 ID -> Community 매핑."""
        if self._community_map is None:
            self._detect_communities()
        return self._community_map

    def _detect_communities(self):
        """Louvain 커뮤니티 탐지 실행."""
        try:
            undirected = self.graph.to_undirected()
            communities_list = nx.community.louvain_communities(
                undirected,
                weight="weight",
                resolution=1.0,
                seed=42,
            )

            self._communities = {}
            self._community_map = {}

            for comm_id, members in enumerate(communities_list):
                member_list = list(members)
                self._community_map[comm_id] = Community(
                    id=comm_id,
                    nodes=member_list,
                    density=self._compute_density(member_list),
                )
                for node in member_list:
                    self._communities[node] = comm_id

            # 각 커뮤니티의 PageRank 리더 설정
            for comm_id, comm in self._community_map.items():
                pr_scores = [(n, self.pagerank.get(n, 0)) for n in comm.nodes]
                pr_scores.sort(key=lambda x: x[1], reverse=True)
                comm.pagerank_leader = pr_scores[0][0] if pr_scores else ""
                comm.avg_pagerank = (
                    sum(s for _, s in pr_scores) / len(pr_scores)
                    if pr_scores
                    else 0
                )

            logger.info(
                "커뮤니티 탐지 완료: %d개 커뮤니티", len(self._community_map)
            )

        except Exception as e:
            logger.warning("커뮤니티 탐지 실패: %s", e)
            self._communities = {n: 0 for n in self.graph.nodes()}
            self._community_map = {
                0: Community(id=0, nodes=list(self.graph.nodes()))
            }

    def _compute_density(self, nodes: List[str]) -> float:
        """커뮤니티 밀도 계산."""
        if len(nodes) < 2:
            return 1.0
        subgraph = self.graph.subgraph(nodes)
        n = len(nodes)
        max_edges = n * (n - 1)  # directed graph
        return subgraph.number_of_edges() / max_edges if max_edges > 0 else 0

    def get_community(self, node: str) -> Optional[Community]:
        """노드가 속한 커뮤니티 반환."""
        comm_id = self.communities.get(node)
        if comm_id is not None and self._community_map:
            return self._community_map.get(comm_id)
        return None

    def get_community_neighbors(
        self,
        node: str,
        max_results: int = 10,
    ) -> List[Tuple[str, float]]:
        """같은 커뮤니티 내에서 PageRank 순으로 이웃 노드 반환."""
        comm = self.get_community(node)
        if not comm:
            return []

        pr = self.pagerank
        neighbors = [(n, pr.get(n, 0)) for n in comm.nodes if n != node]
        neighbors.sort(key=lambda x: x[1], reverse=True)
        return neighbors[:max_results]

    # ─── Betweenness Centrality ────────────────────

    @property
    def betweenness(self) -> Dict[str, float]:
        """노드별 Betweenness Centrality (브릿지 노드 식별)."""
        if self._betweenness is None:
            try:
                k = min(500, len(self.graph.nodes()))
                self._betweenness = nx.betweenness_centrality(
                    self.graph,
                    k=k,
                    weight="weight",
                    normalized=True,
                )
            except Exception as e:
                logger.warning("Betweenness 계산 실패: %s", e)
                self._betweenness = {n: 0.0 for n in self.graph.nodes()}
        return self._betweenness

    def get_bridge_nodes(self, top_k: int = 10) -> List[Tuple[str, float]]:
        """커뮤니티 간 다리 역할 노드 반환."""
        return sorted(
            self.betweenness.items(), key=lambda x: x[1], reverse=True
        )[:top_k]

    # ─── 고급 탐색 ─────────────────────────────────

    def enhanced_traverse(
        self,
        start_entities: List[str],
        max_depth: int = 3,
        max_paths: int = 10,
        min_weight: float = 0.3,
        use_ppr: bool = True,
        diversity_weight: float = 0.3,
    ) -> List[EnhancedTraversalPath]:
        """Community-aware + PPR 기반 고급 그래프 탐색.

        기존 BFS 대비 개선점:
        1. PPR로 seed 엔티티 관점의 중요도 반영
        2. 커뮤니티 다양성 점수로 다양한 관점 수집
        3. Beam Search로 유망 경로만 확장
        """
        # 1. PPR 계산
        ppr_scores = (
            self.personalized_pagerank(start_entities)
            if use_ppr
            else self.pagerank
        )

        # 2. 시작 노드 찾기
        start_nodes = []
        for entity in start_entities:
            matches = self._fuzzy_find_nodes(entity)
            start_nodes.extend(matches[:3])

        if not start_nodes:
            return []

        # 3. Beam Search 탐색
        all_paths = []
        beam_width = max(max_paths * 2, 20)

        for start in start_nodes:
            paths = self._beam_search(
                start_node=start,
                max_depth=max_depth,
                beam_width=beam_width,
                min_weight=min_weight,
                ppr_scores=ppr_scores,
            )
            all_paths.extend(paths)

        # 4. 점수 계산 (PPR + 커뮤니티 다양성)
        scored_paths = []
        seen_communities: Set[int] = set()

        for path in all_paths:
            ppr_score = sum(ppr_scores.get(n, 0) for n in path.nodes) / len(
                path.nodes
            )
            path.pagerank_score = ppr_score

            path_communities = set()
            for node in path.nodes:
                comm_id = self.communities.get(node, -1)
                path_communities.add(comm_id)
                path.community_ids.append(comm_id)

            new_communities = path_communities - seen_communities
            path.diversity_score = len(new_communities) / max(
                len(path_communities), 1
            )

            path.combined_score = (1 - diversity_weight) * (
                path.total_weight * 0.5 + ppr_score * 0.5
            ) + diversity_weight * path.diversity_score

            scored_paths.append(path)

        # 5. 점수 순 정렬 + 다양성 보장 (Greedy 커뮤니티 커버리지)
        scored_paths.sort(key=lambda p: p.combined_score, reverse=True)

        selected = []
        covered_communities: Set[int] = set()

        for path in scored_paths:
            if len(selected) >= max_paths:
                break
            path_comms = set(path.community_ids)
            if path_comms - covered_communities or path.combined_score > 0.5:
                selected.append(path)
                covered_communities.update(path_comms)

        return selected

    def _beam_search(
        self,
        start_node: str,
        max_depth: int,
        beam_width: int,
        min_weight: float,
        ppr_scores: Dict[str, float],
    ) -> List[EnhancedTraversalPath]:
        """Beam Search 기반 그래프 탐색.

        BFS 대비: 각 깊이에서 상위 beam_width개 경로만 유지.
        """
        beam = [([start_node], [], 0.0)]
        all_paths = []

        for depth in range(max_depth):
            candidates = []

            for path_nodes, path_edges, path_score in beam:
                current = path_nodes[-1]

                if not self.graph.has_node(current):
                    continue

                for _, neighbor, edge_data in self.graph.edges(
                    current, data=True
                ):
                    if neighbor in path_nodes:
                        continue

                    edge_weight = edge_data.get("weight", 0.5)
                    if edge_weight < min_weight:
                        continue

                    ppr = ppr_scores.get(neighbor, 0)
                    step_score = edge_weight * 0.6 + ppr * 10000 * 0.4

                    new_nodes = path_nodes + [neighbor]
                    new_edges = path_edges + [
                        {
                            "src": current,
                            "dst": neighbor,
                            "relation": edge_data.get("relation", "link"),
                            "desc": edge_data.get("desc", ""),
                            "weight": float(edge_data.get("weight", 0.5)),
                        }
                    ]
                    new_score = path_score + step_score

                    candidates.append((new_nodes, new_edges, new_score))

            candidates.sort(key=lambda x: x[2], reverse=True)
            beam = candidates[:beam_width]

            for nodes, edges, score in beam:
                context = self._build_path_context(nodes, edges)
                all_paths.append(
                    EnhancedTraversalPath(
                        nodes=nodes,
                        edges=edges,
                        total_weight=score / max(len(nodes) - 1, 1),
                        context=context,
                    )
                )

        return all_paths

    def _fuzzy_find_nodes(
        self, query: str, max_results: int = 5
    ) -> List[str]:
        """퍼지 노드 매칭 (정확 > 대소문자 무시 > 포함 관계)."""
        query_lower = query.lower().strip()
        exact = []
        case_insensitive = []
        contains = []

        for node in self.graph.nodes():
            node_str = str(node)
            node_lower = node_str.lower()

            if node_str == query:
                exact.append(node_str)
            elif node_lower == query_lower:
                case_insensitive.append(node_str)
            elif query_lower in node_lower or node_lower in query_lower:
                contains.append(node_str)

        results = exact + case_insensitive + contains
        return results[:max_results]

    def _build_path_context(
        self, nodes: List[str], edges: List[Dict]
    ) -> str:
        """경로를 사람이 읽을 수 있는 설명으로 변환."""
        if not nodes:
            return ""

        parts = [nodes[0]]
        for i, edge in enumerate(edges):
            relation = edge.get("relation", "->")
            target = nodes[i + 1] if i + 1 < len(nodes) else "?"
            desc = edge.get("desc", "")
            parts.append(f" --[{relation}]--> {target}")
            if desc:
                parts.append(f" ({desc[:50]})")

        return "".join(parts)

    # ─── 커뮤니티 요약 ─────────────────────────────

    def get_community_summary(self, community_id: int) -> Dict:
        """커뮤니티 요약 정보 반환."""
        if not self._community_map or community_id not in self._community_map:
            return {}

        comm = self._community_map[community_id]
        pr = self.pagerank

        top_nodes = sorted(
            [(n, pr.get(n, 0)) for n in comm.nodes],
            key=lambda x: x[1],
            reverse=True,
        )[:10]

        subgraph = self.graph.subgraph(comm.nodes)
        internal_edges = []
        for u, v, data in subgraph.edges(data=True):
            internal_edges.append(
                {
                    "source": u,
                    "target": v,
                    "relation": data.get("relation", "related"),
                    "weight": data.get("weight", 0.5),
                }
            )

        return {
            "id": community_id,
            "size": len(comm.nodes),
            "density": comm.density,
            "leader": comm.pagerank_leader,
            "avg_pagerank": comm.avg_pagerank,
            "top_nodes": top_nodes,
            "edge_count": len(internal_edges),
            "sample_edges": internal_edges[:20],
        }

    def get_stats(self) -> Dict:
        """알고리즘 통계."""
        return {
            "node_count": len(self.graph.nodes()),
            "edge_count": len(self.graph.edges()),
            "community_count": len(self.community_map),
            "top_pagerank_nodes": self.get_top_nodes(5),
            "top_bridge_nodes": self.get_bridge_nodes(5),
        }


# ─── 싱글톤 ─────────────────────────────────────
_graph_algo: Optional[GraphAlgorithms] = None
_graph_algo_lock = Lock()


def get_graph_algorithms(
    graph: nx.MultiDiGraph = None,
) -> GraphAlgorithms:
    """싱글톤 GraphAlgorithms 반환."""
    global _graph_algo
    if _graph_algo is None:
        with _graph_algo_lock:
            if _graph_algo is None:
                if graph is None:
                    from app.saju_astro_rag import GraphRAG

                    rag = GraphRAG()
                    graph = rag.graph
                _graph_algo = GraphAlgorithms(graph)
    return _graph_algo
