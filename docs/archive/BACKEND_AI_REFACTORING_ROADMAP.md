# Backend_AI 리팩토링 로드맵

## 📊 현재 상태 요약

### Critical Issues
- **app.py**: 367KB, 8,342줄, 177개 함수, 32개 라우트 (거대한 God Object)
- **compatibility_logic.py**: 258KB, 6,168줄
- **10+ 중복 RAG 시스템**: 공통 인터페이스 없음
- **15+ lazy loading 패턴 중복**: 메모리 최적화를 위해 반복적으로 구현됨
- **불완전한 모듈화**: routers/ 폴더 있지만 app.py에 32개 라우트 여전히 존재
- **서비스 레이어 부재**: 비즈니스 로직이 HTTP 핸들러와 혼재

### 코드베이스 구조
```
backend_ai/app/ (현재)
├── app.py (8,342줄) ⚠️ CRITICAL
├── routers/ (12 files, 5,149줄) ✅ 부분적 진행
├── RAG engines (10+ files) ⚠️ 중복/분산
├── Business logic (13 files) ⚠️ 거대 파일들
├── Infrastructure (10 files) ✅ 적절
└── Parsers (2 files) ✅ 적절
```

---

## 🎯 리팩토링 목표

### Phase 1: 긴급 (1-2주)
**목표**: app.py 분해, 즉시 유지보수 가능하게 만들기

### Phase 2: 핵심 (2-3주)
**목표**: 서비스 레이어 구축, RAG 시스템 통합

### Phase 3: 최적화 (2주)
**목표**: 도메인 기반 재구성, 공통 유틸리티 통합

### Phase 4: 안정화 (1주)
**목표**: 테스트, 문서화, CI/CD 통합

---

## 📅 Phase 1: 긴급 - app.py 분해 (1-2주)

### Priority 1.1: 남은 라우트 추출 (3일)

#### 작업 내용
app.py의 32개 라우트를 도메인별 router로 이동

**새로 생성할 routers:**
```
backend_ai/app/routers/
├── __init__.py (업데이트)
├── core_routes.py (NEW) - /, /capabilities, /health, /metrics
├── chart_routes.py (NEW) - /calc_saju, /calc_astro, /charts/*
├── cache_routes.py (NEW) - /cache/*, /performance/*
├── search_routes.py (NEW) - /api/search/domain, /api/search/hybrid
├── stream_routes.py (NEW) - /ask, /ask-stream (메인 fortune telling)
└── destiny_story_routes.py (NEW) - /api/destiny-story/*
```

**기존 routers 업데이트:**
- `dream_routes.py` - app.py의 dream 관련 라우트 통합
- `counseling_routes.py` - counselor 라우트 통합
- `tarot_routes.py` - app.py의 tarot 관련 라우트 통합

**체크리스트:**
- [ ] core_routes.py 생성 (health check, capabilities)
- [ ] chart_routes.py 생성 (Saju/Astro 계산)
- [ ] cache_routes.py 생성 (캐시 관리, 성능 모니터링)
- [ ] search_routes.py 생성 (RAG 검색 API)
- [ ] stream_routes.py 생성 (메인 fortune telling 스트리밍)
- [ ] destiny_story_routes.py 생성 (15-chapter story generation)
- [ ] app.py에서 라우트 제거 및 Blueprint 등록 확인
- [ ] 테스트: 모든 엔드포인트 정상 작동 확인

**예상 결과:**
- app.py: 8,342줄 → ~3,000줄 (라우트 제거)

---

### Priority 1.2: Lazy Loading 유틸리티 통합 (2일)

#### 문제점
15+ lazy loading wrapper가 app.py, fusion_logic.py, routers에 중복

**현재 패턴 (15번 반복):**
```python
_module_instance = None
HAS_FEATURE = True

def _get_module():
    global _module_instance, HAS_FEATURE
    if _module_instance is None:
        try:
            from ... import module
            _module_instance = module
        except ImportError:
            HAS_FEATURE = False
            return None
    return _module_instance
```

#### 해결책: 공통 Lazy Loader

