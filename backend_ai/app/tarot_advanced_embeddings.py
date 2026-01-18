# backend_ai/app/tarot_advanced_embeddings.py
"""
Tarot Advanced Rules Embedding System
=====================================
18개 고급 규칙 JSON 파일의 임베딩을 생성하고 시맨틱 검색을 지원합니다.

카테고리:
- combinations: 카드 조합 의미
- timing: 타이밍/시기 예측
- court_profiles: 궁정 카드 성격
- elements: 원소 상호작용
- narrative: 스토리텔링 템플릿
- numerology: 수비학
- colors: 색상 상징
- meditation: 명상/확언
- lucky: 행운 아이템
- followup: 후속 질문
- reversed: 역방향 해석
- chakra: 차크라 연결
- astrology: 점성술 대응
- yesno: 예/아니오 로직
- soulmate: 소울메이트 지표
- shadow: 그림자 작업
- moon: 달의 위상
- animals: 영적 동물

개선사항 (v2.0):
- 모델 업그레이드: mpnet-base-v2 (더 정확한 다국어 임베딩)
- 캐시 무효화: 파일 해시 기반 자동 재생성
- 에러 핸들링: fallback 모델 및 graceful degradation

개선사항 (v2.1):
- 배치 검색: 여러 쿼리 동시 처리
- 쿼리 캐싱: LRU 캐시로 반복 검색 최적화
- 메모리 최적화: float16 옵션
- 하이브리드 검색: 시맨틱 + 키워드 결합
- Warm-up: 서버 시작 시 모델 프리로딩
- 로깅 레벨: verbose 모드 지원

개선사항 (v3.0 - Enterprise):
- GPU 자동감지: CUDA/MPS 가용 시 자동 사용
- 메트릭 추적: 검색 지연시간, 캐시 히트율
- Export/Import: 임베딩 파일 내보내기/가져오기
- Thread Safety: 동시 접근 락 처리
- 벤치마크: 성능 테스트 유틸리티
"""

import os
import json
import hashlib
import time
import logging
import threading
import torch
from typing import List, Dict, Optional, Tuple, Any, Union, Callable
from functools import lru_cache
from collections import OrderedDict
from dataclasses import dataclass, field
from contextlib import contextmanager

# 로깅 설정
logger = logging.getLogger(__name__)


# Import utilities from tarot package
try:
    from backend_ai.app.tarot import (
        SearchMetrics,
        LRUCache,
        detect_best_device,
        MODEL_OPTIONS,
        DEFAULT_MODEL,
    )
    from backend_ai.app.tarot_extractors import FILE_HANDLERS
except ImportError:
    from app.tarot import (
        SearchMetrics,
        LRUCache,
        detect_best_device,
        MODEL_OPTIONS,
        DEFAULT_MODEL,
    )
    from app.tarot_extractors import FILE_HANDLERS

try:
    from sentence_transformers import SentenceTransformer, util
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    print("[TarotAdvancedEmbeddings] sentence-transformers not installed. Semantic search disabled.")


