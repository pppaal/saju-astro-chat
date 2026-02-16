#!/usr/bin/env python
"""
backend_ai self-check script.

Single command validation for:
1) Health (data/index)
2) Leak (runtime routing isolation)
3) Quality (cross diversity + evidence)
"""

from __future__ import annotations

import asyncio
import argparse
import json
import logging
import os
import random
import statistics
import subprocess
import sys
from dataclasses import dataclass
from io import StringIO
from pathlib import Path
from typing import Dict, List, Optional


REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_AI_ROOT = REPO_ROOT / "backend_ai"
CHROMA_DIR = REPO_ROOT / "backend_ai" / "data" / "chromadb"

if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(BACKEND_AI_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_AI_ROOT))
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


MANDATORY_COLLECTIONS = [
    "saju_astro_graph_nodes_v1",
    "saju_astro_cross_v1",
]
TAROT_COLLECTION_CANDIDATES = ["domain_tarot", "tarot"]
OPTIONAL_COLLECTIONS = ["domain_dream", "domain_persona", "domain_destiny_map", "graph_nodes", "corpus_nodes"]

QUALITY_QUERIES = [
    "ìˆ˜(æ°´) ê¸°ìš´ì´ ê°•í•˜ê³  ë‹¬ì´ ë¬¼ìžë¦¬ì¼ ë•Œ ì—°ì•  ì„±í–¥ êµì°¨ í•´ì„",
    "ëª©(æœ¨) ê¸°ìš´ì´ ì•½í•œë° íƒœì–‘ì´ ì‚¬ìžìžë¦¬ë©´ ì»¤ë¦¬ì–´ ë°©í–¥ì€?",
    "ê¸ˆ(é‡‘) ê¸°ìš´ê³¼ í† (åœŸ) ê¸°ìš´ì´ ì¶©ëŒí•  ë•Œ ì¸ê°„ê´€ê³„ì—ì„œ ì£¼ì˜ì ",
    "ì¼ê°„ì´ ê°‘ëª©ì¸ë° ë‹¬ì´ ì „ê°ˆìžë¦¬ë©´ ê°ì • ì¡°ì ˆ í¬ì¸íŠ¸",
    "í™”(ç«) ê¸°ìš´ ê³¼ë‹¤ì™€ ê¸ˆì„± ì–‘ìžë¦¬ì˜ ì—°ì•  íŒ¨í„´",
    "ì‚¬ì£¼ ì‹ ì‚´ê³¼ ì ì„± ì†Œí–‰ì„± Chiron ì—°ê²° í•´ì„",
    "ì§ì—…ìš´ì—ì„œ ì§€ì§€ í•©ê³¼ í•˜ìš°ìŠ¤ ì¡°í•© í•´ì„",
    "ìž¬ë¬¼ìš´ì—ì„œ ì‹­ì‹ ê³¼ ëª©ì„±ì˜ ì‹œë„ˆì§€",
    "ê±´ê°•ì—ì„œ ì˜¤í–‰ ë°¸ëŸ°ìŠ¤ì™€ í† ì„± ì˜í–¥",
    "ì¸ìƒ íƒ€ì´ë°ì—ì„œ ëŒ€ìš´ê³¼ progression êµì°¨",
    "ê¶í•©ì—ì„œ ì‚¬ì£¼ ê´€ê³„ì™€ ì‹œë‚˜ìŠ¤íŠ¸ë¦¬ í•´ì„",
    "ë°°ìš°ìžìš´ì—ì„œ ì§€ì§€ í•©ì¶©ê³¼ ê¸ˆì„±ë‹¬ ì¡°í•©",
]


@dataclass
class CheckResult:
    status: str
    errors: List[str]
    warnings: List[str]
    table_lines: List[str]
    metrics: Dict[str, object]


def _pct(numer: int, denom: int) -> float:
    if denom <= 0:
        return 0.0
    return (numer / denom) * 100.0


def _status_rank(status: str) -> int:
    if status == "FAIL":
        return 2
    if status == "WARN":
        return 1
    return 0


def _merge_status(*statuses: str) -> str:
    worst = "PASS"
    for status in statuses:
        if _status_rank(status) > _status_rank(worst):
            worst = status
    return worst