**새 파일: `backend_ai/app/utils/lazy_loader.py`**
```python
"""Centralized lazy loading system for memory optimization.

Railway free tier (512MB) requires lazy loading of heavy modules
like SentenceTransformer to avoid OOM.
"""
from typing import Callable, Optional, TypeVar, Any
from functools import wraps
import logging

T = TypeVar('T')

class LazyModule:
    """Lazy module loader with feature flag support."""

    def __init__(self, import_path: str, module_name: str):
        self.import_path = import_path
        self.module_name = module_name
        self._module = None
        self._available = True
        self._logger = logging.getLogger(__name__)

    @property
    def available(self) -> bool:
        """Check if module is available."""
        if self._module is None:
            self.load()
        return self._available

    def load(self) -> Optional[Any]:
        """Load the module if not already loaded."""
        if self._module is None:
            try:
                module = __import__(self.import_path, fromlist=[self.module_name])
                self._module = getattr(module, self.module_name, module)
                self._logger.info(f"Lazy loaded: {self.module_name}")
            except ImportError as e:
                self._logger.warning(f"Failed to load {self.module_name}: {e}")
                self._available = False
                return None
        return self._module

    def __call__(self, *args, **kwargs):
        """Allow calling the module directly."""
        module = self.load()
        if module is None:
            raise ImportError(f"Module {self.module_name} not available")
        return module(*args, **kwargs)

    def __getattr__(self, name):
        """Proxy attribute access to the loaded module."""
        module = self.load()
        if module is None:
            raise ImportError(f"Module {self.module_name} not available")
        return getattr(module, name)


class LazyModuleRegistry:
    """Central registry for all lazy-loaded modules."""

    def __init__(self):
        self._modules = {}

    def register(self, name: str, import_path: str, module_name: str = None) -> LazyModule:
        """Register a lazy module."""
        if module_name is None:
            module_name = name

        if name not in self._modules:
            self._modules[name] = LazyModule(import_path, module_name)

        return self._modules[name]

    def get(self, name: str) -> Optional[LazyModule]:
        """Get a registered lazy module."""
        return self._modules.get(name)

    def is_available(self, name: str) -> bool:
        """Check if a module is available."""
        module = self.get(name)
        return module.available if module else False

    def capabilities(self) -> dict:
        """Get all module availability status."""
        return {name: module.available for name, module in self._modules.items()}


# Global registry
_registry = LazyModuleRegistry()

# Register all modules
FUSION_GENERATE = _registry.register('fusion_generate', 'backend_ai.model', 'fusion_generate')
ICHING_RAG = _registry.register('iching_rag', 'backend_ai.app.iching_rag')
PERSONA_EMBED = _registry.register('persona_embeddings', 'backend_ai.app.persona_embeddings')
TAROT_HYBRID_RAG = _registry.register('tarot_hybrid_rag', 'backend_ai.app.tarot_hybrid_rag')
DOMAIN_RAG = _registry.register('domain_rag', 'backend_ai.app.domain_rag')
COMPATIBILITY = _registry.register('compatibility_logic', 'backend_ai.app.compatibility_logic')
HYBRID_RAG = _registry.register('hybrid_rag', 'backend_ai.app.hybrid_rag')
AGENTIC_RAG = _registry.register('agentic_rag', 'backend_ai.app.agentic_rag')
COUNSELING = _registry.register('counseling_engine', 'backend_ai.app.counseling_engine')
SAJU_ASTRO_RAG = _registry.register('saju_astro_rag', 'backend_ai.app.saju_astro_rag')
CORPUS_RAG = _registry.register('corpus_rag', 'backend_ai.app.corpus_rag')
REALTIME_ASTRO = _registry.register('realtime_astro', 'backend_ai.app.realtime_astro')
CHART_GEN = _registry.register('chart_generator', 'backend_ai.app.chart_generator')
USER_MEMORY = _registry.register('user_memory', 'backend_ai.app.user_memory')
BADGES = _registry.register('badge_system', 'backend_ai.app.badge_system')
RLHF = _registry.register('feedback_learning', 'backend_ai.app.feedback_learning')

def get_capabilities() -> dict:
    """Get all module capabilities."""
    return _registry.capabilities()
```

**사용 예시 (before/after):**
```python
# Before (app.py, 15번 반복)
_fusion_generate_module = None
def _get_fusion_generate():
    global _fusion_generate_module
    if _fusion_generate_module is None:
        from backend_ai.model import fusion_generate as _fg
        _fusion_generate_module = _fg
    return _fusion_generate_module

# After (anywhere)
from backend_ai.app.utils.lazy_loader import FUSION_GENERATE

# Direct usage
result = FUSION_GENERATE.refine_with_gpt5mini(text)

# Check availability
if FUSION_GENERATE.available:
    result = FUSION_GENERATE.some_function()
```

**체크리스트:**
- [ ] `utils/lazy_loader.py` 생성
- [ ] app.py에서 lazy loading 코드를 새 시스템으로 대체
- [ ] routers에서 lazy loading 코드 제거 및 utils 사용
- [ ] fusion_logic.py 업데이트
- [ ] 테스트: 모든 feature flag 정상 작동 확인

**예상 결과:**
- 코드 중복 제거: ~300줄 감소
- app.py: ~3,000줄 → ~2,700줄

---

### Priority 1.3: Helper Functions 서비스 분리 (3일)

#### app.py의 177개 함수 분류

**현재 함수 카테고리:**
1. **Input Validation & Sanitization** (~20 functions)
2. **Birth Data Normalization** (~15 functions)
3. **Chart Context Builders** (~10 functions - Saju/Astro summaries)
4. **Cross-Analysis Builders** (~8 functions)
5. **Text Formatting** (~12 functions)
6. **SSE Streaming Helpers** (~6 functions)
7. **RAG Context Builders** (~10 functions)
8. **Data Extraction** (~15 functions - pick_planet, pick_ascendant, etc.)
9. **Cache & Session Management** (~8 functions)
10. **기타 유틸리티** (~73 functions)

#### 새 디렉토리 구조

```
backend_ai/app/services/
├── __init__.py
├── validation_service.py (NEW) - Input validation & sanitization
├── birth_data_service.py (NEW) - Birth data normalization
├── chart_context_service.py (NEW) - Saju/Astro chart summaries
├── cross_analysis_service.py (NEW) - Cross-analysis builders
├── text_format_service.py (NEW) - Text formatting utilities
├── streaming_service.py (NEW) - SSE streaming helpers
├── rag_context_service.py (NEW) - RAG context building
└── data_extraction_service.py (NEW) - Chart data extraction
```

**상세 설계:**

