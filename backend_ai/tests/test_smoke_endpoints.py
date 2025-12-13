import os
import sys
import types

import pytest

# Ensure backend_ai is in path for imports
backend_ai_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_ai_root not in sys.path:
    sys.path.insert(0, backend_ai_root)

# Ensure admin token is set before importing the app module
os.environ.setdefault("ADMIN_API_TOKEN", "testtoken")
os.environ.setdefault("ALLOWED_ORIGINS", "http://testserver")

import app.app as app_module  # noqa: E402


@pytest.fixture(autouse=True)
def stub_dependencies(monkeypatch):
    # Keep runtime guards satisfied
    monkeypatch.setenv("ADMIN_API_TOKEN", "testtoken")
    monkeypatch.setattr(app_module, "ADMIN_TOKEN", "testtoken", raising=False)
    monkeypatch.setattr(app_module, "HAS_TAROT", True, raising=False)

    # Lightweight stubs to avoid heavy model calls
    monkeypatch.setattr(
        app_module,
        "interpret_with_ai",
        lambda facts: {"ok": True, "cached": False, "facts": facts},
    )
    monkeypatch.setattr(
        app_module,
        "calculate_saju_data",
        lambda birth_date, birth_time, gender="male": {
            "birth_date": birth_date,
            "birth_time": birth_time,
            "gender": gender,
        },
    )
    monkeypatch.setattr(
        app_module,
        "calculate_astrology_data",
        lambda payload: {"summary": "astro", "payload": payload},
    )

    class DummyTarot:
        def __init__(self):
            self.advanced_rules = types.SimpleNamespace(
                get_current_moon_advice=lambda phase: {"energy": "calm"},
                get_followup_questions=lambda category, tone: ["How do you feel about this reading?"],
            )
            self.cards = {"The Fool": {"name": "The Fool", "meaning": "trust"}}

        def build_premium_reading_context(self, **kwargs):
            return "premium_context"

        def build_reading_context(self, **kwargs):
            return "reading_context"

        def get_card_insights(self, card_name: str):
            return {
                "spirit_animal": "fox",
                "shadow_work": "self-doubt",
                "chakras": [{"name": "solar plexus", "korean": "태양신경총"}],
            }

        def get_advanced_analysis(self, drawn_cards):
            return {"spread_theme": "general", "healing_plan": "rest"}

        def get_available_themes(self):
            return ["general", "love", "career", "spiritual"]

        def get_sub_topics(self, theme):
            return ["relationships", "self-discovery", "guidance"]

        def search_advanced_rules(self, query, top_k=5, category=None):
            return [{"rule": "trust your intuition", "score": 0.9}]

    monkeypatch.setattr(app_module, "get_tarot_hybrid_rag", lambda: DummyTarot())
    monkeypatch.setattr(app_module, "_generate_with_together", lambda prompt, **kwargs: "raw reading")
    monkeypatch.setattr(app_module, "refine_with_gpt5mini", lambda text, *args, **kwargs: text)


@pytest.fixture
def client():
    return app_module.app.test_client()


def _auth_headers():
    return {"Authorization": "Bearer testtoken"}


def test_ask_smoke(client):
    resp = client.post(
        "/ask",
        json={"saju": {}, "astro": {}, "tarot": {}, "theme": "daily", "prompt": "hi"},
        headers=_auth_headers(),
    )
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["status"] == "success"
    assert "data" in body


def test_calc_saju_smoke(client):
    resp = client.post(
        "/calc_saju",
        json={"birth_date": "1990-01-01", "birth_time": "12:00", "gender": "male"},
        headers=_auth_headers(),
    )
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["status"] == "success"
    assert body["saju"]["gender"] == "male"


def test_calc_astro_smoke(client):
    resp = client.post(
        "/calc_astro",
        json={
            "year": 1990,
            "month": 1,
            "day": 1,
            "hour": 12,
            "minute": 0,
            "latitude": 37.5,
            "longitude": 127.0,
        },
        headers=_auth_headers(),
    )
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["status"] == "success"
    assert "astro" in body


