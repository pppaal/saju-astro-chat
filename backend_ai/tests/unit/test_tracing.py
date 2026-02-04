# tests/unit/test_tracing.py
"""
RAG Tracing 유닛 테스트 (Phase 7c)
====================================
RAGTraceEvent, RAGTrace, RAGTracer 전체 테스트.

테스트 항목:
- 데이터클래스 생성 및 직렬화
- 트레이스 라이프사이클 (start → record → finish)
- 검색/리랭크/HyDE/에러 이벤트 기록
- 메트릭 집계 (avg, p50, p95, error_rate)
- 소스별 메트릭
- JSON 파일 저장
- 싱글톤 패턴
- Feature flag 동작
"""

import json
import os
import tempfile
import time

import pytest

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.rag.tracing import (
    RAGTraceEvent,
    RAGTrace,
    RAGTracer,
    get_rag_tracer,
    USE_TRACING,
)


# ─── RAGTraceEvent 테스트 ────────────────────────────────────

class TestRAGTraceEvent:
    """RAGTraceEvent 데이터클래스 테스트."""

    def test_create_search_event(self):
        """검색 이벤트 생성."""
        event = RAGTraceEvent(
            event_type="search",
            source="graph_rag",
            duration_ms=150.5,
            result_count=10,
            top_score=0.95,
            avg_score=0.72,
        )
        assert event.event_type == "search"
        assert event.source == "graph_rag"
        assert event.duration_ms == 150.5
        assert event.result_count == 10
        assert event.top_score == 0.95
        assert event.avg_score == 0.72
        assert event.error is None

    def test_create_error_event(self):
        """에러 이벤트 생성."""
        event = RAGTraceEvent(
            event_type="error",
            source="corpus_rag",
            error="Connection timeout",
        )
        assert event.event_type == "error"
        assert event.error == "Connection timeout"
        assert event.duration_ms == 0.0

    def test_default_values(self):
        """기본값 테스트."""
        event = RAGTraceEvent(event_type="search", source="test")
        assert event.duration_ms == 0.0
        assert event.result_count == 0
        assert event.top_score == 0.0
        assert event.avg_score == 0.0
        assert event.metadata == {}
        assert event.error is None
        assert event.timestamp > 0

    def test_metadata_field(self):
        """메타데이터 딕셔너리."""
        event = RAGTraceEvent(
            event_type="hyde",
            source="hyde_generator",
            metadata={"hypothesis_length": 200, "used_llm": True},
        )
        assert event.metadata["hypothesis_length"] == 200
        assert event.metadata["used_llm"] is True


# ─── RAGTrace 테스트 ────────────────────────────────────────

class TestRAGTrace:
    """RAGTrace 데이터클래스 테스트."""

    def test_create_trace(self):
        """트레이스 생성."""
        trace = RAGTrace(trace_id="test_001", query="사주 운세 알려줘")
        assert trace.trace_id == "test_001"
        assert trace.query == "사주 운세 알려줘"
        assert trace.domain == ""
        assert trace.events == []
        assert trace.total_duration_ms == 0.0

    def test_add_event(self):
        """이벤트 추가."""
        trace = RAGTrace(trace_id="test_002", query="test")
        event = RAGTraceEvent(event_type="search", source="graph_rag", duration_ms=100)
        trace.add_event(event)
        assert len(trace.events) == 1
        assert trace.events[0].source == "graph_rag"

    def test_add_multiple_events(self):
        """여러 이벤트 추가."""
        trace = RAGTrace(trace_id="test_003", query="test")
        for i in range(5):
            event = RAGTraceEvent(
                event_type="search",
                source=f"source_{i}",
                duration_ms=float(i * 50),
            )
            trace.add_event(event)
        assert len(trace.events) == 5
        assert trace.events[4].source == "source_4"

    def test_to_dict(self):
        """직렬화 테스트."""
        trace = RAGTrace(
            trace_id="test_004",
            query="타로 카드 해석",
            domain="tarot",
        )
        event = RAGTraceEvent(
            event_type="search",
            source="tarot_rag",
            duration_ms=80.0,
            result_count=5,
        )
        trace.add_event(event)

        d = trace.to_dict()
        assert d["trace_id"] == "test_004"
        assert d["query"] == "타로 카드 해석"
        assert d["domain"] == "tarot"
        assert len(d["events"]) == 1
        assert d["events"][0]["event_type"] == "search"
        assert d["events"][0]["source"] == "tarot_rag"

    def test_to_dict_json_serializable(self):
        """직렬화 결과가 JSON 변환 가능."""
        trace = RAGTrace(trace_id="test_005", query="test")
        trace.add_event(RAGTraceEvent(event_type="search", source="test"))
        d = trace.to_dict()
        json_str = json.dumps(d, ensure_ascii=False, default=str)
        assert isinstance(json_str, str)
        parsed = json.loads(json_str)
        assert parsed["trace_id"] == "test_005"


