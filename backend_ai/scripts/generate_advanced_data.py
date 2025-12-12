#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
고급 해석 데이터 생성 스크립트
- 타로 스프레드별 위치 해석
- 점성술 하우스 별자리 배치
- 사주 조후용신 상세 해석
- 꿈 해몽 심층 데이터
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import json
import csv
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data", "graph")

# ===========================
# 타로 스프레드 데이터
# ===========================

SPREADS = {
    "celtic_cross": {
        "name": "켈틱 크로스",
        "positions": 10,
        "position_meanings": {
            1: {"name": "현재 상황", "description": "질문자의 현재 상태와 핵심 이슈"},
            2: {"name": "장애물/도움", "description": "현재 상황에 영향을 미치는 요소"},
            3: {"name": "목표/이상", "description": "의식적으로 원하는 것, 목표"},
            4: {"name": "뿌리/과거", "description": "상황의 근본 원인, 과거의 영향"},
            5: {"name": "최근 과거", "description": "최근에 일어난 일, 지나가는 영향"},
            6: {"name": "가까운 미래", "description": "곧 일어날 일, 다가오는 영향"},
            7: {"name": "자신", "description": "질문자의 태도, 현재 위치"},
            8: {"name": "환경", "description": "주변 상황, 타인의 영향"},
            9: {"name": "희망/두려움", "description": "내면의 기대와 걱정"},
            10: {"name": "결과", "description": "최종 결과, 상황의 귀결"}
        }
    },
    "three_card": {
        "name": "쓰리 카드",
        "positions": 3,
        "position_meanings": {
            1: {"name": "과거", "description": "현재 상황에 영향을 준 과거"},
            2: {"name": "현재", "description": "지금 현재의 상황"},
            3: {"name": "미래", "description": "앞으로 펼쳐질 가능성"}
        }
    },
    "horseshoe": {
        "name": "호스슈",
        "positions": 7,
        "position_meanings": {
            1: {"name": "과거", "description": "과거의 영향"},
            2: {"name": "현재", "description": "현재 상황"},
            3: {"name": "숨겨진 영향", "description": "알지 못하는 영향력"},
            4: {"name": "장애물", "description": "극복해야 할 것"},
            5: {"name": "주변 환경", "description": "외부 상황"},
            6: {"name": "조언", "description": "취해야 할 행동"},
            7: {"name": "결과", "description": "예상되는 결과"}
        }
    },
    "relationship": {
        "name": "관계 스프레드",
        "positions": 6,
        "position_meanings": {
            1: {"name": "나의 현재", "description": "질문자의 현재 상태"},
            2: {"name": "상대의 현재", "description": "상대방의 현재 상태"},
            3: {"name": "관계의 핵심", "description": "두 사람 사이의 핵심 역동"},
            4: {"name": "나의 과제", "description": "질문자가 해야 할 것"},
            5: {"name": "상대의 과제", "description": "상대방이 해야 할 것"},
            6: {"name": "관계의 미래", "description": "관계의 발전 방향"}
        }
    },
    "career": {
        "name": "커리어 스프레드",
        "positions": 5,
        "position_meanings": {
            1: {"name": "현재 직업 상태", "description": "현재 커리어 상황"},
            2: {"name": "강점", "description": "활용할 수 있는 강점"},
            3: {"name": "도전", "description": "극복해야 할 과제"},
            4: {"name": "조언", "description": "나아갈 방향"},
            5: {"name": "결과", "description": "커리어 전망"}
        }
    }
}

# ===========================
# 점성술 하우스-사인 조합
# ===========================

ZODIAC_SIGNS = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리",
                "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"]

HOUSE_THEMES = {
    1: "자아와 정체성",
    2: "재정과 가치관",
    3: "소통과 학습",
    4: "가정과 뿌리",
    5: "창조와 로맨스",
    6: "건강과 일상",
    7: "파트너십",
    8: "변환과 심리",
    9: "철학과 확장",
    10: "경력과 명성",
    11: "친구와 희망",
    12: "영성과 무의식"
}

