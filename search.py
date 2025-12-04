import os
import sys
import torch
from sentence_transformers import util
from backend_ai.data.graph.utils import _load_graph_nodes, embed_text


def main():
    # 🔹 캐시된 임베딩 파일 경로
    graph_root = os.path.join(os.getcwd(), "backend_ai", "data", "graph")

    print("[GraphSearch] 💾 Loading cached embeddings...")
    corpus_embeds = torch.load(os.path.join(graph_root, "corpus_embeds.pt"))
    nodes = _load_graph_nodes(graph_root)
    print(f"[GraphSearch] ✅ Loaded {len(nodes)} nodes with cached embeddings.")

    # 🔹 CLI 인자 또는 입력창에서 검색어 받기
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
    else:
        query = input("\nSearch Query: ")

    print(f"[GraphSearch] 🔍 Searching for: {query}")

    # 🔹 임베딩 및 유사도 계산
    q_emb = embed_text(query)
    scores = util.cos_sim(q_emb, corpus_embeds)[0]
    best = torch.topk(scores, k=5)

    print("\n🔎 Top 5 Results:")
    for i, v in zip(best.indices, best.values):
        node = nodes[int(i)]
        print(f"{v:.4f} | {node['label']} → {node['description'][:80]}...")


if __name__ == "__main__":
    main()