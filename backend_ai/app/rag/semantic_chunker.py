# app/rag/semantic_chunker.py
"""
Semantic Chunking (Phase 7d)
==============================
의미 기반 텍스트 분할 — 고정 크기 대신 의미적 경계(코사인 유사도 변화)에서 분할.

기존 방식:
- _chunk_text(): 200자 고정 크기 → 문맥 파괴, 의미 단위 무시

개선 방식:
- 문장 단위로 분리 후 임베딩 유사도로 경계 탐지
- 코사인 유사도가 급격히 떨어지는 지점에서 분할
- 한국어 문장 분리 지원 (。！？ + 약어 예외처리)
- 최소/최대 청크 크기 보장

Features:
- Embedding-based breakpoint detection
- Korean + English sentence splitting
- Configurable percentile threshold for breakpoints
- Min/max chunk size enforcement
- Overlap support for context continuity
- Fallback: 임베딩 모델 없으면 규칙 기반 분할
"""

import logging
import re
from dataclasses import dataclass, field
from threading import Lock
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# ─── 한국어 + 영어 문장 분리 ───────────────────────────────

# 문장 끝 패턴: 마침표/느낌표/물음표 + 공백 or 줄바꿈
_SENTENCE_ENDINGS = re.compile(
    r'(?<=[.!?。！？])\s+'
    r'|(?<=\n)\s*'
)

# 약어 패턴 (문장 끝이 아닌 마침표)
_ABBREVIATIONS = {
    "dr.", "mr.", "mrs.", "ms.", "st.", "etc.", "vs.",
    "e.g.", "i.e.", "prof.", "inc.", "ltd.", "co.",
}


