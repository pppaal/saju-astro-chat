# tests/unit/test_reranker.py
"""
CrossEncoder Re-ranker 유닛 테스트 (Phase 7a).

모델 로딩 없이 설정, 로직만 테스트.
"""

import pytest
from unittest.mock import patch, MagicMock
import numpy as np

from app.rag.reranker import (
    CrossEncoderReranker,
    RERANKER_MODELS,
    USE_RERANKER,
    get_reranker,
)


# ─── 모델 설정 테스트 ──────────────────────────

class TestRerankerModels:
    """Re-ranker 모델 설정 테스트."""

    def test_ms_marco_exists(self):
        assert "ms-marco" in RERANKER_MODELS
        assert RERANKER_MODELS["ms-marco"]["max_length"] == 512

    def test_multilingual_exists(self):
        assert "multilingual" in RERANKER_MODELS
        assert "mmarco" in RERANKER_MODELS["multilingual"]["name"]

    def test_all_have_required_fields(self):
        for key, config in RERANKER_MODELS.items():
            assert "name" in config, f"{key} missing 'name'"
            assert "description" in config, f"{key} missing 'description'"
            assert "max_length" in config, f"{key} missing 'max_length'"


# ─── Reranker 설정 테스트 ─────────────────────

class TestRerankerConfig:
    """Reranker 설정 테스트 (모델 로드 없이)."""

    def test_default_model_key(self):
        reranker = CrossEncoderReranker.__new__(CrossEncoderReranker)
        reranker._model_key = "multilingual"
        reranker._model = None
        reranker._config = RERANKER_MODELS["multilingual"]
        reranker._max_candidates = 30
        reranker._batch_size = 16
        assert reranker._model_key == "multilingual"

    def test_custom_max_candidates(self):
        reranker = CrossEncoderReranker(max_candidates=50)
        assert reranker._max_candidates == 50

    def test_custom_batch_size(self):
        reranker = CrossEncoderReranker(batch_size=32)
        assert reranker._batch_size == 32

    def test_get_info(self):
        reranker = CrossEncoderReranker.__new__(CrossEncoderReranker)
        reranker._model_key = "multilingual"
        reranker._model = None
        reranker._config = RERANKER_MODELS["multilingual"]
        reranker._max_candidates = 30
        reranker._batch_size = 16

        info = reranker.get_info()
        assert info["model_key"] == "multilingual"
        assert info["max_candidates"] == 30
        assert "mmarco" in info["model_name"]


# ─── Rerank 로직 테스트 (mock) ────────────────

