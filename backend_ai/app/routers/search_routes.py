"""
RAG search routes - Domain and Hybrid search endpoints.

Extracted from app.py as part of Phase 1.1 refactoring.
Helper functions moved to services/rag_context_service.py in Phase 1.3.
"""
from flask import Blueprint, request, jsonify, g
import logging

# Import helper functions from service layer
from backend_ai.app.services.rag_context_service import (
    expand_tarot_query,
    get_fallback_tarot_queries,
    build_tarot_search_context
)

logger = logging.getLogger(__name__)

# Create Blueprint
search_bp = Blueprint('search', __name__)

# Domain RAG domains (should be moved to config later)
DOMAIN_RAG_DOMAINS = ["destiny_map", "tarot", "dream", "iching"]


# Legacy function names for backward compatibility (deprecated)
# These now just call the service layer functions
def _expand_tarot_query(query: str) -> str:
    """DEPRECATED: Use expand_tarot_query from rag_context_service instead."""
    return expand_tarot_query(query)


def _fallback_tarot_queries(query: str) -> list:
    """DEPRECATED: Use get_fallback_tarot_queries from rag_context_service instead."""
    return get_fallback_tarot_queries(query)


@search_bp.route("/api/search/domain", methods=["POST"])
def domain_rag_search():
    """
    Lightweight domain search over precomputed embeddings.
    body: { "domain": "destiny_map|tarot|dream|iching", "query": "...", "top_k": 5 }
    """
    # Import lazy-loaded modules
    try:
        from backend_ai.app.app import HAS_DOMAIN_RAG, get_domain_rag
    except ImportError:
        return jsonify({"status": "error", "message": "Domain RAG imports failed"}), 501

    if not HAS_DOMAIN_RAG:
        return jsonify({"status": "error", "message": "DomainRAG not available"}), 501

    try:
        data = request.get_json(force=True)
        domain = (data.get("domain") or "").strip()
        query = (data.get("query") or "").strip()
        top_k = int(data.get("top_k", 5))
        top_k = max(1, min(top_k, 20))

        if not query:
            return jsonify({"status": "error", "message": "query is required"}), 400

        rag = get_domain_rag()
        if not rag:
            return jsonify({"status": "error", "message": "DomainRAG not available"}), 501

        if not domain or domain not in DOMAIN_RAG_DOMAINS:
            return jsonify({
                "status": "error",
                "message": f"domain must be one of {DOMAIN_RAG_DOMAINS}",
            }), 400

        rag.load_domain(domain)

        results = rag.search(domain, query, top_k=top_k)
        context = rag.get_context(domain, query, top_k=min(top_k, 3), max_chars=1500)
        expanded_query = ""
        fallback_query = ""

        # Tarot-specific query expansion and fallback
        if domain == "tarot" and not results:
            expanded_query = _expand_tarot_query(query)
            if expanded_query != query:
                results = rag.search(domain, expanded_query, top_k=top_k)
                context = rag.get_context(domain, expanded_query, top_k=min(top_k, 3), max_chars=1500)

        if domain == "tarot" and not results:
            for candidate in _fallback_tarot_queries(query):
                results = rag.search(domain, candidate, top_k=top_k)
                context = rag.get_context(domain, candidate, top_k=min(top_k, 3), max_chars=1500)
                if results:
                    fallback_query = candidate
                    break

        return jsonify({
            "status": "success",
            "domain": domain,
            "query": query,
            "expanded_query": expanded_query or None,
            "fallback_query": fallback_query or None,
            "results": results,
            "context": context,
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/search/domain failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@search_bp.route("/api/search/hybrid", methods=["POST"])
def hybrid_rag_search():
    """
    Hybrid search (vector + BM25 + graph, optional rerank).
    body: { "query": "...", "top_k": 8, "rerank": true, "graph_root": "<optional>" }
    """
    # Import lazy-loaded modules
    try:
        from backend_ai.app.app import HAS_HYBRID_RAG, hybrid_search, build_rag_context
    except ImportError:
        return jsonify({"status": "error", "message": "Hybrid RAG imports failed"}), 501

    if not HAS_HYBRID_RAG:
        return jsonify({"status": "error", "message": "Hybrid RAG not available"}), 501

    try:
        data = request.get_json(force=True)
        query = (data.get("query") or "").strip()
        top_k = int(data.get("top_k", 8))
        top_k = max(1, min(top_k, 30))
        rerank = bool(data.get("rerank", True))
        graph_root = data.get("graph_root")

        if not query:
            return jsonify({"status": "error", "message": "query is required"}), 400

        results = hybrid_search(
            query=query,
            top_k=top_k,
            use_reranking=rerank,
            graph_root=graph_root,
        )
        context = build_rag_context(query, top_k=min(12, max(top_k, 6)))

        return jsonify({
            "status": "success",
            "query": query,
            "top_k": top_k,
            "rerank": rerank,
            "results": results,
            "context": context,
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/search/hybrid failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
