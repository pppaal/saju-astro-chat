import os, csv, itertools, json, random

# ------------------------------------------------------------
# ⚙️ 경로 설정
# ------------------------------------------------------------
BASE_DIR  = os.path.dirname(os.path.dirname(__file__))   # backend_ai
GRAPH_DIR = os.path.join(BASE_DIR, "data", "graph")
ASTRO_DIR = os.path.join(GRAPH_DIR, "astro_database", "nodes")
SAJU_DIR  = os.path.join(GRAPH_DIR, "saju")
OUT_DIR   = os.path.join(BASE_DIR, "data", "rules", "fusion")
os.makedirs(OUT_DIR, exist_ok=True)

# ------------------------------------------------------------
# 🧰 CSV 로더
# ------------------------------------------------------------
def read_csv(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        return [r for r in csv.DictReader(f)]

# ------------------------------------------------------------
# 🔮 Fusion 룰 생성기 – 테마별 개별 파일
# ------------------------------------------------------------
def build_fusion_per_theme(limit_per_theme=10000):
    ganji     = [r["id"] for r in read_csv(os.path.join(SAJU_DIR, "nodes_saju_ganji.csv"))]
    elements  = ["화","토","금","수","목"]
    sibsin    = ["정관","편관","정재","편재","정인","편인","식신","상관","비견","겁재"]
    planets   = [r["id"] for r in read_csv(os.path.join(ASTRO_DIR, "nodes_astro_planets.csv"))]
    signs     = [r["id"] for r in read_csv(os.path.join(ASTRO_DIR, "nodes_astro_signs.csv"))]
    houses    = [r["id"] for r in read_csv(os.path.join(ASTRO_DIR, "nodes_astro_houses.csv"))]
    aspects   = [r["id"] for r in read_csv(os.path.join(ASTRO_DIR, "nodes_astro_aspects.csv"))]

    themes = [
        "new_year","next_year","monthly","daily",
        "career","love","family","health","life_path"
    ]

    print(f"🚀 Generating Fusion rules per theme (≈{limit_per_theme} entries each)")

    for theme in themes:
        out_path = os.path.join(OUT_DIR, f"{theme}.json")
        print(f"📁 {theme}.json → {out_path}")

        # 중복 줄이기 위해 임의 샘플링
        random.shuffle(ganji)
        random.shuffle(planets)
        random.shuffle(signs)
        random.shuffle(houses)
        random.shuffle(aspects)

        combo_iter = itertools.islice(
            itertools.product(ganji, elements, sibsin, planets, signs, houses, aspects),
            limit_per_theme
        )

        rules = {}
        for g,e,s,p,sign,h,a in combo_iter:
            key = f"{g}_{e}_{s}_{p}_{sign}_{h}_{a}"
            val = (
                f"{theme.upper()} | {g}/{e}/{s} ↔ 행성 {p}, 별자리 {sign}, 하우스 {h}, 각도 {a} 조합 : "
                f"사주×점성 융합 패턴 기반 조언 및 예측."
            )
            rules[key] = val

        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(rules, f, ensure_ascii=False, indent=2)

        print(f"✅ {theme}.json saved ({len(rules):,} entries)")

    print("\n🎉 All Fusion theme rule files completed!")

# ------------------------------------------------------------
# 🚀 실행
# ------------------------------------------------------------
if __name__ == "__main__":
    # 테마별 기본 1 만 개씩
    build_fusion_per_theme(limit_per_theme=10000)