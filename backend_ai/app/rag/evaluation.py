# app/rag/evaluation.py
"""
RAG 시스템 정량 평가 엔진 (Phase 5)
======================================
RAGAS 프레임워크의 핵심 지표를 구현.

Metrics:
1. Faithfulness: 답변이 검색 컨텍스트에 기반하는가
2. Answer Relevancy: 답변이 질문에 관련되는가
3. Context Recall: ground truth 정보를 얼마나 검색했는가
4. Context Precision: 검색 결과 중 관련 있는 비율
5. Entity Recall: 기대 엔티티를 얼마나 추출했는가

LLM 비활성 시 로컬 키워드 기반 평가 fallback 제공.
"""

import json
import logging
import time
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field, asdict
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class EvalSample:
    """평가 데이터 샘플.

    ground_truth: 전문가가 작성한 정답 컨텍스트
    expected_entities: 추출되어야 하는 엔티티 목록
    expected_domains: 검색되어야 하는 도메인
    """
    question: str
    ground_truth: str
    expected_entities: List[str] = field(default_factory=list)
    expected_domains: List[str] = field(default_factory=list)
    theme: str = "life_path"
    locale: str = "ko"
    facts: Dict = field(default_factory=dict)


@dataclass
class EvalResult:
    """평가 결과."""
    question: str
    ground_truth: str
    retrieved_context: str
    generated_answer: str
    faithfulness: float = 0.0
    answer_relevancy: float = 0.0
    context_recall: float = 0.0
    context_precision: float = 0.0
    entity_recall: float = 0.0
    latency_ms: float = 0.0


# ─── 평가 데이터셋 ─────────────────────────────────

