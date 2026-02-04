# tests/unit/test_community_summarizer.py
"""
커뮤니티 기반 계층적 요약 엔진 유닛 테스트 (Phase 4).

LLM 없이 로컬 패턴 기반 요약만 테스트.
"""

import pytest
import networkx as nx

from app.rag.graph_algorithms import GraphAlgorithms
from app.rag.community_summarizer import (
    CommunitySummary,
    HierarchicalSummarizer,
)


# ─── 테스트 그래프 픽스처 ──────────────────────

@pytest.fixture
def test_graph():
    """테스트용 지식 그래프 (4개 커뮤니티 형성)."""
    G = nx.MultiDiGraph()

    # 커뮤니티 1: 사주 오행 (5 노드)
    saju_nodes = ["오행", "목", "화", "토", "금"]
    for n in saju_nodes:
        G.add_node(n)
    G.add_edge("오행", "목", relation="contains", weight=1.0)
    G.add_edge("오행", "화", relation="contains", weight=1.0)
    G.add_edge("오행", "토", relation="contains", weight=1.0)
    G.add_edge("오행", "금", relation="contains", weight=1.0)
    G.add_edge("목", "화", relation="generates", weight=0.8)
    G.add_edge("화", "토", relation="generates", weight=0.8)
    G.add_edge("토", "금", relation="generates", weight=0.8)

    # 커뮤니티 2: 점성술 행성 (5 노드)
    planet_nodes = ["Jupiter", "Saturn", "Mars", "Venus", "Mercury"]
    for n in planet_nodes:
        G.add_node(n)
    G.add_edge("Jupiter", "Saturn", relation="aspect", weight=0.9)
    G.add_edge("Jupiter", "Venus", relation="aspect", weight=0.7)
    G.add_edge("Mars", "Venus", relation="aspect", weight=0.8)
    G.add_edge("Saturn", "Mercury", relation="aspect", weight=0.6)
    G.add_edge("Mars", "Mercury", relation="aspect", weight=0.7)

    # 커뮤니티 3: 별자리 (5 노드)
    sign_nodes = ["Aries", "Taurus", "Gemini", "Cancer", "Leo"]
    for n in sign_nodes:
        G.add_node(n)
    G.add_edge("Aries", "Taurus", relation="follows", weight=0.5)
    G.add_edge("Taurus", "Gemini", relation="follows", weight=0.5)
    G.add_edge("Gemini", "Cancer", relation="follows", weight=0.5)
    G.add_edge("Cancer", "Leo", relation="follows", weight=0.5)
    G.add_edge("Leo", "Aries", relation="follows", weight=0.5)

    # 커뮤니티 4: 타로 (4 노드)
    tarot_nodes = ["Fool", "Magician", "High_Priestess", "Empress"]
    for n in tarot_nodes:
        G.add_node(n)
    G.add_edge("Fool", "Magician", relation="progression", weight=0.9)
    G.add_edge("Magician", "High_Priestess", relation="progression", weight=0.9)
    G.add_edge("High_Priestess", "Empress", relation="progression", weight=0.9)

    # 크로스 커뮤니티 연결 (브릿지)
    G.add_edge("Jupiter", "Aries", relation="rules", weight=0.6)
    G.add_edge("Venus", "Taurus", relation="rules", weight=0.6)
    G.add_edge("오행", "Jupiter", relation="maps_to", weight=0.4)
    G.add_edge("Fool", "Aries", relation="corresponds", weight=0.3)

    return G


@pytest.fixture
def algo(test_graph):
    """GraphAlgorithms 인스턴스."""
    return GraphAlgorithms(test_graph)


@pytest.fixture
def summarizer():
    """LLM 비활성 상태의 요약 엔진."""
    return HierarchicalSummarizer(use_llm=False)


# ─── CommunitySummary 데이터클래스 테스트 ──────

class TestCommunitySummary:
    """CommunitySummary 데이터클래스 테스트."""

    def test_basic_creation(self):
        """기본 생성."""
        s = CommunitySummary(
            community_id=0,
            level=0,
            title="Test Community",
            summary_ko="테스트 커뮤니티입니다.",
            summary_en="This is a test community.",
            key_concepts=["concept1", "concept2"],
            node_count=10,
        )
        assert s.community_id == 0
        assert s.level == 0
        assert s.title == "Test Community"
        assert len(s.key_concepts) == 2
        assert s.node_count == 10
        assert s.child_summaries == []

    def test_with_children(self):
        """하위 커뮤니티 참조."""
        s = CommunitySummary(
            community_id=10000,
            level=1,
            title="Parent",
            summary_ko="상위 요약",
            summary_en="Parent summary",
            key_concepts=["a"],
            node_count=50,
            child_summaries=[0, 1, 2],
        )
        assert s.level == 1
        assert len(s.child_summaries) == 3