def _print_table(title: str, headers: List[str], rows: List[List[str]]) -> List[str]:
    widths = [len(h) for h in headers]
    for row in rows:
        for i, col in enumerate(row):
            widths[i] = max(widths[i], len(col))
    sep = " | "
    header_line = sep.join(headers[i].ljust(widths[i]) for i in range(len(headers)))
    line = "-+-".join("-" * widths[i] for i in range(len(headers)))
    output = [title, header_line, line]
    for row in rows:
        output.append(sep.join(row[i].ljust(widths[i]) for i in range(len(headers))))
    return output


def _sample_collection(client, col_name: str, sample_size: int = 200) -> Dict[str, object]:
    out = {
        "exists": False,
        "count": 0,
        "sample_n": 0,
        "empty_docs": 0,
        "domain_missing": 0,
        "axis_missing": 0,
        "fusion_missing": 0,
        "avg_len": 0.0,
    }
    try:
        col = client.get_collection(col_name)
    except Exception:
        return out

    out["exists"] = True
    count = col.count()
    out["count"] = count
    if count <= 0:
        return out

    ids_payload = col.get(limit=min(count, 5000))
    ids = ids_payload.get("ids", []) or []
    if not ids:
        return out

    sample_ids = random.sample(ids, min(sample_size, len(ids)))
    docs_payload = col.get(ids=sample_ids, include=["documents", "metadatas"])
    docs = docs_payload.get("documents", []) or []
    metas = docs_payload.get("metadatas", []) or []

    out["sample_n"] = len(docs)
    if not docs:
        return out

    lens = []
    for i, doc in enumerate(docs):
        text = doc if isinstance(doc, str) else ""
        length = len(text.strip())
        lens.append(length)
        if length < 30:
            out["empty_docs"] += 1

        meta = metas[i] if i < len(metas) and isinstance(metas[i], dict) else {}
        if not meta.get("domain"):
            out["domain_missing"] += 1

        if col_name == "saju_astro_cross_v1":
            axis = meta.get("theme") or meta.get("axis")
            if not axis:
                out["axis_missing"] += 1
            if not meta.get("fusion_key"):
                out["fusion_missing"] += 1

    out["avg_len"] = statistics.mean(lens) if lens else 0.0
    return out


def health_check() -> CheckResult:
    errors: List[str] = []
    warnings: List[str] = []
    rows: List[List[str]] = []
    metrics: Dict[str, object] = {}

    try:
        import chromadb

        client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    except Exception as exc:
        return CheckResult(
            status="FAIL",
            errors=[f"Chroma client init failed: {exc}"],
            warnings=[],
            table_lines=[],
            metrics={},
        )

    tarot_found = None
    all_targets = list(MANDATORY_COLLECTIONS) + TAROT_COLLECTION_CANDIDATES + OPTIONAL_COLLECTIONS
    seen = set()
    ordered_targets = []
    for name in all_targets:
        if name not in seen:
            ordered_targets.append(name)
            seen.add(name)

    for col_name in ordered_targets:
        sample = _sample_collection(client, col_name)
        exists = sample["exists"]
        count = sample["count"]
        sample_n = sample["sample_n"]
        empty_pct = _pct(sample["empty_docs"], sample_n)
        domain_missing_pct = _pct(sample["domain_missing"], sample_n)
        axis_missing_pct = _pct(sample["axis_missing"], sample_n) if col_name == "saju_astro_cross_v1" else 0.0
        fusion_missing_pct = _pct(sample["fusion_missing"], sample_n) if col_name == "saju_astro_cross_v1" else 0.0

        if col_name in TAROT_COLLECTION_CANDIDATES and exists and tarot_found is None:
            tarot_found = col_name

        rows.append([
            col_name,
            "Y" if exists else "N",
            str(count),
            f"{empty_pct:.1f}%",
            f"{domain_missing_pct:.1f}%",
            f"{axis_missing_pct:.1f}%" if col_name == "saju_astro_cross_v1" else "-",
            f"{fusion_missing_pct:.1f}%" if col_name == "saju_astro_cross_v1" else "-",
        ])

        metrics[col_name] = sample

        if col_name in MANDATORY_COLLECTIONS and count <= 0:
            errors.append(f"{col_name} count is 0")

        if col_name in ("saju_astro_graph_nodes_v1", "saju_astro_cross_v1"):
            if sample_n > 0 and empty_pct >= 1.0:
                warnings.append(f"{col_name} empty_docs ratio is {empty_pct:.1f}% (>=1%)")

    if tarot_found is None:
        errors.append("No tarot collection found (domain_tarot or tarot)")

    table_lines = _print_table(
        "Health",
        ["collection", "exists", "count", "empty_docs%", "domain_missing%", "axis_missing%", "fusion_missing%"],
        rows,
    )

    status = "PASS"
    if errors:
        status = "FAIL"
    elif warnings:
        status = "WARN"

    return CheckResult(status=status, errors=errors, warnings=warnings, table_lines=table_lines, metrics=metrics)


