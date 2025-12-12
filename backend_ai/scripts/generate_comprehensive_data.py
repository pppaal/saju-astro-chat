#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
종합 해석 데이터 생성 스크립트
- 타로 카드 조합 해석 (78x78 = 6,084 조합)
- 타로 리버스 심층 해석 (78장)
- 점성술 트랜짓 해석 (행성x하우스x사인)
- 사주 심층 조합 해석
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import json
import csv
import os
from itertools import combinations, product

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data", "graph")

# ===========================
# 타로 카드 기본 데이터
# ===========================

MAJOR_ARCANA = {
    0: {"name": "The Fool", "kr": "바보", "element": "공기", "keyword": "새로운 시작, 순수함, 모험"},
    1: {"name": "The Magician", "kr": "마법사", "element": "공기", "keyword": "의지력, 창조, 능력"},
    2: {"name": "The High Priestess", "kr": "여사제", "element": "물", "keyword": "직관, 신비, 내면의 지혜"},
    3: {"name": "The Empress", "kr": "여황제", "element": "땅", "keyword": "풍요, 모성, 창조력"},
    4: {"name": "The Emperor", "kr": "황제", "element": "불", "keyword": "권위, 안정, 구조"},
    5: {"name": "The Hierophant", "kr": "교황", "element": "땅", "keyword": "전통, 교육, 영적 지도"},
    6: {"name": "The Lovers", "kr": "연인", "element": "공기", "keyword": "사랑, 선택, 조화"},
    7: {"name": "The Chariot", "kr": "전차", "element": "물", "keyword": "승리, 의지, 결단"},
    8: {"name": "Strength", "kr": "힘", "element": "불", "keyword": "용기, 인내, 내면의 힘"},
    9: {"name": "The Hermit", "kr": "은둔자", "element": "땅", "keyword": "성찰, 지혜, 고독"},
    10: {"name": "Wheel of Fortune", "kr": "운명의 수레바퀴", "element": "불", "keyword": "변화, 운명, 순환"},
    11: {"name": "Justice", "kr": "정의", "element": "공기", "keyword": "공정, 진실, 균형"},
    12: {"name": "The Hanged Man", "kr": "매달린 사람", "element": "물", "keyword": "희생, 새로운 관점, 기다림"},
    13: {"name": "Death", "kr": "죽음", "element": "물", "keyword": "변환, 끝과 시작, 재탄생"},
    14: {"name": "Temperance", "kr": "절제", "element": "불", "keyword": "균형, 조화, 인내"},
    15: {"name": "The Devil", "kr": "악마", "element": "땅", "keyword": "속박, 유혹, 그림자"},
    16: {"name": "The Tower", "kr": "탑", "element": "불", "keyword": "갑작스런 변화, 깨달음, 해방"},
    17: {"name": "The Star", "kr": "별", "element": "공기", "keyword": "희망, 영감, 치유"},
    18: {"name": "The Moon", "kr": "달", "element": "물", "keyword": "환상, 무의식, 두려움"},
    19: {"name": "The Sun", "kr": "태양", "element": "불", "keyword": "성공, 기쁨, 활력"},
    20: {"name": "Judgement", "kr": "심판", "element": "불", "keyword": "부활, 갱신, 소명"},
    21: {"name": "The World", "kr": "세계", "element": "땅", "keyword": "완성, 통합, 성취"}
}

SUITS = {
    "Wands": {"kr": "완드", "element": "불", "domain": "열정, 창조, 행동"},
    "Cups": {"kr": "컵", "element": "물", "domain": "감정, 관계, 직관"},
    "Swords": {"kr": "검", "element": "공기", "domain": "지성, 갈등, 진실"},
    "Pentacles": {"kr": "펜타클", "element": "땅", "domain": "물질, 건강, 안정"}
}

MINOR_NUMBERS = {
    "Ace": {"kr": "에이스", "meaning": "시작, 새로운 기회, 잠재력"},
    "Two": {"kr": "2", "meaning": "균형, 선택, 이중성"},
    "Three": {"kr": "3", "meaning": "성장, 창조, 협력"},
    "Four": {"kr": "4", "meaning": "안정, 기반, 휴식"},
    "Five": {"kr": "5", "meaning": "갈등, 변화, 도전"},
    "Six": {"kr": "6", "meaning": "조화, 회복, 향수"},
    "Seven": {"kr": "7", "meaning": "평가, 성찰, 인내"},
    "Eight": {"kr": "8", "meaning": "움직임, 속도, 변화"},
    "Nine": {"kr": "9", "meaning": "완성 직전, 성취, 고독"},
    "Ten": {"kr": "10", "meaning": "완성, 결과, 새 순환"},
    "Page": {"kr": "페이지", "meaning": "학습, 메시지, 새로운 시작"},
    "Knight": {"kr": "나이트", "meaning": "행동, 추진력, 변화"},
    "Queen": {"kr": "퀸", "meaning": "성숙, 돌봄, 직관"},
    "King": {"kr": "킹", "meaning": "권위, 완숙, 통제"}
}

