# tests/unit/test_phase7_integration.py
"""
Phase 7 Cross-Module 통합 테스트.

개별 모듈(Reranker, HyDE, Tracing, SemanticChunker)이
함께 작동하는 파이프라인 시나리오를 검증.
"""

import time
import pytest
from unittest.mock import MagicMock, patch

from app.rag.types import RAGResult
from app.rag.reranker import CrossEncoderReranker
from app.rag.hyde import HyDEGenerator
from app.rag.tracing import RAGTracer
from app.rag.semantic_chunker import SemanticChunker, ChunkConfig, split_sentences


# ─── HyDE → Reranker 파이프라인 ─────────────────────

class TestHyDERerankerPipeline:
    """HyDE 확장 쿼리를 Reranker에 전달하는 파이프라인."""

    def test_hyde_expand_then_rerank(self):
        """HyDE로 쿼리 확장 후 Reranker로 재순위화."""
        # Step 1: HyDE 쿼리 확장
        hyde = HyDEGenerator(use_llm=False)
        expanded = hyde.expand_query("갑목 성격", domain="saju")
        assert len(expanded) > len("갑목 성격")

        # Step 2: mock Reranker로 재순위화
        reranker = CrossEncoderReranker()
        mock_model = MagicMock()
        mock_model.predict.return_value = [0.9, 0.3, 0.7]
        reranker._model = mock_model

        docs = ["갑목은 큰 나무를 상징합니다", "오행의 기본", "갑목의 리더십 특성"]
        results = reranker.rerank(expanded, docs, top_k=2)

        assert len(results) == 2
        assert results[0][1] == 0.9  # 최고 점수 먼저
        # HyDE 확장 쿼리가 predict에 전달됨
        call_args = mock_model.predict.call_args
        pairs = call_args[0][0]
        assert all(expanded in pair[0] for pair in pairs)

    def test_hyde_with_facts_then_rerank_results(self):
        """facts 포함 HyDE 확장 → dict 결과 재순위화."""
        hyde = HyDEGenerator(use_llm=False)
        expanded = hyde.expand_query(
            "나의 운세",
            domain="saju",
            facts={"dayMaster": "갑목"},
        )
        assert "갑목" in expanded

        reranker = CrossEncoderReranker()
        mock_model = MagicMock()
        mock_model.predict.return_value = [0.5, 0.95, 0.2]
        reranker._model = mock_model

        results = [
            {"text": "일반 운세", "score": 0.8},
            {"text": "갑목 일간 운세", "score": 0.6},
            {"text": "무관한 문서", "score": 0.3},
        ]
        reranked = reranker.rerank_results(expanded, results, top_k=2)

        assert len(reranked) == 2
        assert reranked[0]["text"] == "갑목 일간 운세"  # CE 0.95
        assert reranked[0]["cross_encoder_score"] == 0.95


# ─── SemanticChunker → Reranker 파이프라인 ──────────

class TestChunkerRerankerPipeline:
    """SemanticChunker로 분할 → Reranker로 재순위화."""

    def test_chunk_then_rerank(self):
        """긴 텍스트를 청크로 분할한 후 재순위화."""
        # Step 1: 텍스트 분할
        chunker = SemanticChunker(
            config=ChunkConfig(max_chunk_size=100, min_chunk_size=20),
        )
        text = "갑목은 큰 나무를 상징한다. 리더십이 강하고 성장을 추구한다. " \
               "을목은 작은 풀을 상징한다. 유연하고 적응력이 뛰어나다. " \
               "병화는 태양의 에너지이다. 열정적이고 밝은 성격이다."
        chunks = chunker.chunk(text)
        assert len(chunks) >= 1

        # Step 2: 청크 텍스트를 Reranker로 재순위화
        reranker = CrossEncoderReranker()
        mock_model = MagicMock()
        scores = [0.3 * (i + 1) for i in range(len(chunks))]
        scores[-1] = 0.99  # 마지막 청크가 가장 관련성 높음
        mock_model.predict.return_value = scores
        reranker._model = mock_model

        docs = [c.text for c in chunks]
        results = reranker.rerank("병화의 성격", docs, top_k=2)

        assert len(results) <= 2
        assert results[0][1] >= results[-1][1]  # 내림차순 정렬

    def test_chunk_with_rag_results_rerank(self):
        """청크를 RAGResult로 변환 후 재순위화."""
        chunker = SemanticChunker(
            config=ChunkConfig(max_chunk_size=80, min_chunk_size=10),
        )
        text = "사주의 기본 원리. 오행은 목화토금수이다. 음양의 조화가 중요하다."
        chunks = chunker.chunk(text)

        # RAGResult로 변환
        rag_results = [
            RAGResult(text=c.text, score=0.5, source="saju_corpus", rank=i + 1)
            for i, c in enumerate(chunks)
        ]

        # Reranker mock
        reranker = CrossEncoderReranker()
        mock_model = MagicMock()
        mock_model.predict.return_value = [0.8 - 0.1 * i for i in range(len(rag_results))]
        reranker._model = mock_model

        reranked = reranker.rerank_rag_results("오행의 원리", rag_results, top_k=2)
        assert len(reranked) <= 2
        assert reranked[0].score >= reranked[-1].score


