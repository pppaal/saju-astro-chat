# backend_ai/app/rag/vector_store.py
"""
ChromaDB Vector Store Manager
==============================
기존 PyTorch tensor 직접 비교(O(n))를 ChromaDB HNSW ANN 검색(O(log n))으로 대체.

Features:
- HNSW 인덱스 기반 근사 최근접 이웃 검색
- 메타데이터 필터링 (도메인, 소스 등)
- 영속 디스크 저장 (cold start 제거)
- 배치 인덱싱 지원

Usage:
    from backend_ai.app.rag.vector_store import get_vector_store

    vs = get_vector_store()
    results = vs.search(query_embedding=emb, top_k=10, where={"domain": "saju"})
"""

import logging
import os
from threading import Lock
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Feature flag
USE_CHROMADB = os.environ.get("USE_CHROMADB", "0") == "1"
_TRACE_ENV_KEY = "RAG_TRACE"


def _trace_enabled() -> bool:
    return os.getenv(_TRACE_ENV_KEY, "0") == "1"

# Default paths
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_DEFAULT_PERSIST_DIR = os.path.join(_BASE_DIR, "data", "chromadb")


class VectorStoreManager:
    """ChromaDB 기반 벡터 스토어 매니저.

    기존 PyTorch tensor 직접 cosine similarity 비교를 대체하여
    HNSW 인덱스 기반 ANN 검색, 메타데이터 필터링, 영속 저장을 지원한다.

    검색 성능:
    - 기존: O(n) 선형 스캔 (5000 노드 전체 비교)
    - 개선: O(log n) HNSW ANN 검색
    """

    def __init__(
        self,
        persist_dir: str = None,
        collection_name: str = "graph_nodes",
    ):
        self._persist_dir = persist_dir or _DEFAULT_PERSIST_DIR
        self._collection_name = collection_name
        self._client = None
        self._collection = None
        self._client_lock = Lock()
        self._collection_lock = Lock()

    @property
    def client(self):
        """Lazy-initialize ChromaDB persistent client."""
        if self._client is None:
            with self._client_lock:
                if self._client is None:
                    import chromadb
                    from chromadb.config import Settings

                    os.makedirs(self._persist_dir, exist_ok=True)
                    self._client = chromadb.PersistentClient(
                        path=self._persist_dir,
                        settings=Settings(
                            anonymized_telemetry=False,
                            allow_reset=True,
                        ),
                    )
                    logger.info(
                        "[VectorStore] ChromaDB client initialized (persist_dir=%s, collection=%s)",
                        self._persist_dir,
                        self._collection_name,
                    )
        return self._client

    @property
    def collection(self):
        """Get or create ChromaDB collection with HNSW cosine index."""
        if self._collection is None:
            with self._collection_lock:
                if self._collection is None:
                    self._collection = self.client.get_or_create_collection(
                        name=self._collection_name,
                        metadata={"hnsw:space": "cosine"},
                    )
                    try:
                        count = self._collection.count()
                    except Exception as exc:
                        count = -1
                        logger.warning(
                            "[VectorStore] Collection count failed (collection=%s): %s",
                            self._collection_name,
                            exc,
                        )
                    logger.info(
                        "[VectorStore] Collection ready (persist_dir=%s, collection=%s, items=%d)",
                        self._persist_dir,
                        self._collection_name,
                        count,
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
        """노드를 ChromaDB에 배치 인덱싱.

        기존 graph_rag_embeds.pt / corpus_embeds.pt 데이터를 마이그레이션할 때 사용.

        Args:
            ids: 노드 ID 리스트
            texts: 노드 텍스트 리스트
            embeddings: 임베딩 벡터 리스트 (list of list[float])
            metadatas: 메타데이터 딕셔너리 리스트
            batch_size: 배치 크기

        Returns:
            인덱싱된 노드 수
        """
        total = len(ids)
        indexed = 0

        for i in range(0, total, batch_size):
            end = min(i + batch_size, total)
            batch_ids = ids[i:end]
            batch_texts = texts[i:end]
            batch_embeddings = embeddings[i:end]
            batch_meta = metadatas[i:end] if metadatas else None

            kwargs = {
                "ids": batch_ids,
                "documents": batch_texts,
                "embeddings": batch_embeddings,
            }
            if batch_meta:
                # ChromaDB 메타데이터는 str/int/float/bool만 허용
                sanitized = []
                for m in batch_meta:
                    clean = {}
                    for k, v in m.items():
                        if isinstance(v, (str, int, float, bool)):
                            clean[k] = v
                    sanitized.append(clean)
                kwargs["metadatas"] = sanitized

            self.collection.upsert(**kwargs)
            indexed += len(batch_ids)

            if total > batch_size:
                logger.info("[VectorStore] Indexed %d/%d nodes", indexed, total)

        logger.info("[VectorStore] Indexing complete: %d nodes", indexed)
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
        메타데이터 필터링도 DB 레벨에서 수행.

        Args:
            query_text: 쿼리 텍스트 (ChromaDB 내장 임베딩 사용 시)
            query_embedding: 쿼리 임베딩 벡터 (직접 제공)
            top_k: 반환할 결과 수
            min_score: 최소 유사도 임계값 (cosine similarity)
            where: 메타데이터 필터 (예: {"domain": "saju"})
            where_document: 문서 내용 필터

        Returns:
            [{id, text, score, metadata}, ...] 형태의 결과 리스트
        """
        if self.collection.count() == 0:
            return []

        actual_k = min(top_k, self.collection.count())
        query_params = {"n_results": actual_k}

        if query_embedding is not None:
            query_params["query_embeddings"] = [query_embedding]
        elif query_text is not None:
            query_params["query_texts"] = [query_text]
        else:
            raise ValueError("query_text 또는 query_embedding이 필요합니다")

        if where:
            query_params["where"] = where
        if where_document:
            query_params["where_document"] = where_document

        try:
            results = self.collection.query(**query_params)
        except Exception as e:
            logger.warning("[VectorStore] Search failed: %s", e)
            return []

        output = []
        if results and results["ids"] and results["ids"][0]:
            for i, doc_id in enumerate(results["ids"][0]):
                # ChromaDB cosine distance = 1 - cosine_similarity
                distance = results["distances"][0][i] if results.get("distances") else 0
                score = 1.0 - distance

                if score >= min_score:
                    output.append({
                        "id": doc_id,
                        "text": results["documents"][0][i] if results.get("documents") else "",
                        "score": round(score, 4),
                        "metadata": results["metadatas"][0][i] if results.get("metadatas") else {},
                    })

        if _trace_enabled():
            logger.info(
                "[RAG_TRACE] collection=%s results=%d top_k=%d where=%s",
                self._collection_name,
                len(output),
                top_k,
                where or {},
            )
        return output

    def search_by_domain(
        self,
        query_embedding: List[float],
        domain: str,
        top_k: int = 10,
        min_score: float = 0.3,
    ) -> List[Dict]:
        """도메인 필터링 포함 검색."""
        return self.search(
            query_embedding=query_embedding,
            top_k=top_k,
            min_score=min_score,
            where={"domain": domain},
        )

    def get_stats(self) -> Dict:
        """컬렉션 통계."""
        return {
            "collection_name": self._collection_name,
            "count": self.collection.count(),
            "persist_dir": self._persist_dir,
        }

    def reset(self):
        """컬렉션 초기화 (마이그레이션/테스트용)."""
        try:
            self.client.delete_collection(self._collection_name)
        except Exception:
            pass
        self._collection = None
        logger.info("[VectorStore] Collection '%s' reset", self._collection_name)

    def has_data(self) -> bool:
        """데이터가 인덱싱되어 있는지 확인."""
        try:
            return self.collection.count() > 0
        except Exception:
            return False


# =============================================================================
# Manager cache
# =============================================================================
_vector_store_cache: Dict[Tuple[str, str, Optional[str]], VectorStoreManager] = {}
_vector_store_lock = Lock()


def _normalize_persist_dir(persist_dir: Optional[str]) -> str:
    return os.path.abspath(persist_dir or _DEFAULT_PERSIST_DIR)


def get_vector_store(
    collection_name: str = "graph_nodes",
    persist_dir: str = None,
    embedding_model_id: Optional[str] = None,
) -> VectorStoreManager:
    """Return cached VectorStoreManager keyed by persist_dir/collection/model."""
    normalized_persist_dir = _normalize_persist_dir(persist_dir)
    normalized_collection = (collection_name or "graph_nodes").strip()
    normalized_model_id = embedding_model_id.strip() if embedding_model_id else None
    cache_key = (normalized_persist_dir, normalized_collection, normalized_model_id)

    with _vector_store_lock:
        store = _vector_store_cache.get(cache_key)
        if store is None:
            store = VectorStoreManager(
                persist_dir=normalized_persist_dir,
                collection_name=normalized_collection,
            )
            _vector_store_cache[cache_key] = store
            logger.info(
                "[VectorStore] Created manager (persist_dir=%s, collection=%s, embedding_model_id=%s)",
                normalized_persist_dir,
                normalized_collection,
                normalized_model_id or "-",
            )
        return store


def get_domain_vector_store(domain: str) -> VectorStoreManager:
    """Return domain-specific ChromaDB collection manager."""
    return get_vector_store(collection_name=f"domain_{domain}")