**1. validation_service.py**
```python
"""Input validation and sanitization services."""

class ValidationService:
    """Centralized validation for all user inputs."""

    @staticmethod
    def sanitize_user_input(text: str, max_length: int = 500) -> str:
        """Sanitize general user input."""
        pass

    @staticmethod
    def sanitize_dream_text(text: str) -> str:
        """Sanitize dream text input."""
        pass

    @staticmethod
    def sanitize_name(name: str) -> str:
        """Sanitize user name."""
        pass

    @staticmethod
    def validate_birth_data(data: dict) -> tuple[bool, str]:
        """Validate birth data structure."""
        pass

    @staticmethod
    def is_suspicious_input(text: str) -> bool:
        """Check for suspicious input patterns."""
        pass
```

**2. birth_data_service.py**
```python
"""Birth data normalization and processing."""

class BirthDataService:
    """Handle birth data normalization and conversion."""

    @staticmethod
    def normalize_birth_data(data: dict) -> dict:
        """Normalize birth data to standard format."""
        pass

    @staticmethod
    def extract_birth_info(data: dict) -> tuple:
        """Extract (year, month, day, hour, minute, gender, etc.)"""
        pass

    @staticmethod
    def validate_datetime(year, month, day, hour, minute) -> bool:
        """Validate datetime values."""
        pass
```

**3. chart_context_service.py**
```python
"""Chart context and summary builders."""

class ChartContextService:
    """Build context summaries for Saju and Astrology charts."""

    @staticmethod
    def build_saju_summary(saju_data: dict) -> str:
        """Build Saju chart summary for AI context."""
        pass

    @staticmethod
    def build_astro_summary(astro_data: dict) -> str:
        """Build Astrology chart summary for AI context."""
        pass

    @staticmethod
    def build_combined_summary(saju_data: dict, astro_data: dict) -> str:
        """Build combined chart summary."""
        pass
```

**4. streaming_service.py**
```python
"""SSE streaming utilities."""
from flask import Response
from typing import Iterator, Callable

class StreamingService:
    """Handle SSE streaming responses."""

    @staticmethod
    def sse_error_response(message: str) -> Response:
        """Create SSE error response."""
        def generate():
            yield f"data: {json.dumps({'error': message})}\n\n"
        return Response(generate(), mimetype="text/event-stream")

    @staticmethod
    def sse_stream_response(generator: Callable) -> Response:
        """Create SSE stream response from generator."""
        return Response(generator(), mimetype="text/event-stream")

    @staticmethod
    def format_sse_chunk(data: dict) -> str:
        """Format data as SSE chunk."""
        return f"data: {json.dumps(data)}\n\n"
```

**5. rag_context_service.py**
```python
"""RAG context building service."""

class RAGContextService:
    """Build RAG context from multiple sources."""

    def __init__(self):
        self.graph_rag = None
        self.corpus_rag = None
        self.persona_rag = None

    def build_context(self, query: str, domain: str = None) -> str:
        """Build RAG context from all sources."""
        pass

    def search_graph(self, query: str, domain: str) -> list:
        """Search graph RAG."""
        pass

    def search_corpus(self, query: str) -> list:
        """Search corpus RAG (Jung/Stoic quotes)."""
        pass

    def format_rag_results(self, results: list) -> str:
        """Format RAG results as context string."""
        pass
```

**체크리스트:**
- [ ] `services/` 디렉토리 생성
- [ ] validation_service.py 작성 및 app.py에서 함수 이동
- [ ] birth_data_service.py 작성 및 함수 이동
- [ ] chart_context_service.py 작성 및 함수 이동
- [ ] streaming_service.py 작성 및 함수 이동
- [ ] rag_context_service.py 작성 및 함수 이동
- [ ] app.py 및 routers에서 새 services import로 대체
- [ ] 테스트: 모든 API 엔드포인트 정상 작동 확인

**예상 결과:**
- app.py: ~2,700줄 → ~1,500줄 (helper functions 제거)
- 새 services: ~1,200줄

---

### Priority 1.4: 데이터 로딩 분리 (1일)

#### 문제점
app.py lines 530-850: 7개 JSON 파일, Jung data, cache 로딩이 app.py에 하드코딩

**새 파일: `backend_ai/app/utils/data_loader.py`**
```python
"""Centralized data loading for integration data, Jung psychology, etc."""
import json
from pathlib import Path
from typing import Dict, Any
import logging

class DataLoader:
    """Load and cache static data files."""

    def __init__(self, data_dir: Path = None):
        self.data_dir = data_dir or Path(__file__).parent.parent.parent / "data"
        self._cache = {}
        self._logger = logging.getLogger(__name__)

    def load_integration_data(self) -> Dict[str, Any]:
        """Load all integration JSON files."""
        if 'integration' in self._cache:
            return self._cache['integration']

        integration_files = [
            "multimodal_engine.json",
            "career_mapping.json",
            "numerology_mapping.json",
            "health_mapping.json",
            "relationship_mapping.json",
            "financial_mapping.json",
            "spiritual_mapping.json"
        ]

        data = {}
        for filename in integration_files:
            path = self.data_dir / "integration" / filename
            if path.exists():
                with open(path, 'r', encoding='utf-8') as f:
                    key = filename.replace('.json', '')
                    data[key] = json.load(f)

        self._cache['integration'] = data
        self._logger.info(f"Loaded {len(data)} integration data files")
        return data

    def load_jung_psychology_data(self) -> Dict[str, Any]:
        """Load Jung psychology data (therapeutic questions, crisis)."""
        if 'jung' in self._cache:
            return self._cache['jung']

        # Load Jung therapeutic questions, crisis intervention, etc.
        pass

    def load_cross_analysis_cache(self) -> Dict[str, Any]:
        """Load pre-computed cross-analysis rules."""
        if 'cross_analysis' in self._cache:
            return self._cache['cross_analysis']

        # Load theme-based analysis rules
        pass

# Global instance
_data_loader = DataLoader()

def get_integration_data() -> Dict[str, Any]:
    """Get integration data (lazy loaded)."""
    return _data_loader.load_integration_data()

def get_jung_data() -> Dict[str, Any]:
    """Get Jung psychology data."""
    return _data_loader.load_jung_psychology_data()
```

