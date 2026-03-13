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

    def build_combination_summaries(self, *_args, **_kwargs):
        return [
            {
                "type": "pair",
                "cards": ["The Fool", "The Magician"],
                "pair_key": "MAJOR_0||MAJOR_1",
                "rule_id": "tarot_pair::pair_csv::major_0_major_1",
                "source": "pair_csv",
                "theme_field": "love",
                "focus": "새로운 시작과 실행력이 함께 움직입니다.",
                "advice": "서두르지 말고 흐름을 확인하세요.",
                "element_relation": "supportive",
            }
        ]

    def get_timing_hint_details(self, *_args, **_kwargs):
        return None

    def detect_crisis_situation(self, *_args, **_kwargs):
        return None

    def get_multi_card_rule_matches(self, *_args, **_kwargs):
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

    def get_pattern_analysis(self, _drawn_cards):
        return {}

    def get_spread_info(self, _theme, _sub_topic):
        return {"spread_name": "Three Card Spread", "card_count": 3}


class _DummyRulesWithExtendedIds(_DummyRules):
    def get_timing_hint_details(self, card_name, *_args, **_kwargs):
        return {
            "rule_id": f"tarot_timing::immediate::{card_name.lower().replace(' ', '_')}",
            "category": "immediate",
            "card_name": card_name,
            "message": "즉시: 1-7 days",
        }

    def detect_crisis_situation(self, *_args, **_kwargs):
        return {
            "detected": True,
            "crisis_type": "breakup",
            "crisis_name": "이별/관계 종료",
            "severity": "moderate",
            "professional_help_needed": False,
            "rule_id": "tarot_crisis::breakup::question_keyword",
            "trigger": "question_keyword",
        }

    def get_multi_card_rule_matches(self, *_args, **_kwargs):
        return [
            {
                "rule_id": "tarot_multi::theme_focus::love",
                "message": "관계 흐름을 먼저 보세요.",
            },
            {
                "rule_id": "tarot_multi::suit_dominance::cups",
                "message": "감정이 읽기를 주도합니다.",
            },
        ]


class _DummyHybridRagWithExtendedIds(_DummyHybridRag):
    advanced_rules = _DummyRulesWithExtendedIds()


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

    intent_response = json.dumps(
        {
            "primary_intent": "feelings",
            "secondary_intents": ["timing"],
            "confidence": 0.84,
            "reason": "상대의 연락과 감정 흐름을 함께 묻는 질문",
        },
        ensure_ascii=False,
    )
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
        patch("backend_ai.app.routers.tarot.interpret.generate_with_gpt4", side_effect=[intent_response, no_evidence, with_evidence]):
        resp = client.post("/api/tarot/interpret", data=json.dumps(payload), content_type="application/json")

    assert resp.status_code == 200
    data = resp.get_json()
    assert "card_evidence" in data
    assert len(data["card_evidence"]) == 1
    assert data["card_evidence"][0]["card_id"] == "major_0"
    assert "Card Evidence" in data["overall_message"]
    assert data["used_rule_ids"] == ["tarot_pair::pair_csv::major_0_major_1"]
    assert data["trace"]["used_rule_ids"] == ["tarot_pair::pair_csv::major_0_major_1"]
    assert data["trace"]["combination_sources"][0]["rule_id"] == "tarot_pair::pair_csv::major_0_major_1"
    assert data["trace"]["intent"]["understanding_source"] == "gpt_first"


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


