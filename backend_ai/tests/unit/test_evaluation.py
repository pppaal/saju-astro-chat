# tests/unit/test_evaluation.py
"""
RAG 평가 엔진 유닛 테스트 (Phase 5).

LLM 없이 로컬 키워드 기반 평가 테스트.
"""

import pytest

from app.rag.evaluation import (
    EvalSample,
    EvalResult,
    RAGEvaluator,
    EVAL_DATASET,
)


@pytest.fixture
def evaluator():
    """LLM 비활성 상태의 평가기."""
    return RAGEvaluator(use_llm=False)


# ─── 데이터클래스 테스트 ──────────────────────

class TestEvalSample:
    """EvalSample 데이터클래스 테스트."""

    def test_basic_creation(self):
        """기본 생성."""
        s = EvalSample(
            question="갑목 일간의 성격은?",
            ground_truth="갑목은 리더십이 특징.",
            expected_entities=["갑", "목"],
            expected_domains=["saju"],
        )
        assert s.question == "갑목 일간의 성격은?"
        assert len(s.expected_entities) == 2
        assert s.theme == "life_path"
        assert s.locale == "ko"

    def test_default_values(self):
        """기본값 확인."""
        s = EvalSample(question="test", ground_truth="truth")
        assert s.expected_entities == []
        assert s.expected_domains == []
        assert s.facts == {}

    def test_with_facts(self):
        """facts 포함 생성."""
        s = EvalSample(
            question="test",
            ground_truth="truth",
            facts={"dayMaster": "갑목"},
        )
        assert s.facts["dayMaster"] == "갑목"


class TestEvalResult:
    """EvalResult 데이터클래스 테스트."""

    def test_basic_creation(self):
        """기본 생성."""
        r = EvalResult(
            question="test",
            ground_truth="truth",
            retrieved_context="context",
            generated_answer="answer",
        )
        assert r.faithfulness == 0.0
        assert r.answer_relevancy == 0.0
        assert r.context_recall == 0.0
        assert r.context_precision == 0.0
        assert r.entity_recall == 0.0
        assert r.latency_ms == 0.0


# ─── 내장 데이터셋 테스트 ────────────────────

class TestEvalDataset:
    """내장 평가 데이터셋 테스트."""

    def test_dataset_exists(self):
        """데이터셋이 비어있지 않아야 한다."""
        assert len(EVAL_DATASET) > 0

    def test_dataset_has_required_fields(self):
        """각 샘플에 필수 필드가 있어야 한다."""
        for sample in EVAL_DATASET:
            assert sample.question, "question is empty"
            assert sample.ground_truth, "ground_truth is empty"
            assert sample.theme, "theme is empty"

    def test_dataset_domains(self):
        """다양한 도메인이 포함되어야 한다."""
        all_domains = set()
        for sample in EVAL_DATASET:
            all_domains.update(sample.expected_domains)
        assert "saju" in all_domains
        assert "astro" in all_domains

    def test_dataset_count(self):
        """데이터셋 크기."""
        assert len(EVAL_DATASET) >= 7


# ─── Entity Recall 테스트 ────────────────────

class TestEntityRecall:
    """엔티티 리콜 지표 테스트."""

    def test_perfect_recall(self, evaluator):
        """모든 엔티티 추출 시 1.0."""
        score = evaluator._compute_entity_recall(
            expected=["갑", "목"],
            extracted=["갑", "목", "화"],
        )
        assert score == 1.0

    def test_partial_recall(self, evaluator):
        """부분 추출."""
        score = evaluator._compute_entity_recall(
            expected=["갑", "목", "화"],
            extracted=["갑"],
        )
        assert abs(score - 1 / 3) < 0.01

    def test_zero_recall(self, evaluator):
        """추출 실패."""
        score = evaluator._compute_entity_recall(
            expected=["갑", "목"],
            extracted=["화", "토"],
        )
        assert score == 0.0

    def test_empty_expected(self, evaluator):
        """기대 엔티티 없으면 1.0."""
        score = evaluator._compute_entity_recall(
            expected=[],
            extracted=["갑"],
        )
        assert score == 1.0

    def test_empty_extracted(self, evaluator):
        """추출 결과 없으면 0.0."""
        score = evaluator._compute_entity_recall(
            expected=["갑"],
            extracted=[],
        )
        assert score == 0.0

    def test_case_insensitive(self, evaluator):
        """대소문자 무시."""
        score = evaluator._compute_entity_recall(
            expected=["Jupiter", "Saturn"],
            extracted=["jupiter", "saturn"],
        )
        assert score == 1.0

    def test_partial_match(self, evaluator):
        """부분 매칭 (포함 관계)."""
        score = evaluator._compute_entity_recall(
            expected=["Sun"],
            extracted=["Sun in Leo"],
        )
        assert score == 1.0


# ─── Context Recall 테스트 (로컬) ────────────