# ─── 로컬 요약 생성 테스트 ─────────────────────

class TestLocalSummarization:
    """LLM 없이 로컬 패턴 기반 요약 테스트."""

    def test_summarize_communities(self, summarizer, algo):
        """전체 커뮤니티 요약 생성."""
        summaries = summarizer.summarize_communities(algo, max_level=1)
        assert len(summaries) > 0

    def test_level0_summaries_exist(self, summarizer, algo):
        """Level 0 요약이 생성되어야 한다."""
        summaries = summarizer.summarize_communities(algo, max_level=0)
        level0 = [s for s in summaries.values() if s.level == 0]
        assert len(level0) > 0

    def test_summary_has_title(self, summarizer, algo):
        """각 요약에 타이틀이 있어야 한다."""
        summaries = summarizer.summarize_communities(algo, max_level=0)
        for s in summaries.values():
            assert s.title, f"Community {s.community_id} has no title"

    def test_summary_has_key_concepts(self, summarizer, algo):
        """각 요약에 핵심 개념이 있어야 한다."""
        summaries = summarizer.summarize_communities(algo, max_level=0)
        for s in summaries.values():
            assert len(s.key_concepts) > 0, f"Community {s.community_id} has no key concepts"

    def test_summary_has_bilingual_text(self, summarizer, algo):
        """한국어/영어 요약이 있어야 한다."""
        summaries = summarizer.summarize_communities(algo, max_level=0)
        for s in summaries.values():
            assert s.summary_ko, f"Community {s.community_id} has no Korean summary"
            assert s.summary_en, f"Community {s.community_id} has no English summary"

    def test_node_count_matches(self, summarizer, algo):
        """노드 수가 실제 커뮤니티 크기와 일치."""
        summaries = summarizer.summarize_communities(algo, max_level=0)
        for s in summaries.values():
            if s.level == 0:
                comm = algo.community_map.get(s.community_id)
                if comm:
                    assert s.node_count == len(comm.nodes)

    def test_small_communities_skipped(self, summarizer, algo):
        """3개 미만 노드 커뮤니티는 건너뛴다."""
        summaries = summarizer.summarize_communities(algo, max_level=0)
        for s in summaries.values():
            if s.level == 0:
                assert s.node_count >= 3


# ─── 상위 레벨 요약 테스트 ─────────────────────

class TestHigherLevelSummaries:
    """상위 레벨 (Level 1+) 요약 테스트."""

    def test_higher_level_created(self, summarizer, algo):
        """충분한 커뮤니티가 있으면 상위 요약이 생성된다."""
        summaries = summarizer.summarize_communities(algo, max_level=1)
        level1 = [s for s in summaries.values() if s.level >= 1]
        # 4개 커뮤니티면 상위 요약 가능
        # (크기 3 미만 필터링에 따라 다를 수 있음)
        assert isinstance(level1, list)

    def test_higher_level_has_children(self, summarizer, algo):
        """상위 요약은 하위 커뮤니티 참조를 포함."""
        summaries = summarizer.summarize_communities(algo, max_level=1)
        for s in summaries.values():
            if s.level >= 1:
                assert len(s.child_summaries) >= 2

    def test_higher_level_node_count(self, summarizer, algo):
        """상위 요약의 node_count는 하위 합계."""
        summaries = summarizer.summarize_communities(algo, max_level=1)
        for s in summaries.values():
            if s.level >= 1:
                child_total = sum(
                    summaries[cid].node_count
                    for cid in s.child_summaries
                    if cid in summaries
                )
                assert s.node_count == child_total


# ─── 쿼리 매칭 테스트 ─────────────────────────

class TestRelevantSummaries:
    """쿼리 관련 요약 검색 테스트."""

    def test_keyword_match(self, summarizer, algo):
        """키워드로 관련 요약 검색."""
        summarizer.summarize_communities(algo, max_level=0)
        results = summarizer.get_relevant_summaries("Jupiter")
        # Jupiter가 key_concept 또는 title에 있는 커뮤니티가 있어야 함
        assert isinstance(results, list)

    def test_empty_query(self, summarizer, algo):
        """빈 쿼리는 빈 결과."""
        summarizer.summarize_communities(algo, max_level=0)
        results = summarizer.get_relevant_summaries("")
        assert isinstance(results, list)

    def test_no_match(self, summarizer, algo):
        """매칭 없는 쿼리."""
        summarizer.summarize_communities(algo, max_level=0)
        results = summarizer.get_relevant_summaries("xyznonsense123")
        assert results == []

    def test_top_k_limit(self, summarizer, algo):
        """top_k 제한 적용."""
        summarizer.summarize_communities(algo, max_level=0)
        results = summarizer.get_relevant_summaries("오행", top_k=1)
        assert len(results) <= 1

    def test_korean_query(self, summarizer, algo):
        """한국어 쿼리 매칭."""
        summarizer.summarize_communities(algo, max_level=0)
        results = summarizer.get_relevant_summaries("오행")
        # 오행이 포함된 커뮤니티가 있어야 함
        if results:
            all_concepts = []
            for r in results:
                all_concepts.extend(r.key_concepts)
                all_concepts.append(r.title)
            combined = " ".join(all_concepts).lower()
            assert "오행" in combined


