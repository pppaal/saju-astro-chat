#!/usr/bin/env python
"""
Generate a fixed 10-page saju x astro life consultation PDF with images.

This script reuses existing GraphRAG + cross_store pipeline outputs.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple
from urllib import request, error


REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_AI_ROOT = REPO_ROOT / "backend_ai"
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(BACKEND_AI_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_AI_ROOT))


def _ensure_env() -> None:
    os.environ["USE_CHROMADB"] = "1"
    os.environ["EXCLUDE_NON_SAJU_ASTRO"] = "1"


def _load_json_arg(file_path: str | None, json_text: str | None, default_data: Dict) -> Dict:
    if file_path:
        return json.loads(Path(file_path).read_text(encoding="utf-8"))
    if json_text:
        return json.loads(json_text)
    return default_data


def _default_saju() -> Dict:
    return {
        "dayMaster": {"heavenlyStem": "갑", "element": "목"},
        "dominantElement": "수",
        "tenGods": {"dominant": "비견"},
        "elementCounts": {"목": 2, "화": 1, "토": 1, "금": 1, "수": 3},
    }


def _default_astro() -> Dict:
    return {
        "sun": {"sign": "Cancer"},
        "moon": {"sign": "Pisces"},
        "rising": {"sign": "Scorpio"},
        "mercury": {"sign": "Gemini"},
        "venus": {"sign": "Aries"},
        "mars": {"sign": "Capricorn"},
    }


def _safe(value: object) -> str:
    return str(value or "").strip()


def _extract_desc(text: str) -> str:
    if not text:
        return ""
    for line in text.splitlines():
        if line.lower().startswith("description:"):
            return line.split(":", 1)[-1].strip()
    return text.strip()


def _build_query(theme: str, saju_data: Dict, astro_data: Dict) -> str:
    dm = saju_data.get("dayMaster", {}) if isinstance(saju_data, dict) else {}
    parts = [
        theme,
        _safe(dm.get("heavenlyStem") or dm.get("name")),
        _safe(dm.get("element")),
        _safe(saju_data.get("dominantElement")),
        _safe(astro_data.get("sun", {}).get("sign")),
        _safe(astro_data.get("moon", {}).get("sign")),
        _safe(astro_data.get("rising", {}).get("sign")),
    ]
    return " ".join([p for p in parts if p])


def _extract_seeds(saju_data: Dict, astro_data: Dict) -> Tuple[List[str], List[str]]:
    dm = saju_data.get("dayMaster", {}) if isinstance(saju_data, dict) else {}
    ten = saju_data.get("tenGods", {}) if isinstance(saju_data, dict) else {}
    dominant = ten.get("dominant", "") if isinstance(ten, dict) else ""
    if isinstance(dominant, dict):
        dominant = dominant.get("name", "") or dominant.get("ko", "")
    saju_seed = [
        _safe(dm.get("heavenlyStem") or dm.get("name")),
        _safe(dm.get("element")),
        _safe(saju_data.get("dominantElement")),
        _safe(dominant),
    ]
    astro_seed = [
        _safe(astro_data.get("sun", {}).get("sign")),
        _safe(astro_data.get("moon", {}).get("sign")),
        _safe(astro_data.get("rising", {}).get("sign")),
    ]
    return [s for s in saju_seed if s], [a for a in astro_seed if a]


def _query_graph_evidence(query: str, top_k: int = 10) -> List[Dict]:
    from backend_ai.app.rag.vector_store import VectorStoreManager
    from backend_ai.app.saju_astro_rag import get_model

    model = get_model(prefer_multilingual=True)
    emb = model.encode(query, convert_to_tensor=False, normalize_embeddings=True, show_progress_bar=False)
    vec = emb.tolist() if hasattr(emb, "tolist") else emb

    vs = VectorStoreManager(collection_name="saju_astro_graph_nodes_v1")
    hits = vs.search(query_embedding=vec, top_k=top_k, min_score=0.1, where={"domain": "saju_astro"})
    if not hits:
        hits = vs.search(query_embedding=vec, top_k=top_k, min_score=0.1)
    return hits


def _build_cross_cards(grouped: List[Tuple[str, List[Dict]]]) -> List[Dict]:
    cards: List[Dict] = []
    for axis, items in grouped[:3]:
        top = items[0] if items else {}
        meta = top.get("metadata") or {}
        text = _extract_desc(_safe(top.get("text")))
        saju_refs = _safe(meta.get("saju_refs"))
        astro_refs = _safe(meta.get("astro_refs"))
        saju_list = [x.strip() for x in saju_refs.split(",") if x.strip()][:2]
        astro_list = [x.strip() for x in astro_refs.split(",") if x.strip()][:2]
        cards.append(
            {
                "theme": axis,
                "summary": text,
                "saju": saju_list or ["none"],
                "astro": astro_list or ["none"],
            }
        )
    return cards


def _parse_cross_lines(summary: str) -> List[str]:
    lines = [line.strip() for line in summary.splitlines() if line.strip()]
    return lines[:15]


def _nodes_to_section(nodes: List[Dict], heading: str, limit: int = 6) -> str:
    lines = [heading]
    for item in nodes[:limit]:
        meta = item.get("metadata") or {}
        title = _safe(meta.get("label") or meta.get("original_id") or item.get("id"))
        desc = _extract_desc(_safe(item.get("text")))
        desc = re.sub(r"\s+", " ", desc)[:180]
        score = item.get("score", 0)
        lines.append(f"- {title} (score={score:.2f}): {desc}")
    if len(lines) == 1:
        lines.append("- 근거를 찾지 못했습니다.")
    return "\n".join(lines)


def _timeline_from_themes(theme_scores: Dict[str, float]) -> List[Dict]:
    ranked = sorted(theme_scores.items(), key=lambda x: x[1], reverse=True)
    labels = [k for k, _ in ranked] or ["general"]
    timeline = []
    for month in range(1, 13):
        key = labels[(month - 1) % len(labels)]
        score = 0.6 + (((month * 7) % 10) / 20.0)
        timeline.append({"month": month, "keyword": key, "score": round(score, 2)})
    return timeline


def _fetch_destiny_matrix_summary(
    birth_date: str,
    birth_time: str,
    gender: str,
    locale: str,
    astro_data: Dict,
) -> Dict:
    """
    Fetch structured matrix summary from existing /api/destiny-matrix endpoint.
    Requires NEXT app running (default http://localhost:3000).
    """
    base_url = os.getenv("NEXT_BASE_URL", "http://localhost:3000").rstrip("/")
    endpoint = f"{base_url}/api/destiny-matrix"

    def _to_int_house(value) -> int | None:
        try:
            iv = int(value)
            return iv if 1 <= iv <= 12 else None
        except Exception:
            return None

    planet_signs = {}
    planet_houses = {}
    for key in ("sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"):
        entry = astro_data.get(key, {}) if isinstance(astro_data, dict) else {}
        if not isinstance(entry, dict):
            continue
        name = key.capitalize()
        sign = _safe(entry.get("sign"))
        house = _to_int_house(entry.get("house"))
        if sign:
            planet_signs[name] = sign
        if house is not None:
            planet_houses[name] = house

    payload = {
        "birthDate": birth_date,
        "birthTime": birth_time,
        "gender": gender if gender in ("male", "female") else "male",
        "lang": "ko" if locale == "ko" else "en",
        "planetSigns": planet_signs,
        "planetHouses": planet_houses,
    }
    req = request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except error.URLError:
        return {}
    except Exception:
        return {}

    if not isinstance(data, dict) or not data.get("success"):
        return {}

    highlights = data.get("highlights", {}) if isinstance(data.get("highlights"), dict) else {}
    strengths = highlights.get("strengths", []) if isinstance(highlights.get("strengths"), list) else []
    cautions = highlights.get("cautions", []) if isinstance(highlights.get("cautions"), list) else []
    merged = strengths + cautions

    layer_scores: Dict[int, List[float]] = {}
    for item in merged:
        if not isinstance(item, dict):
            continue
        layer = int(item.get("layer", 0) or 0)
        score = float(item.get("score", 0.0) or 0.0)
        if layer <= 0:
            continue
        layer_scores.setdefault(layer, []).append(score)

    top_layers = sorted(
        [{"layer": layer, "score": round(sum(scores) / max(1, len(scores)), 2)} for layer, scores in layer_scores.items()],
        key=lambda x: x["score"],
        reverse=True,
    )[:3]

    top_highlights = []
    for item in merged[:5]:
        if isinstance(item, dict):
            kw = _safe(item.get("keyword")) or "n/a"
            score = float(item.get("score", 0.0) or 0.0)
            top_highlights.append({"keyword": kw, "score": round(score, 2)})

    synergies_raw = data.get("synergies", []) if isinstance(data.get("synergies"), list) else []
    synergies = []
    for item in synergies_raw[:3]:
        if isinstance(item, dict):
            synergies.append(
                {
                    "description": _safe(item.get("description")) or "synergy",
                    "score": round(float(item.get("score", 0.0) or 0.0), 2),
                    "layers": item.get("layers", []),
                }
            )

    return {
        "total_score": round(float((data.get("summary") or {}).get("totalScore", 0.0) or 0.0), 2),
        "top_layers": top_layers,
        "top_highlights": top_highlights,
        "top_synergies": synergies,
        "source": "api/destiny-matrix",
    }


async def _collect_payload(saju_data: Dict, astro_data: Dict, user_name: str, locale: str) -> Dict:
    from backend_ai.app.rag_manager import prefetch_all_rag_data_async
    from backend_ai.app.rag.cross_store import build_cross_summary

    themes = ["life_path", "love", "career", "wealth", "health"]
    results_by_theme: Dict[str, Dict] = {}
    for theme in themes:
        results_by_theme[theme] = await prefetch_all_rag_data_async(saju_data, astro_data, theme=theme, locale=locale)

    saju_seed, astro_seed = _extract_seeds(saju_data, astro_data)
    base_query = _build_query("life_path", saju_data, astro_data)
    cross_text, grouped = build_cross_summary(
        base_query,
        saju_seed=saju_seed,
        astro_seed=astro_seed,
        top_k=12,
        max_groups=3,
        return_meta=True,
    )
    cross_cards = _build_cross_cards(grouped)

    graph_hits_by_theme: Dict[str, List[Dict]] = {}
    for theme in themes:
        query = _build_query(theme, saju_data, astro_data)
        graph_hits_by_theme[theme] = _query_graph_evidence(query, top_k=10)

    theme_scores: Dict[str, float] = {}
    for axis, items in grouped:
        if not items:
            continue
        theme_scores[axis] = float(items[0].get("cross_score", items[0].get("score", 0.0)))
    if not theme_scores:
        theme_scores = {"general": 1.0}

    timeline = _timeline_from_themes(theme_scores)
    timeline_lines = [f"- {t['month']}월: {t['keyword']} (강도 {t['score']})" for t in timeline]
    matrix_summary = _fetch_destiny_matrix_summary(
        birth_date=_safe(saju_data.get("birthDate")) or datetime.now().strftime("%Y-%m-%d"),
        birth_time=_safe(saju_data.get("birthTime")) or "12:00",
        gender=_safe(saju_data.get("gender")) or "male",
        locale=locale,
        astro_data=astro_data,
    )

    executive = [
        f"{_safe(user_name) or 'Client'}님의 사주×점성 교차 요약입니다.",
        "핵심 테마는 GraphRAG 근거와 cross_store 교차 해석을 합쳐 도출했습니다.",
    ]
    executive.extend([f"- {line}" for line in _parse_cross_lines(cross_text)[:6]])

    payload = {
        "user_name": user_name,
        "locale": locale,
        "generated_at": datetime.now().strftime("%Y-%m-%d"),
        "tagline": "사주와 점성의 공통 방향을 한 권으로 정리한 10페이지 상담서",
        "theme_scores": theme_scores,
        "cross_cards": cross_cards,
        "cross_summary": cross_text,
        "executive_summary": "\n".join(executive),
        "identity_section": _nodes_to_section(graph_hits_by_theme["life_path"], "사주+점성 공통 성향"),
        "love_section": _nodes_to_section(graph_hits_by_theme["love"], "관계/연애 교차 근거"),
        "career_section": _nodes_to_section(graph_hits_by_theme["career"], "커리어/일 교차 근거"),
        "money_section": _nodes_to_section(graph_hits_by_theme["wealth"], "돈/자원 교차 근거"),
        "health_section": _nodes_to_section(graph_hits_by_theme["health"], "스트레스/건강 관리 힌트"),
        "growth_section": (
            "성장 과제는 그림자 인식, 반복 패턴 기록, 관계 대화 방식 개선으로 구성합니다.\n"
            + _nodes_to_section(graph_hits_by_theme["life_path"], "실행 근거", limit=4)
        ),
        "timeline": timeline,
        "timeline_section": "\n".join(timeline_lines),
        "destiny_matrix_summary": matrix_summary,
        "action_plan_section": (
            "다음 12개월은 무리한 확장보다 루틴 강화에 초점을 두세요.\n"
            "교차 근거가 높은 테마부터 순서대로 행동을 배치하면 변동성을 줄일 수 있습니다."
        ),
        "action_items": [
            "주 1회 감정/에너지 로그 작성",
            "월 1회 관계 패턴 점검",
            "핵심 업무 1개 집중 블록 운영",
            "지출 카테고리 주간 점검",
            "수면/회복 루틴 고정",
            "분기별 장기 목표 재정렬",
            "충동 의사결정 24시간 보류",
            "월말 교차 해석 재검토",
        ],
        "raw_results_by_theme": results_by_theme,
    }
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate 10-page saju x astro life report PDF")
    parser.add_argument("--saju-file", help="Path to saju json file", default=None)
    parser.add_argument("--astro-file", help="Path to astro json file", default=None)
    parser.add_argument("--saju-json", help="Inline saju json string", default=None)
    parser.add_argument("--astro-json", help="Inline astro json string", default=None)
    parser.add_argument("--name", help="User name", default="Client")
    parser.add_argument("--locale", help="Locale", default="ko")
    parser.add_argument("--out", help="Output PDF path", default="out/life_report.pdf")
    args = parser.parse_args()

    _ensure_env()
    saju_data = _load_json_arg(args.saju_file, args.saju_json, _default_saju())
    astro_data = _load_json_arg(args.astro_file, args.astro_json, _default_astro())

    from backend_ai.reporting.saju_astro_life_report import (
        count_pdf_pages,
        create_assets,
        render_life_report_pdf,
    )

    payload = asyncio.run(_collect_payload(saju_data, astro_data, args.name, args.locale))

    out_pdf = Path(args.out)
    out_pdf.parent.mkdir(parents=True, exist_ok=True)
    payload_path = out_pdf.parent / "report_payload.json"
    payload_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    assets_dir = out_pdf.parent / "life_report_assets"
    assets = create_assets(payload, assets_dir)
    render_life_report_pdf(payload, out_pdf, assets)

    page_count = count_pdf_pages(out_pdf)
    image_count = len([p for p in assets_dir.glob("*.png") if p.is_file()])
    print(f"pdf={out_pdf}")
    print(f"payload={payload_path}")
    print(f"pages={page_count}")
    print(f"images={image_count}")
    if page_count != 10:
        print("ERROR: PDF page count is not 10")
        return 1
    if image_count < 3:
        print("ERROR: less than 3 images generated")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
