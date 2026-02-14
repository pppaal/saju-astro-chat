# tests/unit/test_vector_store.py
"""
ChromaDB VectorStoreManager 유닛 테스트.

chromadb가 설치되지 않은 환경에서도 graceful하게 스킵.
"""

import os
import shutil
import tempfile
import importlib

import pytest

# chromadb 설치 여부 확인
try:
    import chromadb
    HAS_CHROMADB = True
except ImportError:
    HAS_CHROMADB = False


@pytest.fixture
def temp_persist_dir():
    """임시 ChromaDB 저장 디렉토리."""
    d = tempfile.mkdtemp(prefix="test_chromadb_")
    yield d
    shutil.rmtree(d, ignore_errors=True)


@pytest.fixture
def vector_store(temp_persist_dir):
    """테스트용 VectorStoreManager 인스턴스."""
    from app.rag.vector_store import VectorStoreManager
    return VectorStoreManager(
        persist_dir=temp_persist_dir,
        collection_name="test_collection",
    )


class TestVectorStoreFactoryCache:
    """Factory cache behavior tests (no chromadb runtime required)."""

    def test_same_key_reuses_instance(self, tmp_path):
        import backend_ai.app.rag.vector_store as vs_mod

        importlib.reload(vs_mod)
        persist_dir = str(tmp_path / "chromadb")

        vs1 = vs_mod.get_vector_store(collection_name="domain_tarot", persist_dir=persist_dir)
        vs2 = vs_mod.get_vector_store(collection_name="domain_tarot", persist_dir=persist_dir)

        assert vs1 is vs2

    def test_different_collection_creates_separate_instance(self, tmp_path):
        import backend_ai.app.rag.vector_store as vs_mod

        importlib.reload(vs_mod)
        persist_dir = str(tmp_path / "chromadb")

        vs_tarot = vs_mod.get_vector_store(collection_name="domain_tarot", persist_dir=persist_dir)
        vs_corpus = vs_mod.get_vector_store(collection_name="corpus_nodes", persist_dir=persist_dir)

        assert vs_tarot is not vs_corpus
        assert vs_tarot._collection_name == "domain_tarot"
        assert vs_corpus._collection_name == "corpus_nodes"

    def test_embedding_model_id_splits_cache(self, tmp_path):
        import backend_ai.app.rag.vector_store as vs_mod

        importlib.reload(vs_mod)
        persist_dir = str(tmp_path / "chromadb")

        vs_a = vs_mod.get_vector_store(
            collection_name="domain_tarot",
            persist_dir=persist_dir,
            embedding_model_id="model_a",
        )
        vs_b = vs_mod.get_vector_store(
            collection_name="domain_tarot",
            persist_dir=persist_dir,
            embedding_model_id="model_b",
        )

        assert vs_a is not vs_b