**체크리스트:**
- [ ] `utils/data_loader.py` 생성
- [ ] app.py의 데이터 로딩 코드를 data_loader로 이동
- [ ] app.py에서 새 data_loader 사용
- [ ] 테스트: 모든 데이터 정상 로딩 확인

**예상 결과:**
- app.py: ~1,500줄 → ~1,200줄

---

### Phase 1 완료 후 상태

```
app.py: 8,342줄 → ~1,200줄 (85% 감소) ✅
새 구조:
├── routers/ (18 files) - 모든 엔드포인트
├── services/ (8 files) - 비즈니스 로직
└── utils/
    ├── lazy_loader.py - 중앙화된 lazy loading
    └── data_loader.py - 데이터 로딩
```

**테스트 필수:**
- [ ] 모든 API 엔드포인트 smoke test
- [ ] Feature flags 정상 작동 확인
- [ ] 메모리 사용량 변화 없음 확인 (Railway 512MB)

---

## 📅 Phase 2: 핵심 - 서비스 레이어 & RAG 통합 (2-3주)

### Priority 2.1: RAG 시스템 통합 (5일)

#### 문제점
10+ RAG 파일이 공통 인터페이스 없이 중복 구현

**현재 RAG 파일들:**
```
saju_astro_rag.py (942줄) - Base model + GraphRAG
hybrid_rag.py (344줄) - BM25 + Vector + Reranking
agentic_rag.py (1,062줄) - Multi-hop reasoning
tarot_hybrid_rag.py (2,467줄)
tarot_rag.py (761줄)
tarot_advanced_embeddings.py (1,349줄)
iching_rag.py (1,488줄)
dream_embeddings.py (648줄)
corpus_rag.py (361줄) - Jung quotes
domain_rag.py (298줄)
persona_embeddings.py (242줄)
```

#### 새 디렉토리 구조

```
backend_ai/app/rag/
├── __init__.py
├── base.py (NEW) - Abstract base classes
├── core/
│   ├── __init__.py
│   ├── embeddings.py (NEW) - Shared embedding model
│   ├── graph.py (saju_astro_rag.py 리팩토링)
│   ├── hybrid.py (hybrid_rag.py)
│   └── agentic.py (agentic_rag.py)
├── domain/
│   ├── __init__.py
│   ├── tarot.py (tarot_*.py 통합)
│   ├── iching.py (iching_rag.py)
│   ├── dream.py (dream_embeddings.py)
│   └── corpus.py (corpus_rag.py, persona_embeddings.py 통합)
└── utils/
    ├── __init__.py
    ├── reranking.py (NEW) - Shared reranking logic
    └── caching.py (NEW) - RAG caching utilities
```

#### 상세 설계

**1. rag/base.py - Abstract Base Classes**
```python
"""Base classes for RAG systems."""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class RAGResult:
    """Standard RAG result format."""

    def __init__(self, text: str, score: float, metadata: Dict[str, Any] = None):
        self.text = text
        self.score = score
        self.metadata = metadata or {}

    def __repr__(self):
        return f"RAGResult(score={self.score:.3f}, text={self.text[:50]}...)"


class BaseRAG(ABC):
    """Abstract base class for all RAG systems."""

    @abstractmethod
    def search(self, query: str, top_k: int = 5, **kwargs) -> List[RAGResult]:
        """Search for relevant documents."""
        pass

    @abstractmethod
    def embed_query(self, query: str) -> Any:
        """Embed a query."""
        pass

    def format_context(self, results: List[RAGResult]) -> str:
        """Format RAG results as context string."""
        if not results:
            return ""

        context_parts = []
        for i, result in enumerate(results, 1):
            context_parts.append(f"[{i}] {result.text} (relevance: {result.score:.2f})")

        return "\n".join(context_parts)


class GraphRAGBase(BaseRAG):
    """Base class for graph-based RAG."""

    @abstractmethod
    def search_graph(self, query: str, domain: str = None, max_depth: int = 2) -> List[RAGResult]:
        """Search graph with optional domain filtering."""
        pass

    @abstractmethod
    def get_neighbors(self, node_id: str, max_distance: int = 1) -> List[str]:
        """Get neighboring nodes."""
        pass


class HybridRAGBase(BaseRAG):
    """Base class for hybrid retrieval (BM25 + Vector)."""

    @abstractmethod
    def search_bm25(self, query: str, top_k: int = 10) -> List[RAGResult]:
        """BM25 keyword search."""
        pass

    @abstractmethod
    def search_vector(self, query: str, top_k: int = 10) -> List[RAGResult]:
        """Vector similarity search."""
        pass

    @abstractmethod
    def rerank(self, query: str, results: List[RAGResult]) -> List[RAGResult]:
        """Rerank results using cross-encoder."""
        pass
```

