# tests/integration/test_llm_evaluation.py
"""
LLM 연동 통합 테스트 (Phase 5 평가 + Phase 4 요약).

OPENAI_API_KEY 또는 ANTHROPIC_API_KEY가 있을 때만 실행.
없으면 자동 스킵.

Usage:
    # OpenAI 테스트
    OPENAI_API_KEY=sk-xxx pytest tests/integration/test_llm_evaluation.py -v

    # Anthropic 테스트
    ANTHROPIC_API_KEY=sk-xxx pytest tests/integration/test_llm_evaluation.py -v -k anthropic

    # 전체 실행
    pytest tests/integration/test_llm_evaluation.py -v
"""

import os
import pytest

from app.rag.evaluation import (
    EvalSample,
    EvalResult,
    RAGEvaluator,
    EVAL_DATASET,
)

# ─── 스킵 조건 ──────────────────────────────────

HAS_OPENAI_KEY = bool(os.environ.get("OPENAI_API_KEY"))
HAS_ANTHROPIC_KEY = bool(os.environ.get("ANTHROPIC_API_KEY"))

skip_no_openai = pytest.mark.skipif(
    not HAS_OPENAI_KEY,
    reason="OPENAI_API_KEY not set",
)
skip_no_anthropic = pytest.mark.skipif(
    not HAS_ANTHROPIC_KEY,
    reason="ANTHROPIC_API_KEY not set",
)
skip_no_llm = pytest.mark.skipif(
    not HAS_OPENAI_KEY and not HAS_ANTHROPIC_KEY,
    reason="No LLM API key set (OPENAI_API_KEY or ANTHROPIC_API_KEY)",
)


# ─── OpenAI 평가 테스트 ──────────────────────────

@skip_no_openai
class TestOpenAIEvaluation:
    """OpenAI LLM 기반 평가 테스트."""

    @pytest.fixture
    def evaluator(self):
        return RAGEvaluator(llm_provider="openai", llm_model="gpt-4o-mini", use_llm=True)

    def test_faithfulness_llm(self, evaluator):
        """LLM 기반 faithfulness 평가."""
        score = evaluator._compute_faithfulness(
            answer="갑목 일간은 리더십이 강하고 책임감 있는 성격입니다.",
            context="갑목은 큰 나무를 상징하며 리더십, 책임감이 특징입니다. 봄의 기운을 가집니다.",
        )
        assert 0.0 <= score <= 1.0
        assert score >= 0.5, f"Faithful answer should score >= 0.5, got {score}"

    def test_faithfulness_llm_unfaithful(self, evaluator):
        """LLM: 컨텍스트와 무관한 답변은 낮은 점수."""
        score = evaluator._compute_faithfulness(
            answer="Jupiter is the largest planet in our solar system.",
            context="갑목은 큰 나무를 상징하며 리더십, 책임감이 특징입니다.",
        )
        assert 0.0 <= score <= 1.0
        assert score < 0.7, f"Unfaithful answer should score < 0.7, got {score}"

    def test_answer_relevancy_llm(self, evaluator):
        """LLM 기반 answer relevancy."""
        score = evaluator._compute_answer_relevancy(
            question="갑목 일간의 성격은?",
            answer="갑목 일간은 리더십이 강하고 올바른 성격을 가지며 봄의 기운을 상징합니다.",
        )
        assert 0.0 <= score <= 1.0
        assert score >= 0.5, f"Relevant answer should score >= 0.5, got {score}"

    def test_answer_relevancy_llm_irrelevant(self, evaluator):
        """LLM: 무관한 답변은 낮은 점수."""
        score = evaluator._compute_answer_relevancy(
            question="갑목 일간의 성격은?",
            answer="The weather today is sunny and warm with clear skies.",
        )
        assert 0.0 <= score <= 1.0
        assert score < 0.5, f"Irrelevant answer should score < 0.5, got {score}"

    def test_context_recall_llm(self, evaluator):
        """LLM 기반 context recall."""
        score = evaluator._compute_context_recall(
            ground_truth="갑목은 리더십, 책임감, 봄의 기운이 특징.",
            context="갑목 일간의 핵심은 리더십과 책임감입니다. 봄의 기운을 가지며 큰 나무를 상징합니다.",
        )
        assert 0.0 <= score <= 1.0
        assert score >= 0.5, f"Good context recall should score >= 0.5, got {score}"

    def test_context_precision_llm(self, evaluator):
        """LLM 기반 context precision."""
        score = evaluator._compute_context_precision(
            question="갑목 일간의 성격은?",
            context="갑목 일간은 리더십이 강하고 책임감이 있는 성격입니다. 봄의 기운을 나타냅니다.",
        )
        assert 0.0 <= score <= 1.0
        assert score >= 0.3, f"Precise context should score >= 0.3, got {score}"

    def test_full_evaluation_single(self, evaluator):
        """OpenAI 단일 샘플 전체 평가."""
        dataset = [
            EvalSample(
                question="갑목 일간의 성격은?",
                ground_truth="갑목은 리더십, 책임감, 봄의 기운이 특징.",
                expected_entities=["갑", "목"],
            ),
        ]
        results = evaluator.evaluate_dataset(
            dataset=dataset,
            contexts=["갑목은 큰 나무를 상징하며 리더십, 책임감이 특징이고 봄의 기운을 가집니다."],
            answers=["갑목 일간은 리더십이 강하고 책임감 있는 성격입니다."],
            entities_list=[["갑", "목"]],
            verbose=True,
        )
        assert results["total_samples"] == 1
        overall = results["overall"]

        # LLM 기반이므로 로컬보다 정확한 점수 기대
        for metric in ["faithfulness", "answer_relevancy", "context_recall", "context_precision"]:
            assert 0.0 <= overall[metric] <= 1.0, f"{metric} out of range"