EVAL_DATASET: List[EvalSample] = [
    # 사주 관련
    EvalSample(
        question="갑목 일간의 성격과 특성은?",
        ground_truth="갑목은 큰 나무를 상징하며, 곧고 올바른 성격, 리더십, 책임감이 특징. 인의예지의 '인'에 해당하며 봄의 기운을 가짐.",
        expected_entities=["갑", "목"],
        expected_domains=["saju"],
        theme="life_path",
        facts={"dayMaster": "갑목"},
    ),
    EvalSample(
        question="식신과 상관의 차이점은?",
        ground_truth="식신은 온화하고 안정적인 표현력, 요리/예술 관련. 상관은 날카롭고 비판적인 표현력, 혁신/반항 관련. 둘 다 일간이 생하는 오행이지만 음양이 다름.",
        expected_entities=["식신", "상관"],
        expected_domains=["saju"],
        theme="career",
    ),
    EvalSample(
        question="역마살이 있으면 어떤 특징이 있나?",
        ground_truth="역마살은 움직임, 이동, 변화가 많은 삶을 의미. 해외 생활, 출장, 이사가 잦고 한 곳에 정착하기 어려움. 긍정적으로는 활동적이고 진취적.",
        expected_entities=["역마"],
        expected_domains=["saju"],
        theme="life_path",
    ),

    # 점성술 관련
    EvalSample(
        question="Jupiter in Sagittarius는 어떤 의미인가?",
        ground_truth="목성이 사수자리에 있으면 본궁(domicile)에 위치하여 매우 강력. 확장, 낙관, 철학, 해외 경험, 고등 교육에 대한 열정이 극대화됨.",
        expected_entities=["Jupiter", "Sagittarius"],
        expected_domains=["astro"],
        theme="life_path",
    ),
    EvalSample(
        question="Sun square Moon 애스팩트의 의미는?",
        ground_truth="태양과 달의 스퀘어는 내면의 갈등, 의식과 무의식의 긴장. 자아 표현과 감정적 욕구 사이의 불일치. 성장의 동력이 될 수 있음.",
        expected_entities=["Sun", "Moon", "Square"],
        expected_domains=["astro"],
        theme="life_path",
    ),

    # 타로 관련
    EvalSample(
        question="The Tower 카드의 해석은?",
        ground_truth="탑 카드는 갑작스러운 변화, 파괴, 기존 구조의 붕괴를 의미. 정방향은 필요한 변화, 역방향은 변화에 대한 저항. 화성과 연결.",
        expected_entities=["The Tower"],
        expected_domains=["tarot"],
        theme="life_path",
    ),

    # 크로스 분석
    EvalSample(
        question="사주의 갑목과 점성술의 목성은 어떤 관련이 있나?",
        ground_truth="갑목과 목성은 모두 확장, 성장, 리더십의 에너지. 갑목은 동양 사상의 봄/시작, 목성은 서양 점성술의 확장/행운. 공통적으로 성장 지향적.",
        expected_entities=["갑", "목", "Jupiter"],
        expected_domains=["saju", "astro"],
        theme="life_path",
        facts={"dayMaster": "갑목"},
    ),

    # 융 심리학 관련
    EvalSample(
        question="그림자(Shadow)의 심리학적 의미는?",
        ground_truth="융의 그림자 개념은 의식에서 억압된 자아의 어두운 면. 그림자 통합은 개성화의 핵심 과정. 그림자를 인식하고 수용하는 것이 심리적 성장.",
        expected_entities=[],
        expected_domains=["corpus"],
        theme="life_path",
    ),

    # ─── 추가 평가 샘플: 형충파해/합화/크로스도메인 ───

    # 형충파해 관련
    EvalSample(
        question="인신충이 있으면 어떤 영향이 있나요?",
        ground_truth="인신충은 인목과 신금의 충돌로 6충 중 가장 격렬. 목금상극으로 교통사고, 수술, 법적 분쟁 위험. 직업 변동이 급격하며 간/폐 건강 주의. 과감한 도전과 경쟁에서 강하지만 안전 최우선.",
        expected_entities=["인", "신", "충"],
        expected_domains=["saju"],
        theme="life_path",
        facts={"branch_relation": "인신충"},
    ),
    EvalSample(
        question="삼형살(인사신)이 사주에 있으면 어떤가?",
        ground_truth="인사신 삼형살은 무은지형으로 은혜를 모르는 형벌. 권력 다툼, 법적 갈등 가능. 간/폐/심장 건강 주의. 법조/의료 분야 적합. 시련을 통해 성장하는 타입.",
        expected_entities=["인", "사", "신", "삼형"],
        expected_domains=["saju"],
        theme="life_path",
    ),

    # 합화오행 관련
    EvalSample(
        question="갑기합토는 어떤 의미인가?",
        ground_truth="갑기합토는 갑목과 기토가 만나 토로 변환되는 천간합. 토가 왕한 계절에 합화 성립. 성격이 부드러워지고 포용력이 생김. 부동산/교육/중재 분야 유리. 다만 추진력이 약해질 수 있음.",
        expected_entities=["갑", "기", "합", "토"],
        expected_domains=["saju"],
        theme="life_path",
        facts={"combination": "갑기합토"},
    ),
    EvalSample(
        question="인오술 삼합은 어떤 에너지인가?",
        ground_truth="인오술 삼합은 화(火)의 삼합으로 가장 강력한 결합. 나무(인)가 불(오)을 피우고 흙(술)이 보존. 리더십, 카리스마, 열정이 극강. 정치/연예/스포츠 분야 성공. 화가 과하면 다혈질 주의.",
        expected_entities=["인", "오", "술", "삼합", "화"],
        expected_domains=["saju"],
        theme="life_path",
    ),

    # 크로스도메인: 타로-사주
    EvalSample(
        question="사주에서 식신이 강한 사람에게 어울리는 타로 카드는?",
        ground_truth="식신은 온화한 표현력과 감성, 음식/예술 관련 재능으로 타로의 Empress(여황제)와 유사. 풍요와 창조의 에너지. 또한 Cups 수트의 감성적 특질과도 연결됨.",
        expected_entities=["식신", "Empress", "Cups"],
        expected_domains=["saju", "tarot"],
        theme="life_path",
    ),

    # 크로스도메인: 사주-점성술 타이밍
    EvalSample(
        question="대운이 바뀌는 시기와 토성 리턴은 어떤 관계가 있나?",
        ground_truth="사주 대운 전환(약 10년 주기)과 첫 번째 토성 리턴(29.5세)이 겹치면 인생 방향이 근본적으로 재설정. 20대의 실험이 끝나고 진짜 인생이 시작되는 시점. 결혼/이직 등 큰 결정의 시기.",
        expected_entities=["대운", "토성", "Saturn"],
        expected_domains=["saju", "astro"],
        theme="life_path",
    ),

    # 크로스도메인: 오행-별자리
    EvalSample(
        question="오행에서 화(火)가 강한 사주와 점성술의 화성 사인(Aries, Leo, Sagittarius)은 어떤 공통점이 있나?",
        ground_truth="사주의 화(火) 에너지와 점성술의 Fire 사인은 열정, 추진력, 리더십의 공통 에너지. 화가 강하면 행동력과 카리스마가 있으나 과하면 다혈질적. 양 시스템 모두 적절한 제어(水/토성)를 강조.",
        expected_entities=["화", "Fire", "Aries", "Leo"],
        expected_domains=["saju", "astro"],
        theme="life_path",
    ),

    # 크로스도메인: 주역-사주
    EvalSample(
        question="주역의 건괘(乾卦)와 사주에서 어떤 상태가 유사한가?",
        ground_truth="건괘(乾)는 순수한 양의 에너지로 창조와 리더십을 상징. 사주에서 일간이 제왕(帝旺)이나 건록(建祿)에 있을 때와 유사. 비견의 독립적 에너지와도 연결. 최고의 상태이지만 항극필반을 주의.",
        expected_entities=["건", "乾", "제왕", "건록", "비견"],
        expected_domains=["saju", "iching"],
        theme="life_path",
    ),
]