class TestContextRecallLocal:
    """로컬 키워드 기반 context recall 테스트."""

    def test_high_recall(self, evaluator):
        """많은 키워드 매칭 시 높은 recall."""
        score = evaluator._compute_context_recall(
            ground_truth="갑목은 리더십, 책임감, 봄의 기운을 가짐",
            context="갑목 일간은 리더십이 뛰어나고 책임감 있는 성격이며 봄의 기운을 상징",
        )
        assert score >= 0.4

    def test_low_recall(self, evaluator):
        """매칭 적으면 낮은 recall."""
        score = evaluator._compute_context_recall(
            ground_truth="갑목은 리더십, 책임감, 봄의 기운을 가짐",
            context="오행은 다섯 가지 에너지 순환 체계입니다",
        )
        assert score < 0.5

    def test_empty_context(self, evaluator):
        """빈 컨텍스트."""
        score = evaluator._compute_context_recall(
            ground_truth="test",
            context="",
        )
        assert score == 0.0

    def test_empty_ground_truth(self, evaluator):
        """빈 ground truth."""
        score = evaluator._compute_context_recall(
            ground_truth="",
            context="test",
        )
        assert score == 0.0


# ─── Faithfulness 테스트 (로컬) ──────────────

class TestFaithfulnessLocal:
    """로컬 키워드 기반 faithfulness 테스트."""

    def test_faithful_answer(self, evaluator):
        """컨텍스트 기반 답변 시 높은 점수."""
        score = evaluator._compute_faithfulness(
            answer="갑목 일간은 리더십이 강하고 책임감이 있는 성격입니다",
            context="갑목 일간의 특징은 리더십이 뛰어나고 책임감 있고 올바른 성격입니다",
        )
        assert score >= 0.3

    def test_unfaithful_answer(self, evaluator):
        """컨텍스트와 무관한 답변 시 낮은 점수."""
        score = evaluator._compute_faithfulness(
            answer="Jupiter is in Sagittarius with expansive energy",
            context="갑목 일간의 특징은 리더십, 책임감, 올바른 성격입니다",
        )
        assert score < 0.5

    def test_empty_answer(self, evaluator):
        """빈 답변."""
        score = evaluator._compute_faithfulness(
            answer="",
            context="test context",
        )
        assert score == 0.0

    def test_empty_context(self, evaluator):
        """빈 컨텍스트."""
        score = evaluator._compute_faithfulness(
            answer="test answer",
            context="",
        )
        assert score == 0.0


# ─── Answer Relevancy 테스트 (로컬) ──────────

class TestAnswerRelevancyLocal:
    """로컬 키워드 기반 answer relevancy 테스트."""

    def test_relevant_answer(self, evaluator):
        """관련 있는 답변."""
        score = evaluator._compute_answer_relevancy(
            question="갑목 일간의 성격은?",
            answer="갑목 일간은 리더십이 강하고 책임감 있는 성격입니다",
        )
        assert score > 0.3

    def test_irrelevant_answer(self, evaluator):
        """관련 없는 답변."""
        score = evaluator._compute_answer_relevancy(
            question="갑목 일간의 성격은?",
            answer="The weather is sunny today and very beautiful",
        )
        assert score < 0.3

    def test_empty_answer(self, evaluator):
        """빈 답변."""
        score = evaluator._compute_answer_relevancy(
            question="test question",
            answer="",
        )
        assert score == 0.0


# ─── Context Precision 테스트 (로컬) ─────────

class TestContextPrecisionLocal:
    """로컬 키워드 기반 context precision 테스트."""

    def test_precise_context(self, evaluator):
        """질문 관련 컨텍스트."""
        score = evaluator._compute_context_precision(
            question="갑목 일간의 성격은?",
            context="갑목 일간 성격 특성 리더십",
        )
        assert score >= 0.2

    def test_empty_context(self, evaluator):
        """빈 컨텍스트."""
        score = evaluator._compute_context_precision(
            question="test",
            context="",
        )
        assert score == 0.0


# ─── 토크나이저 테스트 ───────────────────────

class TestTokenizer:
    """토크나이저 테스트."""

    def test_korean_tokenize(self, evaluator):
        """한국어 토크나이제이션."""
        tokens = evaluator._tokenize("갑목 일간의 성격은?")
        assert "갑목" in tokens
        assert "일간의" in tokens or "일간" in tokens

    def test_english_tokenize(self, evaluator):
        """영어 토크나이제이션."""
        tokens = evaluator._tokenize("Jupiter in Sagittarius")
        assert "jupiter" in tokens
        assert "sagittarius" in tokens

    def test_mixed_tokenize(self, evaluator):
        """한영 혼합 토크나이제이션."""
        tokens = evaluator._tokenize("갑목과 Jupiter의 관계")
        assert "갑목과" in tokens or "갑목" in tokens
        assert "jupiter" in tokens

    def test_short_words_filtered(self, evaluator):
        """1글자는 필터링."""
        tokens = evaluator._tokenize("I am a big test")
        # 'I', 'a' 등 1글자 제외
        for t in tokens:
            assert len(t) >= 2


