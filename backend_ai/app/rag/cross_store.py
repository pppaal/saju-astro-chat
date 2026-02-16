"""
Saju+Astro cross-analysis Chroma helpers.
"""

from __future__ import annotations

import logging
import os
import re
import json
from typing import Any, Dict, List, Optional, Tuple

from backend_ai.app.rag.vector_store import VectorStoreManager
from backend_ai.app.rag.advanced_signals import (
    build_advanced_link_text,
    extract_astro_advanced_signals,
    extract_saju_advanced_signals,
    select_signals_for_axis,
)

logger = logging.getLogger(__name__)


CROSS_COLLECTION_NAME = os.getenv("SAJU_ASTRO_CROSS_COLLECTION", "saju_astro_cross_v1")
CROSS_DOMAIN = os.getenv("SAJU_ASTRO_CROSS_DOMAIN", "saju_astro_cross")
GRAPH_COLLECTION_NAME = os.getenv("SAJU_ASTRO_GRAPH_COLLECTION", "saju_astro_graph_nodes_v1")
GRAPH_DOMAIN = os.getenv("SAJU_ASTRO_GRAPH_DOMAIN", "saju_astro")
_TRACE_ENV_KEY = "RAG_TRACE"
_ADVANCED_ENV_KEY = "CROSS_ADVANCED"


AXIS_LABELS = {
    "relationship": "관계",
    "career": "커리어",
    "wealth": "돈/재물",
    "health": "건강",
    "emotion": "감정",
    "life_path": "인생/운명",
    "timing": "타이밍",
    "identity": "성격/정체성",
    "general": "종합",
}

AXIS_KEYWORDS = {
    "relationship": ["연애", "사랑", "관계", "궁합", "결혼", "synastry", "relationship", "love", "compatibility"],
    "career": ["커리어", "직업", "일", "사업", "career", "work", "job", "vocation"],
    "wealth": ["돈", "재물", "부", "wealth", "money", "finance"],
    "health": ["건강", "질병", "치유", "health", "healing"],
    "emotion": ["감정", "마음", "심리", "emotion", "mood"],
    "life_path": ["인생", "운명", "길", "destiny", "life", "path", "karma"],
    "timing": ["시기", "타이밍", "운세", "progression", "timing", "daeun", "seun"],
    "identity": ["성격", "자아", "정체성", "identity", "personality"],
}

ASTRO_PLANETS = {
    "sun",
    "moon",
    "mercury",
    "venus",
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
    "pluto",
    "chiron",
    "lilith",
    "asc",
}

ASTRO_SIGNS = {
    "aries",
    "taurus",
    "gemini",
    "cancer",
    "leo",
    "virgo",
    "libra",
    "scorpio",
    "sagittarius",
    "capricorn",
    "aquarius",
    "pisces",
}


def _trace_enabled() -> bool:
    return os.getenv(_TRACE_ENV_KEY, "0") == "1"


def _trace(msg: str, *args) -> None:
    if _trace_enabled():
        logger.info("[RAG_TRACE] " + msg, *args)


def _advanced_enabled() -> bool:
    return os.getenv(_ADVANCED_ENV_KEY, "0") == "1"


def _get_embedding_model():
    # Reuse the same embedding function used by GraphRAG.
    from backend_ai.app.saju_astro_rag import get_model  # pylint: disable=import-outside-toplevel

    return get_model(prefer_multilingual=True)


def search_cross_collection(
    query: str,
    top_k: int = 8,
    min_score: float = 0.1,
) -> List[Dict]:
    """Search the dedicated Saju+Astro cross-analysis collection."""
    if os.getenv("USE_CHROMADB", "0") != "1":
        return []

    try:
        vs = VectorStoreManager(collection_name=CROSS_COLLECTION_NAME)
        if not vs.has_data():
            logger.warning(
                "[cross_store] Collection '%s' is empty",
                CROSS_COLLECTION_NAME,
            )
            return []

        model = _get_embedding_model()
        emb = model.encode(
            query,
            convert_to_tensor=False,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        vec = emb.tolist() if hasattr(emb, "tolist") else emb

        return vs.search(
            query_embedding=vec,
            top_k=top_k,
            min_score=min_score,
            where={"domain": CROSS_DOMAIN},
        )
    except Exception as exc:
        logger.warning("[cross_store] Search failed: %s", exc)
        return []


def _tokenize(text: str) -> List[str]:
    tokens = re.findall(r"[A-Za-z0-9_]+|[가-힣]+", text.lower())
    return [t for t in tokens if t]


def _split_refs(value: Optional[str]) -> List[str]:
    if not value:
        return []
    parts = [p.strip() for p in value.split(",") if p.strip()]
    return parts[:20]


def _split_refs_json(value) -> List[str]:
    if not value:
        return []
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()][:20]
    try:
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return [str(v).strip() for v in parsed if str(v).strip()][:20]
    except Exception:
        return []
    return []