# ─── HyDE → SemanticChunker 파이프라인 ──────────────

class TestHyDEChunkerPipeline:
    """HyDE 가설 문서를 SemanticChunker로 분할."""

    def test_hyde_hypothesis_chunking(self):
        """HyDE 가설 생성 결과를 청킹."""
        hyde = HyDEGenerator(use_llm=False)
        hypothesis = hyde.generate_hypothesis(
            "사주의 오행이란?",
            domain="saju",
        )
        assert len(hypothesis) > 0

        chunker = SemanticChunker(
            config=ChunkConfig(max_chunk_size=100, min_chunk_size=10),
        )
        chunks = chunker.chunk(hypothesis)
        assert len(chunks) >= 1
        # 청크 텍스트를 합치면 원본 내용 포함
        all_text = " ".join(c.text for c in chunks)
        assert "사주" in all_text or "오행" in all_text


# ─── Tracing + 전체 파이프라인 ──────────────────────

class TestFullPipelineWithTracing:
    """전체 파이프라인을 Tracing으로 추적."""

    def test_traced_hyde_rerank_pipeline(self):
        """HyDE → 검색 → Reranker 파이프라인 추적."""
        tracer = RAGTracer()
        trace = tracer.start_trace("갑목 일간의 성격 분석")
        trace.timestamp = time.time() - 0.1  # 양의 duration 보장

        # Step 1: HyDE 쿼리 확장
        hyde = HyDEGenerator(use_llm=False)
        expanded = hyde.expand_query("갑목 성격", domain="saju")
        tracer.record_hyde(trace, 10.0, hypothesis_length=len(expanded))

        # Step 2: 검색 (mock)
        search_results = [
            {"text": "갑목은 리더십이 강하다", "score": 0.85},
            {"text": "갑목의 오행 속성", "score": 0.72},
            {"text": "무관한 문서", "score": 0.3},
        ]
        tracer.record_search(trace, "saju_corpus", 25.0, search_results)

        # Step 3: Reranker
        reranker = CrossEncoderReranker()
        mock_model = MagicMock()
        mock_model.predict.return_value = [0.95, 0.6, 0.1]
        reranker._model = mock_model

        docs = [r["text"] for r in search_results]
        reranked = reranker.rerank(expanded, docs, top_k=2)
        tracer.record_rerank(trace, 15.0, len(search_results), len(reranked))

        # Step 4: 완료
        tracer.finish_trace(trace)

        # 검증: 3개 이벤트 (hyde, search, rerank)
        assert len(trace.events) == 3
        event_types = [e.event_type for e in trace.events]
        assert "hyde" in event_types
        assert "search" in event_types
        assert "rerank" in event_types
        assert trace.total_duration_ms > 0

    def test_traced_pipeline_with_error_recovery(self):
        """에러 발생 시 fallback 추적."""
        tracer = RAGTracer()
        trace = tracer.start_trace("error recovery test")
        trace.timestamp = time.time() - 0.1

        # HyDE 시도 → 실패 기록 → 로컬 fallback
        tracer.record_error(trace, "hyde", "HyDE LLM timeout")
        hyde = HyDEGenerator(use_llm=False)
        expanded = hyde.expand_query("test", domain="saju")
        tracer.record_hyde(trace, 5.0, hypothesis_length=len(expanded))

        # 검색
        tracer.record_search(trace, "fallback_source", 10.0, [])

        tracer.finish_trace(trace)

        assert len(trace.events) == 3
        assert trace.events[0].event_type == "error"
        # error는 event에 기록됨 (has_error는 events에서 확인)
        assert any(e.event_type == "error" for e in trace.events)

    def test_traced_chunking_pipeline(self):
        """SemanticChunker 포함 파이프라인 추적."""
        tracer = RAGTracer()
        trace = tracer.start_trace("chunking pipeline")
        trace.timestamp = time.time() - 0.1

        # 텍스트 청킹
        chunker = SemanticChunker(
            config=ChunkConfig(max_chunk_size=100, min_chunk_size=10),
        )
        text = "사주 해석의 기본. 오행의 상생 관계. 일간의 중요성."
        chunks = chunker.chunk(text)

        # 검색 기록
        for i, chunk in enumerate(chunks):
            tracer.record_search(
                trace,
                f"chunk_{i}",
                20.0,
                [{"text": chunk.text, "score": 0.8}],
            )

        # Reranker 기록
        tracer.record_rerank(trace, 15.0, len(chunks), min(2, len(chunks)))

        tracer.finish_trace(trace)

        # 검증: search * N + rerank 1
        assert len(trace.events) == len(chunks) + 1

    def test_metrics_across_multiple_traced_pipelines(self):
        """여러 파이프라인 실행 후 메트릭 집계."""
        tracer = RAGTracer()

        # 파이프라인 1: 성공
        t1 = tracer.start_trace("pipeline_1")
        t1.timestamp = time.time() - 0.2
        tracer.record_search(t1, "src1", 30.0, [{"text": "a", "score": 0.9}])
        tracer.record_rerank(t1, 20.0, 5, 2)
        tracer.finish_trace(t1)

        # 파이프라인 2: 에러 포함
        t2 = tracer.start_trace("pipeline_2")
        t2.timestamp = time.time() - 0.15
        tracer.record_error(t2, "search", "timeout")
        tracer.record_search(t2, "src2", 10.0, [])
        tracer.finish_trace(t2)

        # 파이프라인 3: 성공
        t3 = tracer.start_trace("pipeline_3")
        t3.timestamp = time.time() - 0.1
        tracer.record_hyde(t3, 15.0, hypothesis_length=200)
        tracer.record_search(t3, "src1", 25.0, [{"text": "b", "score": 0.7}])
        tracer.finish_trace(t3)

        metrics = tracer.get_metrics()
        assert metrics["total_traces"] == 3
        assert metrics["error_rate"] > 0  # 1/3
        assert metrics["avg_duration_ms"] > 0

        # 소스별 메트릭
        source_metrics = tracer.get_source_metrics()
        assert "src1" in source_metrics
        assert source_metrics["src1"]["count"] >= 1
        assert source_metrics["src1"]["avg_ms"] >= 0