class _CaptureHandler(logging.Handler):
    def __init__(self, stream: StringIO):
        super().__init__()
        self.stream = stream

    def emit(self, record: logging.LogRecord) -> None:
        try:
            msg = self.format(record)
            self.stream.write(msg + "\n")
        except Exception:
            pass


def _mock_saju() -> Dict:
    return {
        "dayMaster": {"heavenlyStem": "갑", "element": "목"},
        "dominantElement": "수",
        "tenGods": {"dominant": "비견"},
        "tenGodsCount": {"비견": 3, "정관": 2, "정재": 1},
        "elementCounts": {"목": 2, "화": 1, "토": 1, "금": 1, "수": 3},
        "relations": [
            {"kind": "지지육합", "detail": "협력 강화"},
            {"kind": "지지충", "detail": "변화 유발"},
        ],
        "advancedAnalysis": {
            "extended": {"strength": {"level": "신강"}},
            "yongsin": {"primaryYongsin": "목", "kibsin": "금"},
            "sibsin": {"distribution": {"비견": 3, "정관": 2}},
            "hyeongchung": {"hap": [{"type": "지지합"}], "chung": [{"type": "지지충"}]},
            "monthlyLuck": [{"month": "2026-02", "sipsin": "비견"}],
        },
        "daeun": {
            "current": {"heavenlyStem": "갑", "earthlyBranch": "자", "sipsin": {"cheon": "비견", "ji": "정관"}},
            "list": [{"age": 24, "heavenlyStem": "갑", "earthlyBranch": "자"}],
        },
        "unse": {
            "daeun": [{"age": 24, "heavenlyStem": "갑", "earthlyBranch": "자"}],
            "annual": [{"year": 2026, "ganji": "병오"}],
            "monthly": [{"year": 2026, "month": 2, "ganji": "경인"}],
        },
        "shinsal": [{"kind": "역마"}, {"kind": "도화"}],
    }


def _mock_astro() -> Dict:
    return {
        "sun": {"name": "Sun", "sign": "Cancer", "house": 10},
        "moon": {"name": "Moon", "sign": "Pisces", "house": 4},
        "rising": {"sign": "Scorpio"},
        "ascendant": {"sign": "Scorpio"},
        "mercury": {"name": "Mercury", "sign": "Gemini", "house": 9},
        "venus": {"name": "Venus", "sign": "Aries", "house": 7},
        "mars": {"name": "Mars", "sign": "Capricorn", "house": 6},
        "jupiter": {"name": "Jupiter", "sign": "Taurus", "house": 2},
        "saturn": {"name": "Saturn", "sign": "Pisces", "house": 5},
        "planets": [
            {"name": "Sun", "sign": "Cancer", "house": 10},
            {"name": "Moon", "sign": "Pisces", "house": 4},
            {"name": "Mercury", "sign": "Gemini", "house": 9},
            {"name": "Venus", "sign": "Aries", "house": 7},
            {"name": "Mars", "sign": "Capricorn", "house": 6},
        ],
        "aspects": [
            {"planet1": "Sun", "planet2": "Moon", "aspectType": "trine", "orb": 2.2},
            {"planet1": "Mars", "planet2": "Saturn", "aspectType": "square", "orb": 1.3},
            {"planet1": "Venus", "planet2": "Jupiter", "aspectType": "opposition", "orb": 2.8},
        ],
        "elementRatios": {"fire": 30, "earth": 25, "air": 20, "water": 25},
        "modalityRatios": {"cardinal": 35, "fixed": 30, "mutable": 35},
        "transits": [
            {"transitPlanet": "Saturn", "natalPlanet": "Sun", "aspectType": "square", "exactDate": "2026-03-14"},
            {"transitPlanet": "Jupiter", "natalPlanet": "Moon", "aspectType": "trine", "exactDate": "2026-07-22"},
        ],
        "progressions": {"summary": "present"},
    }


