#!/usr/bin/env python3
"""
E2E smoke simulator for tarot UX flow.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path
from typing import Any, Dict, List
from unittest.mock import patch

from flask import Flask, g

from tarot_audit_common import (
    REPO_ROOT,
    ensure_artifacts_dir,
    has_safety_notice,
    load_tarot_card_records,
    read_jsonl,
    sentence_count,
    should_require_safety_notice,
)

if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(REPO_ROOT / "backend_ai") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "backend_ai"))

from backend_ai.app.routers.tarot import create_tarot_blueprint  # noqa: E402
from backend_ai.app.tarot.spread_loader import get_spread_loader  # noqa: E402


class _DummyRules:
    def get_followup_questions(self, *_args, **_kwargs):
        return []


class _DummyHybridRag:
    advanced_rules = _DummyRules()

    def build_reading_context(self, **_kwargs):
        return "retrieved support context"

    def get_card_insights(self, _card_name: str):
        return {
            "upright_meaning": "Core meaning text.",
            "reversed_meaning": "Reversed meaning text.",
            "keywords": ["focus", "flow", "timing"],
            "symbolism": "Symbolic image cues.",
            "advice": "Action advice.",
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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Tarot E2E smoke simulator")
    parser.add_argument("--queries-path", default="data/eval/searchbox_queries.jsonl")
    parser.add_argument("--sample-size", type=int, default=100)
    parser.add_argument("--seed", type=int, default=11)
    parser.add_argument("--output-json", default="artifacts/e2e_smoke_report.json")
    parser.add_argument("--failures-dir", default="artifacts/failures")
    parser.add_argument("--max-overall-len", type=int, default=9000)
    return parser.parse_args()


def _make_app() -> Flask:
    app = Flask(__name__)
    app.register_blueprint(create_tarot_blueprint())
    app.config["TESTING"] = True

    @app.before_request
    def _rid():
        g.request_id = "e2e-audit"

    return app


def _pick_domain(query: str) -> str:
    q = query.lower()
    if any(k in q for k in ("연애", "재회", "연락", "소개팅", "ex", "love")):
        return "love"
    if any(k in q for k in ("면접", "이직", "퇴사", "직장", "career", "job")):
        return "career"
    if any(k in q for k in ("돈", "주식", "코인", "빚", "투자", "money")):
        return "money"
    return "general"


def _llm_factory(payload_cards: List[Dict[str, Any]], draws: List[Dict[str, Any]], query: str):
    def _fake_llm(_prompt: str, **_kwargs) -> str:
        safety_kind = should_require_safety_notice(query)
        safety_line = ""
        if safety_kind == "medical":
            safety_line = "의료 전문가 상담을 함께 받아보세요."
        elif safety_kind == "legal":
            safety_line = "법률 전문가와 상담해 세부 판단을 확인하세요."
        elif safety_kind == "investment":
            safety_line = "투자 결정은 리스크를 고려해 신중히 하세요."

        cards = []
        evidence = []
        for idx, c in enumerate(payload_cards):
            draw = draws[idx]
            cards.append({"position": c["position"], "interpretation": f"{c['name']} 해석 문장입니다. 흐름을 설명합니다."})
            evidence.append(
                {
                    "card_id": draw["card_id"],
                    "orientation": draw["orientation"],
                    "domain": draw["domain"],
                    "position": draw["position"],
                    "evidence": "첫 번째 근거 문장입니다. 두 번째 근거 문장입니다.",
                }
            )
        return json.dumps(
            {
                "overall": f"전체 흐름 요약입니다. {safety_line}".strip(),
                "cards": cards,
                "card_evidence": evidence,
                "advice": [{"title": "action", "detail": "실행 조언"}],
            },
            ensure_ascii=False,
        )

    return _fake_llm


def _validate_response(resp_json: Dict[str, Any], draws: List[Dict[str, Any]], max_overall_len: int, query: str) -> List[str]:
    errors: List[str] = []
    evidence = resp_json.get("card_evidence") if isinstance(resp_json.get("card_evidence"), list) else []
    insights = resp_json.get("card_insights") if isinstance(resp_json.get("card_insights"), list) else []
    overall = str(resp_json.get("overall_message") or "")

    if len(evidence) != len(draws):
        errors.append(f"evidence_count_mismatch:{len(evidence)}!={len(draws)}")
    for idx, row in enumerate(evidence[: len(draws)]):
        if not row.get("card_id") or not row.get("orientation") or not row.get("domain") or not row.get("position"):
            errors.append(f"evidence_fields_missing:{idx}")
        sc = sentence_count(str(row.get("evidence") or ""))
        if sc < 2 or sc > 3:
            errors.append(f"evidence_sentence_count_invalid:{idx}:{sc}")

    if len(insights) != len(draws):
        errors.append(f"default_interpretations_missing:{len(insights)}!={len(draws)}")

    if len(overall) > max_overall_len:
        errors.append(f"overall_too_long:{len(overall)}")

    safety_kind = should_require_safety_notice(query)
    if safety_kind and not has_safety_notice(overall, safety_kind):
        errors.append(f"safety_notice_missing:{safety_kind}")

    return errors


def main() -> int:
    args = parse_args()
    rng = random.Random(args.seed)
    rows = read_jsonl(Path(args.queries_path))
    rows = rows[: max(1, min(args.sample_size, len(rows)))]

    spread_loader = get_spread_loader()
    spread_catalog: Dict[tuple, Any] = {}
    for theme in spread_loader.get_available_themes():
        for st in spread_loader.get_sub_topics(theme):
            info = spread_loader.get_spread(theme, st["id"]) or {}
            positions = [str(p.get("title") or p.get("name") or "").strip() for p in (info.get("positions") or [])]
            spread_catalog[(theme, st["id"])] = {
                "theme_id": theme,
                "spread_id": st["id"],
                "card_count": int(info.get("card_count") or st.get("card_count") or 3),
                "title": str(info.get("title") or st.get("title") or st["id"]),
                "positions": positions,
            }
    fallback_spread = spread_catalog.get(("daily", "one_card")) or next(iter(spread_catalog.values()), None)
    card_records = load_tarot_card_records()
    card_records = [r for r in card_records if not str(r.get("card_id") or "").startswith("combo:")]

    app = _make_app()
    client = app.test_client()

    failures_dir = Path(args.failures_dir)
    failures_dir.mkdir(parents=True, exist_ok=True)

    total = 0
    passed = 0
    failures: List[Dict[str, Any]] = []
    safety_required = 0
    safety_passed = 0

    for idx, row in enumerate(rows, start=1):
        query = str(row.get("query") or "").strip()
        if not query:
            continue
        total += 1
        if should_require_safety_notice(query):
            safety_required += 1

        spread_id = str(row.get("expected_spread_class") or "quick-reading")
        # Use matching frontend spread if exists, fallback to 1-card.
        spread = None
        for (theme, sid), spec in spread_catalog.items():
            if sid == spread_id:
                spread = spec
                category = theme
                break
        if spread is None:
            spread = fallback_spread
            category = str(spread.get("theme_id") or "daily")
        if spread is None:
            raise RuntimeError("spread catalog fallback not found")

        domain = _pick_domain(query)
        spread_count = int(spread.get("card_count") or 1)
        positions = list(spread.get("positions") or [])
        if not positions:
            positions = [f"Card {i+1}" for i in range(spread_count)]
        sample_cards = rng.sample(card_records, k=min(spread_count, len(card_records)))
        payload_cards = []
        draws = []
        for ci in range(spread_count):
            card = sample_cards[ci % len(sample_cards)]
            is_reversed = bool(rng.randint(0, 1))
            orientation = "reversed" if is_reversed else "upright"
            position = positions[ci] if ci < len(positions) else f"Card {ci+1}"
            payload_cards.append(
                {
                    "name": str(card.get("card_name") or ""),
                    "is_reversed": is_reversed,
                    "position": position,
                }
            )
            draws.append(
                {
                    "card_id": str(card.get("card_id") or ""),
                    "orientation": orientation,
                    "domain": domain,
                    "position": position,
                }
            )

        request_payload = {
            "category": category,
            "spread_id": str(spread.get("spread_id") or "one_card"),
            "spread_title": str(spread.get("title") or "One Card"),
            "cards": payload_cards,
            "draws": draws,
            "user_question": query,
            "language": "ko",
        }

        with patch("backend_ai.app.routers.tarot.interpret.has_tarot", return_value=True), \
            patch("backend_ai.app.routers.tarot.interpret.get_tarot_hybrid_rag", return_value=_DummyHybridRag()), \
            patch("backend_ai.app.routers.tarot.interpret.get_cache", return_value=None), \
            patch("backend_ai.app.routers.tarot.interpret.HAS_GRAPH_RAG", False), \
            patch("backend_ai.app.routers.tarot.interpret.generate_dynamic_followup_questions", return_value=[]), \
            patch("backend_ai.app.routers.tarot.interpret.generate_with_gpt4", side_effect=_llm_factory(payload_cards, draws, query)):
            resp = client.post("/api/tarot/interpret", data=json.dumps(request_payload), content_type="application/json")

        fail_reasons: List[str] = []
        body = {}
        if resp.status_code != 200:
            fail_reasons.append(f"http_{resp.status_code}")
        else:
            body = resp.get_json() or {}
            fail_reasons.extend(_validate_response(body, draws, args.max_overall_len, query))
            safety_kind = should_require_safety_notice(query)
            if safety_kind and has_safety_notice(str(body.get("overall_message") or ""), safety_kind):
                safety_passed += 1

        if fail_reasons:
            failure_payload = {
                "case_index": idx,
                "query": query,
                "request_payload": request_payload,
                "status_code": resp.status_code,
                "response": body,
                "fail_reasons": fail_reasons,
            }
            case_path = failures_dir / f"case_{idx:03d}.json"
            case_path.write_text(json.dumps(failure_payload, ensure_ascii=False, indent=2), encoding="utf-8")
            failures.append({"case_index": idx, "query": query, "fail_reasons": fail_reasons, "path": str(case_path)})
        else:
            passed += 1

    report = {
        "total_cases": total,
        "passed_cases": passed,
        "failed_cases": len(failures),
        "pass_rate": (passed / total) if total else 0.0,
        "evidence_pass_rate": (passed / total) if total else 0.0,
        "safety_required_cases": safety_required,
        "safety_passed_cases": safety_passed,
        "safety_pass_rate": (safety_passed / safety_required) if safety_required else None,
        "failures": failures[:100],
    }

    ensure_artifacts_dir()
    Path(args.output_json).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[e2e_smoke] total={total} passed={passed} failed={len(failures)}")
    print(f"[e2e_smoke] wrote: {args.output_json}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