SIGN_QUALITIES = {
    "양자리": {"element": "불", "mode": "활동", "trait": "선구적, 용감함, 충동적"},
    "황소자리": {"element": "땅", "mode": "고정", "trait": "안정적, 감각적, 고집"},
    "쌍둥이자리": {"element": "공기", "mode": "변통", "trait": "다재다능, 호기심, 변덕"},
    "게자리": {"element": "물", "mode": "활동", "trait": "보호적, 감정적, 직관적"},
    "사자자리": {"element": "불", "mode": "고정", "trait": "창의적, 자신감, 드라마틱"},
    "처녀자리": {"element": "땅", "mode": "변통", "trait": "분석적, 실용적, 완벽주의"},
    "천칭자리": {"element": "공기", "mode": "활동", "trait": "외교적, 조화, 우유부단"},
    "전갈자리": {"element": "물", "mode": "고정", "trait": "강렬함, 통찰력, 집착"},
    "사수자리": {"element": "불", "mode": "변통", "trait": "낙천적, 자유로움, 철학적"},
    "염소자리": {"element": "땅", "mode": "활동", "trait": "야심적, 책임감, 보수적"},
    "물병자리": {"element": "공기", "mode": "고정", "trait": "혁신적, 독립적, 인도주의"},
    "물고기자리": {"element": "물", "mode": "변통", "trait": "상상력, 공감, 몽상적"}
}

# ===========================
# 사주 조후용신 데이터
# ===========================

JOHU_COMBINATIONS = {
    "목_춘": {"season": "봄", "element": "목", "johu": "없음(왕성)", "advice": "목이 봄에 왕성하니 조후가 급하지 않음"},
    "목_하": {"season": "여름", "element": "목", "johu": "수", "advice": "여름 목은 말라가니 물이 필요함"},
    "목_추": {"season": "가을", "element": "목", "johu": "화", "advice": "가을 금기에 목이 상하니 화로 금을 제압"},
    "목_동": {"season": "겨울", "element": "목", "johu": "화", "advice": "겨울 추위에 목이 얼어붙으니 따뜻한 불이 필요"},

    "화_춘": {"season": "봄", "element": "화", "johu": "없음", "advice": "목생화로 자연스럽게 힘을 얻음"},
    "화_하": {"season": "여름", "element": "화", "johu": "수", "advice": "여름 화는 너무 뜨거우니 물로 조절"},
    "화_추": {"season": "가을", "element": "화", "johu": "목", "advice": "가을에 화가 약해지니 나무로 불을 지핌"},
    "화_동": {"season": "겨울", "element": "화", "johu": "목", "advice": "겨울 한기에 화가 꺼지니 목으로 살려야"},

    "토_춘": {"season": "봄", "element": "토", "johu": "화", "advice": "봄에 목이 토를 극하니 화로 설기시켜 토를 도움"},
    "토_하": {"season": "여름", "element": "토", "johu": "수", "advice": "여름 토는 화생토로 과다하니 수로 조절"},
    "토_추": {"season": "가을", "element": "토", "johu": "화", "advice": "가을에 토가 건조하니 적절한 조화 필요"},
    "토_동": {"season": "겨울", "element": "토", "johu": "화", "advice": "겨울 토는 얼어붙으니 화가 필수"},

    "금_춘": {"season": "봄", "element": "금", "johu": "토", "advice": "봄에 금이 약하니 토로 생해줌"},
    "금_하": {"season": "여름", "element": "금", "johu": "수", "advice": "여름 화기에 금이 녹으니 수로 보호"},
    "금_추": {"season": "가을", "element": "금", "johu": "없음(왕성)", "advice": "금이 가을에 왕성하니 조후가 급하지 않음"},
    "금_동": {"season": "겨울", "element": "금", "johu": "화", "advice": "겨울 금은 너무 차가우니 화로 따뜻하게"},

    "수_춘": {"season": "봄", "element": "수", "johu": "금", "advice": "봄에 수가 줄어드니 금으로 보충"},
    "수_하": {"season": "여름", "element": "수", "johu": "금", "advice": "여름 화기에 수가 증발하니 금의 도움 필요"},
    "수_추": {"season": "가을", "element": "수", "johu": "없음", "advice": "가을 금생수로 자연스럽게 힘을 얻음"},
    "수_동": {"season": "겨울", "element": "수", "johu": "화", "advice": "겨울 수는 너무 차가우니 화로 따뜻하게"}
}

# ===========================
# 꿈 해몽 카테고리
# ===========================