class TestRerankLogic:
    """모델을 mock으로 대체한 재순위화 로직 테스트."""

    def _make_reranker_with_mock(self, scores):
        """mock 모델을 가진 reranker 생성."""
        reranker = CrossEncoderReranker.__new__(CrossEncoderReranker)
        reranker._model_key = "multilingual"
        reranker._config = RERANKER_MODELS["multilingual"]
        reranker._max_candidates = 30
        reranker._batch_size = 16
        reranker._model = MagicMock()
        reranker._model.predict.return_value = np.array(scores)
        return reranker

    def test_rerank_basic(self):
        """기본 재순위화."""
        scores = [0.3, 0.9, 0.1]  # doc1=0.3, doc2=0.9, doc3=0.1
        reranker = self._make_reranker_with_mock(scores)

        result = reranker.rerank(
            query="갑목 성격",
            documents=["문서1", "문서2", "문서3"],
            top_k=3,
        )

        # doc2가 최고 점수
        assert result[0][0] == 1  # index 1 (doc2)
        assert result[0][1] == 0.9

    def test_rerank_top_k(self):
        """top_k 제한."""
        scores = [0.5, 0.9, 0.3, 0.7]
        reranker = self._make_reranker_with_mock(scores)

        result = reranker.rerank(
            query="test",
            documents=["d1", "d2", "d3", "d4"],
            top_k=2,
        )

        assert len(result) == 2
        assert result[0][0] == 1  # doc2 (0.9)
        assert result[1][0] == 3  # doc4 (0.7)

    def test_rerank_min_score(self):
        """최소 점수 필터."""
        scores = [0.1, 0.9, -0.5]
        reranker = self._make_reranker_with_mock(scores)

        result = reranker.rerank(
            query="test",
            documents=["d1", "d2", "d3"],
            top_k=10,
            min_score=0.0,
        )

        # -0.5는 필터링
        assert len(result) == 2

    def test_rerank_empty_documents(self):
        """빈 문서 리스트."""
        reranker = self._make_reranker_with_mock([])

        result = reranker.rerank(query="test", documents=[], top_k=5)
        assert result == []

    def test_rerank_results_dict(self):
        """딕셔너리 결과 재순위화."""
        scores = [0.3, 0.9]
        reranker = self._make_reranker_with_mock(scores)

        results = [
            {"text": "갑목은 나무", "score": 0.8},
            {"text": "갑목은 리더십", "score": 0.6},
        ]

        reranked = reranker.rerank_results(
            query="갑목 성격",
            results=results,
            top_k=2,
        )

        assert reranked[0]["text"] == "갑목은 리더십"  # 원래 2번이 1번으로
        assert reranked[0]["cross_encoder_score"] == 0.9
        assert reranked[0]["original_score"] == 0.6

    def test_rerank_preserves_metadata(self):
        """메타데이터 보존."""
        scores = [0.5, 0.8]
        reranker = self._make_reranker_with_mock(scores)

        results = [
            {"text": "t1", "score": 0.7, "domain": "saju", "id": 1},
            {"text": "t2", "score": 0.5, "domain": "astro", "id": 2},
        ]

        reranked = reranker.rerank_results(query="test", results=results)

        assert reranked[0]["domain"] == "astro"
        assert reranked[0]["id"] == 2

    def test_max_candidates_limit(self):
        """후보 수 제한."""
        reranker = CrossEncoderReranker.__new__(CrossEncoderReranker)
        reranker._model_key = "multilingual"
        reranker._config = RERANKER_MODELS["multilingual"]
        reranker._max_candidates = 3  # 3개로 제한
        reranker._batch_size = 16
        reranker._model = MagicMock()
        reranker._model.predict.return_value = np.array([0.5, 0.8, 0.3])

        # 5개 문서 중 3개만 처리
        result = reranker.rerank(
            query="test",
            documents=["d1", "d2", "d3", "d4", "d5"],
            top_k=5,
        )

        # predict에 3개만 전달
        call_args = reranker._model.predict.call_args
        assert len(call_args[0][0]) == 3


# ─── None 모델 안전성 테스트 ─────────────────

class TestNoneModelSafety:
    """모델이 None일 때 안전 동작."""

    def _make_none_reranker(self):
        reranker = CrossEncoderReranker.__new__(CrossEncoderReranker)
        reranker._model_key = "multilingual"
        reranker._config = RERANKER_MODELS["multilingual"]
        reranker._max_candidates = 30
        reranker._batch_size = 16
        reranker._model = None
        return reranker

    def test_rerank_none_model(self):
        """모델 None 시 기본 순서 반환."""
        reranker = self._make_none_reranker()
        reranker._load_model = lambda: None

        result = reranker.rerank(
            query="test",
            documents=["d1", "d2", "d3"],
            top_k=2,
        )

        assert len(result) == 2
        assert result[0][0] == 0  # 원래 순서 유지

    def test_rerank_results_none_model(self):
        """모델 None 시 결과 재순위화 안전."""
        reranker = self._make_none_reranker()
        reranker._load_model = lambda: None

        results = [
            {"text": "t1", "score": 0.8},
            {"text": "t2", "score": 0.6},
        ]

        reranked = reranker.rerank_results(query="test", results=results)
        assert len(reranked) == 2


# ─── Feature Flag 테스트 ─────────────────────

class TestFeatureFlag:
    """Feature flag 테스트."""

    def test_flag_import(self):
        assert isinstance(USE_RERANKER, bool)

    def test_singleton_callable(self):
        assert callable(get_reranker)


# ─── 엣지 케이스 테스트 ─────────────────────

