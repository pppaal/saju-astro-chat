# backend_ai/app/rag/types.py
"""
RAG Type Definitions
====================
공통 데이터 클래스 및 타입 정의
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional


@dataclass
class RAGResult:
    """RAG 검색 결과 단위"""
    text: str
    score: float
    source: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    rank: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "text": self.text,
            "score": self.score,
            "source": self.source,
            "metadata": self.metadata,
            "rank": self.rank,
        }


@dataclass
class RAGQuery:
    """RAG 검색 쿼리"""
    query: str
    top_k: int = 5
    min_score: float = 0.3
    domain: Optional[str] = None
    filters: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RAGContext:
    """LLM 프롬프트에 삽입할 RAG 컨텍스트"""
    results: List[RAGResult]
    total_found: int = 0
    search_query: str = ""
    formatted_text: str = ""

    def format_for_prompt(self, max_chars: int = 2000) -> str:
        """Format results for LLM prompt."""
        if self.formatted_text:
            return self.formatted_text[:max_chars]

        lines = []
        for i, r in enumerate(self.results, 1):
            source_info = f" [{r.source}]" if r.source else ""
            lines.append(f"{i}. {r.text}{source_info}")

        self.formatted_text = "\n".join(lines)
        return self.formatted_text[:max_chars]