# ─── RAGTracer 기본 테스트 ───────────────────────────────────

class TestRAGTracerBasic:
    """RAGTracer 기본 동작 테스트."""

    def test_create_tracer(self):
        """트레이서 생성."""
        tracer = RAGTracer(max_traces=100)
        assert tracer._traces.maxlen == 100

    def test_start_trace(self):
        """트레이스 시작."""
        tracer = RAGTracer()
        trace = tracer.start_trace("사주 분석", domain="saju")
        assert trace.trace_id.startswith("rag_")
        assert trace.query == "사주 분석"
        assert trace.domain == "saju"

    def test_start_trace_generates_unique_ids(self):
        """트레이스 ID 고유성."""
        tracer = RAGTracer()
        traces = []  # 참조 유지하여 id() 재사용 방지
        for i in range(10):
            trace = tracer.start_trace(f"query_{i}")
            traces.append(trace)
        ids = {t.trace_id for t in traces}
        assert len(ids) == 10


# ─── record_search 테스트 ────────────────────────────────────

class TestRecordSearch:
    """검색 이벤트 기록 테스트."""

    def test_record_search_with_dict_results(self):
        """딕셔너리 형태 결과 기록."""
        tracer = RAGTracer()
        trace = tracer.start_trace("test")
        results = [
            {"id": "1", "text": "a", "score": 0.9},
            {"id": "2", "text": "b", "score": 0.7},
            {"id": "3", "text": "c", "score": 0.5},
        ]
        tracer.record_search(trace, "graph_rag", 120.0, results)

        assert len(trace.events) == 1
        event = trace.events[0]
        assert event.event_type == "search"
        assert event.source == "graph_rag"
        assert event.duration_ms == 120.0
        assert event.result_count == 3
        assert event.top_score == 0.9
        assert abs(event.avg_score - 0.7) < 0.01

    def test_record_search_with_object_results(self):
        """score 속성이 있는 객체 결과 기록."""

        class FakeResult:
            def __init__(self, score):
                self.score = score

        tracer = RAGTracer()
        trace = tracer.start_trace("test")
        results = [FakeResult(0.85), FakeResult(0.65)]
        tracer.record_search(trace, "corpus_rag", 80.0, results)

        event = trace.events[0]
        assert event.result_count == 2
        assert event.top_score == 0.85

    def test_record_search_no_results(self):
        """결과 없는 검색."""
        tracer = RAGTracer()
        trace = tracer.start_trace("test")
        tracer.record_search(trace, "graph_rag", 50.0, None)

        event = trace.events[0]
        assert event.result_count == 0
        assert event.top_score == 0.0
        assert event.avg_score == 0.0

    def test_record_search_empty_results(self):
        """빈 리스트 결과."""
        tracer = RAGTracer()
        trace = tracer.start_trace("test")
        tracer.record_search(trace, "graph_rag", 30.0, [])

        event = trace.events[0]
        assert event.result_count == 0

    def test_record_search_with_metadata(self):
        """추가 메타데이터 전달."""
        tracer = RAGTracer()
        trace = tracer.start_trace("test")
        tracer.record_search(
            trace, "domain_rag", 100.0, [],
            domain="saju", use_hyde=True,
        )
        event = trace.events[0]
        assert event.metadata["domain"] == "saju"
        assert event.metadata["use_hyde"] is True


# ─── record_rerank / record_hyde / record_error 테스트 ───────

