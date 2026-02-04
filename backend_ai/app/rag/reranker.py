# app/rag/reranker.py
"""
CrossEncoder Re-ranker (Phase 7a)
==================================
초기 검색 결과를 CrossEncoder로 재순위화하여 정밀도 향상.

기존 Bi-Encoder 검색 (빠르지만 정밀도 제한):
  query embedding ↔ document embedding → cosine similarity

CrossEncoder 재순위화 (느리지만 고정밀):
  (query, document) pair → 직접 relevance score

Architecture:
  1단계: Bi-Encoder (기존) → 후보 top_k * 3 추출 (빠름)
  2단계: CrossEncoder → 후보를 재순위화 → 최종 top_k 반환 (정밀)

USE_RERANKER=1 환경변수로 활성화.
"""

import logging
import os
from typing import List, Dict, Optional, Tuple
from threading import Lock

logger = logging.getLogger(__name__)

# Feature flag
USE_RERANKER = os.environ.get("USE_RERANKER", "0") == "1"

# 지원 모델
RERANKER_MODELS = {
    "ms-marco": {
        "name": "cross-encoder/ms-marco-MiniLM-L-6-v2",
        "description": "경량 영어 re-ranker (기본)",
        "max_length": 512,
    },
    "multilingual": {
        "name": "cross-encoder/mmarco-mMiniLMv2-L12-H384-v1",
        "description": "다국어 re-ranker (한국어 지원)",
        "max_length": 512,
    },
}


class CrossEncoderReranker:
    """CrossEncoder 기반 검색 결과 재순위화.

    Bi-Encoder의 빠른 후보 추출 후, CrossEncoder로
    (query, document) 쌍을 직접 평가하여 정밀도를 높인다.

    Bi-Encoder: query와 document를 독립적으로 인코딩 (빠름, O(1) 비교)
    CrossEncoder: query-document 쌍을 함께 인코딩 (느림, 고정밀)
    """

    def __init__(
        self,
        model_key: str = "multilingual",
        max_candidates: int = 30,
        batch_size: int = 16,
    ):
        self._model_key = model_key
        self._config = RERANKER_MODELS.get(model_key, RERANKER_MODELS["multilingual"])
        self._model = None
        self._max_candidates = max_candidates
        self._batch_size = batch_size

    @property
    def model(self):
        """CrossEncoder 모델 (lazy loading)."""
        if self._model is None:
            self._model = self._load_model()
        return self._model

    def _load_model(self):
        """CrossEncoder 모델 로드."""
        model_name = self._config["name"]
        try:
            from sentence_transformers import CrossEncoder

            logger.info("[Reranker] 모델 로드: %s", model_name)
            model = CrossEncoder(
                model_name,
                max_length=self._config["max_length"],
            )
            return model
        except ImportError:
            logger.warning("[Reranker] sentence_transformers not installed")
            return None
        except Exception as e:
            logger.error("[Reranker] 모델 로드 실패: %s", e)
            return None

    def rerank(
        self,
        query: str,
        documents: List[str],
        top_k: int = 10,
        min_score: float = -10.0,
    ) -> List[Tuple[int, float]]:
        """문서 리스트를 쿼리 관련성으로 재순위화.

        Args:
            query: 검색 쿼리
            documents: 문서 텍스트 리스트 (Bi-Encoder 후보)
            top_k: 반환할 상위 결과 수
            min_score: 최소 점수 임계값

        Returns:
            [(원본_인덱스, cross_encoder_score), ...] top_k개
        """
        if self.model is None or not documents:
            return [(i, 0.0) for i in range(min(top_k, len(documents)))]

        # 후보 수 제한
        candidates = documents[: self._max_candidates]

        # (query, document) 쌍 생성
        pairs = [(query, doc) for doc in candidates]

        try:
            scores = self.model.predict(
                pairs,
                batch_size=self._batch_size,
                show_progress_bar=False,
            )

            # 점수 기반 정렬
            scored = [
                (i, float(scores[i]))
                for i in range(len(candidates))
                if float(scores[i]) >= min_score
            ]
            scored.sort(key=lambda x: x[1], reverse=True)

            return scored[:top_k]

        except Exception as e:
            logger.error("[Reranker] 재순위화 실패: %s", e)
            return [(i, 0.0) for i in range(min(top_k, len(documents)))]

    def rerank_results(
        self,
        query: str,
        results: List[Dict],
        text_key: str = "text",
        top_k: int = 10,
    ) -> List[Dict]:
        """딕셔너리 형태의 검색 결과를 재순위화.

        Args:
            query: 검색 쿼리
            results: [{"text": ..., "score": ..., ...}, ...]
            text_key: 텍스트 필드 키
            top_k: 반환할 결과 수

        Returns:
            재순위화된 결과 리스트 (cross_encoder_score 추가)
        """
        if not results:
            return results

        documents = [r.get(text_key, "") for r in results]
        reranked = self.rerank(query, documents, top_k=top_k)

        output = []
        for orig_idx, ce_score in reranked:
            if orig_idx < len(results):
                item = results[orig_idx].copy()
                item["original_score"] = item.get("score", 0.0)
                item["cross_encoder_score"] = ce_score
                item["score"] = ce_score  # CrossEncoder 점수로 대체
                output.append(item)

        return output

    def rerank_rag_results(
        self,
        query: str,
        results: list,
        top_k: int = 10,
    ) -> list:
        """RAGResult 객체 리스트를 재순위화.

        Args:
            query: 검색 쿼리
            results: List[RAGResult]
            top_k: 반환할 결과 수

        Returns:
            재순위화된 RAGResult 리스트
        """
        if not results:
            return results

        documents = [r.text for r in results]
        reranked = self.rerank(query, documents, top_k=top_k)

        output = []
        for i, (orig_idx, ce_score) in enumerate(reranked):
            if orig_idx < len(results):
                result = results[orig_idx]
                # RAGResult는 dataclass이므로 직접 수정
                result.score = ce_score
                result.rank = i + 1
                output.append(result)

        return output

    def get_info(self) -> Dict:
        """모델 정보."""
        return {
            "model_key": self._model_key,
            "model_name": self._config["name"],
            "max_length": self._config["max_length"],
            "max_candidates": self._max_candidates,
            "available": self.model is not None,
        }


# ─── 싱글톤 ─────────────────────────────────────

_reranker: Optional[CrossEncoderReranker] = None
_reranker_lock = Lock()


def get_reranker(model_key: str = "multilingual") -> CrossEncoderReranker:
    """싱글톤 CrossEncoderReranker 반환."""
    global _reranker
    if _reranker is None:
        with _reranker_lock:
            if _reranker is None:
                _reranker = CrossEncoderReranker(model_key=model_key)
    return _reranker
