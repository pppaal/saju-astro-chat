#!/usr/bin/env python3
"""
임베딩 모델 업그레이드 후 전체 임베딩 재생성.

Phase 6 모델 매니저와 연동하여 모델 교체 시 모든 임베딩을 일괄 재생성.

Usage:
    # 현재 모델(minilm)로 재생성
    python -m scripts.regenerate_embeddings

    # E5-large로 업그레이드 후 재생성
    RAG_EMBEDDING_MODEL=e5-large python -m scripts.regenerate_embeddings

    # BGE-M3로 업그레이드 후 재생성
    RAG_EMBEDDING_MODEL=bge-m3 python -m scripts.regenerate_embeddings

    # ChromaDB도 함께 재인덱싱
    python -m scripts.regenerate_embeddings --with-chromadb

    # GraphRAG만 재생성
    python -m scripts.regenerate_embeddings --graph-only

    # 도메인 임베딩만 재생성
    python -m scripts.regenerate_embeddings --domain tarot

    # Dry-run (실제 실행 없이 계획만 출력)
    python -m scripts.regenerate_embeddings --dry-run
"""

import argparse
import logging
import os
import sys
import time

# 프로젝트 루트를 path에 추가
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _PROJECT_ROOT)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


def show_model_info():
    """현재 임베딩 모델 정보 출력."""
    from app.rag.model_manager import get_embedding_manager

    mgr = get_embedding_manager()
    info = mgr.get_info()

    logger.info("=" * 60)
    logger.info("임베딩 모델 정보")
    logger.info("=" * 60)
    logger.info("  모델 키    : %s", info["model_key"])
    logger.info("  모델 이름  : %s", info["model_name"])
    logger.info("  차원       : %d", info["dimension"])
    logger.info("  설명       : %s", info["description"])
    logger.info("  디바이스   : %s", info["device"])
    logger.info("  Query prefix: %s", "Yes" if info.get("has_query_prefix") else "No")
    logger.info("=" * 60)

    return mgr


def regenerate_graph_rag(mgr):
    """GraphRAG 임베딩 재생성.

    기존 .pt 캐시를 삭제하고 새 모델로 임베딩을 다시 생성.
    """
    logger.info("=== GraphRAG 임베딩 재생성 ===")

    from app.saju_astro_rag import GraphRAG
    from pathlib import Path

    # 기존 캐시 삭제
    cache_dir = Path(_PROJECT_ROOT) / "data" / "graph"
    cache_files = list(cache_dir.glob("*_embeds.pt")) + list(cache_dir.glob("graph_rag_embeds.pt"))

    for cf in cache_files:
        if cf.exists():
            logger.info("  캐시 삭제: %s", cf.name)
            cf.unlink()

    start = time.time()
    graph_rag = GraphRAG(use_cache=False)

    if graph_rag.node_embeds is None:
        logger.error("  GraphRAG 임베딩 생성 실패")
        return False

    node_count = graph_rag.node_embeds.size(0)
    dim = graph_rag.node_embeds.size(1)
    elapsed = time.time() - start

    logger.info("  GraphRAG 완료: %d 노드, %dD (%.1f초)", node_count, dim, elapsed)
    return True


def regenerate_corpus_embeddings(mgr):
    """corpus_embeds.pt 재생성."""
    logger.info("=== Corpus 임베딩 재생성 ===")

    from pathlib import Path

    cache_path = Path(_PROJECT_ROOT) / "data" / "graph" / "corpus_embeds.pt"

    # 기존 캐시 삭제
    if cache_path.exists():
        logger.info("  캐시 삭제: %s", cache_path.name)
        cache_path.unlink()

    start = time.time()

    try:
        from app.saju_astro_rag import _load_graph_nodes, embed_batch
        import torch

        graph_path = Path(_PROJECT_ROOT) / "data" / "graph"
        nodes = _load_graph_nodes(graph_path)
        texts = [n["description"] for n in nodes if n.get("description")]

        if not texts:
            logger.warning("  텍스트가 없어 스킵")
            return False

        logger.info("  %d개 텍스트 임베딩 중...", len(texts))
        embeds = embed_batch(texts, batch_size=64)

        # 캐시 저장
        torch.save(
            {"embeddings": embeds, "texts": texts, "count": len(texts)},
            cache_path,
        )

        elapsed = time.time() - start
        dim = embeds.size(1) if hasattr(embeds, "size") else "?"
        logger.info("  Corpus 완료: %d 텍스트, %sD (%.1f초)", len(texts), dim, elapsed)
        return True

    except ImportError as e:
        logger.warning("  Corpus 재생성 스킵: %s", e)
        return False