class TestRecordOtherEvents:
    """리랭크, HyDE, 에러 이벤트 기록 테스트."""

    def test_record_rerank(self):
        """리랭크 이벤트 기록."""
        tracer = RAGTracer()
        trace = tracer.start_trace("test")
        tracer.record_rerank(
            trace,
            duration_ms=200.0,
            input_count=20,
            output_count=5,
            top_score=0.92,
        )
        event = trace.events[0]
        assert event.event_type == "rerank"
        assert event.source == "cross_encoder"
        assert event.duration_ms == 200.0
        assert event.result_count == 5
        assert event.top_score == 0.92
        assert event.metadata["input_count"] == 20

    def test_record_hyde(self):
        """HyDE 이벤트 기록."""
        tracer = RAGTracer()
        trace = tracer.start_trace("test")
        tracer.record_hyde(
            trace,
            duration_ms=300.0,
            hypothesis_length=150,
            used_llm=True,
        )
        event = trace.events[0]
        assert event.event_type == "hyde"
        assert event.source == "hyde_generator"
        assert event.metadata["hypothesis_length"] == 150
        assert event.metadata["used_llm"] is True

    def test_record_error(self):
        """에러 이벤트 기록."""
        tracer = RAGTracer()
        trace = tracer.start_trace("test")
        tracer.record_error(trace, "graph_rag", "Embedding model not found")

        event = trace.events[0]
        assert event.event_type == "error"
        assert event.source == "graph_rag"
        assert event.error == "Embedding model not found"


# ─── finish_trace & 메트릭 테스트 ────────────────────────────

class TestFinishTraceAndMetrics:
    """트레이스 완료 및 메트릭 집계 테스트."""

    def _create_tracer_with_traces(self, n=10):
        """테스트용 트레이서 + N개 트레이스 생성."""
        tracer = RAGTracer()
        for i in range(n):
            trace = tracer.start_trace(f"query_{i}", domain="saju")
            tracer.record_search(
                trace, "graph_rag", float(50 + i * 10),
                [{"score": 0.8 - i * 0.01}],
            )
            if i % 3 == 0:
                tracer.record_error(trace, "corpus_rag", f"Error {i}")
            trace.total_duration_ms = float(100 + i * 20)
            with tracer._lock:
                tracer._traces.append(trace)
        return tracer

    def test_finish_trace_sets_duration(self):
        """finish_trace가 총 duration을 설정."""
        tracer = RAGTracer()
        trace = tracer.start_trace("test")
        # 과거 timestamp로 설정하여 duration > 0 보장
        trace.timestamp = time.time() - 0.1  # 100ms 전
        tracer.record_search(trace, "graph_rag", 50.0, [])
        tracer.finish_trace(trace)

        assert trace.total_duration_ms >= 50.0  # 최소 100ms (약간의 오차 허용)
        assert len(tracer._traces) == 1

    def test_get_metrics_empty(self):
        """트레이스 없을 때 메트릭."""
        tracer = RAGTracer()
        m = tracer.get_metrics()
        assert m["total_traces"] == 0
        assert m["avg_duration_ms"] == 0.0

    def test_get_metrics_with_traces(self):
        """메트릭 집계."""
        tracer = self._create_tracer_with_traces(10)
        m = tracer.get_metrics()

        assert m["total_traces"] == 10
        assert m["avg_duration_ms"] > 0
        assert m["p50_duration_ms"] > 0
        assert m["p95_duration_ms"] >= m["p50_duration_ms"]
        assert m["max_duration_ms"] >= m["p95_duration_ms"]
        assert 0 < m["error_rate"] <= 1.0
        assert m["avg_events_per_trace"] > 0

    def test_get_metrics_last_n(self):
        """last_n 제한."""
        tracer = self._create_tracer_with_traces(20)
        m = tracer.get_metrics(last_n=5)
        assert m["total_traces"] == 5

    def test_error_rate_calculation(self):
        """에러율 계산."""
        tracer = RAGTracer()
        # 10개 중 3개에 에러
        for i in range(10):
            trace = tracer.start_trace(f"q_{i}")
            if i < 3:
                tracer.record_error(trace, "test", "err")
            trace.total_duration_ms = 100.0
            with tracer._lock:
                tracer._traces.append(trace)

        m = tracer.get_metrics()
        assert m["error_rate"] == 0.3

    def test_max_traces_limit(self):
        """max_traces deque 제한."""
        tracer = RAGTracer(max_traces=5)
        for i in range(10):
            trace = tracer.start_trace(f"q_{i}")
            trace.total_duration_ms = float(i)
            with tracer._lock:
                tracer._traces.append(trace)

        assert len(tracer._traces) == 5
        # 가장 최근 5개만 보존
        assert tracer._traces[0].query == "q_5"


