#!/usr/bin/env python
"""
Reindex Saju+Astro graph nodes into a dedicated Chroma collection.

Goal:
- Build a clean, domain-scoped GraphRAG index for Saju + Astrology only.
- Avoid mixed retrieval (e.g., corpus_jung / stoic / unrelated domains).

Usage:
  python scripts/reindex_saju_astro_graph_nodes.py
  python scripts/reindex_saju_astro_graph_nodes.py --no-reset
  python scripts/reindex_saju_astro_graph_nodes.py --smoke-query "갑목 일간과 양자리 태양의 공통점"
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Dict, Iterable, List, Tuple


COLLECTION_NAME = "saju_astro_graph_nodes_v1"
DOMAIN_NAME = "saju_astro"


REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_AI_ROOT = REPO_ROOT / "backend_ai"
if str(BACKEND_AI_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_AI_ROOT))
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def _clean_text(value: object) -> str:
    if value is None:
        return ""
    text = str(value).replace("\x00", " ").strip()
    return re.sub(r"\s+", " ", text)


def _truncate(text: str, limit: int) -> str:
    return text if len(text) <= limit else text[:limit].rstrip()


def _extract_title(node: Dict, fallback_idx: int) -> str:
    for key in ("label", "name", "title", "id", "node_id", "original_id"):
        val = _clean_text(node.get(key))
        if val:
            return val
    return f"saju_astro_node_{fallback_idx}"


def _extract_desc(node: Dict) -> str:
    for key in (
        "description",
        "desc",
        "content",
        "text",
        "meaning",
        "interpretation",
        "summary",
    ):
        val = _clean_text(node.get(key))
        if val:
            return val

    raw = node.get("raw")
    if isinstance(raw, dict):
        for key in (
            "description",
            "desc",
            "content",
            "text",
            "meaning",
            "interpretation",
            "summary",
        ):
            val = _clean_text(raw.get(key))
            if val:
                return val
    return ""


def _extract_cross_hint(node: Dict) -> str:
    for key in (
        "cross_hint",
        "intersection_hint",
        "bridge_hint",
        "mapping_hint",
        "connection_hint",
    ):
        val = _clean_text(node.get(key))
        if val:
            return val
    raw = node.get("raw")
    if isinstance(raw, dict):
        for key in (
            "cross_hint",
            "intersection_hint",
            "bridge_hint",
            "mapping_hint",
            "connection_hint",
        ):
            val = _clean_text(raw.get(key))
            if val:
                return val
    return ""


def _extract_tags(node: Dict) -> List[str]:
    tags: List[str] = []

    def add_many(values: Iterable[object]) -> None:
        for value in values:
            token = _clean_text(value)
            if token:
                tags.append(token)

    for key in ("tags", "keywords", "keyword"):
        value = node.get(key)
        if isinstance(value, list):
            add_many(value)
        elif isinstance(value, str):
            # split comma/pipe while preserving multilingual tokens
            parts = [p.strip() for p in re.split(r"[|,]", value) if p.strip()]
            add_many(parts)

    # Include lightweight categorical hints
    for key in ("source", "type", "category"):
        token = _clean_text(node.get(key))
        if token:
            tags.append(token)

    # Deduplicate while preserving order
    seen = set()
    unique = []
    for t in tags:
        low = t.lower()
        if low in seen:
            continue
        seen.add(low)
        unique.append(t)
    return unique[:20]


def _doc_from_node(node: Dict, idx: int) -> Tuple[str, Dict]:
    title = _extract_title(node, idx)
    desc = _truncate(_extract_desc(node), 1600)
    cross_hint = _truncate(_extract_cross_hint(node), 600)
    tags = _extract_tags(node)

    lines = [f"title: {title}", f"description: {desc}"]
    if cross_hint:
        lines.append(f"cross_hint: {cross_hint}")
    if tags:
        lines.append("keywords: " + ", ".join(tags))
    document = "\n".join(lines)

    original_id = _clean_text(node.get("id") or node.get("node_id") or node.get("original_id") or title)
    source = _clean_text(node.get("source")) or "saju_astro"
    node_type = _clean_text(node.get("type")) or "graph_node"

    metadata = {
        "domain": DOMAIN_NAME,
        "source": source,
        "type": node_type,
        "label": _truncate(title, 240),
        "original_id": _truncate(original_id, 240),
        "tags": _truncate(", ".join(tags), 400),
    }
    return document, metadata


def _iter_graph_node_files(graph_root: Path) -> List[Path]:
    patterns = ("graph_nodes*.jsonl", "graph_nodes*.json")
    files: List[Path] = []
    for pattern in patterns:
        files.extend(graph_root.rglob(pattern))
    return sorted(set(files))


def _load_records_from_graph_node_files(graph_root: Path) -> List[Dict]:
    records: List[Dict] = []
    files = _iter_graph_node_files(graph_root)
    for path in files:
        if path.suffix.lower() == ".jsonl":
            with path.open("r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        obj = json.loads(line)
                    except Exception:
                        continue
                    if isinstance(obj, dict):
                        records.append(obj)
        elif path.suffix.lower() == ".json":
            try:
                obj = json.loads(path.read_text(encoding="utf-8"))
            except Exception:
                continue
            if isinstance(obj, list):
                records.extend(x for x in obj if isinstance(x, dict))
            elif isinstance(obj, dict):
                if isinstance(obj.get("nodes"), list):
                    records.extend(x for x in obj["nodes"] if isinstance(x, dict))
                else:
                    records.append(obj)
    return records


def _load_records_from_saju_astro_folders(graph_root: Path) -> List[Dict]:
    # Reuse existing graph parsing logic to stay aligned with query-side preprocessing.
    from app.saju_astro_rag import _load_from_folder  # pylint: disable=import-outside-toplevel

    target_folders = [
        ("saju", graph_root / "saju"),
        ("saju_literary", graph_root / "saju_literary"),
        ("astro", graph_root / "astro"),
        ("astro_database", graph_root / "astro_database"),
    ]

    records: List[Dict] = []
    for source, folder in target_folders:
        if folder.is_dir():
            _load_from_folder(folder, records, source)
    return records


def build_saju_astro_nodes(graph_root: Path) -> List[Dict]:
    # 1) Prefer explicit graph_nodes*.jsonl|json files if present.
    file_based = _load_records_from_graph_node_files(graph_root)
    if file_based:
        print(f"[reindex] loaded from graph_nodes*.jsonl/json: {len(file_based)}")
        return file_based

    # 2) Fallback to folder-based extraction.
    folder_based = _load_records_from_saju_astro_folders(graph_root)
    print(f"[reindex] loaded from saju/astro folders: {len(folder_based)}")
    return folder_based


def _build_stable_id(node: Dict, title: str, desc: str, source: str) -> str:
    base = _clean_text(node.get("id") or node.get("node_id") or node.get("original_id"))
    seed = f"{base}|{source}|{title}|{desc[:800]}"
    digest = hashlib.sha1(seed.encode("utf-8")).hexdigest()
    return f"sa_astro_{digest[:36]}"


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

    raw_nodes = build_saju_astro_nodes(graph_root)
    print(f"[reindex] raw_nodes={len(raw_nodes)}")

    docs: List[str] = []
    metas: List[Dict] = []
    ids: List[str] = []
    seen_ids: set[str] = set()
    skipped_duplicates = 0
    for idx, node in enumerate(raw_nodes, start=1):
        doc, meta = _doc_from_node(node, idx)
        # Skip unusable records
        if "description:" not in doc or len(doc.strip()) < 20:
            continue

        # Deterministic IDs make upsert idempotent across reindex runs.
        desc = _extract_desc(node)
        source = _clean_text(node.get("source")) or "saju_astro"
        title = _extract_title(node, idx)
        uniq_id = _build_stable_id(node, title=title, desc=desc, source=source)
        if uniq_id in seen_ids:
            skipped_duplicates += 1
            continue
        seen_ids.add(uniq_id)

        ids.append(uniq_id)
        docs.append(doc)
        metas.append(meta)

    print(f"[reindex] indexable_docs={len(docs)}")
    print(f"[reindex] skipped_duplicates={skipped_duplicates}")
    if not docs:
        raise RuntimeError("No indexable Saju+Astro nodes found.")

    vs = VectorStoreManager(persist_dir=persist_dir, collection_name=collection_name)
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

    parser = argparse.ArgumentParser(description="Reindex Saju+Astro GraphRAG nodes into ChromaDB.")
    parser.add_argument("--graph-root", type=Path, default=default_graph_root, help="Path to graph root folder.")
    parser.add_argument("--collection", default=COLLECTION_NAME, help="Target Chroma collection name.")
    parser.add_argument("--persist-dir", default=default_persist_dir, help="Chroma persist directory (default: backend_ai/data/chromadb).")
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
