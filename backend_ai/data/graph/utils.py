"""
GraphRAG Utilities (Batch Optimized CPU Version)
SentenceTransformer: paraphrase-multilingual-MiniLM-L12-v2
- Hugging Face 공개 모델 (로그인 불필요)
- UTF-8 + BOM 지원
- CPU/GPU 자동 감지
- CSV + JSON 동시 지원
- 배치 인코딩으로 속도 5~7배 향상
"""

import os
import json
import csv
import torch
import hashlib
from functools import lru_cache
from sentence_transformers import SentenceTransformer, util

# ===============================================================
# 🔧 MODEL INITIALIZATION
# ===============================================================
_MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
_MODEL = None


def get_model():
    """SentenceTransformer 모델 로드 (Lazy load + 진행 로그)."""
    global _MODEL
    if _MODEL is None:
        try:
            device = "cuda" if torch.cuda.is_available() else "cpu"
            print(f"[GraphUtils] 🧠 Loading embedding model: {_MODEL_NAME}")
            print(f"[GraphUtils] Using device: {device}")
            print("[GraphUtils] ⏳ 모델 다운로드 및 로딩 중... (처음 1회만 오래 걸림)")

            _MODEL = SentenceTransformer(_MODEL_NAME, device=device)
            print("[GraphUtils] ✅ SentenceTransformer 모델 로드 완료")

        except Exception as e:
            raise RuntimeError(f"❌ SentenceTransformer load failed: {e}")
    return _MODEL


# ===============================================================
# 🗂️ GRAPH DATA LOADING (CSV + JSON 동시 지원)
# ===============================================================
def _load_graph_nodes(graph_root: str) -> list[dict]:
    """
    CSV + JSON 통합 로딩
    - astro_database, cross_analysis, saju → CSV
    - rules, fusion → JSON
    """
    all_nodes = []
    targets = ["astro_database", "cross_analysis", "saju", "rules", "fusion"]
    print(f"[GraphLoader] 📂 Scanning base: {graph_root}")

    for sub in targets:
        folder = os.path.join(graph_root, sub)
        if not os.path.isdir(folder):
            print(f"[GraphLoader] ⚠️ Missing folder → {folder}")
            continue

        for root, _, files in os.walk(folder):
            for f in files:
                path = os.path.join(root, f)
                # ============================= CSV =============================
                if f.endswith(".csv"):
                    try:
                        with open(path, newline="", encoding="utf-8-sig") as fr:
                            reader = csv.DictReader(fr)
                            for row in reader:
                                desc = (
                                    row.get("description")
                                    or row.get("설명")
                                    or row.get("content")
                                    or ""
                                )
                                label = (
                                    row.get("label")
                                    or row.get("name")
                                    or row.get("이름")
                                    or ""
                                )
                                if desc.strip():
                                    all_nodes.append(
                                        {
                                            "label": label.strip(),
                                            "description": desc.strip(),
                                            "type": "csv_node",
                                            "source": sub,
                                        }
                                    )
                    except Exception as e:
                        print(f"[GraphLoader] ❌ CSV load failed: {path} | {e}")
                        continue

                # ============================= JSON =============================
                elif f.endswith(".json"):
                    try:
                        with open(path, "r", encoding="utf-8-sig") as fr:
                            data = json.load(fr)

                        if isinstance(data, list):
                            nodes = data
                        elif isinstance(data, dict) and "nodes" in data:
                            nodes = data["nodes"]
                        elif isinstance(data, dict):
                            nodes = [
                                {"label": k, "description": v, "type": "json_rule"}
                                for k, v in data.items()
                            ]
                        else:
                            nodes = [data]

                        for node in nodes:
                            if isinstance(node, dict) and node.get("description"):
                                node.setdefault("source", sub)
                                all_nodes.append(node)

                    except Exception as e:
                        print(f"[GraphLoader] ❌ JSON load failed: {path} | {e}")
                        continue

    print(f"[GraphLoader] ✅ Loaded {len(all_nodes)} nodes total.")
    return all_nodes


# ===============================================================
# 🧠 EMBEDDING + CACHE
# ===============================================================
_CACHE_EMBEDS = {}
_NODES_CACHE = None
_TEXTS_CACHE = None
_CORPUS_EMBEDS_CACHE = None
_CORPUS_EMBEDS_PATH = None
_GRAPH_MTIME = None


def _latest_mtime(folder: str) -> float:
    latest = 0.0
    for root, _, files in os.walk(folder):
        for f in files:
            try:
                ts = os.path.getmtime(os.path.join(root, f))
                if ts > latest:
                    latest = ts
            except OSError:
                continue
    return latest
_NODES_CACHE = None
_TEXTS_CACHE = None
_CORPUS_EMBEDS_CACHE = None
_CORPUS_EMBEDS_PATH = None