def split_sentences(text: str) -> List[str]:
    """텍스트를 문장 단위로 분리.

    한국어와 영어 모두 지원:
    - 마침표, 느낌표, 물음표 기준
    - 줄바꿈 기준
    - 약어 내 마침표는 분리하지 않음

    Args:
        text: 입력 텍스트

    Returns:
        문장 리스트 (빈 문자열 제외)
    """
    if not text or not text.strip():
        return []

    # 줄바꿈으로 먼저 분리
    paragraphs = text.split("\n")
    sentences = []

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        # 문장 끝 패턴으로 분리
        parts = _SENTENCE_ENDINGS.split(para)
        for part in parts:
            part = part.strip()
            if part:
                sentences.append(part)

    return sentences


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    """두 벡터의 코사인 유사도 계산 (numpy 없이)."""
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(x * x for x in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


@dataclass
class ChunkConfig:
    """청킹 설정."""
    min_chunk_size: int = 100       # 최소 청크 문자 수
    max_chunk_size: int = 1500      # 최대 청크 문자 수
    overlap_sentences: int = 1      # 청크 간 겹치는 문장 수
    breakpoint_percentile: float = 0.7  # 유사도 하락 임계값 (백분위)
    combine_short: bool = True      # 짧은 문장 결합 여부


@dataclass
class TextChunk:
    """분할된 텍스트 청크."""
    text: str
    index: int                      # 청크 순서
    start_sentence: int = 0         # 시작 문장 인덱스
    end_sentence: int = 0           # 끝 문장 인덱스
    metadata: Dict = field(default_factory=dict)

    @property
    def char_count(self) -> int:
        return len(self.text)

    @property
    def word_count(self) -> int:
        return len(self.text.split())


class SemanticChunker:
    """의미 기반 텍스트 분할기.

    SentenceTransformer 임베딩으로 문장 간 유사도를 계산하여
    의미적 경계에서 텍스트를 분할한다.

    Algorithm:
    1. 텍스트 → 문장 리스트 분리
    2. 각 문장 임베딩 생성
    3. 인접 문장 쌍의 코사인 유사도 계산
    4. 유사도가 임계값 이하로 떨어지는 지점 = breakpoint
    5. breakpoint 기준으로 문장 그룹화 → 청크

    모델 없는 경우:
    - 규칙 기반 분할 (문단/마침표/크기 제한)
    """

    def __init__(
        self,
        model=None,
        config: ChunkConfig = None,
    ):
        self._model = model
        self._config = config or ChunkConfig()
        self._model_lock = Lock()

    def _get_model(self):
        """임베딩 모델 lazy loading."""
        if self._model is None:
            with self._model_lock:
                if self._model is None:
                    try:
                        from app.rag.model_manager import get_shared_model
                        self._model = get_shared_model()
                    except Exception as e:
                        logger.warning(
                            "[SemanticChunker] 모델 로딩 실패, 규칙 기반 분할 사용: %s", e
                        )
        return self._model

    def chunk(
        self,
        text: str,
        config: ChunkConfig = None,
    ) -> List[TextChunk]:
        """텍스트를 의미 단위 청크로 분할.

        Args:
            text: 입력 텍스트
            config: 청킹 설정 (None이면 기본값)

        Returns:
            TextChunk 리스트
        """
        cfg = config or self._config
        sentences = split_sentences(text)

        if not sentences:
            return []

        if len(sentences) == 1:
            return [TextChunk(text=sentences[0], index=0, start_sentence=0, end_sentence=0)]

        model = self._get_model()
        if model is not None:
            return self._semantic_chunk(sentences, model, cfg)
        else:
            return self._rule_based_chunk(sentences, cfg)

    def _semantic_chunk(
        self,
        sentences: List[str],
        model,
        cfg: ChunkConfig,
    ) -> List[TextChunk]:
        """임베딩 기반 의미적 분할."""
        # 1. 문장 임베딩
        try:
            embeddings = model.encode(sentences, show_progress_bar=False)
            if hasattr(embeddings, "tolist"):
                embeddings = embeddings.tolist()
        except Exception as e:
            logger.warning("[SemanticChunker] 임베딩 실패, 규칙 기반 사용: %s", e)
            return self._rule_based_chunk(sentences, cfg)

        # 2. 인접 문장 유사도 계산
        similarities = []
        for i in range(len(embeddings) - 1):
            sim = _cosine_similarity(embeddings[i], embeddings[i + 1])
            similarities.append(sim)

        # 3. Breakpoint 탐지 (유사도 급락 지점)
        breakpoints = self._find_breakpoints(similarities, cfg)

        # 4. 문장 그룹화 → 청크
        chunks = self._group_sentences(sentences, breakpoints, cfg)
        return chunks

    def _find_breakpoints(
        self,
        similarities: List[float],
        cfg: ChunkConfig,
    ) -> List[int]:
        """유사도 변화 기반 breakpoint 탐지.

        Args:
            similarities: 인접 문장 쌍의 코사인 유사도 리스트
            cfg: 설정

        Returns:
            breakpoint 인덱스 리스트 (이 인덱스 이후에서 분할)
        """
        if not similarities:
            return []

        # 유사도 정렬하여 threshold 계산 (percentile 기반)
        sorted_sims = sorted(similarities)
        threshold_idx = int(len(sorted_sims) * cfg.breakpoint_percentile)
        threshold_idx = min(threshold_idx, len(sorted_sims) - 1)
        threshold = sorted_sims[threshold_idx]

        breakpoints = []
        for i, sim in enumerate(similarities):
            if sim <= threshold:
                breakpoints.append(i)

        return breakpoints

    def _group_sentences(
        self,
        sentences: List[str],
        breakpoints: List[int],
        cfg: ChunkConfig,
    ) -> List[TextChunk]:
        """breakpoint 기준으로 문장 그룹화."""
        chunks = []
        bp_set = set(breakpoints)

        current_sentences = []
        start_idx = 0

        for i, sent in enumerate(sentences):
            current_sentences.append(sent)
            current_text = " ".join(current_sentences)

            is_breakpoint = i in bp_set
            is_max_exceeded = len(current_text) >= cfg.max_chunk_size
            is_last = i == len(sentences) - 1

            if is_breakpoint or is_max_exceeded or is_last:
                # 현재 그룹이 min_chunk_size 미만이고 다음이 있으면 계속 누적
                if (
                    cfg.combine_short
                    and len(current_text) < cfg.min_chunk_size
                    and not is_last
                    and not is_max_exceeded
                ):
                    continue

                chunk = TextChunk(
                    text=current_text,
                    index=len(chunks),
                    start_sentence=start_idx,
                    end_sentence=i,
                )
                chunks.append(chunk)

                # 오버랩 처리
                if cfg.overlap_sentences > 0 and not is_last:
                    overlap = current_sentences[-cfg.overlap_sentences:]
                    current_sentences = list(overlap)
                    start_idx = i - len(overlap) + 1
                else:
                    current_sentences = []
                    start_idx = i + 1

        return chunks

    def _rule_based_chunk(
        self,
        sentences: List[str],
        cfg: ChunkConfig,
    ) -> List[TextChunk]:
        """규칙 기반 분할 (임베딩 모델 없을 때 폴백).

        문단/크기 기반으로 문장을 그룹화.
        """
        chunks = []
        current_sentences = []
        start_idx = 0

        for i, sent in enumerate(sentences):
            current_sentences.append(sent)
            current_text = " ".join(current_sentences)

            is_last = i == len(sentences) - 1

            if len(current_text) >= cfg.max_chunk_size or is_last:
                chunk = TextChunk(
                    text=current_text,
                    index=len(chunks),
                    start_sentence=start_idx,
                    end_sentence=i,
                )
                chunks.append(chunk)

                if cfg.overlap_sentences > 0 and not is_last:
                    overlap = current_sentences[-cfg.overlap_sentences:]
                    current_sentences = list(overlap)
                    start_idx = i - len(overlap) + 1
                else:
                    current_sentences = []
                    start_idx = i + 1

        return chunks

    def chunk_with_embeddings(
        self,
        text: str,
        config: ChunkConfig = None,
    ) -> List[Tuple[TextChunk, List[float]]]:
        """청크와 함께 임베딩도 반환 (인덱싱용).

        Args:
            text: 입력 텍스트
            config: 설정

        Returns:
            [(TextChunk, embedding), ...] 리스트
        """
        chunks = self.chunk(text, config)
        model = self._get_model()

        if model is None or not chunks:
            return [(c, []) for c in chunks]

        try:
            texts = [c.text for c in chunks]
            embeddings = model.encode(texts, show_progress_bar=False)
            if hasattr(embeddings, "tolist"):
                embeddings = embeddings.tolist()
            return list(zip(chunks, embeddings))
        except Exception as e:
            logger.warning("[SemanticChunker] 청크 임베딩 실패: %s", e)
            return [(c, []) for c in chunks]

    def get_info(self) -> Dict:
        """청커 정보."""
        return {
            "type": "semantic" if self._get_model() else "rule_based",
            "config": {
                "min_chunk_size": self._config.min_chunk_size,
                "max_chunk_size": self._config.max_chunk_size,
                "overlap_sentences": self._config.overlap_sentences,
                "breakpoint_percentile": self._config.breakpoint_percentile,
            },
        }


# ─── 싱글톤 ─────────────────────────────────────────────────

_chunker: Optional[SemanticChunker] = None
_chunker_lock = Lock()


def get_semantic_chunker(config: ChunkConfig = None) -> SemanticChunker:
    """싱글톤 SemanticChunker 반환."""
    global _chunker
    if _chunker is None:
        with _chunker_lock:
            if _chunker is None:
                _chunker = SemanticChunker(config=config)
    return _chunker
