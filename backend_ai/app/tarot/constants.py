# backend_ai/app/tarot/constants.py
"""
Tarot Constants
===============
타로 분석에 사용되는 상수 정의
"""

# 슈트별 원소와 의미
SUIT_INFO = {
    'Wands': {
        'element': 'Fire',
        'korean': '완드',
        'themes': ['열정', '창의성', '행동', '영감', '야망'],
        'energy': 'active',
        'direction': 'outward',
    },
    'Cups': {
        'element': 'Water',
        'korean': '컵',
        'themes': ['감정', '관계', '직관', '사랑', '치유'],
        'energy': 'passive',
        'direction': 'inward',
    },
    'Swords': {
        'element': 'Air',
        'korean': '소드',
        'themes': ['지성', '갈등', '진실', '결정', '소통'],
        'energy': 'active',
        'direction': 'outward',
    },
    'Pentacles': {
        'element': 'Earth',
        'korean': '펜타클',
        'themes': ['물질', '재정', '건강', '직업', '안정'],
        'energy': 'passive',
        'direction': 'inward',
    },
    'Major': {
        'element': 'Spirit',
        'korean': '메이저 아르카나',
        'themes': ['운명', '카르마', '인생 교훈', '영적 성장', '중요한 전환점'],
        'energy': 'transcendent',
        'direction': 'vertical',
    }
}

# 숫자별 수비학적 의미
NUMEROLOGY = {
    0: {'meaning': '무한한 가능성', 'korean': '시작 전의 잠재력', 'energy': 'potential'},
    1: {'meaning': '시작', 'korean': '새로운 시작, 독립, 의지', 'energy': 'initiating'},
    2: {'meaning': '균형', 'korean': '이중성, 파트너십, 선택', 'energy': 'balancing'},
    3: {'meaning': '창조', 'korean': '표현, 성장, 확장', 'energy': 'creating'},
    4: {'meaning': '안정', 'korean': '기초, 구조, 휴식', 'energy': 'stabilizing'},
    5: {'meaning': '변화', 'korean': '갈등, 도전, 성장통', 'energy': 'changing'},
    6: {'meaning': '조화', 'korean': '사랑, 치유, 책임', 'energy': 'harmonizing'},
    7: {'meaning': '성찰', 'korean': '분석, 신비, 내면 탐구', 'energy': 'reflecting'},
    8: {'meaning': '힘', 'korean': '성취, 권력, 순환', 'energy': 'empowering'},
    9: {'meaning': '완성', 'korean': '지혜, 완료, 초월', 'energy': 'completing'},
    10: {'meaning': '전환', 'korean': '사이클 종료, 새 시작 준비', 'energy': 'transitioning'},
}

# 궁정 카드 랭크
COURT_RANKS = {
    'Page': {'korean': '페이지', 'meaning': '메시지, 학습, 호기심', 'maturity': 1},
    'Knight': {'korean': '나이트', 'meaning': '행동, 추구, 모험', 'maturity': 2},
    'Queen': {'korean': '퀸', 'meaning': '내면화, 양육, 직관', 'maturity': 3},
    'King': {'korean': '킹', 'meaning': '숙달, 권위, 리더십', 'maturity': 4},
}

# 원소 상호작용
ELEMENT_INTERACTIONS = {
    ('Fire', 'Fire'): {'type': 'amplify', 'korean': '열정 폭발', 'effect': 1.5},
    ('Fire', 'Air'): {'type': 'support', 'korean': '불길 확산', 'effect': 1.3},
    ('Fire', 'Water'): {'type': 'conflict', 'korean': '증발/소멸', 'effect': -0.5},
    ('Fire', 'Earth'): {'type': 'neutral', 'korean': '굳히기', 'effect': 0},
    ('Water', 'Water'): {'type': 'amplify', 'korean': '감정 심화', 'effect': 1.5},
    ('Water', 'Earth'): {'type': 'support', 'korean': '성장 촉진', 'effect': 1.3},
    ('Water', 'Air'): {'type': 'conflict', 'korean': '안개/혼란', 'effect': -0.3},
    ('Air', 'Air'): {'type': 'amplify', 'korean': '사고 가속', 'effect': 1.5},
    ('Air', 'Earth'): {'type': 'conflict', 'korean': '먼지/산란', 'effect': -0.3},
    ('Earth', 'Earth'): {'type': 'amplify', 'korean': '견고함', 'effect': 1.5},
}

# 극성 카드 쌍 (반대 에너지)
POLARITY_PAIRS = [
    ('The Sun', 'The Moon', '의식과 무의식의 균형'),
    ('The Empress', 'The Emperor', '여성성과 남성성의 균형'),
    ('The High Priestess', 'The Magician', '직관과 행동의 균형'),
    ('Death', 'The Star', '끝과 희망의 연결'),
    ('The Tower', 'The Star', '파괴 후 치유'),
    ('The Devil', 'The Lovers', '속박과 자유로운 선택'),
    ('The Hermit', 'The World', '내면 여정과 외부 성취'),
    ('Strength', 'The Chariot', '내면의 힘과 외적 의지'),
]

