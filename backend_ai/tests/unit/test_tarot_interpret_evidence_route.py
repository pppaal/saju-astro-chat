"""Route-level test for tarot interpret evidence enforcement."""

from __future__ import annotations

import json
from unittest.mock import patch

import pytest
from flask import Flask, g

from backend_ai.app.routers.tarot import create_tarot_blueprint


class _DummyRules:
    def get_followup_questions(self, *_args, **_kwargs):
        return []


class _DummyHybridRag:
    advanced_rules = _DummyRules()

    def build_reading_context(self, **_kwargs):
        return "retrieved support context"

    def get_card_insights(self, _card_name: str):
        return {
            "upright_meaning": "meaning upright",
            "reversed_meaning": "meaning reversed",
            "keywords": ["focus", "clarity"],
            "symbolism": "symbolic image",
            "advice": "act now",
            "chakras": [],
            "astrology": {},
            "shadow_work": "",
        }

    def get_card_deep_meaning(self, _card_name: str):
        return {"archetype": "hero", "journey_stage": "start", "life_lesson": "trust", "shadow_aspect": "fear"}

    def get_all_card_pair_interpretations(self, _names):
        return []

    def analyze_elemental_balance(self, _names):
        return {}

    def get_timing_hint(self, _name):
        return ""

    def get_jungian_archetype(self, _name):
        return {}

    def get_card_connections(self, _drawn_cards):
        return []


def _make_app():
    app = Flask(__name__)
    app.register_blueprint(create_tarot_blueprint())
    app.config["TESTING"] = True

    @app.before_request
    def _set_request_id():
        g.request_id = "test-req"

    return app


def test_interpret_includes_card_evidence_with_retry():
    app = _make_app()
    client = app.test_client()

    no_evidence = json.dumps(
        {
            "overall": "overall text",
            "cards": [{"position": "현재", "interpretation": "card interp"}],
            "advice": [{"title": "act", "detail": "detail"}],
        },
        ensure_ascii=False,
    )
    with_evidence = json.dumps(
        {
            "overall": "overall text",
            "cards": [{"position": "현재", "interpretation": "card interp"}],
            "card_evidence": [
                {
                    "card_id": "major_0",
                    "orientation": "upright",
                    "domain": "love",
                    "position": "현재",
                    "evidence": "근거 문장 하나. 근거 문장 둘.",
                }
            ],
            "advice": [{"title": "act", "detail": "detail"}],
        },
        ensure_ascii=False,
    )

    payload = {
        "category": "love",
        "spread_id": "single_card",
        "spread_title": "Single",
        "cards": [{"name": "The Fool", "is_reversed": False, "position": "현재"}],
        "draws": [{"card_id": "major_0", "orientation": "upright", "domain": "love", "position": "현재"}],
        "user_question": "연락이 올까요?",
        "language": "ko",
    }

    with patch("backend_ai.app.routers.tarot.interpret.has_tarot", return_value=True), \
        patch("backend_ai.app.routers.tarot.interpret.get_tarot_hybrid_rag", return_value=_DummyHybridRag()), \
        patch("backend_ai.app.routers.tarot.interpret.get_cache", return_value=None), \
        patch("backend_ai.app.routers.tarot.interpret.HAS_GRAPH_RAG", False), \
        patch("backend_ai.app.routers.tarot.interpret.generate_dynamic_followup_questions", return_value=[]), \
        patch("backend_ai.app.routers.tarot.interpret.generate_with_gpt4", side_effect=[no_evidence, with_evidence]):
        resp = client.post("/api/tarot/interpret", data=json.dumps(payload), content_type="application/json")

    assert resp.status_code == 200
    data = resp.get_json()
    assert "card_evidence" in data
    assert len(data["card_evidence"]) == 1
    assert data["card_evidence"][0]["card_id"] == "major_0"
    assert "Card Evidence" in data["overall_message"]


