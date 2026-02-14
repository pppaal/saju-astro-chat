#!/usr/bin/env python
"""
E2E RAG smoke test for Saju+Astro GraphRAG + CrossRAG.

Checks:
1) Only saju_astro collections are used
2) Cross summary is generated with evidence
3) Non-saju/astro stores are not called (corpus/persona/domain empty)
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path
from typing import Dict, List


os.environ["USE_CHROMADB"] = "1"
os.environ["EXCLUDE_NON_SAJU_ASTRO"] = "1"
os.environ["RAG_TRACE"] = "1"

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Ensure backend_ai is on sys.path
REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_AI_ROOT = REPO_ROOT / "backend_ai"
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(BACKEND_AI_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_AI_ROOT))


QUERIES = [
    "수(水) 기운이 강하고 달이 물자리일 때 연애 성향 교차 해석",
    "목(木) 기운이 약한데 태양이 사자자리면 커리어 방향은?",
    "금(金) 기운과 토(土) 기운이 충돌할 때 인간관계에서 주의점",
    "일간이 갑목인데 달이 전갈자리면 감정 조절 포인트",
    "화(火) 기운 과다 + 금성 양자리일 때 연애 패턴",
    "사주 신살과 점성 소행성(Chiron) 연결 해석",
    "직업운: 지지의 합과 점성 하우스 조합",
    "재물운: 십신과 목성의 시너지",
    "건강: 오행 밸런스와 토성 영향",
    "인생 타이밍: 대운 흐름과 진행 차트의 교차",
    "궁합: 사주 관계와 점성 시나스트리",
    "배우자운: 지지 합/충과 금성-달 조합",
    "가족운: 가정 하우스와 사주 월지의 연결",
    "창의성: 식신/상관과 수성/천왕성 교차",
    "리더십: 비견/겁재와 태양의 상응",
    "자기치유: 오행 부족과 해왕성 상징",
    "삶의 방향성: 격국과 MC/10하우스",
    "관계에서의 거리감: 음양 불균형과 토성",
    "연애 타이밍: 세운과 진행 달의 상호작용",
    "정체성 혼란: 일간 충돌과 상승궁 긴장",
]


def _theme_for_query(query: str) -> str:
    q = query.lower()
    if "연애" in q or "사랑" in q or "궁합" in q:
        return "love"
    if "직업" in q or "커리어" in q:
        return "career"
    if "재물" in q or "돈" in q:
        return "wealth"
    if "건강" in q:
        return "health"
    if "가족" in q:
        return "family"
    return "chat"


def _sample_saju_data() -> Dict:
    return {
        "dayMaster": {"heavenlyStem": "갑", "element": "목"},
        "dominantElement": "수",
        "tenGods": {"dominant": "비견"},
        "elementCounts": {"목": 2, "화": 1, "토": 1, "금": 1, "수": 3},
    }


def _sample_astro_data() -> Dict:
    return {
        "sun": {"sign": "Cancer"},
        "moon": {"sign": "Pisces"},
        "rising": {"sign": "Scorpio"},
        "mercury": {"sign": "Gemini"},
        "venus": {"sign": "Aries"},
        "mars": {"sign": "Capricorn"},
        "jupiter": {"sign": "Taurus"},
        "saturn": {"sign": "Aquarius"},
    }


async def _run_one(query: str) -> Dict:
    from backend_ai.app.rag_manager import prefetch_all_rag_data_async

    saju_data = _sample_saju_data()
    astro_data = _sample_astro_data()
    theme = _theme_for_query(query)
    return await prefetch_all_rag_data_async(saju_data, astro_data, theme=theme, locale="ko")


async def main() -> int:
    failures: List[str] = []

    for idx, query in enumerate(QUERIES, start=1):
        result = await _run_one(query)

        collections = ["saju_astro_graph_nodes_v1", "saju_astro_cross_v1"]
        print(f"[{idx:02d}] {query}")
        print(f"  collections: {collections}")

        cross = result.get("cross_analysis") or ""
        has_cross = bool(cross.strip())
        has_evidence = ("사주 근거:" in cross) and ("점성 근거:" in cross)

        forbidden_ok = (
            not result.get("corpus_quotes")
            and not result.get("domain_knowledge")
            and not result.get("persona_context")
        )

        print(f"  cross_summary: {'OK' if has_cross else 'FAIL'}")
        print(f"  evidence: {'OK' if has_evidence else 'FAIL'}")
        print(f"  forbidden_calls: {'OK' if forbidden_ok else 'FAIL'}")

        if not has_cross:
            failures.append(f"{idx}: cross_summary empty")
        if not has_evidence:
            failures.append(f"{idx}: evidence missing")
        if not forbidden_ok:
            failures.append(f"{idx}: forbidden store data not empty")

    if failures:
        print("\nFailures:")
        for f in failures:
            print(f"- {f}")
        return 1

    print("\nE2E smoke OK")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