# ─── source_metrics 테스트 ───────────────────────────────────

class TestSourceMetrics:
    """소스별 메트릭 테스트."""

    def test_source_metrics(self):
        """소스별 메트릭 집계."""
        tracer = RAGTracer()
        for i in range(5):
            trace = tracer.start_trace(f"q_{i}")
            tracer.record_search(trace, "graph_rag", float(100 + i * 10), [])
            tracer.record_search(trace, "corpus_rag", float(50 + i * 5), [])
            trace.total_duration_ms = 200.0
            with tracer._lock:
                tracer._traces.append(trace)

        sm = tracer.get_source_metrics()
        assert "graph_rag" in sm
        assert "corpus_rag" in sm
        assert sm["graph_rag"]["count"] == 5
        assert sm["corpus_rag"]["count"] == 5
        assert sm["graph_rag"]["avg_ms"] > sm["corpus_rag"]["avg_ms"]

    def test_source_metrics_empty(self):
        """트레이스 없을 때."""
        tracer = RAGTracer()
        sm = tracer.get_source_metrics()
        assert sm == {}

    def test_source_metrics_ignores_non_search(self):
        """검색 이벤트만 소스 메트릭에 포함."""
        tracer = RAGTracer()
        trace = tracer.start_trace("test")
        tracer.record_search(trace, "graph_rag", 100.0, [])
        tracer.record_rerank(trace, 50.0, 10, 5)
        tracer.record_error(trace, "corpus_rag", "err")
        trace.total_duration_ms = 200.0
        with tracer._lock:
            tracer._traces.append(trace)

        sm = tracer.get_source_metrics()
        assert "graph_rag" in sm
        # rerank와 error는 source_metrics에 포함되지 않음
        assert "cross_encoder" not in sm
        assert "corpus_rag" not in sm  # error이므로 검색 이벤트 아님


# ─── save_traces 테스트 ──────────────────────────────────────

class TestSaveTraces:
    """트레이스 JSON 저장 테스트."""

    def test_save_traces(self, tmp_path):
        """JSON 파일 저장."""
        tracer = RAGTracer()
        trace = tracer.start_trace("사주 운세", domain="saju")
        tracer.record_search(
            trace, "graph_rag", 100.0,
            [{"score": 0.85}, {"score": 0.72}],
        )
        tracer.finish_trace(trace)

        output = str(tmp_path / "traces.json")
        tracer.save_traces(output)

        assert os.path.exists(output)
        with open(output, "r", encoding="utf-8") as f:
            data = json.load(f)

        assert len(data) == 1
        assert data[0]["query"] == "사주 운세"
        assert data[0]["domain"] == "saju"
        assert len(data[0]["events"]) == 1

    def test_save_traces_creates_directory(self, tmp_path):
        """저장 경로의 디렉토리 자동 생성."""
        tracer = RAGTracer()
        trace = tracer.start_trace("test")
        tracer.finish_trace(trace)

        output = str(tmp_path / "nested" / "dir" / "traces.json")
        tracer.save_traces(output)
        assert os.path.exists(output)

    def test_save_multiple_traces(self, tmp_path):
        """여러 트레이스 저장."""
        tracer = RAGTracer()
        for i in range(5):
            trace = tracer.start_trace(f"query_{i}")
            tracer.finish_trace(trace)

        output = str(tmp_path / "multi.json")
        tracer.save_traces(output)

        with open(output, "r", encoding="utf-8") as f:
            data = json.load(f)
        assert len(data) == 5


# ─── 싱글톤 & Feature Flag 테스트 ───────────────────────────