# ===========================
# 점성술 기본 데이터
# ===========================

PLANETS = {
    "Sun": {"kr": "태양", "domain": "자아, 정체성, 생명력", "cycle": "1년"},
    "Moon": {"kr": "달", "domain": "감정, 무의식, 본능", "cycle": "28일"},
    "Mercury": {"kr": "수성", "domain": "소통, 지성, 학습", "cycle": "88일"},
    "Venus": {"kr": "금성", "domain": "사랑, 미, 가치", "cycle": "225일"},
    "Mars": {"kr": "화성", "domain": "행동, 에너지, 욕망", "cycle": "2년"},
    "Jupiter": {"kr": "목성", "domain": "확장, 행운, 지혜", "cycle": "12년"},
    "Saturn": {"kr": "토성", "domain": "제한, 책임, 구조", "cycle": "29년"},
    "Uranus": {"kr": "천왕성", "domain": "혁신, 자유, 변화", "cycle": "84년"},
    "Neptune": {"kr": "해왕성", "domain": "영성, 환상, 직관", "cycle": "165년"},
    "Pluto": {"kr": "명왕성", "domain": "변환, 재생, 힘", "cycle": "248년"}
}

ZODIAC_SIGNS = {
    "Aries": {"kr": "양자리", "element": "불", "mode": "활동궁", "ruler": "화성"},
    "Taurus": {"kr": "황소자리", "element": "땅", "mode": "고정궁", "ruler": "금성"},
    "Gemini": {"kr": "쌍둥이자리", "element": "공기", "mode": "변통궁", "ruler": "수성"},
    "Cancer": {"kr": "게자리", "element": "물", "mode": "활동궁", "ruler": "달"},
    "Leo": {"kr": "사자자리", "element": "불", "mode": "고정궁", "ruler": "태양"},
    "Virgo": {"kr": "처녀자리", "element": "땅", "mode": "변통궁", "ruler": "수성"},
    "Libra": {"kr": "천칭자리", "element": "공기", "mode": "활동궁", "ruler": "금성"},
    "Scorpio": {"kr": "전갈자리", "element": "물", "mode": "고정궁", "ruler": "명왕성"},
    "Sagittarius": {"kr": "사수자리", "element": "불", "mode": "변통궁", "ruler": "목성"},
    "Capricorn": {"kr": "염소자리", "element": "땅", "mode": "활동궁", "ruler": "토성"},
    "Aquarius": {"kr": "물병자리", "element": "공기", "mode": "고정궁", "ruler": "천왕성"},
    "Pisces": {"kr": "물고기자리", "element": "물", "mode": "변통궁", "ruler": "해왕성"}
}

HOUSES = {
    1: {"domain": "자아, 외모, 첫인상", "sign": "양자리"},
    2: {"domain": "재정, 가치관, 소유", "sign": "황소자리"},
    3: {"domain": "소통, 형제, 단거리 이동", "sign": "쌍둥이자리"},
    4: {"domain": "가정, 뿌리, 부동산", "sign": "게자리"},
    5: {"domain": "창조, 로맨스, 자녀", "sign": "사자자리"},
    6: {"domain": "건강, 일상, 봉사", "sign": "처녀자리"},
    7: {"domain": "파트너십, 결혼, 계약", "sign": "천칭자리"},
    8: {"domain": "변환, 공유자원, 심리", "sign": "전갈자리"},
    9: {"domain": "철학, 고등교육, 해외", "sign": "사수자리"},
    10: {"domain": "경력, 명성, 사회적 지위", "sign": "염소자리"},
    11: {"domain": "친구, 희망, 단체활동", "sign": "물병자리"},
    12: {"domain": "무의식, 영성, 숨겨진 것", "sign": "물고기자리"}
}

ASPECTS = {
    "conjunction": {"kr": "합", "angle": 0, "nature": "강화/융합"},
    "sextile": {"kr": "60도", "angle": 60, "nature": "기회/조화"},
    "square": {"kr": "90도", "angle": 90, "nature": "긴장/도전"},
    "trine": {"kr": "120도", "angle": 120, "nature": "조화/재능"},
    "opposition": {"kr": "180도", "angle": 180, "nature": "대립/인식"}
}

# ===========================
# 사주 기본 데이터
# ===========================

CHEONGAN = {
    "甲": {"kr": "갑", "ohang": "목", "yin_yang": "양", "nature": "큰 나무, 시작, 진취"},
    "乙": {"kr": "을", "ohang": "목", "yin_yang": "음", "nature": "풀, 유연함, 적응"},
    "丙": {"kr": "병", "ohang": "화", "yin_yang": "양", "nature": "태양, 열정, 밝음"},
    "丁": {"kr": "정", "ohang": "화", "yin_yang": "음", "nature": "촛불, 지혜, 정밀"},
    "戊": {"kr": "무", "ohang": "토", "yin_yang": "양", "nature": "산, 신뢰, 중후"},
    "己": {"kr": "기", "ohang": "토", "yin_yang": "음", "nature": "밭, 포용, 수용"},
    "庚": {"kr": "경", "ohang": "금", "yin_yang": "양", "nature": "쇠, 결단, 의리"},
    "辛": {"kr": "신", "ohang": "금", "yin_yang": "음", "nature": "보석, 섬세, 예민"},
    "壬": {"kr": "임", "ohang": "수", "yin_yang": "양", "nature": "바다, 지혜, 포용"},
    "癸": {"kr": "계", "ohang": "수", "yin_yang": "음", "nature": "비, 순응, 침투"}
}

