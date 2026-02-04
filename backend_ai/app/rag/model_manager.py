# app/rag/model_manager.py
"""
임베딩 모델 관리자 (Phase 6 업그레이드)
=========================================
다중 임베딩 모델 지원 + 자동 prefix 적용.

RAG_EMBEDDING_MODEL 환경변수로 모델 선택:
- "minilm"   : paraphrase-multilingual-MiniLM-L12-v2 (384D, 기본)
- "e5-large" : intfloat/multilingual-e5-large (1024D, 추천)
- "bge-m3"   : BAAI/bge-m3 (1024D, 한국어 우수)

RAG_DEVICE 환경변수로 디바이스 선택:
- "auto" (기본): CUDA 가능하면 GPU, 아니면 CPU
- "cpu"  : 강제 CPU
- "cuda" : 강제 GPU

하위 호환성:
- get_shared_model() : 기존 인터페이스 유지
- is_model_available() : 기존 인터페이스 유지
- get_model_info() : 기존 인터페이스 유지
"""

import os
import logging
from typing import Optional, List
from threading import Lock

logger = logging.getLogger(__name__)


# ─── 모델 설정 ─────────────────────────────────

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
        "query_prefix": "query: ",
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

    E5 모델: query/passage prefix 자동 추가
    BGE/MiniLM: prefix 없음
    """

    def __init__(self, model_key: str = None):
        self._model_key = model_key or _MODEL_KEY
        self._model = None
        self._config = EMBEDDING_MODELS.get(
            self._model_key, EMBEDDING_MODELS["minilm"]
        )

    @property
    def model(self):
        """SentenceTransformer 모델 (lazy loading)."""
        if self._model is None:
            self._model = self._load_model()
        return self._model

    @property
    def model_key(self) -> str:
        """현재 사용 중인 모델 키."""
        return self._model_key

    @property
    def dimension(self) -> int:
        """임베딩 차원 수."""
        return self._config["dim"]

    @property
    def config(self) -> dict:
        """현재 모델 설정."""
        return self._config.copy()

    def _load_model(self):
        """모델 로드 (디바이스 자동 감지)."""
        model_name = self._config["name"]

        device = _DEVICE
        if device == "auto":
            try:
                import torch
                device = "cuda" if torch.cuda.is_available() else "cpu"
            except ImportError:
                device = "cpu"

        logger.info(
            "[ModelManager] 임베딩 모델 로드: %s (device=%s)", model_name, device
        )

        try:
            from sentence_transformers import SentenceTransformer
            model = SentenceTransformer(model_name, device=device)

            if device == "cuda":
                try:
                    import torch
                    model = model.half()
                except Exception:
                    pass

            return model

        except ImportError:
            logger.warning("[ModelManager] sentence_transformers not installed")
            return None
        except Exception as e:
            logger.error("[ModelManager] 모델 로드 실패: %s", e)
            return None

    def encode_query(self, text: str, **kwargs):
        """쿼리 임베딩 (모델별 prefix 자동 적용).

        E5 모델: "query: " prefix 추가
        BGE/MiniLM: prefix 없음
        """
        if self.model is None:
            return None

        prefix = self._config.get("query_prefix", "")
        return self.model.encode(
            prefix + text,
            convert_to_tensor=True,
            normalize_embeddings=True,
            **kwargs,
        )

    def encode_passage(self, text: str, **kwargs):
        """패시지/문서 임베딩."""
        if self.model is None:
            return None

        prefix = self._config.get("passage_prefix", "")
        return self.model.encode(
            prefix + text,
            convert_to_tensor=True,
            normalize_embeddings=True,
            **kwargs,
        )

    def encode_batch(
        self,
        texts: List[str],
        batch_size: int = 64,
        is_query: bool = False,
        **kwargs,
    ):
        """배치 임베딩."""
        if self.model is None:
            return None

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
        """모델 정보 반환."""
        info = {
            "model_key": self._model_key,
            "model_name": self._config["name"],
            "dimension": self._config["dim"],
            "description": self._config["description"],
            "has_query_prefix": "query_prefix" in self._config,
            "device": _DEVICE,
            "available": self.model is not None,
        }

        if self._model is not None:
            try:
                info["max_seq_length"] = getattr(
                    self._model, "max_seq_length", None
                )
                info["embedding_dimension"] = (
                    self._model.get_sentence_embedding_dimension()
                )
            except Exception:
                pass

        return info


# ─── 싱글톤 ─────────────────────────────────────

_manager: Optional[EmbeddingModelManager] = None
_manager_lock = Lock()


def get_embedding_manager(
    model_key: str = None,
) -> EmbeddingModelManager:
    """싱글톤 EmbeddingModelManager 반환.

    Args:
        model_key: 모델 키 (None이면 환경변수 또는 기본값 "minilm")
    """
    global _manager
    if _manager is None or (model_key and model_key != _manager._model_key):
        with _manager_lock:
            if _manager is None or (model_key and model_key != _manager._model_key):
                _manager = EmbeddingModelManager(model_key)
    return _manager


# ─── 하위 호환성 인터페이스 ─────────────────────

def get_shared_model():
    """하위 호환성: 기존 get_shared_model() 인터페이스 유지.

    Returns:
        SentenceTransformer model or None
    """
    return get_embedding_manager().model


def is_model_available() -> bool:
    """Check if embedding model is available."""
    return get_embedding_manager().model is not None


def get_model_info() -> dict:
    """Get information about the loaded model."""
    return get_embedding_manager().get_info()