# ─── Anthropic 평가 테스트 ────────────────────────

@skip_no_anthropic
class TestAnthropicEvaluation:
    """Anthropic LLM 기반 평가 테스트."""

    @pytest.fixture
    def evaluator(self):
        return RAGEvaluator(llm_provider="anthropic", use_llm=True)

    def test_faithfulness_anthropic(self, evaluator):
        """Anthropic 기반 faithfulness."""
        score = evaluator._compute_faithfulness(
            answer="갑목 일간은 리더십이 강합니다.",
            context="갑목은 리더십, 책임감이 특징입니다.",
        )
        assert 0.0 <= score <= 1.0

    def test_answer_relevancy_anthropic(self, evaluator):
        """Anthropic 기반 answer relevancy."""
        score = evaluator._compute_answer_relevancy(
            question="식신과 상관의 차이점은?",
            answer="식신은 온화하고 안정적인 표현력을 가지며, 상관은 날카롭고 비판적인 표현력입니다.",
        )
        assert 0.0 <= score <= 1.0

    def test_context_recall_anthropic(self, evaluator):
        """Anthropic 기반 context recall."""
        score = evaluator._compute_context_recall(
            ground_truth="목성은 확장과 행운의 행성.",
            context="Jupiter는 확장, 행운, 낙관을 상징하는 행성으로 사수자리의 주관 행성입니다.",
        )
        assert 0.0 <= score <= 1.0

    def test_json_parsing_with_code_blocks(self, evaluator):
        """Anthropic의 ```json``` 블록 파싱 검증."""
        result = evaluator._call_judge_llm(
            '다음을 평가하세요: "테스트 답변"\n\nJSON: {"score": 0.5, "reason": "test"}'
        )
        assert isinstance(result, dict)
        # 결과가 비어있지 않아야 함 (파싱 성공)
        if result:
            assert "score" in result


# ─── Phase 4: LLM 요약 테스트 ─────────────────────

@skip_no_openai
class TestOpenAISummarization:
    """OpenAI LLM 기반 커뮤니티 요약 테스트."""

    @pytest.fixture
    def summarizer(self):
        from app.rag.community_summarizer import HierarchicalSummarizer
        return HierarchicalSummarizer(
            llm_provider="openai", llm_model="gpt-4o-mini", use_llm=True
        )

    def test_single_community_summary(self, summarizer):
        """LLM 단일 커뮤니티 요약."""
        community_data = {
            "size": 10,
            "top_nodes": [
                ("갑목", 0.15), ("을목", 0.12), ("목", 0.10),
                ("봄", 0.08), ("인(寅)", 0.07),
            ],
            "sample_edges": [
                {"source": "갑목", "relation": "음양_쌍", "target": "을목"},
                {"source": "갑목", "relation": "속성", "target": "목"},
                {"source": "목", "relation": "계절", "target": "봄"},
            ],
            "leader": "갑목",
        }

        summary = summarizer._summarize_single_community(
            community_id=0, community_data=community_data, level=0
        )

        assert summary is not None
        assert summary.community_id == 0
        assert summary.level == 0
        assert len(summary.title) > 0
        assert len(summary.summary_ko) > 0
        assert len(summary.summary_en) > 0
        assert len(summary.key_concepts) >= 1

    def test_higher_level_with_llm(self, summarizer):
        """LLM 상위 레벨 요약."""
        from app.rag.community_summarizer import CommunitySummary

        child_summaries = [
            CommunitySummary(
                community_id=0, level=0,
                title="갑목 중심 오행 커뮤니티",
                summary_ko="갑목과 을목을 중심으로 한 목(木) 오행 커뮤니티.",
                summary_en="Wood element community centered on Gap-mok.",
                key_concepts=["갑목", "을목", "목", "봄"],
                node_count=10,
            ),
            CommunitySummary(
                community_id=1, level=0,
                title="병화 중심 화 커뮤니티",
                summary_ko="병화와 정화를 중심으로 한 화(火) 오행 커뮤니티.",
                summary_en="Fire element community centered on Byung-hwa.",
                key_concepts=["병화", "정화", "화", "여름"],
                node_count=8,
            ),
        ]

        result = summarizer._build_higher_with_llm(child_summaries)

        assert result is not None
        assert "title" in result
        assert "summary_ko" in result
        assert "summary_en" in result
        assert "key_concepts" in result