**2. rag/core/embeddings.py - Shared Embedding Model**
```python
"""Shared sentence transformer model for all RAG systems.

This centralizes the SentenceTransformer model loading to avoid OOM.
Only ONE model instance should exist across all RAG systems.
"""
from sentence_transformers import SentenceTransformer
from typing import Union, List
import numpy as np
import torch
import logging

_model = None
_model_name = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

def get_embedding_model(model_name: str = None) -> SentenceTransformer:
    """Get singleton embedding model."""
    global _model, _model_name

    if model_name and model_name != _model_name:
        logging.warning(f"Requested model {model_name} differs from loaded {_model_name}")

    if _model is None:
        _model = SentenceTransformer(_model_name)
        logging.info(f"Loaded embedding model: {_model_name}")

    return _model

def embed_text(text: Union[str, List[str]], normalize: bool = True) -> np.ndarray:
    """Embed text using shared model."""
    model = get_embedding_model()
    embeddings = model.encode(text, convert_to_numpy=True, normalize_embeddings=normalize)
    return embeddings

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Compute cosine similarity."""
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))
```

**3. rag/core/graph.py - GraphRAG (from saju_astro_rag.py)**
```python
"""Graph-based RAG using NetworkX."""
import networkx as nx
from typing import List, Dict
from ..base import GraphRAGBase, RAGResult
from .embeddings import embed_text, cosine_similarity

class GraphRAG(GraphRAGBase):
    """Graph-based RAG for Saju/Astrology knowledge."""

    def __init__(self, graph_dir: str):
        self.graph = nx.DiGraph()
        self.node_embeddings = {}
        self._load_graphs(graph_dir)

    def search(self, query: str, top_k: int = 5, **kwargs) -> List[RAGResult]:
        """Search graph."""
        query_emb = embed_text(query)

        # Compute similarities
        scores = []
        for node_id, node_emb in self.node_embeddings.items():
            score = cosine_similarity(query_emb, node_emb)
            scores.append((node_id, score))

        # Get top-k
        scores.sort(key=lambda x: x[1], reverse=True)
        top_nodes = scores[:top_k]

        # Build results
        results = []
        for node_id, score in top_nodes:
            node_data = self.graph.nodes[node_id]
            results.append(RAGResult(
                text=node_data.get('text', ''),
                score=score,
                metadata={'node_id': node_id, **node_data}
            ))

        return results

    def search_graph(self, query: str, domain: str = None, max_depth: int = 2) -> List[RAGResult]:
        """Search with graph traversal."""
        # Get initial nodes
        initial_results = self.search(query, top_k=3)

        # Expand with neighbors
        expanded_nodes = set()
        for result in initial_results:
            node_id = result.metadata['node_id']
            neighbors = self.get_neighbors(node_id, max_distance=max_depth)
            expanded_nodes.update(neighbors)

        # Build expanded results
        # ... (implementation)
        pass

    def get_neighbors(self, node_id: str, max_distance: int = 1) -> List[str]:
        """Get neighboring nodes within max_distance."""
        if node_id not in self.graph:
            return []

        neighbors = []
        for distance in range(1, max_distance + 1):
            # BFS to find nodes at distance
            pass

        return neighbors

    def embed_query(self, query: str):
        """Embed query."""
        return embed_text(query)

    def _load_graphs(self, graph_dir: str):
        """Load graph files from directory."""
        # Load .graphml files, build embeddings
        pass
```

**4. rag/domain/tarot.py - Tarot RAG 통합**
```python
"""Tarot RAG - consolidated from 3 files."""
from typing import List
from ..base import HybridRAGBase, RAGResult
from ..core.embeddings import embed_text

class TarotRAG(HybridRAGBase):
    """
    Consolidated Tarot RAG system.

    Combines:
    - tarot_rag.py (basic embeddings)
    - tarot_advanced_embeddings.py (pattern extraction)
    - tarot_hybrid_rag.py (hybrid search)
    """

    def __init__(self, data_dir: str):
        self.tarot_cards = {}
        self.card_embeddings = {}
        self.patterns = {}
        self._load_tarot_data(data_dir)

    def search(self, query: str, top_k: int = 5, **kwargs) -> List[RAGResult]:
        """Hybrid search (BM25 + Vector + Rerank)."""
        # Get candidates from both methods
        bm25_results = self.search_bm25(query, top_k=10)
        vector_results = self.search_vector(query, top_k=10)

        # Merge and deduplicate
        all_results = self._merge_results(bm25_results, vector_results)

        # Rerank
        reranked = self.rerank(query, all_results)

        return reranked[:top_k]

    # ... (implementation)
```

**체크리스트:**
- [ ] `rag/` 디렉토리 및 base.py 생성
- [ ] `rag/core/embeddings.py` 작성 (shared model)
- [ ] `rag/core/graph.py` 작성 (saju_astro_rag 리팩토링)
- [ ] `rag/core/hybrid.py` 작성 (hybrid_rag 리팩토링)
- [ ] `rag/core/agentic.py` 작성 (agentic_rag 리팩토링)
- [ ] `rag/domain/tarot.py` 작성 (3개 파일 통합)
- [ ] `rag/domain/iching.py` 작성
- [ ] `rag/domain/dream.py` 작성
- [ ] `rag/domain/corpus.py` 작성 (Jung/Stoic quotes)
- [ ] 기존 RAG 파일들 deprecate 또는 제거
- [ ] 모든 import 업데이트
- [ ] 테스트: RAG 검색 기능 정상 작동

