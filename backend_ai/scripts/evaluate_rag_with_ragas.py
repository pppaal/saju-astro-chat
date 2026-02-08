#!/usr/bin/env python3
"""
RAGAS 프레임워크를 사용한 RAG 시스템 정량 평가

Phase 5: Before/After 비교 벤치마크

Metrics:
- Faithfulness: 검색 컨텍스트에 근거한 답변인가?
- Answer Relevancy: 질문과 관련된 답변인가?
- Context Recall: 필요한 정보를 빠짐없이 검색했는가?
- Context Precision: 검색 결과 중 관련 있는 비율

Usage:
    # Before (legacy PyTorch O(n))
    USE_CHROMADB=0 python -m scripts.evaluate_rag_with_ragas

    # After (ChromaDB + PageRank)
    USE_CHROMADB=1 python -m scripts.evaluate_rag_with_ragas

    # 데이터셋 생성만
    python -m scripts.evaluate_rag_with_ragas --generate-only
"""

import argparse
import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Dict, List

# 프로젝트 루트 추가
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _PROJECT_ROOT)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# RAGAS import (optional - 설치되지 않으면 스킵)
try:
    from ragas import evaluate
    from ragas.metrics import (
        faithfulness,
        answer_relevancy,
        context_recall,
        context_precision,
    )
    from datasets import Dataset
    RAGAS_AVAILABLE = True
except ImportError:
    logger.warning("RAGAS not installed. Install with: pip install ragas datasets")
    RAGAS_AVAILABLE = False


# ═══════════════════════════════════════════════════════════
# 평가 데이터셋
# ═══════════════════════════════════════════════════════════

EVALUATION_DATASET = [
    {
        "question": "갑목 일간의 성격은?",
        "ground_truth": "갑목은 큰 나무를 상징하며, 곧고 강직한 성격을 가지고 있습니다. 의지가 강하고 리더십이 있으나, 융통성이 부족할 수 있습니다.",
        "contexts_required": ["갑목", "일간", "성격", "목"],
    },
    {
        "question": "임수와 갑목의 궁합은?",
        "ground_truth": "임수와 갑목은 수생목(水生木) 상생 관계로 매우 좋은 궁합입니다. 임수가 갑목을 키워주는 관계입니다.",
        "contexts_required": ["임수", "갑목", "수생목", "상생", "궁합"],
    },
    {
        "question": "병화가 강한 사람의 특징은?",
        "ground_truth": "병화는 태양을 상징하며, 밝고 활동적이며 외향적인 성격을 가집니다. 리더십이 강하고 창의적이나, 충동적일 수 있습니다.",
        "contexts_required": ["병화", "태양", "성격", "화"],
    },
    {
        "question": "목성이 사수자리에 있으면?",
        "ground_truth": "목성이 사수자리에 위치하면 확장, 성장, 철학적 탐구가 강조됩니다. 해외 여행, 고등 교육, 종교/철학에 관심이 많습니다.",
        "contexts_required": ["목성", "사수자리", "확장", "철학"],
    },
    {
        "question": "식신이 많으면 어떤 성격인가?",
        "ground_truth": "식신이 많으면 표현력이 풍부하고 창의적이며, 여유롭고 낙천적인 성격을 가집니다. 예술이나 요리에 재능이 있을 수 있습니다.",
        "contexts_required": ["식신", "성격", "창의", "표현"],
    },
    {
        "question": "금수상생의 의미는?",
        "ground_truth": "금생수(金生水)는 금(金)이 수(水)를 생하는 상생 관계입니다. 금속이 녹아 물이 되듯, 금이 수를 키워줍니다.",
        "contexts_required": ["금", "수", "상생", "금생수", "오행"],
    },
    {
        "question": "태양과 달의 조화는?",
        "ground_truth": "태양(Sun)은 자아와 의식, 달(Moon)은 감정과 무의식을 상징합니다. 두 행성의 조화는 이성과 감성의 균형을 의미합니다.",
        "contexts_required": ["태양", "달", "sun", "moon", "조화"],
    },
    {
        "question": "편관이 강하면?",
        "ground_truth": "편관이 강하면 책임감과 통솔력이 강하나, 권위적이고 독단적일 수 있습니다. 직장 생활에서 리더 역할을 맡게 됩니다.",
        "contexts_required": ["편관", "성격", "리더십", "십성"],
    },
]


# ═══════════════════════════════════════════════════════════
# RAG 시스템 쿼리
# ═══════════════════════════════════════════════════════════

def query_rag_system(question: str, use_chromadb: bool = False) -> Dict:
    """RAG 시스템에 질문하고 답변 + 컨텍스트 반환."""
    try:
        from app.saju_astro_rag import GraphRAG

        graph_rag = GraphRAG()

        # 질문을 facts dict로 변환
        facts = {"query": question, "type": "general"}

        result = graph_rag.query(facts, top_k=8, domain_priority="saju")

        contexts = result.get("matched_nodes", [])
        context_text = result.get("context_text", "")

        # 간단한 답변 생성 (실제로는 LLM 호출)
        answer = f"검색된 컨텍스트:\n{context_text[:500]}"

        return {
            "answer": answer,
            "contexts": contexts,
            "backend": result.get("stats", {}).get("backend", "legacy"),
        }

    except Exception as e:
        logger.error(f"RAG 쿼리 실패: {e}")
        return {"answer": "", "contexts": [], "backend": "error"}


# ═══════════════════════════════════════════════════════════
# 평가 데이터셋 생성
# ═══════════════════════════════════════════════════════════