def test_interpret_trace_includes_graph_node_ids_and_sources():
    app = _make_app()
    client = app.test_client()

    intent_response = json.dumps(
        {
            "primary_intent": "relationship_general",
            "secondary_intents": [],
            "confidence": 0.79,
            "reason": "연애 흐름 전반을 묻는 질문",
        },
        ensure_ascii=False,
    )
    llm_response = json.dumps(
        {
            "overall": "전체 해석입니다.",
            "cards": [{"position": "present", "interpretation": "카드 해석"}],
            "card_evidence": [
                {
                    "card_id": "MAJOR_0",
                    "orientation": "upright",
                    "domain": "love",
                    "position": "present",
                    "evidence": "근거 문장 하나. 근거 문장 둘.",
                }
            ],
            "advice": [{"title": "action", "detail": "실행 조언"}],
        },
        ensure_ascii=False,
    )

    payload = {
        "category": "love",
        "spread_id": "single_card",
        "spread_title": "Single",
        "cards": [{"name": "The Fool", "is_reversed": False, "position": "present"}],
        "user_question": "연애 흐름이 궁금해요",
        "language": "ko",
    }

    graph_results = [
        {
            "node_id": "TAROT_NODE_001",
            "original_id": "TAROT_NODE_001",
            "text": "타로 The Fool upright meaning and new beginning guidance",
            "source": "tarot_corpus_v1.jsonl",
            "label": "The Fool Upright",
            "type": "tarot_card",
            "score": 0.91,
        },
        {
            "node_id": "OTHER_NODE_002",
            "original_id": "OTHER_NODE_002",
            "text": "unrelated finance memo for quarterly planning",
            "source": "other.json",
            "label": "Other",
            "type": "misc",
            "score": 0.22,
        },
    ]

    with patch("backend_ai.app.routers.tarot.interpret.has_tarot", return_value=True), \
        patch("backend_ai.app.routers.tarot.interpret.get_tarot_hybrid_rag", return_value=_DummyHybridRag()), \
        patch("backend_ai.app.routers.tarot.interpret.get_cache", return_value=None), \
        patch("backend_ai.app.routers.tarot.interpret.HAS_GRAPH_RAG", True), \
        patch("backend_ai.app.routers.tarot.interpret.search_graphs", return_value=graph_results), \
        patch("backend_ai.app.routers.tarot.interpret.generate_dynamic_followup_questions", return_value=[]), \
        patch("backend_ai.app.routers.tarot.interpret.generate_with_gpt4", side_effect=[intent_response, llm_response]):
        resp = client.post("/api/tarot/interpret", data=json.dumps(payload), content_type="application/json")

    assert resp.status_code == 200
    data = resp.get_json()
    assert data["trace"]["used_graph_node_ids"] == ["TAROT_NODE_001"]
    assert data["trace"]["graph_rag"]["node_ids"] == ["TAROT_NODE_001"]
    assert data["trace"]["graph_rag"]["sources"] == ["tarot_corpus_v1.jsonl"]
    assert data["trace"]["graph_rag"]["snippets"][0]["node_id"] == "TAROT_NODE_001"
    assert data["trace"]["graph_rag"]["snippets"][0]["source"] == "tarot_corpus_v1.jsonl"
    assert data["trace"]["intent"]["understanding_source"] == "gpt_first"
    assert "love" in data["trace"]["retrieval"]["query"]


def test_interpret_uses_gpt_first_intent_for_ambiguous_question():
    app = _make_app()
    client = app.test_client()

    intent_response = json.dumps(
        {
            "primary_intent": "decision",
            "secondary_intents": ["timing"],
            "confidence": 0.82,
            "reason": "짧고 애매한 문장이라 결정을 묻는 질문으로 판단",
        },
        ensure_ascii=False,
    )
    llm_response = json.dumps(
        {
            "overall": "전체 해석입니다.",
            "cards": [{"position": "present", "interpretation": "카드 해석"}],
            "card_evidence": [
                {
                    "card_id": "MAJOR_0",
                    "orientation": "upright",
                    "domain": "general",
                    "position": "present",
                    "evidence": "근거 문장 하나. 근거 문장 둘.",
                }
            ],
            "advice": [{"title": "action", "detail": "실행 조언"}],
        },
        ensure_ascii=False,
    )

    payload = {
        "category": "general",
        "spread_id": "single_card",
        "spread_title": "Single",
        "cards": [{"name": "The Fool", "is_reversed": False, "position": "present"}],
        "user_question": "어떨까?",
        "language": "ko",
    }

    with patch("backend_ai.app.routers.tarot.interpret.has_tarot", return_value=True), \
        patch("backend_ai.app.routers.tarot.interpret.get_tarot_hybrid_rag", return_value=_DummyHybridRag()), \
        patch("backend_ai.app.routers.tarot.interpret.get_cache", return_value=None), \
        patch("backend_ai.app.routers.tarot.interpret.HAS_GRAPH_RAG", False), \
        patch("backend_ai.app.routers.tarot.interpret.generate_dynamic_followup_questions", return_value=[]), \
        patch("backend_ai.app.routers.tarot.interpret.generate_with_gpt4", side_effect=[intent_response, llm_response]):
        resp = client.post("/api/tarot/interpret", data=json.dumps(payload), content_type="application/json")

    assert resp.status_code == 200
    data = resp.get_json()
    assert data["trace"]["intent"]["primary_intent"] == "decision"
    assert data["trace"]["intent"]["secondary_intents"] == ["timing"]
    assert data["trace"]["intent"]["llm_understanding_used"] is True
    assert data["trace"]["intent"]["understanding_source"] == "gpt_first"
    assert "decision" in data["trace"]["retrieval"]["query"]
    assert "시기" in data["trace"]["retrieval"]["query"]
    assert data["trace"]["intent"]["llm_reason"] == "짧고 애매한 문장이라 결정을 묻는 질문으로 판단"
    assert data["trace"]["intent_priority"]["priority_order"][:3] == ["multi_card", "combination", "timing"]