def _hash_text(text: str) -> str:
    """텍스트 해시 → 캐시 키."""
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:16]


@lru_cache(maxsize=2048)
def embed_text(text: str):
    """단일 문장을 임베딩."""
    model = get_model()
    return model.encode(
        text,
        convert_to_tensor=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )


def embed_batch(texts: list[str], batch_size: int = 64):
    """여러 문장을 배치로 임베딩 (속도 향상)."""
    model = get_model()
    print(f"[GraphUtils] ⚙️ Encoding {len(texts)} texts (batch={batch_size})...")
    embeds = model.encode(
        texts,
        batch_size=batch_size,
        convert_to_tensor=True,
        normalize_embeddings=True,
        show_progress_bar=True,  # ✅ 진행바 표시
    )
    print(f"[GraphUtils] ✅ Batch embedding complete: {embeds.shape}")
    return embeds


# ===============================================================
# 🔎 SEMANTIC GRAPH SEARCH
# ===============================================================
def search_graphs(query: str, top_k: int = 5, graph_root=None):
    """
    그래프 데이터 내 description 필드를 임베딩 기반으로 검색.
    :param query: 자연어 검색어
    :param top_k: 반환 개수
    :param graph_root: 그래프 데이터 루트 (기본: 현재 파일 위치)
    :return: [{"label": str, "description": str, "score": float, ...}, ...]
    """
    if graph_root is None:
        graph_root = os.path.dirname(__file__)

    global _NODES_CACHE, _TEXTS_CACHE, _CORPUS_EMBEDS_CACHE, _CORPUS_EMBEDS_PATH, _GRAPH_MTIME

    current_mtime = _latest_mtime(graph_root)
    graph_changed = _GRAPH_MTIME is None or current_mtime > (_GRAPH_MTIME or 0)

    if _NODES_CACHE is None or graph_changed:
        _NODES_CACHE = _load_graph_nodes(graph_root)
        _TEXTS_CACHE = [n["description"] for n in _NODES_CACHE if n.get("description")]
        _CORPUS_EMBEDS_PATH = os.path.join(graph_root, "corpus_embeds.pt")
        _CORPUS_EMBEDS_CACHE = None  # force reload/recompute
        _GRAPH_MTIME = current_mtime

    if not _NODES_CACHE or not _TEXTS_CACHE:
        print("[GraphSearch] ⚠️ No graph nodes found.")
        return []

    print(f"[GraphSearch] 🔎 Embedding & searching in corpus ({len(_NODES_CACHE)} nodes)...")
    cache_key = _hash_text(query)

    # ✅ 캐시 재사용
    q_emb = _CACHE_EMBEDS.get(cache_key) or embed_text(query)
    _CACHE_EMBEDS[cache_key] = q_emb

    # ⚡ 프리컴퓨트 임베딩 로드 또는 생성
    if _CORPUS_EMBEDS_CACHE is None:
        if _CORPUS_EMBEDS_PATH and os.path.exists(_CORPUS_EMBEDS_PATH):
            print(f"[GraphUtils] ⚡ Loading cached embeds: {_CORPUS_EMBEDS_PATH}")
            _CORPUS_EMBEDS_CACHE = torch.load(_CORPUS_EMBEDS_PATH, map_location="cpu")
        else:
            _CORPUS_EMBEDS_CACHE = embed_batch(_TEXTS_CACHE, batch_size=64)
            try:
                if _CORPUS_EMBEDS_PATH:
                    torch.save(_CORPUS_EMBEDS_CACHE, _CORPUS_EMBEDS_PATH)
                    print(f"[GraphUtils] 💾 Saved embeds → {_CORPUS_EMBEDS_PATH}")
            except Exception as e:
                print(f"[GraphUtils] ⚠️ Failed to save embeds: {e}")

    corpus_embeds = _CORPUS_EMBEDS_CACHE
    scores = util.cos_sim(q_emb, corpus_embeds)[0]

    best_indices = torch.topk(scores, k=min(top_k, len(_NODES_CACHE)))
    results = []
    for idx, score in zip(best_indices.indices, best_indices.values):
        node = dict(_NODES_CACHE[int(idx)])
        node["score"] = round(float(score), 4)
        results.append(node)

    print(f"[GraphSearch] ✅ Top-{top_k} results ready.")
    return results


# ===============================================================
# 🧪 LOCAL TEST
# ===============================================================
if __name__ == "__main__":
    query = "리더십과 추진력이 조화를 이루는 시기"
    print(f"[GraphSearch] 🔍 Query: {query}")
    results = search_graphs(query, top_k=5)
    print(json.dumps(results, ensure_ascii=False, indent=2))