class RAGEvaluator:
    """RAG 시스템 정량 평가기.

    RAGAS 프레임워크의 핵심 지표를 구현:
    1. Faithfulness: 답변이 검색 컨텍스트에 기반하는가
    2. Answer Relevancy: 답변이 질문에 관련되는가
    3. Context Recall: ground truth 정보가 검색 컨텍스트에 포함되는가
    4. Context Precision: 검색 결과 중 관련 있는 비율
    5. Entity Recall: 기대 엔티티 추출 비율

    use_llm=False 시 LLM 없이 키워드 기반 로컬 평가.
    """

    def __init__(
        self,
        llm_provider: str = "openai",
        llm_model: str = "gpt-4o-mini",
        use_llm: bool = True,
    ):
        self.llm_provider = llm_provider
        self.llm_model = llm_model
        self.use_llm = use_llm

    def evaluate_dataset(
        self,
        dataset: List[EvalSample] = None,
        contexts: List[str] = None,
        answers: List[str] = None,
        entities_list: List[List[str]] = None,
        verbose: bool = True,
    ) -> Dict:
        """평가 데이터셋 실행.

        Args:
            dataset: 평가 샘플 리스트 (기본: EVAL_DATASET)
            contexts: 각 샘플에 대한 검색 컨텍스트 (None이면 빈 문자열)
            answers: 각 샘플에 대한 생성 답변 (None이면 빈 문자열)
            entities_list: 각 샘플에서 추출된 엔티티 리스트

        Returns:
            overall 평균, per_sample 결과, timestamp
        """
        if dataset is None:
            dataset = EVAL_DATASET

        n = len(dataset)
        contexts = contexts or [""] * n
        answers = answers or [""] * n
        entities_list = entities_list or [[]] * n

        results = []

        for i, sample in enumerate(dataset):
            if verbose:
                logger.info("평가 중 [%d/%d]: %s...", i + 1, n, sample.question[:50])

            start = time.time()
            context = contexts[i] if i < len(contexts) else ""
            answer = answers[i] if i < len(answers) else ""
            extracted = entities_list[i] if i < len(entities_list) else []

            result = self._evaluate_single(
                sample, context, answer, extracted
            )
            result.latency_ms = (time.time() - start) * 1000
            results.append(result)

            if verbose:
                logger.info(
                    "  F=%.2f AR=%.2f CR=%.2f CP=%.2f ER=%.2f (%.0fms)",
                    result.faithfulness,
                    result.answer_relevancy,
                    result.context_recall,
                    result.context_precision,
                    result.entity_recall,
                    result.latency_ms,
                )

        # 집계
        overall = self._aggregate_results(results)

        if verbose:
            logger.info("\n=== 전체 평가 결과 ===")
            for metric, value in overall.items():
                logger.info("  %s: %.4f", metric, value)

        return {
            "overall": overall,
            "per_sample": [asdict(r) for r in results],
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "total_samples": n,
        }

    def _evaluate_single(
        self,
        sample: EvalSample,
        context: str,
        answer: str,
        extracted_entities: List[str],
    ) -> EvalResult:
        """단일 샘플 평가."""
        result = EvalResult(
            question=sample.question,
            ground_truth=sample.ground_truth,
            retrieved_context=context,
            generated_answer=answer,
        )

        # Faithfulness
        result.faithfulness = self._compute_faithfulness(answer, context)

        # Answer Relevancy
        result.answer_relevancy = self._compute_answer_relevancy(
            sample.question, answer
        )

        # Context Recall
        result.context_recall = self._compute_context_recall(
            sample.ground_truth, context
        )

        # Context Precision
        result.context_precision = self._compute_context_precision(
            sample.question, context
        )

        # Entity Recall
        result.entity_recall = self._compute_entity_recall(
            sample.expected_entities, extracted_entities
        )

        return result

    def _aggregate_results(self, results: List[EvalResult]) -> Dict[str, float]:
        """결과 집계."""
        n = len(results)
        if n == 0:
            return {
                "faithfulness": 0.0,
                "answer_relevancy": 0.0,
                "context_recall": 0.0,
                "context_precision": 0.0,
                "entity_recall": 0.0,
                "avg_latency_ms": 0.0,
            }

        return {
            "faithfulness": sum(r.faithfulness for r in results) / n,
            "answer_relevancy": sum(r.answer_relevancy for r in results) / n,
            "context_recall": sum(r.context_recall for r in results) / n,
            "context_precision": sum(r.context_precision for r in results) / n,
            "entity_recall": sum(r.entity_recall for r in results) / n,
            "avg_latency_ms": sum(r.latency_ms for r in results) / n,
        }

    # ─── 지표 계산 ─────────────────────────────────

    def _compute_faithfulness(self, answer: str, context: str) -> float:
        """Faithfulness: 답변의 주장이 컨텍스트에 기반하는가."""
        if not answer or not context:
            return 0.0

        if self.use_llm:
            return self._compute_faithfulness_llm(answer, context)
        return self._compute_faithfulness_local(answer, context)

    def _compute_faithfulness_local(self, answer: str, context: str) -> float:
        """로컬 키워드 기반 faithfulness 계산."""
        answer_words = set(self._tokenize(answer))
        context_words = set(self._tokenize(context))

        if not answer_words:
            return 0.0

        overlap = answer_words & context_words
        return len(overlap) / len(answer_words)

    def _compute_faithfulness_llm(self, answer: str, context: str) -> float:
        """LLM 기반 faithfulness 판정."""
        prompt = (
            "다음 답변의 각 주장이 제공된 컨텍스트에 근거하는지 판정하세요.\n\n"
            f"컨텍스트: {context[:2000]}\n\n"
            f"답변: {answer}\n\n"
            '각 주장에 대해 "supported" 또는 "not_supported"로 판정하세요.\n'
            'JSON 형식: {"claims": [{"claim": "...", "verdict": "supported"}], "score": 0.8}'
        )
        result = self._call_judge_llm(prompt)
        return float(result.get("score", 0.5))

    def _compute_answer_relevancy(self, question: str, answer: str) -> float:
        """Answer Relevancy: 답변이 질문에 관련되는가."""
        if not answer:
            return 0.0

        if self.use_llm:
            return self._compute_answer_relevancy_llm(question, answer)
        return self._compute_answer_relevancy_local(question, answer)

    def _compute_answer_relevancy_local(self, question: str, answer: str) -> float:
        """로컬 키워드 기반 answer relevancy."""
        q_words = set(self._tokenize(question))
        a_words = set(self._tokenize(answer))

        if not q_words:
            return 0.0

        overlap = q_words & a_words
        return len(overlap) / len(q_words)

    def _compute_answer_relevancy_llm(self, question: str, answer: str) -> float:
        """LLM 기반 answer relevancy 판정."""
        prompt = (
            "질문과 답변의 관련성을 0~1 사이 점수로 평가하세요.\n\n"
            f"질문: {question}\n답변: {answer}\n\n"
            'JSON: {"score": 0.85, "reason": "..."}'
        )
        result = self._call_judge_llm(prompt)
        return float(result.get("score", 0.5))

    def _compute_context_recall(self, ground_truth: str, context: str) -> float:
        """Context Recall: ground truth 정보가 검색 컨텍스트에 포함되는가."""
        if not ground_truth or not context:
            return 0.0

        if self.use_llm:
            return self._compute_context_recall_llm(ground_truth, context)
        return self._compute_context_recall_local(ground_truth, context)

    def _compute_context_recall_local(self, ground_truth: str, context: str) -> float:
        """로컬 키워드 기반 context recall."""
        gt_words = set(self._tokenize(ground_truth))
        ctx_words = set(self._tokenize(context))

        if not gt_words:
            return 0.0

        found = gt_words & ctx_words
        return len(found) / len(gt_words)

    def _compute_context_recall_llm(self, ground_truth: str, context: str) -> float:
        """LLM 기반 context recall 판정."""
        prompt = (
            "정답(ground truth)의 핵심 정보가 검색된 컨텍스트에 얼마나 포함되어 있는지 평가하세요.\n\n"
            f"정답: {ground_truth}\n검색 컨텍스트: {context[:2000]}\n\n"
            'JSON: {"score": 0.7, "found_info": ["..."], "missing_info": ["..."]}'
        )
        result = self._call_judge_llm(prompt)
        return float(result.get("score", 0.5))

    def _compute_context_precision(self, question: str, context: str) -> float:
        """Context Precision: 검색 결과 중 관련 있는 비율."""
        if not context:
            return 0.0

        if self.use_llm:
            return self._compute_context_precision_llm(question, context)
        return self._compute_context_precision_local(question, context)

    def _compute_context_precision_local(self, question: str, context: str) -> float:
        """로컬 키워드 기반 context precision."""
        q_words = set(self._tokenize(question))
        ctx_words = set(self._tokenize(context))

        if not ctx_words:
            return 0.0

        overlap = q_words & ctx_words
        return len(overlap) / len(ctx_words) if ctx_words else 0.0

    def _compute_context_precision_llm(self, question: str, context: str) -> float:
        """LLM 기반 context precision 판정."""
        prompt = (
            "질문에 대해 검색된 컨텍스트의 각 부분이 얼마나 관련되는지 평가하세요.\n\n"
            f"질문: {question}\n컨텍스트: {context[:2000]}\n\n"
            'JSON: {"score": 0.75, "relevant_ratio": "6/8"}'
        )
        result = self._call_judge_llm(prompt)
        return float(result.get("score", 0.5))

    def _compute_entity_recall(
        self,
        expected: List[str],
        extracted: List[str],
    ) -> float:
        """Entity Recall: 기대 엔티티 중 추출된 비율."""
        if not expected:
            return 1.0
        if not extracted:
            return 0.0

        extracted_lower = {e.lower() for e in extracted}
        found = sum(
            1 for e in expected
            if e.lower() in extracted_lower
            or any(e.lower() in ext for ext in extracted_lower)
        )

        return found / len(expected)

    # ─── 유틸리티 ─────────────────────────────────

    def _tokenize(self, text: str) -> List[str]:
        """간단한 토크나이저 (공백 + 한글 분리)."""
        import re
        # 한글/영문 단어 추출 (2자 이상)
        words = re.findall(r'[가-힣]{2,}|[a-zA-Z]{2,}', text.lower())
        return words

    def _call_judge_llm(self, prompt: str) -> Dict:
        """평가용 LLM 호출."""
        try:
            if self.llm_provider == "openai":
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model=self.llm_model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0,
                    max_tokens=300,
                    response_format={"type": "json_object"},
                )
                return json.loads(response.choices[0].message.content)

            elif self.llm_provider == "anthropic":
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-5-haiku-20241022",
                    max_tokens=300,
                    messages=[{"role": "user", "content": prompt + "\nJSON으로만 응답하세요."}],
                )
                text = response.content[0].text
                if "```json" in text:
                    text = text.split("```json")[1].split("```")[0]
                elif "```" in text:
                    text = text.split("```")[1].split("```")[0]
                return json.loads(text.strip())

            return {}
        except Exception as e:
            logger.warning("Judge LLM 호출 실패: %s", e)
            return {}

    def save_results(self, results: Dict, output_path: str = "data/eval_results.json"):
        """평가 결과를 JSON으로 저장."""
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2, default=str)
        logger.info("평가 결과 저장: %s", output_path)


def run_evaluation():
    """평가 실행 엔트리포인트.

    Usage:
        python -m app.rag.evaluation
    """
    evaluator = RAGEvaluator()
    results = evaluator.evaluate_dataset(verbose=True)
    evaluator.save_results(results)
    return results


if __name__ == "__main__":
    run_evaluation()
