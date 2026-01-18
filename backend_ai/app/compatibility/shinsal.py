# backend_ai/app/compatibility/shinsal.py
"""
Shinsal (神殺) Constants
========================
신살 관련 궁합 분석 상수
38종 신살 점수화
"""

# ===============================================================
# 신살(神殺) 궁합 분석 - 38종 신살 점수화
# ===============================================================

# 궁합에 영향을 미치는 주요 신살
SHINSAL_COMPATIBILITY = {
    # 연애/매력 관련 신살 (도화계열)
    "도화살": {
        "score_self": 0,  # 본인에게 있으면
        "score_both": 8,   # 둘 다 있으면 - 강한 끌림
        "score_partner": 5,  # 상대만 있으면 - 매력적
        "meaning": "이성 인연, 매력",
        "compatibility_effect": "강한 성적 끌림과 로맨틱한 관계",
        "astro_parallel": "Venus-Eros conjunction"
    },
    "홍염살": {
        "score_self": 0,
        "score_both": 10,   # 둘 다 있으면 - 강렬한 끌림
        "score_partner": 6,
        "meaning": "강렬한 매력, 유혹",
        "compatibility_effect": "자석처럼 끌리는 관계, 열정적",
        "astro_parallel": "Lilith-Mars conjunction"
    },

    # 귀인 관련 신살 (도움)
    "천을귀인": {
        "score_self": 5,  # 본인에게 있으면 상대에게 도움 가능
        "score_both": 12,  # 둘 다 있으면 서로 귀인
        "score_partner": 8,  # 상대에게 있으면 내가 도움받음
        "meaning": "귀인의 도움",
        "compatibility_effect": "서로에게 귀인이 되어주는 관계",
        "astro_parallel": "Jupiter-Part of Fortune conjunction"
    },
    "천덕귀인": {
        "score_self": 4,
        "score_both": 10,
        "score_partner": 7,
        "meaning": "하늘의 덕",
        "compatibility_effect": "어려울 때 서로 보호해주는 관계",
        "astro_parallel": "Jupiter-North Node conjunction"
    },
    "월덕귀인": {
        "score_self": 3,
        "score_both": 8,
        "score_partner": 5,
        "meaning": "달의 덕",
        "compatibility_effect": "일상에서 서로 도움이 되는 관계",
        "astro_parallel": "Moon-Ceres conjunction"
    },

    # 학문/지적 관련 신살
    "문창귀인": {
        "score_self": 2,
        "score_both": 7,
        "score_partner": 4,
        "meaning": "학문과 문서",
        "compatibility_effect": "지적으로 자극을 주는 관계",
        "astro_parallel": "Mercury-Pallas conjunction"
    },
    "학당귀인": {
        "score_self": 2,
        "score_both": 6,
        "score_partner": 3,
        "meaning": "배움의 재능",
        "compatibility_effect": "함께 성장하고 배우는 관계",
        "astro_parallel": "Mercury-Urania conjunction"
    },

    # 이동/변화 관련 신살
    "역마살": {
        "score_self": 0,
        "score_both": 5,  # 둘 다 있으면 함께 이동/여행
        "score_partner": 2,
        "score_opposite": -3,  # 한쪽만 있으면 떨어져 있을 수 있음
        "meaning": "이동, 변화",
        "compatibility_effect": "함께 여행하고 새로운 경험을 하는 관계",
        "astro_parallel": "Jupiter-North Node aspect"
    },

    # 영적/예술 관련 신살
    "화개살": {
        "score_self": 1,
        "score_both": 8,  # 둘 다 있으면 영적 교감
        "score_partner": 4,
        "meaning": "예술성, 영성",
        "compatibility_effect": "영적으로 깊이 연결된 관계",
        "astro_parallel": "Neptune-Vesta conjunction"
    },

    # 경쟁/갈등 관련 신살 (조심)
    "양인살": {
        "score_self": -2,
        "score_both": -8,  # 둘 다 있으면 충돌 위험
        "score_partner": -3,
        "meaning": "날카로움, 결단",
        "compatibility_effect": "서로 상처를 줄 수 있음, 주의 필요",
        "astro_parallel": "Mars-Pluto square"
    },
    "겁살": {
        "score_self": -2,
        "score_both": -6,
        "score_partner": -3,
        "meaning": "손실, 배신",
        "compatibility_effect": "신뢰 문제가 생길 수 있음",
        "astro_parallel": "Pluto-Nessus conjunction"
    },
    "백호살": {
        "score_self": -1,
        "score_both": -5,
        "score_partner": -2,
        "meaning": "사고, 충돌",
        "compatibility_effect": "함께 있을 때 사고 주의",
        "astro_parallel": "Mars-Uranus square"
    },

    # 고독 관련 신살 (연애 방해)
    "고진살": {
        "score_self": -3,
        "score_both": -10,  # 둘 다 있으면 함께해도 외로움
        "score_partner": -4,
        "meaning": "고독, 독신",
        "compatibility_effect": "개인 공간 필요, 친밀감 형성 어려움",
        "astro_parallel": "Saturn-Chiron conjunction"
    },
    "과숙살": {
        "score_self": -3,
        "score_both": -8,
        "score_partner": -4,
        "meaning": "배우자 인연 약함",
        "compatibility_effect": "결혼 유지에 노력 필요",
        "astro_parallel": "Saturn-Pandora conjunction"
    },

    # 구속/제한 관련 신살
    "천라지망": {
        "score_self": -2,
        "score_both": -6,
        "score_partner": -2,
        "meaning": "갇힘, 구속",
        "compatibility_effect": "관계가 답답하게 느껴질 수 있음",
        "astro_parallel": "Saturn-South Node conjunction"
    },

    # 원한/갈등 관련 신살
    "원진살": {
        "score_self": -2,
        "score_both": -7,
        "score_partner": -3,
        "meaning": "원망, 갈등",
        "compatibility_effect": "숨겨진 불만이 쌓일 수 있음",
        "astro_parallel": "Chiron-Dejanira conjunction"
    },

    # 권력/리더십 관련 신살
    "괴강살": {
        "score_self": 1,
        "score_both": -4,  # 둘 다 강하면 충돌
        "score_partner": 2,  # 상대가 강하면 이끌어줌
        "meaning": "강한 개성, 권력",
        "compatibility_effect": "한 명이 리더십을 가지면 좋음",
        "astro_parallel": "Pluto-Sun conjunction"
    },
    "장성": {
        "score_self": 2,
        "score_both": 5,
        "score_partner": 3,
        "meaning": "리더십, 통솔력",
        "compatibility_effect": "함께 목표를 향해 나아가는 관계",
        "astro_parallel": "Mars-Pallas conjunction"
    },

    # 기타 길신
    "천의성": {
        "score_self": 2,
        "score_both": 6,
        "score_partner": 3,
        "meaning": "치유 능력",
        "compatibility_effect": "서로의 상처를 치유하는 관계",
        "astro_parallel": "Chiron-Hygiea conjunction"
    },
    "천복성": {
        "score_self": 3,
        "score_both": 8,
        "score_partner": 4,
        "meaning": "타고난 복",
        "compatibility_effect": "함께 있으면 행운이 찾아오는 관계",
        "astro_parallel": "Jupiter-Fortuna conjunction"
    },
    "삼기성": {
        "score_self": 2,
        "score_both": 7,
        "score_partner": 4,
        "meaning": "특별한 재능",
        "compatibility_effect": "특별하고 유니크한 커플",
        "astro_parallel": "Uranus-Psyche conjunction"
    },
    "천관성": {
        "score_self": 2,
        "score_both": 5,
        "score_partner": 3,
        "meaning": "관직, 명예",
        "compatibility_effect": "사회적으로 인정받는 커플",
        "astro_parallel": "Saturn-Juno conjunction"
    }
}