# ─── 전체 평가 실행 테스트 ───────────────────

class TestEvaluateDataset:
    """전체 평가 실행 테스트."""

    def test_evaluate_with_contexts(self, evaluator):
        """컨텍스트와 함께 평가 실행."""
        dataset = [
            EvalSample(
                question="갑목의 특징은?",
                ground_truth="갑목은 리더십과 책임감이 특징",
                expected_entities=["갑"],
            ),
        ]
        results = evaluator.evaluate_dataset(
            dataset=dataset,
            contexts=["갑목 일간은 리더십이 강하고 책임감이 있다"],
            answers=["갑목은 리더십이 강한 일간입니다"],
            entities_list=[["갑", "목"]],
            verbose=False,
        )
        assert results["total_samples"] == 1
        assert "overall" in results
        assert results["overall"]["entity_recall"] == 1.0

    def test_evaluate_empty_dataset(self, evaluator):
        """빈 데이터셋."""
        results = evaluator.evaluate_dataset(
            dataset=[],
            verbose=False,
        )
        assert results["total_samples"] == 0
        assert results["overall"]["faithfulness"] == 0.0

    def test_evaluate_multiple_samples(self, evaluator):
        """다중 샘플 평가."""
        dataset = [
            EvalSample(
                question="갑목의 특징은?",
                ground_truth="갑목은 리더십이 특징",
                expected_entities=["갑"],
            ),
            EvalSample(
                question="Jupiter의 특성은?",
                ground_truth="Jupiter는 확장과 행운의 행성",
                expected_entities=["Jupiter"],
            ),
        ]
        results = evaluator.evaluate_dataset(
            dataset=dataset,
            contexts=[
                "갑목은 리더십이 강합니다",
                "Jupiter is the planet of expansion",
            ],
            answers=[
                "갑목 일간은 리더십이 특징입니다",
                "Jupiter represents expansion and luck",
            ],
            entities_list=[["갑"], ["Jupiter"]],
            verbose=False,
        )
        assert results["total_samples"] == 2
        assert len(results["per_sample"]) == 2
        assert results["overall"]["entity_recall"] == 1.0

    def test_result_has_timestamp(self, evaluator):
        """결과에 타임스탬프 포함."""
        results = evaluator.evaluate_dataset(
            dataset=[
                EvalSample(question="test", ground_truth="truth"),
            ],
            verbose=False,
        )
        assert "timestamp" in results

    def test_metrics_in_range(self, evaluator):
        """모든 지표가 0-1 범위."""
        dataset = [
            EvalSample(
                question="갑목의 특징은?",
                ground_truth="갑목은 리더십이 특징",
                expected_entities=["갑"],
            ),
        ]
        results = evaluator.evaluate_dataset(
            dataset=dataset,
            contexts=["갑목 리더십"],
            answers=["갑목은 리더십"],
            entities_list=[["갑"]],
            verbose=False,
        )
        overall = results["overall"]
        for metric, value in overall.items():
            if metric != "avg_latency_ms":
                assert 0.0 <= value <= 1.0, f"{metric} = {value} out of range"


# ─── Aggregate 테스트 ────────────────────────

class TestAggregateResults:
    """결과 집계 테스트."""

    def test_aggregate_empty(self, evaluator):
        """빈 결과 집계."""
        agg = evaluator._aggregate_results([])
        assert agg["faithfulness"] == 0.0

    def test_aggregate_single(self, evaluator):
        """단일 결과 집계."""
        r = EvalResult(
            question="test",
            ground_truth="truth",
            retrieved_context="ctx",
            generated_answer="ans",
            faithfulness=0.8,
            answer_relevancy=0.9,
            context_recall=0.7,
            context_precision=0.6,
            entity_recall=1.0,
            latency_ms=50.0,
        )
        agg = evaluator._aggregate_results([r])
        assert agg["faithfulness"] == 0.8
        assert agg["entity_recall"] == 1.0

    def test_aggregate_average(self, evaluator):
        """평균 계산."""
        r1 = EvalResult(
            question="q1", ground_truth="g1",
            retrieved_context="c1", generated_answer="a1",
            faithfulness=0.6, entity_recall=1.0,
        )
        r2 = EvalResult(
            question="q2", ground_truth="g2",
            retrieved_context="c2", generated_answer="a2",
            faithfulness=0.8, entity_recall=0.5,
        )
        agg = evaluator._aggregate_results([r1, r2])
        assert abs(agg["faithfulness"] - 0.7) < 0.01
        assert abs(agg["entity_recall"] - 0.75) < 0.01
