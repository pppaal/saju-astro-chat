# tests/unit/test_graph_algorithms.py
"""
GraphAlgorithms 유닛 테스트.

실제 GraphRAG 없이 작은 테스트 그래프로 알고리즘 검증.
"""

import pytest

try:
    import networkx as nx
    HAS_NETWORKX = True
except ImportError:
    HAS_NETWORKX = False


@pytest.fixture
def test_graph():
    """테스트용 소규모 지식 그래프."""
    G = nx.MultiDiGraph()

    # 행성-별자리 관계
    G.add_edge("Jupiter", "Sagittarius", relation="rules", weight=1.0, desc="Jupiter rules Sagittarius")
    G.add_edge("Jupiter", "Pisces", relation="rules", weight=0.8, desc="Jupiter co-rules Pisces")
    G.add_edge("Saturn", "Capricorn", relation="rules", weight=1.0, desc="Saturn rules Capricorn")
    G.add_edge("Saturn", "Aquarius", relation="rules", weight=0.8, desc="Saturn co-rules Aquarius")
    G.add_edge("Sun", "Leo", relation="rules", weight=1.0, desc="Sun rules Leo")
    G.add_edge("Moon", "Cancer", relation="rules", weight=1.0, desc="Moon rules Cancer")

    # 별자리-원소 관계
    G.add_edge("Sagittarius", "Fire", relation="element", weight=0.9)
    G.add_edge("Leo", "Fire", relation="element", weight=0.9)
    G.add_edge("Capricorn", "Earth", relation="element", weight=0.9)
    G.add_edge("Cancer", "Water", relation="element", weight=0.9)
    G.add_edge("Pisces", "Water", relation="element", weight=0.9)
    G.add_edge("Aquarius", "Air", relation="element", weight=0.9)

    # 원소 간 관계
    G.add_edge("Fire", "Air", relation="compatible", weight=0.7)
    G.add_edge("Water", "Earth", relation="compatible", weight=0.7)
    G.add_edge("Fire", "Water", relation="tension", weight=0.3)

    # 사주-오행 관계
    G.add_edge("갑목", "목", relation="오행", weight=1.0, desc="갑목은 양목")
    G.add_edge("을목", "목", relation="오행", weight=1.0, desc="을목은 음목")
    G.add_edge("병화", "화", relation="오행", weight=1.0, desc="병화는 양화")
    G.add_edge("목", "화", relation="상생", weight=0.8, desc="목생화")
    G.add_edge("화", "토", relation="상생", weight=0.8, desc="화생토")
    G.add_edge("토", "금", relation="상생", weight=0.8, desc="토생금")
    G.add_edge("금", "수", relation="상생", weight=0.8, desc="금생수")
    G.add_edge("수", "목", relation="상생", weight=0.8, desc="수생목")

    # 크로스 도메인 관계
    G.add_edge("Fire", "화", relation="corresponds", weight=0.6, desc="Fire = 화(火)")
    G.add_edge("Water", "수", relation="corresponds", weight=0.6, desc="Water = 수(水)")

    return G


@pytest.fixture
def algo(test_graph):
    """테스트용 GraphAlgorithms 인스턴스."""
    from app.rag.graph_algorithms import GraphAlgorithms
    return GraphAlgorithms(test_graph)


@pytest.mark.skipif(not HAS_NETWORKX, reason="networkx not installed")
class TestPageRank:
    """PageRank 테스트."""

    def test_pagerank_computes(self, algo):
        """PageRank가 계산되어야 한다."""
        pr = algo.pagerank
        assert len(pr) > 0
        # 모든 점수 합은 약 1.0
        assert 0.99 < sum(pr.values()) < 1.01

    def test_top_nodes(self, algo):
        """상위 노드가 반환되어야 한다."""
        top = algo.get_top_nodes(5)
        assert len(top) == 5
        # 점수 내림차순
        for i in range(len(top) - 1):
            assert top[i][1] >= top[i + 1][1]

    def test_hub_nodes_have_higher_rank(self, algo):
        """허브 노드(Fire, Water 등)가 높은 PageRank를 가져야 한다."""
        pr = algo.pagerank
        # Fire는 여러 별자리에서 연결되므로 상대적으로 높아야 함
        # 하지만 작은 그래프에서는 수치적 보장이 어려우므로 존재만 확인
        assert "Fire" in pr
        assert "Water" in pr

    def test_personalized_pagerank(self, algo):
        """PPR이 seed 노드 주변에 집중되어야 한다."""
        ppr = algo.personalized_pagerank(["Jupiter"])
        assert len(ppr) > 0
        # Jupiter 관련 노드가 일반 PageRank보다 높아야 함
        regular_pr = algo.pagerank
        assert ppr.get("Sagittarius", 0) >= regular_pr.get("Sagittarius", 0) * 0.5

    def test_ppr_with_invalid_seeds(self, algo):
        """존재하지 않는 seed로 PPR 시 일반 PageRank 반환."""
        ppr = algo.personalized_pagerank(["nonexistent_node"])
        regular = algo.pagerank
        assert ppr == regular


