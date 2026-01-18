"""
RAG Context Service

Helper functions for building RAG search context and query processing.
Extracted from search_routes.py as part of Phase 1.3 refactoring.

Functions:
- expand_tarot_query: Add multilingual hints for better tarot search
- get_fallback_tarot_queries: Generate fallback queries when search returns empty
"""
from typing import List, Tuple, Optional, Any
import logging

logger = logging.getLogger(__name__)

# ============================================================================
# Query expansion configuration
# Each entry: (english_keywords, korean_keywords, english_hint, korean_hint, fallbacks)
# ============================================================================
_QUERY_MAPPINGS = [
    {
        "id": "business",
        "en_keywords": ["business", "startup", "entrepreneur", "start a business", "company"],
        "ko_keywords": ["사업", "창업", "자영업", "스타트업"],
        "en_hint": "사업 창업",
        "ko_hint": "business startup",
        "fallbacks": ["business", "career"],
    },
    {
        "id": "career",
        "en_keywords": ["career", "job", "work", "promotion", "interview", "resume"],
        "ko_keywords": ["직장", "커리어", "이직", "취업", "직무", "면접", "승진", "연봉", "업무"],
        "en_hint": "직장 커리어 이직",
        "ko_hint": "career job work",
        "fallbacks": ["career", "job"],
    },
    {
        "id": "love",
        "en_keywords": ["love", "relationship", "dating", "partner", "marriage", "breakup", "ex"],
        "ko_keywords": ["연애", "사랑", "관계", "결혼", "이별", "재회", "궁합", "썸", "짝사랑",
                       "전남친", "전여친", "그 사람", "상대", "상대방", "마음", "호감"],
        "en_hint": "연애 관계 결혼",
        "ko_hint": "love relationship",
        "fallbacks": ["love", "relationship"],
    },
    {
        "id": "travel",
        "en_keywords": ["travel", "trip", "journey", "move", "relocation", "relocate"],
        "ko_keywords": ["여행", "이사", "이동", "출장"],
        "en_hint": "여행 이동 이사",
        "ko_hint": "travel move",
        "fallbacks": ["travel", "journey"],
    },
    {
        "id": "obstacle",
        "en_keywords": ["blocking", "blockage", "stuck", "progress", "obstacle", "challenge"],
        "ko_keywords": ["막힘", "장애물", "정체", "진전", "방해"],
        "en_hint": "장애물 정체 성장",
        "ko_hint": "obstacle growth",
        "fallbacks": ["obstacle", "challenge"],
    },
    {
        "id": "strength",
        "en_keywords": ["strength", "strengths", "talent", "ability"],
        "ko_keywords": ["강점", "장점", "재능", "능력"],
        "en_hint": "강점 재능",
        "ko_hint": "strength identity",
        "fallbacks": ["strength", "identity"],
    },
    {
        "id": "money",
        "en_keywords": ["money", "finance", "financial", "invest", "investment", "stock",
                       "stocks", "crypto", "bitcoin"],
        "ko_keywords": ["돈", "재물", "금전", "재정", "투자", "주식", "코인", "부동산",
                       "대출", "빚", "저축", "수입", "월급", "수익"],
        "en_hint": "재물 돈 투자",
        "ko_hint": "money finance investment",
        "fallbacks": ["money", "finance"],
    },
    {
        "id": "health",
        "en_keywords": ["health", "ill", "sick", "anxiety", "stress", "depression", "mental"],
        "ko_keywords": ["건강", "몸", "우울", "불안", "스트레스", "병", "치료", "회복", "멘탈"],
        "en_hint": "건강 마음 불안",
        "ko_hint": "health stress",
        "fallbacks": ["health", "stress"],
    },
    {
        "id": "decision",
        "en_keywords": ["decision", "choice", "choose", "should i", "which", "either", "vs"],
        "ko_keywords": ["결정", "선택", "갈림길", "할까", "될까", "타이밍", "시기", "언제"],
        "en_hint": "선택 결정",
        "ko_hint": "decision timing",
        "fallbacks": ["decision", "timing"],
    },
    {
        "id": "timing",
        "en_keywords": ["timing", "when", "soon", "next", "this year", "next year"],
        "ko_keywords": [],  # Handled by decision mapping
        "en_hint": "타이밍 시기",
        "ko_hint": "",
        "fallbacks": ["timing", "when"],
    },
    {
        "id": "family",
        "en_keywords": ["family", "parents", "child", "children"],
        "ko_keywords": ["가족", "부모", "자녀", "아이"],
        "en_hint": "가족 관계",
        "ko_hint": "family",
        "fallbacks": ["family"],
    },
    {
        "id": "study",
        "en_keywords": ["study", "school", "exam", "test"],
        "ko_keywords": ["공부", "시험", "합격", "수능", "자격증", "유학", "학업"],
        "en_hint": "시험 공부",
        "ko_hint": "study exam",
        "fallbacks": ["study", "exam"],
    },
]

