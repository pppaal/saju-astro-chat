# -------------------------------------------------------------
# test_graph_search.py
# GraphRAG Corpus 테스트용 검색 엔진 (Full-field 버전, 완벽본)
# -------------------------------------------------------------
import torch
from sentence_transformers import SentenceTransformer, util
import csv, json, os, time

# ===============================================================
# 설정
# ===============================================================
MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
BASE_DIR = os.path.join(os.getcwd(), "backend_ai", "data", "graph")
EMBED_FILE = os.path.join(BASE_DIR, "corpus_embeds.pt")

# ===============================================================
# 데이터 로더: 모든 CSV/JSON의 모든 필드 문자열 병합
# ===============================================================
def load_all_texts(base_dir: str) -> list[str]:
    texts = []
    print(f"📂 그래프 데이터 스캔 중 → {base_dir}")

    for root, _, files in os.walk(base_dir):
        for f in files:
            path = os.path.join(root, f)
            if f.endswith(".csv"):
                try:
                    with open(path, encoding="utf-8-sig") as fr:
                        reader = csv.DictReader(fr)
                        headers = reader.fieldnames or []
                        for row in reader:
                            vals = []
                            for h in headers:
                                val = row.get(h)
                                if isinstance(val, (str, int, float)):
                                    val = str(val).strip()
                                    if val:
                                        vals.append(val)
                            if vals:
                                texts.append(" | ".join(vals))
                except Exception as e:
                    print(f"⚠️ CSV 로드 실패: {path} | {e}")
            elif f.endswith(".json"):
                try:
                    with open(path, encoding="utf-8-sig") as fr:
                        data = json.load(fr)
                    if isinstance(data, dict):
                        data = list(data.values())
                    if isinstance(data, list):
                        for n in data:
                            if isinstance(n, dict):
                                vals = []
                                for k, v in n.items():
                                    if isinstance(v, (str, int, float)):
                                        val = str(v).strip()
                                        if val:
                                            vals.append(val)
                                if vals:
                                    texts.append(" | ".join(vals))
                except Exception as e:
                    print(f"⚠️ JSON 로드 실패: {path} | {e}")

    print(f"✅ 총 {len(texts)}개의 텍스트 항목 로드 완료\n")
    return texts

# ===============================================================
# 메인 함수
# ===============================================================
def main():
    print("🧠 GraphRAG 검색 테스트 시작")

    # 1️⃣ 임베딩 파일 로드
    start = time.time()
    if not os.path.exists(EMBED_FILE):
        print(f"❌ 임베딩 파일 없음: {EMBED_FILE}")
        return
    print("💾 임베딩 불러오는 중...")
    embeds = torch.load(EMBED_FILE)
    print(f"✅ 임베딩 로드 완료: {embeds.shape} ({time.time()-start:.1f}s)\n")

    # 2️⃣ 모델 로드
    print("🧠 SentenceTransformer 모델 로드 중...")
    model = SentenceTransformer(MODEL_NAME)
    print(f"✅ 모델 로드 완료: {MODEL_NAME}\n")

    # 3️⃣ 텍스트 로드
    texts = load_all_texts(BASE_DIR)
    if not texts:
        print("❌ 텍스트 데이터 없음 — CSV/JSON 확인 필요.")
        return

    # 4️⃣ 질의 입력 루프
    while True:
        print("――――――――――――――――――――――――――――――――――――")
        query = input("🤔 검색할 질문 (또는 exit 입력→종료): ").strip()
        if query.lower() in ["exit", "quit", "종료"]:
            print("👋 종료합니다.")
            break
        if not query:
            continue

        # 🔍 키워드 필터링 (성능 향상용)
        keyword = None
        for kw in ["Sun", "Moon", "태양", "달", "Jupiter", "Saturn", "목성", "토성"]:
            if kw.lower() in query.lower():
                keyword = kw
                break

        if keyword:
            filtered_indices = [i for i, t in enumerate(texts) if keyword.lower() in t.lower()]
            if filtered_indices:
                filtered_texts = [texts[i] for i in filtered_indices]
                filtered_embeds = embeds[filtered_indices]
                print(f"⚙️ '{keyword}' 관련 {len(filtered_texts)}개 데이터로 축소 검색.\n")
            else:
                filtered_texts, filtered_embeds = texts, embeds
        else:
            filtered_texts, filtered_embeds = texts, embeds

        # 5️⃣ 쿼리 임베딩 → 유사도 계산
        query_emb = model.encode(query, convert_to_tensor=True, normalize_embeddings=True)
        cos_scores = util.cos_sim(query_emb, filtered_embeds)[0]
        top_results = torch.topk(cos_scores, k=min(5, len(filtered_texts)))

        print(f"🔍 질문: {query}\n")
        for rank, (score, idx) in enumerate(zip(top_results.values, top_results.indices), start=1):
            print(f"{rank}. 💫 유사도 {score:.4f}")
            print(filtered_texts[idx].replace("|", "\n"))
            print("--------------------------------------------------")
        print()

# ===============================================================
# 실행 진입점
# ===============================================================
if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n👋 수동 종료됨.")