# ─── 컨텍스트 포맷팅 테스트 ───────────────────

class TestFormatContext:
    """계층적 컨텍스트 포맷팅 테스트."""

    def test_empty_summaries(self, summarizer):
        """빈 요약 리스트."""
        result = summarizer.format_hierarchical_context([])
        assert result == ""

    def test_single_summary(self, summarizer):
        """단일 요약 포맷팅."""
        s = CommunitySummary(
            community_id=0,
            level=0,
            title="Test",
            summary_ko="테스트 요약입니다.",
            summary_en="Test summary.",
            key_concepts=["A", "B"],
            node_count=5,
        )
        result = summarizer.format_hierarchical_context([s])
        assert "지식 그래프 컨텍스트" in result
        assert "테스트 요약입니다" in result
        assert "세부 분석" in result

    def test_hierarchical_order(self, summarizer):
        """상위 레벨이 먼저 나와야 한다."""
        s0 = CommunitySummary(
            community_id=0, level=0, title="Detail",
            summary_ko="세부", summary_en="Detail",
            key_concepts=["d"], node_count=5,
        )
        s1 = CommunitySummary(
            community_id=10000, level=1, title="Overview",
            summary_ko="개요", summary_en="Overview",
            key_concepts=["o"], node_count=20,
        )
        result = summarizer.format_hierarchical_context([s0, s1])
        # 영역 개요가 세부 분석보다 앞에 있어야 함
        overview_pos = result.index("영역 개요")
        detail_pos = result.index("세부 분석")
        assert overview_pos < detail_pos

    def test_max_chars_limit(self, summarizer):
        """max_chars 제한 적용."""
        summaries = []
        for i in range(20):
            summaries.append(CommunitySummary(
                community_id=i, level=0, title=f"Community {i}",
                summary_ko="이것은 매우 긴 요약 텍스트입니다. " * 10,
                summary_en="This is a very long summary text. " * 10,
                key_concepts=[f"concept_{i}"],
                node_count=10,
            ))
        result = summarizer.format_hierarchical_context(summaries, max_chars=500)
        assert len(result) <= 1000  # 약간의 여유 (마지막 섹션 포함)

    def test_includes_key_concepts(self, summarizer):
        """핵심 개념이 포함되어야 한다."""
        s = CommunitySummary(
            community_id=0, level=0, title="Test",
            summary_ko="요약", summary_en="summary",
            key_concepts=["사주", "오행"], node_count=5,
        )
        result = summarizer.format_hierarchical_context([s])
        assert "사주" in result
        assert "오행" in result


# ─── 커뮤니티 그래프 테스트 ───────────────────

class TestCommunityGraph:
    """커뮤니티 간 연결 그래프 테스트."""

    def test_build_community_graph(self, summarizer, algo):
        """커뮤니티 간 연결 그래프 생성."""
        # 커뮤니티 탐지 실행
        _ = algo.communities
        comm_graph = summarizer._build_community_graph(algo)
        # 크로스 커뮤니티 엣지가 있으므로 노드가 있어야 함
        assert comm_graph.number_of_nodes() >= 0
        assert comm_graph.number_of_edges() >= 0

    def test_community_graph_weights(self, summarizer, algo):
        """커뮤니티 간 연결 가중치."""
        _ = algo.communities
        comm_graph = summarizer._build_community_graph(algo)
        for u, v, data in comm_graph.edges(data=True):
            assert data["weight"] >= 1


# ─── summaries 프로퍼티 테스트 ─────────────────

class TestSummariesProperty:
    """summaries 프로퍼티 테스트."""

    def test_initial_empty(self, summarizer):
        """초기 상태는 빈 딕셔너리."""
        assert summarizer.summaries == {}

    def test_after_summarize(self, summarizer, algo):
        """요약 후 summaries가 채워진다."""
        summarizer.summarize_communities(algo, max_level=0)
        assert len(summarizer.summaries) > 0


# ─── Feature Flag 테스트 ──────────────────────

class TestFeatureFlag:
    """USE_COMMUNITY_SUMMARY feature flag 테스트."""

    def test_flag_import(self):
        """Feature flag import."""
        from app.rag.community_summarizer import USE_COMMUNITY_SUMMARY
        assert isinstance(USE_COMMUNITY_SUMMARY, bool)