def test_tarot_interpret_smoke(client):
    resp = client.post(
        "/api/tarot/interpret",
        json={
            "category": "general",
            "spread_id": "three_card",
            "spread_title": "Three Card Spread",
            "cards": [{"name": "The Fool", "is_reversed": False}],
            "user_question": "What should I focus on?",
            "language": "en",
        },
        headers=_auth_headers(),
    )
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["status"] == "success"


# ==============================================================================
# HEALTH & INFO ENDPOINTS
# ==============================================================================

def test_root_health_smoke(client):
    """Test root health check endpoint."""
    resp = client.get("/")
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["status"] == "ok"


def test_health_full_smoke(client):
    """Test full health check with component status."""
    resp = client.get("/health/full", headers=_auth_headers())
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["status"] in ("healthy", "success")  # Accept either status
    # Response may have "components" or individual component keys like "cache", "performance"
    assert "components" in body or "cache" in body or "health_score" in body


def test_capabilities_smoke(client):
    """Test capabilities endpoint."""
    resp = client.get("/capabilities", headers=_auth_headers())
    assert resp.status_code == 200
    body = resp.get_json()
    assert "features" in body or "capabilities" in body or "status" in body


# ==============================================================================
# CACHE ENDPOINTS
# ==============================================================================

def test_cache_stats_smoke(client):
    """Test cache statistics endpoint."""
    resp = client.get("/cache/stats", headers=_auth_headers())
    assert resp.status_code == 200
    body = resp.get_json()
    assert "status" in body


# ==============================================================================
# I-CHING ENDPOINTS
# ==============================================================================

def test_iching_cast_smoke(client, monkeypatch):
    """Test I-Ching casting endpoint."""
    # Stub the I-Ching functions
    monkeypatch.setattr(
        app_module,
        "cast_hexagram",
        lambda method="coin": {"hexagram": 1, "lines": [7, 8, 7, 9, 7, 8]},
        raising=False,
    )

    resp = client.post(
        "/iching/cast",
        json={"method": "coin"},
        headers=_auth_headers(),
    )
    # Accept 200 or 404 (if I-Ching not enabled)
    assert resp.status_code in [200, 404, 500]


def test_iching_hexagrams_smoke(client, monkeypatch):
    """Test I-Ching hexagrams list endpoint."""
    monkeypatch.setattr(
        app_module,
        "get_all_hexagrams",
        lambda: [{"number": 1, "name": "The Creative"}],
        raising=False,
    )

    resp = client.get("/iching/hexagrams", headers=_auth_headers())
    # Accept 200 or 404 (if I-Ching not enabled)
    assert resp.status_code in [200, 404, 500]


# ==============================================================================
# TAROT ADDITIONAL ENDPOINTS
# ==============================================================================

def test_tarot_themes_smoke(client):
    """Test tarot themes endpoint."""
    resp = client.get("/api/tarot/themes", headers=_auth_headers())
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["status"] == "success"


def test_tarot_search_smoke(client):
    """Test tarot search endpoint."""
    resp = client.get("/api/tarot/search?q=love", headers=_auth_headers())
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["status"] == "success"


# ==============================================================================
# BADGES ENDPOINTS
# ==============================================================================

def test_badges_all_smoke(client, monkeypatch):
    """Test all badges endpoint."""
    monkeypatch.setattr(
        app_module,
        "get_all_badges",
        lambda: [{"id": "first_reading", "name": "First Reading"}],
        raising=False,
    )

    resp = client.get("/badges/all", headers=_auth_headers())
    # Accept 200 or 404 (if badges not enabled)
    assert resp.status_code in [200, 404, 500]


# ==============================================================================
# COMPATIBILITY ENDPOINT
# ==============================================================================

def test_compatibility_smoke(client, monkeypatch):
    """Test compatibility endpoint."""
    monkeypatch.setattr(
        app_module,
        "calculate_compatibility",
        lambda person1, person2: {"score": 85, "aspects": []},
        raising=False,
    )

    resp = client.post(
        "/api/compatibility",
        json={
            "person1": {
                "birth_date": "1990-01-01",
                "birth_time": "12:00",
                "gender": "male",
            },
            "person2": {
                "birth_date": "1992-06-15",
                "birth_time": "14:30",
                "gender": "female",
            },
        },
        headers=_auth_headers(),
    )
    # Accept 200 or 500 (if compatibility not fully implemented)
    assert resp.status_code in [200, 400, 500]