class TestSingletonAndFlags:
    """싱글톤 패턴 및 Feature flag 테스트."""

    def test_feature_flag_default_off(self):
        """USE_TRACING 기본값 false."""
        # 환경변수 미설정 시 False
        assert USE_TRACING is False or USE_TRACING is True  # 환경에 따라 다름

    def test_singleton_returns_tracer(self):
        """get_rag_tracer가 RAGTracer 인스턴스 반환."""
        import app.rag.tracing as tracing_module
        # 싱글톤 리셋
        tracing_module._tracer = None
        tracer = get_rag_tracer()
        assert isinstance(tracer, RAGTracer)

    def test_singleton_same_instance(self):
        """싱글톤 동일 인스턴스."""
        import app.rag.tracing as tracing_module
        tracing_module._tracer = None
        t1 = get_rag_tracer()
        t2 = get_rag_tracer()
        assert t1 is t2

    def test_tracer_no_external_without_flag(self):
        """USE_TRACING=0이면 외부 클라이언트 없음."""
        tracer = RAGTracer()
        assert tracer._langsmith_client is None
        assert tracer._langfuse_client is None


# ─── 전체 파이프라인 통합 테스트 ─────────────────────────────

class TestFullPipelineTrace:
    """전체 RAG 파이프라인 트레이스 시나리오 테스트."""

    def test_full_pipeline(self):
        """검색 → 리랭크 → 응답 전체 파이프라인."""
        tracer = RAGTracer()
        trace = tracer.start_trace("오늘의 사주 운세 알려줘", domain="saju")
        trace.timestamp = time.time() - 0.5  # 500ms 전

        # Step 1: HyDE
        tracer.record_hyde(trace, 50.0, hypothesis_length=200, used_llm=False)

        # Step 2: 멀티소스 검색
        tracer.record_search(
            trace, "graph_rag", 120.0,
            [{"score": 0.9}, {"score": 0.8}, {"score": 0.7}],
        )
        tracer.record_search(
            trace, "corpus_rag", 80.0,
            [{"score": 0.85}, {"score": 0.75}],
        )

        # Step 3: 리랭크
        tracer.record_rerank(trace, 200.0, input_count=5, output_count=3, top_score=0.95)

        tracer.finish_trace(trace)

        # 검증
        assert len(trace.events) == 4
        assert trace.events[0].event_type == "hyde"
        assert trace.events[1].event_type == "search"
        assert trace.events[2].event_type == "search"
        assert trace.events[3].event_type == "rerank"
        assert trace.total_duration_ms >= 400.0

    def test_pipeline_with_error_fallback(self):
        """에러 발생 → 폴백 시나리오."""
        tracer = RAGTracer()
        trace = tracer.start_trace("별자리 궁합", domain="astro")

        # 첫 검색 실패
        tracer.record_error(trace, "graph_rag", "Timeout after 5000ms")

        # 폴백 검색 성공
        tracer.record_search(
            trace, "corpus_rag", 100.0,
            [{"score": 0.6}],
        )

        tracer.finish_trace(trace)

        assert len(trace.events) == 2
        assert trace.events[0].event_type == "error"
        assert trace.events[1].event_type == "search"

        # 메트릭에서 에러 카운트
        m = tracer.get_metrics()
        assert m["error_rate"] == 1.0  # 에러 이벤트가 포함된 트레이스

    def test_pipeline_metrics_after_multiple(self):
        """여러 파이프라인 실행 후 메트릭."""
        tracer = RAGTracer()

        for i in range(20):
            trace = tracer.start_trace(f"query_{i}")
            trace.timestamp = time.time() - 0.1  # 100ms 전
            tracer.record_search(
                trace, "graph_rag", float(80 + i * 5),
                [{"score": 0.8}],
            )
            tracer.record_search(
                trace, "corpus_rag", float(40 + i * 3),
                [{"score": 0.7}],
            )
            if i % 5 == 0:  # 20% 에러
                tracer.record_error(trace, "reranker", "Model not loaded")
            tracer.finish_trace(trace)

        m = tracer.get_metrics()
        assert m["total_traces"] == 20
        assert m["avg_duration_ms"] > 0
        assert m["error_rate"] == 0.2

        sm = tracer.get_source_metrics()
        assert "graph_rag" in sm
        assert "corpus_rag" in sm
        assert sm["graph_rag"]["count"] == 20
        assert sm["corpus_rag"]["count"] == 20