# 테마별 키워드 카드
THEME_KEY_CARDS = {
    'love': ['The Lovers', 'Two of Cups', 'The Empress', 'Ace of Cups', 'Ten of Cups'],
    'career': ['The Chariot', 'The Emperor', 'Ace of Pentacles', 'Three of Wands', 'Ten of Pentacles'],
    'money': ['Ace of Pentacles', 'Nine of Pentacles', 'Ten of Pentacles', 'King of Pentacles', 'Queen of Pentacles'],
    'health': ['The Sun', 'The Star', 'Strength', 'Temperance', 'Nine of Pentacles'],
    'spiritual': ['The High Priestess', 'The Hermit', 'The Star', 'The Moon', 'Judgement'],
    'decision': ['Justice', 'The Chariot', 'Two of Swords', 'Seven of Cups', 'The Hanged Man'],
    'timing': ['Wheel of Fortune', 'The Chariot', 'Eight of Wands', 'The Hanged Man', 'Four of Swords'],
}

# 실시간 컨텍스트용 요일-행성 매핑
WEEKDAY_PLANETS = {
    0: {'planet': 'Moon', 'korean': '달', 'themes': ['감정', '직관', '가정'], 'element': 'Water'},
    1: {'planet': 'Mars', 'korean': '화성', 'themes': ['행동', '용기', '갈등'], 'element': 'Fire'},
    2: {'planet': 'Mercury', 'korean': '수성', 'themes': ['소통', '학습', '여행'], 'element': 'Air'},
    3: {'planet': 'Jupiter', 'korean': '목성', 'themes': ['확장', '행운', '지혜'], 'element': 'Fire'},
    4: {'planet': 'Venus', 'korean': '금성', 'themes': ['사랑', '아름다움', '조화'], 'element': 'Water'},
    5: {'planet': 'Saturn', 'korean': '토성', 'themes': ['책임', '한계', '성숙'], 'element': 'Earth'},
    6: {'planet': 'Sun', 'korean': '태양', 'themes': ['자아', '성공', '활력'], 'element': 'Fire'},
}

# 달 위상 매핑
MOON_PHASES = {
    'new_moon': {
        'korean': '초승달',
        'energy': '시작',
        'best_for': ['새 시작', '계획', '의도 설정'],
        'avoid': ['결정', '마무리'],
        'boost_suits': ['Wands', 'Major'],
    },
    'waxing_crescent': {
        'korean': '초승달 → 상현달',
        'energy': '성장',
        'best_for': ['행동', '발전', '학습'],
        'avoid': ['포기', '중단'],
        'boost_suits': ['Wands', 'Pentacles'],
    },
    'first_quarter': {
        'korean': '상현달',
        'energy': '도전',
        'best_for': ['결정', '장애물 극복', '행동'],
        'avoid': ['휴식', '수동성'],
        'boost_suits': ['Swords', 'Wands'],
    },
    'waxing_gibbous': {
        'korean': '상현달 → 보름달',
        'energy': '정제',
        'best_for': ['조정', '완성 준비', '분석'],
        'avoid': ['새 시작'],
        'boost_suits': ['Pentacles', 'Cups'],
    },
    'full_moon': {
        'korean': '보름달',
        'energy': '완성/절정',
        'best_for': ['완성', '수확', '통찰', '관계 리딩'],
        'avoid': ['새 시작'],
        'boost_suits': ['Cups', 'Major'],
    },
    'waning_gibbous': {
        'korean': '보름달 → 하현달',
        'energy': '감사',
        'best_for': ['나눔', '가르침', '전달'],
        'avoid': ['새 프로젝트'],
        'boost_suits': ['Cups', 'Pentacles'],
    },
    'last_quarter': {
        'korean': '하현달',
        'energy': '정리',
        'best_for': ['정리', '버리기', '용서'],
        'avoid': ['새 관계'],
        'boost_suits': ['Swords'],
    },
    'waning_crescent': {
        'korean': '그믐달',
        'energy': '휴식',
        'best_for': ['휴식', '명상', '내면 작업'],
        'avoid': ['중요한 결정', '새 시작'],
        'boost_suits': ['Cups', 'Major'],
    },
}

# 변환 시퀀스 (카드 흐름 패턴)
TRANSFORMATION_SEQUENCES = {
    'death_rebirth': {
        'cards': ['Death', 'The Star', 'The Sun'],
        'korean': '죽음과 재탄생',
        'meaning': '어둠을 지나 빛으로. 완전한 변환의 여정.',
    },
    'tower_moment': {
        'cards': ['The Tower', 'The Star', 'The Moon'],
        'korean': '붕괴 후 치유',
        'meaning': '충격적 변화 후 희망을 찾고 내면을 탐구.',
    },
    'fools_journey_start': {
        'cards': ['The Fool', 'The Magician', 'The High Priestess'],
        'korean': '여정의 시작',
        'meaning': '새 시작, 능력 발현, 내면 지혜 접근.',
    },
    'mastery_path': {
        'cards': ['The Chariot', 'Strength', 'The Hermit'],
        'korean': '숙달의 길',
        'meaning': '외적 승리에서 내면 힘으로, 그리고 지혜로.',
    },
    'spiritual_awakening': {
        'cards': ['The Hanged Man', 'Death', 'Temperance'],
        'korean': '영적 각성',
        'meaning': '희생, 변환, 통합의 여정.',
    },
    'completion_cycle': {
        'cards': ['Judgement', 'The World', 'The Fool'],
        'korean': '순환 완성',
        'meaning': '각성, 완성, 그리고 새로운 시작.',
    },
}