def test_interpret_returns_400_on_invalid_draws():
    app = _make_app()
    client = app.test_client()

    payload = {
        "category": "love",
        "spread_id": "single_card",
        "spread_title": "Single",
        "cards": [{"name": "The Fool", "is_reversed": False, "position": "present"}],
        "draws": [{"card_id": "INVALID_CARD", "orientation": "up", "domain": "romance", "position": "not_in_spread"}],
        "user_question": "Will they text me?",
        "language": "ko",
    }

    with patch("backend_ai.app.routers.tarot.interpret.has_tarot", return_value=True):
        resp = client.post("/api/tarot/interpret", data=json.dumps(payload), content_type="application/json")

    assert resp.status_code == 400
    body = resp.get_json()
    assert body["message"] == "Invalid draws payload"
    assert isinstance(body.get("errors"), list)
    fields = {row["field"] for row in body["errors"]}
    assert "card_id" in fields
    assert "orientation" in fields
    assert "domain" in fields
    assert "position" in fields


@pytest.mark.parametrize(
    "category,user_question",
    [
        ("love", "연애 흐름이 궁금해요"),
        ("career", "이직 타이밍이 맞을까요"),
        ("money", "이번 달 금전운은 어떤가요"),
        ("general", "전반 운세를 알려주세요"),
        ("love", "재회 가능성이 있을까요"),
        ("career", "프로젝트 성과가 날까요"),
        ("money", "투자 결정을 미뤄야 할까요"),
        ("general", "요즘 막히는 이유가 뭘까요"),
        ("love", "연락이 끊겼는데 다시 이어질까요"),
        ("career", "상사와 관계를 개선하려면"),
        ("money", "지출 통제를 어떻게 시작할까요"),
        ("general", "이번 주 중요한 포인트는"),
        ("love", "소개팅 이후 흐름이 궁금해요"),
        ("career", "승진 가능성이 있나요"),
        ("money", "부수입 시도를 해도 될까요"),
        ("general", "내 선택이 맞는지 불안해요"),
        ("love", "상대의 진심을 알고 싶어요"),
        ("career", "새로운 제안을 받아도 될까요"),
        ("money", "계약 관련 운이 좋을까요"),
        ("general", "오늘 결정을 내려도 될까요"),
    ],
)
def test_interpret_smoke_20_has_card_evidence_section(category, user_question):
    app = _make_app()
    client = app.test_client()

    llm_response = json.dumps(
        {
            "overall": "전체 해석입니다.",
            "cards": [{"position": "present", "interpretation": "카드 해석"}],
            "card_evidence": [
                {
                    "card_id": "MAJOR_0",
                    "orientation": "upright",
                    "domain": "love" if category == "love" else "general" if category == "general" else category,
                    "position": "present",
                    "evidence": "첫 번째 근거 문장입니다. 두 번째 근거 문장입니다.",
                }
            ],
            "advice": [{"title": "action", "detail": "실행 조언"}],
        },
        ensure_ascii=False,
    )

    payload = {
        "category": category,
        "spread_id": "single_card",
        "spread_title": "Single",
        "cards": [{"name": "The Fool", "is_reversed": False, "position": "present"}],
        "user_question": user_question,
        "language": "ko",
    }

    with patch("backend_ai.app.routers.tarot.interpret.has_tarot", return_value=True), \
        patch("backend_ai.app.routers.tarot.interpret.get_tarot_hybrid_rag", return_value=_DummyHybridRag()), \
        patch("backend_ai.app.routers.tarot.interpret.get_cache", return_value=None), \
        patch("backend_ai.app.routers.tarot.interpret.HAS_GRAPH_RAG", False), \
        patch("backend_ai.app.routers.tarot.interpret.generate_dynamic_followup_questions", return_value=[]), \
        patch("backend_ai.app.routers.tarot.interpret.generate_with_gpt4", return_value=llm_response):
        resp = client.post("/api/tarot/interpret", data=json.dumps(payload), content_type="application/json")

    assert resp.status_code == 200
    data = resp.get_json()
    assert "Card Evidence" in data["overall_message"]
    assert len(data["card_evidence"]) == 1
