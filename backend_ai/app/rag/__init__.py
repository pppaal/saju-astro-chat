# backend_ai/app/rag/__init__.py
"""
RAG (Retrieval-Augmented Generation) Package
=============================================
공통 RAG 인프라 및 base classes

Modules:
- types: RAGResult, RAGQuery, RAGContext 데이터 클래스
- model_manager: 공유 SentenceTransformer 모델 관리
- base: BaseEmbeddingRAG, BaseHybridRAG 추상 클래스
- context_builder: LLM 프롬프트용 컨텍스트 빌더
- optimized_manager: 고성능 병렬 RAG 매니저 (p95 < 700ms 목표)

Usage:
    from backend_ai.app.rag import BaseEmbeddingRAG, RAGResult

    class MyRAG(BaseEmbeddingRAG):
        def _load_data(self):
            # Load your data here
            pass

    # Optimized parallel RAG fetch
    from backend_ai.app.rag import get_optimized_rag_manager
    manager = get_optimized_rag_manager()
    result = await manager.fetch_all(saju_data, astro_data, theme, locale)

Implementations (inherit from BaseEmbeddingRAG):
- CorpusRAG: Jung quotes retrieval (corpus_rag.py)
- TarotRAG: Tarot card interpretation (tarot_rag.py)
- DomainRAG: Multi-domain RAG with lazy loading (domain_rag.py)
"""

# Types
from .types import RAGResult, RAGQuery, RAGContext

# Model management
from .model_manager import get_shared_model, is_model_available, get_model_info

# Base classes
from .base import BaseEmbeddingRAG, BaseHybridRAG

# Context builder
from .context_builder import RAGContextBuilder, build_rag_context

# Optimized manager
from .optimized_manager import (
    OptimizedRAGManager,
    get_optimized_rag_manager,
    fetch_all_rag_data_optimized,
    warmup_optimized_rag,
    RAGConfig,
    TTLLRUCache,
)

__all__ = [
    # Types
    "RAGResult",
    "RAGQuery",
    "RAGContext",
    # Model
    "get_shared_model",
    "is_model_available",
    "get_model_info",
    # Base classes
    "BaseEmbeddingRAG",
    "BaseHybridRAG",
    # Context builder
    "RAGContextBuilder",
    "build_rag_context",
    # Optimized manager
    "OptimizedRAGManager",
    "get_optimized_rag_manager",
    "fetch_all_rag_data_optimized",
    "warmup_optimized_rag",
    "RAGConfig",
    "TTLLRUCache",
]
