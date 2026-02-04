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

# Vector store (ChromaDB) - optional, loaded when USE_CHROMADB=1
try:
    from .vector_store import (
        VectorStoreManager,
        get_vector_store,
        get_domain_vector_store,
    )
except ImportError:
    VectorStoreManager = None
    get_vector_store = None
    get_domain_vector_store = None

# Evaluation (RAGAS-style) - optional
try:
    from .evaluation import (
        EvalSample,
        EvalResult,
        RAGEvaluator,
        EVAL_DATASET,
    )
except ImportError:
    EvalSample = None
    EvalResult = None
    RAGEvaluator = None
    EVAL_DATASET = None

# Community summarizer - optional, loaded when USE_COMMUNITY_SUMMARY=1
try:
    from .community_summarizer import (
        CommunitySummary,
        HierarchicalSummarizer,
        get_hierarchical_summarizer,
    )
except ImportError:
    CommunitySummary = None
    HierarchicalSummarizer = None
    get_hierarchical_summarizer = None

# CrossEncoder Re-ranker - optional, loaded when USE_RERANKER=1
try:
    from .reranker import (
        CrossEncoderReranker,
        get_reranker,
        USE_RERANKER,
    )
except ImportError:
    CrossEncoderReranker = None
    get_reranker = None
    USE_RERANKER = False

# HyDE (Hypothetical Document Embeddings) - optional, loaded when USE_HYDE=1
try:
    from .hyde import (
        HyDEGenerator,
        get_hyde_generator,
        USE_HYDE,
    )
except ImportError:
    HyDEGenerator = None
    get_hyde_generator = None
    USE_HYDE = False

# Semantic Chunker - optional
try:
    from .semantic_chunker import (
        SemanticChunker,
        ChunkConfig,
        TextChunk,
        get_semantic_chunker,
        split_sentences,
    )
except ImportError:
    SemanticChunker = None
    ChunkConfig = None
    TextChunk = None
    get_semantic_chunker = None
    split_sentences = None

# Tracing / Observability - optional, loaded when USE_TRACING=1
try:
    from .tracing import (
        RAGTraceEvent,
        RAGTrace,
        RAGTracer,
        get_rag_tracer,
        USE_TRACING,
    )
except ImportError:
    RAGTraceEvent = None
    RAGTrace = None
    RAGTracer = None
    get_rag_tracer = None
    USE_TRACING = False

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
    # Vector store (optional)
    "VectorStoreManager",
    "get_vector_store",
    "get_domain_vector_store",
    # Evaluation (optional)
    "EvalSample",
    "EvalResult",
    "RAGEvaluator",
    "EVAL_DATASET",
    # Community summarizer (optional)
    "CommunitySummary",
    "HierarchicalSummarizer",
    "get_hierarchical_summarizer",
    # Re-ranker (optional)
    "CrossEncoderReranker",
    "get_reranker",
    "USE_RERANKER",
    # HyDE (optional)
    "HyDEGenerator",
    "get_hyde_generator",
    "USE_HYDE",
    # Semantic Chunker (optional)
    "SemanticChunker",
    "ChunkConfig",
    "TextChunk",
    "get_semantic_chunker",
    "split_sentences",
    # Tracing (optional)
    "RAGTraceEvent",
    "RAGTrace",
    "RAGTracer",
    "get_rag_tracer",
    "USE_TRACING",
]