# ─── Feature Flag 통합 테스트 ──────────────────────

class TestFeatureFlagIntegration:
    """Feature flag 상태에 따른 모듈 동작 통합 검증."""

    def test_all_flags_importable(self):
        """모든 Phase 7 feature flag import 가능."""
        from app.rag.reranker import USE_RERANKER
        from app.rag.hyde import USE_HYDE
        from app.rag.tracing import USE_TRACING

        assert isinstance(USE_RERANKER, bool)
        assert isinstance(USE_HYDE, bool)
        assert isinstance(USE_TRACING, bool)

    def test_all_singletons_callable(self):
        """모든 Phase 7 싱글톤 함수 호출 가능."""
        from app.rag.reranker import get_reranker
        from app.rag.hyde import get_hyde_generator
        from app.rag.tracing import get_rag_tracer
        from app.rag.semantic_chunker import get_semantic_chunker

        assert callable(get_reranker)
        assert callable(get_hyde_generator)
        assert callable(get_rag_tracer)
        assert callable(get_semantic_chunker)

    def test_init_exports_all_phase7(self):
        """__init__.py에서 Phase 7 모듈 export 확인."""
        import app.rag as rag

        # Reranker
        assert hasattr(rag, "CrossEncoderReranker")
        assert hasattr(rag, "get_reranker")
        assert hasattr(rag, "USE_RERANKER")

        # HyDE
        assert hasattr(rag, "HyDEGenerator")
        assert hasattr(rag, "get_hyde_generator")
        assert hasattr(rag, "USE_HYDE")

        # Tracing
        assert hasattr(rag, "RAGTraceEvent")
        assert hasattr(rag, "RAGTrace")
        assert hasattr(rag, "RAGTracer")
        assert hasattr(rag, "get_rag_tracer")
        assert hasattr(rag, "USE_TRACING")

        # SemanticChunker
        assert hasattr(rag, "SemanticChunker")
        assert hasattr(rag, "ChunkConfig")
        assert hasattr(rag, "TextChunk")
        assert hasattr(rag, "get_semantic_chunker")
        assert hasattr(rag, "split_sentences")


