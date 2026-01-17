# backend_ai/app/rendering/constants.py
"""
Rendering Constants
===================
십신(十神) 의미 및 번역 데이터
"""

from typing import Dict, Any

# ============================================================
# 십신(十神)별 상세 의미 데이터
# ============================================================
SIBSIN_MEANINGS: Dict[str, Dict[str, str]] = {
    "비견": {
        "meaning": "경쟁과 협력의 에너지",
        "career": "동업, 협업 기회. 경쟁자가 많지만 함께 성장 가능.",
        "love": "친구 같은 연인, 동등한 관계. 경쟁심이 연애에 방해될 수 있음.",
        "wealth": "나눠야 할 일이 생김. 공동투자 주의.",
        "timing": "새로운 인맥, 경쟁 상황, 독립 욕구가 강해지는 시기",
    },
    "겁재": {
        "meaning": "강한 추진력과 도전의 에너지",
        "career": "적극적 행동이 필요한 시기. 과감한 도전이 성과로.",
        "love": "강렬한 끌림, 삼각관계 주의. 밀당보다 직진이 유리.",
        "wealth": "과감한 투자 유혹. 도박성 투자 경계, 손재수 주의.",
        "timing": "결단이 필요한 시기, 과감한 행동이 좋은 결과를 만듦",
    },
    "식신": {
        "meaning": "창의성과 표현의 에너지",
        "career": "창작, 기획, 아이디어가 빛나는 시기. 부업 수입 가능.",
        "love": "편안하고 즐거운 연애. 함께 맛집 탐방, 여행이 좋음.",
        "wealth": "자연스러운 수입 증가. 재능으로 돈 버는 기회.",
        "timing": "창의력 폭발, 새로운 취미나 부업 시작하기 좋은 시기",
    },
    "상관": {
        "meaning": "자유와 변화의 에너지",
        "career": "기존 틀을 깨는 혁신. 이직, 전직 욕구. 프리랜서 유리.",
        "love": "자유로운 연애, 기존 관계에 변화. 권위적 상대와 충돌.",
        "wealth": "불안정하지만 큰 기회도. 투기성 수입 가능.",
        "timing": "변화와 혁신의 시기, 구속에서 벗어나고 싶은 욕구",
    },
    "편재": {
        "meaning": "활동적 재물 에너지",
        "career": "영업, 투자, 사업 확장에 유리. 움직여야 돈이 됨.",
        "love": "새로운 만남 많음. 바람기 주의, 가벼운 인연이 될 수 있음.",
        "wealth": "큰 돈이 들어오고 나감. 투자 기회지만 리스크도 큼.",
        "timing": "재물 기회가 많은 시기, 적극적 행동이 수입으로 연결",
    },
    "정재": {
        "meaning": "안정적 재물 에너지",
        "career": "안정적 수입, 승진. 꾸준한 노력이 인정받는 시기.",
        "love": "진지한 만남, 결혼으로 이어질 인연. 가정적인 상대.",
        "wealth": "월급, 이자, 안정적 수입 증가. 저축하기 좋은 시기.",
        "timing": "안정과 축적의 시기, 결혼/내 집 마련 등 정착 기회",
    },
    "편관": {
        "meaning": "도전과 압박의 에너지",
        "career": "승진 기회지만 경쟁 치열. 책임 증가, 스트레스 관리 필요.",
        "love": "강렬한 끌림, 나쁜 남자/여자에게 끌릴 수 있음. 조심!",
        "wealth": "예상치 못한 지출. 법적 문제, 벌금 주의.",
        "timing": "시련이 있지만 성장의 기회, 버티면 인정받는 시기",
    },
    "정관": {
        "meaning": "명예와 책임의 에너지",
        "career": "승진, 취업 성공. 사회적 인정, 책임 있는 위치.",
        "love": "결혼운 상승! 공식적인 관계로 발전. 안정적인 상대.",
        "wealth": "정당한 대가, 월급 인상. 큰 투자보다 안정 추구.",
        "timing": "사회적 인정, 결혼, 승진 등 공식적인 변화의 시기",
    },
    "편인": {
        "meaning": "학습과 변화의 에너지",
        "career": "새로운 분야 학습, 자격증, 이직 준비에 좋은 시기.",
        "love": "비밀 연애, 색다른 만남. 기존 관계에 권태기.",
        "wealth": "불안정하지만 새로운 수입원. 부업, 투잡 가능.",
        "timing": "배움과 변화의 시기, 새로운 것에 도전하기 좋음",
    },
    "정인": {
        "meaning": "지원과 보호의 에너지",
        "career": "귀인의 도움, 멘토 출현. 학업, 자격증 취득 유리.",
        "love": "보살핌 받는 연애. 연상 인연, 소개팅 성사율 높음.",
        "wealth": "부모님 지원, 상속, 선물 등 노력 없이 들어오는 재물.",
        "timing": "도움과 지원이 있는 시기, 배움을 통한 성장",
    },
}

# ============================================================
# Sibsin English translations
# ============================================================
SIBSIN_EN: Dict[str, str] = {
    "비견": "Competitive energy - rivalry and cooperation",
    "겁재": "Bold drive - challenges and ambition",
    "식신": "Creative energy - ideas and expression",
    "상관": "Free spirit - change and innovation",
    "편재": "Active wealth - dynamic income opportunities",
    "정재": "Stable wealth - steady income growth",
    "편관": "Challenge energy - pressure and growth",
    "정관": "Honor and responsibility - recognition time",
    "편인": "Learning energy - new skills and change",
    "정인": "Support energy - mentors and protection",
}

# ============================================================
# 오행(五行) 매핑
# ============================================================
ELEMENT_NAMES: Dict[str, Dict[str, str]] = {
    "목": {"ko": "목(木)", "en": "Wood", "emoji": "🌳"},
    "화": {"ko": "화(火)", "en": "Fire", "emoji": "🔥"},
    "토": {"ko": "토(土)", "en": "Earth", "emoji": "🏔️"},
    "금": {"ko": "금(金)", "en": "Metal", "emoji": "⚔️"},
    "수": {"ko": "수(水)", "en": "Water", "emoji": "💧"},
}

# ============================================================
# 운세 레벨 매핑
# ============================================================
FORTUNE_LEVELS: Dict[str, Dict[str, Any]] = {
    "excellent": {"ko": "대길", "en": "Excellent", "score_range": (80, 100), "emoji": "🌟"},
    "good": {"ko": "길", "en": "Good", "score_range": (60, 79), "emoji": "✨"},
    "neutral": {"ko": "보통", "en": "Neutral", "score_range": (40, 59), "emoji": "☁️"},
    "caution": {"ko": "주의", "en": "Caution", "score_range": (20, 39), "emoji": "⚠️"},
    "difficult": {"ko": "흉", "en": "Difficult", "score_range": (0, 19), "emoji": "🌧️"},
}

# ============================================================
# 테마별 아이콘 매핑
# ============================================================
THEME_ICONS: Dict[str, str] = {
    "career": "💼",
    "love": "💕",
    "wealth": "💰",
    "health": "🏥",
    "study": "📚",
    "travel": "✈️",
    "relationship": "👥",
    "family": "👨‍👩‍👧‍👦",
    "timing": "⏰",
    "general": "🔮",
}