def leak_check() -> CheckResult:
    errors: List[str] = []
    warnings: List[str] = []
    metrics: Dict[str, object] = {}

    os.environ["USE_CHROMADB"] = "1"
    os.environ["EXCLUDE_NON_SAJU_ASTRO"] = "1"
    os.environ["RAG_TRACE"] = "1"

    stream = StringIO()
    handler = _CaptureHandler(stream)
    handler.setFormatter(logging.Formatter("%(message)s"))
    root = logging.getLogger()
    root.addHandler(handler)
    old_level = root.level
    root.setLevel(logging.INFO)

    result = {}
    try:
        from backend_ai.app.rag_manager import prefetch_all_rag_data_async

        async def _run():
            return await prefetch_all_rag_data_async(_mock_saju(), _mock_astro(), theme="love", locale="ko")

        result = asyncio.run(_run())
    except Exception as exc:
        errors.append(f"Runtime call failed: {exc}")
    finally:
        root.removeHandler(handler)
        root.setLevel(old_level)

    logs = stream.getvalue()
    skipped_corpus = logs.count("corpus_rag skipped")
    skipped_persona = logs.count("persona_rag skipped")
    skipped_domain = logs.count("domain_rag skipped")

    used_collections = []
    for line in logs.splitlines():
        token = "collection="
        if token in line:
            part = line.split(token, 1)[1]
            name = part.split(" ", 1)[0].strip()
            if name and name not in used_collections:
                used_collections.append(name)

    forbidden_calls_count = 0
    if result.get("corpus_quotes"):
        forbidden_calls_count += 1
    persona = result.get("persona_context") or {}
    if persona:
        forbidden_calls_count += 1
    if result.get("domain_knowledge"):
        forbidden_calls_count += 1

    if skipped_corpus <= 0 or skipped_persona <= 0 or skipped_domain <= 0:
        errors.append("Missing skipped trace logs for corpus/persona/domain")
    if forbidden_calls_count > 0:
        errors.append(f"Forbidden store results present: {forbidden_calls_count}")

    rows = [[
        str(forbidden_calls_count),
        f"corpus={skipped_corpus}, persona={skipped_persona}, domain={skipped_domain}",
        ",".join(used_collections) if used_collections else "(none)",
    ]]
    table_lines = _print_table("Leak", ["forbidden_calls_count", "skipped_counts", "collections_used"], rows)

    metrics["logs"] = logs
    metrics["collections_used"] = used_collections
    metrics["forbidden_calls_count"] = forbidden_calls_count
    metrics["skipped"] = {"corpus": skipped_corpus, "persona": skipped_persona, "domain": skipped_domain}

    status = "PASS"
    if errors:
        status = "FAIL"
    elif warnings:
        status = "WARN"

    return CheckResult(status=status, errors=errors, warnings=warnings, table_lines=table_lines, metrics=metrics)


def _meta_has_ref_pair(meta: Dict) -> bool:
    def _extract(key: str) -> List[str]:
        raw = meta.get(key)
        if isinstance(raw, str):
            parts = [p.strip() for p in raw.split(",") if p.strip()]
            if parts:
                return parts
        json_raw = meta.get(f"{key}_json")
        if isinstance(json_raw, str):
            try:
                parsed = json.loads(json_raw)
                if isinstance(parsed, list):
                    vals = [str(v).strip() for v in parsed if str(v).strip()]
                    if vals:
                        return vals
            except Exception:
                pass
        if isinstance(raw, list):
            vals = [str(v).strip() for v in raw if str(v).strip()]
            if vals:
                return vals
        return []

    saju = _extract("saju_refs") or _extract("saju_ref") or _extract("saju")
    astro = _extract("astro_refs") or _extract("astro_ref") or _extract("astro")
    return bool(saju and astro)


