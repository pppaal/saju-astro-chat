#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Persona Data Generator - Jung & Stoic
"""

import json
import csv
import os
import sys
from itertools import product

# Windows 인코딩 문제 해결
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# =====================================================================
# 기본 데이터 정의
# =====================================================================

# 점성술 기본 요소
PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]
SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]
HOUSES = list(range(1, 13))  # 1-12하우스
ASPECTS = ["conjunction", "opposition", "trine", "square", "sextile", "quincunx", "semisextile", "semisquare", "sesquisquare"]

# Jung 원형
JUNG_ARCHETYPES = [
    "Hero", "Mother", "Father", "Wise Old Man", "Trickster", "Anima", "Animus",
    "Shadow", "Self", "Persona", "Child", "Maiden"
]

# Jung 프로세스
JUNG_PROCESSES = [
    "Individuation", "Integration", "Projection", "Confrontation", "Transcendence"
]

# Stoic 덕목
STOIC_VIRTUES = ["Wisdom", "Courage", "Temperance", "Justice"]

# Stoic 실천
STOIC_PRACTICES = [
    "Memento Mori", "Amor Fati", "Premeditatio Malorum", "Negative Visualization",
    "View from Above", "Dichotomy of Control"
]

# 사주 오행
WUXING = ["木 (Wood)", "火 (Fire)", "土 (Earth)", "金 (Metal)", "水 (Water)"]

# 사주 십신
SIPSIN = ["比肩", "劫財", "食神", "傷官", "偏財", "正財", "七殺", "正官", "偏印", "正印"]

# =====================================================================
# Jung 페르소나 대량 생성
# =====================================================================

def generate_jung_rules():
    """Jung 페르소나 룰 생성 (5,000+ 개)"""
    rules = {
        "meta": {
            "persona": "The Analyst (분석관)",
            "philosophy": "Carl Jung - Analytical Psychology",
            "tone": "깊이 있는 심리 분석, 원형과 무의식 탐구",
            "generated": "auto",
            "count": 0
        }
    }

    rule_id = 1

    # 1. 행성 × 사인 × 하우스 × 원형 조합
    print("[Jung] 행성-사인-하우스-원형 조합 생성 중...")
    for planet, sign, house, archetype in product(PLANETS, SIGNS, HOUSES, JUNG_ARCHETYPES):
        key = f"rule_{rule_id}"
        rules[key] = {
            "when": [planet.lower(), sign.lower(), f"house {house}", archetype.lower()],
            "text": f"{planet}이 {sign}자리 {house}하우스에 있는 이 배치는 {archetype} 원형의 에너지를 강하게 활성화합니다. Jung은 '{archetype}'를 통해 우리 내면의 보편적 패턴을 발견할 수 있다고 했습니다.",
            "weight": 3,
            "archetype": archetype,
            "planet": planet,
            "sign": sign,
            "house": house
        }
        rule_id += 1

    # 2. 행성 측면 × 그림자 작업
    print("[Jung] 행성 측면-그림자 작업 생성 중...")
    for planet1, planet2, aspect in product(PLANETS, PLANETS, ASPECTS):
        if planet1 == planet2:
            continue
        key = f"rule_{rule_id}"

        difficulty_level = "높은" if aspect in ["opposition", "square"] else "중간"
        shadow_depth = "깊은" if aspect in ["opposition", "square", "quincunx"] else "표면적"

        rules[key] = {
            "when": [planet1.lower(), planet2.lower(), aspect],
            "text": f"{planet1}과 {planet2}의 {aspect} 측면은 {shadow_depth} 그림자(Shadow) 작업을 요청합니다. 이 긴장은 당신이 통합해야 할 억압된 에너지입니다. Jung은 '그림자를 의식으로 끌어올리는 것'이 개성화의 핵심이라 했습니다.",
            "weight": 5 if aspect in ["opposition", "square"] else 3,
            "process": "Shadow Work",
            "difficulty": difficulty_level
        }
        rule_id += 1

    # 3. 원형 × 십신 융합 해석
    print("[Jung] 원형-십신 융합 해석 생성 중...")
    for archetype, sipsin in product(JUNG_ARCHETYPES, SIPSIN):
        key = f"rule_{rule_id}"
        rules[key] = {
            "when": [archetype.lower(), sipsin],
            "text": f"사주의 {sipsin}과 Jung의 {archetype} 원형이 만났습니다. 동양과 서양 심리학의 교차점에서, 당신은 {archetype}의 에너지를 {sipsin}의 방식으로 표현합니다.",
            "weight": 4,
            "cross_culture": True,
            "archetype": archetype,
            "sipsin": sipsin
        }
        rule_id += 1

    # 4. 원형 × 오행 융합
    print("[Jung] 원형-오행 융합 해석 생성 중...")
    for archetype, wuxing in product(JUNG_ARCHETYPES, WUXING):
        key = f"rule_{rule_id}"
        element_kr = wuxing.split()[0]
        element_en = wuxing.split()[1].strip("()")

        rules[key] = {
            "when": [archetype.lower(), element_kr, element_en.lower()],
            "text": f"{element_kr} 오행의 에너지가 {archetype} 원형과 공명합니다. {element_en.capitalize()} 요소는 {archetype}의 본질적 성격을 강화시킵니다.",
            "weight": 3,
            "cross_culture": True,
            "wuxing": wuxing
        }
        rule_id += 1

    # 5. 개성화 과정 × 하우스
    print("[Jung] 개성화 과정-하우스 해석 생성 중...")
    for process, house in product(JUNG_PROCESSES, HOUSES):
        key = f"rule_{rule_id}"
        rules[key] = {
            "when": [process.lower(), f"house {house}"],
            "text": f"{house}하우스에서 {process} 과정이 진행되고 있습니다. Jung은 개성화를 '진정한 자기 자신이 되는 평생의 여정'이라 정의했습니다. 이 영역에서 당신은 내면의 통합을 경험하게 됩니다.",
            "weight": 5,
            "process": process,
            "house": house
        }
        rule_id += 1

    # 6. 행성 × 원형 × 측면 (상세)
    print("[Jung] 행성-원형-측면 상세 해석 생성 중...")
    for planet, archetype, aspect in product(PLANETS, JUNG_ARCHETYPES, ASPECTS):
        key = f"rule_{rule_id}"

        harmony = "조화로운" if aspect in ["trine", "sextile"] else "도전적인"
        growth = "자연스러운" if aspect in ["trine", "sextile"] else "어렵지만 강력한"

        rules[key] = {
            "when": [planet.lower(), archetype.lower(), aspect],
            "text": f"{planet}이 {aspect} 측면을 통해 {archetype} 원형과 {harmony} 관계를 맺습니다. 이것은 {growth} 성장의 기회입니다.",
            "weight": 4,
            "harmony_type": harmony
        }
        rule_id += 1

    rules["meta"]["count"] = rule_id - 1
    print(f"[Jung] 총 {rule_id - 1}개 룰 생성 완료!")
    return rules


def generate_stoic_rules():
    """Stoic 페르소나 룰 생성 (5,000+ 개)"""
    rules = {
        "meta": {
            "persona": "The Strategist (전략가)",
            "philosophy": "Stoicism - Marcus Aurelius, Epictetus, Seneca",
            "tone": "실용적 지혜, 통제 가능한 것에 집중, 덕과 내적 평온",
            "generated": "auto",
            "count": 0
        }
    }

    rule_id = 1

    # 1. 덕목 × 행성 × 하우스
    print("[Stoic] 덕목-행성-하우스 조합 생성 중...")
    for virtue, planet, house in product(STOIC_VIRTUES, PLANETS, HOUSES):
        key = f"rule_{rule_id}"

        virtue_desc = {
            "Wisdom": "올바른 판단",
            "Courage": "두려움 속 행동",
            "Temperance": "욕망의 조절",
            "Justice": "타인에 대한 올바름"
        }

        rules[key] = {
            "when": [virtue.lower(), planet.lower(), f"house {house}"],
            "text": f"{planet}이 {house}하우스에서 {virtue}(덕)을 요청합니다. 스토아 철학자들은 '{virtue_desc[virtue]}'을 최고의 선으로 봤습니다. 외부 성공이 아니라 이 덕을 실천하는 것이 진정한 목표입니다.",
            "weight": 4,
            "virtue": virtue,
            "planet": planet,
            "house": house
        }
        rule_id += 1

    # 2. 실천법 × 측면
    print("[Stoic] 실천법-측면 조합 생성 중...")
    for practice, aspect in product(STOIC_PRACTICES, ASPECTS):
        key = f"rule_{rule_id}"

        difficulty = "쉬운" if aspect in ["trine", "sextile"] else "어려운"

        rules[key] = {
            "when": [practice.lower().replace(" ", "_"), aspect],
            "text": f"{aspect} 측면은 {practice} 실천을 {difficulty} 방식으로 요청합니다. 스토아 철학은 일상의 훈련을 강조합니다. 매일 이 원칙을 적용하세요.",
            "weight": 3,
            "practice": practice,
            "difficulty": difficulty
        }
        rule_id += 1

    # 3. 통제 이분법 × 하우스 × 행성
    print("[Stoic] 통제 이분법 적용 생성 중...")
    for house, planet in product(HOUSES, PLANETS):
        key = f"rule_{rule_id}"

        controllable = house in [1, 3, 5, 6, 9]  # 개인적 하우스

        if controllable:
            text = f"{house}하우스의 {planet}은 당신이 **통제할 수 있는** 영역입니다. Epictetus는 '우리의 의견, 욕구, 혐오, 행동'만이 우리 통제 하에 있다고 했습니다. 여기서는 직접 행동하세요."
        else:
            text = f"{house}하우스의 {planet}은 **통제할 수 없는** 영역의 영향을 받습니다. 스토아는 '통제 불가능한 것에 대해서는 기대를 버리라'고 가르칩니다. 결과가 아니라 당신의 반응에 집중하세요."

        rules[key] = {
            "when": ["dichotomy", planet.lower(), f"house {house}"],
            "text": text,
            "weight": 5,
            "controllable": controllable,
            "planet": planet,
            "house": house
        }
        rule_id += 1

    # 4. Memento Mori × Saturn/Pluto 위치
    print("[Stoic] Memento Mori 해석 생성 중...")
    for planet in ["Saturn", "Pluto"]:
        for house, sign in product(HOUSES, SIGNS):
            key = f"rule_{rule_id}"
            rules[key] = {
                "when": ["memento_mori", planet.lower(), sign.lower(), f"house {house}"],
                "text": f"{planet}이 {sign}자리 {house}하우스에 있습니다. 메멘토 모리(Memento Mori) - 죽음을 기억하라. Marcus Aurelius는 '매일을 마지막 날처럼 살라'고 했습니다. {house}하우스의 영역에서 이 교훈을 적용하세요.",
                "weight": 5,
                "practice": "Memento Mori",
                "planet": planet
            }
            rule_id += 1

    # 5. 덕목 × 십신 융합
    print("[Stoic] 덕목-십신 융합 해석 생성 중...")
    for virtue, sipsin in product(STOIC_VIRTUES, SIPSIN):
        key = f"rule_{rule_id}"
        rules[key] = {
            "when": [virtue.lower(), sipsin],
            "text": f"사주의 {sipsin}이 스토아의 {virtue} 덕과 만났습니다. 동양의 사주와 서양의 스토아 철학 모두 '어떻게 살 것인가'를 묻습니다. {sipsin}의 에너지를 {virtue}로 승화시키세요.",
            "weight": 4,
            "cross_culture": True,
            "virtue": virtue,
            "sipsin": sipsin
        }
        rule_id += 1

    # 6. 덕목 × 오행
    print("[Stoic] 덕목-오행 융합 해석 생성 중...")
    for virtue, wuxing in product(STOIC_VIRTUES, WUXING):
        key = f"rule_{rule_id}"
        element_kr = wuxing.split()[0]
        element_en = wuxing.split()[1].strip("()")

        rules[key] = {
            "when": [virtue.lower(), element_kr, element_en.lower()],
            "text": f"{element_kr} 오행과 {virtue} 덕이 결합됩니다. {element_en.capitalize()}의 성질이 스토아의 {virtue}를 강화합니다. 자연의 질서(Logos)에 따라 사세요.",
            "weight": 3,
            "cross_culture": True,
            "wuxing": wuxing
        }
        rule_id += 1

    # 7. 장애물이 곧 길 × 어려운 측면
    print("[Stoic] 장애물이 곧 길 해석 생성 중...")
    for planet1, planet2, aspect in product(PLANETS, PLANETS, ["opposition", "square", "quincunx"]):
        if planet1 == planet2:
            continue
        key = f"rule_{rule_id}"
        rules[key] = {
            "when": ["obstacle", planet1.lower(), planet2.lower(), aspect],
            "text": f"{planet1}과 {planet2}의 {aspect}은 장애물처럼 보입니다. 하지만 Marcus Aurelius는 '장애물이 곧 길이다(The obstacle is the way)'라고 했습니다. 이 어려움이 당신을 더 강하게 만들 것입니다.",
            "weight": 5,
            "practice": "Obstacle as Way",
            "aspect": aspect
        }
        rule_id += 1

    rules["meta"]["count"] = rule_id - 1
    print(f"[Stoic] 총 {rule_id - 1}개 룰 생성 완료!")
    return rules


def generate_jung_nodes():
    """Jung 노드 대량 생성 (CSV)"""
    nodes = []

    # 1. 원형 변형 (각 원형의 세부 변형)
    for archetype in JUNG_ARCHETYPES:
        for variant in ["positive", "negative", "integrated", "shadow", "projected"]:
            nodes.append({
                "id": f"{archetype.lower().replace(' ', '_')}_{variant}",
                "label": f"{archetype} ({variant})",
                "name": f"{archetype} - {variant.capitalize()}",
                "desc": f"{archetype} 원형의 {variant} 측면",
                "category": "jung_archetype_variant",
                "element": "air"
            })

    # 2. 원형 × 행성 조합
    for archetype, planet in product(JUNG_ARCHETYPES, PLANETS):
        nodes.append({
            "id": f"{archetype.lower().replace(' ', '_')}_{planet.lower()}",
            "label": f"{archetype} in {planet}",
            "name": f"{archetype} 원형 - {planet} 표현",
            "desc": f"{planet}을 통해 표현되는 {archetype} 원형",
            "category": "jung_planet_archetype",
            "element": "fire"
        })

    # 3. 원형 × 사인 조합
    for archetype, sign in product(JUNG_ARCHETYPES, SIGNS):
        nodes.append({
            "id": f"{archetype.lower().replace(' ', '_')}_{sign.lower()}",
            "label": f"{archetype} in {sign}",
            "name": f"{archetype} in {sign}",
            "desc": f"{sign} 에너지로 표현되는 {archetype}",
            "category": "jung_sign_archetype",
            "element": "water"
        })

    print(f"[Jung Nodes] 총 {len(nodes)}개 노드 생성!")
    return nodes


def generate_stoic_nodes():
    """Stoic 노드 대량 생성 (CSV)"""
    nodes = []

    # 1. 덕목 × 행성
    for virtue, planet in product(STOIC_VIRTUES, PLANETS):
        nodes.append({
            "id": f"{virtue.lower()}_{planet.lower()}",
            "label": f"{virtue} through {planet}",
            "name": f"{virtue} 덕 - {planet} 실천",
            "desc": f"{planet}을 통해 실천하는 {virtue}",
            "category": "stoic_virtue_planet",
            "element": "earth"
        })

    # 2. 실천법 × 하우스
    for practice, house in product(STOIC_PRACTICES, HOUSES):
        nodes.append({
            "id": f"{practice.lower().replace(' ', '_')}_house{house}",
            "label": f"{practice} in House {house}",
            "name": f"{practice} - {house}하우스",
            "desc": f"{house}하우스에서 실천하는 {practice}",
            "category": "stoic_practice_house",
            "element": "air"
        })

    # 3. 덕목 × 사인
    for virtue, sign in product(STOIC_VIRTUES, SIGNS):
        nodes.append({
            "id": f"{virtue.lower()}_{sign.lower()}_sign",
            "label": f"{virtue} in {sign}",
            "name": f"{virtue} in {sign}",
            "desc": f"{sign} 방식으로 표현되는 {virtue}",
            "category": "stoic_virtue_sign",
            "element": "fire"
        })

    print(f"[Stoic Nodes] 총 {len(nodes)}개 노드 생성!")
    return nodes


# =====================================================================
# 파일 저장
# =====================================================================

def save_json(data, filename):
    """JSON 파일 저장"""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"✅ 저장 완료: {filename}")


def save_csv(data, filename):
    """CSV 파일 저장"""
    if not data:
        return

    with open(filename, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
    print(f"✅ 저장 완료: {filename}")


# =====================================================================
# 메인 실행
# =====================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("Persona Data Generator - Jung & Stoic")
    print("=" * 70)

    # 경로 설정
    script_dir = os.path.dirname(os.path.abspath(__file__))
    rules_dir = os.path.join(script_dir, "..", "rules", "persona")
    nodes_dir = os.path.join(script_dir, "nodes")

    os.makedirs(rules_dir, exist_ok=True)
    os.makedirs(nodes_dir, exist_ok=True)

    # Jung 데이터 생성
    print("\n" + "=" * 70)
    print("[JUNG] 데이터 생성 중...")
    print("=" * 70)
    jung_rules = generate_jung_rules()
    jung_nodes = generate_jung_nodes()

    # Stoic 데이터 생성
    print("\n" + "=" * 70)
    print("[STOIC] 데이터 생성 중...")
    print("=" * 70)
    stoic_rules = generate_stoic_rules()
    stoic_nodes = generate_stoic_nodes()

    # 파일 저장
    print("\n" + "=" * 70)
    print("[SAVE] 파일 저장 중...")
    print("=" * 70)

    save_json(jung_rules, os.path.join(rules_dir, "analyst_jung_generated.json"))
    save_json(stoic_rules, os.path.join(rules_dir, "strategist_stoic_generated.json"))

    save_csv(jung_nodes, os.path.join(nodes_dir, "nodes_persona_jung_generated.csv"))
    save_csv(stoic_nodes, os.path.join(nodes_dir, "nodes_persona_stoic_generated.csv"))

    # 통계 출력
    print("\n" + "=" * 70)
    print("[STATS] 생성 통계")
    print("=" * 70)
    print(f"Jung Rules:    {jung_rules['meta']['count']:,}개")
    print(f"Jung Nodes:    {len(jung_nodes):,}개")
    print(f"Stoic Rules:   {stoic_rules['meta']['count']:,}개")
    print(f"Stoic Nodes:   {len(stoic_nodes):,}개")
    print("-" * 70)
    print(f"총 Rules:      {jung_rules['meta']['count'] + stoic_rules['meta']['count']:,}개")
    print(f"총 Nodes:      {len(jung_nodes) + len(stoic_nodes):,}개")
    print(f"**총 데이터:    {jung_rules['meta']['count'] + stoic_rules['meta']['count'] + len(jung_nodes) + len(stoic_nodes):,}개**")
    print("=" * 70)
    print("[OK] 모든 데이터 생성 완료!")