# ─── RAGResult 연동 테스트 ─────────────────────────

class TestRAGResultIntegration:
    """RAGResult 타입을 여러 모듈에서 일관되게 사용."""

    def test_chunker_to_rag_result_to_reranker(self):
        """Chunker → RAGResult 변환 → Reranker."""
        chunker = SemanticChunker(
            config=ChunkConfig(max_chunk_size=100, min_chunk_size=10),
        )
        text = "목은 성장의 기운이다. 화는 빛과 열이다. 토는 안정의 중심이다."
        chunks = chunker.chunk(text)

        # RAGResult 변환
        rag_results = [
            RAGResult(
                text=c.text,
                score=0.7,
                source="ohaeng_corpus",
                metadata={"chunk_index": c.index},
            )
            for c in chunks
        ]

        # Reranker mock
        reranker = CrossEncoderReranker()
        mock_model = MagicMock()
        mock_model.predict.return_value = [0.9 - 0.2 * i for i in range(len(rag_results))]
        reranker._model = mock_model

        reranked = reranker.rerank_rag_results("목의 성격", rag_results, top_k=2)

        assert len(reranked) <= 2
        for r in reranked:
            assert isinstance(r, RAGResult)
            assert r.source == "ohaeng_corpus"
            assert "chunk_index" in r.metadata

    def test_rag_result_serialization_after_rerank(self):
        """Reranker 후 RAGResult.to_dict() 정상 동작."""
        results = [
            RAGResult(text="문서1", score=0.5, source="s1"),
            RAGResult(text="문서2", score=0.8, source="s2"),
        ]

        reranker = CrossEncoderReranker()
        mock_model = MagicMock()
        mock_model.predict.return_value = [0.3, 0.95]
        reranker._model = mock_model

        reranked = reranker.rerank_rag_results("query", results)

        for r in reranked:
            d = r.to_dict()
            assert "text" in d
            assert "score" in d
            assert "source" in d
            assert isinstance(d["score"], float)


# ─── 한국어/다국어 통합 ────────────────────────────

class TestKoreanMultilingualIntegration:
    """한국어/다국어 텍스트의 모듈 간 통합."""

    def test_korean_saju_full_pipeline(self):
        """한국어 사주 도메인 전체 파이프라인."""
        # HyDE 확장
        hyde = HyDEGenerator(use_llm=False)
        expanded = hyde.expand_query(
            "을목 일간의 연애운",
            domain="saju",
            facts={"dayMaster": "을목"},
        )
        assert "을목" in expanded
        assert "사주" in expanded

        # 텍스트 청킹
        corpus = (
            "을목은 유연한 풀과 같다. 적응력이 뛰어나고 부드럽다. "
            "연애에서는 상대방에게 맞춰주는 경향이 있다. "
            "갑목과 달리 주도적이지 않지만 깊은 애정을 가진다."
        )
        chunker = SemanticChunker(
            config=ChunkConfig(max_chunk_size=80, min_chunk_size=10),
        )
        chunks = chunker.chunk(corpus)
        assert all("" != c.text for c in chunks)

        # split_sentences 한국어 처리
        sentences = split_sentences(corpus)
        assert len(sentences) >= 3

    def test_english_astro_full_pipeline(self):
        """영어 점성술 도메인 전체 파이프라인."""
        hyde = HyDEGenerator(use_llm=False)
        expanded = hyde.expand_query(
            "Mars in Aries",
            domain="astro",
            facts={"sunSign": "Aries"},
        )
        assert "Aries" in expanded
        assert "planet" in expanded

        # 영어 청킹
        corpus = (
            "Mars is the planet of action. In Aries, Mars is at home. "
            "This placement gives energy and drive. "
            "People with Mars in Aries are natural leaders."
        )
        chunker = SemanticChunker(
            config=ChunkConfig(max_chunk_size=100, min_chunk_size=10),
        )
        chunks = chunker.chunk(corpus)
        assert len(chunks) >= 1

    def test_mixed_language_pipeline(self):
        """한영 혼합 텍스트 파이프라인."""
        hyde = HyDEGenerator(use_llm=False)
        expanded = hyde.expand_query(
            "갑목 Sun sign Aries",
            domain="default",
            facts={"dayMaster": "갑목", "sunSign": "Aries"},
        )
        assert "갑목" in expanded
        assert "Aries" in expanded

        corpus = "갑목은 Jupiter와 연관된다. Aries의 화력과 갑목의 성장력은 시너지가 있다."
        sentences = split_sentences(corpus)
        assert len(sentences) >= 1