def generate_evaluation_data(use_chromadb: bool = False) -> List[Dict]:
    """평가 데이터셋 생성 (RAG 시스템 실제 쿼리)."""
    logger.info("=" * 60)
    logger.info(f"평가 데이터 생성 시작 (USE_CHROMADB={use_chromadb})")
    logger.info("=" * 60)

    results = []

    for i, item in enumerate(EVALUATION_DATASET, 1):
        logger.info(f"[{i}/{len(EVALUATION_DATASET)}] {item['question']}")

        start = time.time()
        rag_result = query_rag_system(item["question"], use_chromadb)
        elapsed = time.time() - start

        results.append({
            "question": item["question"],
            "answer": rag_result["answer"],
            "contexts": rag_result["contexts"],
            "ground_truth": item["ground_truth"],
            "backend": rag_result["backend"],
            "latency_ms": int(elapsed * 1000),
        })

        logger.info(f"  ✓ {len(rag_result['contexts'])} contexts, {elapsed*1000:.0f}ms, backend={rag_result['backend']}")

    return results


# ═══════════════════════════════════════════════════════════
# RAGAS 평가 실행
# ═══════════════════════════════════════════════════════════

def run_ragas_evaluation(eval_data: List[Dict]) -> Dict:
    """RAGAS 프레임워크로 평가 실행."""
    if not RAGAS_AVAILABLE:
        logger.error("RAGAS가 설치되지 않았습니다. pip install ragas datasets")
        return {}

    logger.info("=" * 60)
    logger.info("RAGAS 평가 시작")
    logger.info("=" * 60)

    # RAGAS Dataset 형식으로 변환
    dataset_dict = {
        "question": [d["question"] for d in eval_data],
        "answer": [d["answer"] for d in eval_data],
        "contexts": [d["contexts"] for d in eval_data],
        "ground_truth": [d["ground_truth"] for d in eval_data],
    }

    dataset = Dataset.from_dict(dataset_dict)

    # 평가 실행
    result = evaluate(
        dataset,
        metrics=[
            faithfulness,
            answer_relevancy,
            context_recall,
            context_precision,
        ],
    )

    return result


# ═══════════════════════════════════════════════════════════
# 비교 리포트 생성
# ═══════════════════════════════════════════════════════════

def generate_comparison_report(before_data: List[Dict], after_data: List[Dict]):
    """Before/After 비교 리포트 생성."""
    logger.info("=" * 60)
    logger.info("Before/After 비교 리포트")
    logger.info("=" * 60)

    # 레이턴시 비교
    before_latency = sum(d["latency_ms"] for d in before_data) / len(before_data)
    after_latency = sum(d["latency_ms"] for d in after_data) / len(after_data)
    latency_improvement = ((before_latency - after_latency) / before_latency) * 100

    logger.info(f"\n📊 성능 비교:")
    logger.info(f"  Before (PyTorch O(n))  : {before_latency:.0f}ms")
    logger.info(f"  After (ChromaDB+PR)    : {after_latency:.0f}ms")
    logger.info(f"  개선율                 : {latency_improvement:+.1f}%")

    # 컨텍스트 개수 비교
    before_ctx_avg = sum(len(d["contexts"]) for d in before_data) / len(before_data)
    after_ctx_avg = sum(len(d["contexts"]) for d in after_data) / len(after_data)

    logger.info(f"\n📚 검색 결과:")
    logger.info(f"  Before 평균 contexts  : {before_ctx_avg:.1f}")
    logger.info(f"  After 평균 contexts   : {after_ctx_avg:.1f}")

    # 리포트 파일 저장
    report_path = os.path.join(_PROJECT_ROOT, "data", "ragas_comparison_report.json")
    os.makedirs(os.path.dirname(report_path), exist_ok=True)

    report = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "before": {
            "latency_ms": before_latency,
            "contexts_avg": before_ctx_avg,
            "data": before_data,
        },
        "after": {
            "latency_ms": after_latency,
            "contexts_avg": after_ctx_avg,
            "data": after_data,
        },
        "improvement": {
            "latency_pct": latency_improvement,
        },
    }

    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    logger.info(f"\n✅ 리포트 저장: {report_path}")


# ═══════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="RAGAS RAG 평가")
    parser.add_argument("--generate-only", action="store_true", help="데이터셋 생성만")
    parser.add_argument("--compare", action="store_true", help="Before/After 비교")
    args = parser.parse_args()

    use_chromadb = os.environ.get("USE_CHROMADB", "0") == "1"

    logger.info(f"USE_CHROMADB={use_chromadb}")

    if args.compare:
        # Before/After 비교 모드
        logger.info("Before 평가 (USE_CHROMADB=0)")
        os.environ["USE_CHROMADB"] = "0"
        before_data = generate_evaluation_data(use_chromadb=False)

        logger.info("\nAfter 평가 (USE_CHROMADB=1)")
        os.environ["USE_CHROMADB"] = "1"
        after_data = generate_evaluation_data(use_chromadb=True)

        generate_comparison_report(before_data, after_data)

    else:
        # 단일 평가
        eval_data = generate_evaluation_data(use_chromadb)

        if not args.generate_only and RAGAS_AVAILABLE:
            result = run_ragas_evaluation(eval_data)
            logger.info(f"\n📊 RAGAS 평가 결과:")
            logger.info(result)

        # 결과 저장
        output_path = os.path.join(
            _PROJECT_ROOT,
            "data",
            f"ragas_eval_{'chromadb' if use_chromadb else 'legacy'}.json"
        )
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(eval_data, f, ensure_ascii=False, indent=2)
        logger.info(f"\n✅ 평가 데이터 저장: {output_path}")


if __name__ == "__main__":
    main()