**예상 결과:**
- RAG 파일 수: 11개 → 9개 (구조화됨)
- 코드 중복 감소: ~1,000줄
- 공통 인터페이스로 확장성 향상

---

### Priority 2.2: compatibility_logic.py 분해 (3일)

#### 문제점
6,168줄의 거대한 단일 파일

**새 디렉토리 구조:**
```
backend_ai/app/domains/compatibility/
├── __init__.py
├── engine.py (NEW) - Core compatibility engine
├── analyzers/
│   ├── __init__.py
│   ├── saju_analyzer.py (NEW) - Saju compatibility
│   ├── astro_analyzer.py (NEW) - Astrology synastry
│   └── fusion_analyzer.py (NEW) - Combined analysis
├── formatters/
│   ├── __init__.py
│   ├── text_formatter.py (NEW) - Text output
│   └── score_formatter.py (NEW) - Scoring output
└── utils/
    ├── __init__.py
    └── rules.py (NEW) - Compatibility rules
```

**체크리스트:**
- [ ] `domains/compatibility/` 생성
- [ ] engine.py 작성 (main orchestrator)
- [ ] analyzers 작성 (Saju, Astro, Fusion)
- [ ] formatters 작성
- [ ] compatibility_logic.py에서 코드 이동
- [ ] 모든 import 업데이트
- [ ] 테스트: 호환성 분석 정상 작동

**예상 결과:**
- compatibility_logic.py: 6,168줄 → 제거 (deprecated)
- 새 구조: 8-10 파일로 분산

---

### Priority 2.3: 도메인별 서비스 레이어 구축 (4일)

**새 디렉토리 구조:**
```
backend_ai/app/domains/
├── __init__.py
├── saju/
│   ├── __init__.py
│   ├── service.py (NEW) - Saju calculation service
│   ├── counselor.py (NEW) - Saju counselor logic
│   └── formatter.py (NEW)
├── astrology/
│   ├── __init__.py
│   ├── service.py (NEW) - Astrology calculation service
│   ├── counselor.py (NEW)
│   └── formatter.py (NEW)
├── tarot/
│   ├── __init__.py
│   ├── service.py (NEW) - Tarot reading service
│   ├── pattern_engine.py (tarot_pattern_engine.py 이동)
│   └── formatter.py (NEW)
├── dream/
│   ├── __init__.py
│   ├── service.py (dream_logic.py 리팩토링)
│   └── formatter.py (NEW)
├── iching/
│   ├── __init__.py
│   ├── service.py (NEW)
│   └── formatter.py (NEW)
├── counseling/
│   ├── __init__.py
│   ├── service.py (counseling_engine.py 리팩토링)
│   └── session_manager.py (NEW)
├── prediction/
│   ├── __init__.py
│   ├── service.py (prediction_engine.py 리팩토링)
│   └── timing_analyzer.py (NEW)
└── compatibility/ (from Priority 2.2)
```

**각 도메인 서비스 패턴:**
```python
# domains/saju/service.py
class SajuService:
    """Saju calculation and analysis service."""

    def __init__(self, rag_service=None, cache_service=None):
        self.rag = rag_service
        self.cache = cache_service

    def calculate_chart(self, birth_data: dict) -> dict:
        """Calculate Saju chart."""
        pass

    def analyze_chart(self, saju_data: dict, query: str = None) -> dict:
        """Analyze Saju chart with optional question."""
        pass

    def generate_report(self, saju_data: dict, format: str = "text") -> str:
        """Generate formatted report."""
        pass
```

**체크리스트:**
- [ ] `domains/` 디렉토리 생성
- [ ] 각 도메인 서비스 작성 (8개 도메인)
- [ ] 기존 logic 파일에서 코드 이동
- [ ] routers에서 새 서비스 사용
- [ ] 테스트: 모든 도메인 기능 정상 작동

**예상 결과:**
- 명확한 도메인 경계
- 각 도메인 독립 테스트 가능
- 비즈니스 로직 중앙화

---

### Priority 2.4: Config & DI 컨테이너 (2일)

**새 파일: `backend_ai/app/config.py`**
```python
"""Centralized configuration management."""
import os
from dataclasses import dataclass
from typing import Optional

@dataclass
class AppConfig:
    """Application configuration."""

    # Feature flags
    rag_enabled: bool = True
    realtime_astro: bool = True
    charts_enabled: bool = True
    user_memory: bool = True
    badges_enabled: bool = True

    # API keys
    openai_api_key: Optional[str] = None
    redis_url: Optional[str] = None

    # Performance
    max_workers: int = 4
    cache_ttl: int = 3600

    @classmethod
    def from_env(cls) -> 'AppConfig':
        """Load config from environment variables."""
        return cls(
            rag_enabled=os.getenv("RAG_DISABLE") != "1",
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            redis_url=os.getenv("REDIS_URL"),
            # ...
        )

# Global config
config = AppConfig.from_env()
```