def _runtime_summary_has_ref_pair(summary: str) -> bool:
    if not summary:
        return False
    saju_line = "ì‚¬ì£¼ ê·¼ê±°:"
    astro_line = "ì ì„± ê·¼ê±°:"
    lines = [line.strip() for line in summary.splitlines() if line.strip()]
    for idx, line in enumerate(lines):
        if not line.startswith(saju_line):
            continue
        if idx + 1 >= len(lines):
            continue
        next_line = lines[idx + 1]
        if not next_line.startswith(astro_line):
            continue
        saju_val = line[len(saju_line):].strip()
        astro_val = next_line[len(astro_line):].strip()
        if saju_val and astro_val and saju_val != "ì—†ìŒ" and astro_val != "ì—†ìŒ":
            return True
    return False


def _runtime_evidence_flags_subprocess(queries: List[str]) -> List[bool]:
    payload = json.dumps(queries, ensure_ascii=False)
    probe = r"""
import json
import os
import sys
os.environ["USE_CHROMADB"] = "1"
os.environ["EXCLUDE_NON_SAJU_ASTRO"] = "1"
from backend_ai.app.rag.cross_store import build_cross_summary
queries = json.loads(sys.stdin.read())
out = []
for q in queries:
    s = build_cross_summary(
        q,
        saju_seed=["ê°‘", "ëª©", "ìˆ˜", "ë¹„ê²¬"],
        astro_seed=["Sun", "Moon", "Pisces"],
        top_k=12,
    )
    lines = [line.strip() for line in s.splitlines() if line.strip()]
    hit = False
    for i, line in enumerate(lines[:-1]):
        if ":" not in line:
            continue
        if ":" not in lines[i + 1]:
            continue
        left = line.split(":", 1)[1].strip()
        right = lines[i + 1].split(":", 1)[1].strip()
        if left and right and left not in {"ì—†ìŒ", "Ã¬â€”â€ Ã¬ÂÅ’"} and right not in {"ì—†ìŒ", "Ã¬â€”â€ Ã¬ÂÅ’"}:
            hit = True
            break
    out.append(hit)
print(json.dumps(out, ensure_ascii=False))
"""
    env = dict(os.environ)
    env["PYTHONIOENCODING"] = "utf-8"
    proc = subprocess.run(
        [sys.executable, "-c", probe],
        input=payload,
        text=True,
        encoding="utf-8",
        capture_output=True,
        env=env,
        check=False,
    )
    if proc.returncode != 0:
        return [False for _ in queries]
    try:
        data = json.loads(proc.stdout.strip() or "[]")
        return [bool(v) for v in data]
    except Exception:
        return [False for _ in queries]