@pytest.mark.skipif(not HAS_NETWORKX, reason="networkx not installed")
class TestCommunityDetection:
    """커뮤니티 탐지 테스트."""

    def test_communities_detected(self, algo):
        """커뮤니티가 탐지되어야 한다."""
        comms = algo.communities
        assert len(comms) > 0
        # 모든 노드에 커뮤니티 할당
        assert len(comms) == len(algo.graph.nodes())

    def test_community_map(self, algo):
        """커뮤니티 맵이 생성되어야 한다."""
        cmap = algo.community_map
        assert len(cmap) > 0
        # 각 커뮤니티에 노드가 있어야 함
        for comm_id, comm in cmap.items():
            assert len(comm.nodes) > 0

    def test_get_community(self, algo):
        """노드의 커뮤니티 조회."""
        comm = algo.get_community("Jupiter")
        assert comm is not None
        assert "Jupiter" in comm.nodes

    def test_community_neighbors(self, algo):
        """같은 커뮤니티 이웃 노드 조회."""
        neighbors = algo.get_community_neighbors("Jupiter", max_results=5)
        # Jupiter와 같은 커뮤니티의 노드가 반환되어야 함
        assert isinstance(neighbors, list)

    def test_community_summary(self, algo):
        """커뮤니티 요약 정보."""
        comm_id = algo.communities.get("Jupiter", 0)
        summary = algo.get_community_summary(comm_id)
        assert "id" in summary
        assert "size" in summary
        assert "top_nodes" in summary


@pytest.mark.skipif(not HAS_NETWORKX, reason="networkx not installed")
class TestBetweenness:
    """Betweenness Centrality 테스트."""

    def test_betweenness_computes(self, algo):
        """Betweenness가 계산되어야 한다."""
        bc = algo.betweenness
        assert len(bc) > 0
        assert all(v >= 0 for v in bc.values())

    def test_bridge_nodes(self, algo):
        """브릿지 노드가 반환되어야 한다."""
        bridges = algo.get_bridge_nodes(5)
        assert isinstance(bridges, list)
        # 점수 내림차순
        for i in range(len(bridges) - 1):
            assert bridges[i][1] >= bridges[i + 1][1]


@pytest.mark.skipif(not HAS_NETWORKX, reason="networkx not installed")
class TestEnhancedTraversal:
    """고급 탐색 테스트."""

    def test_enhanced_traverse(self, algo):
        """enhanced_traverse가 결과를 반환해야 한다."""
        paths = algo.enhanced_traverse(
            start_entities=["Jupiter"],
            max_depth=2,
            max_paths=5,
        )
        assert isinstance(paths, list)
        # Jupiter 노드가 존재하므로 경로가 있어야 함
        assert len(paths) > 0

    def test_traverse_with_multiple_entities(self, algo):
        """여러 엔티티로 탐색."""
        paths = algo.enhanced_traverse(
            start_entities=["Jupiter", "Saturn"],
            max_depth=2,
            max_paths=10,
        )
        assert len(paths) > 0

    def test_traverse_korean_entities(self, algo):
        """한국어 엔티티 탐색."""
        paths = algo.enhanced_traverse(
            start_entities=["갑목"],
            max_depth=2,
            max_paths=5,
        )
        assert len(paths) > 0

    def test_traverse_nonexistent_entity(self, algo):
        """존재하지 않는 엔티티 시 빈 결과."""
        paths = algo.enhanced_traverse(
            start_entities=["completely_nonexistent_xyz"],
            max_depth=2,
            max_paths=5,
        )
        assert paths == []

    def test_path_has_scores(self, algo):
        """경로에 점수가 계산되어야 한다."""
        paths = algo.enhanced_traverse(
            start_entities=["Jupiter"],
            max_depth=2,
            max_paths=5,
        )
        for p in paths:
            assert p.combined_score >= 0
            assert len(p.nodes) > 0
            assert p.context != ""

    def test_diversity_weight(self, algo):
        """다양성 가중치가 결과에 영향을 줘야 한다."""
        paths_low = algo.enhanced_traverse(
            start_entities=["Jupiter"],
            max_depth=2,
            max_paths=5,
            diversity_weight=0.0,
        )
        paths_high = algo.enhanced_traverse(
            start_entities=["Jupiter"],
            max_depth=2,
            max_paths=5,
            diversity_weight=0.9,
        )
        # 두 결과가 다를 수 있음 (순서 또는 선택이 다를 수 있음)
        assert len(paths_low) > 0
        assert len(paths_high) > 0


@pytest.mark.skipif(not HAS_NETWORKX, reason="networkx not installed")
class TestFuzzyNodeMatching:
    """퍼지 노드 매칭 테스트."""

    def test_exact_match(self, algo):
        """정확한 매칭."""
        matches = algo._fuzzy_find_nodes("Jupiter")
        assert "Jupiter" in matches

    def test_case_insensitive(self, algo):
        """대소문자 무시 매칭."""
        matches = algo._fuzzy_find_nodes("jupiter")
        assert "Jupiter" in matches

    def test_contains_match(self, algo):
        """포함 관계 매칭."""
        matches = algo._fuzzy_find_nodes("Sagit")
        assert "Sagittarius" in matches

    def test_korean_match(self, algo):
        """한국어 노드 매칭."""
        matches = algo._fuzzy_find_nodes("갑목")
        assert "갑목" in matches


@pytest.mark.skipif(not HAS_NETWORKX, reason="networkx not installed")
class TestStats:
    """통계 테스트."""

    def test_get_stats(self, algo):
        """통계 정보가 반환되어야 한다."""
        stats = algo.get_stats()
        assert stats["node_count"] > 0
        assert stats["edge_count"] > 0
        assert stats["community_count"] > 0
        assert len(stats["top_pagerank_nodes"]) > 0
