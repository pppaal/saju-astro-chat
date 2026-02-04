# app/rag/community_summarizer.py
"""
커뮤니티 기반 계층적 요약 엔진 (Phase 4)
==========================================
Microsoft GraphRAG의 Map-Reduce 패턴을 적용한 계층적 요약 시스템.

Architecture:
- Level 0: 개별 커뮤니티 요약 (5-20 노드)
- Level 1: 중규모 영역 요약 (여러 커뮤니티 그룹)
- Level 2: 전체 도메인 요약

Features:
- Map: 각 커뮤니티를 독립적으로 요약 (ThreadPoolExecutor 병렬)
- Reduce: 관련 커뮤니티 요약을 상위 레벨로 통합
- LLM 비활성 시 로컬 패턴 기반 요약 생성 (테스트/오프라인용)
- USE_COMMUNITY_SUMMARY=1 환경변수로 활성화

사용 시나리오:
- "사주에서 오행의 역할은?" → Level 1+ 요약으로 빠르게 답변
- "갑목 일간의 구체적 특성은?" → Level 0 세부 노드로 답변
"""

import json
import logging
import os
from typing import List, Dict, Optional
from dataclasses import dataclass, field
from concurrent.futures import ThreadPoolExecutor
from threading import Lock

logger = logging.getLogger(__name__)

# Feature flag
USE_COMMUNITY_SUMMARY = os.environ.get("USE_COMMUNITY_SUMMARY", "1") == "1"


@dataclass
class CommunitySummary:
    """커뮤니티 계층적 요약.

    Level 0: 개별 커뮤니티 요약
    Level 1: 중규모 영역 요약 (여러 커뮤니티 통합)
    Level 2+: 전체 도메인 요약
    """
    community_id: int
    level: int
    title: str
    summary_ko: str
    summary_en: str
    key_concepts: List[str]
    node_count: int
    child_summaries: List[int] = field(default_factory=list)


