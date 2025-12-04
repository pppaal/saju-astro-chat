import os
import torch
from backend_ai.data.graph.utils import _load_graph_nodes, embed_batch

# 1️⃣ 그래프 데이터 경로
graph_root = os.path.join(os.getcwd(), "backend_ai", "data", "graph")

# 2️⃣ 노드 불러오기
nodes = _load_graph_nodes(graph_root)
texts = [n["description"] for n in nodes if n.get("description")]

print(f"[CacheBuilder] 🔹 총 {len(texts)} 문장 로드됨.")
print("[CacheBuilder] 🧠 임베딩 계산을 시작합니다... (한 번만 오래 걸립니다)")

# 3️⃣ 임베딩 생성 (한 번만)
corpus_embeds = embed_batch(texts, batch_size=128)

# 4️⃣ 저장
cache_path = os.path.join(graph_root, "corpus_embeds.pt")
torch.save(corpus_embeds, cache_path)

print(f"[CacheBuilder] ✅ 캐시 저장 완료 → {cache_path}")
print("[CacheBuilder] 🎉 다음부터 즉시 검색 가능합니다!")