# Search configuration
_DEFAULT_TOP_K = 5
_CONTEXT_TOP_K = 3
_CONTEXT_MAX_CHARS = 1500


def _match_keywords(query: str, keywords: List[str], case_sensitive: bool = False) -> bool:
    """Check if any keyword matches in the query."""
    check_query = query if case_sensitive else query.lower()
    return any(k in check_query for k in keywords)


def expand_tarot_query(query: str) -> str:
    """
    Add lightweight Korean/English hints when tarot queries need expansion.

    This helps improve RAG search results by adding language-specific hints.
    For example, "business" → "business startup 사업 창업"

    Args:
        query: Original search query

    Returns:
        Expanded query with additional hints, or original if no expansion needed
    """
    lower = query.lower()
    extras = []

    for mapping in _QUERY_MAPPINGS:
        # English to Korean expansion
        if mapping["en_keywords"] and _match_keywords(lower, mapping["en_keywords"]):
            if mapping["en_hint"]:
                extras.append(mapping["en_hint"])

        # Korean to English expansion (case-sensitive for Korean)
        if mapping["ko_keywords"] and _match_keywords(query, mapping["ko_keywords"], case_sensitive=True):
            if mapping["ko_hint"]:
                extras.append(mapping["ko_hint"])

    if not extras:
        return query

    expanded = f"{query} | {' '.join(extras)}"
    logger.info(f"[RAGContext] Expanded query: '{query}' → '{expanded}'")
    return expanded


def get_fallback_tarot_queries(query: str) -> List[str]:
    """
    Provide compact fallback queries when expanded search still returns empty.

    This is a last-resort mechanism to ensure users get some results even
    when their specific query doesn't match any documents.

    Args:
        query: Original search query

    Returns:
        List of fallback queries to try (de-duplicated, order preserved)
    """
    lower = query.lower()
    fallbacks = []

    for mapping in _QUERY_MAPPINGS:
        # Check English keywords
        if mapping["en_keywords"] and _match_keywords(lower, mapping["en_keywords"]):
            fallbacks.extend(mapping["fallbacks"])

        # Check Korean keywords (case-sensitive)
        if mapping["ko_keywords"] and _match_keywords(query, mapping["ko_keywords"], case_sensitive=True):
            fallbacks.extend(mapping["fallbacks"])

    # De-duplicate while preserving order
    seen = set()
    deduped = []
    for item in fallbacks:
        if item not in seen:
            seen.add(item)
            deduped.append(item)

    if deduped:
        logger.info(f"[RAGContext] Generated {len(deduped)} fallback queries for: '{query}'")

    return deduped


# ============================================================================
# Convenience functions
# ============================================================================

def build_tarot_search_context(
    query: str,
    rag_instance: Any,
    domain: str = "tarot",
    top_k: int = _DEFAULT_TOP_K
) -> Tuple[List, str, Optional[str], Optional[str]]:
    """
    Build full tarot search context with expansion and fallback.

    This is a convenience function that combines query expansion, search,
    and fallback logic into a single call.

    Args:
        query: Original search query
        rag_instance: Domain RAG instance
        domain: Domain name (default: "tarot")
        top_k: Number of results to return

    Returns:
        Tuple of (results, context, expanded_query, fallback_query)
    """
    results = []
    context = ""
    expanded_query = None
    fallback_query = None

    context_top_k = min(top_k, _CONTEXT_TOP_K)

    # Try original query
    results = rag_instance.search(domain, query, top_k=top_k)
    context = rag_instance.get_context(domain, query, top_k=context_top_k, max_chars=_CONTEXT_MAX_CHARS)

    # Try expanded query if no results
    if not results:
        expanded = expand_tarot_query(query)
        if expanded != query:
            expanded_query = expanded
            results = rag_instance.search(domain, expanded, top_k=top_k)
            context = rag_instance.get_context(domain, expanded, top_k=context_top_k, max_chars=_CONTEXT_MAX_CHARS)

    # Try fallback queries if still no results
    if not results:
        for candidate in get_fallback_tarot_queries(query):
            results = rag_instance.search(domain, candidate, top_k=top_k)
            context = rag_instance.get_context(domain, candidate, top_k=context_top_k, max_chars=_CONTEXT_MAX_CHARS)
            if results:
                fallback_query = candidate
                break

    return results, context, expanded_query, fallback_query
