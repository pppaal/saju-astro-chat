# app/rag/hyde.py
"""
HyDE: Hypothetical Document Embeddings (Phase 7b)
===================================================
쿼리를 가상 문서로 확장하여 검색 정밀도를 향상.

기존 검색:
  query → embed(query) → search → results

HyDE 검색:
  query → LLM(query → 가상 답변) → embed(가상 답변) → search → results

원리:
  "갑목 일간의 성격은?" 이라는 짧은 쿼리보다
  LLM이 생성한 "갑목은 큰 나무를 상징하며 리더십, 책임감이 특징..."이라는
  가상 답변의 임베딩이 실제 문서와 더 유사함.

USE_HYDE=1 환경변수로 활성화.
"""

import logging
import os
from typing import Optional, Dict
from threading import Lock

logger = logging.getLogger(__name__)

# Feature flag
USE_HYDE = os.environ.get("USE_HYDE", "0") == "1"

# 도메인별 HyDE 프롬프트
HYDE_PROMPTS = {
    "saju": (
        "다음 사주(四柱) 관련 질문에 대해 전문가로서 간결하게 답변하세요. "
        "천간, 지지, 오행, 십신 등 사주 전문 용어를 포함하세요.\n\n"
        "질문: {query}\n\n답변:"
    ),
    "astro": (
        "Answer the following astrology question concisely as an expert. "
        "Include relevant astrological terms (planets, signs, houses, aspects).\n\n"
        "Question: {query}\n\nAnswer:"
    ),
    "tarot": (
        "다음 타로 관련 질문에 전문가로서 간결하게 답변하세요. "
        "카드 이름, 상징, 정방향/역방향 의미를 포함하세요.\n\n"
        "질문: {query}\n\n답변:"
    ),
    "default": (
        "다음 질문에 대해 사주/점성술/타로 전문가로서 간결하게 답변하세요. "
        "동양(사주)과 서양(점성술) 관점을 모두 포함하세요.\n\n"
        "질문: {query}\n\n답변:"
    ),
}


class HyDEGenerator:
    """HyDE 가상 문서 생성기.

    사용자 쿼리를 LLM으로 가상 답변으로 확장한 뒤,
    그 답변의 임베딩으로 검색하여 정밀도를 높인다.

    LLM 미사용 시: 쿼리에 도메인 키워드를 추가하는 로컬 확장 fallback.
    """

    # 도메인별 확장 키워드 (LLM 미사용 시 fallback)
    DOMAIN_KEYWORDS = {
        "saju": "사주 오행 천간 지지 십신 일간 대운 세운",
        "astro": "astrology planet sign house aspect transit",
        "tarot": "tarot card major minor arcana spread",
        "dream": "꿈 해석 상징 무의식 융 심리",
        "default": "사주 점성술 운세 해석",
    }

    def __init__(
        self,
        llm_provider: str = "openai",
        llm_model: str = "gpt-4o-mini",
        use_llm: bool = True,
        max_tokens: int = 150,
    ):
        self.llm_provider = llm_provider
        self.llm_model = llm_model
        self.use_llm = use_llm
        self.max_tokens = max_tokens

    def generate_hypothesis(
        self,
        query: str,
        domain: str = "default",
        facts: Optional[Dict] = None,
    ) -> str:
        """쿼리에 대한 가상 답변 생성.

        Args:
            query: 사용자 검색 쿼리
            domain: 도메인 (saju/astro/tarot/default)
            facts: 추가 컨텍스트 (일간, 행성 위치 등)

        Returns:
            가상 답변 텍스트 (임베딩 검색에 사용)
        """
        if self.use_llm:
            hypothesis = self._generate_with_llm(query, domain, facts)
            if hypothesis:
                return hypothesis

        # LLM 실패 또는 미사용 시 로컬 확장
        return self._generate_local(query, domain, facts)

    def _generate_with_llm(
        self,
        query: str,
        domain: str,
        facts: Optional[Dict],
    ) -> Optional[str]:
        """LLM 기반 가상 답변 생성."""
        prompt_template = HYDE_PROMPTS.get(domain, HYDE_PROMPTS["default"])
        prompt = prompt_template.format(query=query)

        # facts가 있으면 컨텍스트 추가
        if facts:
            fact_str = ", ".join(f"{k}={v}" for k, v in facts.items() if v)
            prompt = f"배경 정보: {fact_str}\n\n{prompt}"

        try:
            if self.llm_provider == "openai":
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model=self.llm_model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.7,
                    max_tokens=self.max_tokens,
                )
                return response.choices[0].message.content.strip()

            elif self.llm_provider == "anthropic":
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-5-haiku-20241022",
                    max_tokens=self.max_tokens,
                    messages=[{"role": "user", "content": prompt}],
                )
                return response.content[0].text.strip()

        except Exception as e:
            logger.warning("[HyDE] LLM 생성 실패: %s", e)
            return None

    def _generate_local(
        self,
        query: str,
        domain: str,
        facts: Optional[Dict],
    ) -> str:
        """로컬 키워드 확장 (LLM 미사용 시 fallback).

        쿼리에 도메인 키워드를 추가하여 임베딩 검색 범위를 넓힌다.
        LLM만큼 효과적이진 않지만, 비용 없이 약간의 개선 제공.
        """
        keywords = self.DOMAIN_KEYWORDS.get(domain, self.DOMAIN_KEYWORDS["default"])

        parts = [query]

        # facts에서 키워드 추출
        if facts:
            for key in ("dayMaster", "sunSign", "moonSign", "ascendant"):
                val = facts.get(key)
                if val and isinstance(val, str):
                    parts.append(val)

        parts.append(keywords)
        return " ".join(parts)

    def expand_query(
        self,
        query: str,
        domain: str = "default",
        facts: Optional[Dict] = None,
    ) -> str:
        """쿼리 확장: 원본 쿼리 + 가상 답변 결합.

        검색 시 원본 쿼리와 가상 답변을 결합하여
        양쪽의 장점을 활용.

        Args:
            query: 원본 쿼리
            domain: 도메인
            facts: 추가 컨텍스트

        Returns:
            확장된 쿼리 텍스트
        """
        hypothesis = self.generate_hypothesis(query, domain, facts)
        # 원본 쿼리를 앞에 두어 쿼리 의도를 유지
        return f"{query} {hypothesis}"


# ─── 싱글톤 ─────────────────────────────────────

_hyde: Optional[HyDEGenerator] = None
_hyde_lock = Lock()


def get_hyde_generator(use_llm: bool = True) -> HyDEGenerator:
    """싱글톤 HyDEGenerator 반환."""
    global _hyde
    if _hyde is None:
        with _hyde_lock:
            if _hyde is None:
                _hyde = HyDEGenerator(use_llm=use_llm)
    return _hyde
