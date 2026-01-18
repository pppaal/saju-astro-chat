# backend_ai/app/compatibility/elements.py
"""
Element Mapping Constants
=========================
오행(五行)과 점성술 원소(Element) 간 매핑 상수
"""

# 오행 → 점성술 원소
OHENG_TO_ASTRO = {
    "木": "air", "wood": "air",
    "火": "fire", "fire": "fire",
    "土": "earth", "earth": "earth",
    "金": "air", "metal": "air",  # 金 maps to Air/Earth
    "水": "water", "water": "water",
}

# 점성술 원소 → 오행
ASTRO_ELEMENT_TO_OHENG = {
    "fire": "火",
    "earth": "土",
    "air": "木",  # or 金
    "water": "水",
}

# 지지별 오행
BRANCH_ELEMENTS = {
    "寅": "木", "卯": "木",
    "巳": "火", "午": "火",
    "辰": "土", "戌": "土", "丑": "土", "未": "土",
    "申": "金", "酉": "金",
    "亥": "水", "子": "水",
}

# 월별 지지 순서
MONTH_BRANCHES = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"]

# 오행 순서
OHENG_ORDER = ["木", "火", "土", "金", "水"]

# 천간별 오행
STEM_TO_ELEMENT = {
    "甲": "木", "乙": "木",
    "丙": "火", "丁": "火",
    "戊": "土", "己": "土",
    "庚": "金", "辛": "金",
    "壬": "水", "癸": "水",
}

# 천간별 음양
STEM_POLARITY = {
    "甲": "양", "乙": "음",
    "丙": "양", "丁": "음",
    "戊": "양", "己": "음",
    "庚": "양", "辛": "음",
    "壬": "양", "癸": "음",
}

# 점성술 별자리 원소
ZODIAC_ELEMENTS = {
    "aries": "fire", "leo": "fire", "sagittarius": "fire",
    "taurus": "earth", "virgo": "earth", "capricorn": "earth",
    "gemini": "air", "libra": "air", "aquarius": "air",
    "cancer": "water", "scorpio": "water", "pisces": "water",
    # Korean
    "양자리": "fire", "사자자리": "fire", "사수자리": "fire",
    "황소자리": "earth", "처녀자리": "earth", "염소자리": "earth",
    "쌍둥이자리": "air", "천칭자리": "air", "물병자리": "air",
    "게자리": "water", "전갈자리": "water", "물고기자리": "water",
}

# 점성술 원소 궁합 점수
ASTRO_ELEMENT_COMPATIBILITY = {
    ("fire", "fire"): {"score": 85, "meaning": "열정적이지만 충돌 주의"},
    ("fire", "air"): {"score": 92, "meaning": "완벽한 조화, 서로를 키워줌"},
    ("fire", "earth"): {"score": 65, "meaning": "보완 관계, 인내 필요"},
    ("fire", "water"): {"score": 55, "meaning": "반대 에너지, 조절 필요"},
    ("earth", "earth"): {"score": 80, "meaning": "안정적이지만 변화 부족"},
    ("earth", "water"): {"score": 88, "meaning": "서로를 키우는 관계"},
    ("earth", "air"): {"score": 60, "meaning": "다른 속도, 조율 필요"},
    ("air", "air"): {"score": 82, "meaning": "지적 교감, 감정 부족 주의"},
    ("air", "water"): {"score": 58, "meaning": "이해하기 어려움, 노력 필요"},
    ("water", "water"): {"score": 78, "meaning": "깊은 교감, 감정 과잉 주의"},
}

# 점성술 별자리 반대궁 (끌림이 있지만 충돌 가능)
ZODIAC_OPPOSITES = {
    "aries": "libra", "taurus": "scorpio", "gemini": "sagittarius",
    "cancer": "capricorn", "leo": "aquarius", "virgo": "pisces",
    "libra": "aries", "scorpio": "taurus", "sagittarius": "gemini",
    "capricorn": "cancer", "aquarius": "leo", "pisces": "virgo",
}

# 별자리 경도 (0-360도) - 각 별자리의 시작점
ZODIAC_DEGREES = {
    "aries": 0, "양자리": 0,
    "taurus": 30, "황소자리": 30,
    "gemini": 60, "쌍둥이자리": 60,
    "cancer": 90, "게자리": 90,
    "leo": 120, "사자자리": 120,
    "virgo": 150, "처녀자리": 150,
    "libra": 180, "천칭자리": 180,
    "scorpio": 210, "전갈자리": 210,
    "sagittarius": 240, "사수자리": 240,
    "capricorn": 270, "염소자리": 270,
    "aquarius": 300, "물병자리": 300,
    "pisces": 330, "물고기자리": 330,
}