@pytest.mark.skipif(not HAS_CHROMADB, reason="chromadb not installed")
class TestVectorStoreManager:
    """VectorStoreManager 기본 기능 테스트."""

    def test_init(self, vector_store):
        """초기화 시 컬렉션이 비어있어야 한다."""
        assert vector_store.has_data() is False
        stats = vector_store.get_stats()
        assert stats["count"] == 0
        assert stats["collection_name"] == "test_collection"

    def test_index_and_search(self, vector_store):
        """인덱싱 후 검색이 정상 동작해야 한다."""
        # 테스트 데이터 (384D MiniLM 임베딩 시뮬레이션)
        dim = 384
        import random
        random.seed(42)

        ids = ["node_0", "node_1", "node_2"]
        texts = ["목성 사수자리 확장 행운", "토성 염소자리 제한 책임", "금성 천칭자리 사랑 조화"]
        embeddings = [[random.gauss(0, 1) for _ in range(dim)] for _ in range(3)]
        metadatas = [
            {"domain": "astro", "type": "planet_sign"},
            {"domain": "astro", "type": "planet_sign"},
            {"domain": "astro", "type": "planet_sign"},
        ]

        # 인덱싱
        count = vector_store.index_nodes(ids, texts, embeddings, metadatas)
        assert count == 3
        assert vector_store.has_data() is True
        assert vector_store.get_stats()["count"] == 3

        # 검색 (query_embedding)
        results = vector_store.search(
            query_embedding=embeddings[0],  # 첫 번째 노드와 동일한 임베딩
            top_k=3,
            min_score=0.0,
        )
        assert len(results) > 0
        assert results[0]["id"] == "node_0"  # 자기 자신이 가장 유사
        assert results[0]["score"] >= 0.9  # 동일 임베딩이므로 높은 점수

    def test_search_with_filter(self, vector_store):
        """메타데이터 필터링 검색이 동작해야 한다."""
        dim = 384
        import random
        random.seed(42)

        ids = ["saju_0", "astro_0", "saju_1"]
        texts = ["갑목 일간", "태양 사자자리", "을목 일간"]
        embeddings = [[random.gauss(0, 1) for _ in range(dim)] for _ in range(3)]
        metadatas = [
            {"domain": "saju"},
            {"domain": "astro"},
            {"domain": "saju"},
        ]

        vector_store.index_nodes(ids, texts, embeddings, metadatas)

        # 사주 도메인만 필터
        results = vector_store.search(
            query_embedding=embeddings[0],
            top_k=10,
            min_score=0.0,
            where={"domain": "saju"},
        )
        assert all(r["metadata"]["domain"] == "saju" for r in results)

    def test_search_by_domain(self, vector_store):
        """search_by_domain 헬퍼 메서드 테스트."""
        dim = 384
        import random
        random.seed(42)

        ids = ["t_0", "d_0"]
        texts = ["타로 카드 해석", "꿈 해석"]
        embeddings = [[random.gauss(0, 1) for _ in range(dim)] for _ in range(2)]
        metadatas = [{"domain": "tarot"}, {"domain": "dream"}]

        vector_store.index_nodes(ids, texts, embeddings, metadatas)

        results = vector_store.search_by_domain(
            query_embedding=embeddings[0],
            domain="tarot",
            top_k=5,
            min_score=0.0,
        )
        assert len(results) == 1
        assert results[0]["metadata"]["domain"] == "tarot"

    def test_min_score_filter(self, vector_store):
        """min_score 임계값 필터링이 동작해야 한다."""
        dim = 384
        import random
        random.seed(42)

        ids = ["n_0"]
        texts = ["테스트 노드"]
        embeddings = [[random.gauss(0, 1) for _ in range(dim)]]

        vector_store.index_nodes(ids, texts, embeddings)

        # 매우 다른 임베딩으로 검색 → 낮은 유사도
        diff_emb = [random.gauss(0, 1) for _ in range(dim)]
        results = vector_store.search(
            query_embedding=diff_emb,
            top_k=5,
            min_score=0.99,  # 매우 높은 임계값
        )
        # 결과가 없거나, 있더라도 0.99 이상이어야 함
        for r in results:
            assert r["score"] >= 0.99

    def test_batch_indexing(self, vector_store):
        """대량 배치 인덱싱이 정상 동작해야 한다."""
        dim = 384
        import random
        random.seed(42)

        n = 100
        ids = [f"batch_{i}" for i in range(n)]
        texts = [f"노드 설명 {i}" for i in range(n)]
        embeddings = [[random.gauss(0, 1) for _ in range(dim)] for _ in range(n)]

        count = vector_store.index_nodes(ids, texts, embeddings, batch_size=30)
        assert count == n
        assert vector_store.get_stats()["count"] == n

    def test_upsert_overwrites(self, vector_store):
        """동일 ID로 upsert 시 덮어쓰기가 되어야 한다."""
        dim = 384
        import random
        random.seed(42)

        emb = [random.gauss(0, 1) for _ in range(dim)]

        vector_store.index_nodes(["id_1"], ["원본 텍스트"], [emb])
        assert vector_store.get_stats()["count"] == 1

        # 같은 ID로 다른 텍스트 upsert
        vector_store.index_nodes(["id_1"], ["수정된 텍스트"], [emb])
        assert vector_store.get_stats()["count"] == 1  # 수가 증가하지 않아야 함

    def test_reset(self, vector_store):
        """reset() 후 컬렉션이 비어야 한다."""
        dim = 384
        import random
        random.seed(42)

        emb = [random.gauss(0, 1) for _ in range(dim)]
        vector_store.index_nodes(["id_1"], ["텍스트"], [emb])
        assert vector_store.has_data() is True

        vector_store.reset()
        # reset 후 새 컬렉션 접근
        assert vector_store.collection.count() == 0

    def test_empty_search(self, vector_store):
        """빈 컬렉션 검색 시 빈 리스트 반환."""
        dim = 384
        import random
        random.seed(42)

        results = vector_store.search(
            query_embedding=[random.gauss(0, 1) for _ in range(dim)],
            top_k=5,
        )
        assert results == []

    def test_metadata_sanitization(self, vector_store):
        """ChromaDB 비호환 메타데이터가 정리되어야 한다."""
        dim = 384
        import random
        random.seed(42)

        emb = [random.gauss(0, 1) for _ in range(dim)]
        # list, dict 등 ChromaDB 비호환 타입 포함
        bad_meta = [{"domain": "test", "nested": {"a": 1}, "tags": ["a", "b"], "valid_int": 42}]

        # 에러 없이 인덱싱되어야 함
        count = vector_store.index_nodes(["id_1"], ["텍스트"], [emb], bad_meta)
        assert count == 1


@pytest.mark.skipif(not HAS_CHROMADB, reason="chromadb not installed")
class TestFeatureFlag:
    """USE_CHROMADB Feature Flag 테스트."""

    def test_flag_off(self, monkeypatch):
        """USE_CHROMADB=0일 때 flag가 False여야 한다."""
        monkeypatch.setenv("USE_CHROMADB", "0")

        import importlib
        import app.rag.vector_store as vs_mod
        importlib.reload(vs_mod)

        assert vs_mod.USE_CHROMADB is False

    def test_flag_on(self, monkeypatch):
        """USE_CHROMADB=1일 때 flag가 True여야 한다."""
        monkeypatch.setenv("USE_CHROMADB", "1")

        import importlib
        import app.rag.vector_store as vs_mod
        importlib.reload(vs_mod)

        assert vs_mod.USE_CHROMADB is True


@pytest.mark.skipif(not HAS_CHROMADB, reason="chromadb not installed")
class TestDomainVectorStore:
    """도메인별 벡터 스토어 테스트."""

    def test_separate_collections(self, temp_persist_dir):
        """도메인별로 별도 컬렉션이 생성되어야 한다."""
        from app.rag.vector_store import VectorStoreManager

        vs_tarot = VectorStoreManager(persist_dir=temp_persist_dir, collection_name="domain_tarot")
        vs_dream = VectorStoreManager(persist_dir=temp_persist_dir, collection_name="domain_dream")

        dim = 384
        import random
        random.seed(42)

        emb = [random.gauss(0, 1) for _ in range(dim)]

        vs_tarot.index_nodes(["t_0"], ["타로 텍스트"], [emb])
        vs_dream.index_nodes(["d_0"], ["꿈 텍스트"], [emb])

        assert vs_tarot.get_stats()["count"] == 1
        assert vs_dream.get_stats()["count"] == 1
        assert vs_tarot.get_stats()["collection_name"] == "domain_tarot"
        assert vs_dream.get_stats()["collection_name"] == "domain_dream"
