# backend_ai/app/tarot/personalization_data.py
"""
Tarot Personalization Data
==========================
Tier 4: 개인화 관련 상수
- 탄생 카드 매핑
- 연간 테마 사이클
"""

# 탄생 카드 매핑 (Life Path → Major Arcana)
BIRTH_CARD_MAP = {
    1: {'primary': 'The Magician', 'secondary': None, 'korean': '마법사', 'traits': ['창조력', '의지력', '새로운 시작']},
    2: {'primary': 'The High Priestess', 'secondary': None, 'korean': '여교황', 'traits': ['직관', '신비', '내면 지혜']},
    3: {'primary': 'The Empress', 'secondary': None, 'korean': '여황제', 'traits': ['풍요', '창조', '양육']},
    4: {'primary': 'The Emperor', 'secondary': None, 'korean': '황제', 'traits': ['구조', '권위', '안정']},
    5: {'primary': 'The Hierophant', 'secondary': None, 'korean': '교황', 'traits': ['전통', '가르침', '영적 지도']},
    6: {'primary': 'The Lovers', 'secondary': None, 'korean': '연인들', 'traits': ['사랑', '선택', '관계']},
    7: {'primary': 'The Chariot', 'secondary': None, 'korean': '전차', 'traits': ['의지', '승리', '결단']},
    8: {'primary': 'Strength', 'secondary': None, 'korean': '힘', 'traits': ['내면의 힘', '용기', '인내']},
    9: {'primary': 'The Hermit', 'secondary': None, 'korean': '은둔자', 'traits': ['지혜', '내면 탐구', '고독']},
    10: {'primary': 'Wheel of Fortune', 'secondary': 'The Magician', 'korean': '운명의 수레바퀴', 'traits': ['변화', '운명', '순환']},
    11: {'primary': 'Justice', 'secondary': 'The High Priestess', 'korean': '정의', 'traits': ['공정', '진실', '균형']},
    12: {'primary': 'The Hanged Man', 'secondary': 'The Empress', 'korean': '매달린 사람', 'traits': ['희생', '관점 전환', '깨달음']},
    13: {'primary': 'Death', 'secondary': 'The Emperor', 'korean': '죽음', 'traits': ['변환', '끝과 시작', '재탄생']},
    14: {'primary': 'Temperance', 'secondary': 'The Hierophant', 'korean': '절제', 'traits': ['균형', '조화', '중용']},
    15: {'primary': 'The Devil', 'secondary': 'The Lovers', 'korean': '악마', 'traits': ['욕망', '속박', '그림자']},
    16: {'primary': 'The Tower', 'secondary': 'The Chariot', 'korean': '탑', 'traits': ['파괴', '각성', '해방']},
    17: {'primary': 'The Star', 'secondary': 'Strength', 'korean': '별', 'traits': ['희망', '영감', '치유']},
    18: {'primary': 'The Moon', 'secondary': 'The Hermit', 'korean': '달', 'traits': ['환상', '무의식', '직관']},
    19: {'primary': 'The Sun', 'secondary': 'Wheel of Fortune', 'korean': '태양', 'traits': ['기쁨', '성공', '활력']},
    20: {'primary': 'Judgement', 'secondary': 'The High Priestess', 'korean': '심판', 'traits': ['각성', '소명', '재생']},
    21: {'primary': 'The World', 'secondary': 'The Empress', 'korean': '세계', 'traits': ['완성', '통합', '성취']},
    22: {'primary': 'The Fool', 'secondary': 'The Emperor', 'korean': '바보', 'traits': ['새 시작', '순수', '모험']},
}

# 연간 테마 사이클
YEAR_THEMES = {
    1: {'theme': '새로운 시작', 'korean': '씨앗을 뿌리는 해', 'advice': '새로운 것을 시작하세요. 두려움 없이 도전하세요.'},
    2: {'theme': '인내와 협력', 'korean': '기다림과 파트너십의 해', 'advice': '서두르지 마세요. 협력과 조화를 추구하세요.'},
    3: {'theme': '창조와 표현', 'korean': '창조력이 폭발하는 해', 'advice': '자신을 표현하세요. 창의적인 프로젝트에 집중하세요.'},
    4: {'theme': '기초 다지기', 'korean': '안정을 구축하는 해', 'advice': '기초를 탄탄히 하세요. 장기 계획을 세우세요.'},
    5: {'theme': '변화와 자유', 'korean': '변화의 바람이 부는 해', 'advice': '변화를 수용하세요. 자유를 향해 나아가세요.'},
    6: {'theme': '사랑과 책임', 'korean': '관계와 가정의 해', 'advice': '사랑하는 이들에게 집중하세요. 책임을 다하세요.'},
    7: {'theme': '내면 탐구', 'korean': '영적 성장의 해', 'advice': '내면을 들여다보세요. 배움과 성찰의 시간입니다.'},
    8: {'theme': '성취와 풍요', 'korean': '수확의 해', 'advice': '야망을 추구하세요. 물질적 성공을 이룰 때입니다.'},
    9: {'theme': '완성과 해방', 'korean': '마무리의 해', 'advice': '불필요한 것을 놓으세요. 한 사이클이 끝납니다.'},
}
