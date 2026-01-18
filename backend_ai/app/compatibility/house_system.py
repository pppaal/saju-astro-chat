# backend_ai/app/compatibility/house_system.py
"""
House System Constants
======================
12하우스 시스템 및 ASC/DSC 궁합 분석 상수
"""

# ===============================================================
# 12하우스 시스템 - 지지↔하우스 완전 매핑
# ===============================================================

# 지지 → 하우스 매핑
BRANCH_TO_HOUSE = {
    "子": {"primary": 4, "secondary": 8, "theme": "가정/뿌리, 변형/심층"},
    "丑": {"primary": 2, "secondary": 6, "theme": "재물/가치, 건강/봉사"},
    "寅": {"primary": 1, "secondary": 9, "theme": "자아/시작, 확장/철학"},
    "卯": {"primary": 3, "secondary": 7, "theme": "소통/이동, 관계/파트너"},
    "辰": {"primary": 10, "secondary": 1, "theme": "커리어/명예, 자아"},
    "巳": {"primary": 8, "secondary": 12, "theme": "변형/심층, 무의식/영성"},
    "午": {"primary": 5, "secondary": 9, "theme": "창조/기쁨, 확장/철학"},
    "未": {"primary": 6, "secondary": 4, "theme": "건강/봉사, 가정/뿌리"},
    "申": {"primary": 3, "secondary": 11, "theme": "소통/이동, 친구/희망"},
    "酉": {"primary": 7, "secondary": 2, "theme": "관계/파트너, 재물/가치"},
    "戌": {"primary": 11, "secondary": 7, "theme": "친구/희망, 관계/파트너"},
    "亥": {"primary": 12, "secondary": 4, "theme": "무의식/영성, 가정/뿌리"},
}

# 하우스 궁합 의미
HOUSE_COMPATIBILITY_MEANING = {
    1: {"name": "1하우스 (자아)", "theme": "서로의 정체성 이해", "positive": "진정한 자아 인정", "negative": "자아 충돌"},
    2: {"name": "2하우스 (재물)", "theme": "가치관과 재정", "positive": "물질적 안정 공유", "negative": "금전 갈등"},
    3: {"name": "3하우스 (소통)", "theme": "일상 소통", "positive": "대화가 잘 통함", "negative": "소통 불통"},
    4: {"name": "4하우스 (가정)", "theme": "가정생활", "positive": "편안한 가정 형성", "negative": "가정 불화"},
    5: {"name": "5하우스 (창조)", "theme": "로맨스와 즐거움", "positive": "즐거운 관계", "negative": "재미 부족"},
    6: {"name": "6하우스 (건강)", "theme": "일상과 봉사", "positive": "서로 돌봄", "negative": "일상 갈등"},
    7: {"name": "7하우스 (파트너십)", "theme": "결혼/파트너", "positive": "완벽한 파트너", "negative": "파트너십 문제"},
    8: {"name": "8하우스 (변형)", "theme": "깊은 유대", "positive": "영혼의 연결", "negative": "집착/갈등"},
    9: {"name": "9하우스 (확장)", "theme": "성장과 철학", "positive": "함께 성장", "negative": "가치관 차이"},
    10: {"name": "10하우스 (커리어)", "theme": "사회적 성취", "positive": "커플 목표 달성", "negative": "경쟁"},
    11: {"name": "11하우스 (친구)", "theme": "우정과 희망", "positive": "친구 같은 연인", "negative": "목표 불일치"},
    12: {"name": "12하우스 (영성)", "theme": "영적 연결", "positive": "전생의 인연", "negative": "미묘한 갈등"},
}

# 하우스 축 호환성 (1-7, 2-8, 3-9, 4-10, 5-11, 6-12)
HOUSE_AXIS_COMPATIBILITY = {
    (1, 7): {"score": 10, "meaning": "자아-관계 축: 완벽한 파트너십 에너지"},
    (2, 8): {"score": 9, "meaning": "가치-변형 축: 깊은 재정/감정적 유대"},
    (3, 9): {"score": 8, "meaning": "소통-철학 축: 지적 교류와 성장"},
    (4, 10): {"score": 9, "meaning": "가정-커리어 축: 안정과 성취의 균형"},
    (5, 11): {"score": 8, "meaning": "창조-희망 축: 즐거움과 미래 비전"},
    (6, 12): {"score": 7, "meaning": "봉사-영성 축: 서로를 위한 헌신"},
}