def _runtime_advanced_guardrails_subprocess(queries: List[str]) -> Dict[str, float]:
    payload = json.dumps(queries, ensure_ascii=False)
    probe = r"""
import json
import os
import sys
os.environ["USE_CHROMADB"] = "1"
os.environ["EXCLUDE_NON_SAJU_ASTRO"] = "1"
os.environ["CROSS_ADVANCED"] = "1"
from backend_ai.app.rag.cross_store import build_cross_summary

saju = {
    "dayMaster": {"heavenlyStem": "갑", "element": "목"},
    "dominantElement": "수",
    "tenGods": {"dominant": "비견"},
    "tenGodsCount": {"비견": 3, "정관": 2, "정재": 1},
    "elementCounts": {"목": 2, "화": 1, "토": 1, "금": 1, "수": 3},
    "advancedAnalysis": {
        "extended": {"strength": {"level": "신강"}},
        "yongsin": {"primaryYongsin": "목", "kibsin": "금"},
        "sibsin": {"distribution": {"비견": 3, "정관": 2}},
        "hyeongchung": {"hap": [{"type": "지지합"}], "chung": [{"type": "지지충"}]},
    },
    "daeun": {"current": {"heavenlyStem": "갑", "earthlyBranch": "자", "sipsin": {"cheon": "비견", "ji": "정관"}}},
    "unse": {"annual": [{"year": 2026, "ganji": "병오"}], "monthly": [{"year": 2026, "month": 2, "ganji": "경인"}]},
}
astro = {
    "sun": {"name": "Sun", "sign": "Cancer", "house": 10},
    "moon": {"name": "Moon", "sign": "Pisces", "house": 4},
    "ascendant": {"sign": "Scorpio"},
    "mercury": {"name": "Mercury", "sign": "Gemini", "house": 9},
    "venus": {"name": "Venus", "sign": "Aries", "house": 7},
    "mars": {"name": "Mars", "sign": "Capricorn", "house": 6},
    "aspects": [
        {"planet1": "Sun", "planet2": "Moon", "aspectType": "trine", "orb": 2.2},
        {"planet1": "Mars", "planet2": "Saturn", "aspectType": "square", "orb": 1.3},
        {"planet1": "Venus", "planet2": "Jupiter", "aspectType": "opposition", "orb": 2.8},
    ],
    "elementRatios": {"fire": 30, "earth": 25, "air": 20, "water": 25},
    "modalityRatios": {"cardinal": 35, "fixed": 30, "mutable": 35},
    "transits": [{"transitPlanet": "Saturn", "natalPlanet": "Sun", "aspectType": "square"}],
}

def _refs(meta, key):
    raw = meta.get(key)
    if isinstance(raw, str):
        vals = [p.strip() for p in raw.split(",") if p.strip()]
        if vals:
            return vals
    raw_json = meta.get(f"{key}_json")
    if isinstance(raw_json, str):
        try:
            parsed = json.loads(raw_json)
            if isinstance(parsed, list):
                vals = [str(v).strip() for v in parsed if str(v).strip()]
                if vals:
                    return vals
        except Exception:
            pass
    if isinstance(raw, list):
        vals = [str(v).strip() for v in raw if str(v).strip()]
        if vals:
            return vals
    return []

queries = json.loads(sys.stdin.read())
total_groups = 0
groups_with_advanced_links = 0
groups_complete = 0
empty_advanced_link_count = 0
for q in queries:
    _summary, grouped = build_cross_summary(
        q,
        saju_seed=["갑", "목", "수", "비견"],
        astro_seed=["Cancer", "Pisces", "Scorpio"],
        saju_json=saju,
        astro_json=astro,
        top_k=12,
        max_groups=3,
        return_meta=True,
    )
    for axis, items in grouped:
        if not items:
            continue
        total_groups += 1
        top = items[0]
        meta = top.get("metadata") or {}
        saju_refs = _refs(meta, "saju_refs")
        astro_refs = _refs(meta, "astro_refs")
        if len(saju_refs) >= 2 and len(astro_refs) >= 2:
            groups_complete += 1
        links = meta.get("advanced_links")
        if not isinstance(links, list):
            links = []
        has_link = False
        for link in links:
            if not isinstance(link, dict):
                continue
            text = str(link.get("text") or "").strip()
            if text:
                has_link = True
            else:
                empty_advanced_link_count += 1
        if has_link:
            groups_with_advanced_links += 1

advanced_link_rate = (groups_with_advanced_links / total_groups * 100.0) if total_groups else 0.0
evidence_complete_rate = (groups_complete / total_groups * 100.0) if total_groups else 0.0
print(json.dumps({
    "total_groups": total_groups,
    "groups_with_advanced_links": groups_with_advanced_links,
    "advanced_link_rate": advanced_link_rate,
    "groups_evidence_complete": groups_complete,
    "evidence_complete_rate": evidence_complete_rate,
    "empty_advanced_link_count": empty_advanced_link_count,
}, ensure_ascii=False))
"""
    env = dict(os.environ)
    env["PYTHONIOENCODING"] = "utf-8"
    proc = subprocess.run(
        [sys.executable, "-c", probe],
        input=payload,
        text=True,
        encoding="utf-8",
        capture_output=True,
        env=env,
        check=False,
    )
    if proc.returncode != 0:
        return {
            "total_groups": 0,
            "groups_with_advanced_links": 0,
            "advanced_link_rate": 0.0,
            "groups_evidence_complete": 0,
            "evidence_complete_rate": 0.0,
            "empty_advanced_link_count": len(queries),
        }
    try:
        data = json.loads(proc.stdout.strip() or "{}")
        return {
            "total_groups": int(data.get("total_groups", 0) or 0),
            "groups_with_advanced_links": int(data.get("groups_with_advanced_links", 0) or 0),
            "advanced_link_rate": float(data.get("advanced_link_rate", 0.0) or 0.0),
            "groups_evidence_complete": int(data.get("groups_evidence_complete", 0) or 0),
            "evidence_complete_rate": float(data.get("evidence_complete_rate", 0.0) or 0.0),
            "empty_advanced_link_count": int(data.get("empty_advanced_link_count", 0) or 0),
        }
    except Exception:
        return {
            "total_groups": 0,
            "groups_with_advanced_links": 0,
            "advanced_link_rate": 0.0,
            "groups_evidence_complete": 0,
            "evidence_complete_rate": 0.0,
            "empty_advanced_link_count": len(queries),
        }