def test_interpret_used_rule_ids_include_timing_crisis_and_multi_card():
    app = _make_app()
    client = app.test_client()

    intent_response = json.dumps(
        {
            "primary_intent": "reconciliation",
            "secondary_intents": ["breakup"],
            "confidence": 0.9,
            "reason": "이별 이후 재회 가능성을 먼저 묻는 질문",
        },
        ensure_ascii=False,
    )
    llm_response = json.dumps(
        {
            "overall": "전체 해석입니다.",
            "cards": [
                {"position": "past", "interpretation": "과거 카드 해석"},
                {"position": "present", "interpretation": "현재 카드 해석"},
                {"position": "future", "interpretation": "미래 카드 해석"},
            ],
            "card_evidence": [
                {
                    "card_id": "MAJOR_0",
                    "orientation": "upright",
                    "domain": "love",
                    "position": "past",
                    "evidence": "근거 문장 하나. 근거 문장 둘.",
                },
                {
                    "card_id": "MAJOR_1",
                    "orientation": "upright",
                    "domain": "love",
                    "position": "present",
                    "evidence": "근거 문장 하나. 근거 문장 둘.",
                },
                {
                    "card_id": "MAJOR_2",
                    "orientation": "upright",
                    "domain": "love",
                    "position": "future",
                    "evidence": "근거 문장 하나. 근거 문장 둘.",
                },
            ],
            "advice": [{"title": "action", "detail": "실행 조언"}],
        },
        ensure_ascii=False,
    )

    payload = {
        "category": "love",
        "spread_id": "three_card",
        "spread_title": "Three Card",
        "cards": [
            {"name": "The Fool", "is_reversed": False, "position": "past"},
            {"name": "The Magician", "is_reversed": False, "position": "present"},
            {"name": "The High Priestess", "is_reversed": False, "position": "future"},
        ],
        "user_question": "이별 이후 다시 이어질 수 있을까요?",
        "language": "ko",
    }

    with patch("backend_ai.app.routers.tarot.interpret.has_tarot", return_value=True), \
        patch("backend_ai.app.routers.tarot.interpret.get_tarot_hybrid_rag", return_value=_DummyHybridRagWithExtendedIds()), \
        patch("backend_ai.app.routers.tarot.interpret.get_cache", return_value=None), \
        patch("backend_ai.app.routers.tarot.interpret.HAS_GRAPH_RAG", False), \
        patch("backend_ai.app.routers.tarot.interpret.generate_dynamic_followup_questions", return_value=[]), \
        patch("backend_ai.app.routers.tarot.interpret.generate_with_gpt4", side_effect=[intent_response, llm_response]):
        resp = client.post("/api/tarot/interpret", data=json.dumps(payload), content_type="application/json")

    assert resp.status_code == 200
    data = resp.get_json()
    assert data["used_rule_ids"] == [
        "tarot_pair::pair_csv::major_0_major_1",
        "tarot_timing::immediate::the_fool",
        "tarot_crisis::breakup::question_keyword",
        "tarot_multi::theme_focus::love",
        "tarot_multi::suit_dominance::cups",
    ]
    assert data["trace"]["timing_rule"]["rule_id"] == "tarot_timing::immediate::the_fool"
    assert [row["rule_id"] for row in data["trace"]["timing_rules"]] == ["tarot_timing::immediate::the_fool"]
    assert data["trace"]["crisis_rule"]["rule_id"] == "tarot_crisis::breakup::question_keyword"
    assert [row["rule_id"] for row in data["trace"]["multi_card_rules"]] == [
        "tarot_multi::theme_focus::love",
        "tarot_multi::suit_dominance::cups",
    ]
    assert data["trace"]["intent"]["primary_intent"] == "reconciliation"
    assert "breakup" in data["trace"]["intent"]["secondary_intents"]
    assert data["trace"]["intent"]["confidence"] >= 0.76
    assert data["trace"]["intent"]["understanding_source"] == "gpt_first"
    assert "reconciliation" in data["trace"]["retrieval"]["query"]
    assert data["trace"]["intent_priority"]["priority_order"][:4] == ["combination", "multi_card", "timing", "graph"]


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
    assert data["used_rule_ids"] == ["tarot_pair::pair_csv::major_0_major_1"]
