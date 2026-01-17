# backend_ai/app/tarot/utils.py
"""
Tarot Utility Classes
=====================
Utility classes for tarot embeddings and search
"""

import torch
import logging
from typing import Dict, Any, Optional
from collections import OrderedDict
from dataclasses import dataclass

logger = logging.getLogger(__name__)


# =============================================================================
# 메트릭 추적 클래스
# =============================================================================
@dataclass
class SearchMetrics:
    """검색 성능 메트릭"""
    total_searches: int = 0
    total_batch_searches: int = 0
    total_hybrid_searches: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    fallback_searches: int = 0
    total_latency_ms: float = 0.0
    min_latency_ms: float = float('inf')
    max_latency_ms: float = 0.0
    errors: int = 0

    @property
    def avg_latency_ms(self) -> float:
        total = self.total_searches + self.total_batch_searches + self.total_hybrid_searches
        return self.total_latency_ms / total if total > 0 else 0.0

    @property
    def cache_hit_rate(self) -> float:
        total = self.cache_hits + self.cache_misses
        return self.cache_hits / total if total > 0 else 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            'total_searches': self.total_searches,
            'total_batch_searches': self.total_batch_searches,
            'total_hybrid_searches': self.total_hybrid_searches,
            'cache_hits': self.cache_hits,
            'cache_misses': self.cache_misses,
            'cache_hit_rate': round(self.cache_hit_rate, 4),
            'fallback_searches': self.fallback_searches,
            'avg_latency_ms': round(self.avg_latency_ms, 2),
            'min_latency_ms': round(self.min_latency_ms, 2) if self.min_latency_ms != float('inf') else 0,
            'max_latency_ms': round(self.max_latency_ms, 2),
            'errors': self.errors,
        }

    def reset(self):
        self.total_searches = 0
        self.total_batch_searches = 0
        self.total_hybrid_searches = 0
        self.cache_hits = 0
        self.cache_misses = 0
        self.fallback_searches = 0
        self.total_latency_ms = 0.0
        self.min_latency_ms = float('inf')
        self.max_latency_ms = 0.0
        self.errors = 0


def detect_best_device() -> str:
    """사용 가능한 최적의 디바이스 자동 감지"""
    # CUDA (NVIDIA GPU)
    if torch.cuda.is_available():
        return "cuda"

    # MPS (Apple Silicon)
    if hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
        return "mps"

    # CPU fallback
    return "cpu"


class LRUCache:
    """간단한 LRU 캐시 구현 (쿼리 결과 캐싱용)"""

    def __init__(self, maxsize: int = 128):
        self.cache = OrderedDict()
        self.maxsize = maxsize

    def get(self, key: str) -> Optional[Any]:
        if key in self.cache:
            self.cache.move_to_end(key)
            return self.cache[key]
        return None

    def set(self, key: str, value: Any):
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.maxsize:
            self.cache.popitem(last=False)

    def clear(self):
        self.cache.clear()

    def __len__(self):
        return len(self.cache)


# 모델 설정 (정확도 순)
MODEL_OPTIONS = {
    'high': 'sentence-transformers/paraphrase-multilingual-mpnet-base-v2',  # 더 정확, 느림
    'medium': 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',  # 균형
    'fast': 'sentence-transformers/all-MiniLM-L6-v2',  # 빠름, 영어 위주
}
DEFAULT_MODEL = 'high'  # 기본값: 가장 정확한 모델
