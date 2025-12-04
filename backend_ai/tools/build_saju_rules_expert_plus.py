# -*- coding: utf-8 -*-
"""
사주팔자 룰 자동 생성기 (index.ts 계산 결과 기반 전문가 통합 버전)
- 원국(천간/지지/십성) + 관계 + 신살 + 운세 5개 축 반영
- 테마별 10,000개씩 총 9개 JSON 생성
- 저장 경로: C:\dev\saju-astro-chat\backend_ai\data\graph\rules\saju
"""

import os
import json
import random
import itertools

# ------------------------------
#  ⚙️ 구성 값 (index.ts의 결과 구조 축)
# ------------------------------
CHEONGAN = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"]
JIJI     = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"]
SIBSUNG  = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"]
RELATION = ["합", "충", "형", "해", "파", "공망", "생", "극", "제"]
CYCLES   = ["대운", "세운", "월운", "일운"]
SHINSAL  = ["홍염", "천덕귀인", "문창귀인", "월덕귀인", "현침", "도화", "백호", "겁살", "천살", "지살"]

# ------------------------------
#  테마 정의 (index.ts의 해석 도메인)
# ------------------------------
CATEGORIES = {
    "career":   "직업/사회적 명예·리더십·성과·현실성",
    "love":     "연애/인연/관계/감정 흐름",
    "family":   "가정/부모형제/정서적 유대",
    "health":   "건강/체력/회복력/생활 리듬",
    "life_path":"인생방향/성장/운명의 흐름",
    "daily":    "일상/감정 밸런스/즉각적 변화",
    "monthly":  "월간 계획/주기적 전환/실행력",
    "new_year": "신년의 성취테마 및 변화에 대한 통찰",
    "next_year":"내년 운의 확장과 미래 방향"
}

# ------------------------------
#  패턴 문장 세트
# ------------------------------
PATTERNS = [
    "{stem}{branch} 일주의 {sibsin}이(가) {cycle}의 흐름에서 두드러지며, {relation} 작용과 함께 {shinsal} 신살의 영향을 받습니다.",
    "{stem}{branch}의 {sibsin} 기운이 {cycle} 운에서 활성화되어 {relation} 관계를 통해 {shinsal} 에너지가 드러납니다.",
    "{stem}{branch} 구조는 {sibsin}이(가) 중심이 되어 {relation}의 흐름 속에서 {shinsal}의 작용이 강화됩니다.",
    "{stem}{branch} 일주는 {cycle} 시기 {relation}으로 인한 변화 속에서 {sibsin} 에너지가 현실적으로 드러나며, {shinsal}의 상징적 영향력이 함께 작동합니다.",
    "{stem}{branch}의 조합은 {sibsin}과 {shinsal}의 기운이 조화를 이루어 {cycle} 운에서 {relation} 패턴이 드러납니다."
]

# ------------------------------
#  문장 생성 함수
# ------------------------------
def make_sentence(category, stem, branch, sibsin, relation, cycle, shinsal):
    desc = CATEGORIES[category]
    pattern = random.choice(PATTERNS)
    text = pattern.format(
        stem=stem, branch=branch, sibsin=sibsin,
        relation=relation, cycle=cycle, shinsal=shinsal
    )
    summary = f"[{desc}] | {text}"
    positive = f"{stem}{branch} 조합의 {sibsin}과 {shinsal} 기운은 긍정적으로 작용하여 {desc}에서 발전을 돕습니다."
    caution = f"{relation} 영향이 과하면 {cycle} 흐름 내 불균형이 생길 수 있습니다."
    return {"summary": summary, "positive": positive, "caution": caution}

# ------------------------------
#  룰 구축 로직
# ------------------------------
def build_rules(category: str, limit: int = 10000):
    all_combos = list(itertools.product(CHEONGAN, JIJI, SIBSUNG, RELATION, CYCLES, SHINSAL))
    random.shuffle(all_combos)
    data = {}
    for i, (g,b,s,r,c,sh) in enumerate(all_combos[:limit]):
        key = f"{g}{b}_{s}_{r}_{c}_{sh}_{i+1}"
        data[key] = make_sentence(category, g,b,s,r,c,sh)
    print(f"✅ {category}.json 생성 ({len(data):,} rules)")
    return data

# ------------------------------
#  파일 저장
# ------------------------------
def save_rules():
    base_path = r"C:\dev\saju-astro-chat\backend_ai\data\graph\rules\saju"
    os.makedirs(base_path, exist_ok=True)
    for cat in CATEGORIES:
        data = build_rules(cat, 10000)
        path = os.path.join(base_path, f"{cat}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"💾 저장 완료 → {path}")

# ------------------------------
#  실행
# ------------------------------
if __name__ == "__main__":
    print("🔮 사주팔자 전문가용 룰 세트 생성 시작...")
    save_rules()
    print("🎉 모든 saju 룰 파일 생성 완료!")