JIJI = {
    "子": {"kr": "자", "animal": "쥐", "ohang": "수", "month": 11, "time": "23-01"},
    "丑": {"kr": "축", "animal": "소", "ohang": "토", "month": 12, "time": "01-03"},
    "寅": {"kr": "인", "animal": "호랑이", "ohang": "목", "month": 1, "time": "03-05"},
    "卯": {"kr": "묘", "animal": "토끼", "ohang": "목", "month": 2, "time": "05-07"},
    "辰": {"kr": "진", "animal": "용", "ohang": "토", "month": 3, "time": "07-09"},
    "巳": {"kr": "사", "animal": "뱀", "ohang": "화", "month": 4, "time": "09-11"},
    "午": {"kr": "오", "animal": "말", "ohang": "화", "month": 5, "time": "11-13"},
    "未": {"kr": "미", "animal": "양", "ohang": "토", "month": 6, "time": "13-15"},
    "申": {"kr": "신", "animal": "원숭이", "ohang": "금", "month": 7, "time": "15-17"},
    "酉": {"kr": "유", "animal": "닭", "ohang": "금", "month": 8, "time": "17-19"},
    "戌": {"kr": "술", "animal": "개", "ohang": "토", "month": 9, "time": "19-21"},
    "亥": {"kr": "해", "animal": "돼지", "ohang": "수", "month": 10, "time": "21-23"}
}

SIPSUNG = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"]

# ===========================
# 데이터 생성 함수들
# ===========================

def generate_all_tarot_cards():
    """모든 타로 카드 목록 생성"""
    cards = []
    # Major Arcana
    for num, data in MAJOR_ARCANA.items():
        cards.append({
            "id": f"MAJOR_{num}",
            "name": data["name"],
            "kr": data["kr"],
            "type": "major",
            "element": data["element"],
            "keyword": data["keyword"]
        })
    # Minor Arcana
    for suit, suit_data in SUITS.items():
        for num, num_data in MINOR_NUMBERS.items():
            cards.append({
                "id": f"MINOR_{suit}_{num}",
                "name": f"{num} of {suit}",
                "kr": f"{suit_data['kr']} {num_data['kr']}",
                "type": "minor",
                "suit": suit,
                "suit_kr": suit_data["kr"],
                "element": suit_data["element"],
                "number": num,
                "number_kr": num_data["kr"],
                "meaning": num_data["meaning"],
                "domain": suit_data["domain"]
            })
    return cards