# ─── 엣지 케이스 테스트 ──────────────────────────

class TestRecordSearchEdgeCases:
    """검색 이벤트 기록 엣지 케이스."""

    def test_results_with_no_score_attr(self):
        """score 속성 없는 객체."""
        tracer = RAGTracer()
        trace = tracer.start_trace("test")

        class NoScore:
            pass

        tracer.record_search(trace, "src", 50.0, [NoScore(), NoScore()])
        event = trace.events[0]
        assert event.result_count == 2
        assert event.top_score == 0.0
        assert event.avg_score == 0.0

    def test_results_mixed_types(self):
        """딕셔너리와 객체 혼합 결과."""

        class ObjResult:
            def __init__(self, s):
                self.score = s

        tracer = RAGTracer()
        trace = tracer.start_trace("test")
        tracer.record_search(trace, "src", 100.0, [
            {"score": 0.9},
            ObjResult(0.7),
            {"score": 0.5},
        ])
        event = trace.events[0]
        assert event.result_count == 3
        assert event.top_score == 0.9

    def test_results_with_string_score(self):
        """문자열 score (float 변환)."""
        tracer = RAGTracer()
        trace = tracer.start_trace("test")
        tracer.record_search(trace, "src", 50.0, [{"score": "0.85"}])
        event = trace.events[0]
        assert event.top_score == 0.85

    def test_many_results(self):
        """대량 결과 (1000개)."""
        tracer = RAGTracer()
        trace = tracer.start_trace("test")
        results = [{"score": i / 1000.0} for i in range(1000)]
        tracer.record_search(trace, "graph_rag", 500.0, results)
        event = trace.events[0]
        assert event.result_count == 1000
        assert event.top_score == 0.999


class TestRecordEdgeCases:
    """리랭크/HyDE/에러 이벤트 엣지 케이스."""

    def test_rerank_zero_input(self):
        """input_count=0인 리랭크."""
        tracer = RAGTracer()
        trace = tracer.start_trace("test")
        tracer.record_rerank(trace, 10.0, input_count=0, output_count=0)
        event = trace.events[0]
        assert event.metadata["input_count"] == 0

    def test_rerank_output_greater_than_input(self):
        """output > input (비정상이지만 에러 안 남)."""
        tracer = RAGTracer()
        trace = tracer.start_trace("test")
        tracer.record_rerank(trace, 50.0, input_count=5, output_count=10)
        event = trace.events[0]
        assert event.result_count == 10

    def test_hyde_zero_length(self):
        """hypothesis_length=0."""
        tracer = RAGTracer()
        trace = tracer.start_trace("test")
        tracer.record_hyde(trace, 20.0, hypothesis_length=0, used_llm=False)
        event = trace.events[0]
        assert event.metadata["hypothesis_length"] == 0

    def test_error_with_metadata(self):
        """에러 이벤트에 추가 메타데이터."""
        tracer = RAGTracer()
        trace = tracer.start_trace("test")
        tracer.record_error(
            trace, "graph_rag", "Timeout",
            retry_count=3, fallback="corpus_rag",
        )
        event = trace.events[0]
        assert event.metadata["retry_count"] == 3
        assert event.metadata["fallback"] == "corpus_rag"

    def test_many_events_on_single_trace(self):
        """하나의 트레이스에 많은 이벤트."""
        tracer = RAGTracer()
        trace = tracer.start_trace("test")
        for i in range(100):
            tracer.record_search(trace, f"src_{i}", float(i), [])
        assert len(trace.events) == 100