**새 파일: `backend_ai/app/container.py`**
```python
"""Dependency injection container."""
from typing import Dict, Any, Callable
import logging

class Container:
    """Simple DI container for services."""

    def __init__(self):
        self._services = {}
        self._singletons = {}
        self._logger = logging.getLogger(__name__)

    def register(self, name: str, factory: Callable, singleton: bool = True):
        """Register a service factory."""
        self._services[name] = {
            'factory': factory,
            'singleton': singleton
        }

    def get(self, name: str) -> Any:
        """Get a service instance."""
        if name not in self._services:
            raise KeyError(f"Service {name} not registered")

        service_config = self._services[name]

        # Return cached singleton
        if service_config['singleton'] and name in self._singletons:
            return self._singletons[name]

        # Create instance
        instance = service_config['factory']()

        # Cache if singleton
        if service_config['singleton']:
            self._singletons[name] = instance

        return instance

# Global container
container = Container()

def setup_container():
    """Register all services."""
    from backend_ai.app.domains.saju.service import SajuService
    from backend_ai.app.domains.astrology.service import AstrologyService
    from backend_ai.app.rag.core.graph import GraphRAG
    # ...

    container.register('saju_service', lambda: SajuService(
        rag_service=container.get('graph_rag'),
        cache_service=container.get('cache_service')
    ))

    container.register('astrology_service', lambda: AstrologyService())
    container.register('graph_rag', lambda: GraphRAG(graph_dir="data/graph"))
    # ...
```

**체크리스트:**
- [ ] config.py 작성
- [ ] container.py 작성
- [ ] setup_container() 구현
- [ ] app.py에서 DI container 초기화
- [ ] routers에서 container 사용
- [ ] 전역 변수 제거

**예상 결과:**
- 전역 변수 제거
- 테스트 가능한 서비스 (mock injection)
- 명확한 의존성 관리

---

### Phase 2 완료 후 상태

```
backend_ai/app/
├── app.py (~500줄) - Flask app setup only
├── config.py (NEW)
├── container.py (NEW)
├── routers/ (18 files)
├── services/ (8 files)
├── domains/ (8 domains, ~30 files)
├── rag/ (9 files, 구조화됨)
└── utils/ (3 files)
```

**핵심 개선:**
- RAG 시스템 통합 및 표준화
- 도메인별 서비스 레이어
- DI 컨테이너로 의존성 관리
- 명확한 책임 분리

---

## 📅 Phase 3: 최적화 - 공통 유틸리티 통합 (2주)

### Priority 3.1: 중복 패턴 제거 (4일)

#### SSE Streaming 통합
모든 streaming routes에서 공통 로직 추출

**Before (5+ files에 중복):**
```python
def generate():
    # Prefetch RAG
    # Build prompt
    # Stream OpenAI
    # Yield SSE
    pass
return Response(generate(), mimetype="text/event-stream")
```

**After (services/streaming_service.py 확장):**
```python
class StreamingService:
    def stream_ai_response(
        self,
        prompt_builder: Callable,
        prefetch_fn: Callable = None,
        error_handler: Callable = None
    ) -> Response:
        """Generic AI streaming handler."""
        pass
```

#### RAG Context Building 통합
`services/rag_context_service.py`에 모든 RAG 조합 패턴 통합

#### 체크리스트:
- [ ] SSE streaming 패턴 통합
- [ ] RAG context building 통합
- [ ] Input validation 패턴 통합
- [ ] 모든 중복 코드 제거

---

### Priority 3.2: 템플릿 시스템 리팩토링 (3일)

#### 문제점
template_renderer.py가 2,455줄

**새 구조:**
```
backend_ai/app/templates/
├── __init__.py
├── base.py (NEW) - Template base class
├── renderers/
│   ├── saju_renderer.py
│   ├── astro_renderer.py
│   └── compatibility_renderer.py
└── formatters/
    ├── text_formatter.py
    └── html_formatter.py
```

---

### Priority 3.3: 테스트 인프라 구축 (3일)

**새 디렉토리:**
```
backend_ai/tests/
├── __init__.py
├── conftest.py (pytest fixtures)
├── unit/
│   ├── test_rag_base.py
│   ├── test_services.py
│   └── test_domains.py
├── integration/
│   ├── test_saju_flow.py
│   └── test_compatibility_flow.py
└── fixtures/
    ├── birth_data.json
    └── mock_rag_responses.json
```

**체크리스트:**
- [ ] pytest 설정
- [ ] Unit tests for services
- [ ] Integration tests for main flows
- [ ] Mock fixtures 작성
- [ ] CI/CD 통합

---

### Priority 3.4: 문서화 (2일)

**새 문서:**
```
backend_ai/docs/
├── README.md (업데이트)
├── ARCHITECTURE.md (NEW)
├── API.md (NEW)
├── RAG_SYSTEM.md (NEW)
├── DEPLOYMENT.md (NEW)
└── MIGRATION_GUIDE.md (NEW) - 기존 코드 마이그레이션 가이드
```

**체크리스트:**
- [ ] Architecture 문서 작성
- [ ] API 문서 작성
- [ ] RAG 시스템 설명서
- [ ] 배포 가이드
- [ ] Migration guide (기존 코드 → 새 구조)

---

## 📅 Phase 4: 안정화 (1주)

### Priority 4.1: 성능 테스트 & 최적화 (3일)

**체크리스트:**
- [ ] 메모리 사용량 프로파일링 (Railway 512MB 제한)
- [ ] API 응답 시간 측정
- [ ] RAG 검색 성능 벤치마크
- [ ] 병목 지점 최적화
- [ ] 캐시 전략 재검토