def quality_check(runtime_evidence: bool = False) -> CheckResult:
    errors: List[str] = []
    warnings: List[str] = []
    metrics: Dict[str, object] = {}

    os.environ["USE_CHROMADB"] = "1"
    os.environ["EXCLUDE_NON_SAJU_ASTRO"] = "1"

    runtime_flags: List[bool] = []
    runtime_idx = 0
    try:
        import chromadb

        if runtime_evidence:
            runtime_flags = _runtime_evidence_flags_subprocess(QUALITY_QUERIES)

        client = chromadb.PersistentClient(path=str(CHROMA_DIR))
        col = client.get_collection("saju_astro_cross_v1")
    except Exception as exc:
        return CheckResult(
            status="FAIL",
            errors=[f"Quality setup failed: {exc}"],
            warnings=[],
            table_lines=[],
            metrics={},
        )

    unique_theme_vals: List[int] = []
    cross_present = 0
    evidence_present = 0

    for q in QUALITY_QUERIES:
        res = col.query(
            query_texts=[q],
            n_results=12,
            where={"domain": "saju_astro_cross"},
            include=["documents", "metadatas"],
        )
        metas = res.get("metadatas", [[]])[0] if res else []
        docs = res.get("documents", [[]])[0] if res else []
        themes = set()
        for m in metas:
            if isinstance(m, dict):
                axis = m.get("theme") or m.get("axis")
                if axis:
                    themes.add(str(axis).lower())

        unique_theme_vals.append(len(themes))
        if len(metas) == 0:
            errors.append(f"Cross query returned 0 docs: {q[:24]}...")
            continue

        if docs:
            cross_present += 1

        evidence_found = False
        if runtime_evidence:
            evidence_found = runtime_idx < len(runtime_flags) and runtime_flags[runtime_idx]
            runtime_idx += 1
        else:
            for meta in metas[:5]:
                if not isinstance(meta, dict):
                    continue
                if _meta_has_ref_pair(meta):
                    evidence_found = True
                    break
        if evidence_found:
            evidence_present += 1

    avg_unique = statistics.mean(unique_theme_vals) if unique_theme_vals else 0.0
    cross_present_rate = _pct(cross_present, len(QUALITY_QUERIES))
    evidence_rate = _pct(evidence_present, len(QUALITY_QUERIES))
    advanced_mode = os.getenv("CROSS_ADVANCED", "0") == "1"
    advanced_metrics = {}

    if cross_present_rate <= 0:
        errors.append("Cross summary present rate is 0%")
    if evidence_rate < 100.0:
        warnings.append(f"Evidence rate is {evidence_rate:.1f}% (<100%)")
    if avg_unique < 2.0:
        warnings.append(f"avg_unique_theme@12 is {avg_unique:.2f} (<2)")

    if advanced_mode:
        advanced_metrics = _runtime_advanced_guardrails_subprocess(QUALITY_QUERIES)
        adv_rate = float(advanced_metrics.get("advanced_link_rate", 0.0))
        adv_evidence = float(advanced_metrics.get("evidence_complete_rate", 0.0))
        empty_adv_links = int(advanced_metrics.get("empty_advanced_link_count", 0))
        if adv_rate < 70.0:
            errors.append(f"Advanced link rate is {adv_rate:.1f}% (<70%) with CROSS_ADVANCED=1")
        if adv_evidence < 100.0:
            errors.append(f"Advanced evidence completeness is {adv_evidence:.1f}% (<100%)")
        if empty_adv_links > 0:
            errors.append(f"Empty advanced links found: {empty_adv_links}")

    rows = [[
        f"{avg_unique:.2f}",
        f"{cross_present_rate:.1f}%",
        f"{evidence_rate:.1f}%",
    ]]
    table_lines = _print_table(
        "Quality",
        ["avg_unique_theme@12", "cross_present_rate", "evidence_rate"],
        rows,
    )
    if advanced_mode:
        adv_rows = [[
            f"{advanced_metrics.get('advanced_link_rate', 0.0):.1f}%",
            f"{advanced_metrics.get('evidence_complete_rate', 0.0):.1f}%",
            str(int(advanced_metrics.get("empty_advanced_link_count", 0))),
        ]]
        table_lines += [""]
        table_lines += _print_table(
            "AdvancedQuality",
            ["advanced_link_rate", "advanced_evidence_rate", "empty_advanced_links"],
            adv_rows,
        )

    metrics["avg_unique_theme@12"] = avg_unique
    metrics["cross_present_rate"] = cross_present_rate
    metrics["evidence_rate"] = evidence_rate
    metrics["runtime_evidence"] = runtime_evidence
    metrics["advanced_mode"] = advanced_mode
    if advanced_mode:
        metrics["advanced"] = advanced_metrics

    status = "PASS"
    if errors:
        status = "FAIL"
    elif warnings:
        status = "WARN"

    return CheckResult(status=status, errors=errors, warnings=warnings, table_lines=table_lines, metrics=metrics)