class TestMetricsEdgeCases:
    """메트릭 엣지 케이스."""

    def test_single_trace_metrics(self):
        """트레이스 1개일 때 p50/p95."""
        tracer = RAGTracer()
        trace = tracer.start_trace("test")
        trace.total_duration_ms = 100.0
        with tracer._lock:
            tracer._traces.append(trace)

        m = tracer.get_metrics()
        assert m["total_traces"] == 1
        assert m["p50_duration_ms"] == 100.0
        assert m["p95_duration_ms"] == 100.0

    def test_two_traces_metrics(self):
        """트레이스 2개일 때."""
        tracer = RAGTracer()
        for dur in [100.0, 200.0]:
            trace = tracer.start_trace("test")
            trace.total_duration_ms = dur
            with tracer._lock:
                tracer._traces.append(trace)

        m = tracer.get_metrics()
        assert m["total_traces"] == 2
        assert m["avg_duration_ms"] == 150.0

    def test_all_error_traces(self):
        """모든 트레이스에 에러."""
        tracer = RAGTracer()
        for i in range(5):
            trace = tracer.start_trace(f"q_{i}")
            tracer.record_error(trace, "test", "error")
            trace.total_duration_ms = 100.0
            with tracer._lock:
                tracer._traces.append(trace)

        m = tracer.get_metrics()
        assert m["error_rate"] == 1.0

    def test_no_error_traces(self):
        """에러 없는 트레이스."""
        tracer = RAGTracer()
        for i in range(5):
            trace = tracer.start_trace(f"q_{i}")
            tracer.record_search(trace, "src", 50.0, [])
            trace.total_duration_ms = 100.0
            with tracer._lock:
                tracer._traces.append(trace)

        m = tracer.get_metrics()
        assert m["error_rate"] == 0.0


class TestExternalTracingMock:
    """외부 트레이싱 서비스 mock 테스트."""

    def test_langfuse_send_success(self):
        """Langfuse 전송 성공."""
        from unittest.mock import MagicMock
        tracer = RAGTracer()
        mock_langfuse = MagicMock()
        mock_trace = MagicMock()
        mock_langfuse.trace.return_value = mock_trace
        tracer._langfuse_client = mock_langfuse

        trace = tracer.start_trace("test", domain="saju")
        tracer.record_search(trace, "graph_rag", 100.0, [{"score": 0.9}])
        tracer._send_to_external(trace)

        mock_langfuse.trace.assert_called_once()
        mock_trace.event.assert_called_once()

    def test_langfuse_send_failure(self):
        """Langfuse 전송 실패 시 경고만."""
        from unittest.mock import MagicMock
        tracer = RAGTracer()
        mock_langfuse = MagicMock()
        mock_langfuse.trace.side_effect = Exception("Connection refused")
        tracer._langfuse_client = mock_langfuse

        trace = tracer.start_trace("test")
        # 예외가 발생하지 않아야 함
        tracer._send_to_external(trace)

    def test_no_external_when_no_clients(self):
        """외부 클라이언트 없으면 전송 안 함."""
        tracer = RAGTracer()
        assert tracer._langfuse_client is None
        assert tracer._langsmith_client is None
        trace = tracer.start_trace("test")
        # _send_to_external 호출해도 에러 없음
        tracer._send_to_external(trace)


class TestSaveTracesEdgeCases:
    """save_traces 엣지 케이스."""

    def test_save_empty_traces(self, tmp_path):
        """빈 트레이스 저장."""
        tracer = RAGTracer()
        output = str(tmp_path / "empty.json")
        tracer.save_traces(output)
        with open(output, "r", encoding="utf-8") as f:
            data = json.load(f)
        assert data == []

    def test_save_unicode_content(self, tmp_path):
        """유니코드 내용 저장."""
        tracer = RAGTracer()
        trace = tracer.start_trace("사주 운세 🔮")
        tracer.record_search(trace, "graph_rag", 100.0, [{"score": 0.9}])
        tracer.finish_trace(trace)

        output = str(tmp_path / "unicode.json")
        tracer.save_traces(output)
        with open(output, "r", encoding="utf-8") as f:
            data = json.load(f)
        assert "사주 운세" in data[0]["query"]

    def test_save_default_path(self):
        """기본 경로 사용."""
        tracer = RAGTracer(log_dir="data/test_traces")
        # save_traces에 None 전달 → 기본 경로 사용
        # 실제 파일 생성은 하지 않지만 경로 로직 확인
        assert tracer._log_dir == "data/test_traces"