def _get_refs_from_meta(meta: Dict, key: str) -> List[str]:
    refs = _split_refs(meta.get(key))
    if refs:
        return refs
    return _split_refs_json(meta.get(f"{key}_json"))


def _extract_description(doc: str) -> str:
    if not doc:
        return ""
    for line in doc.splitlines():
        if line.lower().startswith("description:"):
            return line.split(":", 1)[-1].strip()
    return doc.strip()


def _infer_refs_from_meta(meta: Dict) -> Tuple[List[str], List[str]]:
    saju_refs: List[str] = []
    astro_refs: List[str] = []

    tags = _split_refs(meta.get("tags"))
    label = meta.get("label") or ""
    tokens = tags + _tokenize(label)

    for token in tokens:
        t = token.strip()
        if not t:
            continue
        tl = t.lower()

        if t.startswith(("EL_", "SAJU_", "GAN_", "SIPSIN_", "SIBSIN_", "JDS_", "SHINSAL_")):
            saju_refs.append(t)
            continue
        if tl in ASTRO_PLANETS or tl in ASTRO_SIGNS or tl.startswith("h"):
            astro_refs.append(t)
            continue

    return saju_refs[:8], astro_refs[:8]


def _is_saju_token(token: str) -> bool:
    t = token.strip()
    if not t:
        return False
    if t.startswith(("EL_", "SAJU_", "GAN_", "SIPSIN_", "SIBSIN_", "JDS_", "SHINSAL_")):
        return True
    tl = t.lower()
    return (
        "saju" in tl
        or "ganji" in tl
        or "sipsin" in tl
        or "sibsin" in tl
        or "shinsal" in tl
        or tl.startswith("el_")
    )


def _is_astro_token(token: str) -> bool:
    t = token.strip()
    if not t:
        return False
    if t.startswith("ASTRO_"):
        return True
    tl = t.lower()
    if tl in ASTRO_PLANETS or tl in ASTRO_SIGNS or re.fullmatch(r"h\d{1,2}", tl):
        return True
    return "astro" in tl or "planet" in tl or "sign" in tl or "house" in tl


def _extract_refs_from_graph_hit(item: Dict) -> Tuple[List[str], List[str]]:
    meta = item.get("metadata") or {}
    text = item.get("text") or ""
    candidates: List[str] = []
    for key in ("label", "original_id", "tags", "source", "relation"):
        candidates.extend(_split_refs(meta.get(key)))
    candidates.extend(re.findall(r"[A-Za-z0-9_]+", text))

    saju_refs: List[str] = []
    astro_refs: List[str] = []
    seen_saju = set()
    seen_astro = set()
    for token in candidates:
        if _is_saju_token(token):
            tl = token.lower()
            if tl not in seen_saju:
                seen_saju.add(tl)
                saju_refs.append(token)
        if _is_astro_token(token):
            tl = token.lower()
            if tl not in seen_astro:
                seen_astro.add(tl)
                astro_refs.append(token)
    return saju_refs[:8], astro_refs[:8]