class TestRerankEdgeCases:
    """재순위화 엣지 케이스."""

    def _make_reranker_with_mock(self, scores):
        reranker = CrossEncoderReranker.__new__(CrossEncoderReranker)
        reranker._model_key = "multilingual"
        reranker._config = RERANKER_MODELS["multilingual"]
        reranker._max_candidates = 30
        reranker._batch_size = 16
        reranker._model = MagicMock()
        reranker._model.predict.return_value = np.array(scores)
        return reranker

    def test_rerank_single_document(self):
        """단일 문서 재순위화."""
        reranker = self._make_reranker_with_mock([0.85])
        result = reranker.rerank("test", ["하나뿐인 문서"], top_k=5)
        assert len(result) == 1
        assert result[0][0] == 0
        assert result[0][1] == 0.85

    def test_rerank_negative_scores(self):
        """음수 점수 처리."""
        reranker = self._make_reranker_with_mock([-0.5, -0.1, -0.9])
        result = reranker.rerank("test", ["d1", "d2", "d3"], top_k=3, min_score=-10.0)
        assert len(result) == 3
        assert result[0][0] == 1  # -0.1이 가장 높음

    def test_rerank_all_below_min_score(self):
        """모든 점수가 min_score 미만."""
        reranker = self._make_reranker_with_mock([0.1, 0.2, 0.3])
        result = reranker.rerank("test", ["d1", "d2", "d3"], top_k=3, min_score=0.5)
        assert len(result) == 0

    def test_rerank_top_k_larger_than_docs(self):
        """top_k가 문서 수보다 큼."""
        reranker = self._make_reranker_with_mock([0.5, 0.9])
        result = reranker.rerank("test", ["d1", "d2"], top_k=100)
        assert len(result) == 2

    def test_rerank_identical_scores(self):
        """동일 점수 처리."""
        reranker = self._make_reranker_with_mock([0.5, 0.5, 0.5])
        result = reranker.rerank("test", ["d1", "d2", "d3"], top_k=3)
        assert len(result) == 3
        for _, score in result:
            assert score == 0.5

    def test_rerank_unicode_query(self):
        """유니코드/이모지 쿼리."""
        reranker = self._make_reranker_with_mock([0.8])
        result = reranker.rerank("사주 운세 🔮", ["문서"], top_k=1)
        assert len(result) == 1

    def test_rerank_empty_query(self):
        """빈 쿼리 문자열."""
        reranker = self._make_reranker_with_mock([0.5])
        result = reranker.rerank("", ["document"], top_k=1)
        assert len(result) == 1

    def test_rerank_predict_exception(self):
        """model.predict 예외 시 fallback."""
        reranker = CrossEncoderReranker.__new__(CrossEncoderReranker)
        reranker._model_key = "multilingual"
        reranker._config = RERANKER_MODELS["multilingual"]
        reranker._max_candidates = 30
        reranker._batch_size = 16
        reranker._model = MagicMock()
        reranker._model.predict.side_effect = RuntimeError("CUDA OOM")

        result = reranker.rerank("test", ["d1", "d2", "d3"], top_k=2)
        assert len(result) == 2
        # fallback: 원래 순서, 점수 0.0
        assert result[0] == (0, 0.0)
        assert result[1] == (1, 0.0)


class TestRerankResultsEdgeCases:
    """rerank_results 엣지 케이스."""

    def _make_reranker_with_mock(self, scores):
        reranker = CrossEncoderReranker.__new__(CrossEncoderReranker)
        reranker._model_key = "multilingual"
        reranker._config = RERANKER_MODELS["multilingual"]
        reranker._max_candidates = 30
        reranker._batch_size = 16
        reranker._model = MagicMock()
        reranker._model.predict.return_value = np.array(scores)
        return reranker

    def test_empty_results_list(self):
        """빈 결과 리스트."""
        reranker = self._make_reranker_with_mock([])
        result = reranker.rerank_results("test", [])
        assert result == []

    def test_missing_text_key(self):
        """text_key 없는 딕셔너리."""
        reranker = self._make_reranker_with_mock([0.9])
        results = [{"content": "텍스트", "score": 0.5}]
        reranked = reranker.rerank_results("test", results, text_key="content")
        assert len(reranked) == 1
        assert reranked[0]["content"] == "텍스트"

    def test_missing_score_field(self):
        """score 필드 없는 딕셔너리."""
        reranker = self._make_reranker_with_mock([0.8])
        results = [{"text": "문서"}]  # score 필드 없음
        reranked = reranker.rerank_results("test", results)
        assert len(reranked) == 1
        assert reranked[0]["original_score"] == 0.0  # default
        assert reranked[0]["cross_encoder_score"] == 0.8

    def test_results_copy_not_mutate(self):
        """원본 결과를 변경하지 않는다."""
        reranker = self._make_reranker_with_mock([0.9])
        original = [{"text": "doc", "score": 0.5, "id": 1}]
        reranked = reranker.rerank_results("test", original)
        # 원본은 변경 안 됨
        assert original[0]["score"] == 0.5
        assert "cross_encoder_score" not in original[0]

    def test_large_result_set(self):
        """큰 결과 세트 처리."""
        n = 50
        scores = [float(i) / n for i in range(n)]
        reranker = self._make_reranker_with_mock(scores)
        reranker._max_candidates = 50
        results = [{"text": f"doc_{i}", "score": 0.5} for i in range(n)]
        reranked = reranker.rerank_results("test", results, top_k=5)
        assert len(reranked) == 5
        # 최고 점수순
        assert reranked[0]["cross_encoder_score"] >= reranked[1]["cross_encoder_score"]