def _print_section(result: CheckResult) -> None:
    print("\n".join(result.table_lines))
    if result.errors:
        print("errors:")
        for err in result.errors:
            print(f"- {err}")
    if result.warnings:
        print("warnings:")
        for warn in result.warnings:
            print(f"- {warn}")


def _next_actions(overall: str, health: CheckResult, leak: CheckResult, quality: CheckResult) -> List[str]:
    actions: List[str] = []
    if overall == "PASS":
        return actions

    if health.status != "PASS":
        actions.append("Reindex graph: python scripts\\reindex_saju_astro_graph_nodes.py --no-reset")
        actions.append("Reindex cross: python scripts\\reindex_saju_astro_cross.py --no-reset")
        actions.append("Check collection names in backend_ai/app/saju_astro_rag.py and backend_ai/app/rag/cross_store.py")

    if leak.status != "PASS":
        actions.append("Set envs before run: USE_CHROMADB=1, EXCLUDE_NON_SAJU_ASTRO=1, RAG_TRACE=1")
        actions.append("Confirm skipped logs exist for corpus/persona/domain in RAG_TRACE output")

    if quality.status != "PASS":
        actions.append("Reindex cross collection to refresh theme/fusion metadata")
        actions.append("Inspect missing axis/theme/fusion_key ratios in Health table")

    return actions


def main() -> int:
    parser = argparse.ArgumentParser(description="backend_ai self-check")
    parser.add_argument(
        "--runtime-evidence",
        action="store_true",
        help="Evaluate evidence_rate from runtime cross summary output instead of metadata only.",
    )
    args = parser.parse_args()

    print("backend_ai self-check running...")
    print(f"chroma_dir={CHROMA_DIR}")

    health = health_check()
    leak = leak_check()
    quality = quality_check(runtime_evidence=args.runtime_evidence)

    print()
    _print_section(health)
    print()
    _print_section(leak)
    print()
    _print_section(quality)

    overall = _merge_status(health.status, leak.status, quality.status)
    icon = "âœ…" if overall == "PASS" else ("âš ï¸" if overall == "WARN" else "âŒ")
    print()
    print(f"ì´í‰: {icon} {overall}")

    actions = _next_actions(overall, health, leak, quality)
    if actions:
        print("ë‹¤ìŒ ì•¡ì…˜:")
        for action in actions:
            print(f"- {action}")

    return 0 if overall == "PASS" else (2 if overall == "WARN" else 1)


if __name__ == "__main__":
    raise SystemExit(main())