class TarotAdvancedEmbeddings:
    """고급 타로 규칙의 임베딩 및 시맨틱 검색 (v3.0 - Enterprise)"""

    def __init__(
        self,
        rules_dir: str = None,
        model_quality: str = DEFAULT_MODEL,
        device: str = 'auto',
        use_float16: bool = False,
        cache_queries: bool = True,
        query_cache_size: int = 128,
        verbose: bool = True
    ):
        """
        Initialize TarotAdvancedEmbeddings.

        Args:
            rules_dir: Path to advanced rules directory
            model_quality: 'high', 'medium', or 'fast' (default: 'high')
            device: Device for inference - 'auto', 'cuda', 'mps', or 'cpu' (default: 'auto')
            use_float16: Use float16 for embeddings to save memory (default: False)
            cache_queries: Enable query result caching (default: True)
            query_cache_size: Max cached queries (default: 128)
            verbose: Print status messages (default: True)
        """
        if rules_dir is None:
            base_dir = os.path.dirname(os.path.dirname(__file__))
            rules_dir = os.path.join(base_dir, "data", "graph", "rules", "tarot", "advanced")

        self.rules_dir = rules_dir
        self.embed_cache_path = os.path.join(rules_dir, "advanced_embeds.pt")
        self.model_quality = model_quality
        self.model_name = MODEL_OPTIONS.get(model_quality, MODEL_OPTIONS['high'])
        self.use_float16 = use_float16
        self.verbose = verbose

        # Device selection (GPU auto-detection)
        if device == 'auto':
            self.device = detect_best_device()
        else:
            self.device = device
        self._log(f"Using device: {self.device}")

        # Data storage
        self.entries = []  # [{category, subcategory, text, data, ...}]
        self.embeddings = None
        self._data_hash = None  # 캐시 무효화용 해시

        # Query result cache
        self._query_cache = LRUCache(maxsize=query_cache_size) if cache_queries else None

        # Lazy model
        self._model = None
        self._model_load_failed = False
        self._is_warmed_up = False

        # Thread safety (v3.0)
        self._lock = threading.RLock()

        # Metrics tracking (v3.0)
        self._metrics = SearchMetrics()

        # Load and embed
        self._load_all_rules()
        self._prepare_embeddings()

    def _log(self, message: str, level: str = 'info'):
        """조건부 로깅"""
        if self.verbose:
            prefix = "[TarotAdvancedEmbeddings]"
            if level == 'error':
                logger.error(f"{prefix} {message}")
                print(f"{prefix} ERROR: {message}")
            elif level == 'warning':
                logger.warning(f"{prefix} {message}")
                print(f"{prefix} WARNING: {message}")
            else:
                logger.info(f"{prefix} {message}")
                print(f"{prefix} {message}")

    @property
    def model(self):
        """Lazy load SentenceTransformer model - uses shared model from model_manager"""
        if self._model is None and not self._model_load_failed:
            if not SENTENCE_TRANSFORMERS_AVAILABLE:
                self._model_load_failed = True
                return None

            # OPTIMIZATION: Use shared model from model_manager to save memory (~400MB)
            try:
                from backend_ai.app.rag.model_manager import get_shared_model
                self._model = get_shared_model()
                if self._model is not None:
                    self._log(f"Using shared model from model_manager (memory optimized)")
                    return self._model
                else:
                    self._log("Shared model not available, falling back to local load", level='warning')
            except ImportError as e:
                self._log(f"model_manager not available: {e}, using local model", level='warning')

            # Fallback: Load model locally (only if shared model fails)
            os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"

            # 모델 로딩 시도 (fallback 포함)
            models_to_try = [
                self.model_name,
                MODEL_OPTIONS['medium'],
                MODEL_OPTIONS['fast']
            ]
            # 중복 제거
            models_to_try = list(dict.fromkeys(models_to_try))

            for model_name in models_to_try:
                try:
                    self._log(f"Loading model locally: {model_name} on {self.device}...")
                    self._model = SentenceTransformer(model_name, device=self.device)
                    self.model_name = model_name
                    self._log(f"Model loaded successfully: {model_name} (device: {self.device})")
                    break
                except Exception as e:
                    self._log(f"Failed to load {model_name}: {e}", level='warning')
                    # GPU 실패 시 CPU로 fallback
                    if self.device != 'cpu':
                        try:
                            self._log(f"Retrying {model_name} on CPU...")
                            self._model = SentenceTransformer(model_name, device='cpu')
                            self.device = 'cpu'
                            self.model_name = model_name
                            self._log(f"Model loaded on CPU fallback: {model_name}")
                            break
                        except Exception as e2:
                            self._log(f"CPU fallback also failed: {e2}", level='warning')
                    continue

            if self._model is None:
                self._log("All model loading attempts failed", level='error')
                self._model_load_failed = True

        return self._model

    def _calculate_data_hash(self) -> str:
        """파일 수정 시간 기반 해시 계산 (캐시 무효화용)"""
        hash_data = []

        if not os.path.exists(self.rules_dir):
            return ""

        try:
            for filename in sorted(os.listdir(self.rules_dir)):
                if filename.endswith('.json'):
                    filepath = os.path.join(self.rules_dir, filename)
                    mtime = os.path.getmtime(filepath)
                    size = os.path.getsize(filepath)
                    hash_data.append(f"{filename}:{mtime}:{size}")

            hash_str = "|".join(hash_data)
            return hashlib.md5(hash_str.encode()).hexdigest()[:16]
        except Exception as e:
            print(f"[TarotAdvancedEmbeddings] Hash calculation error: {e}")
            return str(time.time())  # fallback: 현재 시간

    def clear_cache(self) -> bool:
        """캐시 파일 삭제 및 임베딩 재생성"""
        try:
            if os.path.exists(self.embed_cache_path):
                os.remove(self.embed_cache_path)
                print("[TarotAdvancedEmbeddings] Cache cleared")

            self.embeddings = None
            self._prepare_embeddings()
            return True
        except Exception as e:
            print(f"[TarotAdvancedEmbeddings] Failed to clear cache: {e}")
            return False

    def is_cache_valid(self) -> bool:
        """캐시 유효성 검사"""
        if not os.path.exists(self.embed_cache_path):
            return False

        try:
            cache = torch.load(self.embed_cache_path, map_location='cpu', weights_only=True)
            cached_hash = cache.get('data_hash', '')
            current_hash = self._calculate_data_hash()

            return cached_hash == current_hash and cache.get('model_name') == self.model_name
        except Exception:
            return False

    def _load_all_rules(self):
        """Load all advanced rule JSON files and extract searchable entries"""
        if not os.path.exists(self.rules_dir):
            print(f"[TarotAdvancedEmbeddings] Rules directory not found: {self.rules_dir}")
            return

        # Use extractors from tarot_extractors module
        for filename, handler in FILE_HANDLERS.items():
            path = os.path.join(self.rules_dir, filename)
            if os.path.exists(path):
                try:
                    with open(path, encoding='utf-8') as f:
                        data = json.load(f)
                        handler(self.entries, data, filename)
                        print(f"[TarotAdvancedEmbeddings] Extracted from {filename}")
                except Exception as e:
                    print(f"[TarotAdvancedEmbeddings] Failed to load {filename}: {e}")

        print(f"[TarotAdvancedEmbeddings] Total entries: {len(self.entries)}")

    def _prepare_embeddings(self):
        """Generate or load embeddings with cache invalidation"""
        if not self.entries:
            self._log("No entries to embed", level='warning')
            return

        # 현재 데이터 해시 계산
        self._data_hash = self._calculate_data_hash()

        # Check cache with hash validation
        if os.path.exists(self.embed_cache_path):
            try:
                cache = torch.load(self.embed_cache_path, map_location='cpu', weights_only=True)

                # 캐시 유효성 검사: entry count + data hash + model name
                cache_valid = (
                    cache.get('entry_count') == len(self.entries) and
                    cache.get('data_hash') == self._data_hash and
                    cache.get('model_name') == self.model_name
                )

                if cache_valid:
                    self.embeddings = cache['embeddings']
                    # float16 변환 (옵션)
                    if self.use_float16 and self.embeddings.dtype != torch.float16:
                        self.embeddings = self.embeddings.half()
                        self._log("Converted embeddings to float16 for memory optimization")
                    self._log(f"Loaded cached embeddings ({len(self.entries)} entries, hash={self._data_hash[:8]})")
                    return
                else:
                    reason = []
                    if cache.get('entry_count') != len(self.entries):
                        reason.append(f"entry count mismatch ({cache.get('entry_count')} != {len(self.entries)})")
                    if cache.get('data_hash') != self._data_hash:
                        reason.append("data files changed")
                    if cache.get('model_name') != self.model_name:
                        reason.append(f"model changed ({cache.get('model_name')} -> {self.model_name})")
                    self._log(f"Cache invalidated: {', '.join(reason)}")

            except Exception as e:
                self._log(f"Cache load failed: {e}", level='warning')

        # Check if model is available
        if self.model is None:
            self._log("Model not available, skipping embedding generation", level='warning')
            return

        # Generate new embeddings with retry
        max_retries = 2
        for attempt in range(max_retries):
            try:
                self._log(f"Generating embeddings for {len(self.entries)} entries (model: {self.model_name})...")
                texts = [e['text'] for e in self.entries]
                self.embeddings = self.model.encode(
                    texts,
                    convert_to_tensor=True,
                    normalize_embeddings=True,
                    show_progress_bar=len(texts) > 100 and self.verbose,
                    batch_size=32
                )

                # float16 변환 (옵션)
                if self.use_float16:
                    self.embeddings = self.embeddings.half()
                    self._log("Using float16 embeddings for memory optimization")

                self._log(f"Generated {self.embeddings.shape[0]} embeddings (dtype: {self.embeddings.dtype})")
                break
            except Exception as e:
                self._log(f"Embedding generation attempt {attempt + 1} failed: {e}", level='error')
                if attempt == max_retries - 1:
                    self._log("All embedding attempts failed", level='error')
                    return

        # Save cache with metadata
        try:
            # 캐시는 항상 float32로 저장 (호환성)
            embeddings_to_save = self.embeddings.float() if self.use_float16 else self.embeddings
            torch.save({
                'entry_count': len(self.entries),
                'embeddings': embeddings_to_save,
                'data_hash': self._data_hash,
                'model_name': self.model_name,
                'created_at': time.time()
            }, self.embed_cache_path)
            self._log(f"Saved embeddings to cache (hash={self._data_hash[:8]})")
        except Exception as e:
            self._log(f"Failed to save cache: {e}", level='error')

    def warm_up(self) -> bool:
        """
        모델 프리로딩 (서버 시작 시 호출)

        Returns:
            True if warm-up successful
        """
        if self._is_warmed_up:
            return True

        try:
            # 모델 로딩 강제 실행
            if self.model is None:
                return False

            # 더미 쿼리로 모델 워밍업
            _ = self.model.encode("warm up query", convert_to_tensor=True)
            self._is_warmed_up = True
            self._log("Model warmed up successfully")
            return True
        except Exception as e:
            self._log(f"Warm-up failed: {e}", level='error')
            return False

    def search(
        self,
        query: str,
        top_k: int = 5,
        category: str = None,
        threshold: float = 0.1,
        use_cache: bool = True
    ) -> List[Dict]:
        """
        Search for relevant entries by semantic similarity

        Args:
            query: Search query
            top_k: Number of results to return
            category: Optional filter by category
            threshold: Minimum similarity score (default: 0.1)
            use_cache: Use query cache (default: True)

        Returns:
            List of matching entries with scores
        """
        start_time = time.time()

        # 쿼리 캐시 확인
        cache_key = f"{query}|{top_k}|{category}|{threshold}"
        if use_cache and self._query_cache:
            cached = self._query_cache.get(cache_key)
            if cached is not None:
                self._metrics.cache_hits += 1
                return cached
            self._metrics.cache_misses += 1

        # Graceful degradation: 모델/임베딩 없으면 키워드 검색으로 fallback
        if self.embeddings is None or len(self.entries) == 0:
            self._metrics.fallback_searches += 1
            return self._fallback_keyword_search(query, top_k, category)

        if self.model is None:
            self._metrics.fallback_searches += 1
            return self._fallback_keyword_search(query, top_k, category)

        try:
            # Thread-safe search with lock
            with self._lock:
                # Encode query
                query_embed = self.model.encode(query, convert_to_tensor=True, normalize_embeddings=True)

                # Calculate similarities
                scores = util.cos_sim(query_embed, self.embeddings)[0]

                # Filter by category if specified
                if category:
                    mask = torch.tensor([
                        1.0 if e['category'] == category else 0.0
                        for e in self.entries
                    ], device=scores.device)
                    scores = scores * mask

                # Get top results
                top_results = torch.topk(scores, min(top_k * 2, len(self.entries)))

                results = []
                for score, idx in zip(top_results.values.tolist(), top_results.indices.tolist()):
                    if score > threshold:
                        entry = self.entries[idx].copy()
                        entry['score'] = round(score, 4)
                        results.append(entry)
                        if len(results) >= top_k:
                            break

            # 캐시에 저장
            if use_cache and self._query_cache:
                self._query_cache.set(cache_key, results)

            # 메트릭 업데이트
            latency_ms = (time.time() - start_time) * 1000
            self._metrics.total_searches += 1
            self._metrics.total_latency_ms += latency_ms
            self._metrics.min_latency_ms = min(self._metrics.min_latency_ms, latency_ms)
            self._metrics.max_latency_ms = max(self._metrics.max_latency_ms, latency_ms)

            return results

        except Exception as e:
            self._log(f"Search error: {e}", level='error')
            self._metrics.errors += 1
            self._metrics.fallback_searches += 1
            return self._fallback_keyword_search(query, top_k, category)

    def search_batch(
        self,
        queries: List[str],
        top_k: int = 5,
        category: str = None,
        threshold: float = 0.1
    ) -> List[List[Dict]]:
        """
        배치 검색: 여러 쿼리를 한 번에 처리 (효율적)

        Args:
            queries: List of search queries
            top_k: Number of results per query
            category: Optional filter by category
            threshold: Minimum similarity score

        Returns:
            List of results for each query
        """
        if not queries:
            return []

        start_time = time.time()

        if self.embeddings is None or self.model is None:
            self._metrics.fallback_searches += len(queries)
            return [self._fallback_keyword_search(q, top_k, category) for q in queries]

        try:
            with self._lock:
                # 모든 쿼리를 한 번에 인코딩
                query_embeds = self.model.encode(
                    queries,
                    convert_to_tensor=True,
                    normalize_embeddings=True,
                    batch_size=min(32, len(queries))
                )

                # 모든 쿼리에 대해 유사도 계산
                all_scores = util.cos_sim(query_embeds, self.embeddings)

                # 카테고리 마스크 (한 번만 생성)
                category_mask = None
                if category:
                    category_mask = torch.tensor([
                        1.0 if e['category'] == category else 0.0
                        for e in self.entries
                    ], device=all_scores.device)

                all_results = []
                for i, scores in enumerate(all_scores):
                    if category_mask is not None:
                        scores = scores * category_mask

                    top_results = torch.topk(scores, min(top_k * 2, len(self.entries)))

                    results = []
                    for score, idx in zip(top_results.values.tolist(), top_results.indices.tolist()):
                        if score > threshold:
                            entry = self.entries[idx].copy()
                            entry['score'] = round(score, 4)
                            results.append(entry)
                            if len(results) >= top_k:
                                break

                    all_results.append(results)

            # 메트릭 업데이트
            latency_ms = (time.time() - start_time) * 1000
            self._metrics.total_batch_searches += 1
            self._metrics.total_latency_ms += latency_ms

            return all_results

        except Exception as e:
            self._log(f"Batch search error: {e}", level='error')
            self._metrics.errors += 1
            self._metrics.fallback_searches += len(queries)
            return [self._fallback_keyword_search(q, top_k, category) for q in queries]

    def search_hybrid(
        self,
        query: str,
        top_k: int = 5,
        category: str = None,
        semantic_weight: float = 0.7,
        keyword_weight: float = 0.3
    ) -> List[Dict]:
        """
        하이브리드 검색: 시맨틱 + 키워드 결합

        Args:
            query: Search query
            top_k: Number of results
            category: Optional filter
            semantic_weight: Weight for semantic search (default: 0.7)
            keyword_weight: Weight for keyword search (default: 0.3)

        Returns:
            Combined and re-ranked results
        """
        start_time = time.time()

        # 시맨틱 검색 (더 많이 가져옴)
        semantic_results = self.search(query, top_k=top_k * 2, category=category, use_cache=False)

        # 키워드 검색
        keyword_results = self._fallback_keyword_search(query, top_k=top_k * 2, category=category)

        # 결과 병합 및 점수 재계산
        merged = {}

        for r in semantic_results:
            key = r['text'][:100]  # 텍스트 일부를 키로 사용
            merged[key] = {
                'entry': r,
                'semantic_score': r.get('score', 0),
                'keyword_score': 0
            }

        for r in keyword_results:
            key = r['text'][:100]
            if key in merged:
                merged[key]['keyword_score'] = r.get('score', 0)
            else:
                merged[key] = {
                    'entry': r,
                    'semantic_score': 0,
                    'keyword_score': r.get('score', 0)
                }

        # 가중 평균 점수 계산
        results = []
        for data in merged.values():
            combined_score = (
                data['semantic_score'] * semantic_weight +
                data['keyword_score'] * keyword_weight
            )
            entry = data['entry'].copy()
            entry['score'] = round(combined_score, 4)
            entry['semantic_score'] = round(data['semantic_score'], 4)
            entry['keyword_score'] = round(data['keyword_score'], 4)
            entry['hybrid'] = True
            results.append(entry)

        # 점수순 정렬
        results.sort(key=lambda x: x['score'], reverse=True)

        # 메트릭 업데이트
        latency_ms = (time.time() - start_time) * 1000
        self._metrics.total_hybrid_searches += 1
        self._metrics.total_latency_ms += latency_ms

        return results[:top_k]

    def _fallback_keyword_search(self, query: str, top_k: int = 5, category: str = None) -> List[Dict]:
        """키워드 기반 fallback 검색 (시맨틱 검색 실패 시)"""
        query_lower = query.lower()
        keywords = query_lower.split()

        results = []
        for entry in self.entries:
            if category and entry['category'] != category:
                continue

            text_lower = entry['text'].lower()
            # 키워드 매칭 점수 계산
            match_count = sum(1 for kw in keywords if kw in text_lower)
            if match_count > 0:
                entry_copy = entry.copy()
                entry_copy['score'] = match_count / len(keywords)  # 0~1 정규화
                entry_copy['fallback'] = True
                results.append(entry_copy)

        # 점수순 정렬
        results.sort(key=lambda x: x['score'], reverse=True)
        return results[:top_k]

    def search_by_card(self, card_name: str, top_k: int = 10) -> List[Dict]:
        """Search for all entries related to a specific card"""
        results = []
        for entry in self.entries:
            text_lower = entry['text'].lower()
            card_lower = card_name.lower()
            if card_lower in text_lower or card_name in entry.get('data', {}).get('cards', []):
                results.append(entry)

        return results[:top_k]

    def get_by_category(self, category: str) -> List[Dict]:
        """Get all entries in a category"""
        return [e for e in self.entries if e['category'] == category]

    def clear_query_cache(self):
        """쿼리 결과 캐시 초기화"""
        if self._query_cache:
            self._query_cache.clear()
            self._log("Query cache cleared")

    def get_query_cache_stats(self) -> Dict[str, Any]:
        """쿼리 캐시 통계"""
        if self._query_cache:
            return {
                'enabled': True,
                'size': len(self._query_cache),
                'max_size': self._query_cache.maxsize
            }
        return {'enabled': False}

    def get_status(self) -> Dict[str, Any]:
        """시스템 상태 정보 반환"""
        status = {
            'version': '3.0',
            'total_entries': len(self.entries),
            'embeddings_loaded': self.embeddings is not None,
            'embeddings_shape': list(self.embeddings.shape) if self.embeddings is not None else None,
            'embeddings_dtype': str(self.embeddings.dtype) if self.embeddings is not None else None,
            'model_name': self.model_name,
            'model_quality': self.model_quality,
            'model_loaded': self._model is not None,
            'model_load_failed': self._model_load_failed,
            'is_warmed_up': self._is_warmed_up,
            'device': self.device,
            'cache_exists': os.path.exists(self.embed_cache_path),
            'cache_valid': self.is_cache_valid(),
            'data_hash': self._data_hash[:8] if self._data_hash else None,
            'categories': list(set(e['category'] for e in self.entries)),
            'use_float16': self.use_float16,
            'query_cache': self.get_query_cache_stats(),
            'metrics': self._metrics.to_dict(),
        }
        return status

    def get_metrics(self) -> Dict[str, Any]:
        """검색 성능 메트릭 반환"""
        return self._metrics.to_dict()

    def reset_metrics(self):
        """메트릭 초기화"""
        self._metrics.reset()
        self._log("Metrics reset")

    def health_check(self) -> Tuple[bool, str]:
        """
        시스템 건강 상태 확인

        Returns:
            (is_healthy, message)
        """
        issues = []

        if len(self.entries) == 0:
            issues.append("No entries loaded")

        if self.embeddings is None:
            issues.append("Embeddings not generated")

        if self._model_load_failed:
            issues.append("Model loading failed")

        if issues:
            return False, f"Unhealthy: {', '.join(issues)}"

        return True, f"Healthy: {len(self.entries)} entries, model={self.model_name}"

    def get_categories_summary(self) -> Dict[str, int]:
        """카테고리별 엔트리 수 반환"""
        summary = {}
        for entry in self.entries:
            cat = entry['category']
            summary[cat] = summary.get(cat, 0) + 1
        return dict(sorted(summary.items()))

    # =========================================================================
    # Export / Import (v3.0)
    # =========================================================================
    def export_embeddings(self, filepath: str) -> bool:
        """
        임베딩과 엔트리를 파일로 내보내기

        Args:
            filepath: 내보낼 파일 경로 (.pt 또는 .pth)

        Returns:
            성공 여부
        """
        try:
            if self.embeddings is None:
                self._log("No embeddings to export", level='error')
                return False

            export_data = {
                'version': '3.0',
                'entries': self.entries,
                'embeddings': self.embeddings.cpu().float(),  # CPU + float32로 저장
                'model_name': self.model_name,
                'data_hash': self._data_hash,
                'categories_summary': self.get_categories_summary(),
                'exported_at': time.time()
            }

            torch.save(export_data, filepath)
            self._log(f"Exported {len(self.entries)} entries to {filepath}")
            return True

        except Exception as e:
            self._log(f"Export failed: {e}", level='error')
            return False

    def import_embeddings(self, filepath: str, validate: bool = True) -> bool:
        """
        내보낸 임베딩 파일 가져오기

        Args:
            filepath: 가져올 파일 경로
            validate: 모델 이름 검증 여부

        Returns:
            성공 여부
        """
        try:
            if not os.path.exists(filepath):
                self._log(f"Import file not found: {filepath}", level='error')
                return False

            import_data = torch.load(filepath, map_location='cpu', weights_only=False)

            # 버전 확인
            version = import_data.get('version', 'unknown')
            self._log(f"Importing embeddings (version: {version})")

            # 모델 검증 (선택적)
            if validate and import_data.get('model_name') != self.model_name:
                self._log(
                    f"Model mismatch: imported={import_data.get('model_name')}, current={self.model_name}",
                    level='warning'
                )

            # 데이터 로드
            self.entries = import_data['entries']
            self.embeddings = import_data['embeddings']
            self._data_hash = import_data.get('data_hash', '')

            # float16 옵션 적용
            if self.use_float16:
                self.embeddings = self.embeddings.half()

            # 디바이스 이동
            if self.device != 'cpu' and self.embeddings is not None:
                try:
                    self.embeddings = self.embeddings.to(self.device)
                except Exception:
                    pass  # GPU 이동 실패 시 CPU 유지

            self._log(f"Imported {len(self.entries)} entries from {filepath}")
            return True

        except Exception as e:
            self._log(f"Import failed: {e}", level='error')
            return False

    # =========================================================================
    # Benchmark (v3.0)
    # =========================================================================
    def benchmark(
        self,
        queries: List[str] = None,
        iterations: int = 10,
        include_batch: bool = True,
        include_hybrid: bool = True
    ) -> Dict[str, Any]:
        """
        성능 벤치마크 실행

        Args:
            queries: 테스트 쿼리 리스트 (없으면 기본 쿼리 사용)
            iterations: 반복 횟수
            include_batch: 배치 검색 포함
            include_hybrid: 하이브리드 검색 포함

        Returns:
            벤치마크 결과
        """
        if queries is None:
            queries = [
                "연애 운세 타이밍",
                "소울메이트 인연",
                "재물 금전 운",
                "직장 커리어",
                "건강 에너지",
            ]

        results = {
            'device': self.device,
            'model': self.model_name,
            'total_entries': len(self.entries),
            'iterations': iterations,
            'queries_count': len(queries),
            'benchmarks': {}
        }

        # 1. 단일 검색 벤치마크
        single_times = []
        for _ in range(iterations):
            for q in queries:
                start = time.time()
                _ = self.search(q, use_cache=False)
                single_times.append((time.time() - start) * 1000)

        results['benchmarks']['single_search'] = {
            'avg_ms': round(sum(single_times) / len(single_times), 2),
            'min_ms': round(min(single_times), 2),
            'max_ms': round(max(single_times), 2),
            'total_queries': len(single_times)
        }

        # 2. 배치 검색 벤치마크
        if include_batch:
            batch_times = []
            for _ in range(iterations):
                start = time.time()
                _ = self.search_batch(queries)
                batch_times.append((time.time() - start) * 1000)

            results['benchmarks']['batch_search'] = {
                'avg_ms': round(sum(batch_times) / len(batch_times), 2),
                'min_ms': round(min(batch_times), 2),
                'max_ms': round(max(batch_times), 2),
                'queries_per_batch': len(queries)
            }

        # 3. 하이브리드 검색 벤치마크
        if include_hybrid:
            hybrid_times = []
            for _ in range(iterations):
                for q in queries:
                    start = time.time()
                    _ = self.search_hybrid(q)
                    hybrid_times.append((time.time() - start) * 1000)

            results['benchmarks']['hybrid_search'] = {
                'avg_ms': round(sum(hybrid_times) / len(hybrid_times), 2),
                'min_ms': round(min(hybrid_times), 2),
                'max_ms': round(max(hybrid_times), 2),
                'total_queries': len(hybrid_times)
            }

        # 4. 처리량 계산 (queries per second)
        total_time_s = sum(single_times) / 1000
        results['throughput'] = {
            'single_qps': round(len(single_times) / total_time_s, 1),
        }

        if include_batch and batch_times:
            batch_time_s = sum(batch_times) / 1000
            total_batch_queries = len(queries) * iterations
            results['throughput']['batch_qps'] = round(total_batch_queries / batch_time_s, 1)

        self._log(f"Benchmark complete: avg={results['benchmarks']['single_search']['avg_ms']:.1f}ms")
        return results


