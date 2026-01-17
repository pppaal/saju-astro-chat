# backend_ai/app/iching/constants.py
"""
I Ching Constants
=================
Five Elements (오행), Trigrams (팔괘), Solar Terms (24절기) 등 상수
"""

# 오행 상생 (생하는 관계: 木→火→土→金→水→木)
WUXING_GENERATING = {
    "wood": "fire",    # 목생화
    "fire": "earth",   # 화생토
    "earth": "metal",  # 토생금
    "metal": "water",  # 금생수
    "water": "wood",   # 수생목
}

# 오행 상극 (극하는 관계: 木→土→水→火→金→木)
WUXING_OVERCOMING = {
    "wood": "earth",   # 목극토
    "earth": "water",  # 토극수
    "water": "fire",   # 수극화
    "fire": "metal",   # 화극금
    "metal": "wood",   # 금극목
}

# 오행 한글명
WUXING_KOREAN = {
    "wood": "목(木)",
    "fire": "화(火)",
    "earth": "토(土)",
    "metal": "금(金)",
    "water": "수(水)",
}

# 팔괘 (Eight Trigrams) 정보
TRIGRAM_INFO = {
    "heaven": {"korean": "건(乾)", "nature": "하늘", "element": "metal", "direction": "서북", "family": "부", "body": "머리", "symbol": "☰", "image": "강건함, 창조, 리더십"},
    "earth": {"korean": "곤(坤)", "nature": "땅", "element": "earth", "direction": "서남", "family": "모", "body": "배", "symbol": "☷", "image": "수용, 포용, 헌신"},
    "thunder": {"korean": "진(震)", "nature": "우레", "element": "wood", "direction": "동", "family": "장남", "body": "발", "symbol": "☳", "image": "움직임, 시작, 충격"},
    "water": {"korean": "감(坎)", "nature": "물", "element": "water", "direction": "북", "family": "중남", "body": "귀", "symbol": "☵", "image": "위험, 흐름, 지혜"},
    "mountain": {"korean": "간(艮)", "nature": "산", "element": "earth", "direction": "동북", "family": "소남", "body": "손", "symbol": "☶", "image": "멈춤, 안정, 명상"},
    "wind": {"korean": "손(巽)", "nature": "바람", "element": "wood", "direction": "동남", "family": "장녀", "body": "넓적다리", "symbol": "☴", "image": "침투, 유연함, 순종"},
    "fire": {"korean": "리(離)", "nature": "불", "element": "fire", "direction": "남", "family": "중녀", "body": "눈", "symbol": "☲", "image": "밝음, 아름다움, 명료"},
    "lake": {"korean": "태(兌)", "nature": "연못", "element": "metal", "direction": "서", "family": "소녀", "body": "입", "symbol": "☱", "image": "기쁨, 소통, 교환"},
}

# 효위(爻位) 의미
LINE_POSITION_MEANING = {
    1: {"name": "초효", "meaning": "시작, 잠재력, 기반", "society": "서민", "body": "발", "stage": "맹아기"},
    2: {"name": "이효", "meaning": "내면의 중심, 성장", "society": "관리", "body": "종아리", "stage": "발전기"},
    3: {"name": "삼효", "meaning": "내외 경계, 위기와 전환", "society": "대부", "body": "허리", "stage": "전환기"},
    4: {"name": "사효", "meaning": "외부 진입, 신중함", "society": "공경", "body": "가슴", "stage": "도약기"},
    5: {"name": "오효", "meaning": "군위, 정점, 중정", "society": "군주", "body": "어깨", "stage": "전성기"},
    6: {"name": "상효", "meaning": "극점, 마무리, 물러남", "society": "종묘", "body": "머리", "stage": "완성기"},
}

# 24절기와 괘의 연관
SOLAR_TERMS = [
    ("입춘", 2, 4), ("우수", 2, 19), ("경칩", 3, 6), ("춘분", 3, 21),
    ("청명", 4, 5), ("곡우", 4, 20), ("입하", 5, 6), ("소만", 5, 21),
    ("망종", 6, 6), ("하지", 6, 21), ("소서", 7, 7), ("대서", 7, 23),
    ("입추", 8, 8), ("처서", 8, 23), ("백로", 9, 8), ("추분", 9, 23),
    ("한로", 10, 8), ("상강", 10, 24), ("입동", 11, 8), ("소설", 11, 22),
    ("대설", 12, 7), ("동지", 12, 22), ("소한", 1, 6), ("대한", 1, 20),
]

# 계절별 유리한 오행
SEASON_ELEMENT = {
    "spring": {"element": "wood", "korean": "봄 - 목(木)의 계절"},
    "summer": {"element": "fire", "korean": "여름 - 화(火)의 계절"},
    "late_summer": {"element": "earth", "korean": "환절기 - 토(土)의 계절"},
    "autumn": {"element": "metal", "korean": "가을 - 금(金)의 계절"},
    "winter": {"element": "water", "korean": "겨울 - 수(水)의 계절"},
}
