#!/usr/bin/env python
"""
Audit advanced cross-fusion signals/evidence using the existing GraphRAG + cross_store flow.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple


REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_AI_ROOT = REPO_ROOT / "backend_ai"
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(BACKEND_AI_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_AI_ROOT))
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


THEMES = ["life_path", "love", "career", "wealth", "health", "relationship", "timing", "identity"]
DAYMASTERS = [
    ("갑", "목"),
    ("을", "목"),
    ("병", "화"),
    ("정", "화"),
    ("무", "토"),
    ("기", "토"),
    ("경", "금"),
    ("신", "금"),
    ("임", "수"),
    ("계", "수"),
]
SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]


def _safe(value: Any) -> str:
    return str(value or "").strip()


def _split_refs(meta: Dict[str, Any], key: str) -> List[str]:
    raw = meta.get(key)
    if isinstance(raw, str):
        refs = [p.strip() for p in raw.split(",") if p.strip()]
        if refs:
            return refs
    raw_json = meta.get(f"{key}_json")
    if isinstance(raw_json, str):
        try:
            parsed = json.loads(raw_json)
            if isinstance(parsed, list):
                refs = [str(v).strip() for v in parsed if str(v).strip()]
                if refs:
                    return refs
        except Exception:
            pass
    if isinstance(raw, list):
        refs = [str(v).strip() for v in raw if str(v).strip()]
        if refs:
            return refs
    return []


def _build_query(theme: str, saju_data: Dict[str, Any], astro_data: Dict[str, Any]) -> str:
    dm = saju_data.get("dayMaster", {}) if isinstance(saju_data, dict) else {}
    return " ".join(
        [
            p
            for p in [
                theme,
                _safe(dm.get("heavenlyStem") or dm.get("name")),
                _safe(dm.get("element")),
                _safe(saju_data.get("dominantElement")),
                _safe(_safe(_as_dict(astro_data.get("sun")).get("sign"))),
                _safe(_safe(_as_dict(astro_data.get("moon")).get("sign"))),
                _safe(_safe((_as_dict(astro_data.get("ascendant")) or _as_dict(astro_data.get("rising"))).get("sign"))),
            ]
            if p
        ]
    )


def _as_dict(value: Any) -> Dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _extract_seeds(saju_data: Dict[str, Any], astro_data: Dict[str, Any]) -> Tuple[List[str], List[str]]:
    dm = _as_dict(saju_data.get("dayMaster"))
    ten = _as_dict(saju_data.get("tenGods"))
    dominant = ten.get("dominant", "")
    if isinstance(dominant, dict):
        dominant = dominant.get("name") or dominant.get("ko") or ""
    saju_seed = [
        _safe(dm.get("heavenlyStem") or dm.get("name")),
        _safe(dm.get("element")),
        _safe(saju_data.get("dominantElement")),
        _safe(dominant),
    ]
    asc = _as_dict(astro_data.get("ascendant") or astro_data.get("rising"))
    astro_seed = [
        _safe(_as_dict(astro_data.get("sun")).get("sign")),
        _safe(_as_dict(astro_data.get("moon")).get("sign")),
        _safe(asc.get("sign")),
    ]
    return [s for s in saju_seed if s], [s for s in astro_seed if s]


def _build_sample(index: int) -> Tuple[Dict[str, Any], Dict[str, Any], str]:
    dm_stem, dm_element = DAYMASTERS[index % len(DAYMASTERS)]
    sun_sign = SIGNS[index % len(SIGNS)]
    moon_sign = SIGNS[(index + 3) % len(SIGNS)]
    asc_sign = SIGNS[(index + 5) % len(SIGNS)]
    theme = THEMES[index % len(THEMES)]

    ten_god_cycle = ["비견", "식신", "정재", "정관", "정인", "편재", "상관", "편관", "편인", "겁재"]
    dominant = ten_god_cycle[index % len(ten_god_cycle)]
    secondary = ten_god_cycle[(index + 2) % len(ten_god_cycle)]
    kibsin = ["금", "수", "목", "화", "토"][(index + 1) % 5]

    saju_data = {
        "dayMaster": {"name": dm_stem, "heavenlyStem": dm_stem, "element": dm_element},
        "dominantElement": dm_element,
        "elementCounts": {"목": 2 + (index % 2), "화": 1 + ((index + 1) % 2), "토": 1, "금": 1, "수": 1 + ((index + 2) % 2)},
        "tenGods": {"dominant": dominant},
        "tenGodsCount": {dominant: 3, secondary: 2, "비견": 1},
        "relations": [
            {"kind": "지지육합", "pillars": ["day", "month"], "detail": "관계 협력"},
            {"kind": "지지충", "pillars": ["year", "day"], "detail": "변화 압력"},
        ],
        "pillars": {
            "year": {"jijanggan": {"chogi": {"name": "갑"}, "junggi": {"name": "병"}, "jeonggi": {"name": "무"}}},
            "month": {"jijanggan": {"chogi": {"name": "을"}, "junggi": {"name": "정"}, "jeonggi": {"name": "기"}}},
        },
        "advancedAnalysis": {
            "extended": {"strength": {"level": "신강" if index % 2 == 0 else "신약"}},
            "yongsin": {"primaryYongsin": dm_element, "kibsin": kibsin},
            "hyeongchung": {"hap": [{"type": "지지합"}], "chung": [{"type": "지지충"}]},
            "sibsin": {"distribution": {dominant: 3, secondary: 2}},
            "monthlyLuck": [{"month": f"2026-{m:02d}", "sipsin": dominant} for m in (2, 5, 9)],
        },
        "daeun": {
            "current": {"heavenlyStem": dm_stem, "earthlyBranch": "자", "sipsin": {"cheon": dominant, "ji": secondary}},
            "list": [
                {"age": 24, "heavenlyStem": "갑", "earthlyBranch": "자"},
                {"age": 34, "heavenlyStem": "을", "earthlyBranch": "축"},
            ],
        },
        "unse": {
            "daeun": [{"age": 24, "heavenlyStem": "갑", "earthlyBranch": "자"}],
            "annual": [{"year": 2026, "ganji": "병오"}],
            "monthly": [{"year": 2026, "month": 2, "ganji": "경인"}],
        },
        "shinsal": [{"kind": "역마"}, {"kind": "도화"}],
    }

    astro_data = {
        "sun": {"name": "Sun", "sign": sun_sign, "house": 1 + (index % 12)},
        "moon": {"name": "Moon", "sign": moon_sign, "house": 1 + ((index + 2) % 12)},
        "mercury": {"name": "Mercury", "sign": SIGNS[(index + 1) % 12], "house": 1 + ((index + 4) % 12)},
        "venus": {"name": "Venus", "sign": SIGNS[(index + 7) % 12], "house": 1 + ((index + 6) % 12)},
        "mars": {"name": "Mars", "sign": SIGNS[(index + 9) % 12], "house": 1 + ((index + 8) % 12)},
        "jupiter": {"name": "Jupiter", "sign": SIGNS[(index + 10) % 12], "house": 1 + ((index + 3) % 12)},
        "saturn": {"name": "Saturn", "sign": SIGNS[(index + 11) % 12], "house": 1 + ((index + 9) % 12)},
        "ascendant": {"sign": asc_sign},
        "planets": [
            {"name": "Sun", "sign": sun_sign, "house": 1 + (index % 12)},
            {"name": "Moon", "sign": moon_sign, "house": 1 + ((index + 2) % 12)},
            {"name": "Mercury", "sign": SIGNS[(index + 1) % 12], "house": 1 + ((index + 4) % 12)},
            {"name": "Venus", "sign": SIGNS[(index + 7) % 12], "house": 1 + ((index + 6) % 12)},
            {"name": "Mars", "sign": SIGNS[(index + 9) % 12], "house": 1 + ((index + 8) % 12)},
        ],
        "aspects": [
            {"planet1": "Sun", "planet2": "Moon", "aspectType": "trine", "orb": 2.1},
            {"planet1": "Mars", "planet2": "Saturn", "aspectType": "square", "orb": 1.5},
            {"planet1": "Venus", "planet2": "Jupiter", "aspectType": "opposition", "orb": 2.2},
            {"planet1": "Mercury", "planet2": "Uranus", "aspectType": "square", "orb": 2.8},
        ],
        "elementRatios": {"fire": 35, "earth": 20, "air": 25, "water": 20},
        "modalityRatios": {"cardinal": 36, "fixed": 34, "mutable": 30},
        "transits": [
            {"transitPlanet": "Saturn", "natalPlanet": "Sun", "aspectType": "square", "exactDate": "2026-03-14"},
            {"transitPlanet": "Jupiter", "natalPlanet": "Moon", "aspectType": "trine", "exactDate": "2026-07-22"},
        ],
        "progressions": {"summary": "progressed moon shift"},
    }

    return saju_data, astro_data, theme


def _parse_advanced_links(meta: Dict[str, Any]) -> List[Dict[str, Any]]:
    links = meta.get("advanced_links")
    if isinstance(links, list):
        return [item for item in links if isinstance(item, dict)]
    raw = meta.get("advanced_links_json")
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return [item for item in parsed if isinstance(item, dict)]
        except Exception:
            pass
    return []


def _forbidden_calls_count(prefetch_result: Dict[str, Any]) -> int:
    forbidden = 0
    if prefetch_result.get("corpus_quotes"):
        forbidden += 1
    if prefetch_result.get("persona_context"):
        forbidden += 1
    if prefetch_result.get("domain_knowledge"):
        forbidden += 1
    return forbidden


def _group_payload(axis: str, items: List[Dict[str, Any]]) -> Dict[str, Any]:
    top = items[0] if items else {}
    meta = top.get("metadata") or {}
    saju_refs = _split_refs(meta, "saju_refs")
    astro_refs = _split_refs(meta, "astro_refs")
    advanced_links = _parse_advanced_links(meta)
    group_has_advanced = any(_safe(link.get("text")) for link in advanced_links)
    completeness = len(saju_refs) >= 2 and len(astro_refs) >= 2

    return {
        "axis": axis,
        "cross_score": float(top.get("cross_score", top.get("score", 0.0)) or 0.0),
        "theme": _safe(meta.get("theme") or meta.get("axis")),
        "fusion_key": _safe(meta.get("fusion_key")),
        "evidence_source": _safe(meta.get("evidence_source")),
        "advanced_evidence_source": _safe(meta.get("advanced_evidence_source")),
        "saju_refs": saju_refs,
        "astro_refs": astro_refs,
        "evidence_complete": completeness,
        "advanced_links": [
            {
                "text": _safe(link.get("text")),
                "saju_signals": link.get("saju_signals", []),
                "astro_signals": link.get("astro_signals", []),
                "advanced_evidence_source": _safe(link.get("advanced_evidence_source")),
                "saju_evidence": link.get("saju_evidence", []),
                "astro_evidence": link.get("astro_evidence", []),
            }
            for link in advanced_links
        ],
        "advanced_link_present": group_has_advanced,
    }


def _write_md(path: Path, payload: Dict[str, Any]) -> None:
    metrics = payload.get("metrics", {})
    lines: List[str] = []
    lines.append("# Cross Advanced Audit")
    lines.append("")
    lines.append(f"- Generated at: {payload.get('generated_at')}")
    lines.append(f"- Samples: {payload.get('config', {}).get('samples')}")
    lines.append(f"- `CROSS_ADVANCED`: {payload.get('config', {}).get('CROSS_ADVANCED')}")
    lines.append(f"- `EXCLUDE_NON_SAJU_ASTRO`: {payload.get('config', {}).get('EXCLUDE_NON_SAJU_ASTRO')}")
    lines.append("")
    lines.append("## Metrics")
    lines.append(f"- Total groups: {metrics.get('total_groups', 0)}")
    lines.append(f"- Advanced link coverage: {metrics.get('advanced_link_rate', 0):.1f}%")
    lines.append(f"- Evidence completeness: {metrics.get('evidence_complete_rate', 0):.1f}%")
    lines.append(f"- Forbidden calls total: {metrics.get('forbidden_calls_total', 0)}")
    lines.append(f"- Empty advanced links: {metrics.get('empty_advanced_link_count', 0)}")
    lines.append("")
    lines.append("## Sample Details")

    for sample in payload.get("samples", []):
        idx = sample.get("index")
        theme = sample.get("theme")
        lines.append(f"### Sample {idx} ({theme})")
        lines.append(f"- Query: `{sample.get('query')}`")
        lines.append(f"- Forbidden calls: {sample.get('forbidden_calls_count', 0)}")
        lines.append(f"- Saju advanced signals: {len(sample.get('advanced_signals', {}).get('saju', []))}")
        lines.append(f"- Astro advanced signals: {len(sample.get('advanced_signals', {}).get('astro', []))}")
        for group in sample.get("cross_groups", []):
            lines.append(
                f"- Group `{group.get('axis')}`: evidence_complete={group.get('evidence_complete')} advanced_link={group.get('advanced_link_present')}"
            )
            for link in group.get("advanced_links", [])[:1]:
                lines.append(f"  - Link: {link.get('text')}")
                lines.append(f"  - Source: {link.get('advanced_evidence_source')}")
                saju_e = link.get("saju_evidence", [])
                astro_e = link.get("astro_evidence", [])
                if saju_e:
                    first = saju_e[0]
                    lines.append(f"  - SAJU evidence: {first.get('title')} ({first.get('id')}) score={first.get('score')}")
                if astro_e:
                    first = astro_e[0]
                    lines.append(f"  - ASTRO evidence: {first.get('title')} ({first.get('id')}) score={first.get('score')}")
        lines.append("")

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines).strip() + "\n", encoding="utf-8")


async def _run(samples: int, locale: str) -> Dict[str, Any]:
    from backend_ai.app.rag_manager import prefetch_all_rag_data_async
    from backend_ai.app.rag.cross_store import build_cross_summary
    from backend_ai.app.rag.advanced_signals import (
        extract_astro_advanced_signals,
        extract_saju_advanced_signals,
    )

    sample_rows: List[Dict[str, Any]] = []
    total_groups = 0
    groups_with_advanced = 0
    groups_complete = 0
    empty_advanced_link_count = 0
    forbidden_total = 0

    for idx in range(samples):
        saju_data, astro_data, theme = _build_sample(idx)
        query = _build_query(theme, saju_data, astro_data)
        saju_seed, astro_seed = _extract_seeds(saju_data, astro_data)

        prefetch = await prefetch_all_rag_data_async(saju_data, astro_data, theme=theme, locale=locale)
        forbidden_count = _forbidden_calls_count(prefetch)
        forbidden_total += forbidden_count

        summary, grouped = build_cross_summary(
            query,
            saju_seed=saju_seed,
            astro_seed=astro_seed,
            saju_json=saju_data,
            astro_json=astro_data,
            top_k=12,
            max_groups=3,
            return_meta=True,
        )

        groups_payload: List[Dict[str, Any]] = []
        for axis, items in grouped:
            gp = _group_payload(axis, items)
            groups_payload.append(gp)
            total_groups += 1
            if gp.get("evidence_complete"):
                groups_complete += 1
            if gp.get("advanced_link_present"):
                groups_with_advanced += 1
            for link in gp.get("advanced_links", []):
                if not _safe(link.get("text")):
                    empty_advanced_link_count += 1

        sample_rows.append(
            {
                "index": idx + 1,
                "theme": theme,
                "query": query,
                "forbidden_calls_count": forbidden_count,
                "advanced_signals": {
                    "saju": extract_saju_advanced_signals(saju_data),
                    "astro": extract_astro_advanced_signals(astro_data),
                },
                "cross_summary": summary,
                "cross_groups": groups_payload,
            }
        )

    advanced_link_rate = (groups_with_advanced / total_groups * 100.0) if total_groups else 0.0
    evidence_complete_rate = (groups_complete / total_groups * 100.0) if total_groups else 0.0

    return {
        "generated_at": datetime.now().isoformat(),
        "config": {
            "samples": samples,
            "locale": locale,
            "USE_CHROMADB": os.getenv("USE_CHROMADB", ""),
            "EXCLUDE_NON_SAJU_ASTRO": os.getenv("EXCLUDE_NON_SAJU_ASTRO", ""),
            "CROSS_ADVANCED": os.getenv("CROSS_ADVANCED", ""),
        },
        "metrics": {
            "total_groups": total_groups,
            "groups_with_advanced_links": groups_with_advanced,
            "advanced_link_rate": round(advanced_link_rate, 2),
            "groups_evidence_complete": groups_complete,
            "evidence_complete_rate": round(evidence_complete_rate, 2),
            "forbidden_calls_total": forbidden_total,
            "empty_advanced_link_count": empty_advanced_link_count,
        },
        "samples": sample_rows,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit advanced cross-fusion signal/evidence usage.")
    parser.add_argument("--samples", type=int, default=20, help="Number of samples to audit")
    parser.add_argument("--out", default="out/cross_advanced_audit.json", help="Output JSON file")
    parser.add_argument("--locale", default="ko", help="Locale for prefetch/theme routing")
    args = parser.parse_args()

    os.environ["USE_CHROMADB"] = "1"
    os.environ["EXCLUDE_NON_SAJU_ASTRO"] = "1"
    os.environ["CROSS_ADVANCED"] = "1"

    payload = asyncio.run(_run(max(1, int(args.samples)), args.locale))

    out_json = Path(args.out)
    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_json.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    out_md = out_json.with_suffix(".md")
    _write_md(out_md, payload)

    print(f"json={out_json}")
    print(f"md={out_md}")
    print(f"groups={payload.get('metrics', {}).get('total_groups', 0)}")
    print(f"advanced_link_rate={payload.get('metrics', {}).get('advanced_link_rate', 0)}")
    print(f"evidence_complete_rate={payload.get('metrics', {}).get('evidence_complete_rate', 0)}")
    print(f"forbidden_calls_total={payload.get('metrics', {}).get('forbidden_calls_total', 0)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