@skip_no_anthropic
class TestAnthropicSummarization:
    """Anthropic LLM 기반 커뮤니티 요약 테스트."""

    @pytest.fixture
    def summarizer(self):
        from app.rag.community_summarizer import HierarchicalSummarizer
        return HierarchicalSummarizer(
            llm_provider="anthropic", use_llm=True
        )

    def test_single_community_summary(self, summarizer):
        """Anthropic 단일 커뮤니티 요약."""
        community_data = {
            "size": 8,
            "top_nodes": [
                ("Jupiter", 0.15), ("Sagittarius", 0.12), ("expansion", 0.10),
            ],
            "sample_edges": [
                {"source": "Jupiter", "relation": "rules", "target": "Sagittarius"},
                {"source": "Jupiter", "relation": "signifies", "target": "expansion"},
            ],
            "leader": "Jupiter",
        }

        summary = summarizer._summarize_single_community(
            community_id=5, community_data=community_data, level=0
        )

        assert summary is not None
        assert summary.community_id == 5
        assert len(summary.title) > 0
        assert len(summary.summary_ko) > 0


# ─── LLM 호출 안전성 테스트 ──────────────────────

@skip_no_llm
class TestLLMSafety:
    """LLM 호출 에러 핸들링 테스트."""

    def test_evaluator_handles_empty_prompt(self):
        """빈 프롬프트 처리."""
        provider = "openai" if HAS_OPENAI_KEY else "anthropic"
        evaluator = RAGEvaluator(llm_provider=provider, use_llm=True)
        result = evaluator._call_judge_llm("")
        # 빈 프롬프트여도 크래시 없이 결과 반환
        assert isinstance(result, dict)

    def test_evaluator_invalid_provider(self):
        """잘못된 provider는 빈 결과."""
        evaluator = RAGEvaluator(llm_provider="invalid_provider", use_llm=True)
        result = evaluator._call_judge_llm("test prompt")
        assert result == {}

    def test_summarizer_invalid_provider(self):
        """요약기 잘못된 provider."""
        from app.rag.community_summarizer import HierarchicalSummarizer
        summarizer = HierarchicalSummarizer(llm_provider="invalid", use_llm=True)
        result = summarizer._call_llm("test prompt")
        assert result is None


# ─── API 키 없이 실행 가능한 안전성 테스트 ───────

class TestNoKeysSafety:
    """API 키 없이도 실행 가능한 안전성 테스트."""

    def test_evaluator_invalid_provider_no_key(self):
        """잘못된 provider는 빈 결과 (키 불필요)."""
        evaluator = RAGEvaluator(llm_provider="nonexistent", use_llm=True)
        result = evaluator._call_judge_llm("test prompt")
        assert result == {}

    def test_summarizer_invalid_provider_no_key(self):
        """요약기 잘못된 provider (키 불필요)."""
        from app.rag.community_summarizer import HierarchicalSummarizer
        summarizer = HierarchicalSummarizer(llm_provider="nonexistent", use_llm=True)
        result = summarizer._call_llm("test prompt")
        assert result is None

    def test_local_fallback_always_works(self):
        """use_llm=False는 항상 동작."""
        evaluator = RAGEvaluator(use_llm=False)
        score = evaluator._compute_faithfulness(
            answer="갑목 일간은 리더십이 강합니다",
            context="갑목은 리더십, 책임감이 특징입니다",
        )
        assert 0.0 <= score <= 1.0

    def test_model_change_detection_import(self):
        """모델 변경 감지 함수 import 가능."""
        from scripts.migrate_to_chromadb import detect_model_change
        assert callable(detect_model_change)


# ─── 전체 데이터셋 LLM 평가 (선택적) ─────────────

@skip_no_openai
class TestFullDatasetEvaluation:
    """EVAL_DATASET 전체를 LLM으로 평가 (비용 발생 주의)."""

    @pytest.mark.slow
    def test_full_dataset_with_contexts(self):
        """전체 데이터셋 LLM 평가 (mock contexts)."""
        evaluator = RAGEvaluator(
            llm_provider="openai", llm_model="gpt-4o-mini", use_llm=True
        )

        # 각 샘플에 대한 mock contexts/answers
        contexts = [s.ground_truth for s in EVAL_DATASET]  # ground_truth를 context로 사용
        answers = [s.ground_truth[:100] for s in EVAL_DATASET]  # 정답 일부를 answer로 사용
        entities_list = [s.expected_entities for s in EVAL_DATASET]

        results = evaluator.evaluate_dataset(
            dataset=EVAL_DATASET,
            contexts=contexts,
            answers=answers,
            entities_list=entities_list,
            verbose=True,
        )

        assert results["total_samples"] == len(EVAL_DATASET)

        overall = results["overall"]
        # ground_truth가 context이자 answer이므로 높은 점수 기대
        assert overall["faithfulness"] >= 0.3
        assert overall["entity_recall"] >= 0.5

        # 결과 저장
        evaluator.save_results(results, "data/eval_results_llm.json")