def regenerate_domain_embeddings(mgr, domain: str):
    """도메인별 임베딩 재생성 (tarot, dream 등)."""
    logger.info("=== %s 도메인 임베딩 재생성 ===", domain)

    from pathlib import Path

    domain_dirs = {
        "tarot": Path(_PROJECT_ROOT) / "data" / "graph" / "rules" / "tarot",
        "dream": Path(_PROJECT_ROOT) / "data" / "graph" / "rules" / "dream",
        "persona": Path(_PROJECT_ROOT) / "data" / "graph" / "rules" / "persona",
    }

    if domain not in domain_dirs:
        logger.error("  지원 도메인: %s", list(domain_dirs.keys()))
        return False

    domain_dir = domain_dirs[domain]
    cache_path = domain_dir / f"{domain}_embeds.pt"

    if not domain_dir.exists():
        logger.warning("  도메인 디렉토리 없음: %s", domain_dir)
        return False

    # 기존 캐시 삭제
    if cache_path.exists():
        logger.info("  캐시 삭제: %s", cache_path.name)
        cache_path.unlink()

    start = time.time()

    try:
        import json
        import torch
        from app.saju_astro_rag import embed_batch

        # 도메인 데이터 로드
        texts = []
        for json_file in sorted(domain_dir.glob("*.json")):
            try:
                with open(json_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        for item in data:
                            desc = item.get("description", item.get("desc", item.get("text", "")))
                            if desc:
                                texts.append(desc)
                    elif isinstance(data, dict):
                        desc = data.get("description", data.get("desc", data.get("text", "")))
                        if desc:
                            texts.append(desc)
            except Exception as e:
                logger.warning("  파일 로드 실패 %s: %s", json_file.name, e)

        if not texts:
            logger.warning("  텍스트 없음, 스킵")
            return False

        logger.info("  %d개 텍스트 임베딩 중...", len(texts))
        embeds = embed_batch(texts, batch_size=64)

        torch.save(
            {"embeddings": embeds, "texts": texts, "count": len(texts)},
            cache_path,
        )

        elapsed = time.time() - start
        dim = embeds.size(1) if hasattr(embeds, "size") else "?"
        logger.info("  %s 완료: %d 텍스트, %sD (%.1f초)", domain, len(texts), dim, elapsed)
        return True

    except ImportError as e:
        logger.warning("  %s 재생성 스킵: %s", domain, e)
        return False


def reindex_chromadb(reset: bool = True):
    """ChromaDB 재인덱싱 (Phase 1 연동)."""
    logger.info("=== ChromaDB 재인덱싱 ===")

    try:
        from scripts.migrate_to_chromadb import (
            migrate_graph_rag,
            migrate_search_graphs,
            migrate_domain_embeddings,
            show_stats,
        )

        start = time.time()

        migrate_graph_rag(reset=reset)
        migrate_search_graphs(reset=reset)

        for domain in ["tarot", "dream"]:
            try:
                migrate_domain_embeddings(domain, reset=reset)
            except Exception as e:
                logger.warning("  %s ChromaDB 마이그레이션 스킵: %s", domain, e)

        elapsed = time.time() - start
        logger.info("  ChromaDB 재인덱싱 완료 (%.1f초)", elapsed)
        show_stats()
        return True

    except ImportError:
        logger.info("  ChromaDB 미설치 - 스킵")
        return False
    except Exception as e:
        logger.error("  ChromaDB 재인덱싱 실패: %s", e)
        return False


def dry_run(args):
    """실제 실행 없이 계획만 출력."""
    logger.info("=" * 60)
    logger.info("[DRY-RUN] 실행 계획")
    logger.info("=" * 60)

    model_key = os.environ.get("RAG_EMBEDDING_MODEL", "minilm")
    device = os.environ.get("RAG_DEVICE", "auto")

    logger.info("  모델: %s", model_key)
    logger.info("  디바이스: %s", device)
    logger.info("")

    steps = []

    if args.graph_only:
        steps.append("1. GraphRAG 임베딩 재생성")
    elif args.domain:
        steps.append(f"1. {args.domain} 도메인 임베딩 재생성")
    else:
        steps.append("1. GraphRAG 임베딩 재생성")
        steps.append("2. Corpus 임베딩 재생성")
        steps.append("3. tarot 도메인 임베딩 재생성")
        steps.append("4. dream 도메인 임베딩 재생성")

    if args.with_chromadb:
        steps.append(f"{len(steps) + 1}. ChromaDB 재인덱싱 (reset={not args.no_reset})")

    for step in steps:
        logger.info("  %s", step)

    logger.info("")
    logger.info("  실행하려면 --dry-run 플래그를 제거하세요.")


def main():
    parser = argparse.ArgumentParser(
        description="임베딩 모델 업그레이드 후 전체 임베딩 재생성 (Phase 6)",
    )
    parser.add_argument(
        "--with-chromadb", action="store_true",
        help="ChromaDB 재인덱싱도 함께 실행",
    )
    parser.add_argument(
        "--graph-only", action="store_true",
        help="GraphRAG 임베딩만 재생성",
    )
    parser.add_argument(
        "--domain", type=str, default=None,
        help="특정 도메인만 재생성 (tarot/dream/persona)",
    )
    parser.add_argument(
        "--no-reset", action="store_true",
        help="ChromaDB 초기화 없이 추가 인덱싱",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="실제 실행 없이 계획만 출력",
    )
    args = parser.parse_args()

    if args.dry_run:
        dry_run(args)
        return

    total_start = time.time()
    results = {}

    # 모델 정보 출력
    mgr = show_model_info()

    if args.graph_only:
        results["graph_rag"] = regenerate_graph_rag(mgr)
    elif args.domain:
        results[args.domain] = regenerate_domain_embeddings(mgr, args.domain)
    else:
        # 전체 재생성
        results["graph_rag"] = regenerate_graph_rag(mgr)
        results["corpus"] = regenerate_corpus_embeddings(mgr)

        for domain in ["tarot", "dream"]:
            results[domain] = regenerate_domain_embeddings(mgr, domain)

    # ChromaDB 재인덱싱
    if args.with_chromadb:
        results["chromadb"] = reindex_chromadb(reset=not args.no_reset)

    # 결과 요약
    total_elapsed = time.time() - total_start

    logger.info("")
    logger.info("=" * 60)
    logger.info("전체 임베딩 재생성 완료 (%.1f초)", total_elapsed)
    logger.info("=" * 60)

    for task, success in results.items():
        status = "OK" if success else "SKIP/FAIL"
        logger.info("  %-20s: %s", task, status)

    # 새 모델 정보 최종 출력
    final_info = mgr.get_info()
    logger.info("")
    logger.info("최종 모델: %s (%dD)", final_info["model_name"], final_info["dimension"])


if __name__ == "__main__":
    main()
