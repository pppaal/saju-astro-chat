import os, csv, itertools, json, random

# ------------------------------------------------------------
# ⚙️ 경로 설정
# ------------------------------------------------------------
BASE_DIR  = os.path.dirname(os.path.dirname(__file__))   # backend_ai
GRAPH_DIR = os.path.join(BASE_DIR, "data", "graph")
ASTRO_DIR = os.path.join(GRAPH_DIR, "astro_database", "nodes")
OUT_DIR   = os.path.join(BASE_DIR, "data", "rules", "astro")
os.makedirs(OUT_DIR, exist_ok=True)

# ------------------------------------------------------------
# 🧰 CSV Loader
# ------------------------------------------------------------
def read_csv(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        return [r for r in csv.DictReader(f)]

# ------------------------------------------------------------
# 🔮 ASTROLOGY RULES PER THEME
# ------------------------------------------------------------
def build_astro_per_theme(limit_per_theme=10000):
    """테마별 점성학 룰 각 json 파일로 분리 생성"""
    planets = [r["id"] for r in read_csv(os.path.join(ASTRO_DIR, "nodes_astro_planets.csv"))]
    signs   = [r["id"] for r in read_csv(os.path.join(ASTRO_DIR, "nodes_astro_signs.csv"))]
    houses  = [r["id"] for r in read_csv(os.path.join(ASTRO_DIR, "nodes_astro_houses.csv"))]
    aspects = [r["id"] for r in read_csv(os.path.join(ASTRO_DIR, "nodes_astro_aspects.csv"))]

    themes = [
        "new_year","next_year","monthly","daily",
        "career","love","family","health","life_path"
    ]

    print(f"🚀 Generating Astrology rules per theme (≈{limit_per_theme} entries each)")

    for theme in themes:
        out_path = os.path.join(OUT_DIR, f"{theme}.json")
        print(f"📁 {theme}.json → {out_path}")

        # 무작위 샘플링 or 조합 앞부분을 제한
        combo_iter = itertools.islice(
            itertools.product(planets, signs, houses, aspects),
            limit_per_theme
        )

        rules = {}
        for p, s, h, a in combo_iter:
            key = f"{p}_{s}_{h}_{a}"
            val = (
                f"{theme.upper()} | 행성 {p}, 별자리 {s}, 하우스 {h}, 각도 {a} 조합은 "
                f"{theme} 테마에서 특정 에너지 패턴 및 영향을 나타냅니다."
            )
            rules[key] = val

        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(rules, f, ensure_ascii=False, indent=2)

        print(f"✅ {theme}.json saved ({len(rules):,} entries)")

    print("\n🎉 All Astrology theme rule files completed!")

# ------------------------------------------------------------
# 🚀 Run
# ------------------------------------------------------------
if __name__ == "__main__":
    # 테마별 10,000개 기준 (원하면 수정가능)
    build_astro_per_theme(limit_per_theme=10000)