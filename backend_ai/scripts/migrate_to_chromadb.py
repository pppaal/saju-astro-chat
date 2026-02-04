#!/usr/bin/env python3
"""
기존 PyTorch .pt 임베딩을 ChromaDB로 마이그레이션.

Phase 6 연동: 임베딩 모델 변경 시 차원 불일치를 감지하고 자동 재인덱싱.

Usage:
    # 전체 마이그레이션
    python -m scripts.migrate_to_chromadb

    # 초기화 후 재인덱싱
    python -m scripts.migrate_to_chromadb --reset

    # 특정 도메인만
    python -m scripts.migrate_to_chromadb --domain tarot

    # 통계만 확인
    python -m scripts.migrate_to_chromadb --stats

    # 모델 변경 감지 + 자동 재인덱싱
    RAG_EMBEDDING_MODEL=e5-large python -m scripts.migrate_to_chromadb --auto-detect
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


def migrate_graph_rag(reset: bool = False):
    """GraphRAG의 기존 임베딩 + 노드를 ChromaDB graph_nodes 컬렉션으로 마이그레이션."""
    import torch
    from app.rag.vector_store import VectorStoreManager

    logger.info("=" * 60)
    logger.info("GraphRAG -> ChromaDB 마이그레이션 시작")
    logger.info("=" * 60)

    vs = VectorStoreManager(collection_name="graph_nodes")

    if reset:
        logger.info("기존 컬렉션 초기화...")
        vs.reset()

    # 기존 GraphRAG 로드
    from app.saju_astro_rag import GraphRAG

    start = time.time()
    graph_rag = GraphRAG()

    if graph_rag.node_embeds is None or graph_rag.node_embeds.size(0) == 0:
        logger.error("GraphRAG에 임베딩이 없습니다. 먼저 GraphRAG를 초기화하세요.")
        return

    node_count = graph_rag.node_embeds.size(0)
    logger.info("GraphRAG 로드 완료: %d 노드, %d 임베딩", len(graph_rag.node_ids), node_count)

    # 데이터 준비
    ids = []
    texts = []
    embeddings = []
    metadatas = []

    for i in range(node_count):
        node_id = graph_rag.node_ids[i] if i < len(graph_rag.node_ids) else f"node_{i}"
        text = graph_rag.node_texts[i] if i < len(graph_rag.node_texts) else ""

        # ID 중복 방지 (ChromaDB는 unique ID 필요)
        safe_id = f"graph_{i}_{str(node_id)[:50]}"
        ids.append(safe_id)
        texts.append(text)
        embeddings.append(graph_rag.node_embeds[i].cpu().numpy().tolist())

        # 메타데이터
        meta = {
            "domain": "graph",
            "original_id": str(node_id)[:500],
            "index": i,
        }

        # 그래프 노드 속성에서 추가 메타데이터 추출
        if graph_rag.graph.has_node(node_id):
            node_data = graph_rag.graph.nodes[node_id]
            for field in ("type", "source"):
                val = node_data.get(field)
                if val and isinstance(val, str):
                    meta[field] = val[:500]

        metadatas.append(meta)

    # ChromaDB에 인덱싱
    count = vs.index_nodes(ids, texts, embeddings, metadatas, batch_size=500)

    elapsed = time.time() - start
    logger.info("GraphRAG 마이그레이션 완료: %d 노드 (%.1f초)", count, elapsed)

    # 검증 검색
    _verify_search(vs, graph_rag, "graph_nodes")


def migrate_search_graphs(reset: bool = False):
    """search_graphs 함수에서 사용하는 corpus_embeds.pt를 ChromaDB로 마이그레이션."""
    import torch
    from app.rag.vector_store import VectorStoreManager
    from app.saju_astro_rag import _load_graph_nodes
    from pathlib import Path

    logger.info("=" * 60)
    logger.info("search_graphs corpus -> ChromaDB 마이그레이션 시작")
    logger.info("=" * 60)

    vs = VectorStoreManager(collection_name="corpus_nodes")

    if reset:
        vs.reset()

    graph_path = Path(_PROJECT_ROOT) / "data" / "graph"
    cache_path = graph_path / "corpus_embeds.pt"

    # 노드 로드
    nodes = _load_graph_nodes(graph_path)
    texts = [n["description"] for n in nodes if n.get("description")]
    logger.info("노드 로드: %d개", len(texts))

    # 임베딩 로드 또는 생성
    if cache_path.exists():
        embeds = torch.load(cache_path, map_location="cpu", weights_only=False)
        logger.info("기존 임베딩 로드: shape=%s", embeds.shape if hasattr(embeds, "shape") else "unknown")

        # 크기 맞추기
        min_len = min(len(texts), embeds.shape[0] if hasattr(embeds, "shape") else 0)
        if min_len == 0:
            logger.error("임베딩 또는 텍스트가 비어있습니다")
            return
        texts = texts[:min_len]
        nodes = nodes[:min_len]
        embeds = embeds[:min_len]
    else:
        logger.info("캐시 파일 없음, 임베딩 생성 중...")
        from app.saju_astro_rag import embed_batch
        embeds = embed_batch(texts, batch_size=64)

    # 데이터 준비
    ids = [f"corpus_{i}" for i in range(len(texts))]
    embeddings = embeds.cpu().numpy().tolist()
    metadatas = []
    for i, node in enumerate(nodes[:len(texts)]):
        meta = {
            "domain": "corpus",
            "index": i,
        }
        for field in ("type", "source", "label"):
            val = node.get(field)
            if val and isinstance(val, str):
                meta[field] = val[:500]
        metadatas.append(meta)

    count = vs.index_nodes(ids, texts, embeddings, metadatas, batch_size=500)
    logger.info("corpus 마이그레이션 완료: %d 노드", count)


def migrate_domain_embeddings(domain: str, reset: bool = False):
    """도메인별 임베딩(.pt)을 별도 ChromaDB 컬렉션으로 마이그레이션."""
    import torch
    from app.rag.vector_store import VectorStoreManager

    embed_files = {
        "tarot": os.path.join(_PROJECT_ROOT, "data", "graph", "rules", "tarot", "tarot_embeds.pt"),
        "dream": os.path.join(_PROJECT_ROOT, "data", "graph", "rules", "dream", "dream_embeds.pt"),
        "persona": os.path.join(_PROJECT_ROOT, "data", "graph", "rules", "persona", "persona_embeds.pt"),
    }

    if domain not in embed_files:
        logger.error("지원 도메인: %s. 입력: %s", list(embed_files.keys()), domain)
        return

    filepath = embed_files[domain]
    if not os.path.exists(filepath):
        logger.error("파일 없음: %s", filepath)
        return

    logger.info("=" * 60)
    logger.info("%s 임베딩 -> ChromaDB 마이그레이션 시작", domain)
    logger.info("=" * 60)

    vs = VectorStoreManager(collection_name=f"domain_{domain}")

    if reset:
        vs.reset()

    data = torch.load(filepath, map_location="cpu", weights_only=False)

    # .pt 파일 형식에 따라 데이터 추출
    if isinstance(data, dict):
        embeds = data.get("embeddings", data.get("embeds"))
        txts = data.get("texts", data.get("labels", []))
        if embeds is None:
            logger.error("임베딩 키를 찾을 수 없음. 키: %s", list(data.keys()))
            return
    elif hasattr(data, "shape"):
        # 텐서만 저장된 경우
        embeds = data
        txts = [f"{domain}_item_{i}" for i in range(data.shape[0])]
    else:
        logger.error("지원하지 않는 데이터 형식: %s", type(data))
        return

    logger.info("데이터 로드: %d 항목", len(txts))

    ids = [f"{domain}_{i}" for i in range(len(txts))]
    embeddings = embeds.cpu().numpy().tolist()
    metadatas = [{"domain": domain, "index": i} for i in range(len(txts))]

    count = vs.index_nodes(ids, txts, embeddings, metadatas, batch_size=500)
    logger.info("%s 마이그레이션 완료: %d 항목", domain, count)


def _verify_search(vs, graph_rag, collection_name: str):
    """마이그레이션 검증: 간단한 검색 테스트."""
    logger.info("--- 검증 검색 (collection: %s) ---", collection_name)

    test_queries = ["목성 사수자리 확장", "갑목 일간 성격", "Sun Moon aspect"]

    for query in test_queries:
        emb = graph_rag.embed_model.encode(
            query, convert_to_tensor=False, normalize_embeddings=True
        ).tolist()
        results = vs.search(query_embedding=emb, top_k=3, min_score=0.1)
        logger.info("  Query: '%s' -> %d results", query, len(results))
        for r in results[:2]:
            logger.info("    [%.4f] %s", r["score"], r["text"][:80])


def show_stats():
    """모든 ChromaDB 컬렉션 통계 출력."""
    from app.rag.vector_store import VectorStoreManager

    collections = ["graph_nodes", "corpus_nodes", "domain_tarot", "domain_dream", "domain_persona"]

    logger.info("=" * 60)
    logger.info("ChromaDB 컬렉션 통계")
    logger.info("=" * 60)

    for name in collections:
        try:
            vs = VectorStoreManager(collection_name=name)
            stats = vs.get_stats()
            logger.info("  %-20s: %d items", name, stats["count"])
        except Exception as e:
            logger.info("  %-20s: (없음) %s", name, e)


def detect_model_change() -> bool:
    """Phase 6 모델 변경 감지.

    현재 임베딩 모델의 차원과 ChromaDB에 저장된 임베딩 차원을 비교하여
    모델 변경 여부를 감지한다.

    Returns:
        True: 재인덱싱 필요 (모델 변경됨 또는 데이터 없음)
        False: 재인덱싱 불필요 (동일 모델)
    """
    try:
        from app.rag.model_manager import get_embedding_manager
        from app.rag.vector_store import VectorStoreManager

        mgr = get_embedding_manager()
        current_dim = mgr.dimension
        model_key = mgr.model_key

        logger.info("현재 임베딩 모델: %s (%dD)", model_key, current_dim)

        vs = VectorStoreManager(collection_name="graph_nodes")
        if not vs.has_data():
            logger.info("ChromaDB에 데이터 없음 → 마이그레이션 필요")
            return True

        # ChromaDB에서 첫 번째 임베딩의 차원 확인
        try:
            result = vs.collection.peek(limit=1)
            if result and result.get("embeddings") and result["embeddings"][0]:
                stored_dim = len(result["embeddings"][0])
                logger.info("ChromaDB 저장 차원: %dD", stored_dim)

                if stored_dim != current_dim:
                    logger.warning(
                        "차원 불일치! 저장=%dD, 현재=%dD → 재인덱싱 필요",
                        stored_dim, current_dim,
                    )
                    return True
                else:
                    logger.info("차원 일치 (%dD) → 재인덱싱 불필요", current_dim)
                    return False
            else:
                logger.info("ChromaDB peek 실패 → 마이그레이션 필요")
                return True
        except Exception as e:
            logger.warning("차원 확인 실패: %s → 마이그레이션 필요", e)
            return True

    except ImportError as e:
        logger.warning("모델 매니저 로드 실패: %s", e)
        return True


def main():
    parser = argparse.ArgumentParser(description="PyTorch .pt -> ChromaDB 마이그레이션")
    parser.add_argument("--reset", action="store_true", help="기존 데이터 초기화 후 재인덱싱")
    parser.add_argument("--domain", type=str, default=None, help="특정 도메인만 마이그레이션 (tarot/dream/persona)")
    parser.add_argument("--stats", action="store_true", help="통계만 출력")
    parser.add_argument("--graph-only", action="store_true", help="GraphRAG만 마이그레이션")
    parser.add_argument("--corpus-only", action="store_true", help="search_graphs corpus만 마이그레이션")
    parser.add_argument("--auto-detect", action="store_true", help="모델 변경 감지 후 필요 시에만 재인덱싱 (Phase 6)")
    args = parser.parse_args()

    if args.stats:
        show_stats()
        return

    # --auto-detect: 모델 변경 여부 감지
    if args.auto_detect:
        needs_migration = detect_model_change()
        if not needs_migration:
            logger.info("재인덱싱 불필요. 종료합니다.")
            show_stats()
            return
        logger.info("모델 변경 감지 → 전체 재인덱싱 실행 (reset=True)")
        args.reset = True

    start = time.time()

    if args.domain:
        migrate_domain_embeddings(args.domain, reset=args.reset)
    elif args.graph_only:
        migrate_graph_rag(reset=args.reset)
    elif args.corpus_only:
        migrate_search_graphs(reset=args.reset)
    else:
        # 전체 마이그레이션
        migrate_graph_rag(reset=args.reset)
        migrate_search_graphs(reset=args.reset)
        for domain in ["tarot", "dream"]:
            migrate_domain_embeddings(domain, reset=args.reset)

    elapsed = time.time() - start
    logger.info("\n전체 마이그레이션 완료 (%.1f초)", elapsed)
    show_stats()


if __name__ == "__main__":
    main()