# 신살 판정용 데이터 (일간 기준 지지)
SHINSAL_DETERMINATION = {
    # 도화살: 일지/년지 기준 (寅午戌-卯, 巳酉丑-午, 申子辰-酉, 亥卯未-子)
    "도화살": {
        "寅": "卯", "午": "卯", "戌": "卯",
        "巳": "午", "酉": "午", "丑": "午",
        "申": "酉", "子": "酉", "辰": "酉",
        "亥": "子", "卯": "子", "未": "子"
    },
    # 역마살: 일지/년지 기준 (寅午戌-申, 巳酉丑-亥, 申子辰-寅, 亥卯未-巳)
    "역마살": {
        "寅": "申", "午": "申", "戌": "申",
        "巳": "亥", "酉": "亥", "丑": "亥",
        "申": "寅", "子": "寅", "辰": "寅",
        "亥": "巳", "卯": "巳", "未": "巳"
    },
    # 화개살: 일지/년지 기준 (寅午戌-戌, 巳酉丑-丑, 申子辰-辰, 亥卯未-未)
    "화개살": {
        "寅": "戌", "午": "戌", "戌": "戌",
        "巳": "丑", "酉": "丑", "丑": "丑",
        "申": "辰", "子": "辰", "辰": "辰",
        "亥": "未", "卯": "未", "未": "未"
    }
}

# 귀인 판정용 데이터 (일간 기준)
GUIIN_DETERMINATION = {
    # 천을귀인: 일간 기준
    "천을귀인": {
        "甲": ["丑", "未"], "戊": ["丑", "未"],
        "乙": ["子", "申"], "己": ["子", "申"],
        "丙": ["亥", "酉"], "丁": ["亥", "酉"],
        "庚": ["丑", "未"], "辛": ["寅", "午"],
        "壬": ["卯", "巳"], "癸": ["卯", "巳"]
    },
    # 문창귀인: 일간 기준
    "문창귀인": {
        "甲": "巳", "乙": "午", "丙": "申", "丁": "酉",
        "戊": "申", "己": "酉", "庚": "亥", "辛": "子",
        "壬": "寅", "癸": "卯"
    }
}
