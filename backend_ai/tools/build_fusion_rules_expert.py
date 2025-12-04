# -*- coding: utf-8 -*-
"""
사주 + 점성 Fusion 룰 자동 생성기 (전문가 통합 버전)
- Saju(천간/지지/십성/신살) + Astrology(행성/별자리/하우스/Aspect)
- Theme별 10,000개 룰 JSON 생성
- 저장 위치 : C:\dev\saju-astro-chat\backend_ai\data\graph\rules\fusion
"""

import os, json, itertools, random

# ------------------------------
#  사주 파트 구성
# ------------------------------
CHEONGAN = ["갑","을","병","정","무","기","경","신","임","계"]
JIJI = ["자","축","인","묘","진","사","오","미","신","유","술","해"]
SIBSUNG = ["비견","겁재","식신","상관","편재","정재","편관","정관","편인","정인"]
SHINSAL = ["홍염","천덕귀인","문창귀인","월덕귀인","현침","도화","백호","겁살","천살","지살"]

# ------------------------------
#  점성 파트 구성
# ------------------------------
PLANETS = ["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Pluto"]
SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo",
          "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"]
HOUSES = [f"H{i}" for i in range(1,13)]
ASPECTS = ["conjunction","sextile","square","trine","opposition"]

# ------------------------------
#  테마 (9개)
# ------------------------------
CATEGORIES = {
    "career":   "직업/성과/명예/사회적 위치",
    "love":     "연애/인연/감정/관계 흐름",
    "family":   "가정/혈연/정서적 기반",
    "health":   "건강/체력/균형/생활 리듬",
    "life_path":"인생길/자기실현/운명 흐름",
    "daily":    "일상/소통/감정 상태",
    "monthly":  "월간/목표/행동 패턴",
    "new_year": "신년/시작/성장 테마",
    "next_year":"내년/기회/전환점"
}

# ------------------------------
#  문장 패턴
# ------------------------------
PATTERNS = [
    ("{stem}{branch} 일주의 {sibsin}과 {planet}-{sign}-{house} {aspect} 조합은 "
     "서로 공명하여 {desc} 영역에서 새로운 변화를 이끕니다. 신살 {shinsal}의 영향이 이를 돕습니다."),
    ("{planet}이(가) {sign} 자리 {house} 하우스에서 {aspect} 각을 이루며, "
     "{stem}{branch} 일주의 {sibsin} 기운과 맞물려 {desc} 테마에 현실적 계기를 만듭니다. 신살 {shinsal} 활성."),
    ("{stem}{branch} 조합과 {planet}-{sign}-{house}-{aspect} 구성의 상호작용이 "
     "{desc} 분야에서 직관과 통찰을 확장시킵니다. {shinsal} 기운의 부스팅 효과.")
]

def make_sentence(category, stem, branch, sibsin, shinsal, planet, sign, house, aspect):
    desc = CATEGORIES[category]
    pattern = random.choice(PATTERNS)
    summary = pattern.format(
        stem=stem, branch=branch, sibsin=sibsin, shinsal=shinsal,
        planet=planet, sign=sign, house=house, aspect=aspect, desc=desc
    )
    positive = f"{desc} 영역에서 {stem}{branch}-{sibsin} 과 {planet}-{sign}-{house} 구성이 시너지 효과를 냅니다."
    caution  = f"{shinsal} 기운 과다 시 {desc} 영역의 균형 유지가 필요합니다."
    return {"summary": summary, "positive": positive, "caution": caution}

# ------------------------------
#  룰 생성 함수
# ------------------------------
def build_rules(category: str, limit: int = 10000):
    saju_combos = list(itertools.product(CHEONGAN, JIJI, SIBSUNG, SHINSAL))
    astro_combos = list(itertools.product(PLANETS, SIGNS, HOUSES, ASPECTS))
    data = {}
    for i in range(limit):
        g,b,s,sh = random.choice(saju_combos)
        p,si,h,a = random.choice(astro_combos)
        key = f"{g}{b}_{s}_{sh}_{p}_{si}_{h}_{a}_{i+1}"
        data[key] = make_sentence(category, g,b,s,sh,p,si,h,a)
    print(f"✅ {category}.json 생성 ({len(data):,} rules)")
    return data

# ------------------------------
#  저장
# ------------------------------
def save_rules():
    base = r"C:\dev\saju-astro-chat\backend_ai\data\graph\rules\fusion"
    os.makedirs(base, exist_ok=True)
    for cat in CATEGORIES:
        rules = build_rules(cat, 10000)
        out = os.path.join(base, f"{cat}.json")
        with open(out, "w", encoding="utf-8") as f:
            json.dump(rules, f, ensure_ascii=False, indent=2)
        print(f"💾 저장 완료 → {out}")

# ------------------------------
#  실행
# ------------------------------
if __name__ == "__main__":
    print("🌗 Fusion (사주+Astrology) 룰 생성 시작...")
    save_rules()
    print("🎉 모든 Fusion 룰 파일 생성 완료!")