DREAM_CATEGORIES = {
    "animal": {
        "name": "동물",
        "symbols": {
            "뱀": {"positive": "지혜, 재물, 변화", "negative": "배신, 위험, 유혹", "advice": "변화의 시기, 현명한 판단 필요"},
            "호랑이": {"positive": "권력, 성공, 보호", "negative": "위험, 적, 두려움", "advice": "용기를 내되 신중하게"},
            "용": {"positive": "출세, 성공, 권력", "negative": "과욕, 실패", "advice": "큰 기회가 오니 준비하세요"},
            "개": {"positive": "충성, 보호, 친구", "negative": "배신, 공격", "advice": "주변 사람을 살피세요"},
            "고양이": {"positive": "독립, 직관, 신비", "negative": "음모, 불운", "advice": "직관을 믿으세요"},
            "물고기": {"positive": "재물, 풍요, 다산", "negative": "기회 놓침", "advice": "재물운 상승"},
            "새": {"positive": "자유, 소식, 희망", "negative": "이별, 상실", "advice": "좋은 소식이 올 수 있음"},
            "돼지": {"positive": "재물, 복, 풍요", "negative": "탐욕, 게으름", "advice": "재물운이 좋으나 욕심 조심"},
            "소": {"positive": "재산, 근면, 성실", "negative": "우둔함, 고집", "advice": "꾸준한 노력이 결실"},
            "말": {"positive": "성공, 속도, 명예", "negative": "성급함, 불안정", "advice": "빠른 진전이 있을 것"}
        }
    },
    "nature": {
        "name": "자연",
        "symbols": {
            "물": {"positive": "정화, 감정, 풍요", "negative": "위험, 감정 폭발", "advice": "감정을 다스리세요"},
            "불": {"positive": "열정, 변화, 정화", "negative": "파괴, 분노", "advice": "열정을 건설적으로"},
            "산": {"positive": "목표, 장애 극복, 성취", "negative": "어려움, 고난", "advice": "인내하면 목표 달성"},
            "바다": {"positive": "무의식, 가능성, 풍요", "negative": "두려움, 혼란", "advice": "내면을 탐구하세요"},
            "하늘": {"positive": "희망, 자유, 영성", "negative": "불안, 막막함", "advice": "높은 이상을 품으세요"},
            "비": {"positive": "정화, 풍요, 축복", "negative": "우울, 장애", "advice": "새로운 시작의 징조"},
            "눈": {"positive": "순수, 정화, 새출발", "negative": "냉정함, 고립", "advice": "깨끗한 마음으로"},
            "꽃": {"positive": "아름다움, 사랑, 성장", "negative": "덧없음, 허영", "advice": "아름다운 시기가 옵니다"},
            "나무": {"positive": "성장, 생명력, 근본", "negative": "고착, 변화 거부", "advice": "꾸준히 성장하세요"},
            "달": {"positive": "여성성, 직관, 변화", "negative": "불안, 환상", "advice": "직관을 믿으세요"}
        }
    },
    "action": {
        "name": "행동",
        "symbols": {
            "날기": {"positive": "자유, 해방, 성공", "negative": "현실 도피, 불안", "advice": "높은 목표를 향해"},
            "떨어지기": {"positive": "내려놓음, 변화", "negative": "불안, 실패 두려움", "advice": "변화를 받아들이세요"},
            "달리기": {"positive": "진전, 노력, 열정", "negative": "도피, 급함", "advice": "목표를 향해 전진"},
            "수영": {"positive": "감정 다스림, 적응", "negative": "감정에 휩쓸림", "advice": "감정을 잘 헤쳐나가세요"},
            "싸움": {"positive": "갈등 해결, 힘", "negative": "분노, 대립", "advice": "내면의 갈등 직면"},
            "죽음": {"positive": "변화, 재탄생, 끝", "negative": "두려움, 상실", "advice": "한 단계가 끝나고 새로 시작"},
            "결혼": {"positive": "결합, 약속, 전환", "negative": "속박, 책임", "advice": "중요한 결정이나 결합"},
            "출산": {"positive": "창조, 새 시작, 성취", "negative": "부담, 책임", "advice": "새로운 것이 탄생"},
            "시험": {"positive": "평가, 준비, 도전", "negative": "불안, 자신감 부족", "advice": "실력을 보여줄 때"},
            "길 잃음": {"positive": "탐색, 새 방향", "negative": "혼란, 방향 상실", "advice": "인생의 방향을 재점검"}
        }
    },
    "people": {
        "name": "사람",
        "symbols": {
            "부모": {"positive": "보호, 지지, 근원", "negative": "갈등, 독립 필요", "advice": "뿌리와 관계된 문제"},
            "연인": {"positive": "사랑, 관계, 합일", "negative": "갈등, 불안", "advice": "관계에 집중하세요"},
            "아이": {"positive": "순수, 새 시작, 창의", "negative": "미성숙, 책임 회피", "advice": "내면의 아이를 돌보세요"},
            "낯선이": {"positive": "새 가능성, 자아의 일부", "negative": "두려움, 미지", "advice": "새로운 측면을 탐구"},
            "죽은자": {"positive": "메시지, 추억, 연결", "negative": "미련, 해결 안 된 것", "advice": "과거를 정리하세요"},
            "유명인": {"positive": "이상, 목표, 인정욕구", "negative": "열등감, 비현실적", "advice": "자신만의 가치를 찾으세요"},
            "적": {"positive": "그림자 직면, 성장", "negative": "갈등, 위협", "advice": "내면의 갈등 해결"},
            "친구": {"positive": "지지, 사교, 즐거움", "negative": "배신, 갈등", "advice": "인간관계 점검"},
            "스승": {"positive": "지혜, 안내, 성장", "negative": "의존, 권위 문제", "advice": "배움의 시기"},
            "군중": {"positive": "소속감, 사회", "negative": "개성 상실, 압박", "advice": "사회적 역할 생각"}
        }
    },
    "object": {
        "name": "사물",
        "symbols": {
            "돈": {"positive": "가치, 풍요, 에너지", "negative": "탐욕, 걱정", "advice": "가치관 점검"},
            "집": {"positive": "자아, 안전, 가정", "negative": "속박, 문제", "advice": "내면의 상태 반영"},
            "차": {"positive": "통제력, 방향, 진전", "negative": "통제 상실", "advice": "인생의 방향"},
            "옷": {"positive": "자아 표현, 역할", "negative": "가면, 불안", "advice": "자기 이미지 점검"},
            "음식": {"positive": "양분, 만족, 풍요", "negative": "결핍, 탐욕", "advice": "무엇이 필요한지"},
            "책": {"positive": "지식, 지혜, 기록", "negative": "현실 도피", "advice": "배움과 성찰"},
            "거울": {"positive": "자기 인식, 진실", "negative": "자기 비판", "advice": "자신을 직면"},
            "문": {"positive": "기회, 전환, 선택", "negative": "장벽, 닫힘", "advice": "새 기회를 향해"},
            "열쇠": {"positive": "해답, 접근, 해결", "negative": "비밀, 닫힌 것", "advice": "해결책을 찾을 것"},
            "전화": {"positive": "소통, 연결, 소식", "negative": "단절, 놓친 것", "advice": "소통에 주의"}
        }
    }
}