class HierarchicalSummarizer:
    """커뮤니티 기반 계층적 요약 생성기.

    Microsoft GraphRAG의 Map-Reduce 패턴을 적용:
    1. Map: 각 커뮤니티를 독립적으로 요약 (병렬)
    2. Reduce: 관련 커뮤니티 요약을 상위 레벨로 통합

    use_llm=False 시 LLM 없이 로컬 패턴 기반 요약 생성.
    """

    COMMUNITY_SUMMARY_PROMPT = """당신은 점성술/사주/타로 전문가입니다.

다음 지식 그래프 커뮤니티의 노드와 관계를 분석하여 요약해주세요.

## 커뮤니티 정보
- 노드 수: {node_count}개
- 핵심 노드 (PageRank 순): {top_nodes}
- 주요 관계: {sample_edges}

## 노드 텍스트
{node_texts}

## 요청
1. 이 커뮤니티의 핵심 주제를 한 문장으로 요약 (title)
2. 3-5문장으로 이 커뮤니티가 다루는 내용 요약 (summary)
3. 핵심 개념 3-5개 나열 (key_concepts)

JSON 형식으로 응답:
{{
  "title": "...",
  "summary_ko": "...",
  "summary_en": "...",
  "key_concepts": ["...", "...", "..."]
}}"""

    def __init__(
        self,
        llm_provider: str = "openai",
        llm_model: str = "gpt-4o-mini",
        max_workers: int = 4,
        use_llm: bool = True,
    ):
        self.llm_provider = llm_provider
        self.llm_model = llm_model
        self.max_workers = max_workers
        self.use_llm = use_llm
        self._summaries: Dict[int, CommunitySummary] = {}

    @property
    def summaries(self) -> Dict[int, CommunitySummary]:
        """현재 저장된 요약 반환."""
        return self._summaries

    def summarize_communities(
        self,
        graph_algorithms,
        max_level: int = 2,
    ) -> Dict[int, CommunitySummary]:
        """전체 커뮤니티 계층적 요약 생성.

        Level 0: 개별 커뮤니티 요약 (병렬 처리)
        Level 1+: 상위 레벨 요약 (하위 요약 통합)

        Args:
            graph_algorithms: GraphAlgorithms 인스턴스
            max_level: 최대 계층 레벨

        Returns:
            community_id -> CommunitySummary 딕셔너리
        """
        algo = graph_algorithms

        # Level 0: 각 커뮤니티 독립 요약
        logger.info("Level 0 커뮤니티 요약 시작...")
        community_map = algo.community_map
        community_ids = list(community_map.keys())

        with ThreadPoolExecutor(max_workers=self.max_workers) as pool:
            futures = {}
            for comm_id in community_ids:
                comm_data = algo.get_community_summary(comm_id)
                if comm_data and comm_data.get("size", 0) >= 3:
                    futures[comm_id] = pool.submit(
                        self._summarize_single_community,
                        comm_id,
                        comm_data,
                        level=0,
                    )

            for comm_id, future in futures.items():
                try:
                    summary = future.result(timeout=30)
                    if summary:
                        self._summaries[comm_id] = summary
                except Exception as e:
                    logger.warning("커뮤니티 %d 요약 실패: %s", comm_id, e)

        logger.info("Level 0 완료: %d개 커뮤니티 요약됨", len(self._summaries))

        # Level 1+: 상위 레벨 요약 (유사 커뮤니티 그룹화)
        if max_level >= 1 and len(self._summaries) > 3:
            self._build_higher_levels(algo, max_level)

        return self._summaries

    def _summarize_single_community(
        self,
        community_id: int,
        community_data: Dict,
        level: int = 0,
    ) -> Optional[CommunitySummary]:
        """단일 커뮤니티 요약 생성.

        use_llm=True: LLM으로 요약
        use_llm=False: 로컬 패턴 기반 요약
        """
        try:
            top_nodes = community_data.get("top_nodes", [])
            sample_edges = community_data.get("sample_edges", [])
            node_count = community_data.get("size", 0)
            leader = community_data.get("leader", "")

            if self.use_llm:
                return self._summarize_with_llm(
                    community_id, community_data, top_nodes, sample_edges, level
                )
            else:
                return self._summarize_local(
                    community_id, top_nodes, sample_edges, node_count, leader, level
                )

        except Exception as e:
            logger.warning("커뮤니티 %d 요약 실패: %s", community_id, e)
            return None

    def _summarize_with_llm(
        self,
        community_id: int,
        community_data: Dict,
        top_nodes: List,
        sample_edges: List,
        level: int,
    ) -> Optional[CommunitySummary]:
        """LLM 기반 커뮤니티 요약."""
        node_texts = "\n".join([
            f"- {node}: (PageRank={score:.6f})"
            for node, score in top_nodes[:15]
        ])

        edge_texts = "\n".join([
            f"  {e['source']} --[{e['relation']}]--> {e['target']}"
            for e in sample_edges[:10]
        ])

        prompt = self.COMMUNITY_SUMMARY_PROMPT.format(
            node_count=community_data.get("size", 0),
            top_nodes=", ".join([n for n, _ in top_nodes[:5]]),
            sample_edges=edge_texts,
            node_texts=node_texts,
        )

        result = self._call_llm(prompt)
        if not result:
            return None

        return CommunitySummary(
            community_id=community_id,
            level=level,
            title=result.get("title", f"Community {community_id}"),
            summary_ko=result.get("summary_ko", ""),
            summary_en=result.get("summary_en", ""),
            key_concepts=result.get("key_concepts", []),
            node_count=community_data.get("size", 0),
        )

    def _summarize_local(
        self,
        community_id: int,
        top_nodes: List,
        sample_edges: List,
        node_count: int,
        leader: str,
        level: int,
    ) -> CommunitySummary:
        """로컬 패턴 기반 커뮤니티 요약 (LLM 없이).

        top_nodes와 edge relation 정보를 조합하여 요약 생성.
        """
        # 핵심 개념: 상위 노드 이름
        key_concepts = [n for n, _ in top_nodes[:5]]

        # 관계 유형 수집
        relations = set()
        for e in sample_edges[:20]:
            rel = e.get("relation", "")
            if rel:
                relations.add(rel)

        # 타이틀: leader + 관계 기반
        if leader:
            title = f"{leader} 중심 커뮤니티 ({node_count}개 노드)"
        elif key_concepts:
            title = f"{key_concepts[0]} 관련 커뮤니티 ({node_count}개 노드)"
        else:
            title = f"커뮤니티 {community_id} ({node_count}개 노드)"

        # 요약: 노드 목록 + 관계 패턴
        node_list = ", ".join(key_concepts[:5])
        rel_list = ", ".join(list(relations)[:5]) if relations else "관련"

        summary_ko = (
            f"이 커뮤니티는 {node_list} 등 {node_count}개 노드로 구성됩니다. "
            f"주요 관계는 {rel_list} 등이며, "
            f"중심 노드는 {leader}입니다."
        )

        summary_en = (
            f"This community consists of {node_count} nodes including {node_list}. "
            f"Key relations include {rel_list}, "
            f"centered around {leader}."
        )

        return CommunitySummary(
            community_id=community_id,
            level=level,
            title=title,
            summary_ko=summary_ko,
            summary_en=summary_en,
            key_concepts=key_concepts,
            node_count=node_count,
        )

    def _build_higher_levels(self, algo, max_level: int):
        """상위 레벨 요약 생성 (Map-Reduce 패턴).

        관련 커뮤니티들을 그룹화하여 상위 요약 생성.
        그룹화 기준: 커뮤니티 간 엣지 밀도 (Louvain).
        """
        comm_graph = self._build_community_graph(algo)

        if len(comm_graph.nodes()) <= 1:
            return

        try:
            import networkx as nx
            higher_communities = nx.community.louvain_communities(
                comm_graph, resolution=0.5, seed=42
            )

            for i, group in enumerate(higher_communities):
                if len(group) < 2:
                    continue

                child_summaries = [
                    self._summaries[cid]
                    for cid in group
                    if cid in self._summaries
                ]

                if not child_summaries:
                    continue

                if self.use_llm:
                    meta_summary = self._build_higher_with_llm(child_summaries)
                else:
                    meta_summary = self._build_higher_local(child_summaries, i)

                if meta_summary:
                    meta_id = 10000 + i
                    total_nodes = sum(s.node_count for s in child_summaries)
                    self._summaries[meta_id] = CommunitySummary(
                        community_id=meta_id,
                        level=1,
                        title=meta_summary.get("title", f"Group {i}"),
                        summary_ko=meta_summary.get("summary_ko", ""),
                        summary_en=meta_summary.get("summary_en", ""),
                        key_concepts=meta_summary.get("key_concepts", []),
                        node_count=total_nodes,
                        child_summaries=list(group),
                    )

            logger.info(
                "상위 레벨 요약 완료: %d개 그룹",
                sum(1 for s in self._summaries.values() if s.level > 0)
            )

        except Exception as e:
            logger.warning("상위 레벨 요약 실패: %s", e)

    def _build_higher_with_llm(self, child_summaries: List[CommunitySummary]) -> Optional[Dict]:
        """LLM 기반 상위 레벨 요약."""
        combined_text = "\n".join([
            f"- {s.title}: {s.summary_ko[:100]}"
            for s in child_summaries
        ])

        return self._call_llm(
            f"다음 하위 그룹들을 통합하여 상위 요약을 만들어주세요:\n{combined_text}\n\n"
            f'JSON: {{"title": "...", "summary_ko": "...", "summary_en": "...", "key_concepts": [...]}}'
        )

    def _build_higher_local(self, child_summaries: List[CommunitySummary], group_idx: int) -> Dict:
        """로컬 기반 상위 레벨 요약."""
        all_concepts = []
        all_titles = []

        for s in child_summaries:
            all_concepts.extend(s.key_concepts)
            all_titles.append(s.title)

        # 중복 제거하며 순서 유지
        seen = set()
        unique_concepts = []
        for c in all_concepts:
            if c not in seen:
                seen.add(c)
                unique_concepts.append(c)

        key_concepts = unique_concepts[:5]
        total_nodes = sum(s.node_count for s in child_summaries)

        title = f"{key_concepts[0]} 영역 통합 ({len(child_summaries)}개 커뮤니티)" if key_concepts else f"그룹 {group_idx}"
        titles_str = ", ".join(all_titles[:3])

        summary_ko = (
            f"이 영역은 {titles_str} 등 {len(child_summaries)}개 커뮤니티를 포함하며, "
            f"총 {total_nodes}개 노드를 다룹니다. "
            f"핵심 개념은 {', '.join(key_concepts)}입니다."
        )

        summary_en = (
            f"This area encompasses {len(child_summaries)} communities "
            f"covering {total_nodes} nodes. "
            f"Key concepts: {', '.join(key_concepts)}."
        )

        return {
            "title": title,
            "summary_ko": summary_ko,
            "summary_en": summary_en,
            "key_concepts": key_concepts,
        }

    def _build_community_graph(self, algo):
        """커뮤니티 간 연결 그래프 구축."""
        import networkx as nx

        comm_graph = nx.Graph()
        communities = algo.communities

        for u, v, _ in algo.graph.edges(data=True):
            cu = communities.get(u, -1)
            cv = communities.get(v, -1)
            if cu != cv and cu >= 0 and cv >= 0:
                if comm_graph.has_edge(cu, cv):
                    comm_graph[cu][cv]["weight"] += 1
                else:
                    comm_graph.add_edge(cu, cv, weight=1)

        return comm_graph

    def _call_llm(self, prompt: str) -> Optional[Dict]:
        """LLM 호출 (JSON 응답 파싱)."""
        try:
            if self.llm_provider == "openai":
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model=self.llm_model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0,
                    max_tokens=500,
                    response_format={"type": "json_object"},
                )
                return json.loads(response.choices[0].message.content)

            elif self.llm_provider == "anthropic":
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-5-haiku-20241022",
                    max_tokens=500,
                    messages=[{"role": "user", "content": prompt + "\nJSON으로만 응답하세요."}],
                )
                text = response.content[0].text
                if "```json" in text:
                    text = text.split("```json")[1].split("```")[0]
                elif "```" in text:
                    text = text.split("```")[1].split("```")[0]
                return json.loads(text.strip())

        except Exception as e:
            logger.warning("LLM 호출 실패: %s", e)
            return None

    def get_relevant_summaries(
        self,
        query: str,
        top_k: int = 3,
    ) -> List[CommunitySummary]:
        """쿼리에 관련된 커뮤니티 요약 검색.

        키워드 매칭 기반 (key_concepts, title, summary 검색).
        """
        query_lower = query.lower()
        scored = []

        for summary in self._summaries.values():
            score = 0.0
            # key_concepts 매칭 (높은 가중치)
            for concept in summary.key_concepts:
                if concept.lower() in query_lower or query_lower in concept.lower():
                    score += 2.0

            # title 매칭
            query_words = [w for w in query_lower.split() if len(w) > 1]
            for kw in query_words:
                if kw in summary.title.lower():
                    score += 1.0

            # summary_ko 매칭
            for kw in query_words:
                if kw in summary.summary_ko.lower():
                    score += 0.5

            if score > 0:
                scored.append((summary, score))

        scored.sort(key=lambda x: (-x[1], x[0].level))
        return [s for s, _ in scored[:top_k]]

    def format_hierarchical_context(
        self,
        summaries: List[CommunitySummary],
        max_chars: int = 3000,
    ) -> str:
        """계층적 요약을 LLM 프롬프트용 컨텍스트로 포맷팅.

        Level 1+ (상위) → Level 0 (하위) 순서로 배치하여
        LLM이 큰 그림 → 세부 사항 순으로 이해하도록 한다.
        """
        if not summaries:
            return ""

        by_level = sorted(summaries, key=lambda s: s.level, reverse=True)

        parts = ["## 지식 그래프 컨텍스트\n"]
        total_chars = 0

        for summary in by_level:
            level_label = "영역 개요" if summary.level > 0 else "세부 분석"
            section = (
                f"\n### [{level_label}] {summary.title}\n"
                f"{summary.summary_ko}\n"
                f"핵심 개념: {', '.join(summary.key_concepts)}\n"
            )

            if total_chars + len(section) > max_chars:
                break

            parts.append(section)
            total_chars += len(section)

        return "\n".join(parts)


# ─── 싱글톤 ─────────────────────────────────────
_summarizer: Optional[HierarchicalSummarizer] = None
_summarizer_lock = Lock()


def get_hierarchical_summarizer(
    use_llm: bool = True,
) -> HierarchicalSummarizer:
    """싱글톤 HierarchicalSummarizer 반환."""
    global _summarizer
    if _summarizer is None:
        with _summarizer_lock:
            if _summarizer is None:
                _summarizer = HierarchicalSummarizer(use_llm=use_llm)
    return _summarizer