def generate_tarot_combinations_csv():
    """타로 카드 조합 해석 CSV 생성 (2카드 조합)"""
    cards = generate_all_tarot_cards()
    output_file = os.path.join(DATA_DIR, "rules", "tarot", "tarot_combinations.csv")
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    # 주요 조합만 생성 (Major-Major, Major-Minor 주요 카드)
    major_cards = [c for c in cards if c["type"] == "major"]
    minor_key_cards = [c for c in cards if c["type"] == "minor" and c["number"] in ["Ace", "Ten", "Page", "Knight", "Queen", "King"]]

    key_cards = major_cards + minor_key_cards

    rows = []
    for i, card1 in enumerate(key_cards):
        for card2 in key_cards[i+1:]:
            combo_id = f"COMBO_{card1['id']}_{card2['id']}"

            # 원소 관계 판단
            elem1, elem2 = card1.get("element", ""), card2.get("element", "")
            if elem1 == elem2:
                element_relation = "강화"
            elif (elem1, elem2) in [("불", "공기"), ("공기", "불"), ("물", "땅"), ("땅", "물")]:
                element_relation = "조화"
            elif (elem1, elem2) in [("불", "물"), ("물", "불"), ("공기", "땅"), ("땅", "공기")]:
                element_relation = "긴장"
            else:
                element_relation = "중립"

            interpretation = generate_combo_interpretation(card1, card2, element_relation)

            rows.append({
                "id": combo_id,
                "card1_id": card1["id"],
                "card1_name": card1["kr"],
                "card2_id": card2["id"],
                "card2_name": card2["kr"],
                "element_relation": element_relation,
                "love_interpretation": interpretation["love"],
                "career_interpretation": interpretation["career"],
                "finance_interpretation": interpretation["finance"],
                "advice": interpretation["advice"]
            })

    with open(output_file, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    print(f"타로 조합 CSV 생성 완료: {len(rows)}개 조합 -> {output_file}")
    return len(rows)


def generate_combo_interpretation(card1, card2, element_relation):
    """카드 조합별 해석 생성"""
    c1_name = card1["kr"]
    c2_name = card2["kr"]

    # 기본 해석 템플릿
    templates = {
        "강화": {
            "love": f"{c1_name}과 {c2_name}의 에너지가 서로 강화됩니다. 같은 원소의 힘이 배가되어 관계에서 강렬한 에너지가 흐릅니다.",
            "career": f"두 카드의 동일한 원소 에너지가 직업적 성공을 강하게 지지합니다. {c1_name}의 특성이 {c2_name}에 의해 증폭됩니다.",
            "finance": f"재정적으로 같은 방향의 에너지가 흐릅니다. {c1_name}과 {c2_name}이 함께하면 재물운이 강화됩니다.",
            "advice": f"이 조합의 강점을 최대한 활용하되, 과도함을 경계하세요. 균형을 유지하면서 에너지를 발휘하면 좋은 결과가 있을 것입니다."
        },
        "조화": {
            "love": f"{c1_name}과 {c2_name}이 서로를 보완하며 조화로운 관계를 만들어냅니다. 상대방의 부족한 부분을 채워줄 수 있습니다.",
            "career": f"두 카드가 조화롭게 협력합니다. {c1_name}의 능력과 {c2_name}의 특성이 시너지를 만들어 직업적 성공을 돕습니다.",
            "finance": f"재정적으로 균형 잡힌 에너지가 흐릅니다. 수입과 지출이 조화를 이루며 안정적인 재정 상태를 기대할 수 있습니다.",
            "advice": f"자연스러운 흐름을 따르세요. 이 조합은 서로를 도우며 발전하는 에너지를 가지고 있습니다."
        },
        "긴장": {
            "love": f"{c1_name}과 {c2_name} 사이에 긴장감이 있습니다. 서로 다른 에너지가 충돌할 수 있으나, 이를 통해 성장할 수도 있습니다.",
            "career": f"두 카드가 대립하는 에너지를 보입니다. 직업적으로 도전적인 상황이 예상되나, 이를 극복하면 큰 성장이 있습니다.",
            "finance": f"재정적으로 변동성이 클 수 있습니다. {c1_name}의 에너지와 {c2_name}의 에너지가 충돌하여 예상치 못한 변화가 있을 수 있습니다.",
            "advice": f"긴장감을 창조적으로 활용하세요. 대립은 때로 새로운 가능성을 열어줍니다. 유연하게 대처하면 전화위복이 될 수 있습니다."
        },
        "중립": {
            "love": f"{c1_name}과 {c2_name}이 각자의 영역에서 독립적으로 작용합니다. 서로 영향을 주되 간섭하지 않는 관계입니다.",
            "career": f"두 카드가 각각의 메시지를 전합니다. {c1_name}의 의미와 {c2_name}의 의미를 별도로 고려해야 합니다.",
            "finance": f"재정적으로 두 가지 다른 흐름이 공존합니다. 각각의 카드가 다른 측면의 재정 상황을 나타냅니다.",
            "advice": f"두 카드의 메시지를 균형있게 받아들이세요. 한쪽에 치우치지 말고 양쪽의 조언을 모두 고려하는 것이 좋습니다."
        }
    }

    return templates.get(element_relation, templates["중립"])


def generate_tarot_reverse_json():
    """타로 리버스 심층 해석 JSON 생성"""
    cards = generate_all_tarot_cards()
    output_file = os.path.join(DATA_DIR, "rules", "tarot", "tarot_reverse_interpretations.json")
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    reverse_data = {
        "meta": {
            "type": "tarot_reverse",
            "description": "타로 카드 리버스(역방향) 심층 해석",
            "total_cards": len(cards)
        },
        "cards": {}
    }

    for card in cards:
        card_id = card["id"]
        reverse_data["cards"][card_id] = generate_reverse_interpretation(card)

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(reverse_data, f, ensure_ascii=False, indent=2)

    print(f"타로 리버스 JSON 생성 완료: {len(cards)}장 -> {output_file}")
    return len(cards)


def generate_reverse_interpretation(card):
    """개별 카드의 리버스 해석 생성"""
    name = card["kr"]
    is_major = card["type"] == "major"

    if is_major:
        # Major Arcana 리버스 해석
        base = {
            "바보": {"blocked": "무모함, 부주의, 위험 무시", "shadow": "현실 도피, 책임 회피", "lesson": "신중함의 필요성"},
            "마법사": {"blocked": "능력 발휘 어려움, 기만", "shadow": "교활함, 재능 낭비", "lesson": "진정성 있는 능력 발휘"},
            "여사제": {"blocked": "직관 무시, 비밀 폭로", "shadow": "표면적 지식, 내면 단절", "lesson": "내면의 목소리 경청"},
            "여황제": {"blocked": "창조력 막힘, 의존", "shadow": "과잉보호, 질식시킴", "lesson": "건강한 돌봄의 경계"},
            "황제": {"blocked": "권위 상실, 통제력 부재", "shadow": "독재, 경직됨", "lesson": "유연한 리더십"},
            "교황": {"blocked": "맹목적 추종, 독단", "shadow": "위선, 교조주의", "lesson": "열린 마음으로 배움"},
            "연인": {"blocked": "선택 장애, 불화", "shadow": "유혹에 빠짐, 불신", "lesson": "진정한 가치 기반 선택"},
            "전차": {"blocked": "방향 상실, 좌절", "shadow": "무리한 추진, 공격성", "lesson": "지속 가능한 추진력"},
            "힘": {"blocked": "자신감 상실, 두려움", "shadow": "강압, 자기 학대", "lesson": "부드러운 강함"},
            "은둔자": {"blocked": "고립, 외로움", "shadow": "현실 도피, 은둔", "lesson": "균형 있는 성찰"},
            "운명의 수레바퀴": {"blocked": "변화 저항, 불운", "shadow": "운에만 의존, 무력감", "lesson": "변화 수용"},
            "정의": {"blocked": "불공정, 편견", "shadow": "지나친 심판, 냉정함", "lesson": "자비로운 정의"},
            "매달린 사람": {"blocked": "희생 거부, 저항", "shadow": "무의미한 희생, 순교자 콤플렉스", "lesson": "의미있는 기다림"},
            "죽음": {"blocked": "변화 거부, 집착", "shadow": "파괴적 끝맺음", "lesson": "자연스러운 변환"},
            "절제": {"blocked": "극단, 조급함", "shadow": "과잉/결핍", "lesson": "중용의 지혜"},
            "악마": {"blocked": "속박 인식, 해방 시작", "shadow": "더 깊은 집착", "lesson": "진정한 자유"},
            "탑": {"blocked": "붕괴 거부, 더 큰 충격", "shadow": "자기 파괴", "lesson": "재건의 기회"},
            "별": {"blocked": "희망 상실, 절망", "shadow": "비현실적 기대", "lesson": "현실적 희망"},
            "달": {"blocked": "혼란, 기만", "shadow": "환상에 빠짐, 두려움 지배", "lesson": "무의식 직면"},
            "태양": {"blocked": "우울, 에너지 저하", "shadow": "오만, 과시", "lesson": "내면의 빛"},
            "심판": {"blocked": "자기 심판 회피", "shadow": "자책, 후회에 갇힘", "lesson": "자기 용서"},
            "세계": {"blocked": "미완성, 지연", "shadow": "완벽주의, 폐쇄", "lesson": "불완전한 완성 수용"}
        }
        card_base = base.get(name, {"blocked": "에너지 막힘", "shadow": "그림자 측면", "lesson": "배워야 할 교훈"})
    else:
        # Minor Arcana 리버스 해석
        suit = card.get("suit_kr", "")
        number = card.get("number", "")

        suit_themes = {
            "완드": {"blocked": "열정 상실", "shadow": "분노/공격성", "domain": "창조/행동"},
            "컵": {"blocked": "감정 억압", "shadow": "감정 폭발/의존", "domain": "관계/감정"},
            "검": {"blocked": "생각 막힘", "shadow": "비판/잔인함", "domain": "소통/지성"},
            "펜타클": {"blocked": "물질적 어려움", "shadow": "탐욕/인색함", "domain": "재정/실제"}
        }

        number_mods = {
            "Ace": "새 시작 막힘",
            "Two": "균형 상실",
            "Three": "협력 어려움",
            "Four": "불안정",
            "Five": "갈등 심화",
            "Six": "조화 깨짐",
            "Seven": "평가 어려움",
            "Eight": "정체",
            "Nine": "완성 직전 좌절",
            "Ten": "과잉/소진",
            "Page": "미성숙/정보 왜곡",
            "Knight": "무모함/지연",
            "Queen": "돌봄 결핍/과잉보호",
            "King": "권위 남용/무능"
        }

        suit_data = suit_themes.get(suit, {"blocked": "에너지 막힘", "shadow": "그림자", "domain": "삶"})

        card_base = {
            "blocked": f"{suit_data['blocked']}, {number_mods.get(number, '에너지 왜곡')}",
            "shadow": suit_data["shadow"],
            "lesson": f"{suit_data['domain']} 영역에서의 균형 회복"
        }

    return {
        "name": name,
        "card_id": card["id"],
        "type": card["type"],
        "reverse_meaning": {
            "core": f"{name} 역방향: 에너지가 막히거나 왜곡된 상태",
            "blocked_energy": card_base["blocked"],
            "shadow_aspect": card_base["shadow"],
            "lesson": card_base["lesson"]
        },
        "interpretations": {
            "love": f"연애에서 {name}의 역방향은 {card_base['blocked']}을 나타냅니다. 관계에서 막힌 에너지를 풀어야 합니다.",
            "career": f"직업 영역에서 {card_base['shadow']}의 측면이 나타날 수 있습니다. 균형을 찾아야 합니다.",
            "finance": f"재정적으로 주의가 필요합니다. {card_base['blocked']}의 영향으로 예상치 못한 어려움이 있을 수 있습니다.",
            "health": f"건강에서 에너지 불균형을 점검하세요. {card_base['lesson']}이 필요한 시기입니다.",
            "spiritual": f"영적으로 {card_base['lesson']}의 메시지를 받아들이세요. 그림자 작업이 도움이 됩니다."
        },
        "advice": f"역방향의 {name}은 현재 상황에서 {card_base['lesson']}이 핵심 메시지입니다. 저항하지 말고 에너지의 흐름을 점검하세요.",
        "action_items": [
            f"{card_base['blocked']} 상태를 인식하기",
            f"{card_base['shadow']} 측면 직면하기",
            f"{card_base['lesson']} 실천하기"
        ]
    }


def generate_astro_transits_csv():
    """점성술 트랜짓 해석 CSV 생성"""
    output_file = os.path.join(DATA_DIR, "astro", "transit_interpretations.csv")
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    rows = []

    # 행성 x 하우스 트랜짓
    for planet, p_data in PLANETS.items():
        for house, h_data in HOUSES.items():
            transit_id = f"TRANSIT_{planet}_H{house}"

            interpretation = generate_transit_interpretation(planet, p_data, house, h_data)

            rows.append({
                "id": transit_id,
                "planet": planet,
                "planet_kr": p_data["kr"],
                "house": house,
                "house_domain": h_data["domain"],
                "duration": p_data["cycle"],
                "theme": interpretation["theme"],
                "opportunities": interpretation["opportunities"],
                "challenges": interpretation["challenges"],
                "advice": interpretation["advice"]
            })

    with open(output_file, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    print(f"트랜짓 CSV 생성 완료: {len(rows)}개 -> {output_file}")
    return len(rows)


def generate_transit_interpretation(planet, p_data, house, h_data):
    """트랜짓 해석 생성"""
    p_kr = p_data["kr"]
    p_domain = p_data["domain"]
    h_domain = h_data["domain"]

    return {
        "theme": f"{p_kr}이(가) {house}하우스({h_domain})를 지나면서 {p_domain}의 에너지가 이 영역에 영향을 미칩니다.",
        "opportunities": f"{h_domain} 영역에서 {p_domain}과 관련된 성장과 발전의 기회가 열립니다.",
        "challenges": f"{p_kr}의 에너지가 강하게 작용하여 {h_domain} 관련 도전이 있을 수 있습니다.",
        "advice": f"이 시기에는 {h_domain} 영역에 {p_domain}의 관점을 적용해보세요. {p_kr}의 지혜를 활용하면 좋은 결과가 있을 것입니다."
    }


def generate_astro_aspects_json():
    """행성간 애스펙트 해석 JSON 생성"""
    output_file = os.path.join(DATA_DIR, "astro", "aspect_interpretations.json")
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    aspect_data = {
        "meta": {
            "type": "astro_aspects",
            "description": "행성간 각도(애스펙트) 해석",
            "total_aspects": 0
        },
        "aspects": {}
    }

    planet_list = list(PLANETS.keys())
    count = 0

    for i, p1 in enumerate(planet_list):
        for p2 in planet_list[i+1:]:
            for aspect, a_data in ASPECTS.items():
                aspect_id = f"ASPECT_{p1}_{p2}_{aspect}"
                aspect_data["aspects"][aspect_id] = generate_aspect_interpretation(
                    p1, PLANETS[p1], p2, PLANETS[p2], aspect, a_data
                )
                count += 1

    aspect_data["meta"]["total_aspects"] = count

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(aspect_data, f, ensure_ascii=False, indent=2)

    print(f"애스펙트 JSON 생성 완료: {count}개 -> {output_file}")
    return count


def generate_aspect_interpretation(p1, p1_data, p2, p2_data, aspect, a_data):
    """애스펙트 해석 생성"""
    p1_kr, p2_kr = p1_data["kr"], p2_data["kr"]
    aspect_kr = a_data["kr"]
    nature = a_data["nature"]

    return {
        "planets": [p1, p2],
        "planets_kr": [p1_kr, p2_kr],
        "aspect": aspect,
        "aspect_kr": aspect_kr,
        "angle": a_data["angle"],
        "nature": nature,
        "interpretation": {
            "core": f"{p1_kr}과 {p2_kr}의 {aspect_kr} 관계는 {nature}의 에너지를 만들어냅니다.",
            "positive": f"{p1_data['domain']}과 {p2_data['domain']}이 {nature} 형태로 결합하여 시너지를 낼 수 있습니다.",
            "challenge": f"두 행성의 에너지가 {nature} 방식으로 작용할 때 갈등이 생길 수 있습니다.",
            "integration": f"{p1_kr}의 {p1_data['domain']}과 {p2_kr}의 {p2_data['domain']}을 조화롭게 통합하세요."
        },
        "life_areas": {
            "personality": f"성격에서 {p1_data['domain']}과 {p2_data['domain']}의 {nature} 측면이 나타납니다.",
            "relationships": f"관계에서 이 두 에너지의 상호작용이 중요한 역할을 합니다.",
            "career": f"직업적으로 {p1_kr}과 {p2_kr}의 결합된 에너지를 활용할 수 있습니다."
        }
    }


def generate_saju_pillar_combinations_csv():
    """사주 기둥 조합 해석 CSV 생성"""
    output_file = os.path.join(DATA_DIR, "saju", "nodes_saju_pillar_combinations.csv")
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    rows = []

    # 천간-지지 60갑자 조합
    gan_order = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
    ji_order = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]

    for i in range(60):
        gan = gan_order[i % 10]
        ji = ji_order[i % 12]

        gan_data = CHEONGAN[gan]
        ji_data = JIJI[ji]

        pillar_id = f"PILLAR_{gan}{ji}"

        # 납음(納音) 오행 - 간략화
        napeum_cycle = i // 2 % 5
        napeum = ["금", "수", "화", "토", "목"][napeum_cycle]

        rows.append({
            "id": pillar_id,
            "pillar": f"{gan}{ji}",
            "pillar_kr": f"{gan_data['kr']}{ji_data['kr']}",
            "cheongan": gan,
            "cheongan_kr": gan_data["kr"],
            "cheongan_ohang": gan_data["ohang"],
            "jiji": ji,
            "jiji_kr": ji_data["kr"],
            "jiji_animal": ji_data["animal"],
            "jiji_ohang": ji_data["ohang"],
            "napeum": napeum,
            "nature": f"{gan_data['nature']}의 기운이 {ji_data['animal']}의 특성과 결합",
            "personality": f"{gan_data['ohang']}의 성질을 {ji_data['ohang']}의 땅에서 발휘. {gan_data['kr']}{ji_data['kr']}일주.",
            "career_hint": f"{gan_data['nature']}과 관련된 분야에서 {ji_data['animal']}의 특성 활용",
            "relationship_hint": f"{gan_data['yin_yang']}의 천간과 {ji_data['ohang']}의 지지 조합이 관계에 영향"
        })

    with open(output_file, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    print(f"사주 60갑자 CSV 생성 완료: {len(rows)}개 -> {output_file}")
    return len(rows)


def generate_saju_sipsung_interactions_json():
    """십성 상호작용 해석 JSON 생성"""
    output_file = os.path.join(DATA_DIR, "saju", "sipsung_interactions.json")
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    interactions_data = {
        "meta": {
            "type": "sipsung_interactions",
            "description": "십성(十星) 상호작용 해석",
            "total": 0
        },
        "interactions": {}
    }

    count = 0
    for i, s1 in enumerate(SIPSUNG):
        for s2 in SIPSUNG[i:]:
            interaction_id = f"SIPSUNG_{s1}_{s2}"
            interactions_data["interactions"][interaction_id] = generate_sipsung_interaction(s1, s2)
            count += 1

    interactions_data["meta"]["total"] = count

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(interactions_data, f, ensure_ascii=False, indent=2)

    print(f"십성 상호작용 JSON 생성 완료: {count}개 -> {output_file}")
    return count


def generate_sipsung_interaction(s1, s2):
    """십성 상호작용 해석 생성"""
    sipsung_nature = {
        "비견": {"type": "동류", "nature": "경쟁, 협력, 형제"},
        "겁재": {"type": "동류", "nature": "경쟁심, 도전, 손재"},
        "식신": {"type": "설기", "nature": "표현, 창작, 여유"},
        "상관": {"type": "설기", "nature": "반항, 재능, 예술"},
        "편재": {"type": "재성", "nature": "사업, 유동재산, 아버지"},
        "정재": {"type": "재성", "nature": "안정수입, 고정재산, 근면"},
        "편관": {"type": "관성", "nature": "권력, 압박, 변화"},
        "정관": {"type": "관성", "nature": "명예, 안정, 직장"},
        "편인": {"type": "인성", "nature": "학문, 비전통, 창의"},
        "정인": {"type": "인성", "nature": "전통학문, 어머니, 보호"}
    }

    s1_data = sipsung_nature.get(s1, {"type": "미상", "nature": "불명"})
    s2_data = sipsung_nature.get(s2, {"type": "미상", "nature": "불명"})

    same_type = s1_data["type"] == s2_data["type"]

    return {
        "sipsung1": s1,
        "sipsung2": s2,
        "sipsung1_type": s1_data["type"],
        "sipsung2_type": s2_data["type"],
        "interaction_type": "동류상생" if same_type else "이류상조",
        "interpretation": {
            "core": f"{s1}({s1_data['nature']})과 {s2}({s2_data['nature']})의 상호작용",
            "positive": f"{s1}의 에너지가 {s2}와 만나 긍정적 시너지를 낼 때, {s1_data['nature']}과 {s2_data['nature']}이 조화롭게 발현됩니다.",
            "negative": f"두 십성이 충돌할 때, {s1_data['nature']}과 {s2_data['nature']} 사이에 갈등이 생길 수 있습니다.",
            "balance": f"{s1}과 {s2}의 균형을 통해 인생의 다양한 측면을 조화롭게 발전시킬 수 있습니다."
        },
        "life_impact": {
            "career": f"직업에서 {s1}과 {s2}의 결합이 독특한 강점이 됩니다.",
            "relationship": f"관계에서 이 조합은 {s1_data['nature']}과 {s2_data['nature']}의 역동성을 만듭니다.",
            "wealth": f"재물운에서 {s1}과 {s2}의 상호작용이 중요한 역할을 합니다."
        }
    }


def generate_saju_monthly_fortune_csv():
    """월별 운세 기본 해석 CSV 생성"""
    output_file = os.path.join(DATA_DIR, "saju", "nodes_saju_monthly_fortune.csv")
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    rows = []

    # 일간 x 월지 조합
    for gan, gan_data in CHEONGAN.items():
        for ji, ji_data in JIJI.items():
            fortune_id = f"MONTHLY_{gan}_{ji}"

            # 오행 관계 판단
            gan_ohang = gan_data["ohang"]
            ji_ohang = ji_data["ohang"]

            relation = get_ohang_relation(gan_ohang, ji_ohang)

            rows.append({
                "id": fortune_id,
                "ilgan": gan,
                "ilgan_kr": gan_data["kr"],
                "ilgan_ohang": gan_ohang,
                "wolji": ji,
                "wolji_kr": ji_data["kr"],
                "wolji_ohang": ji_ohang,
                "month": ji_data["month"],
                "relation": relation,
                "energy": f"{gan_data['kr']}일간이 {ji_data['kr']}월({ji_data['animal']}의 달)을 만남",
                "overall": get_monthly_fortune_text(gan_data, ji_data, relation),
                "advice": f"{relation}의 달에는 {get_relation_advice(relation)}"
            })

    with open(output_file, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    print(f"월별 운세 CSV 생성 완료: {len(rows)}개 -> {output_file}")
    return len(rows)


def get_ohang_relation(gan_ohang, ji_ohang):
    """오행 관계 판단"""
    # 상생 관계
    saengsaeng = {"목": "화", "화": "토", "토": "금", "금": "수", "수": "목"}
    # 상극 관계 (극하는)
    geuk_ha = {"목": "토", "토": "수", "수": "화", "화": "금", "금": "목"}
    # 상극 관계 (극받는)
    geuk_ba = {"토": "목", "수": "토", "화": "수", "금": "화", "목": "금"}

    if gan_ohang == ji_ohang:
        return "비화(동일)"
    elif saengsaeng.get(ji_ohang) == gan_ohang:
        return "생조(생해줌)"
    elif saengsaeng.get(gan_ohang) == ji_ohang:
        return "설기(빼앗김)"
    elif geuk_ha.get(gan_ohang) == ji_ohang:
        return "극출(극함)"
    elif geuk_ba.get(gan_ohang) == ji_ohang:
        return "극입(극당함)"
    else:
        return "무관"


def get_monthly_fortune_text(gan_data, ji_data, relation):
    """월 운세 텍스트 생성"""
    relation_texts = {
        "비화(동일)": f"같은 오행의 달로 에너지가 강화됩니다. {gan_data['nature']}의 특성이 더욱 두드러집니다.",
        "생조(생해줌)": f"월지가 일간을 생해주는 달입니다. 외부의 도움과 지지를 받기 좋은 시기입니다.",
        "설기(빼앗김)": f"일간의 에너지가 빠져나가는 달입니다. 무리하지 말고 에너지를 보존하세요.",
        "극출(극함)": f"일간이 월지를 극하는 달입니다. 적극적인 행동이 필요하나 무리는 금물입니다.",
        "극입(극당함)": f"월지가 일간을 극하는 달입니다. 도전과 시련이 있을 수 있으나 성장의 기회입니다.",
        "무관": f"특별한 상호작용 없이 평온한 달입니다."
    }
    return relation_texts.get(relation, "해석 없음")


def get_relation_advice(relation):
    """관계별 조언"""
    advices = {
        "비화(동일)": "자신의 강점을 최대한 발휘하되, 과욕은 금물",
        "생조(생해줌)": "좋은 인연을 만나고 도움을 받아들이세요",
        "설기(빼앗김)": "휴식을 취하고 에너지 충전에 집중하세요",
        "극출(극함)": "목표를 향해 적극적으로 나아가세요",
        "극입(극당함)": "인내하며 실력을 쌓는 시기로 활용하세요",
        "무관": "평소대로 꾸준히 노력하세요"
    }
    return advices.get(relation, "균형을 유지하세요")


def main():
    """메인 실행 함수"""
    print("=" * 60)
    print("종합 해석 데이터 생성 시작")
    print("=" * 60)

    total_count = 0

    # 타로 데이터
    print("\n[타로 데이터 생성]")
    total_count += generate_tarot_combinations_csv()
    total_count += generate_tarot_reverse_json()

    # 점성술 데이터
    print("\n[점성술 데이터 생성]")
    total_count += generate_astro_transits_csv()
    total_count += generate_astro_aspects_json()

    # 사주 데이터
    print("\n[사주 데이터 생성]")
    total_count += generate_saju_pillar_combinations_csv()
    total_count += generate_saju_sipsung_interactions_json()
    total_count += generate_saju_monthly_fortune_csv()

    print("\n" + "=" * 60)
    print(f"총 {total_count}개의 데이터 항목 생성 완료!")
    print("=" * 60)

    return total_count


if __name__ == "__main__":
    main()
