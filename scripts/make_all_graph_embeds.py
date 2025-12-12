# make_all_graph_embeds.py
"""
GraphRAG 전체 임베딩 생성기 (누락 0, 모든 열/필드 포함)
SentenceTransformer: paraphrase-multilingual-MiniLM-L12-v2
- astro_database, cross_analysis, saju → CSV
- rules/(astro, saju, fusion) → JSON
- 모든 열의 텍스트를 병합하여 임베딩
- UTF‑8 + BOM 지원
- CPU/GPU 자동 감지
"""

import os
import json
import csv
import torch
from sentence_transformers import SentenceTransformer

MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


# ===============================================================
# 🗂️ GRAPH DATA LOADING (CSV + JSON, 모든 열 포함)
# ===============================================================
def load_all_graph_nodes(graph_root: str) -> list[dict]:
    """모든 CSV/JSON의 모든 텍스트 필드 내용을 description에 합쳐 수집."""
    all_nodes = []
    csv_targets = ["astro_database", "cross_analysis", "saju"]
    json_base = os.path.join(graph_root, "rules")

    print(f"[GraphLoader] 📂 Base: {graph_root}")

    # ============================== CSV ==============================
    for sub in csv_targets:
        folder = os.path.join(graph_root, sub)
        if not os.path.isdir(folder):
            print(f"[GraphLoader] ⚠️ Missing CSV folder → {folder}")
            continue

        for root, _, files in os.walk(folder):
            for f in files:
                if not f.endswith(".csv"):
                    continue
                path = os.path.join(root, f)
                try:
                    with open(path, newline="", encoding="utf-8-sig") as fr:
                        reader = csv.DictReader(fr)
                        headers = reader.fieldnames or []
                        for row in reader:
                            # 모든 열 내용을 문자열로 합침
                            vals = []
                            for h in headers:
                                val = row.get(h)
                                if isinstance(val, (str, int, float)):
                                    val = str(val).strip()
                                    if val:
                                        vals.append(val)
                            if vals:
                                desc = " | ".join(vals)
                                all_nodes.append({
                                    "label": row.get("label") or row.get("id") or row.get("name") or "",
                                    "description": desc.strip(),
                                    "type": "csv_node",
                                    "source": sub
                                })
                except Exception as e:
                    print(f"[GraphLoader] ❌ CSV load failed: {path} | {e}")

    # ============================== JSON ==============================
    if not os.path.isdir(json_base):
        print(f"[GraphLoader] ⚠️ rules folder not found → {json_base}")
    else:
        for inner in ["astro", "saju", "fusion"]:
            sub = os.path.join(json_base, inner)
            if not os.path.isdir(sub):
                continue

            for root, _, files in os.walk(sub):
                for f in files:
                    if not f.endswith(".json"):
                        continue
                    path = os.path.join(root, f)
                    try:
                        with open(path, "r", encoding="utf-8-sig") as fr:
                            data = json.load(fr)

                        # 데이터 유형별로 모든 텍스트 필드 병합
                        if isinstance(data, list):
                            nodes = data
                        elif isinstance(data, dict) and "nodes" in data:
                            nodes = data["nodes"]
                        elif isinstance(data, dict):
                            nodes = [{"label": k, "description": v} for k, v in data.items()]
                        else:
                            nodes = [data]

                        for n in nodes:
                            desc_parts = []
                            if isinstance(n, dict):
                                for k, v in n.items():
                                    if isinstance(v, (str, int, float)):
                                        val = str(v).strip()
                                        if val:
                                            desc_parts.append(val)
                                if desc_parts:
                                    desc = " | ".join(desc_parts)
                                    all_nodes.append({
                                        "label": n.get("label") or n.get("id") or "",
                                        "description": desc.strip(),
                                        "type": f"json_rule_{inner}",
                                        "source": f"rules/{inner}"
                                    })
                    except Exception as e:
                        print(f"[GraphLoader] ❌ JSON load failed: {path} | {e}")

    print(f"[GraphLoader] ✅ Loaded {len(all_nodes)} nodes total.")
    return all_nodes


# ===============================================================
# 🧠 EMBEDDING PIPELINE
# ===============================================================
def main():
    print("🧠 Graph Embedding All‑in‑One Generator (Full‑Field Mode)")

    base_dir = os.path.join(os.getcwd(), "backend_ai", "data", "graph")
    save_path = os.path.join(base_dir, "corpus_embeds.pt")

    # 1️⃣ 모든 노드 로드
    nodes = load_all_graph_nodes(base_dir)

    # 2️⃣ description 문자열만 정제
    texts = []
    for n in nodes:
        desc = n.get("description")
        if isinstance(desc, str):
            desc = desc.strip()
            if desc:
                texts.append(desc)

    print(f"✅ Loaded {len(texts)} merged description texts")

    if not texts:
        print("❌ No valid texts found — check graph data.")
        return

    # 3️⃣ 모델 로드
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = SentenceTransformer(MODEL_NAME, device=device)
    print(f"🧩 Model: {MODEL_NAME} | Device: {device}")

    # 4️⃣ 임베딩 계산
    print("⚙️ Encoding all graph texts (full-field mode)...")
    embeds = model.encode(
        texts,
        batch_size=128,
        convert_to_tensor=True,
        normalize_embeddings=True,
        show_progress_bar=True,
    )

    # 5️⃣ 저장
    torch.save(embeds, save_path)
    print(f"💾 Embeddings saved → {save_path}")
    print("🎉 All graph embeddings successfully generated (no column left behind)!")


# ===============================================================
# 🚀 ENTRY POINT
# ===============================================================
if __name__ == "__main__":
    main()