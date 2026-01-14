"""
RAG Context Service

Helper functions for building RAG search context and query processing.
Extracted from search_routes.py as part of Phase 1.3 refactoring.

Functions:
- expand_tarot_query: Add multilingual hints for better tarot search
- get_fallback_tarot_queries: Generate fallback queries when search returns empty
"""
from typing import List
import logging

logger = logging.getLogger(__name__)


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

    # ========================================================================
    # English to Korean hints
    # ========================================================================

    if any(k in lower for k in ["business", "startup", "entrepreneur", "start a business", "company"]):
        extras.append("사업 창업")

    if any(k in lower for k in ["career", "job", "work", "promotion", "interview", "resume"]):
        extras.append("직장 커리어 이직")

    if any(k in lower for k in ["love", "relationship", "dating", "partner", "marriage", "breakup", "ex"]):
        extras.append("연애 관계 결혼")

    if any(k in lower for k in ["travel", "trip", "journey", "move", "relocation", "relocate"]):
        extras.append("여행 이동 이사")

    if any(k in lower for k in ["blocking", "blockage", "stuck", "progress", "obstacle", "challenge"]):
        extras.append("장애물 정체 성장")

    if any(k in lower for k in ["strength", "strengths", "talent", "ability"]):
        extras.append("강점 재능")

    if any(k in lower for k in ["money", "finance", "financial", "invest", "investment", "stock", "stocks", "crypto", "bitcoin"]):
        extras.append("재물 돈 투자")

    if any(k in lower for k in ["health", "ill", "sick", "anxiety", "stress", "depression", "mental"]):
        extras.append("건강 마음 불안")

    if any(k in lower for k in ["decision", "choice", "choose", "should i", "which", "either", "vs"]):
        extras.append("선택 결정")

    if any(k in lower for k in ["timing", "when", "soon", "next", "this year", "next year"]):
        extras.append("타이밍 시기")

    if any(k in lower for k in ["family", "parents", "child", "children"]):
        extras.append("가족 관계")

    if any(k in lower for k in ["study", "school", "exam", "test"]):
        extras.append("시험 공부")

    # ========================================================================
    # Korean to English hints
    # ========================================================================

    if any(k in query for k in ["사업", "창업", "자영업", "스타트업"]):
        extras.append("business startup")

    if any(k in query for k in ["직장", "커리어", "이직", "취업", "직무", "면접", "승진", "연봉", "업무"]):
        extras.append("career job work")

    if any(k in query for k in ["연애", "사랑", "관계", "결혼", "이별", "재회", "궁합", "썸", "짝사랑", "전남친", "전여친", "그 사람", "상대", "상대방", "마음", "호감"]):
        extras.append("love relationship")

    if any(k in query for k in ["돈", "재물", "금전", "재정", "투자", "주식", "코인", "부동산", "대출", "빚", "저축", "수입", "월급", "수익"]):
        extras.append("money finance investment")

    if any(k in query for k in ["건강", "몸", "우울", "불안", "스트레스", "병", "치료", "회복", "멘탈"]):
        extras.append("health stress")

    if any(k in query for k in ["결정", "선택", "갈림길", "할까", "될까", "타이밍", "시기", "언제"]):
        extras.append("decision timing")

    if any(k in query for k in ["여행", "이사", "이동", "출장"]):
        extras.append("travel move")

    if any(k in query for k in ["강점", "장점", "재능", "능력"]):
        extras.append("strength identity")

    if any(k in query for k in ["막힘", "장애물", "정체", "진전", "방해"]):
        extras.append("obstacle growth")

    if any(k in query for k in ["가족", "부모", "자녀", "아이"]):
        extras.append("family")

    if any(k in query for k in ["공부", "시험", "합격", "수능", "자격증", "유학", "학업"]):
        extras.append("study exam")

    # ========================================================================
    # Return
    # ========================================================================

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

    # ========================================================================
    # English fallbacks
    # ========================================================================

    if any(k in lower for k in ["business", "startup", "entrepreneur", "start a business", "company"]):
        fallbacks.extend(["business", "career"])

    if any(k in lower for k in ["career", "job", "work", "promotion", "interview", "resume"]):
        fallbacks.extend(["career", "job"])

    if any(k in lower for k in ["love", "relationship", "dating", "partner", "marriage", "breakup", "ex"]):
        fallbacks.extend(["love", "relationship"])

    if any(k in lower for k in ["money", "finance", "financial", "invest", "investment", "stock", "stocks", "crypto", "bitcoin"]):
        fallbacks.extend(["money", "finance"])

    if any(k in lower for k in ["health", "ill", "sick", "anxiety", "stress", "depression", "mental"]):
        fallbacks.extend(["health", "stress"])

    if any(k in lower for k in ["decision", "choice", "choose", "should i", "which", "either", "vs"]):
        fallbacks.extend(["decision", "timing"])

    if any(k in lower for k in ["travel", "trip", "journey", "move", "relocation", "relocate"]):
        fallbacks.extend(["travel", "journey"])

    if any(k in lower for k in ["blocking", "blockage", "stuck", "progress", "obstacle", "challenge"]):
        fallbacks.extend(["obstacle", "challenge"])

    if any(k in lower for k in ["strength", "strengths", "talent", "ability"]):
        fallbacks.extend(["strength", "identity"])

    if any(k in lower for k in ["timing", "when", "soon", "next", "this year", "next year"]):
        fallbacks.extend(["timing", "when"])

    if any(k in lower for k in ["family", "parents", "child", "children"]):
        fallbacks.extend(["family"])

    if any(k in lower for k in ["study", "school", "exam", "test"]):
        fallbacks.extend(["study", "exam"])

    # ========================================================================
    # Korean fallbacks
    # ========================================================================

    if any(k in query for k in ["사업", "창업", "자영업", "스타트업"]):
        fallbacks.extend(["business", "career"])

    if any(k in query for k in ["직장", "커리어", "이직", "취업", "직무", "면접", "승진", "연봉", "업무"]):
        fallbacks.extend(["career", "job"])

    if any(k in query for k in ["연애", "사랑", "관계", "결혼", "이별", "재회", "궁합", "썸", "짝사랑", "전남친", "전여친", "그 사람", "상대", "상대방", "마음", "호감"]):
        fallbacks.extend(["love", "relationship"])

    if any(k in query for k in ["돈", "재물", "금전", "재정", "투자", "주식", "코인", "부동산", "대출", "빚", "저축", "수입", "월급", "수익"]):
        fallbacks.extend(["money", "finance"])

    if any(k in query for k in ["건강", "몸", "우울", "불안", "스트레스", "병", "치료", "회복", "멘탈"]):
        fallbacks.extend(["health", "stress"])

    if any(k in query for k in ["결정", "선택", "갈림길", "할까", "될까", "타이밍", "시기", "언제"]):
        fallbacks.extend(["decision", "timing"])

    if any(k in query for k in ["여행", "이사", "이동", "출장"]):
        fallbacks.extend(["travel", "journey"])

    if any(k in query for k in ["강점", "장점", "재능", "능력"]):
        fallbacks.extend(["strength", "identity"])

    if any(k in query for k in ["막힘", "장애물", "정체", "진전", "방해"]):
        fallbacks.extend(["obstacle", "challenge"])

    if any(k in query for k in ["가족", "부모", "자녀", "아이"]):
        fallbacks.extend(["family"])

    if any(k in query for k in ["공부", "시험", "합격", "수능", "자격증", "유학", "학업"]):
        fallbacks.extend(["study", "exam"])

    # ========================================================================
    # De-duplicate while preserving order
    # ========================================================================

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

def build_tarot_search_context(query: str, rag_instance, domain: str = "tarot", top_k: int = 5) -> tuple:
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
    expanded_query = ""
    fallback_query = ""

    # Try original query
    results = rag_instance.search(domain, query, top_k=top_k)
    context = rag_instance.get_context(domain, query, top_k=min(top_k, 3), max_chars=1500)

    # Try expanded query if no results
    if not results:
        expanded_query = expand_tarot_query(query)
        if expanded_query != query:
            results = rag_instance.search(domain, expanded_query, top_k=top_k)
            context = rag_instance.get_context(domain, expanded_query, top_k=min(top_k, 3), max_chars=1500)

    # Try fallback queries if still no results
    if not results:
        for candidate in get_fallback_tarot_queries(query):
            results = rag_instance.search(domain, candidate, top_k=top_k)
            context = rag_instance.get_context(domain, candidate, top_k=min(top_k, 3), max_chars=1500)
            if results:
                fallback_query = candidate
                break

    return results, context, expanded_query or None, fallback_query or None
