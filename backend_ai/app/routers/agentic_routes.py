"""
Agentic RAG Routes
NER entity extraction, deep graph traversal, and multi-hop connections.
Extracted from app.py for better maintainability.
"""
import logging
from flask import Blueprint, request, jsonify

logger = logging.getLogger(__name__)

# Blueprint definition
agentic_bp = Blueprint('agentic', __name__, url_prefix='/agentic')

# ===============================================================
# Lazy-loaded dependencies
# ===============================================================
_agentic_module = None
HAS_AGENTIC = True


def _get_agentic_module():
    """Lazy load agentic_rag module."""
    global _agentic_module, HAS_AGENTIC
    if _agentic_module is None:
        try:
            from backend_ai.app import agentic_rag as _ar
            _agentic_module = _ar
        except ImportError as e:
            logger.warning(f"[Agentic] Could not import agentic_rag: {e}")
            HAS_AGENTIC = False
            return None
    return _agentic_module


def agentic_query(*args, **kwargs):
    """Lazy wrapper for agentic_query."""
    mod = _get_agentic_module()
    return mod.agentic_query(*args, **kwargs) if mod else None


def get_entity_extractor(*args, **kwargs):
    """Lazy wrapper for get_entity_extractor."""
    mod = _get_agentic_module()
    return mod.get_entity_extractor(*args, **kwargs) if mod else None


def get_deep_traversal(*args, **kwargs):
    """Lazy wrapper for get_deep_traversal."""
    mod = _get_agentic_module()
    return mod.get_deep_traversal(*args, **kwargs) if mod else None


# ===============================================================
# ROUTE HANDLERS
# ===============================================================

@agentic_bp.route('/query', methods=['POST'])
def agentic_rag_query():
    """
    Execute agentic RAG query with all next-level features:
    - Entity Extraction (NER)
    - Deep Graph Traversal (Multi-hop)
    - Agentic Workflow (LangGraph-style)

    Request body:
    {
        "query": "목성이 사수자리에 있을 때 9하우스의 영향은?",
        "facts": {...},  // Optional: Saju/Astro facts
        "locale": "ko",
        "theme": "life_path"
    }
    """
    if not HAS_AGENTIC:
        return jsonify({"status": "error", "message": "Agentic RAG module not available"}), 501

    try:
        data = request.get_json(force=True)

        query = data.get("query", "")
        facts = data.get("facts", {})
        locale = data.get("locale", "ko")
        theme = data.get("theme", "life_path")

        if not query:
            return jsonify({"status": "error", "message": "query is required"}), 400

        result = agentic_query(
            query=query,
            facts=facts,
            locale=locale,
            theme=theme,
        )

        return jsonify(result)

    except Exception as e:
        logger.exception(f"[ERROR] /agentic/query failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@agentic_bp.route('/extract-entities', methods=['POST'])
def agentic_extract_entities():
    """
    Extract entities from text using NER.

    Request body:
    {
        "text": "Jupiter in Sagittarius in the 9th house"
    }
    """
    if not HAS_AGENTIC:
        return jsonify({"status": "error", "message": "Agentic RAG module not available"}), 501

    try:
        data = request.get_json(force=True)
        text = data.get("text", "")

        if not text:
            return jsonify({"status": "error", "message": "text is required"}), 400

        extractor = get_entity_extractor()
        entities = extractor.extract(text)
        relations = extractor.extract_relations(text)

        return jsonify({
            "status": "success",
            "entities": [
                {
                    "text": e.text,
                    "type": e.type.value,
                    "normalized": e.normalized,
                    "confidence": e.confidence,
                }
                for e in entities
            ],
            "relations": [
                {
                    "source": r[0].normalized,
                    "relation": r[1],
                    "target": r[2].normalized,
                }
                for r in relations
            ],
            "stats": {
                "entities_count": len(entities),
                "relations_count": len(relations),
                "entity_types": list(set(e.type.value for e in entities)),
            },
        })

    except Exception as e:
        logger.exception(f"[ERROR] /agentic/extract-entities failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@agentic_bp.route('/deep-traverse', methods=['POST'])
def agentic_deep_traverse():
    """
    Perform multi-hop graph traversal.

    Request body:
    {
        "start_entities": ["Jupiter", "Sagittarius"],
        "max_depth": 3,
        "max_paths": 5
    }
    """
    if not HAS_AGENTIC:
        return jsonify({"status": "error", "message": "Agentic RAG module not available"}), 501

    try:
        data = request.get_json(force=True)

        start_entities = data.get("start_entities", [])
        max_depth = data.get("max_depth", 3)
        max_paths = data.get("max_paths", 10)

        if not start_entities:
            return jsonify({"status": "error", "message": "start_entities is required"}), 400

        traversal = get_deep_traversal()
        if not traversal:
            return jsonify({"status": "error", "message": "Graph not available for traversal"}), 501

        paths = traversal.traverse(
            start_entities=start_entities,
            max_depth=max_depth,
            max_paths=max_paths,
        )

        return jsonify({
            "status": "success",
            "paths": [
                {
                    "nodes": p.nodes,
                    "edges": p.edges,
                    "context": p.context,
                    "weight": p.total_weight,
                }
                for p in paths
            ],
            "stats": {
                "paths_count": len(paths),
                "max_path_length": max(len(p.nodes) for p in paths) if paths else 0,
                "start_entities": start_entities,
            },
        })

    except Exception as e:
        logger.exception(f"[ERROR] /agentic/deep-traverse failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@agentic_bp.route('/find-connections', methods=['POST'])
def agentic_find_connections():
    """
    Find all paths connecting two entities.

    Example: Find how Jupiter connects to Philosophy
    Jupiter → Sagittarius → 9th House → Philosophy

    Request body:
    {
        "entity1": "Jupiter",
        "entity2": "Philosophy",
        "max_depth": 4
    }
    """
    if not HAS_AGENTIC:
        return jsonify({"status": "error", "message": "Agentic RAG module not available"}), 501

    try:
        data = request.get_json(force=True)

        entity1 = data.get("entity1", "")
        entity2 = data.get("entity2", "")
        max_depth = data.get("max_depth", 4)

        if not entity1 or not entity2:
            return jsonify({"status": "error", "message": "entity1 and entity2 are required"}), 400

        traversal = get_deep_traversal()
        if not traversal:
            return jsonify({"status": "error", "message": "Graph not available for traversal"}), 501

        paths = traversal.find_connections(
            entity1=entity1,
            entity2=entity2,
            max_depth=max_depth,
        )

        return jsonify({
            "status": "success",
            "entity1": entity1,
            "entity2": entity2,
            "paths": [
                {
                    "nodes": p.nodes,
                    "edges": p.edges,
                    "context": p.context,
                    "weight": p.total_weight,
                    "path_string": " → ".join(p.nodes),
                }
                for p in paths
            ],
            "connections_found": len(paths),
        })

    except Exception as e:
        logger.exception(f"[ERROR] /agentic/find-connections failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