# ===========================
# 데이터 생성 함수들
# ===========================

def generate_tarot_spread_positions_json():
    """타로 스프레드별 위치 해석 JSON 생성"""
    output_file = os.path.join(DATA_DIR, "rules", "tarot", "tarot_spread_positions.json")
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    spread_data = {
        "meta": {
            "type": "tarot_spread_positions",
            "description": "타로 스프레드별 위치 의미와 해석 가이드",
            "total_spreads": len(SPREADS)
        },
        "spreads": {}
    }

    for spread_id, spread_info in SPREADS.items():
        spread_data["spreads"][spread_id] = {
            "name": spread_info["name"],
            "total_positions": spread_info["positions"],
            "positions": spread_info["position_meanings"],
            "reading_guide": generate_spread_reading_guide(spread_id, spread_info)
        }

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(spread_data, f, ensure_ascii=False, indent=2)

    print(f"타로 스프레드 위치 JSON 생성 완료: {len(SPREADS)}개 스프레드 -> {output_file}")
    return len(SPREADS)


def generate_spread_reading_guide(spread_id, spread_info):
    """스프레드 리딩 가이드 생성"""
    return {
        "intro": f"{spread_info['name']}는 {spread_info['positions']}장의 카드를 사용하는 스프레드입니다.",
        "best_for": get_spread_best_for(spread_id),
        "reading_order": list(range(1, spread_info["positions"] + 1)),
        "interpretation_tips": f"각 위치의 의미를 카드와 연결하여 해석합니다. 카드 간의 관계도 살펴보세요."
    }


