# backend_ai/app/rag/context_builder.py
"""
RAG Context Builder
===================
LLM 프롬프트에 삽입할 RAG 컨텍스트를 빌드하는 유틸리티
"""

from typing import List, Dict, Any, Optional
from .types import RAGResult, RAGContext


class RAGContextBuilder:
    """
    RAG 검색 결과를 LLM 프롬프트용 컨텍스트로 변환

    Features:
    - 여러 소스의 결과 통합
    - 중복 제거
    - 길이 제한 적용
    - 포맷 커스터마이징
    """

    def __init__(self, max_chars: int = 2000, max_results: int = 10):
        """
        Initialize context builder.

        Args:
            max_chars: Maximum characters for final context
            max_results: Maximum number of results to include
        """
        self.max_chars = max_chars
        self.max_results = max_results
        self._results: List[RAGResult] = []
        self._sources: Dict[str, List[RAGResult]] = {}

    def add_results(
        self,
        results: List[RAGResult],
        source_name: Optional[str] = None
    ) -> "RAGContextBuilder":
        """
        Add results from a RAG source.

        Args:
            results: List of RAG results
            source_name: Optional name for this source

        Returns:
            Self for chaining
        """
        for r in results:
            # Set source if not already set
            if source_name and not r.source:
                r.source = source_name
            self._results.append(r)

        if source_name:
            self._sources.setdefault(source_name, []).extend(results)

        return self

    def deduplicate(self, similarity_threshold: float = 0.9) -> "RAGContextBuilder":
        """
        Remove duplicate or very similar results.

        Args:
            similarity_threshold: Text similarity threshold for deduplication

        Returns:
            Self for chaining
        """
        if len(self._results) <= 1:
            return self

        seen_texts = set()
        unique_results = []

        for r in sorted(self._results, key=lambda x: x.score, reverse=True):
            # Simple deduplication by text prefix
            text_key = r.text[:100].lower().strip()
            if text_key not in seen_texts:
                seen_texts.add(text_key)
                unique_results.append(r)

        self._results = unique_results
        return self

    def sort_by_score(self) -> "RAGContextBuilder":
        """Sort results by score descending."""
        self._results.sort(key=lambda x: x.score, reverse=True)
        return self

    def limit(self, max_results: Optional[int] = None) -> "RAGContextBuilder":
        """
        Limit number of results.

        Args:
            max_results: Maximum results (uses default if not specified)

        Returns:
            Self for chaining
        """
        limit = max_results or self.max_results
        self._results = self._results[:limit]
        return self

    def build(self) -> RAGContext:
        """
        Build the final RAGContext.

        Returns:
            RAGContext with formatted results
        """
        # Renumber ranks
        for i, r in enumerate(self._results):
            r.rank = i + 1

        return RAGContext(
            results=self._results,
            total_found=len(self._results),
        )

    def format_numbered(self, include_source: bool = True) -> str:
        """
        Format results as numbered list.

        Args:
            include_source: Whether to include source info

        Returns:
            Formatted string
        """
        lines = []
        for i, r in enumerate(self._results, 1):
            source_info = f" [{r.source}]" if include_source and r.source else ""
            lines.append(f"{i}. {r.text}{source_info}")

            if sum(len(line) for line in lines) > self.max_chars:
                break

        return "\n".join(lines)

    def format_grouped(self) -> str:
        """
        Format results grouped by source.

        Returns:
            Formatted string with source headers
        """
        lines = []
        total_chars = 0

        for source, results in self._sources.items():
            if total_chars > self.max_chars:
                break

            lines.append(f"\n### {source}")
            for r in results:
                if total_chars > self.max_chars:
                    break
                line = f"- {r.text}"
                lines.append(line)
                total_chars += len(line)

        return "\n".join(lines)

    def format_for_prompt(
        self,
        style: str = "numbered",
        header: Optional[str] = None
    ) -> str:
        """
        Format results for LLM prompt.

        Args:
            style: Format style ("numbered", "grouped", "simple")
            header: Optional header text

        Returns:
            Formatted prompt-ready string
        """
        if not self._results:
            return ""

        if style == "grouped":
            content = self.format_grouped()
        elif style == "simple":
            content = "\n".join(r.text for r in self._results)
        else:  # numbered
            content = self.format_numbered()

        if header:
            return f"{header}\n{content}"

        return content


def build_rag_context(
    results: List[RAGResult],
    max_chars: int = 2000,
    deduplicate: bool = True
) -> RAGContext:
    """
    Convenience function to build RAG context.

    Args:
        results: List of RAG results
        max_chars: Maximum characters
        deduplicate: Whether to remove duplicates

    Returns:
        RAGContext
    """
    builder = RAGContextBuilder(max_chars=max_chars)
    builder.add_results(results)

    if deduplicate:
        builder.deduplicate()

    builder.sort_by_score().limit()
    return builder.build()