---

### Priority 4.2: 보안 감사 (2일)

**체크리스트:**
- [ ] Input validation 전면 검토
- [ ] SQL injection 방어 확인
- [ ] API rate limiting 확인
- [ ] 환경 변수 관리 검토
- [ ] 의존성 보안 스캔

---

### Priority 4.3: 모니터링 & 로깅 (2일)

**새 파일: `backend_ai/app/observability/`**
```
├── logging_config.py (NEW) - 구조화된 로깅
├── metrics.py (monitoring.py 리팩토링)
└── alerts.py (NEW) - Error alerting
```

**체크리스트:**
- [ ] 구조화된 로깅 설정
- [ ] 메트릭 수집 강화
- [ ] Error tracking 통합 (Sentry 등)
- [ ] 성능 대시보드 구축

---

## 🎯 최종 목표 상태

### 디렉토리 구조
```
backend_ai/
├── main.py (entry point, 20줄)
├── app/
│   ├── __init__.py
│   ├── app.py (500줄) - Flask setup only
│   ├── config.py (150줄)
│   ├── container.py (200줄)
│   ├── routers/ (18 files, ~300줄 each)
│   ├── services/ (8 files)
│   ├── domains/ (8 domains)
│   │   ├── saju/ (5 files)
│   │   ├── astrology/ (5 files)
│   │   ├── tarot/ (5 files)
│   │   ├── dream/ (4 files)
│   │   ├── iching/ (4 files)
│   │   ├── counseling/ (4 files)
│   │   ├── prediction/ (4 files)
│   │   └── compatibility/ (8 files)
│   ├── rag/ (9 files, 구조화)
│   │   ├── base.py
│   │   ├── core/ (embeddings, graph, hybrid, agentic)
│   │   ├── domain/ (tarot, iching, dream, corpus)
│   │   └── utils/
│   ├── templates/ (8 files)
│   ├── utils/ (5 files)
│   └── observability/ (3 files)
├── model/
│   └── fusion_generate.py
├── data/ (unchanged)
├── tests/
│   ├── unit/ (30+ tests)
│   ├── integration/ (10+ tests)
│   └── fixtures/
└── docs/
    ├── README.md
    ├── ARCHITECTURE.md
    ├── API.md
    └── RAG_SYSTEM.md
```

### 핵심 개선 사항

1. **app.py**: 8,342줄 → 500줄 (94% 감소) ✅
2. **RAG 시스템**: 11개 파일 → 9개 파일 (구조화, 공통 인터페이스)
3. **도메인 분리**: 8개 독립 도메인, 각각 테스트 가능
4. **서비스 레이어**: 비즈니스 로직 중앙화
5. **DI 컨테이너**: 의존성 명확화, 테스트 용이
6. **공통 유틸리티**: 중복 코드 제거
7. **테스트**: 40+ 테스트, 80%+ 커버리지
8. **문서화**: 완전한 아키텍처 문서

---

## 📊 리스크 관리

### High Risk
1. **메모리 사용량 증가** (Railway 512MB 제한)
   - Mitigation: Phase 1에서 lazy loading 유지, 메모리 프로파일링
   - Rollback: 기존 lazy loading 패턴 복원

2. **Breaking changes**
   - Mitigation: 단계별 마이그레이션, 기존 API 호환성 유지
   - Rollback: Git 브랜치 전략, 각 Phase별 태그

3. **성능 저하**
   - Mitigation: Phase 4에서 벤치마크, 병목 최적화
   - Rollback: 성능 regression 시 이전 버전 복원

### Medium Risk
1. **RAG 통합 시 기능 손실**
   - Mitigation: Unit tests for each RAG system
   - Rollback: 기존 RAG 파일 유지 (deprecated)

2. **DI 컨테이너 복잡성**
   - Mitigation: 간단한 컨테이너 구현, 점진적 적용
   - Rollback: Global variables 유지

---

## 🛠️ 개발 워크플로우

### Git 브랜치 전략
```
main
├── refactor/phase-1 (app.py 분해)
├── refactor/phase-2 (서비스 레이어)
├── refactor/phase-3 (최적화)
└── refactor/phase-4 (안정화)
```

### 각 Phase 완료 조건
- [ ] 모든 기존 API 정상 작동
- [ ] 메모리 사용량 512MB 이하
- [ ] 테스트 통과
- [ ] Code review 완료
- [ ] 문서 업데이트

---

## 📈 예상 효과

### 코드 품질
- **가독성**: God Object 제거, 명확한 책임 분리
- **유지보수성**: 모듈화, 도메인별 독립성
- **테스트 용이성**: DI, 단위 테스트 가능

### 개발 속도
- **새 기능 추가**: 도메인별 독립 개발
- **버그 수정**: 명확한 책임 범위
- **온보딩**: 명확한 아키텍처 문서

### 운영
- **모니터링**: 구조화된 로깅, 메트릭
- **확장성**: 도메인별 스케일링 가능
- **안정성**: 명확한 에러 핸들링

---

## ✅ Next Steps

리팩토링을 시작하려면:

1. **Phase 1.1부터 시작**: app.py 라우트 추출
2. **브랜치 생성**: `refactor/phase-1`
3. **작은 PR 단위로 진행**: 각 Priority별 PR
4. **지속적 테스트**: 각 단계마다 regression test

시작하시겠습니까? 어느 Phase부터 시작할지 알려주세요!