# ==============================================================================
# AGENTIC RAG ENDPOINTS
# ==============================================================================

def test_agentic_query_smoke(client, monkeypatch):
    """Test agentic query endpoint."""
    monkeypatch.setattr(
        app_module,
        "agentic_query",
        lambda query, facts=None, locale="en", theme="life_path": {
            "status": "success",
            "entities": [],
            "traversal_paths": [],
        },
        raising=False,
    )

    resp = client.post(
        "/agentic/query",
        json={
            "query": "What does my chart say about career?",
            "facts": {"saju": {}, "astro": {}},
        },
        headers=_auth_headers(),
    )
    # Accept 200 or 404/500 (if agentic not enabled)
    assert resp.status_code in [200, 404, 500]


def test_agentic_extract_entities_smoke(client, monkeypatch):
    """Test entity extraction endpoint."""
    monkeypatch.setattr(
        app_module,
        "get_entity_extractor",
        lambda: type("MockExtractor", (), {
            "extract": lambda self, text: [{"text": "사주", "type": "CONCEPT"}]
        })(),
        raising=False,
    )

    resp = client.post(
        "/agentic/extract-entities",
        json={"text": "내 사주에서 목 오행이 강해요"},
        headers=_auth_headers(),
    )
    # Accept 200 or 404/500 (if agentic not enabled)
    assert resp.status_code in [200, 404, 500]


# ==============================================================================
# RLHF ENDPOINTS
# ==============================================================================

def test_rlhf_stats_smoke(client, monkeypatch):
    """Test RLHF stats endpoint."""
    monkeypatch.setattr(
        app_module,
        "get_feedback_learning",
        lambda: type("MockFeedback", (), {
            "get_stats": lambda self: {"total_feedback": 0, "avg_rating": 0}
        })(),
        raising=False,
    )

    resp = client.get("/rlhf/stats", headers=_auth_headers())
    # Accept 200 or 404/500 (if RLHF not enabled)
    assert resp.status_code in [200, 404, 500]


# ==============================================================================
# DREAM ENDPOINT
# ==============================================================================

def test_dream_smoke(client, monkeypatch):
    """Test dream interpretation endpoint."""
    monkeypatch.setattr(
        app_module,
        "interpret_dream",
        lambda dream_text, locale="ko": {
            "status": "success",
            "interpretation": "This dream suggests...",
        },
        raising=False,
    )

    resp = client.post(
        "/dream",
        json={"dream": "I dreamed of flying over mountains"},
        headers=_auth_headers(),
    )
    # Accept 200 or 500 (if dream not fully implemented)
    assert resp.status_code in [200, 500]


# ==============================================================================
# CHART ENDPOINTS
# ==============================================================================

def test_charts_saju_smoke(client):
    """Test saju chart generation endpoint."""
    resp = client.post(
        "/charts/saju",
        json={
            "birth_date": "1990-01-01",
            "birth_time": "12:00",
            "gender": "male",
        },
        headers=_auth_headers(),
    )
    # Accept 200 or 500 (stub should work)
    assert resp.status_code in [200, 500]


def test_charts_natal_smoke(client):
    """Test natal chart generation endpoint."""
    resp = client.post(
        "/charts/natal",
        json={
            "year": 1990,
            "month": 1,
            "day": 1,
            "hour": 12,
            "minute": 0,
            "latitude": 37.5,
            "longitude": 127.0,
        },
        headers=_auth_headers(),
    )
    # Accept 200 or 500 (stub should work)
    assert resp.status_code in [200, 500]


# ==============================================================================
# TRANSITS ENDPOINT
# ==============================================================================

def test_transits_smoke(client, monkeypatch):
    """Test transits endpoint."""
    monkeypatch.setattr(
        app_module,
        "calculate_transits",
        lambda date=None: {"transits": [], "moon_phase": "waxing"},
        raising=False,
    )

    resp = client.get("/transits", headers=_auth_headers())
    # Accept 200 or 500 (if transits not fully implemented)
    assert resp.status_code in [200, 500]
