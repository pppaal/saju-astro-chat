#!/usr/bin/env python3
"""
Deterministic rebuild for tarot Chroma collections from JSONL corpus.
"""

from __future__ import annotations

import argparse
import os
import time
from pathlib import Path
from typing import Dict, List, Tuple

from chromadb import PersistentClient
from chromadb.config import Settings

from tarot_pipeline_utils import (
    DEFAULT_CORPUS_PATH,
    LintResult,
    chunked,
    lint_tarot_dataset,
    load_combo_source_stats,
    load_jsonl_records,
    make_doc_id,
    sanitize_chroma_metadata,
    summarize_lint_result,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Rebuild tarot Chroma collection from corpus JSONL")
    parser.add_argument("--corpus-path", default=str(DEFAULT_CORPUS_PATH))
    parser.add_argument("--persist-dir", default="backend_ai/data/chromadb")
    parser.add_argument("--collection-name", default="domain_tarot")
    parser.add_argument("--combo-collection-name", default="domain_tarot_combo")
    parser.add_argument(
        "--combo-mode",
        choices=["graph_only", "docs"],
        default="graph_only",
        help="graph_only: remove/skip combo collection, docs: rebuild combo collection from corpus docs",
    )
    parser.add_argument(
        "--embedding-model-id",
        default=os.getenv("RAG_EMBEDDING_MODEL", "minilm"),
        help="Model key (minilm/e5-large/bge-m3) or HuggingFace model id",
    )
    parser.add_argument("--batch-size", type=int, default=256)
    parser.add_argument("--keep-staging", action="store_true")
    parser.add_argument("--skip-lint", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def _load_embedder(model_id: str):
    from backend_ai.app.rag import model_manager

    if model_id in model_manager.EMBEDDING_MODELS:
        manager = model_manager.get_embedding_manager(model_key=model_id)

        def _encode(texts: List[str]) -> List[List[float]]:
            embeds = manager.encode_batch(texts, batch_size=min(64, max(1, len(texts))), is_query=False)
            if embeds is None:
                raise RuntimeError("Failed to generate embeddings via model_manager")
            return embeds.cpu().numpy().tolist()

        return _encode

    from sentence_transformers import SentenceTransformer

    device = os.getenv("RAG_DEVICE", "cpu")
    model = SentenceTransformer(model_id, device=device)

    def _encode(texts: List[str]) -> List[List[float]]:
        embeds = model.encode(
            texts,
            batch_size=min(64, max(1, len(texts))),
            convert_to_tensor=True,
            normalize_embeddings=True,
            show_progress_bar=True,
        )
        return embeds.cpu().numpy().tolist()

    return _encode


def _normalize_record(record: Dict) -> Dict:
    card_id = str(record.get("card_id") or "").strip()
    orientation = str(record.get("orientation") or "").strip()
    domain = str(record.get("domain") or "").strip()
    position = str(record.get("position") or "").strip()
    version = str(record.get("version") or "").strip()
    doc_id = str(record.get("doc_id") or "").strip() or make_doc_id(
        card_id=card_id,
        orientation=orientation,
        domain=domain,
        position=position,
        version=version,
    )

    normalized = {
        "doc_id": doc_id,
        "doc_type": str(record.get("doc_type") or "card").strip(),
        "card_id": card_id,
        "card_name": str(record.get("card_name") or "").strip(),
        "orientation": orientation,
        "domain": domain,
        "position": position,
        "source": str(record.get("source") or "").strip(),
        "version": version,
        "text": str(record.get("text") or "").strip(),
        "tags": record.get("tags") or [],
    }
    return normalized


def _prepare_collection_payload(records: List[Dict]) -> Tuple[List[str], List[str], List[Dict]]:
    ids: List[str] = []
    docs: List[str] = []
    metas: List[Dict] = []
    for row in records:
        ids.append(row["doc_id"])
        docs.append(row["text"])
        metas.append(
            {
                "card_id": sanitize_chroma_metadata(row["card_id"]),
                "card_name": sanitize_chroma_metadata(row["card_name"]),
                "orientation": sanitize_chroma_metadata(row["orientation"]),
                "domain": sanitize_chroma_metadata(row["domain"]),
                "position": sanitize_chroma_metadata(row["position"]),
                "source": sanitize_chroma_metadata(row["source"]),
                "version": sanitize_chroma_metadata(row["version"]),
                "doc_type": sanitize_chroma_metadata(row["doc_type"]),
                "tags": sanitize_chroma_metadata(row.get("tags") or []),
            }
        )
    return ids, docs, metas


def _delete_if_exists(client: PersistentClient, name: str):
    try:
        client.delete_collection(name=name)
    except Exception:
        pass


def _upsert_batches(
    collection,
    ids: List[str],
    docs: List[str],
    embeddings: List[List[float]],
    metas: List[Dict],
    batch_size: int,
):
    for idx_batch in chunked(list(range(len(ids))), batch_size):
        batch_ids = [ids[i] for i in idx_batch]
        batch_docs = [docs[i] for i in idx_batch]
        batch_embeds = [embeddings[i] for i in idx_batch]
        batch_metas = [metas[i] for i in idx_batch]
        collection.upsert(
            ids=batch_ids,
            documents=batch_docs,
            embeddings=batch_embeds,
            metadatas=batch_metas,
        )


def _stage_and_swap(
    client: PersistentClient,
    collection_name: str,
    ids: List[str],
    docs: List[str],
    embeddings: List[List[float]],
    metas: List[Dict],
    embedding_model_id: str,
    batch_size: int,
    keep_staging: bool,
):
    ts = int(time.time())
    staging_name = f"{collection_name}__staging__{ts}"
    _delete_if_exists(client, staging_name)

    staging = client.get_or_create_collection(
        name=staging_name,
        metadata={"hnsw:space": "cosine", "embedding_model_id": embedding_model_id},
    )
    _upsert_batches(staging, ids, docs, embeddings, metas, batch_size)

    _delete_if_exists(client, collection_name)
    target = client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine", "embedding_model_id": embedding_model_id},
    )

    total = staging.count()
    for offset in range(0, total, batch_size):
        batch = staging.get(
            limit=batch_size,
            offset=offset,
            include=["documents", "embeddings", "metadatas"],
        )
        target.upsert(
            ids=batch["ids"],
            documents=batch["documents"],
            embeddings=batch["embeddings"],
            metadatas=batch["metadatas"],
        )

    if not keep_staging:
        _delete_if_exists(client, staging_name)

    return total


def _run_lint_or_fail(args) -> LintResult:
    lint_result = lint_tarot_dataset(corpus_path=Path(args.corpus_path))
    print(summarize_lint_result(lint_result))
    if not lint_result.ok:
        raise RuntimeError("tarot_lint failed. Rebuild aborted.")
    return lint_result


def main() -> int:
    args = parse_args()

    if not args.skip_lint:
        _run_lint_or_fail(args)

    corpus_path = Path(args.corpus_path)
    records = [_normalize_record(r) for r in load_jsonl_records(corpus_path)]
    records.sort(key=lambda x: x["doc_id"])

    primary_records = [r for r in records if r["doc_type"] != "combo"]
    combo_records = [r for r in records if r["doc_type"] == "combo"]

    primary_ids, primary_docs, primary_metas = _prepare_collection_payload(primary_records)
    combo_ids, combo_docs, combo_metas = _prepare_collection_payload(combo_records)

    combo_stats = load_combo_source_stats()
    print(
        "[tarot_rebuild] combo-source-stats "
        f"complete_interpretations={combo_stats.complete_interpretations_count} "
        f"rules_csv={combo_stats.rules_combo_rows} "
        f"nodes_csv={combo_stats.nodes_combo_rows} "
        f"expected_combo_doc_floor={combo_stats.expected_combo_doc_floor}"
    )
    print(f"[tarot_rebuild] combo_mode={args.combo_mode}")
    print(f"[tarot_rebuild] primary docs={len(primary_records)} combo docs={len(combo_records)}")
    print(f"[tarot_rebuild] embedding_model_id={args.embedding_model_id}")

    if args.dry_run:
        return 0

    encode = _load_embedder(args.embedding_model_id)
    primary_embeddings = encode(primary_docs) if primary_docs else []
    combo_embeddings = encode(combo_docs) if combo_docs else []

    persist_dir = Path(args.persist_dir)
    persist_dir.mkdir(parents=True, exist_ok=True)
    client = PersistentClient(
        path=str(persist_dir),
        settings=Settings(anonymized_telemetry=False, allow_reset=True),
    )

    primary_count = _stage_and_swap(
        client=client,
        collection_name=args.collection_name,
        ids=primary_ids,
        docs=primary_docs,
        embeddings=primary_embeddings,
        metas=primary_metas,
        embedding_model_id=args.embedding_model_id,
        batch_size=args.batch_size,
        keep_staging=args.keep_staging,
    )
    print(f"[tarot_rebuild] rebuilt collection={args.collection_name} count={primary_count}")

    if args.combo_mode == "graph_only":
        if args.combo_collection_name:
            _delete_if_exists(client, args.combo_collection_name)
            print(
                f"[tarot_rebuild] combo collection removed "
                f"(policy=graph_only): {args.combo_collection_name}"
            )
    elif combo_ids and args.combo_collection_name:
        if combo_stats.expected_combo_doc_floor and len(combo_ids) < combo_stats.expected_combo_doc_floor:
            raise RuntimeError(
                "combo docs below expected floor: "
                f"got={len(combo_ids)} expected_floor={combo_stats.expected_combo_doc_floor}"
            )
        combo_count = _stage_and_swap(
            client=client,
            collection_name=args.combo_collection_name,
            ids=combo_ids,
            docs=combo_docs,
            embeddings=combo_embeddings,
            metas=combo_metas,
            embedding_model_id=args.embedding_model_id,
            batch_size=args.batch_size,
            keep_staging=args.keep_staging,
        )
        print(
            f"[tarot_rebuild] rebuilt collection={args.combo_collection_name} count={combo_count}"
        )
    elif args.combo_mode == "docs":
        raise RuntimeError(
            "combo_mode=docs requires combo docs in corpus, but none were found."
        )

    print("[tarot_rebuild] done")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