def _backfill_refs_from_graph(query: str, top_k: int = 5) -> Tuple[List[str], List[str]]:
    try:
        model = _get_embedding_model()
        emb = model.encode(
            query,
            convert_to_tensor=False,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        vec = emb.tolist() if hasattr(emb, "tolist") else emb
        graph_vs = VectorStoreManager(collection_name=GRAPH_COLLECTION_NAME)

        hits = graph_vs.search(
            query_embedding=vec,
            top_k=top_k,
            min_score=0.1,
            where={"domain": GRAPH_DOMAIN},
        )
        if not hits:
            hits = graph_vs.search(
                query_embedding=vec,
                top_k=top_k,
                min_score=0.1,
            )

        saju_refs: List[str] = []
        astro_refs: List[str] = []
        for hit in hits:
            hs, ha = _extract_refs_from_graph_hit(hit)
            for ref in hs:
                if ref not in saju_refs:
                    saju_refs.append(ref)
            for ref in ha:
                if ref not in astro_refs:
                    astro_refs.append(ref)
            if saju_refs and astro_refs:
                break
        return saju_refs[:8], astro_refs[:8]
    except Exception:
        return [], []


def _search_graph_hits(query: str, top_k: int = 5) -> List[Dict]:
    try:
        model = _get_embedding_model()
        emb = model.encode(
            query,
            convert_to_tensor=False,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        vec = emb.tolist() if hasattr(emb, "tolist") else emb
        graph_vs = VectorStoreManager(collection_name=GRAPH_COLLECTION_NAME)
        hits = graph_vs.search(
            query_embedding=vec,
            top_k=top_k,
            min_score=0.1,
            where={"domain": GRAPH_DOMAIN},
        )
        if not hits:
            hits = graph_vs.search(
                query_embedding=vec,
                top_k=top_k,
                min_score=0.1,
            )
        return hits
    except Exception:
        return []


def _unique_keep_order(values: List[str], limit: int = 20) -> List[str]:
    out: List[str] = []
    seen = set()
    for value in values:
        token = (value or "").strip()
        if not token:
            continue
        low = token.lower()
        if low in seen:
            continue
        seen.add(low)
        out.append(token)
        if len(out) >= limit:
            break
    return out


def _refs_to_evidence_items(refs: List[str], limit: int = 2) -> List[str]:
    items = []
    for ref in refs:
        items.append(f"id={ref}")
        if len(items) >= limit:
            break
    return items


def _hit_title_id(hit: Dict) -> Tuple[str, str]:
    hit_meta = hit.get("metadata") or {}
    title = (hit_meta.get("label") or "").strip()
    node_id = (hit_meta.get("original_id") or hit.get("id") or "").strip()
    if not title:
        title = node_id or "unknown"
    if not node_id:
        node_id = title
    return title, node_id


def _source_hint_kind(hit: Dict) -> str:
    hit_meta = hit.get("metadata") or {}
    source = str(hit_meta.get("source") or "").lower()
    node_type = str(hit_meta.get("type") or "").lower()
    label = str(hit_meta.get("label") or "").lower()
    text = str(hit.get("text") or "").lower()
    merged = " ".join([source, node_type, label, text])
    has_saju = any(tok in merged for tok in ("saju", "gan", "sipsin", "sibsin", "shinsal", "지지", "지장간"))
    has_astro = any(tok in merged for tok in ("astro", "planet", "house", "sign", "aspect", "transit"))
    if has_saju and not has_astro:
        return "saju"
    if has_astro and not has_saju:
        return "astro"
    return "both" if has_saju and has_astro else "unknown"


def _collect_signal_evidence(
    axis: str,
    signal: Dict[str, Any],
    kind: str,
    query_text: str,
    top_k: int = 8,
) -> Tuple[List[str], List[Dict[str, Any]], str]:
    refs: List[str] = []
    evidence_items: List[Dict[str, Any]] = []
    sources = set()
    used_backfill = False

    label = str(signal.get("label") or "").strip()
    value = str(signal.get("value") or "").strip()
    search_query = " ".join([p for p in [axis, label, value, query_text[:120]] if p]).strip()
    hits = _search_graph_hits(search_query, top_k=top_k)

    def _append_from_hit(hit: Dict, mark_backfill: bool = False) -> bool:
        nonlocal used_backfill
        hs, ha = _extract_refs_from_graph_hit(hit)
        kind_hint = _source_hint_kind(hit)
        if kind == "saju":
            ref_pool = hs
            kind_ok = bool(hs) or kind_hint in ("saju", "both")
        else:
            ref_pool = ha
            kind_ok = bool(ha) or kind_hint in ("astro", "both")
        if not kind_ok:
            return False

        title, node_id = _hit_title_id(hit)
        score = float(hit.get("score") or 0.0)
        evidence_items.append(
            {
                "title": title,
                "id": node_id,
                "score": round(score, 4),
                "signal_key": signal.get("key", ""),
                "backfill": bool(mark_backfill),
            }
        )
        if mark_backfill:
            used_backfill = True

        if ref_pool:
            refs.extend(ref_pool)
        else:
            refs.append(node_id)
        sources.add("similarity")
        return True

    for hit in hits:
        _append_from_hit(hit, mark_backfill=False)
        if len(evidence_items) >= 2 and len(refs) >= 2:
            break

    if len(evidence_items) < 2 or len(refs) < 2:
        fallback_hits = _search_graph_hits(" ".join([axis, query_text[:120], kind]), top_k=10)
        for hit in fallback_hits:
            if _append_from_hit(hit, mark_backfill=True):
                sources.add("backfill")
            if len(evidence_items) >= 2 and len(refs) >= 2:
                break

    refs = _unique_keep_order(refs, limit=12)
    if not evidence_items and refs:
        evidence_items = [{"title": refs[0], "id": refs[0], "score": 0.0, "signal_key": signal.get("key", ""), "backfill": True}]

    source_text = ",".join(sorted(sources)) if sources else ("backfill" if used_backfill else "none")
    return refs[:12], evidence_items[:2], source_text


def _build_group_advanced_link(
    axis: str,
    query_text: str,
    saju_signals: List[Dict[str, Any]],
    astro_signals: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    selected_saju = select_signals_for_axis(saju_signals, axis, limit=2)
    selected_astro = select_signals_for_axis(astro_signals, axis, limit=2)
    if not selected_saju or not selected_astro:
        return None

    link_text = build_advanced_link_text(axis, selected_saju, selected_astro).strip()
    if not link_text:
        return None

    saju_refs: List[str] = []
    astro_refs: List[str] = []
    saju_evidence: List[Dict[str, Any]] = []
    astro_evidence: List[Dict[str, Any]] = []
    sources = set()

    for sig in selected_saju:
        refs, evidence, source = _collect_signal_evidence(axis, sig, "saju", query_text, top_k=8)
        saju_refs.extend(refs)
        saju_evidence.extend(evidence)
        if source and source != "none":
            sources.update(source.split(","))

    for sig in selected_astro:
        refs, evidence, source = _collect_signal_evidence(axis, sig, "astro", query_text, top_k=8)
        astro_refs.extend(refs)
        astro_evidence.extend(evidence)
        if source and source != "none":
            sources.update(source.split(","))

    return {
        "axis": axis,
        "text": link_text,
        "saju_signals": [{"key": s.get("key"), "label": s.get("label"), "value": s.get("value"), "tags": s.get("tags", [])} for s in selected_saju],
        "astro_signals": [{"key": s.get("key"), "label": s.get("label"), "value": s.get("value"), "tags": s.get("tags", [])} for s in selected_astro],
        "saju_refs": _unique_keep_order(saju_refs, limit=12),
        "astro_refs": _unique_keep_order(astro_refs, limit=12),
        "saju_evidence": saju_evidence[:4],
        "astro_evidence": astro_evidence[:4],
        "advanced_evidence_source": ",".join(sorted(sources)) if sources else "none",
    }


def _collect_evidence(
    meta: Dict,
    query_text: str,
    extra_saju_refs: Optional[List[str]] = None,
    extra_astro_refs: Optional[List[str]] = None,
) -> Tuple[List[str], List[str], List[str], List[str], bool]:
    saju_refs = _get_refs_from_meta(meta, "saju_refs")
    astro_refs = _get_refs_from_meta(meta, "astro_refs")
    saju_refs = _unique_keep_order(saju_refs + list(extra_saju_refs or []), limit=12)
    astro_refs = _unique_keep_order(astro_refs + list(extra_astro_refs or []), limit=12)

    if not saju_refs or not astro_refs:
        infer_saju, infer_astro = _infer_refs_from_meta(meta)
        saju_refs = _unique_keep_order(saju_refs + infer_saju, limit=12)
        astro_refs = _unique_keep_order(astro_refs + infer_astro, limit=12)

    saju_items = _refs_to_evidence_items(saju_refs, limit=2)
    astro_items = _refs_to_evidence_items(astro_refs, limit=2)
    backfill_applied = False

    need_backfill = len(saju_items) < 2 or len(astro_items) < 2
    if need_backfill:
        graph_hits = _search_graph_hits(query_text, top_k=12)
        for hit in graph_hits:
            label, original_id = _hit_title_id(hit)
            kind_hint = _source_hint_kind(hit)

            hit_saju, hit_astro = _extract_refs_from_graph_hit(hit)
            hit_saju_ok = bool(hit_saju) or kind_hint in ("saju", "both")
            hit_astro_ok = bool(hit_astro) or kind_hint in ("astro", "both")

            if hit_saju_ok and len(saju_items) < 2:
                saju_items.append(f"title={label} id={original_id}")
                saju_refs = _unique_keep_order(saju_refs + (hit_saju or [original_id]), limit=12)
                backfill_applied = True
            if hit_astro_ok and len(astro_items) < 2:
                astro_items.append(f"title={label} id={original_id}")
                astro_refs = _unique_keep_order(astro_refs + (hit_astro or [original_id]), limit=12)
                backfill_applied = True
            if len(saju_items) >= 2 and len(astro_items) >= 2:
                break

    # Hard guardrail: always emit >=2 evidence slots per side.
    if len(saju_items) < 2:
        for idx in range(len(saju_items), 2):
            fallback_id = f"missing_saju_{idx + 1}"
            saju_items.append(f"id={fallback_id}")
            saju_refs.append(fallback_id)
    if len(astro_items) < 2:
        for idx in range(len(astro_items), 2):
            fallback_id = f"missing_astro_{idx + 1}"
            astro_items.append(f"id={fallback_id}")
            astro_refs.append(fallback_id)

    return _unique_keep_order(saju_refs, 12), _unique_keep_order(astro_refs, 12), saju_items[:2], astro_items[:2], backfill_applied


def _rule_match_bonus(meta: Dict, query_tokens: List[str]) -> float:
    axis = (meta.get("axis") or meta.get("theme") or "").lower()
    if axis:
        for kw in AXIS_KEYWORDS.get(axis, []):
            if kw.lower() in query_tokens:
                return 1.0
    fusion_key = (meta.get("fusion_key") or "").lower()
    for token in query_tokens:
        if token and token in fusion_key:
            return 1.0
    return 0.0


def _overlap_bonus(meta: Dict, saju_seed: List[str], astro_seed: List[str]) -> float:
    saju_refs = {r.lower() for r in _get_refs_from_meta(meta, "saju_refs")}
    astro_refs = {r.lower() for r in _get_refs_from_meta(meta, "astro_refs")}
    bonus = 0.0
    if saju_seed and saju_refs:
        if any(s.lower() in saju_refs for s in saju_seed):
            bonus += 0.5
    if astro_seed and astro_refs:
        if any(a.lower() in astro_refs for a in astro_seed):
            bonus += 0.5
    return bonus


def rank_cross_results(
    query: str,
    results: List[Dict],
    saju_seed: Optional[List[str]] = None,
    astro_seed: Optional[List[str]] = None,
) -> List[Dict]:
    """Apply custom ranking: sim + 0.2 * rule_match + 0.2 * overlap."""
    query_tokens = _tokenize(query)
    saju_seed = [s for s in (saju_seed or []) if s]
    astro_seed = [a for a in (astro_seed or []) if a]

    ranked = []
    for item in results:
        meta = item.get("metadata") or {}
        sim = float(item.get("score") or 0.0)
        rule_bonus = _rule_match_bonus(meta, query_tokens)
        overlap_bonus = _overlap_bonus(meta, saju_seed, astro_seed)
        cross_score = sim + 0.2 * rule_bonus + 0.2 * overlap_bonus
        enriched = dict(item)
        enriched["cross_score"] = round(cross_score, 4)
        enriched["rule_match_bonus"] = round(rule_bonus, 2)
        enriched["overlap_bonus"] = round(overlap_bonus, 2)
        ranked.append(enriched)

    ranked.sort(key=lambda x: x.get("cross_score", 0.0), reverse=True)
    return ranked


def _axis_label(axis: str) -> str:
    return AXIS_LABELS.get(axis, AXIS_LABELS["general"])


def group_cross_results(
    results: List[Dict],
    max_groups: int = 3,
) -> List[Tuple[str, List[Dict]]]:
    groups: Dict[str, List[Dict]] = {}
    for item in results:
        meta = item.get("metadata") or {}
        axis = (meta.get("axis") or meta.get("theme") or "general").lower()
        groups.setdefault(axis, []).append(item)

    # Sort items within each group
    for axis, items in groups.items():
        items.sort(key=lambda x: x.get("cross_score", x.get("score", 0.0)), reverse=True)

    # Sort groups by top item score
    sorted_groups = sorted(
        groups.items(),
        key=lambda kv: kv[1][0].get("cross_score", kv[1][0].get("score", 0.0)),
        reverse=True,
    )
    return sorted_groups[:max_groups]


def build_cross_summary(
    query: str,
    saju_seed: Optional[List[str]] = None,
    astro_seed: Optional[List[str]] = None,
    saju_json: Optional[Dict[str, Any]] = None,
    astro_json: Optional[Dict[str, Any]] = None,
    top_k: int = 12,
    max_groups: int = 3,
    max_len: int = 320,
    return_meta: bool = False,
):
    """Search + rank + group cross-analysis results into 1~3 summaries with evidence."""
    results = search_cross_collection(query, top_k=top_k, min_score=0.1)
    if not results:
        return ("", []) if return_meta else ""

    ranked = rank_cross_results(query, results, saju_seed=saju_seed, astro_seed=astro_seed)
    grouped = group_cross_results(ranked, max_groups=max_groups)
    _trace("cross_summary groups=%d total=%d", len(grouped), len(ranked))

    advanced_mode = _advanced_enabled()
    advanced_saju_signals: List[Dict[str, Any]] = []
    advanced_astro_signals: List[Dict[str, Any]] = []
    if advanced_mode:
        advanced_saju_signals = extract_saju_advanced_signals(saju_json or {})
        advanced_astro_signals = extract_astro_advanced_signals(astro_json or {})
        _trace(
            "advanced signals enabled saju=%d astro=%d",
            len(advanced_saju_signals),
            len(advanced_astro_signals),
        )

    lines: List[str] = []
    for idx, (axis, items) in enumerate(grouped, start=1):
        top = items[0]
        meta = top.get("metadata") or {}
        doc_text = (top.get("text") or "").strip()
        text = _extract_description(doc_text).replace("\n", " ")
        if text:
            text = text[:max_len]

        axis_label = _axis_label(axis)
        fusion_key = (meta.get("fusion_key") or meta.get("source") or "cross").strip()
        source_name = (meta.get("source") or "cross").strip()

        advanced_links: List[Dict[str, Any]] = []
        advanced_sources = set()
        extra_saju_refs: List[str] = []
        extra_astro_refs: List[str] = []
        if advanced_mode and (advanced_saju_signals or advanced_astro_signals):
            link = _build_group_advanced_link(axis, doc_text or query, advanced_saju_signals, advanced_astro_signals)
            if link:
                advanced_links.append(link)
                extra_saju_refs.extend(link.get("saju_refs", []))
                extra_astro_refs.extend(link.get("astro_refs", []))
                source_text = str(link.get("advanced_evidence_source") or "").strip()
                if source_text and source_text != "none":
                    advanced_sources.update([p.strip() for p in source_text.split(",") if p.strip()])

        saju_refs, astro_refs, saju_items, astro_items, applied = _collect_evidence(
            meta,
            doc_text or query,
            extra_saju_refs=extra_saju_refs,
            extra_astro_refs=extra_astro_refs,
        )
        if applied:
            _trace("evidence backfill applied axis=%s source=%s", axis, source_name)

        lines.append(f"[교차 요약 {idx}] {axis_label}")
        lines.append(f"1) 핵심 테마: {text}")
        lines.append(f"2) 규칙 키: theme={axis} fusion_key={fusion_key}")
        lines.append("3) 해석 포인트: 사주/점성 공통 방향을 우선 적용")
        lines.append(f"4) 사주 근거: {saju_items[0]} ; {saju_items[1]}")
        lines.append(f"5) 점성 근거: {astro_items[0]} ; {astro_items[1]}")

        meta["saju_refs"] = ", ".join(saju_refs)
        meta["astro_refs"] = ", ".join(astro_refs)
        meta["saju_refs_json"] = json.dumps(saju_refs, ensure_ascii=False)
        meta["astro_refs_json"] = json.dumps(astro_refs, ensure_ascii=False)

        if advanced_mode:
            meta["advanced_signals_saju_json"] = json.dumps(advanced_saju_signals, ensure_ascii=False)
            meta["advanced_signals_astro_json"] = json.dumps(advanced_astro_signals, ensure_ascii=False)
            meta["advanced_links"] = advanced_links
            meta["advanced_links_json"] = json.dumps(advanced_links, ensure_ascii=False)
            meta["advanced_evidence_source"] = ",".join(sorted(advanced_sources)) if advanced_sources else "none"

    summary = "\n".join(lines)
    if return_meta:
        return summary, grouped
    return summary

def format_cross_results(results: List[Dict], limit: int = 8, max_len: int = 500) -> str:
    """Legacy formatter for raw cross-analysis results."""
    lines: List[str] = []
    seen = set()

    for item in results[:limit]:
        text = (item.get("text") or "").strip()
        if not text:
            continue
        meta = item.get("metadata") or {}
        label = (meta.get("label") or meta.get("relation") or meta.get("source") or "").strip()

        if label and label not in text:
            line = f"{label}: {text}"
        else:
            line = text

        line = line.strip()
        if not line:
            continue

        key = line[:120].lower()
        if key in seen:
            continue
        seen.add(key)
        lines.append(f"- {line[:max_len]}")

    return "\n".join(lines)

