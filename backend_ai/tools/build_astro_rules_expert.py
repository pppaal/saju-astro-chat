# -*- coding: utf-8 -*-
"""
Astrology Rule Generator (index.ts 기반 전문가 통합 버전)
- 행성 + 별자리 + 하우스 + 관계 4축 반영
- 테마별 10,000개씩 총 9개 JSON 생성
- 저장 위치 : C:\dev\saju-astro-chat\backend_ai\data\graph\rules\astro
"""

import os, json, itertools, random

# --------------------------------
# 구성 값 : planets, signs, houses, aspects
# --------------------------------
PLANETS = [
    "Sun","Moon","Mercury","Venus","Mars",
    "Jupiter","Saturn","Uranus","Neptune","Pluto"
]
SIGNS = [
    "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
    "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"
]
HOUSES  = [f"H{i}" for i in range(1, 13)]
ASPECTS = [
    "conjunction","sextile","square","trine","opposition",
    "quincunx","semi_sextile","sesqui_quadrate","quintile"
]

CATEGORIES = {
    "career":   "직업 / 사회적 위치와 성취, 리더십, 사회적 영향력",
    "love":     "연애 / 인간관계, 감정적 흐름, 호감의 전개",
    "family":   "가정 / 정서, 근원, 가족 및 내면적 안정",
    "health":   "건강 / 신체적‧정신적 조화와 활력",
    "life_path":"인생길 / 운명적 방향과 자기실현의 흐름",
    "daily":    "일상 / 매일의 감정, 집중력, 소통 리듬",
    "monthly":  "월간 / 계획, 실행력, 구조적 변화",
    "new_year": "신년 / 새로운 도전과 성장 테마",
    "next_year":"내년 / 장기 변화, 기회의 확장과 통찰"
}

PATTERNS = [
    "행성 {planet}이(가) {sign} 자리의 {house} 하우스에서 {aspect} 각을 이루며, {desc}에 변화를 일으킵니다.",
    "{planet} in {sign} @ {house}이(가) {aspect} 형태로 드러나 {desc} 영역에 집중이 강조됩니다.",
    "{planet} 이(가) {sign}에서 {house} 하우스 영역에 머물며 {aspect} 각을 형성, 현실적 전환 관점을 강조합니다.",
    "{planet}-{sign}-{house}-{aspect} 구성이 {desc} 주제에서 새로운 균형 을 찾게 합니다."
]

def make_sentence(category, planet, sign, house, aspect):
    desc = CATEGORIES[category]
    pattern = random.choice(PATTERNS)
    base = pattern.format(planet=planet, sign=sign, house=house, aspect=aspect, desc=desc)
    summary = f"[{desc}] | {base}"
    positive = f"{planet}-{sign}-{house} 조합이 {aspect} 각을 이룸으로써 {desc} 영역에서 긍정적 성장을 유도합니다."
    caution  = f"과도한 {aspect} 작용 시 {desc} 영역에서 균형 유지가 필요합니다."
    return {"summary": summary, "positive": positive, "caution": caution}

def build_rules(category: str, limit: int = 10000):
    all_combos = list(itertools.product(PLANETS, SIGNS, HOUSES, ASPECTS))
    random.shuffle(all_combos)
    data = {}
    for i, (p, s, h, a) in enumerate(all_combos[:limit]):
        key = f"{p}_{s}_{h}_{a}_{i+1}"
        data[key] = make_sentence(category, p, s, h, a)
    print(f"✅ {category}.json 생성 ({len(data):,} rules)")
    return data

def save_rules():
    base_path = r"C:\dev\saju-astro-chat\backend_ai\data\graph\rules\astro"
    os.makedirs(base_path, exist_ok=True)
    for cat in CATEGORIES:
        data = build_rules(cat, 10000)
        path = os.path.join(base_path, f"{cat}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"💾 저장 완료 → {path}")

if __name__ == "__main__":
    print("🪐 Astrology Ruleset Expert Version 생성 시작...")
    save_rules()
    print("🎉 모든 Astro 룰 파일 생성 완료!")