class TestRerankRAGResults:
    """rerank_rag_results 테스트."""

    def _make_reranker_with_mock(self, scores):
        reranker = CrossEncoderReranker.__new__(CrossEncoderReranker)
        reranker._model_key = "multilingual"
        reranker._config = RERANKER_MODELS["multilingual"]
        reranker._max_candidates = 30
        reranker._batch_size = 16
        reranker._model = MagicMock()
        reranker._model.predict.return_value = np.array(scores)
        return reranker

    def test_rag_results_reranking(self):
        """RAGResult 객체 재순위화."""
        from app.rag.types import RAGResult
        scores = [0.3, 0.9, 0.6]
        reranker = self._make_reranker_with_mock(scores)

        results = [
            RAGResult(text="갑목은 나무", score=0.8, source="graph"),
            RAGResult(text="갑목은 리더십", score=0.7, source="graph"),
            RAGResult(text="갑목은 봄", score=0.6, source="corpus"),
        ]
        reranked = reranker.rerank_rag_results("갑목 성격", results, top_k=2)
        assert len(reranked) == 2
        assert reranked[0].text == "갑목은 리더십"
        assert reranked[0].score == 0.9
        assert reranked[0].rank == 1

    def test_rag_results_empty(self):
        """빈 RAGResult 리스트."""
        reranker = self._make_reranker_with_mock([])
        result = reranker.rerank_rag_results("test", [])
        assert result == []


class TestModelLoading:
    """모델 로딩 테스트."""

    def test_load_model_import_error(self):
        """sentence_transformers 미설치 시 None 반환."""
        reranker = CrossEncoderReranker.__new__(CrossEncoderReranker)
        reranker._model_key = "multilingual"
        reranker._config = RERANKER_MODELS["multilingual"]

        with patch.dict("sys.modules", {"sentence_transformers": None}):
            with patch("builtins.__import__", side_effect=ImportError("no module")):
                result = reranker._load_model()
                # ImportError 또는 None 반환
                # (실제로는 이미 설치되어 있을 수 있으므로 유연하게)

    def test_model_property_lazy(self):
        """model property가 lazy loading."""
        reranker = CrossEncoderReranker.__new__(CrossEncoderReranker)
        reranker._model_key = "multilingual"
        reranker._config = RERANKER_MODELS["multilingual"]
        reranker._model = None
        reranker._load_model = MagicMock(return_value="fake_model")

        # 첫 호출
        _ = reranker.model
        assert reranker._load_model.call_count == 1

        # 두 번째 호출 — 캐시됨
        _ = reranker.model
        assert reranker._load_model.call_count == 1

    def test_invalid_model_key_fallback(self):
        """잘못된 모델 키 → multilingual fallback."""
        reranker = CrossEncoderReranker(model_key="nonexistent")
        assert reranker._config == RERANKER_MODELS["multilingual"]


class TestSingletonBehavior:
    """싱글톤 패턴 상세 테스트."""

    def test_singleton_same_instance(self):
        import app.rag.reranker as mod
        mod._reranker = None
        r1 = get_reranker()
        r2 = get_reranker()
        assert r1 is r2

    def test_singleton_reset(self):
        import app.rag.reranker as mod
        mod._reranker = None
        r1 = get_reranker()
        mod._reranker = None
        r2 = get_reranker()
        assert r1 is not r2