# Singleton instance
_tarot_advanced_embeddings = None


def get_tarot_advanced_embeddings() -> TarotAdvancedEmbeddings:
    """Get or create singleton instance"""
    global _tarot_advanced_embeddings
    if _tarot_advanced_embeddings is None:
        _tarot_advanced_embeddings = TarotAdvancedEmbeddings()
    return _tarot_advanced_embeddings


# ===============================================================
# TEST (v3.0)
# ===============================================================
if __name__ == "__main__":
    import sys
    if sys.platform == 'win32':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')

    print("=" * 70)
    print("[TAROT ADVANCED EMBEDDINGS TEST - v3.0 Enterprise]")
    print("=" * 70)

    embedder = get_tarot_advanced_embeddings()

    # System Status
    print("\n[System Status]")
    status = embedder.get_status()
    print(f"  Version: {status['version']}")
    print(f"  Device: {status['device']}")
    print(f"  Model: {status['model_name']}")
    print(f"  Entries: {status['total_entries']}")
    print(f"  Embeddings: {status['embeddings_shape']}")

    # Health Check
    print("\n[Health Check]")
    healthy, msg = embedder.health_check()
    print(f"  {msg}")

    # Test search
    print("\n[Search: 연애 타이밍]")
    results = embedder.search("연애 언제 시작될까 타이밍", top_k=5)
    for r in results:
        print(f"  [{r['category']}] {r['text'][:60]}... (score: {r['score']:.3f})")

    print("\n[Search: 소울메이트]")
    results = embedder.search("소울메이트 트윈플레임 인연", top_k=5)
    for r in results:
        print(f"  [{r['category']}] {r['text'][:60]}... (score: {r['score']:.3f})")

    # Batch search test
    print("\n[Batch Search Test]")
    batch_queries = ["연애 운세", "재물 운", "건강 조언"]
    batch_results = embedder.search_batch(batch_queries, top_k=2)
    for i, (q, res) in enumerate(zip(batch_queries, batch_results)):
        print(f"  Query: {q}")
        for r in res:
            print(f"    -> {r['text'][:50]}... ({r['score']:.3f})")

    # Hybrid search test
    print("\n[Hybrid Search Test]")
    hybrid_results = embedder.search_hybrid("차크라 에너지 치유", top_k=3)
    for r in hybrid_results:
        print(f"  [{r['category']}] {r['text'][:50]}...")
        print(f"    semantic: {r.get('semantic_score', 0):.3f}, keyword: {r.get('keyword_score', 0):.3f}")

    # Metrics
    print("\n[Search Metrics]")
    metrics = embedder.get_metrics()
    print(f"  Total searches: {metrics['total_searches']}")
    print(f"  Batch searches: {metrics['total_batch_searches']}")
    print(f"  Hybrid searches: {metrics['total_hybrid_searches']}")
    print(f"  Cache hit rate: {metrics['cache_hit_rate']:.2%}")
    print(f"  Avg latency: {metrics['avg_latency_ms']:.2f}ms")

    # Category stats
    print("\n[Category Summary]")
    for cat, count in embedder.get_categories_summary().items():
        print(f"  {cat}: {count} entries")

    # Quick benchmark (small scale)
    print("\n[Quick Benchmark]")
    bench = embedder.benchmark(iterations=3, include_hybrid=False)
    print(f"  Single search avg: {bench['benchmarks']['single_search']['avg_ms']:.1f}ms")
    print(f"  Batch search avg: {bench['benchmarks']['batch_search']['avg_ms']:.1f}ms")
    print(f"  Throughput: {bench['throughput']['single_qps']:.0f} queries/sec")

    print("\n" + "=" * 70)
    print(f"[COMPLETE: {len(embedder.entries)} entries on {status['device']}]")
    print("=" * 70)