def get_spread_best_for(spread_id):
    """스프레드별 적합한 질문 유형"""
    best_for = {
        "celtic_cross": ["복잡한 상황 분석", "전체적인 인생 흐름", "깊이 있는 통찰"],
        "three_card": ["간단한 질문", "시간의 흐름 파악", "빠른 조언"],
        "horseshoe": ["중간 복잡도의 상황", "장애물과 조언", "구체적 결과 예측"],
        "relationship": ["연애 관계", "대인 관계", "파트너십"],
        "career": ["직업 고민", "진로 결정", "사업 전망"]
    }
    return best_for.get(spread_id, ["일반적인 질문"])


def generate_astro_house_signs_csv():
    """점성술 하우스-별자리 조합 CSV 생성"""
    output_file = os.path.join(DATA_DIR, "astro", "house_sign_combinations.csv")
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    rows = []

    for house, theme in HOUSE_THEMES.items():
        for sign in ZODIAC_SIGNS:
            sign_data = SIGN_QUALITIES[sign]
            combo_id = f"HOUSE_{house}_{sign.replace('자리', '')}"

            rows.append({
                "id": combo_id,
                "house": house,
                "house_theme": theme,
                "sign": sign,
                "sign_element": sign_data["element"],
                "sign_mode": sign_data["mode"],
                "sign_trait": sign_data["trait"],
                "interpretation": f"{house}하우스({theme})에 {sign}가 있으면, {sign_data['trait']}한 방식으로 이 영역을 경험합니다.",
                "strength": f"{sign}의 {sign_data['element']} 에너지가 {theme} 영역에서 발휘됩니다.",
                "challenge": f"{sign_data['mode']}궁의 특성이 때로 {theme} 영역에서 도전이 될 수 있습니다.",
                "advice": f"{theme} 영역에서 {sign}의 장점을 살리면서 균형을 찾으세요."
            })

    with open(output_file, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    print(f"하우스-별자리 조합 CSV 생성 완료: {len(rows)}개 -> {output_file}")
    return len(rows)


def generate_saju_johu_json():
    """사주 조후용신 상세 JSON 생성"""
    output_file = os.path.join(DATA_DIR, "saju", "johu_yongsin_detail.json")
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    johu_data = {
        "meta": {
            "type": "johu_yongsin",
            "description": "계절에 따른 오행별 조후용신 상세 해석",
            "concept": "조후(調候)란 계절의 기후를 조절하여 사주의 균형을 맞추는 것"
        },
        "elements": {}
    }

    elements = ["목", "화", "토", "금", "수"]
    seasons = ["춘", "하", "추", "동"]

    for elem in elements:
        johu_data["elements"][elem] = {
            "name": elem,
            "seasons": {}
        }
        for season in seasons:
            key = f"{elem}_{season}"
            if key in JOHU_COMBINATIONS:
                combo = JOHU_COMBINATIONS[key]
                johu_data["elements"][elem]["seasons"][season] = {
                    "season_name": combo["season"],
                    "johu_needed": combo["johu"],
                    "advice": combo["advice"],
                    "detailed_interpretation": generate_johu_detail(elem, season, combo)
                }

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(johu_data, f, ensure_ascii=False, indent=2)

    print(f"조후용신 JSON 생성 완료: {len(elements) * len(seasons)}개 조합 -> {output_file}")
    return len(elements) * len(seasons)


def generate_johu_detail(elem, season, combo):
    """조후 상세 해석 생성"""
    season_names = {"춘": "봄", "하": "여름", "추": "가을", "동": "겨울"}
    elem_nature = {
        "목": "나무의 성장",
        "화": "불의 열정",
        "토": "흙의 안정",
        "금": "쇠의 결단",
        "수": "물의 지혜"
    }

    return f"{season_names[season]}에 {elem}({elem_nature[elem]})은(는) {combo['advice']}. " \
           f"조후용신으로 {combo['johu'] if combo['johu'] != '없음(왕성)' and combo['johu'] != '없음' else '특별히 필요한 것이 없으나 균형 유지가 중요합니다.'}"


def generate_dream_interpretation_json():
    """꿈 해몽 심층 JSON 생성"""
    output_file = os.path.join(DATA_DIR, "rules", "dream", "dream_symbols_advanced.json")
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    dream_data = {
        "meta": {
            "type": "dream_interpretation",
            "description": "꿈 해몽 심층 해석 데이터",
            "total_categories": len(DREAM_CATEGORIES)
        },
        "categories": {}
    }

    total_symbols = 0
    for cat_id, cat_data in DREAM_CATEGORIES.items():
        dream_data["categories"][cat_id] = {
            "name": cat_data["name"],
            "symbols": {}
        }
        for symbol, meaning in cat_data["symbols"].items():
            dream_data["categories"][cat_id]["symbols"][symbol] = {
                "positive_meaning": meaning["positive"],
                "negative_meaning": meaning["negative"],
                "advice": meaning["advice"],
                "detailed_interpretation": generate_dream_detail(symbol, meaning, cat_data["name"]),
                "related_life_areas": get_dream_life_areas(cat_id, symbol)
            }
            total_symbols += 1

    dream_data["meta"]["total_symbols"] = total_symbols

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(dream_data, f, ensure_ascii=False, indent=2)

    print(f"꿈 해몽 JSON 생성 완료: {total_symbols}개 심볼 -> {output_file}")
    return total_symbols


def generate_dream_detail(symbol, meaning, category):
    """꿈 상세 해석 생성"""
    return f"꿈에서 {symbol}을(를) 보는 것은 {category} 영역의 상징입니다. " \
           f"긍정적으로는 {meaning['positive']}을(를), 부정적으로는 {meaning['negative']}을(를) 나타낼 수 있습니다. " \
           f"{meaning['advice']}"


def get_dream_life_areas(category, symbol):
    """꿈 관련 삶의 영역"""
    area_map = {
        "animal": ["본능", "잠재의식", "자연과의 연결"],
        "nature": ["감정", "환경", "내면 상태"],
        "action": ["의지", "목표", "현재 상황"],
        "people": ["관계", "자아의 측면", "사회"],
        "object": ["가치관", "목표", "일상"]
    }
    return area_map.get(category, ["일반"])


def generate_numerology_master_numbers_json():
    """수비학 마스터 넘버 해석 JSON 생성"""
    output_file = os.path.join(DATA_DIR, "numerology", "master_numbers.json")
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    master_data = {
        "meta": {
            "type": "numerology_master",
            "description": "수비학 마스터 넘버 심층 해석"
        },
        "numbers": {
            "11": {
                "name": "마스터 넘버 11",
                "essence": "직관과 영감의 마스터",
                "positive": ["높은 직관력", "영적 인식", "영감", "이상주의", "비전"],
                "challenge": ["긴장", "불안", "과민함", "비현실적 기대"],
                "life_path": "11의 인생 경로는 영적 통찰과 직관을 통해 다른 이들을 고양시키는 것입니다.",
                "career": ["상담사", "심리학자", "예술가", "영적 지도자", "발명가"],
                "relationship": "깊은 정서적 연결을 원하며, 영혼의 짝을 찾는 경향이 있습니다.",
                "advice": "높은 감수성을 현실에 접지시키는 연습이 필요합니다."
            },
            "22": {
                "name": "마스터 넘버 22",
                "essence": "마스터 빌더",
                "positive": ["큰 비전 실현", "실용적 이상주의", "리더십", "조직력", "대규모 성취"],
                "challenge": ["완벽주의", "과도한 압박", "자기 의심", "burnout"],
                "life_path": "22의 인생 경로는 큰 꿈을 현실로 만들어 세상에 지속적인 영향을 미치는 것입니다.",
                "career": ["CEO", "건축가", "정치가", "사회운동가", "대기업 리더"],
                "relationship": "안정적이고 지지적인 파트너십을 중시하며, 함께 목표를 이루는 관계를 선호합니다.",
                "advice": "큰 목표를 작은 단계로 나누고, 휴식의 중요성을 인식하세요."
            },
            "33": {
                "name": "마스터 넘버 33",
                "essence": "마스터 티처",
                "positive": ["무조건적 사랑", "치유", "봉사", "영적 지도", "희생"],
                "challenge": ["순교자 콤플렉스", "자기 무시", "과도한 책임감", "경계 부족"],
                "life_path": "33의 인생 경로는 사랑과 치유를 통해 인류에 봉사하는 것입니다.",
                "career": ["치유사", "교사", "인도주의 활동가", "상담사", "성직자"],
                "relationship": "깊은 사랑과 헌신을 보여주며, 파트너의 성장을 돕습니다.",
                "advice": "타인을 돌보는 만큼 자신도 돌보는 것을 잊지 마세요."
            },
            "44": {
                "name": "마스터 넘버 44",
                "essence": "마스터 힐러",
                "positive": ["뛰어난 치유력", "물질적 정신적 균형", "강한 기반", "인내력"],
                "challenge": ["과도한 물질주의", "경직됨", "융통성 부족"],
                "life_path": "44는 물질 세계와 영적 세계의 다리 역할을 합니다.",
                "career": ["의료인", "금융 전문가", "치유사", "기업가"],
                "relationship": "안정적이고 신뢰할 수 있는 파트너로, 장기적 관계를 선호합니다.",
                "advice": "유연성을 기르고 변화를 두려워하지 마세요."
            }
        }
    }

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(master_data, f, ensure_ascii=False, indent=2)

    print(f"수비학 마스터 넘버 JSON 생성 완료: 4개 -> {output_file}")
    return 4


def generate_iching_advanced_json():
    """주역 괘 심층 해석 JSON 생성 (일부)"""
    output_file = os.path.join(DATA_DIR, "rules", "iching", "iching_gua_advanced.json")
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    # 대표적인 64괘 중 일부
    gua_data = {
        "meta": {
            "type": "iching_advanced",
            "description": "주역 64괘 심층 해석"
        },
        "guas": {
            "1_건": {
                "number": 1,
                "name": "건(乾)",
                "chinese": "乾",
                "meaning": "하늘",
                "upper": "건(天)",
                "lower": "건(天)",
                "element": "금",
                "image": "하늘이 건실하게 움직이니, 군자는 이를 보고 스스로 강해지기를 쉬지 않는다",
                "judgment": "크게 형통하니 바르게 함이 이롭다",
                "interpretation": {
                    "general": "강건한 양의 기운이 충만. 적극적인 진취와 창조의 시기.",
                    "love": "당당하고 주도적인 연애. 리드하는 위치에서 관계 발전.",
                    "career": "리더십 발휘의 시기. 큰 목표를 향해 추진력 있게 나아감.",
                    "finance": "재물운 상승. 투자와 확장에 좋은 시기.",
                    "advice": "강건함을 유지하되 겸손을 잃지 마세요."
                },
                "lines": {
                    "1": "잠룡이니 쓰지 말라 - 때를 기다리세요",
                    "2": "나타난 용이 밭에 있으니 대인을 만남이 이롭다",
                    "3": "군자가 종일 건건하니 저녁에 두려워하면 위태로우나 허물없다",
                    "4": "뛰어오르나 연못에서 나오지 못하니 허물없다",
                    "5": "나는 용이 하늘에 있으니 대인을 만남이 이롭다",
                    "6": "높이 오른 용이니 뉘우침이 있으리라"
                }
            },
            "2_곤": {
                "number": 2,
                "name": "곤(坤)",
                "chinese": "坤",
                "meaning": "땅",
                "upper": "곤(地)",
                "lower": "곤(地)",
                "element": "토",
                "image": "땅의 형세가 곤이니, 군자는 두터운 덕으로 만물을 싣는다",
                "judgment": "크게 형통하니 암말의 바름이 이롭다",
                "interpretation": {
                    "general": "포용과 수용의 시기. 적극적 추진보다 받아들이고 기르는 것이 이로움.",
                    "love": "수용적이고 포용적인 관계. 상대를 있는 그대로 받아들임.",
                    "career": "팀워크와 협력 중시. 보조적 역할에서 빛을 발함.",
                    "finance": "안정적 관리 중시. 공격적 투자보다 보수적 관리.",
                    "advice": "겸손히 따르되 자신의 중심을 잃지 마세요."
                },
                "lines": {
                    "1": "서리를 밟으면 단단한 얼음이 이르리라",
                    "2": "곧고 방정하며 크니 익히지 않아도 이롭지 않음이 없다",
                    "3": "아름다움을 품고 바름을 지킬 수 있다",
                    "4": "주머니를 묶으니 허물도 없고 명예도 없다",
                    "5": "누런 치마니 크게 길하다",
                    "6": "용이 들에서 싸우니 그 피가 검푸르다"
                }
            },
            "11_태": {
                "number": 11,
                "name": "태(泰)",
                "chinese": "泰",
                "meaning": "통함, 평화",
                "upper": "곤(地)",
                "lower": "건(天)",
                "element": "목",
                "image": "하늘과 땅이 사귀니 태이다. 후가 이로써 천지의 도를 재성하고 천지의 마땅함을 돕는다",
                "judgment": "작은 것이 가고 큰 것이 오니 길하고 형통하다",
                "interpretation": {
                    "general": "천지가 소통하는 태평성대의 상. 모든 일이 순조롭게 진행됨.",
                    "love": "조화로운 관계. 서로 통하고 이해하는 좋은 시기.",
                    "career": "승진, 성공, 발전의 시기. 추진하는 일이 잘 풀림.",
                    "finance": "재물운 왕성. 사업 확장과 투자에 좋음.",
                    "advice": "좋은 때일수록 겸손하고 준비하세요."
                },
                "lines": {
                    "1": "띠풀을 뽑으니 무리와 함께하니 가면 길하다",
                    "2": "거친 땅을 포용하고 강을 맨발로 건너며",
                    "3": "평지가 없으면 험한 곳도 없고, 가면 돌아옴이 없지 않다",
                    "4": "펄럭이며 부유하지 않고 이웃과 함께하며",
                    "5": "제을이 딸을 시집보내 복을 받으니 크게 길하다",
                    "6": "성이 무너져 해자로 돌아가니 군사를 쓰지 말라"
                }
            },
            "12_비": {
                "number": 12,
                "name": "비(否)",
                "chinese": "否",
                "meaning": "막힘, 부정",
                "upper": "건(天)",
                "lower": "곤(地)",
                "element": "금",
                "image": "천지가 사귀지 않으니 비이다. 군자는 덕을 검약하여 난을 피한다",
                "judgment": "사람이 아니라 군자의 바름에 이롭지 않다",
                "interpretation": {
                    "general": "막힘과 불통의 시기. 무리한 추진보다 때를 기다림이 현명함.",
                    "love": "소통 부재, 오해. 관계의 어려운 시기.",
                    "career": "막힘과 정체. 새로운 시작보다 현상 유지.",
                    "finance": "재물 손실 주의. 투자와 확장 자제.",
                    "advice": "인내하며 내실을 다지세요. 때가 되면 풀립니다."
                },
                "lines": {
                    "1": "띠풀을 뽑으니 무리와 함께하니 바르면 길하고 형통하다",
                    "2": "싸서 바치니 소인은 길하고 대인은 막혀도 형통하다",
                    "3": "부끄러움을 품는다",
                    "4": "명이 있으면 허물이 없고 무리가 복에 붙는다",
                    "5": "막힘을 쉬니 대인은 길하다",
                    "6": "막힘을 뒤집으니 먼저 막히고 후에 기쁘다"
                }
            }
        }
    }

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(gua_data, f, ensure_ascii=False, indent=2)

    print(f"주역 괘 JSON 생성 완료: 4개 (샘플) -> {output_file}")
    return 4


def main():
    """메인 실행 함수"""
    print("=" * 60)
    print("고급 해석 데이터 생성 시작")
    print("=" * 60)

    total_count = 0

    # 타로 스프레드
    print("\n[타로 스프레드 데이터 생성]")
    total_count += generate_tarot_spread_positions_json()

    # 점성술 하우스-사인
    print("\n[점성술 하우스-사인 데이터 생성]")
    total_count += generate_astro_house_signs_csv()

    # 사주 조후용신
    print("\n[사주 조후용신 데이터 생성]")
    total_count += generate_saju_johu_json()

    # 꿈 해몽
    print("\n[꿈 해몽 데이터 생성]")
    total_count += generate_dream_interpretation_json()

    # 수비학 마스터 넘버
    print("\n[수비학 마스터 넘버 데이터 생성]")
    total_count += generate_numerology_master_numbers_json()

    # 주역 괘
    print("\n[주역 괘 데이터 생성]")
    total_count += generate_iching_advanced_json()

    print("\n" + "=" * 60)
    print(f"총 {total_count}개의 고급 데이터 항목 생성 완료!")
    print("=" * 60)

    return total_count


if __name__ == "__main__":
    main()
