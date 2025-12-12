import json
import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1] / "app"))

from saju_astro_rag import GraphRAG  # noqa: E402


@pytest.mark.smoke
def test_graph_rag_returns_edges_and_context():
    rag = GraphRAG()
    facts = {"astro": {"planets": [{"name": "Sun", "sign": "Leo"}]}, "saju": {"facts": {"element": "wood"}}}
    result = rag.query(facts, top_k=5)

    assert "matched_nodes" in result
    assert "related_edges" in result
    assert isinstance(result["matched_nodes"], list)
    assert isinstance(result["related_edges"], list)
    # context_text should not be empty if embeddings exist
    assert "context_text" in result
    assert isinstance(result["context_text"], str)
    # Should return something non-empty when graph data is present
    if rag.node_embeds is not None and rag.node_embeds.size(0) > 0:
        assert len(result["matched_nodes"]) > 0


@pytest.mark.smoke
def test_rules_load_if_available(tmp_path):
    rag = GraphRAG()
    # rules are optional; just ensure attribute exists and is a dict
    assert isinstance(rag.rules, dict)


def test_graph_rag_json_roundtrip():
    """Ensure query result is JSON-serializable."""
    rag = GraphRAG()
    res = rag.query({"element": "water"}, top_k=3)
    json.dumps(res, ensure_ascii=False)
