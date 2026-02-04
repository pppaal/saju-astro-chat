# tests/unit/test_model_manager.py
"""
임베딩 모델 관리자 유닛 테스트 (Phase 6).

모델 로딩 없이 설정, 메타데이터, prefix 로직만 테스트.
"""

import pytest
from unittest.mock import patch, MagicMock

from app.rag.model_manager import (
    EMBEDDING_MODELS,
    EmbeddingModelManager,
    get_embedding_manager,
    get_shared_model,
    is_model_available,
    get_model_info,
)


# ─── EMBEDDING_MODELS 설정 테스트 ─────────────

class TestEmbeddingModels:
    """임베딩 모델 설정 테스트."""

    def test_minilm_exists(self):
        """minilm 모델 설정이 있어야 한다."""
        assert "minilm" in EMBEDDING_MODELS
        assert EMBEDDING_MODELS["minilm"]["dim"] == 384

    def test_e5_large_exists(self):
        """e5-large 모델 설정이 있어야 한다."""
        assert "e5-large" in EMBEDDING_MODELS
        assert EMBEDDING_MODELS["e5-large"]["dim"] == 1024

    def test_bge_m3_exists(self):
        """bge-m3 모델 설정이 있어야 한다."""
        assert "bge-m3" in EMBEDDING_MODELS
        assert EMBEDDING_MODELS["bge-m3"]["dim"] == 1024

    def test_e5_has_prefix(self):
        """E5 모델에 query/passage prefix가 있어야 한다."""
        e5 = EMBEDDING_MODELS["e5-large"]
        assert "query_prefix" in e5
        assert "passage_prefix" in e5
        assert e5["query_prefix"] == "query: "
        assert e5["passage_prefix"] == "passage: "

    def test_minilm_no_prefix(self):
        """MiniLM에는 prefix가 없어야 한다."""
        minilm = EMBEDDING_MODELS["minilm"]
        assert "query_prefix" not in minilm
        assert "passage_prefix" not in minilm

    def test_all_have_required_fields(self):
        """모든 모델에 필수 필드가 있어야 한다."""
        for key, config in EMBEDDING_MODELS.items():
            assert "name" in config, f"{key} missing 'name'"
            assert "dim" in config, f"{key} missing 'dim'"
            assert "description" in config, f"{key} missing 'description'"
            assert isinstance(config["dim"], int)

    def test_model_count(self):
        """최소 3개 모델이 등록되어야 한다."""
        assert len(EMBEDDING_MODELS) >= 3


# ─── EmbeddingModelManager 설정 테스트 ────────

class TestManagerConfig:
    """EmbeddingModelManager 설정 테스트 (모델 로드 없이)."""

    def test_default_model_key(self):
        """기본 모델 키 확인."""
        mgr = EmbeddingModelManager.__new__(EmbeddingModelManager)
        mgr._model_key = "minilm"
        mgr._model = None
        mgr._config = EMBEDDING_MODELS["minilm"]
        assert mgr.model_key == "minilm"

    def test_dimension_minilm(self):
        """MiniLM 차원: 384."""
        mgr = EmbeddingModelManager.__new__(EmbeddingModelManager)
        mgr._model_key = "minilm"
        mgr._model = None
        mgr._config = EMBEDDING_MODELS["minilm"]
        assert mgr.dimension == 384

    def test_dimension_e5(self):
        """E5-large 차원: 1024."""
        mgr = EmbeddingModelManager.__new__(EmbeddingModelManager)
        mgr._model_key = "e5-large"
        mgr._model = None
        mgr._config = EMBEDDING_MODELS["e5-large"]
        assert mgr.dimension == 1024

    def test_dimension_bge(self):
        """BGE-M3 차원: 1024."""
        mgr = EmbeddingModelManager.__new__(EmbeddingModelManager)
        mgr._model_key = "bge-m3"
        mgr._model = None
        mgr._config = EMBEDDING_MODELS["bge-m3"]
        assert mgr.dimension == 1024

    def test_config_copy(self):
        """config는 복사본을 반환."""
        mgr = EmbeddingModelManager.__new__(EmbeddingModelManager)
        mgr._config = EMBEDDING_MODELS["minilm"]
        config1 = mgr.config
        config2 = mgr.config
        assert config1 is not config2
        assert config1 == config2

    def test_invalid_model_falls_back(self):
        """유효하지 않은 모델 키는 minilm으로 fallback."""
        mgr = EmbeddingModelManager(model_key="nonexistent")
        assert mgr.dimension == 384  # minilm fallback


# ─── Prefix 적용 테스트 (mock) ─────────────────

