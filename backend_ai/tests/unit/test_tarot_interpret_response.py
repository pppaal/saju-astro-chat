from backend_ai.app.routers.tarot.interpret_response import _add_personalization


class _DummyHybridRag:
    def get_birth_card(self, _birthdate):
        return {
            "primary_card": "The Hermit",
            "korean": "은둔자",
            "traits": ["introspective"],
        }

    def get_year_card(self, _birthdate):
        return {
            "year_card": "The Star",
            "year_card_korean": "별",
            "korean": "희망",
            "advice": "trust the process",
        }

    def get_personalized_reading(self, _drawn_cards, _birthdate):
        return {"personal_connections": ["connection-a"]}

    def get_reading_narrative(self, _drawn_cards, _mapped_theme):
        return {
            "opening_hook": "opening",
            "tone": {"mood": "steady"},
            "resolution": "resolution",
            "card_connections": ["stale"],
        }

    def get_card_connections(self, _drawn_cards):
        return ["fresh-1", "fresh-2", "fresh-3"]


def test_add_personalization_uses_card_connection_engine():
    result = _add_personalization(
        result={},
        hybrid_rag=_DummyHybridRag(),
        drawn_cards=[{"name": "The Fool", "isReversed": False}],
        birthdate="1990-01-01",
        mapped_theme="love",
    )

    assert result["narrative"]["card_connections"] == ["fresh-1", "fresh-2", "fresh-3"]
