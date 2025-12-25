#!/usr/bin/env python3
"""
FunInsights.tsx 파일을 기능별로 분리하는 스크립트
5289 라인 -> 여러 파일로 분할
"""

import re

# 원본 파일 읽기
with open('src/components/destiny-map/FunInsights.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# ============================================================
# 1. 데이터 파일들 추출
# ============================================================

# elementTraits 추출
element_traits_match = re.search(
    r'const elementTraits.*?\n\};',
    content,
    re.DOTALL
)
if element_traits_match:
    with open('src/components/destiny-map/fun-insights/data/elementTraits.ts', 'w', encoding='utf-8') as f:
        f.write(f"export {element_traits_match.group()}\n")
    print("[OK] Created elementTraits.ts")

# dayMasterData 추출
day_master_match = re.search(
    r'const dayMasterData: Record<string.*?\n\};',
    content,
    re.DOTALL
)
if day_master_match:
    with open('src/components/destiny-map/fun-insights/data/dayMasterData.ts', 'w', encoding='utf-8') as f:
        f.write(f"export {day_master_match.group()}\n")
    print("[OK] Created dayMasterData.ts")

# zodiacData 추출
zodiac_match = re.search(
    r'const zodiacData: Record<string.*?\n\};',
    content,
    re.DOTALL
)
if zodiac_match:
    with open('src/components/destiny-map/fun-insights/data/zodiacData.ts', 'w', encoding='utf-8') as f:
        f.write(f"export {zodiac_match.group()}\n")
    print("[OK] Created zodiacData.ts")

# constants (elementKeyMap, tianGanMap, elementRelations, etc.)
constants_content = """export const elementKeyMap: Record<string, string> = {
  "목": "wood", "화": "fire", "토": "earth", "금": "metal", "수": "water",
  "木": "wood", "火": "fire", "土": "earth", "金": "metal", "水": "water",
};

export const tianGanMap: Record<string, string> = {
  "甲": "갑", "乙": "을", "丙": "병", "丁": "정", "戊": "무",
  "己": "기", "庚": "경", "辛": "신", "壬": "임", "癸": "계",
  "Gab": "갑", "Eul": "을", "Byung": "병", "Jung": "정", "Mu": "무",
  "Gi": "기", "Gyung": "경", "Shin": "신", "Im": "임", "Gye": "계",
};

export const elementRelations = {
  generates: { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" } as Record<string, string>,
  controls: { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" } as Record<string, string>,
  supportedBy: { wood: "water", fire: "wood", earth: "fire", metal: "earth", water: "metal" } as Record<string, string>,
};

export const astroToSaju: Record<string, string> = { fire: "fire", earth: "earth", air: "metal", water: "water" };

export const monthElements: Record<number, string> = {
  1: "water", 2: "wood", 3: "wood", 4: "earth", 5: "fire", 6: "fire",
  7: "earth", 8: "metal", 9: "metal", 10: "earth", 11: "water", 12: "water"
};
"""

with open('src/components/destiny-map/fun-insights/data/constants.ts', 'w', encoding='utf-8') as f:
    f.write(constants_content)
print("[OK] Created constants.ts")

# index.ts for data
data_index = """export * from './elementTraits';
export * from './dayMasterData';
export * from './zodiacData';
export * from './constants';
"""

with open('src/components/destiny-map/fun-insights/data/index.ts', 'w', encoding='utf-8') as f:
    f.write(data_index)
print("[OK] Created data/index.ts")

print("\n[SUCCESS] Data files created! Next: Extract analyzer functions")