class TestPrefixApplication:
    """모델별 prefix 적용 테스트."""

    def _make_manager_with_mock(self, model_key):
        """모델을 mock으로 대체한 매니저."""
        mgr = EmbeddingModelManager.__new__(EmbeddingModelManager)
        mgr._model_key = model_key
        mgr._config = EMBEDDING_MODELS[model_key]
        mgr._model = MagicMock()
        mgr._model.encode.return_value = "mock_embedding"
        return mgr

    def test_e5_query_prefix(self):
        """E5 모델: query prefix 적용."""
        mgr = self._make_manager_with_mock("e5-large")
        mgr.encode_query("test query")
        args, kwargs = mgr._model.encode.call_args
        assert args[0] == "query: test query"

    def test_e5_passage_prefix(self):
        """E5 모델: passage prefix 적용."""
        mgr = self._make_manager_with_mock("e5-large")
        mgr.encode_passage("test passage")
        args, kwargs = mgr._model.encode.call_args
        assert args[0] == "passage: test passage"

    def test_minilm_no_query_prefix(self):
        """MiniLM: prefix 없음."""
        mgr = self._make_manager_with_mock("minilm")
        mgr.encode_query("test query")
        args, kwargs = mgr._model.encode.call_args
        assert args[0] == "test query"

    def test_minilm_no_passage_prefix(self):
        """MiniLM: passage prefix 없음."""
        mgr = self._make_manager_with_mock("minilm")
        mgr.encode_passage("test passage")
        args, kwargs = mgr._model.encode.call_args
        assert args[0] == "test passage"

    def test_batch_query_prefix(self):
        """배치: query prefix 적용."""
        mgr = self._make_manager_with_mock("e5-large")
        mgr.encode_batch(["text1", "text2"], is_query=True)
        args, kwargs = mgr._model.encode.call_args
        assert args[0] == ["query: text1", "query: text2"]

    def test_batch_passage_prefix(self):
        """배치: passage prefix 적용."""
        mgr = self._make_manager_with_mock("e5-large")
        mgr.encode_batch(["text1", "text2"], is_query=False)
        args, kwargs = mgr._model.encode.call_args
        assert args[0] == ["passage: text1", "passage: text2"]

    def test_batch_no_prefix(self):
        """배치: MiniLM prefix 없음."""
        mgr = self._make_manager_with_mock("minilm")
        mgr.encode_batch(["text1", "text2"], is_query=True)
        args, kwargs = mgr._model.encode.call_args
        assert args[0] == ["text1", "text2"]

    def test_encode_normalize(self):
        """인코딩 시 normalize_embeddings=True."""
        mgr = self._make_manager_with_mock("minilm")
        mgr.encode_query("test")
        _, kwargs = mgr._model.encode.call_args
        assert kwargs["normalize_embeddings"] is True


# ─── get_info 테스트 ─────────────────────────

class TestGetInfo:
    """get_info 테스트."""

    def test_info_keys(self):
        """info에 필수 키가 있어야 한다."""
        mgr = EmbeddingModelManager.__new__(EmbeddingModelManager)
        mgr._model_key = "minilm"
        mgr._model = None
        mgr._config = EMBEDDING_MODELS["minilm"]
        info = mgr.get_info()
        assert "model_key" in info
        assert "model_name" in info
        assert "dimension" in info
        assert "description" in info
        assert "device" in info

    def test_info_e5_has_prefix_flag(self):
        """E5 info에 has_query_prefix가 True."""
        mgr = EmbeddingModelManager.__new__(EmbeddingModelManager)
        mgr._model_key = "e5-large"
        mgr._model = None
        mgr._config = EMBEDDING_MODELS["e5-large"]
        info = mgr.get_info()
        assert info["has_query_prefix"] is True

    def test_info_minilm_no_prefix_flag(self):
        """MiniLM info에 has_query_prefix가 False."""
        mgr = EmbeddingModelManager.__new__(EmbeddingModelManager)
        mgr._model_key = "minilm"
        mgr._model = None
        mgr._config = EMBEDDING_MODELS["minilm"]
        info = mgr.get_info()
        assert info["has_query_prefix"] is False


# ─── None 모델 안전성 테스트 ─────────────────

class TestNoneModelSafety:
    """모델이 None일 때 안전하게 동작."""

    def _make_none_manager(self):
        """모델 없는 매니저."""
        mgr = EmbeddingModelManager.__new__(EmbeddingModelManager)
        mgr._model_key = "minilm"
        mgr._model = None
        mgr._config = EMBEDDING_MODELS["minilm"]
        return mgr

    def test_encode_query_none(self):
        """모델 None 시 encode_query 안전."""
        mgr = self._make_none_manager()
        # _load_model을 mock하여 None 반환
        mgr._load_model = lambda: None
        result = mgr.encode_query("test")
        assert result is None

    def test_encode_passage_none(self):
        """모델 None 시 encode_passage 안전."""
        mgr = self._make_none_manager()
        mgr._load_model = lambda: None
        result = mgr.encode_passage("test")
        assert result is None

    def test_encode_batch_none(self):
        """모델 None 시 encode_batch 안전."""
        mgr = self._make_none_manager()
        mgr._load_model = lambda: None
        result = mgr.encode_batch(["test1", "test2"])
        assert result is None


# ─── 하위 호환성 인터페이스 테스트 ────────────

class TestBackwardCompatibility:
    """하위 호환성 인터페이스 테스트."""

    def test_get_shared_model_exists(self):
        """get_shared_model 함수 존재."""
        assert callable(get_shared_model)

    def test_is_model_available_exists(self):
        """is_model_available 함수 존재."""
        assert callable(is_model_available)

    def test_get_model_info_exists(self):
        """get_model_info 함수 존재."""
        assert callable(get_model_info)

    def test_get_embedding_manager_exists(self):
        """get_embedding_manager 함수 존재."""
        assert callable(get_embedding_manager)