# 같은 하우스 점수
SAME_HOUSE_SCORE = {
    1: {"score": 7, "meaning": "같은 자아 에너지 - 이해 빠름, 경쟁 가능"},
    2: {"score": 8, "meaning": "같은 가치관 - 재정적 조화"},
    3: {"score": 7, "meaning": "같은 소통 스타일 - 대화 잘 통함"},
    4: {"score": 9, "meaning": "같은 가정 에너지 - 편안함"},
    5: {"score": 8, "meaning": "같은 창조 에너지 - 즐거움"},
    6: {"score": 6, "meaning": "같은 봉사 에너지 - 실용적"},
    7: {"score": 10, "meaning": "같은 파트너십 - 완벽한 매칭"},
    8: {"score": 7, "meaning": "같은 변형 에너지 - 깊이 있지만 강렬"},
    9: {"score": 8, "meaning": "같은 확장 에너지 - 함께 성장"},
    10: {"score": 6, "meaning": "같은 야망 - 경쟁 가능"},
    11: {"score": 8, "meaning": "같은 희망 - 친구같은 관계"},
    12: {"score": 7, "meaning": "같은 영성 - 깊은 이해, 미묘함"},
}

# ===============================================================
# ASC/DSC (어센던트/디센던트) 궁합 분석
# ===============================================================

# ASC Sign → 성격/외적 이미지
ASC_SIGN_TRAITS = {
    "aries": {"trait": "적극적, 리더십", "approach": "직접적", "first_impression": "강렬하고 자신감 있음"},
    "taurus": {"trait": "안정적, 감각적", "approach": "신중한", "first_impression": "편안하고 신뢰감"},
    "gemini": {"trait": "지적, 사교적", "approach": "호기심 많은", "first_impression": "재미있고 다재다능"},
    "cancer": {"trait": "보호적, 감성적", "approach": "돌봄형", "first_impression": "따뜻하고 가정적"},
    "leo": {"trait": "화려함, 자신감", "approach": "드라마틱", "first_impression": "빛나고 주목받음"},
    "virgo": {"trait": "분석적, 실용적", "approach": "꼼꼼한", "first_impression": "정돈되고 지적"},
    "libra": {"trait": "조화, 예술적", "approach": "외교적", "first_impression": "매력적이고 세련됨"},
    "scorpio": {"trait": "강렬함, 신비로움", "approach": "깊이 있는", "first_impression": "미스터리하고 강렬"},
    "sagittarius": {"trait": "자유, 낙관적", "approach": "모험적", "first_impression": "쾌활하고 열린"},
    "capricorn": {"trait": "야망, 책임감", "approach": "진지한", "first_impression": "성숙하고 신뢰감"},
    "aquarius": {"trait": "독창적, 혁신적", "approach": "독립적", "first_impression": "독특하고 지적"},
    "pisces": {"trait": "직관적, 예술적", "approach": "공감적", "first_impression": "몽환적이고 부드러움"},
}

# ASC-DSC 축 궁합 (내 ASC가 상대 DSC에 해당하면 운명적)
ASC_DSC_COMPATIBILITY = {
    # 완벽한 축 (ASC-DSC 일치)
    "perfect_axis": {"score": 15, "meaning": "운명적 끌림! 서로가 찾던 파트너상"},
    # 같은 ASC
    "same_asc": {"score": 8, "meaning": "비슷한 외적 이미지, 공감대 형성"},
    # 같은 원소 ASC
    "same_element_asc": {"score": 6, "meaning": "비슷한 접근 방식"},
    # 상극 원소 ASC
    "opposing_element_asc": {"score": 3, "meaning": "다른 스타일, 보완 가능"},
}

# DSC = 내가 원하는 파트너상
DSC_PARTNER_NEEDS = {
    "aries": "독립적이고 자신감 있는 파트너",  # ASC Libra의 DSC
    "taurus": "안정적이고 감각적인 파트너",    # ASC Scorpio의 DSC
    "gemini": "지적이고 소통 잘되는 파트너",   # ASC Sagittarius의 DSC
    "cancer": "따뜻하고 보호해주는 파트너",    # ASC Capricorn의 DSC
    "leo": "자신감 있고 빛나는 파트너",        # ASC Aquarius의 DSC
    "virgo": "실용적이고 세심한 파트너",       # ASC Pisces의 DSC
    "libra": "조화롭고 예술적인 파트너",       # ASC Aries의 DSC
    "scorpio": "깊이 있고 충실한 파트너",      # ASC Taurus의 DSC
    "sagittarius": "자유롭고 낙관적인 파트너", # ASC Gemini의 DSC
    "capricorn": "책임감 있고 성숙한 파트너",  # ASC Cancer의 DSC
    "aquarius": "독특하고 혁신적인 파트너",    # ASC Leo의 DSC
    "pisces": "영적이고 공감적인 파트너",      # ASC Virgo의 DSC
}
