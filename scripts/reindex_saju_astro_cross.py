#!/usr/bin/env python
"""
Reindex Saju+Astro cross-analysis data into a dedicated Chroma collection.

Goal:
- Separate cross-analysis from other domains (Jung/stoic/etc).
- Reuse existing cross_analysis and fusion data only.

Usage:
  python scripts/reindex_saju_astro_cross.py
  python scripts/reindex_saju_astro_cross.py --no-reset
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Dict, Iterable, List, Tuple


COLLECTION_NAME = "saju_astro_cross_v1"
DOMAIN_NAME = "saju_astro_cross"


REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_AI_ROOT = REPO_ROOT / "backend_ai"
if str(BACKEND_AI_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_AI_ROOT))
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


EXCLUDE_KEYWORDS = (
    "jung",
    "stoic",
    "persona",
    "dream",
    "tarot",
    "numerology",
    "iching",
    "multidomain",
    "multilayer",
    "alias",
)


TEXT_FIELD_HINTS = (
    "text",
    "description",
    "meaning",
    "advice",
    "interpretation",
    "summary",
    "core_theme",
    "positive_expression",
    "negative_expression",
    "transit_effect",
    "shared_energy",
    "personality",
    "note",
    "reason",
    "correlation",
)


TAG_FIELDS = (
    "planet",
    "secondary",
    "sign",
    "house",
    "element",
    "branch",
    "direction",
    "relation",
    "interaction_type",
    "korean",
)


AXIS_SOURCE_MAP = {
    "cross_relations_aspects": "relationship",
    "cross_synastry_gunghap": "relationship",
    "cross_branch_house": "life_path",
    "cross_geokguk_house": "career",
    "cross_shinsal_asteroids": "emotion",
    "cross_sipsin_planets": "identity",
    "cross_60ganji_harmonic": "timing",
    "cross_luck_progression": "timing",
    "cross_draconic_karma": "life_path",
    "cross_electional_taegil": "timing",
    "cross_rectification": "identity",
    "cross_system_validation": "general",
}

AXIS_KEYWORDS = {
    "relationship": ["relationship", "love", "synastry", "compatibility", "궁합", "연애", "결혼", "관계"],
    "career": ["career", "work", "job", "vocation", "직업", "커리어", "일", "사업"],
    "wealth": ["wealth", "money", "finance", "재물", "돈", "부"],
    "health": ["health", "healing", "치유", "건강", "질병"],
    "emotion": ["emotion", "mood", "감정", "마음", "심리"],
    "life_path": ["destiny", "life", "path", "karma", "운명", "인생", "길"],
    "timing": ["timing", "progression", "daeun", "seun", "시기", "타이밍", "운세"],
    "identity": ["identity", "personality", "성격", "자아", "정체성"],
}

SAJU_REF_KEYS = (
    "sipsin",
    "sibsin",
    "ten_god",
    "shinsal",
    "ganji",
    "branch",
    "stem",
    "ohaeng",
    "daymaster",
    "saju",
    "geokguk",
)

ASTRO_REF_KEYS = (
    "planet",
    "sign",
    "house",
    "aspect",
    "asteroid",
    "draconic",
    "synastry",
    "astro",
    "node",
)

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

SAJU_PREFIXES = ("EL_", "SAJU_", "GAN_", "SIPSIN_", "SIBSIN_", "JDS_", "SHINSAL_")
ASTRO_PREFIXES = ("ASTRO_",)


def _clean_text(value: object) -> str:
    if value is None:
        return ""
    text = str(value).replace("\x00", " ").strip()
    return re.sub(r"\s+", " ", text)


def _truncate(text: str, limit: int) -> str:
    return text if len(text) <= limit else text[:limit].rstrip()


def _infer_axis_from_text(text: str) -> str:
    lowered = text.lower()
    for axis, keywords in AXIS_KEYWORDS.items():
        if any(k in lowered for k in keywords):
            return axis
    return ""


def _infer_axis(record: Dict, source: str) -> str:
    life_areas = record.get("life_areas")
    if isinstance(life_areas, dict):
        best_axis = ""
        best_len = 0
        for key, value in life_areas.items():
            if not value:
                continue
            axis = _infer_axis_from_text(str(key))
            axis = axis or _infer_axis_from_text(str(value))
            if axis:
                length = len(str(value))
                if length > best_len:
                    best_len = length
                    best_axis = axis
        if best_axis:
            return best_axis

    life_themes = record.get("life_themes")
    if isinstance(life_themes, dict):
        combined = " ".join([str(v) for v in life_themes.values() if v])
        axis = _infer_axis_from_text(combined)
        if axis:
            return axis

    for key, value in record.items():
        axis = _infer_axis_from_text(str(key))
        if axis:
            return axis
        axis = _infer_axis_from_text(str(value))
        if axis:
            return axis

    return AXIS_SOURCE_MAP.get(source, "general")


def _extract_refs(record: Dict) -> Tuple[List[str], List[str]]:
    saju_refs = set()
    astro_refs = set()

    def add_saju(val: object):
        token = _clean_text(val)
        if token:
            saju_refs.add(token)

    def add_astro(val: object):
        token = _clean_text(val)
        if token:
            astro_refs.add(token)

    for key, value in record.items():
        key_lower = str(key).lower()
        if any(k in key_lower for k in SAJU_REF_KEYS):
            add_saju(value)
        if any(k in key_lower for k in ASTRO_REF_KEYS):
            add_astro(value)

        if isinstance(value, str):
            lowered = value.lower()
            if lowered.startswith("el_") or "오행" in lowered:
                add_saju(value)
            if lowered.startswith("astro_"):
                add_astro(value)

            tokens = re.findall(r"[A-Za-z]+|H\\d+", value)
            for t in tokens:
                tl = t.lower()
                if tl in ASTRO_PLANETS or tl in ASTRO_SIGNS or tl.startswith("h"):
                    add_astro(t)

    for field in ("source", "target", "id", "label", "name"):
        if field in record:
            val = record.get(field)
            if isinstance(val, str):
                if val.startswith("EL_") or val.startswith("SAJU_"):
                    add_saju(val)
                if val.startswith("ASTRO_"):
                    add_astro(val)

    return sorted(saju_refs)[:12], sorted(astro_refs)[:12]


def _extract_explicit_refs(record: Dict) -> Tuple[List[str], List[str]]:
    saju_refs = set()
    astro_refs = set()
    for key, value in record.items():
        key_lower = str(key).lower()
        token = _clean_text(value)
        if not token:
            continue
        if "saju_ref" in key_lower or key_lower in {"saju", "saju_refs"}:
            saju_refs.add(token)
        if "astro_ref" in key_lower or key_lower in {"astro", "astro_refs"}:
            astro_refs.add(token)
    return sorted(saju_refs)[:12], sorted(astro_refs)[:12]


def _is_saju_ref(token: str) -> bool:
    t = token.strip()
    if not t:
        return False
    if t.startswith(SAJU_PREFIXES):
        return True
    tl = t.lower()
    return (
        "saju" in tl
        or "ganji" in tl
        or "sipsin" in tl
        or "sibsin" in tl
        or "shinsal" in tl
        or "ohaeng" in tl
        or "daymaster" in tl
        or tl.startswith("el_")
    )


def _is_astro_ref(token: str) -> bool:
    t = token.strip()
    if not t:
        return False
    if t.startswith(ASTRO_PREFIXES):
        return True
    tl = t.lower()
    if tl in ASTRO_PLANETS or tl in ASTRO_SIGNS or re.fullmatch(r"h\d{1,2}", tl):
        return True
    return "astro" in tl or "planet" in tl or "sign" in tl or "house" in tl


def _split_csv_refs(value: object) -> List[str]:
    if not value:
        return []
    if isinstance(value, list):
        tokens = []
        for v in value:
            tokens.extend(_split_csv_refs(v))
        return tokens
    text = _clean_text(value)
    if not text:
        return []
    return [p.strip() for p in text.split(",") if p.strip()]


def _extract_graph_refs_from_result(item: Dict) -> Tuple[List[str], List[str]]:
    meta = item.get("metadata") or {}
    text = item.get("text") or ""
    candidates: List[str] = []
    for field in ("label", "original_id", "tags", "source", "type", "relation"):
        candidates.extend(_split_csv_refs(meta.get(field)))
    candidates.extend(re.findall(r"[A-Za-z0-9_]+", text))

    saju_refs = []
    astro_refs = []
    seen_saju = set()
    seen_astro = set()
    for token in candidates:
        if _is_saju_ref(token):
            tl = token.lower()
            if tl not in seen_saju:
                seen_saju.add(tl)
                saju_refs.append(token)
        if _is_astro_ref(token):
            tl = token.lower()
            if tl not in seen_astro:
                seen_astro.add(tl)
                astro_refs.append(token)
    return saju_refs[:12], astro_refs[:12]


def _iter_cross_files(graph_root: Path) -> List[Path]:
    files: List[Path] = []

    cross_dir = graph_root / "cross_analysis"
    if cross_dir.exists():
        files.extend(sorted(cross_dir.rglob("*.csv")))

    fusion_dir = graph_root / "fusion"
    if fusion_dir.exists():
        for path in fusion_dir.rglob("*"):
            if not path.is_file():
                continue
            if path.suffix.lower() not in {".csv", ".json"}:
                continue

            name = path.name.lower()
            if any(key in name for key in EXCLUDE_KEYWORDS):
                continue

            if "cross" in name:
                files.append(path)
                continue
            if "saju_astro" in name or "saju-astro" in name:
                files.append(path)
                continue
            if "saju" in name and "astro" in name:
                files.append(path)

    # Deduplicate
    return sorted(set(files))


def _extract_tags(record: Dict) -> List[str]:
    tags: List[str] = []

    def _add(val: object) -> None:
        token = _clean_text(val)
        if token:
            tags.append(token)

    for key in TAG_FIELDS:
        if key in record:
            _add(record.get(key))

    # Include id/source/target if present
    for key in ("id", "source", "target", "label", "name"):
        if key in record:
            _add(record.get(key))

    # Deduplicate
    seen = set()
    unique = []
    for t in tags:
        low = t.lower()
        if low in seen:
            continue
        seen.add(low)
        unique.append(t)
    return unique[:20]


def _flatten_strings(obj: object, prefix: str = "", max_items: int = 40) -> List[Tuple[str, str]]:
    items: List[Tuple[str, str]] = []

    def _walk(value: object, path: str) -> None:
        if len(items) >= max_items:
            return
        if isinstance(value, str):
            val = value.strip()
            if val:
                items.append((path, val))
            return
        if isinstance(value, (int, float)):
            items.append((path, str(value)))
            return
        if isinstance(value, dict):
            for k, v in value.items():
                if k.startswith("$"):
                    continue
                child_path = f"{path}.{k}" if path else k
                _walk(v, child_path)
            return
        if isinstance(value, list):
            for idx, v in enumerate(value):
                child_path = f"{path}[{idx}]" if path else str(idx)
                _walk(v, child_path)

    _walk(obj, prefix)
    return items


def _build_doc_from_record(record: Dict, source: str, fusion_key: str) -> Tuple[str, Dict]:
    title = (
        _clean_text(record.get("label"))
        or _clean_text(record.get("name"))
        or _clean_text(record.get("title"))
        or _clean_text(record.get("korean"))
        or _clean_text(record.get("id"))
    )
    title = title or "saju_astro_cross"

    desc = _clean_text(record.get("description") or record.get("desc") or record.get("text") or "")
    if not desc:
        pairs = _flatten_strings(record)
        if pairs:
            desc_parts = []
            for key, value in pairs:
                if any(hint in key.lower() for hint in TEXT_FIELD_HINTS):
                    desc_parts.append(f"{key}: {value}")
            if not desc_parts:
                desc_parts = [f"{k}: {v}" for k, v in pairs[:20]]
            desc = " | ".join(desc_parts)

    cross_hint = _clean_text(
        record.get("relation") or record.get("interaction_type") or record.get("harmony_score")
    )
    tags = _extract_tags(record)
    axis = _infer_axis(record, source)
    explicit_saju_refs, explicit_astro_refs = _extract_explicit_refs(record)
    pattern_saju_refs, pattern_astro_refs = _extract_refs(record)

    saju_refs = explicit_saju_refs or pattern_saju_refs
    astro_refs = explicit_astro_refs or pattern_astro_refs
    evidence_sources: List[str] = []
    if explicit_saju_refs or explicit_astro_refs:
        evidence_sources.append("source_refs")
    if (not explicit_saju_refs and pattern_saju_refs) or (not explicit_astro_refs and pattern_astro_refs):
        evidence_sources.append("pattern_refs")

    lines = [f"title: {title}", f"description: {_truncate(desc, 1600)}"]
    if cross_hint:
        lines.append(f"cross_hint: {cross_hint}")
    if tags:
        lines.append("keywords: " + ", ".join(tags))

    document = "\n".join(lines)

    original_id = _clean_text(record.get("id") or title)
    metadata = {
        "domain": DOMAIN_NAME,
        "source": source,
        "type": _clean_text(record.get("type") or "cross_record"),
        "label": _truncate(title, 240),
        "original_id": _truncate(original_id, 240),
        "relation": _truncate(_clean_text(record.get("relation")), 120),
        "tags": _truncate(", ".join(tags), 400),
        "axis": axis,
        "theme": axis,
        "fusion_key": _truncate(fusion_key or source, 240),
        "saju_refs": _truncate(", ".join(saju_refs), 400),
        "astro_refs": _truncate(", ".join(astro_refs), 400),
        "saju_refs_json": _truncate(json.dumps(saju_refs, ensure_ascii=False), 400),
        "astro_refs_json": _truncate(json.dumps(astro_refs, ensure_ascii=False), 400),
        "evidence_source": ",".join(evidence_sources) if evidence_sources else "none",
    }
    return document, metadata


def _iter_json_records(data: object, prefix: str = "") -> List[Tuple[str, Dict]]:
    records: List[Tuple[str, Dict]] = []

    def _is_record_dict(d: Dict) -> bool:
        if not isinstance(d, dict):
            return False
        if any(isinstance(v, str) and v.strip() for v in d.values()):
            return True
        return False

    def _walk(value: object, path: str) -> None:
        if isinstance(value, dict):
            if _is_record_dict(value):
                records.append((path or "record", value))
                return
            for k, v in value.items():
                if k.startswith("$"):
                    continue
                child_path = f"{path}.{k}" if path else k
                _walk(v, child_path)
        elif isinstance(value, list):
            for idx, item in enumerate(value):
                child_path = f"{path}[{idx}]" if path else str(idx)
                _walk(item, child_path)

    _walk(data, prefix)
    return records


def _load_csv_records(path: Path) -> List[Tuple[str, Dict]]:
    records: List[Tuple[str, Dict]] = []
    try:
        with path.open("r", encoding="utf-8-sig", newline="") as f:
            for row in csv.DictReader(f):
                if not isinstance(row, dict):
                    continue
                title_hint = _clean_text(row.get("label") or row.get("id") or "")
                fusion_key = _clean_text(row.get("id") or "")
                records.append((fusion_key or title_hint or path.stem, row))
    except Exception:
        return []
    return records


def _load_json_records(path: Path) -> List[Tuple[str, Dict]]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return []
    return _iter_json_records(data, prefix=path.stem)


def _build_stable_id(seed: str) -> str:
    digest = hashlib.sha1(seed.encode("utf-8")).hexdigest()
    return f"sa_cross_{digest[:36]}"


def reindex(
    graph_root: Path,
    collection_name: str,
    persist_dir: str | None,
    batch_size: int,
    reset: bool,
    smoke_query: str | None,
) -> None:
    from app.rag.vector_store import VectorStoreManager  # pylint: disable=import-outside-toplevel
    from app.saju_astro_rag import get_model  # pylint: disable=import-outside-toplevel

    print(f"[reindex] graph_root={graph_root}")
    print(f"[reindex] collection={collection_name}")
    print(f"[reindex] domain={DOMAIN_NAME}")

    files = _iter_cross_files(graph_root)
    print(f"[reindex] cross_files={len(files)}")

    docs: List[str] = []
    metas: List[Dict] = []
    ids: List[str] = []

    for path in files:
        source = path.stem
        if path.suffix.lower() == ".csv":
            rows = _load_csv_records(path)
        else:
            rows = _load_json_records(path)
        for fusion_key, record in rows:
            doc, meta = _build_doc_from_record(record, source=source, fusion_key=fusion_key or source)
            if "description:" not in doc or len(doc.strip()) < 20:
                continue
            seed = f"{source}|{fusion_key}|{record.get('id') or ''}|{record.get('label') or ''}"
            ids.append(_build_stable_id(seed))
            docs.append(doc)
            metas.append(meta)

    print(f"[reindex] indexable_docs={len(docs)}")
    if not docs:
        raise RuntimeError("No indexable cross-analysis records found.")

    vs = VectorStoreManager(persist_dir=persist_dir, collection_name=collection_name)
    graph_vs = VectorStoreManager(
        persist_dir=persist_dir,
        collection_name="saju_astro_graph_nodes_v1",
    )
    if reset:
        vs.reset()

    model = get_model(prefer_multilingual=True)

    total = len(docs)
    indexed = 0
    for start in range(0, total, batch_size):
        end = min(start + batch_size, total)
        batch_docs = docs[start:end]
        batch_ids = ids[start:end]
        batch_meta = metas[start:end]

        embeds = model.encode(
            batch_docs,
            batch_size=min(64, len(batch_docs)),
            convert_to_tensor=False,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        batch_embeds = embeds.tolist() if hasattr(embeds, "tolist") else embeds

        missing_indices: List[int] = []
        for idx, meta in enumerate(batch_meta):
            saju_refs = _split_csv_refs(meta.get("saju_refs"))
            astro_refs = _split_csv_refs(meta.get("astro_refs"))
            if not (saju_refs and astro_refs):
                missing_indices.append(idx)

        if missing_indices:
            missing_embeds = [batch_embeds[i] for i in missing_indices]
            query_result = None
            try:
                query_result = graph_vs.collection.query(
                    query_embeddings=missing_embeds,
                    n_results=5,
                    where={"domain": "saju_astro"},
                    include=["metadatas", "documents", "distances"],
                )
            except Exception:
                pass
            if query_result is None:
                query_result = graph_vs.collection.query(
                    query_embeddings=missing_embeds,
                    n_results=5,
                    include=["metadatas", "documents", "distances"],
                )

            docs_by_query = query_result.get("documents", []) if query_result else []
            metas_by_query = query_result.get("metadatas", []) if query_result else []
            dist_by_query = query_result.get("distances", []) if query_result else []

            for local_idx, batch_idx in enumerate(missing_indices):
                meta = batch_meta[batch_idx]
                saju_refs = _split_csv_refs(meta.get("saju_refs"))
                astro_refs = _split_csv_refs(meta.get("astro_refs"))
                docs_for_one = docs_by_query[local_idx] if local_idx < len(docs_by_query) else []
                metas_for_one = metas_by_query[local_idx] if local_idx < len(metas_by_query) else []
                dist_for_one = dist_by_query[local_idx] if local_idx < len(dist_by_query) else []

                graph_hits = []
                for hit_idx, hit_doc in enumerate(docs_for_one):
                    hit_meta = metas_for_one[hit_idx] if hit_idx < len(metas_for_one) else {}
                    dist = dist_for_one[hit_idx] if hit_idx < len(dist_for_one) else 1.0
                    score = 1.0 - float(dist)
                    if score < 0.1:
                        continue
                    graph_hits.append({"text": hit_doc, "metadata": hit_meta, "score": score})

                for hit in graph_hits:
                    hit_saju, hit_astro = _extract_graph_refs_from_result(hit)
                    for ref in hit_saju:
                        if ref not in saju_refs:
                            saju_refs.append(ref)
                    for ref in hit_astro:
                        if ref not in astro_refs:
                            astro_refs.append(ref)
                    if saju_refs and astro_refs:
                        break

                if saju_refs or astro_refs:
                    meta["saju_refs"] = _truncate(", ".join(saju_refs[:12]), 400)
                    meta["astro_refs"] = _truncate(", ".join(astro_refs[:12]), 400)
                    meta["saju_refs_json"] = _truncate(json.dumps(saju_refs[:12], ensure_ascii=False), 400)
                    meta["astro_refs_json"] = _truncate(json.dumps(astro_refs[:12], ensure_ascii=False), 400)
                    src = meta.get("evidence_source", "none")
                    src_parts = [p for p in src.split(",") if p and p != "none"]
                    if "backfill_similarity" not in src_parts:
                        src_parts.append("backfill_similarity")
                    meta["evidence_source"] = ",".join(src_parts) if src_parts else "backfill_similarity"

        vs.index_nodes(
            ids=batch_ids,
            texts=batch_docs,
            embeddings=batch_embeds,
            metadatas=batch_meta,
            batch_size=len(batch_ids),
        )
        indexed += len(batch_ids)
        print(f"[reindex] indexed {indexed}/{total}")

    count = vs.collection.count()
    print(f"[reindex] collection_count={count}")
    if count == 0:
        raise RuntimeError("Indexing finished but collection count is 0.")

    if smoke_query:
        print(f"[smoke] query={smoke_query}")
        q_emb = model.encode(
            smoke_query,
            convert_to_tensor=False,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        q_vec = q_emb.tolist() if hasattr(q_emb, "tolist") else q_emb
        results = vs.search(
            query_embedding=q_vec,
            top_k=5,
            min_score=0.1,
            where={"domain": DOMAIN_NAME},
        )
        print(f"[smoke] result_count={len(results)}")
        for i, r in enumerate(results, start=1):
            m = r.get("metadata") or {}
            print(
                f"[smoke] #{i} score={r.get('score')} domain={m.get('domain')} source={m.get('source')} type={m.get('type')}"
            )


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    default_graph_root = repo_root / "backend_ai" / "data" / "graph"
    default_persist_dir = str(repo_root / "backend_ai" / "data" / "chromadb")

    parser = argparse.ArgumentParser(description="Reindex Saju+Astro cross-analysis into ChromaDB.")
    parser.add_argument("--graph-root", type=Path, default=default_graph_root, help="Path to graph root folder.")
    parser.add_argument("--collection", default=COLLECTION_NAME, help="Target Chroma collection name.")
    parser.add_argument("--persist-dir", default=default_persist_dir, help="Chroma persist directory.")
    parser.add_argument("--batch-size", type=int, default=512, help="Embedding/index batch size.")
    parser.add_argument("--smoke-query", default=None, help="Optional smoke test query after indexing.")
    parser.add_argument("--reset", dest="reset", action="store_true", help="Reset collection before indexing.")
    parser.add_argument("--no-reset", dest="reset", action="store_false", help="Append/upsert without reset.")
    parser.set_defaults(reset=True)
    args = parser.parse_args()

    reindex(
        graph_root=args.graph_root,
        collection_name=args.collection,
        persist_dir=args.persist_dir,
        batch_size=args.batch_size,
        reset=args.reset,
        smoke_query=args.smoke_query,
    )


if __name__ == "__main__":
    main()
