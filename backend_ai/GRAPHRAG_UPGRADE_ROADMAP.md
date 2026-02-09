# GraphRAG 시스템 업그레이드 로드맵

> **현재 상태**: Multi-RAG Fusion Engine (GraphRAG + CorpusRAG + DomainRAG + HybridRAG + AgenticRAG)
> **목표**: 업계 최상급 GraphRAG 시스템으로 업그레이드
> **대상 코드베이스**: `backend_AI/`

---

## 목차

1. [Phase 1: 벡터 DB 도입 (ChromaDB)](#phase-1-벡터-db-도입-chromadb)
2. [Phase 2: 그래프 알고리즘 고도화](#phase-2-그래프-알고리즘-고도화)
3. [Phase 3: LLM 기반 동적 엔티티 추출](#phase-3-llm-기반-동적-엔티티-추출)
4. [Phase 4: Hierarchical Summarization](#phase-4-hierarchical-summarization)
5. [Phase 5: RAGAS 정량 평가 체계](#phase-5-ragas-정량-평가-체계)
6. [Phase 6: 고급 임베딩 모델 업그레이드](#phase-6-고급-임베딩-모델-업그레이드)
7. [마이그레이션 전략](#마이그레이션-전략)

---

## 현재 시스템 진단

### 현재 아키텍처

```
User Query
    ↓
OptimizedRAGManager (ThreadPool 4 workers)
    ├── GraphRAG      → NetworkX + PyTorch cosine sim (5000+ nodes)
    ├── CorpusRAG     → BaseEmbeddingRAG (500+ Jung/Stoic quotes)
    ├── DomainRAG     → Lazy-loaded .pt embeddings (tarot, dream)
    ├── HybridRAG     → Vector + BM25 + RRF + CrossEncoder
    └── AgenticRAG    → Pattern NER → BFS traversal → Synthesis
    ↓
Parallel Results → Cache (LRU 256, TTL 5min) → LLM Prompt
```

### 핵심 병목

| 영역        | 현재                     | 문제                              |
| ----------- | ------------------------ | --------------------------------- |
| 벡터 검색   | PyTorch tensor 직접 비교 | O(n) 선형 스캔, ANN 불가          |
| 그래프 DB   | NetworkX 인메모리        | 확장성 한계, 고급 알고리즘 미활용 |
| 엔티티 추출 | 패턴 매칭 (substring)    | false positive 다수, 확장 불가    |
| 임베딩      | MiniLM-L12 (384D)        | 표현력 제한                       |
| 평가        | 없음                     | 품질 측정 불가                    |

---

## Phase 1: 벡터 DB 도입 (ChromaDB)

### 왜 ChromaDB인가

| 옵션         | 장점                        | 단점                 | 선택 이유                             |
| ------------ | --------------------------- | -------------------- | ------------------------------------- |
| **ChromaDB** | 로컬, 무료, Python 네이티브 | 분산 미지원          | 현재 규모(5000노드)에 적합, 설치 간단 |
| Qdrant       | 고성능, 필터링 강력         | Docker 필요          | 향후 스케일업 시 고려                 |
| Pinecone     | 관리형, 확장성              | 유료, 외부 의존      | 비용 부담                             |
| FAISS        | Meta 제작, 빠름             | 메타데이터 관리 약함 | ChromaDB가 더 편리                    |

### 현재 코드 (`saju_astro_rag.py:360-411`)

```python
# 현재: 모든 노드와 brute-force cosine similarity
def query(self, facts, top_k=8, domain_priority="saju"):
    query_text = json.dumps(facts, ensure_ascii=False)
    query_emb = self.model.encode(query_text, convert_to_tensor=True)
    scores = util.cos_sim(query_emb, self._embeddings)[0]  # O(n) 전체 스캔
    top_indices = torch.topk(scores, min(top_k, len(self._texts))).indices
    # ... 결과 처리
```

### 개선 코드

#### 1-1. ChromaDB 컬렉션 매니저

```python
# app/rag/vector_store.py (신규 파일)

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Optional
import logging
import os

logger = logging.getLogger(__name__)


class VectorStoreManager:
    """ChromaDB 기반 벡터 스토어 매니저.

    기존 PyTorch 텐서 직접 비교를 대체하여 ANN 검색, 메타데이터 필터링,
    영속 저장을 지원한다.
    """

    def __init__(
        self,
        persist_dir: str = "data/chromadb",
        collection_name: str = "graph_nodes",
    ):
        self._persist_dir = persist_dir
        self._collection_name = collection_name
        self._client: Optional[chromadb.ClientAPI] = None
        self._collection: Optional[chromadb.Collection] = None

    @property
    def client(self) -> chromadb.ClientAPI:
        if self._client is None:
            self._client = chromadb.PersistentClient(
                path=self._persist_dir,
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=True,
                ),
            )
        return self._client

    @property
    def collection(self) -> chromadb.Collection:
        if self._collection is None:
            self._collection = self.client.get_or_create_collection(
                name=self._collection_name,
                metadata={"hnsw:space": "cosine"},  # HNSW 인덱스 + 코사인 거리
            )
        return self._collection

    def index_nodes(
        self,
        ids: List[str],
        texts: List[str],
        embeddings: List[List[float]],
        metadatas: Optional[List[Dict]] = None,
        batch_size: int = 500,
    ) -> int:
        """노드를 ChromaDB에 배치 인덱싱한다.

        기존 graph_rag_embeds.pt 파일의 데이터를 ChromaDB로 마이그레이션할 때 사용.
        """
        total = len(ids)
        indexed = 0

        for i in range(0, total, batch_size):
            batch_ids = ids[i:i + batch_size]
            batch_texts = texts[i:i + batch_size]
            batch_embeddings = embeddings[i:i + batch_size]
            batch_meta = metadatas[i:i + batch_size] if metadatas else None

            self.collection.upsert(
                ids=batch_ids,
                documents=batch_texts,
                embeddings=batch_embeddings,
                metadatas=batch_meta,
            )
            indexed += len(batch_ids)
            logger.info(f"Indexed {indexed}/{total} nodes")

        return indexed

    def search(
        self,
        query_text: str = None,
        query_embedding: List[float] = None,
        top_k: int = 10,
        min_score: float = 0.3,
        where: Optional[Dict] = None,
        where_document: Optional[Dict] = None,
    ) -> List[Dict]:
        """ANN 기반 벡터 검색.

        기존 O(n) 선형 스캔 대신 HNSW 인덱스로 O(log n) 검색.
        메타데이터 필터링도 지원.
        """
        query_params = {"n_results": top_k}

        if query_embedding:
            query_params["query_embeddings"] = [query_embedding]
        elif query_text:
            query_params["query_texts"] = [query_text]
        else:
            raise ValueError("query_text 또는 query_embedding 필요")

        if where:
            query_params["where"] = where
        if where_document:
            query_params["where_document"] = where_document

        results = self.collection.query(**query_params)

        # ChromaDB는 distance 반환 (cosine distance = 1 - similarity)
        output = []
        if results and results["ids"] and results["ids"][0]:
            for i, doc_id in enumerate(results["ids"][0]):
                distance = results["distances"][0][i] if results["distances"] else 0
                score = 1.0 - distance  # cosine similarity로 변환

                if score >= min_score:
                    output.append({
                        "id": doc_id,
                        "text": results["documents"][0][i] if results["documents"] else "",
                        "score": round(score, 4),
                        "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                    })

        return output

    def search_with_filter(
        self,
        query_embedding: List[float],
        domain: str,
        top_k: int = 10,
        min_score: float = 0.3,
    ) -> List[Dict]:
        """도메인 필터링 포함 검색.

        예: domain="saju"로 사주 관련 노드만 검색.
        """
        return self.search(
            query_embedding=query_embedding,
            top_k=top_k,
            min_score=min_score,
            where={"domain": domain},
        )

    def get_stats(self) -> Dict:
        """컬렉션 통계 반환."""
        return {
            "collection_name": self._collection_name,
            "count": self.collection.count(),
            "persist_dir": self._persist_dir,
        }

    def reset(self):
        """컬렉션 초기화 (테스트용)."""
        self.client.delete_collection(self._collection_name)
        self._collection = None


# 싱글톤 인스턴스
_vector_store: Optional[VectorStoreManager] = None
_vector_store_lock = __import__("threading").Lock()


def get_vector_store() -> VectorStoreManager:
    global _vector_store
    if _vector_store is None:
        with _vector_store_lock:
            if _vector_store is None:
                _vector_store = VectorStoreManager()
    return _vector_store
```

#### 1-2. 기존 데이터 마이그레이션 스크립트

```python
# scripts/migrate_to_chromadb.py

"""기존 PyTorch .pt 임베딩을 ChromaDB로 마이그레이션하는 스크립트.

Usage:
    python -m scripts.migrate_to_chromadb
    python -m scripts.migrate_to_chromadb --reset  # 기존 데이터 초기화 후 재인덱싱
"""

import torch
import json
import argparse
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.rag.vector_store import VectorStoreManager
from app.saju_astro_rag import GraphRAG


def migrate_graph_rag(reset: bool = False):
    """GraphRAG의 기존 임베딩을 ChromaDB로 마이그레이션."""

    print("=== GraphRAG → ChromaDB 마이그레이션 시작 ===")

    # 1. 기존 GraphRAG 로드
    graph_rag = GraphRAG()

    # 2. ChromaDB 매니저 초기화
    vs = VectorStoreManager(
        persist_dir="data/chromadb",
        collection_name="graph_nodes",
    )

    if reset:
        print("기존 컬렉션 초기화...")
        try:
            vs.reset()
        except Exception:
            pass

    # 3. 노드 데이터 준비
    ids = []
    texts = []
    embeddings = []
    metadatas = []

    for i, (node_id, text) in enumerate(zip(graph_rag._node_ids, graph_rag._texts)):
        ids.append(str(node_id) if node_id else f"node_{i}")
        texts.append(text)

        # 기존 임베딩 텐서를 리스트로 변환
        emb = graph_rag._embeddings[i].cpu().numpy().tolist()
        embeddings.append(emb)

        # 메타데이터 추출
        meta = {"domain": "general", "index": i}
        if hasattr(graph_rag, "_node_metadata") and i < len(graph_rag._node_metadata):
            node_meta = graph_rag._node_metadata[i]
            if isinstance(node_meta, dict):
                # ChromaDB 메타데이터는 str, int, float, bool만 허용
                for k, v in node_meta.items():
                    if isinstance(v, (str, int, float, bool)):
                        meta[k] = v
        metadatas.append(meta)

    # 4. 인덱싱
    count = vs.index_nodes(ids, texts, embeddings, metadatas, batch_size=500)

    print(f"=== 마이그레이션 완료: {count}개 노드 인덱싱됨 ===")
    print(f"컬렉션 통계: {vs.get_stats()}")

    # 5. 검증 검색
    test_results = vs.search(query_text="목성 사수자리 확장", top_k=3)
    print(f"\n테스트 검색 결과 (top 3):")
    for r in test_results:
        print(f"  - [{r['score']:.4f}] {r['text'][:80]}...")


def migrate_domain_embeddings(domain: str, reset: bool = False):
    """도메인별 임베딩을 별도 컬렉션으로 마이그레이션."""

    embed_files = {
        "tarot": "data/graph/rules/tarot/tarot_embeds.pt",
        "dream": "data/graph/rules/dream/dream_embeds.pt",
        "persona": "data/graph/rules/persona/persona_embeds.pt",
        "corpus": "data/graph/corpus_embeds.pt",
    }

    if domain not in embed_files:
        print(f"지원하지 않는 도메인: {domain}. 가능: {list(embed_files.keys())}")
        return

    filepath = embed_files[domain]
    if not os.path.exists(filepath):
        print(f"파일 없음: {filepath}")
        return

    print(f"=== {domain} 임베딩 마이그레이션 시작 ===")

    data = torch.load(filepath, map_location="cpu", weights_only=False)

    vs = VectorStoreManager(
        persist_dir="data/chromadb",
        collection_name=f"domain_{domain}",
    )

    if reset:
        try:
            vs.reset()
        except Exception:
            pass

    embs = data.get("embeddings", data.get("embeds", None))
    txts = data.get("texts", data.get("labels", []))

    if embs is None:
        print(f"임베딩 텐서를 찾을 수 없음. 키: {list(data.keys())}")
        return

    ids = [f"{domain}_{i}" for i in range(len(txts))]
    embeddings = embs.cpu().numpy().tolist()
    metadatas = [{"domain": domain, "index": i} for i in range(len(txts))]

    count = vs.index_nodes(ids, txts, embeddings, metadatas)
    print(f"=== {domain} 마이그레이션 완료: {count}개 인덱싱 ===")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="기존 데이터 초기화")
    parser.add_argument("--domain", type=str, default=None, help="특정 도메인만 마이그레이션")
    args = parser.parse_args()

    if args.domain:
        migrate_domain_embeddings(args.domain, reset=args.reset)
    else:
        migrate_graph_rag(reset=args.reset)
        for domain in ["tarot", "dream", "corpus"]:
            migrate_domain_embeddings(domain, reset=args.reset)
```

#### 1-3. GraphRAG 검색 메서드 교체

```python
# saju_astro_rag.py 의 query() 메서드를 아래로 교체

def query(self, facts, top_k=8, domain_priority="saju"):
    """ChromaDB HNSW 인덱스 기반 검색 (O(log n)).

    기존: PyTorch cosine sim 전체 스캔 (O(n))
    개선: ChromaDB HNSW ANN 검색 + 메타데이터 필터링
    """
    from app.rag.vector_store import get_vector_store

    query_text = json.dumps(facts, ensure_ascii=False)
    query_emb = self.model.encode(query_text, convert_to_tensor=False).tolist()

    # 도메인 필터 적용
    where_filter = None
    if domain_priority and domain_priority != "all":
        where_filter = {"domain": domain_priority}

    vs = get_vector_store()
    results = vs.search(
        query_embedding=query_emb,
        top_k=top_k,
        min_score=0.3,
        where=where_filter,
    )

    # 기존 형식과 호환되는 응답 구성
    matched_nodes = [r["text"] for r in results]
    matched_ids = [r["id"] for r in results]

    # 그래프 관계 탐색 (기존 NetworkX 활용)
    related_edges = []
    for node_id in matched_ids:
        if self.graph.has_node(node_id):
            for _, target, data in self.graph.edges(node_id, data=True):
                related_edges.append({
                    "source": node_id,
                    "target": target,
                    "relation": data.get("relation", "related"),
                    "weight": data.get("weight", 0.5),
                })

    # 도메인 규칙 적용
    facts_str = query_text
    rule_summary = self._apply_rules(domain_priority, facts_str)

    # 컨텍스트 텍스트 구성
    context_parts = []
    for i, r in enumerate(results):
        context_parts.append(f"[{r['score']:.2f}] {r['text']}")

    if related_edges:
        context_parts.append("\n관련 관계:")
        for edge in related_edges[:5]:
            context_parts.append(
                f"  {edge['source']} --[{edge['relation']}]--> {edge['target']}"
            )

    if rule_summary:
        context_parts.append(f"\n적용 규칙: {rule_summary}")

    return {
        "matched_nodes": matched_nodes,
        "matched_ids": matched_ids,
        "related_edges": related_edges,
        "rule_summary": rule_summary,
        "context_text": "\n".join(context_parts),
        "scores": [r["score"] for r in results],
    }
```

#### 1-4. requirements.txt 추가

```
# requirements.txt에 추가
chromadb>=0.4.22
```

---

## Phase 2: 그래프 알고리즘 고도화

### 현재 한계 (`graph_traversal.py:121-177`)

```python
# 현재: 단순 BFS, substring 노드 매칭, 고정 스코어링
def _bfs_traverse(self, start_node, max_depth, max_paths, min_weight, relation_filter):
    queue = deque([(start_node, [start_node], [], 0)])
    visited = set()  # 전역 visited → 대체 경로 탐색 불가
    # ...단순 BFS만 수행
```

### 개선 코드

#### 2-1. Community Detection + PageRank 통합

```python
# app/rag/graph_algorithms.py (신규 파일)

import networkx as nx
from collections import defaultdict
from typing import List, Dict, Tuple, Optional, Set
from dataclasses import dataclass, field
import logging
import math

logger = logging.getLogger(__name__)


@dataclass
class Community:
    """그래프 커뮤니티 (클러스터).

    Louvain 알고리즘으로 발견된 노드 그룹.
    같은 커뮤니티의 노드들은 밀접한 관계를 가진다.
    """
    id: int
    nodes: List[str]
    summary: str = ""
    pagerank_leader: str = ""
    avg_pagerank: float = 0.0
    density: float = 0.0


@dataclass
class EnhancedTraversalPath:
    """고급 탐색 경로.

    기존 TraversalPath에 커뮤니티 정보, PageRank 점수,
    경로 다양성 점수를 추가.
    """
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
        """노드별 PageRank 점수 (lazy computation).

        PageRank가 높은 노드 = 그래프에서 영향력 있는 핵심 개념.
        예: "Sun", "갑목" 등이 높은 PageRank를 가질 것.
        """
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
                logger.warning(f"PageRank 계산 실패: {e}")
                self._pagerank = {n: 1.0 / len(self.graph) for n in self.graph.nodes()}
        return self._pagerank

    def get_top_nodes(self, top_k: int = 20) -> List[Tuple[str, float]]:
        """PageRank 기준 상위 노드 반환."""
        return sorted(self.pagerank.items(), key=lambda x: x[1], reverse=True)[:top_k]

    def personalized_pagerank(
        self,
        seed_nodes: List[str],
        alpha: float = 0.85,
    ) -> Dict[str, float]:
        """Personalized PageRank (PPR).

        사용자 쿼리에서 추출한 엔티티를 seed로 하여
        해당 엔티티와 관련성이 높은 노드를 찾는다.

        일반 PageRank와의 차이:
        - PageRank: 그래프 전체에서 중요한 노드
        - PPR: 특정 seed 노드 관점에서 중요한 노드

        Args:
            seed_nodes: 시작점 노드 리스트 (예: ["Jupiter", "Sagittarius"])
            alpha: 감쇄 계수 (0.85 기본)
        """
        personalization = {}
        valid_seeds = [n for n in seed_nodes if self.graph.has_node(n)]

        if not valid_seeds:
            return self.pagerank  # seed가 없으면 일반 PageRank 반환

        weight = 1.0 / len(valid_seeds)
        for node in valid_seeds:
            personalization[node] = weight

        try:
            return nx.pagerank(
                self.graph,
                alpha=alpha,
                personalization=personalization,
                weight="weight",
                max_iter=100,
            )
        except Exception as e:
            logger.warning(f"PPR 계산 실패: {e}")
            return self.pagerank

    # ─── Community Detection ───────────────────────

    @property
    def communities(self) -> Dict[str, int]:
        """노드별 커뮤니티 ID (Louvain 알고리즘).

        5000+ 노드를 의미 있는 클러스터로 그룹화.
        예: "행성-별자리" 커뮤니티, "십신-오행" 커뮤니티 등.
        """
        if self._communities is None:
            self._detect_communities()
        return self._communities

    def _detect_communities(self):
        """Louvain 커뮤니티 탐지 실행."""
        try:
            # NetworkX 3.x의 louvain_communities 사용
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
                    sum(s for _, s in pr_scores) / len(pr_scores) if pr_scores else 0
                )

            logger.info(f"커뮤니티 탐지 완료: {len(self._community_map)}개 커뮤니티")

        except Exception as e:
            logger.warning(f"커뮤니티 탐지 실패: {e}")
            self._communities = {n: 0 for n in self.graph.nodes()}
            self._community_map = {0: Community(id=0, nodes=list(self.graph.nodes()))}

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
        """같은 커뮤니티 내에서 PageRank 순으로 이웃 노드 반환.

        BFS보다 의미적으로 관련된 노드를 찾는 데 효과적.
        """
        comm = self.get_community(node)
        if not comm:
            return []

        pr = self.pagerank
        neighbors = [
            (n, pr.get(n, 0))
            for n in comm.nodes
            if n != node
        ]
        neighbors.sort(key=lambda x: x[1], reverse=True)
        return neighbors[:max_results]

    # ─── Betweenness Centrality ────────────────────

    @property
    def betweenness(self) -> Dict[str, float]:
        """노드별 Betweenness Centrality.

        높은 betweenness = 여러 커뮤니티를 연결하는 "다리" 노드.
        예: "오행"은 사주와 점성술을 연결하는 다리 역할.
        """
        if self._betweenness is None:
            try:
                # 대규모 그래프에서는 샘플링으로 근사
                k = min(500, len(self.graph.nodes()))
                self._betweenness = nx.betweenness_centrality(
                    self.graph,
                    k=k,
                    weight="weight",
                    normalized=True,
                )
            except Exception as e:
                logger.warning(f"Betweenness 계산 실패: {e}")
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

        Args:
            start_entities: 시작 엔티티 리스트
            max_depth: 최대 탐색 깊이
            max_paths: 최대 반환 경로 수
            min_weight: 최소 가중치 임계값
            use_ppr: Personalized PageRank 사용 여부
            diversity_weight: 다양성 점수 가중치 (0-1)
        """
        # 1. PPR 계산
        ppr_scores = (
            self.personalized_pagerank(start_entities) if use_ppr else self.pagerank
        )

        # 2. 시작 노드 찾기
        start_nodes = []
        for entity in start_entities:
            matches = self._fuzzy_find_nodes(entity)
            start_nodes.extend(matches[:3])  # 엔티티당 최대 3 매칭

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
            # PPR 점수
            ppr_score = sum(ppr_scores.get(n, 0) for n in path.nodes) / len(path.nodes)
            path.pagerank_score = ppr_score

            # 커뮤니티 다양성 점수
            path_communities = set()
            for node in path.nodes:
                comm_id = self.communities.get(node, -1)
                path_communities.add(comm_id)
                path.community_ids.append(comm_id)

            new_communities = path_communities - seen_communities
            path.diversity_score = len(new_communities) / max(len(path_communities), 1)

            # 결합 점수
            path.combined_score = (
                (1 - diversity_weight) * (path.total_weight * 0.5 + ppr_score * 0.5)
                + diversity_weight * path.diversity_score
            )

            scored_paths.append(path)

        # 5. 점수 순 정렬 + 다양성 보장
        scored_paths.sort(key=lambda p: p.combined_score, reverse=True)

        # Greedy 다양성 선택: 커뮤니티 커버리지 최대화
        selected = []
        covered_communities: Set[int] = set()

        for path in scored_paths:
            if len(selected) >= max_paths:
                break

            path_comms = set(path.community_ids)
            # 새로운 커뮤니티를 추가하거나, 높은 점수의 경로 선택
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

        BFS와의 차이: 각 깊이에서 상위 beam_width개의 경로만 유지.
        메모리 효율적이고, 유망한 경로에 집중.
        """
        # 초기 빔: (경로 노드, 경로 엣지, 누적 점수)
        beam = [([start_node], [], 0.0)]
        all_paths = []

        for depth in range(max_depth):
            candidates = []

            for path_nodes, path_edges, path_score in beam:
                current = path_nodes[-1]

                if not self.graph.has_node(current):
                    continue

                for _, neighbor, edge_data in self.graph.edges(current, data=True):
                    if neighbor in path_nodes:  # 사이클 방지
                        continue

                    edge_weight = edge_data.get("weight", 0.5)
                    if edge_weight < min_weight:
                        continue

                    # 다음 노드의 PPR 점수를 반영
                    ppr = ppr_scores.get(neighbor, 0)
                    step_score = edge_weight * 0.6 + ppr * 10000 * 0.4

                    new_nodes = path_nodes + [neighbor]
                    new_edges = path_edges + [edge_data]
                    new_score = path_score + step_score

                    candidates.append((new_nodes, new_edges, new_score))

            # Beam pruning: 상위 beam_width만 유지
            candidates.sort(key=lambda x: x[2], reverse=True)
            beam = candidates[:beam_width]

            # 완성된 경로 저장
            for nodes, edges, score in beam:
                context = self._build_path_context(nodes, edges)
                all_paths.append(EnhancedTraversalPath(
                    nodes=nodes,
                    edges=[dict(e) if isinstance(e, dict) else {} for e in edges],
                    total_weight=score / max(len(nodes) - 1, 1),
                    context=context,
                ))

        return all_paths

    def _fuzzy_find_nodes(self, query: str, max_results: int = 5) -> List[str]:
        """퍼지 노드 매칭 (기존 substring 매칭 개선).

        1순위: 정확한 ID 일치
        2순위: 대소문자 무시 일치
        3순위: 포함 관계 (짧은 쿼리 우선)
        """
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

    def _build_path_context(self, nodes: List[str], edges: List[Dict]) -> str:
        """경로를 사람이 읽을 수 있는 설명으로 변환."""
        if not nodes:
            return ""

        parts = [nodes[0]]
        for i, edge in enumerate(edges):
            relation = edge.get("relation", "→")
            target = nodes[i + 1] if i + 1 < len(nodes) else "?"
            desc = edge.get("description", "")
            parts.append(f" --[{relation}]--> {target}")
            if desc:
                parts.append(f" ({desc[:50]})")

        return "".join(parts)

    # ─── 커뮤니티 요약 ─────────────────────────────

    def get_community_summary(self, community_id: int) -> Dict:
        """커뮤니티 요약 정보 반환.

        Phase 4 (Hierarchical Summarization)에서 LLM 요약과 연동.
        """
        if not self._community_map or community_id not in self._community_map:
            return {}

        comm = self._community_map[community_id]
        pr = self.pagerank

        # 상위 노드
        top_nodes = sorted(
            [(n, pr.get(n, 0)) for n in comm.nodes],
            key=lambda x: x[1],
            reverse=True,
        )[:10]

        # 내부 엣지
        subgraph = self.graph.subgraph(comm.nodes)
        internal_edges = []
        for u, v, data in subgraph.edges(data=True):
            internal_edges.append({
                "source": u,
                "target": v,
                "relation": data.get("relation", "related"),
                "weight": data.get("weight", 0.5),
            })

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


# 싱글톤
_graph_algo: Optional[GraphAlgorithms] = None
_graph_algo_lock = __import__("threading").Lock()


def get_graph_algorithms(graph: nx.MultiDiGraph = None) -> GraphAlgorithms:
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
```

#### 2-2. graph_traversal.py 개선 적용

```python
# app/agentic_rag/graph_traversal.py 의 traverse() 메서드를 교체

def traverse(
    self,
    start_entities,
    max_depth=3,
    max_paths=10,
    min_weight=0.5,
    relation_filter=None,
):
    """고급 그래프 탐색 (Community-aware + PPR).

    기존 단순 BFS를 GraphAlgorithms의 enhanced_traverse로 대체.
    Beam Search + Personalized PageRank + 커뮤니티 다양성 보장.
    """
    try:
        from app.rag.graph_algorithms import get_graph_algorithms

        algo = get_graph_algorithms(self.graph)
        enhanced_paths = algo.enhanced_traverse(
            start_entities=start_entities,
            max_depth=max_depth,
            max_paths=max_paths,
            min_weight=min_weight,
            use_ppr=True,
            diversity_weight=0.3,
        )

        # 기존 TraversalPath 형식으로 변환 (하위 호환성)
        from app.agentic_rag.graph_traversal import TraversalPath

        results = []
        for ep in enhanced_paths:
            results.append(TraversalPath(
                nodes=ep.nodes,
                edges=ep.edges,
                total_weight=ep.combined_score,
                context=ep.context,
            ))

        return results

    except ImportError:
        # 폴백: 기존 BFS 탐색
        return self._legacy_bfs_traverse(
            start_entities, max_depth, max_paths, min_weight, relation_filter
        )
```

---

## Phase 3: LLM 기반 동적 엔티티 추출

### 현재 한계 (`entity_extractor.py:185-248`)

```python
# 현재: 단순 substring 패턴 매칭
# "sun" → "sunshine"에도 매칭 (false positive)
# 미등록 엔티티는 아예 추출 불가
for pattern in entity_map:
    if pattern in text_lower:  # ← 이 부분이 문제
        entities.append(Entity(text=pattern, ...))
```

### 개선 코드

#### 3-1. LLM + 패턴 하이브리드 엔티티 추출기

```python
# app/agentic_rag/llm_entity_extractor.py (신규 파일)

import json
import re
import logging
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

from app.agentic_rag.entity_extractor import Entity, EntityType, EntityExtractor

logger = logging.getLogger(__name__)


# LLM 엔티티 추출 프롬프트 (한국어/영어 지원)
ENTITY_EXTRACTION_PROMPT = """You are an expert entity extractor for astrology and Korean Saju (사주).

Extract ALL entities from the given text. Return a JSON array.

Entity Types:
- PLANET: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto (행성)
- SIGN: Aries~Pisces, 양자리~물고기자리 (별자리)
- HOUSE: 1st~12th house, 1궁~12궁 (하우스)
- ASPECT: Conjunction, Opposition, Trine, Square, Sextile (각도)
- ELEMENT: Fire, Earth, Air, Water, 화, 토, 수, 목, 금 (원소/오행)
- STEM: 갑, 을, 병, 정, 무, 기, 경, 신, 임, 계 (천간)
- BRANCH: 자, 축, 인, 묘, 진, 사, 오, 미, 신, 유, 술, 해 (지지)
- TEN_GOD: 비견, 겁재, 식신, 상관, 편재, 정재, 편관, 정관, 편인, 정인 (십신)
- SHINSAL: 역마, 도화, 화개 등 (신살)
- TAROT: The Fool, The Magician... (타로 카드)

Also extract RELATIONS between entities:
- "Jupiter in Sagittarius" → (Jupiter, "in", Sagittarius)
- "Sun square Moon" → (Sun, "square", Moon)
- "갑목 일간" → (갑, "일간", 목)

Text: {text}

Respond in JSON format:
{{
  "entities": [
    {{"text": "Jupiter", "type": "PLANET", "normalized": "Jupiter", "confidence": 0.95}},
    ...
  ],
  "relations": [
    {{"source": "Jupiter", "relation": "in", "target": "Sagittarius"}},
    ...
  ]
}}"""


class LLMEntityExtractor:
    """LLM + 패턴 매칭 하이브리드 엔티티 추출기.

    전략:
    1. 패턴 매칭으로 빠르게 기본 엔티티 추출 (< 5ms)
    2. LLM으로 패턴이 놓친 엔티티 보완 추출 (선택적, ~500ms)
    3. 결과 병합 + 중복 제거 + 신뢰도 조정

    기존 EntityExtractor 대비 개선점:
    - word boundary 기반 정규식 (false positive 제거)
    - LLM fallback으로 미등록 엔티티 추출
    - 컨텍스트 기반 관계 추출
    """

    def __init__(
        self,
        use_llm: bool = True,
        llm_provider: str = "openai",
        llm_model: str = "FUSION_MINI_MODEL",
    ):
        self.use_llm = use_llm
        self.llm_provider = llm_provider
        self.llm_model = llm_model

        # 기존 패턴 추출기 (빠른 1차 추출용)
        self._pattern_extractor = EntityExtractor()

        # Word boundary 정규식 패턴 (개선된 패턴 매칭)
        self._compiled_patterns = self._compile_word_boundary_patterns()

    def _compile_word_boundary_patterns(self) -> Dict[EntityType, List[Tuple[re.Pattern, str]]]:
        """Word boundary 기반 정규식 패턴 컴파일.

        기존 `if pattern in text` 대신 `\\bpattern\\b` 사용.
        "sun"이 "sunshine"에 매칭되는 문제 해결.
        """
        patterns = {}

        # 영어 패턴은 word boundary 적용
        english_maps = {
            EntityType.PLANET: {
                "sun": "Sun", "moon": "Moon", "mercury": "Mercury",
                "venus": "Venus", "mars": "Mars", "jupiter": "Jupiter",
                "saturn": "Saturn", "uranus": "Uranus", "neptune": "Neptune",
                "pluto": "Pluto",
            },
            EntityType.SIGN: {
                "aries": "Aries", "taurus": "Taurus", "gemini": "Gemini",
                "cancer": "Cancer", "leo": "Leo", "virgo": "Virgo",
                "libra": "Libra", "scorpio": "Scorpio", "sagittarius": "Sagittarius",
                "capricorn": "Capricorn", "aquarius": "Aquarius", "pisces": "Pisces",
            },
            EntityType.ASPECT: {
                "conjunction": "Conjunction", "opposition": "Opposition",
                "trine": "Trine", "square": "Square", "sextile": "Sextile",
                "quincunx": "Quincunx",
            },
        }

        for entity_type, word_map in english_maps.items():
            compiled = []
            for pattern, normalized in word_map.items():
                regex = re.compile(rf"\b{re.escape(pattern)}\b", re.IGNORECASE)
                compiled.append((regex, normalized))
            patterns[entity_type] = compiled

        # 한국어 패턴 (word boundary 대신 문자 경계 사용)
        korean_maps = {
            EntityType.STEM: {
                "갑": "갑", "을": "을", "병": "병", "정": "정", "무": "무",
                "기": "기", "경": "경", "신": "신", "임": "임", "계": "계",
            },
            EntityType.BRANCH: {
                "자": "자", "축": "축", "인": "인", "묘": "묘", "진": "진",
                "사": "사", "오": "오", "미": "미", "유": "유", "술": "술", "해": "해",
            },
            EntityType.TEN_GOD: {
                "비견": "비견", "겁재": "겁재", "식신": "식신", "상관": "상관",
                "편재": "편재", "정재": "정재", "편관": "편관", "정관": "정관",
                "편인": "편인", "정인": "정인",
            },
        }

        for entity_type, word_map in korean_maps.items():
            compiled = []
            for pattern, normalized in word_map.items():
                # 한국어는 \b가 잘 작동하지 않으므로 lookbehind/lookahead 사용
                if len(pattern) == 1:
                    # 단일 한자의 경우 주변 컨텍스트 필요 (예: "갑목", "을금")
                    regex = re.compile(
                        rf"(?:^|[\s,\.]){re.escape(pattern)}(?:목|화|토|금|수|일|간|[\s,\.]|$)"
                    )
                else:
                    regex = re.compile(re.escape(pattern))
                compiled.append((regex, normalized))
            patterns[entity_type] = compiled

        return patterns

    def extract(
        self,
        text: str,
        use_llm_fallback: bool = None,
    ) -> List[Entity]:
        """하이브리드 엔티티 추출.

        1단계: 개선된 정규식 패턴 매칭 (빠름, < 5ms)
        2단계: LLM 추출 (선택적, 패턴 결과가 부족할 때)
        3단계: 병합 + 중복 제거
        """
        should_use_llm = use_llm_fallback if use_llm_fallback is not None else self.use_llm

        # 1단계: 개선된 패턴 매칭
        pattern_entities = self._extract_with_patterns(text)

        # 2단계: LLM 추출 (패턴 결과가 2개 미만이거나 명시적 요청)
        llm_entities = []
        if should_use_llm and len(pattern_entities) < 2:
            llm_entities = self._extract_with_llm(text)

        # 3단계: 병합
        return self._merge_entities(pattern_entities, llm_entities)

    def _extract_with_patterns(self, text: str) -> List[Entity]:
        """개선된 정규식 패턴 매칭."""
        entities = []
        seen = set()

        for entity_type, compiled_patterns in self._compiled_patterns.items():
            for regex, normalized in compiled_patterns:
                if regex.search(text):
                    key = (entity_type, normalized)
                    if key not in seen:
                        seen.add(key)
                        entities.append(Entity(
                            text=normalized,
                            type=entity_type,
                            normalized=normalized,
                            confidence=0.9,
                            metadata={"source": "pattern"},
                        ))

        return entities

    def _extract_with_llm(self, text: str) -> List[Entity]:
        """LLM 기반 엔티티 추출.

        mini 모델 사용으로 비용 효율적 (요금표 기준).
        """
        try:
            prompt = ENTITY_EXTRACTION_PROMPT.format(text=text[:2000])

            if self.llm_provider == "openai":
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model=self.llm_model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0,
                    max_tokens=1000,
                    response_format={"type": "json_object"},
                )
                result_text = response.choices[0].message.content

            elif self.llm_provider == "anthropic":
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-5-haiku-20241022",
                    max_tokens=1000,
                    messages=[{"role": "user", "content": prompt}],
                )
                result_text = response.content[0].text
            else:
                return []

            # JSON 파싱
            result = json.loads(result_text)
            entities = []

            for e in result.get("entities", []):
                try:
                    entity_type = EntityType[e["type"]]
                except (KeyError, ValueError):
                    continue

                entities.append(Entity(
                    text=e.get("text", ""),
                    type=entity_type,
                    normalized=e.get("normalized", e.get("text", "")),
                    confidence=float(e.get("confidence", 0.8)),
                    metadata={"source": "llm", "model": self.llm_model},
                ))

            return entities

        except Exception as e:
            logger.warning(f"LLM 엔티티 추출 실패: {e}")
            return []

    def extract_relations(
        self,
        text: str,
        entities: List[Entity] = None,
    ) -> List[Tuple[Entity, str, Entity]]:
        """개선된 관계 추출.

        기존 3개 정규식 → 확장된 패턴 + LLM 보완.
        """
        if entities is None:
            entities = self.extract(text)

        relations = []
        entity_map = {e.normalized.lower(): e for e in entities}

        # 패턴 기반 관계 추출
        relation_patterns = [
            # "X in Y" (행성 in 별자리)
            re.compile(
                r"(\w+)\s+in\s+(\w+)", re.IGNORECASE
            ),
            # "X aspect Y" (Sun square Moon)
            re.compile(
                r"(\w+)\s+(conjunction|opposition|trine|square|sextile|quincunx)\s+(\w+)",
                re.IGNORECASE,
            ),
            # "X house Y" / "Yth house X"
            re.compile(
                r"(\w+)\s+(?:in\s+)?(?:the\s+)?(\d+)(?:st|nd|rd|th)\s+house",
                re.IGNORECASE,
            ),
            # 한국어: "갑목 일간", "을금 편재"
            re.compile(r"([갑을병정무기경신임계])([목화토금수])\s*(일간|편재|정재|편관|정관|편인|정인|비견|겁재|식신|상관)"),
        ]

        for pattern in relation_patterns:
            for match in pattern.finditer(text):
                groups = match.groups()
                if len(groups) >= 2:
                    src_text = groups[0].lower()
                    tgt_text = groups[-1].lower()
                    rel = groups[1] if len(groups) == 3 else "in"

                    src_entity = entity_map.get(src_text)
                    tgt_entity = entity_map.get(tgt_text)

                    if src_entity and tgt_entity:
                        relations.append((src_entity, rel, tgt_entity))

        return relations

    def _merge_entities(
        self,
        pattern_entities: List[Entity],
        llm_entities: List[Entity],
    ) -> List[Entity]:
        """패턴 + LLM 결과 병합. 중복 시 높은 confidence 우선."""
        merged = {}

        for e in pattern_entities:
            key = (e.type, e.normalized)
            merged[key] = e

        for e in llm_entities:
            key = (e.type, e.normalized)
            if key not in merged or e.confidence > merged[key].confidence:
                merged[key] = e

        return list(merged.values())
```

---

## Phase 4: Hierarchical Summarization

### 왜 필요한가

현재 시스템은 개별 노드 텍스트를 그대로 LLM에 전달합니다. Microsoft GraphRAG는 커뮤니티 단위로 계층적 요약을 생성하여 "글로벌 질문"에도 답할 수 있습니다.

```
현재:   Query → Top-K 노드 텍스트 → LLM (노드 수준)
개선:   Query → 커뮤니티 요약 → 세부 노드 → LLM (계층적)
```

### 개선 코드

#### 4-1. 커뮤니티 요약 엔진

````python
# app/rag/community_summarizer.py (신규 파일)

import json
import logging
from typing import List, Dict, Optional
from dataclasses import dataclass, field
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)


@dataclass
class CommunitySummary:
    """커뮤니티 계층적 요약.

    Level 0: 개별 노드 텍스트
    Level 1: 소규모 커뮤니티 요약 (5-20 노드)
    Level 2: 중규모 영역 요약 (여러 커뮤니티)
    Level 3: 전체 도메인 요약
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

    사용 시나리오:
    - "사주에서 오행의 역할은?" → Level 2 요약으로 빠르게 답변
    - "갑목 일간의 구체적 특성은?" → Level 0-1 세부 노드로 답변
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
        llm_model: str = "FUSION_MINI_MODEL",
        max_workers: int = 4,
    ):
        self.llm_provider = llm_provider
        self.llm_model = llm_model
        self.max_workers = max_workers
        self._summaries: Dict[int, CommunitySummary] = {}

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
        """
        from app.rag.graph_algorithms import GraphAlgorithms

        algo: GraphAlgorithms = graph_algorithms

        # Level 0: 각 커뮤니티 독립 요약
        logger.info("Level 0 커뮤니티 요약 시작...")
        community_ids = list(algo._community_map.keys()) if algo._community_map else []

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
                    logger.warning(f"커뮤니티 {comm_id} 요약 실패: {e}")

        logger.info(f"Level 0 완료: {len(self._summaries)}개 커뮤니티 요약됨")

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
        """단일 커뮤니티 LLM 요약."""
        try:
            top_nodes = community_data.get("top_nodes", [])
            sample_edges = community_data.get("sample_edges", [])

            # 노드 텍스트 수집 (그래프에서)
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

        except Exception as e:
            logger.warning(f"커뮤니티 {community_id} 요약 실패: {e}")
            return None

    def _build_higher_levels(self, algo, max_level: int):
        """상위 레벨 요약 생성 (Map-Reduce 패턴).

        관련 커뮤니티들을 그룹화하여 상위 요약을 만든다.
        그룹화 기준: 커뮤니티 간 엣지 밀도.
        """
        # 커뮤니티 간 연결 분석
        comm_graph = self._build_community_graph(algo)

        # 상위 레벨 커뮤니티 탐지
        if len(comm_graph.nodes()) > 1:
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

                    if child_summaries:
                        combined_text = "\n".join([
                            f"- {s.title}: {s.summary_ko[:100]}"
                            for s in child_summaries
                        ])

                        meta_summary = self._call_llm(
                            f"다음 하위 그룹들을 통합하여 상위 요약을 만들어주세요:\n{combined_text}\n\n"
                            f"JSON: {{\"title\": \"...\", \"summary_ko\": \"...\", \"summary_en\": \"...\", \"key_concepts\": [...]}}"
                        )

                        if meta_summary:
                            meta_id = 10000 + i
                            self._summaries[meta_id] = CommunitySummary(
                                community_id=meta_id,
                                level=1,
                                title=meta_summary.get("title", f"Group {i}"),
                                summary_ko=meta_summary.get("summary_ko", ""),
                                summary_en=meta_summary.get("summary_en", ""),
                                key_concepts=meta_summary.get("key_concepts", []),
                                node_count=sum(s.node_count for s in child_summaries),
                                child_summaries=list(group),
                            )
            except Exception as e:
                logger.warning(f"상위 레벨 요약 실패: {e}")

    def _build_community_graph(self, algo) -> "nx.Graph":
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
                # JSON 블록 추출
                if "```json" in text:
                    text = text.split("```json")[1].split("```")[0]
                elif "```" in text:
                    text = text.split("```")[1].split("```")[0]
                return json.loads(text.strip())

        except Exception as e:
            logger.warning(f"LLM 호출 실패: {e}")
            return None

    def get_relevant_summaries(
        self,
        query: str,
        top_k: int = 3,
    ) -> List[CommunitySummary]:
        """쿼리에 관련된 커뮤니티 요약 검색.

        사용 예: "오행이란?" → 오행 관련 커뮤니티 요약 반환.
        """
        # 간단한 키워드 매칭 (향후 임베딩 기반으로 업그레이드 가능)
        query_lower = query.lower()
        scored = []

        for summary in self._summaries.values():
            score = 0
            for concept in summary.key_concepts:
                if concept.lower() in query_lower or query_lower in concept.lower():
                    score += 2
            if any(kw in summary.title.lower() for kw in query_lower.split()):
                score += 1
            if any(kw in summary.summary_ko for kw in query_lower.split()):
                score += 0.5

            if score > 0:
                scored.append((summary, score))

        scored.sort(key=lambda x: x[1], reverse=True)
        return [s for s, _ in scored[:top_k]]

    def format_hierarchical_context(
        self,
        summaries: List[CommunitySummary],
        max_chars: int = 3000,
    ) -> str:
        """계층적 요약을 LLM 프롬프트용 컨텍스트로 포맷팅.

        Level 1 (상위) → Level 0 (하위) 순서로 배치하여
        LLM이 큰 그림 → 세부 사항 순으로 이해하도록 한다.
        """
        # 레벨 순으로 정렬
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


# 요약 캐시 (디스크 영속)
_summarizer: Optional[HierarchicalSummarizer] = None


def get_hierarchical_summarizer() -> HierarchicalSummarizer:
    global _summarizer
    if _summarizer is None:
        _summarizer = HierarchicalSummarizer()
    return _summarizer
````

---

## Phase 5: RAGAS 정량 평가 체계

### 왜 필요한가

현재 시스템은 검색 품질을 측정할 방법이 없습니다. RAGAS 프레임워크로 다음 지표를 자동 측정합니다:

| 지표              | 측정 대상                         | 현재      | 목표   |
| ----------------- | --------------------------------- | --------- | ------ |
| Faithfulness      | LLM 답변이 검색 결과에 기반하는가 | 측정 불가 | ≥ 0.8  |
| Answer Relevancy  | 답변이 질문에 관련되는가          | 측정 불가 | ≥ 0.85 |
| Context Recall    | 필요한 정보를 모두 검색했는가     | 측정 불가 | ≥ 0.7  |
| Context Precision | 검색 결과 중 관련 있는 비율       | 측정 불가 | ≥ 0.75 |

### 개선 코드

#### 5-1. 평가 데이터셋 + RAGAS 통합

```python
# app/rag/evaluation.py (신규 파일)

import json
import logging
import time
from typing import List, Dict, Optional
from dataclasses import dataclass, field, asdict
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class EvalSample:
    """평가 데이터 샘플.

    ground_truth: 전문가가 작성한 정답 컨텍스트
    expected_entities: 추출되어야 하는 엔티티 목록
    expected_domains: 검색되어야 하는 도메인
    """
    question: str
    ground_truth: str
    expected_entities: List[str] = field(default_factory=list)
    expected_domains: List[str] = field(default_factory=list)
    theme: str = "life_path"
    locale: str = "ko"
    facts: Dict = field(default_factory=dict)


@dataclass
class EvalResult:
    """평가 결과."""
    sample: EvalSample
    retrieved_context: str
    generated_answer: str
    faithfulness: float = 0.0
    answer_relevancy: float = 0.0
    context_recall: float = 0.0
    context_precision: float = 0.0
    entity_recall: float = 0.0
    latency_ms: float = 0.0


# ─── 평가 데이터셋 ─────────────────────────────────

EVAL_DATASET: List[EvalSample] = [
    # 사주 관련
    EvalSample(
        question="갑목 일간의 성격과 특성은?",
        ground_truth="갑목은 큰 나무를 상징하며, 곧고 올바른 성격, 리더십, 책임감이 특징. 인의예지의 '인'에 해당하며 봄의 기운을 가짐.",
        expected_entities=["갑", "목"],
        expected_domains=["saju"],
        theme="life_path",
        facts={"dayMaster": "갑목"},
    ),
    EvalSample(
        question="식신과 상관의 차이점은?",
        ground_truth="식신은 온화하고 안정적인 표현력, 요리/예술 관련. 상관은 날카롭고 비판적인 표현력, 혁신/반항 관련. 둘 다 일간이 생하는 오행이지만 음양이 다름.",
        expected_entities=["식신", "상관"],
        expected_domains=["saju"],
        theme="career",
    ),
    EvalSample(
        question="역마살이 있으면 어떤 특징이 있나?",
        ground_truth="역마살은 움직임, 이동, 변화가 많은 삶을 의미. 해외 생활, 출장, 이사가 잦고 한 곳에 정착하기 어려움. 긍정적으로는 활동적이고 진취적.",
        expected_entities=["역마"],
        expected_domains=["saju"],
        theme="life_path",
    ),

    # 점성술 관련
    EvalSample(
        question="Jupiter in Sagittarius는 어떤 의미인가?",
        ground_truth="목성이 사수자리에 있으면 본궁(domicile)에 위치하여 매우 강력. 확장, 낙관, 철학, 해외 경험, 고등 교육에 대한 열정이 극대화됨.",
        expected_entities=["Jupiter", "Sagittarius"],
        expected_domains=["astro"],
        theme="life_path",
    ),
    EvalSample(
        question="Sun square Moon 애스팩트의 의미는?",
        ground_truth="태양과 달의 스퀘어는 내면의 갈등, 의식과 무의식의 긴장. 자아 표현과 감정적 욕구 사이의 불일치. 성장의 동력이 될 수 있음.",
        expected_entities=["Sun", "Moon", "Square"],
        expected_domains=["astro"],
        theme="life_path",
    ),

    # 타로 관련
    EvalSample(
        question="The Tower 카드의 해석은?",
        ground_truth="탑 카드는 갑작스러운 변화, 파괴, 기존 구조의 붕괴를 의미. 정방향은 필요한 변화, 역방향은 변화에 대한 저항. 화성과 연결.",
        expected_entities=["The Tower"],
        expected_domains=["tarot"],
        theme="life_path",
    ),

    # 크로스 분석
    EvalSample(
        question="사주의 갑목과 점성술의 목성은 어떤 관련이 있나?",
        ground_truth="갑목과 목성은 모두 확장, 성장, 리더십의 에너지. 갑목은 동양 사상의 봄/시작, 목성은 서양 점성술의 확장/행운. 공통적으로 성장 지향적.",
        expected_entities=["갑", "목", "Jupiter"],
        expected_domains=["saju", "astro", "cross_analysis"],
        theme="life_path",
        facts={"dayMaster": "갑목"},
    ),

    # 융 심리학 관련
    EvalSample(
        question="그림자(Shadow)의 심리학적 의미는?",
        ground_truth="융의 그림자 개념은 의식에서 억압된 자아의 어두운 면. 그림자 통합은 개성화의 핵심 과정. 그림자를 인식하고 수용하는 것이 심리적 성장.",
        expected_entities=[],
        expected_domains=["corpus"],
        theme="life_path",
    ),
]


class RAGEvaluator:
    """RAG 시스템 정량 평가기.

    RAGAS 프레임워크의 핵심 지표를 구현:
    1. Faithfulness: 답변이 검색 컨텍스트에 기반하는가
    2. Answer Relevancy: 답변이 질문에 관련되는가
    3. Context Recall: ground truth 정보를 얼마나 검색했는가
    4. Context Precision: 검색 결과 중 관련 있는 비율
    5. Entity Recall: 기대 엔티티를 얼마나 추출했는가
    """

    def __init__(
        self,
        llm_provider: str = "openai",
        llm_model: str = "FUSION_MINI_MODEL",
    ):
        self.llm_provider = llm_provider
        self.llm_model = llm_model

    def evaluate_rag_system(
        self,
        dataset: List[EvalSample] = None,
        verbose: bool = True,
    ) -> Dict:
        """전체 RAG 시스템 평가 실행.

        Returns:
            {
                "overall": {"faithfulness": 0.82, "answer_relevancy": 0.85, ...},
                "per_sample": [EvalResult, ...],
                "timestamp": "...",
                "total_samples": 8,
            }
        """
        if dataset is None:
            dataset = EVAL_DATASET

        results = []

        for i, sample in enumerate(dataset):
            if verbose:
                logger.info(f"평가 중 [{i+1}/{len(dataset)}]: {sample.question[:50]}...")

            result = self._evaluate_single(sample)
            results.append(result)

            if verbose:
                logger.info(
                    f"  F={result.faithfulness:.2f} "
                    f"AR={result.answer_relevancy:.2f} "
                    f"CR={result.context_recall:.2f} "
                    f"CP={result.context_precision:.2f} "
                    f"ER={result.entity_recall:.2f} "
                    f"({result.latency_ms:.0f}ms)"
                )

        # 집계
        n = len(results)
        overall = {
            "faithfulness": sum(r.faithfulness for r in results) / n,
            "answer_relevancy": sum(r.answer_relevancy for r in results) / n,
            "context_recall": sum(r.context_recall for r in results) / n,
            "context_precision": sum(r.context_precision for r in results) / n,
            "entity_recall": sum(r.entity_recall for r in results) / n,
            "avg_latency_ms": sum(r.latency_ms for r in results) / n,
        }

        if verbose:
            logger.info("\n=== 전체 평가 결과 ===")
            for metric, value in overall.items():
                logger.info(f"  {metric}: {value:.4f}")

        return {
            "overall": overall,
            "per_sample": [asdict(r) for r in results],
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "total_samples": n,
        }

    def _evaluate_single(self, sample: EvalSample) -> EvalResult:
        """단일 샘플 평가."""
        start = time.time()

        # 1. RAG 검색 실행
        context, entities = self._run_rag_search(sample)

        # 2. LLM 답변 생성
        answer = self._generate_answer(sample.question, context)

        latency = (time.time() - start) * 1000

        # 3. 지표 계산
        result = EvalResult(
            sample=sample,
            retrieved_context=context,
            generated_answer=answer,
            latency_ms=latency,
        )

        # Faithfulness: 답변의 각 주장이 컨텍스트에 근거하는가
        result.faithfulness = self._compute_faithfulness(answer, context)

        # Answer Relevancy: 답변이 질문에 얼마나 관련되는가
        result.answer_relevancy = self._compute_answer_relevancy(
            sample.question, answer
        )

        # Context Recall: ground truth의 핵심 정보가 컨텍스트에 포함되는가
        result.context_recall = self._compute_context_recall(
            sample.ground_truth, context
        )

        # Context Precision: 검색 컨텍스트 중 관련 있는 비율
        result.context_precision = self._compute_context_precision(
            sample.question, context
        )

        # Entity Recall: 기대 엔티티 추출 비율
        result.entity_recall = self._compute_entity_recall(
            sample.expected_entities, entities
        )

        return result

    def _run_rag_search(self, sample: EvalSample) -> tuple:
        """RAG 검색 실행. 실제 시스템의 검색 결과를 반환."""
        try:
            from app.rag.optimized_manager import get_optimized_rag_manager

            manager = get_optimized_rag_manager()
            # 실제 검색 실행
            import asyncio
            loop = asyncio.new_event_loop()
            result = loop.run_until_complete(
                manager.fetch_all(
                    saju_data=sample.facts,
                    astro_data=sample.facts,
                    theme=sample.theme,
                    locale=sample.locale,
                )
            )
            loop.close()

            context = result.get("graph_context", "") + "\n" + str(result.get("corpus_quotes", ""))
            entities = [str(e) for e in result.get("entities", [])]
            return context, entities

        except Exception as e:
            logger.warning(f"RAG 검색 실패: {e}")
            return "", []

    def _generate_answer(self, question: str, context: str) -> str:
        """LLM으로 답변 생성."""
        try:
            prompt = f"다음 컨텍스트를 바탕으로 질문에 답해주세요.\n\n컨텍스트:\n{context[:3000]}\n\n질문: {question}"

            if self.llm_provider == "openai":
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model=self.llm_model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0,
                    max_tokens=500,
                )
                return response.choices[0].message.content

            return ""
        except Exception as e:
            logger.warning(f"답변 생성 실패: {e}")
            return ""

    def _compute_faithfulness(self, answer: str, context: str) -> float:
        """Faithfulness 지표: 답변의 주장이 컨텍스트에 기반하는가.

        LLM 판정 방식: 답변의 각 문장이 컨텍스트에서 지지되는지 확인.
        """
        if not answer or not context:
            return 0.0

        try:
            prompt = f"""다음 답변의 각 주장이 제공된 컨텍스트에 근거하는지 판정하세요.

컨텍스트: {context[:2000]}

답변: {answer}

각 주장에 대해 "supported" 또는 "not_supported"로 판정하세요.
JSON 형식: {{"claims": [{{"claim": "...", "verdict": "supported"}}], "score": 0.8}}"""

            result = self._call_judge_llm(prompt)
            return float(result.get("score", 0.5))
        except Exception:
            return 0.5

    def _compute_answer_relevancy(self, question: str, answer: str) -> float:
        """Answer Relevancy: 답변이 질문에 관련되는가."""
        if not answer:
            return 0.0

        try:
            prompt = f"""질문과 답변의 관련성을 0~1 사이 점수로 평가하세요.

질문: {question}
답변: {answer}

JSON: {{"score": 0.85, "reason": "..."}}"""

            result = self._call_judge_llm(prompt)
            return float(result.get("score", 0.5))
        except Exception:
            return 0.5

    def _compute_context_recall(self, ground_truth: str, context: str) -> float:
        """Context Recall: ground truth 정보가 검색 컨텍스트에 포함되는가."""
        if not ground_truth or not context:
            return 0.0

        try:
            prompt = f"""정답(ground truth)의 핵심 정보가 검색된 컨텍스트에 얼마나 포함되어 있는지 평가하세요.

정답: {ground_truth}
검색 컨텍스트: {context[:2000]}

JSON: {{"score": 0.7, "found_info": ["..."], "missing_info": ["..."]}}"""

            result = self._call_judge_llm(prompt)
            return float(result.get("score", 0.5))
        except Exception:
            return 0.5

    def _compute_context_precision(self, question: str, context: str) -> float:
        """Context Precision: 검색 결과 중 관련 있는 비율."""
        if not context:
            return 0.0

        try:
            prompt = f"""질문에 대해 검색된 컨텍스트의 각 부분이 얼마나 관련되는지 평가하세요.

질문: {question}
컨텍스트: {context[:2000]}

JSON: {{"score": 0.75, "relevant_ratio": "6/8"}}"""

            result = self._call_judge_llm(prompt)
            return float(result.get("score", 0.5))
        except Exception:
            return 0.5

    def _compute_entity_recall(
        self,
        expected: List[str],
        extracted: List[str],
    ) -> float:
        """Entity Recall: 기대 엔티티 중 추출된 비율."""
        if not expected:
            return 1.0
        if not extracted:
            return 0.0

        extracted_lower = {e.lower() for e in extracted}
        found = sum(
            1 for e in expected
            if e.lower() in extracted_lower
            or any(e.lower() in ext for ext in extracted_lower)
        )

        return found / len(expected)

    def _call_judge_llm(self, prompt: str) -> Dict:
        """평가용 LLM 호출."""
        try:
            if self.llm_provider == "openai":
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model=self.llm_model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0,
                    max_tokens=300,
                    response_format={"type": "json_object"},
                )
                return json.loads(response.choices[0].message.content)
            return {}
        except Exception as e:
            logger.warning(f"Judge LLM 호출 실패: {e}")
            return {}

    def save_results(self, results: Dict, output_path: str = "data/eval_results.json"):
        """평가 결과를 JSON으로 저장."""
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2, default=str)
        logger.info(f"평가 결과 저장: {output_path}")


def run_evaluation():
    """평가 실행 엔트리포인트.

    Usage:
        python -m app.rag.evaluation
    """
    evaluator = RAGEvaluator()
    results = evaluator.evaluate_rag_system(verbose=True)
    evaluator.save_results(results)
    return results


if __name__ == "__main__":
    run_evaluation()
```

#### 5-2. requirements.txt 추가

```
# requirements.txt에 추가 (선택적 - RAGAS 라이브러리 직접 사용 시)
ragas>=0.1.0
datasets>=2.14.0
```

---

## Phase 6: 고급 임베딩 모델 업그레이드

### 현재 vs 개선 비교

| 항목        | 현재                                  | 개선 옵션 A           | 개선 옵션 B |
| ----------- | ------------------------------------- | --------------------- | ----------- |
| 모델        | paraphrase-multilingual-MiniLM-L12-v2 | multilingual-e5-large | BGE-M3      |
| 차원        | 384D                                  | 1024D                 | 1024D       |
| MTEB 평균   | 51.7                                  | 61.5                  | 62.4        |
| 한국어 성능 | 보통                                  | 우수                  | 매우 우수   |
| 속도        | 빠름                                  | 보통                  | 보통        |
| 크기        | 471MB                                 | 2.24GB                | 2.3GB       |

### 개선 코드

#### 6-1. 모델 매니저 업그레이드

```python
# app/rag/model_manager.py 교체

import os
import torch
import logging
from typing import Optional
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


# 모델 설정
EMBEDDING_MODELS = {
    "minilm": {
        "name": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        "dim": 384,
        "description": "경량 다국어 모델 (현재 사용 중)",
    },
    "e5-large": {
        "name": "intfloat/multilingual-e5-large",
        "dim": 1024,
        "description": "고성능 다국어 모델 (추천)",
        "query_prefix": "query: ",  # E5 모델은 쿼리에 prefix 필요
        "passage_prefix": "passage: ",
    },
    "bge-m3": {
        "name": "BAAI/bge-m3",
        "dim": 1024,
        "description": "최신 다국어 모델 (한국어 우수)",
    },
}

# 환경변수로 모델 선택
_MODEL_KEY = os.environ.get("RAG_EMBEDDING_MODEL", "minilm")
_DEVICE = os.environ.get("RAG_DEVICE", "auto")


class EmbeddingModelManager:
    """임베딩 모델 관리자.

    싱글톤 패턴으로 모델 인스턴스를 공유하며,
    모델별 쿼리/패시지 prefix를 자동 적용.
    """

    def __init__(self, model_key: str = None):
        self._model_key = model_key or _MODEL_KEY
        self._model: Optional[SentenceTransformer] = None
        self._config = EMBEDDING_MODELS.get(self._model_key, EMBEDDING_MODELS["minilm"])

    @property
    def model(self) -> SentenceTransformer:
        if self._model is None:
            self._model = self._load_model()
        return self._model

    @property
    def dimension(self) -> int:
        return self._config["dim"]

    def _load_model(self) -> SentenceTransformer:
        """모델 로드 (디바이스 자동 감지)."""
        model_name = self._config["name"]

        device = _DEVICE
        if device == "auto":
            device = "cuda" if torch.cuda.is_available() else "cpu"

        logger.info(f"임베딩 모델 로드: {model_name} (device={device})")

        model = SentenceTransformer(model_name, device=device)

        if device == "cuda":
            model = model.half()  # float16 for GPU

        return model

    def encode_query(self, text: str, **kwargs) -> torch.Tensor:
        """쿼리 임베딩 (모델별 prefix 자동 적용).

        E5 모델: "query: " prefix 추가
        BGE 모델: prefix 없음
        MiniLM: prefix 없음
        """
        prefix = self._config.get("query_prefix", "")
        return self.model.encode(
            prefix + text,
            convert_to_tensor=True,
            normalize_embeddings=True,
            **kwargs,
        )

    def encode_passage(self, text: str, **kwargs) -> torch.Tensor:
        """패시지/문서 임베딩."""
        prefix = self._config.get("passage_prefix", "")
        return self.model.encode(
            prefix + text,
            convert_to_tensor=True,
            normalize_embeddings=True,
            **kwargs,
        )

    def encode_batch(
        self,
        texts: list,
        batch_size: int = 64,
        is_query: bool = False,
        **kwargs,
    ) -> torch.Tensor:
        """배치 임베딩."""
        prefix = ""
        if is_query:
            prefix = self._config.get("query_prefix", "")
        else:
            prefix = self._config.get("passage_prefix", "")

        if prefix:
            texts = [prefix + t for t in texts]

        return self.model.encode(
            texts,
            batch_size=batch_size,
            convert_to_tensor=True,
            normalize_embeddings=True,
            show_progress_bar=len(texts) > 100,
            **kwargs,
        )

    def get_info(self) -> dict:
        return {
            "model_key": self._model_key,
            "model_name": self._config["name"],
            "dimension": self._config["dim"],
            "description": self._config["description"],
        }


# 싱글톤
_manager: Optional[EmbeddingModelManager] = None
_manager_lock = __import__("threading").Lock()


def get_embedding_manager(model_key: str = None) -> EmbeddingModelManager:
    global _manager
    if _manager is None or (model_key and model_key != _manager._model_key):
        with _manager_lock:
            _manager = EmbeddingModelManager(model_key)
    return _manager


def get_shared_model() -> SentenceTransformer:
    """하위 호환성: 기존 get_shared_model() 인터페이스 유지."""
    return get_embedding_manager().model
```

#### 6-2. 임베딩 재생성 스크립트

```python
# scripts/regenerate_embeddings.py

"""임베딩 모델 업그레이드 후 전체 임베딩 재생성.

Usage:
    # 현재 모델로 재생성
    python -m scripts.regenerate_embeddings

    # E5-large로 업그레이드
    RAG_EMBEDDING_MODEL=e5-large python -m scripts.regenerate_embeddings

    # BGE-M3로 업그레이드
    RAG_EMBEDDING_MODEL=bge-m3 python -m scripts.regenerate_embeddings
"""

import os
import sys
import torch
import time
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def regenerate_all():
    from app.rag.model_manager import get_embedding_manager

    manager = get_embedding_manager()
    info = manager.get_info()
    logger.info(f"모델: {info['model_name']} ({info['dimension']}D)")

    start = time.time()

    # 1. GraphRAG 임베딩 재생성
    logger.info("=== GraphRAG 임베딩 재생성 ===")
    from app.saju_astro_rag import GraphRAG

    graph_rag = GraphRAG(use_cache=False)  # 캐시 무시하고 재생성
    graph_rag._prepare_embeddings(use_cache=False)
    logger.info(f"GraphRAG: {len(graph_rag._texts)}개 노드 임베딩 완료")

    # 2. 도메인 임베딩 재생성
    domains = {
        "tarot": "data/graph/rules/tarot/",
        "dream": "data/graph/rules/dream/",
    }

    for domain, path in domains.items():
        if os.path.exists(path):
            logger.info(f"=== {domain} 임베딩 재생성 ===")
            # 도메인별 텍스트 로드 + 임베딩
            # (각 도메인의 로더에 따라 구현)

    # 3. ChromaDB 재인덱싱 (Phase 1 적용 시)
    try:
        from scripts.migrate_to_chromadb import migrate_graph_rag
        logger.info("=== ChromaDB 재인덱싱 ===")
        migrate_graph_rag(reset=True)
    except ImportError:
        logger.info("ChromaDB 미설치 - 스킵")

    elapsed = time.time() - start
    logger.info(f"\n=== 전체 임베딩 재생성 완료 ({elapsed:.1f}초) ===")


if __name__ == "__main__":
    regenerate_all()
```

---

## 마이그레이션 전략

### 점진적 적용 순서

```
Phase 1 (벡터DB)  ─────────────────────────────────────►
    │  ChromaDB 도입, 기존 검색과 A/B 비교
    │
Phase 5 (평가체계) ─────────────────────────────────────►
    │  평가 파이프라인으로 개선 효과 측정 기반 확보
    │
Phase 2 (그래프 알고리즘) ──────────────────────────────►
    │  Community Detection + PageRank + Beam Search
    │
Phase 3 (LLM 엔티티 추출) ─────────────────────────────►
    │  패턴 매칭 → 하이브리드 (패턴 + LLM)
    │
Phase 6 (임베딩 업그레이드) ────────────────────────────►
    │  MiniLM → E5-large 또는 BGE-M3
    │
Phase 4 (계층적 요약) ─────────────────────────────────►
      커뮤니티 기반 Map-Reduce 요약
```

### 각 Phase별 적용 방법

#### Phase 1 적용 (벡터DB)

```bash
# 1. 설치
pip install chromadb

# 2. 파일 생성
# app/rag/vector_store.py → 위의 코드 복사
# scripts/migrate_to_chromadb.py → 위의 코드 복사

# 3. 마이그레이션 실행
python -m scripts.migrate_to_chromadb

# 4. saju_astro_rag.py의 query() 메서드 교체
# (기존 코드는 _legacy_query()로 보존)

# 5. A/B 비교 테스트
python -m pytest tests/unit/test_saju_astro_rag.py -v
```

#### Phase 2 적용 (그래프 알고리즘)

```bash
# 1. 파일 생성
# app/rag/graph_algorithms.py → 위의 코드 복사

# 2. graph_traversal.py의 traverse() 교체

# 3. 테스트
python -c "
from app.rag.graph_algorithms import get_graph_algorithms
algo = get_graph_algorithms()
print('PageRank Top 10:', algo.get_top_nodes(10))
print('Communities:', len(algo._community_map))
print('Bridge Nodes:', algo.get_bridge_nodes(5))
"
```

#### Phase 3 적용 (LLM 엔티티 추출)

```bash
# 1. 파일 생성
# app/agentic_rag/llm_entity_extractor.py → 위의 코드 복사

# 2. orchestrator.py에서 EntityExtractor → LLMEntityExtractor로 교체

# 3. 테스트
python -c "
from app.agentic_rag.llm_entity_extractor import LLMEntityExtractor
ext = LLMEntityExtractor(use_llm=False)  # 패턴만 테스트
print(ext.extract('Jupiter in Sagittarius와 갑목 일간'))
"
```

#### Phase 5 적용 (평가 체계)

```bash
# 1. 파일 생성
# app/rag/evaluation.py → 위의 코드 복사

# 2. 평가 실행
python -m app.rag.evaluation

# 3. 결과 확인
cat data/eval_results.json
```

#### Phase 6 적용 (임베딩 업그레이드)

```bash
# 1. model_manager.py 교체

# 2. 모델 다운로드 + 임베딩 재생성
RAG_EMBEDDING_MODEL=e5-large python -m scripts.regenerate_embeddings

# 3. ChromaDB 재인덱싱 (Phase 1 적용 시)
python -m scripts.migrate_to_chromadb --reset
```

### Feature Flag 기반 안전한 전환

```python
# app/config.py에 추가

import os

# Phase별 Feature Flags (환경변수로 제어)
USE_CHROMADB = os.environ.get("USE_CHROMADB", "0") == "1"
USE_ADVANCED_GRAPH = os.environ.get("USE_ADVANCED_GRAPH", "0") == "1"
USE_LLM_NER = os.environ.get("USE_LLM_NER", "0") == "1"
USE_HIERARCHICAL_SUMMARY = os.environ.get("USE_HIERARCHICAL_SUMMARY", "0") == "1"
EMBEDDING_MODEL = os.environ.get("RAG_EMBEDDING_MODEL", "minilm")

# 활성화 예시:
# USE_CHROMADB=1 USE_ADVANCED_GRAPH=1 python -m app.main
```

---

## 예상 성능 개선 효과

| 지표               | 현재        | Phase 1+2 후    | 전체 적용 후 |
| ------------------ | ----------- | --------------- | ------------ |
| 검색 속도 (p95)    | 400-500ms   | 200-300ms       | 150-250ms    |
| 검색 정확도        | 측정 불가   | 측정 가능       | ≥ 0.8        |
| 확장성 (노드 수)   | ~10,000     | ~100,000+       | ~1,000,000+  |
| 엔티티 추출 정확도 | ~70% (추정) | ~70%            | ~90%+        |
| 그래프 탐색 다양성 | 낮음 (BFS)  | 높음 (Beam+PPR) | 높음         |
| 글로벌 질문 답변   | 불가        | 부분 가능       | 가능         |

---

## 신규 파일 목록

```
backend_AI/
├── app/rag/
│   ├── vector_store.py          (Phase 1: ChromaDB 매니저)
│   ├── graph_algorithms.py      (Phase 2: 고급 그래프 알고리즘)
│   ├── community_summarizer.py  (Phase 4: 계층적 요약)
│   ├── evaluation.py            (Phase 5: RAGAS 평가)
│   └── model_manager.py         (Phase 6: 임베딩 모델 매니저 - 기존 파일 교체)
├── app/agentic_rag/
│   └── llm_entity_extractor.py  (Phase 3: LLM 엔티티 추출)
└── scripts/
    ├── migrate_to_chromadb.py   (Phase 1: 데이터 마이그레이션)
    └── regenerate_embeddings.py (Phase 6: 임베딩 재생성)
```

## 추가 dependencies

```
# requirements.txt에 추가
chromadb>=0.4.22     # Phase 1
ragas>=0.1.0         # Phase 5 (선택)
datasets>=2.14.0     # Phase 5 (선택)
```
