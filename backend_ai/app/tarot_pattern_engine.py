# backend_ai/app/tarot_pattern_engine.py
"""
Tarot Pattern Engine - 규칙 기반 카드 조합 분석
================================================
하드코딩 없이 모든 카드 조합을 동적으로 분석하는 엔진.
78장이든 20장이든, 새 덱이든 모두 처리 가능.

분석 항목:
1. 슈트 패턴 (Cups, Wands, Swords, Pentacles 분포)
2. 숫자 패턴 (같은 숫자, 연속 숫자, 수비학적 의미)
3. 메이저/마이너 비율
4. 궁정 카드 패턴
5. 극성/대칭 카드
6. 에너지 흐름
"""

from typing import List, Dict, Optional, Tuple, Set
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
import re


# =============================================================================
# 상수 정의
# =============================================================================

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

# =============================================================================
# 카드 관계 매트릭스 (Tier 2)
# =============================================================================

# 테마별 카드 점수 (-5 ~ +5, 0은 중립)
CARD_THEME_SCORES = {
    'love': {
        # 매우 긍정 (+4~+5)
        'The Lovers': 5, 'Two of Cups': 5, 'Ten of Cups': 5,
        'The Empress': 4, 'Ace of Cups': 4, 'Knight of Cups': 4,
        'The Sun': 4, 'The Star': 4,
        # 긍정 (+2~+3)
        'Three of Cups': 3, 'Six of Cups': 3, 'Nine of Cups': 3,
        'Queen of Cups': 3, 'King of Cups': 3, 'Page of Cups': 2,
        'Four of Wands': 3, 'The World': 3, 'Temperance': 2,
        'Strength': 2, 'The Emperor': 2, 'The Hierophant': 2,
        # 약간 부정 (-1~-2)
        'Five of Cups': -2, 'Seven of Cups': -1, 'Eight of Cups': -2,
        'Five of Wands': -1, 'Seven of Swords': -2,
        # 부정 (-3~-4)
        'Three of Swords': -4, 'Ten of Swords': -3, 'The Tower': -3,
        'Five of Pentacles': -2, 'Nine of Swords': -2,
        # 매우 부정 (-5)
        'The Devil': -4,
    },
    'career': {
        # 매우 긍정
        'The Chariot': 5, 'Ace of Pentacles': 5, 'Ten of Pentacles': 5,
        'Three of Wands': 4, 'Six of Wands': 4, 'King of Pentacles': 4,
        'The Emperor': 4, 'The World': 4, 'Wheel of Fortune': 4,
        # 긍정
        'Eight of Pentacles': 3, 'Nine of Pentacles': 3, 'The Magician': 3,
        'Ace of Wands': 3, 'Three of Pentacles': 3, 'Page of Pentacles': 2,
        'Knight of Wands': 2, 'Queen of Pentacles': 3, 'The Sun': 3,
        # 부정
        'Five of Pentacles': -3, 'Ten of Wands': -2, 'Four of Pentacles': -1,
        'Seven of Pentacles': -1, 'Eight of Cups': -2,
        'The Tower': -3, 'Death': -2,
        # 매우 부정
        'Ten of Swords': -4, 'The Devil': -3,
    },
    'money': {
        # 매우 긍정
        'Ace of Pentacles': 5, 'Ten of Pentacles': 5, 'Nine of Pentacles': 5,
        'King of Pentacles': 4, 'Queen of Pentacles': 4,
        'Wheel of Fortune': 4, 'The Empress': 4,
        # 긍정
        'Six of Pentacles': 3, 'Four of Pentacles': 2, 'Three of Pentacles': 3,
        'Eight of Pentacles': 3, 'The Sun': 3, 'The World': 3,
        'The Emperor': 2, 'The Magician': 2,
        # 부정
        'Five of Pentacles': -5, 'Seven of Pentacles': -1,
        'The Tower': -3, 'Death': -2, 'Ten of Swords': -3,
        # 매우 부정
        'The Devil': -3,
    },
    'health': {
        # 매우 긍정
        'The Sun': 5, 'The Star': 5, 'Temperance': 4,
        'Strength': 4, 'Nine of Pentacles': 4, 'Ace of Cups': 3,
        'The World': 3, 'Six of Wands': 3,
        # 긍정
        'Four of Swords': 2, 'The Empress': 3, 'Queen of Pentacles': 2,
        'Ace of Wands': 2, 'Ten of Cups': 2, 'The Hermit': 1,
        # 부정
        'Nine of Swords': -3, 'Ten of Swords': -4, 'Five of Pentacles': -3,
        'The Tower': -3, 'Three of Swords': -2, 'Eight of Cups': -2,
        # 매우 부정
        'Death': -2, 'The Devil': -4,
    },
    'spiritual': {
        # 매우 긍정
        'The High Priestess': 5, 'The Hermit': 5, 'The Star': 5,
        'The Moon': 4, 'Judgement': 4, 'The World': 4,
        'Temperance': 4, 'The Hanged Man': 3,
        # 긍정
        'Ace of Cups': 3, 'The Magician': 3, 'The Fool': 3,
        'Four of Cups': 2, 'Seven of Cups': 2, 'Queen of Cups': 2,
        'Death': 3, 'The Tower': 2,
        # 부정
        'The Devil': -3, 'Seven of Swords': -2,
        'Five of Pentacles': -1, 'King of Pentacles': -1,
    },
}

# 카드 쌍 시너지 (강화/약화 관계)
CARD_SYNERGIES = {
    # 강화 쌍 (함께 나오면 서로 의미 증폭)
    'reinforcing': [
        # 사랑 강화
        (['The Lovers', 'Two of Cups'], '운명적 만남', 'love', 2.0),
        (['The Empress', 'Ace of Cups'], '풍요로운 사랑의 시작', 'love', 1.8),
        (['Ten of Cups', 'Four of Wands'], '완벽한 가정의 행복', 'love', 1.8),
        (['Knight of Cups', 'Ace of Cups'], '로맨틱한 제안', 'love', 1.5),
        (['The Sun', 'The Lovers'], '축복받은 사랑', 'love', 1.8),
        # 커리어 강화
        (['The Chariot', 'Ace of Wands'], '새 사업의 승리', 'career', 2.0),
        (['The Emperor', 'King of Pentacles'], '사업 성공과 리더십', 'career', 1.8),
        (['Three of Wands', 'Eight of Pentacles'], '노력이 확장으로', 'career', 1.5),
        (['The World', 'Ten of Pentacles'], '완전한 성취', 'career', 2.0),
        # 재물 강화
        (['Ace of Pentacles', 'Nine of Pentacles'], '재정적 성공', 'money', 2.0),
        (['Wheel of Fortune', 'Ace of Pentacles'], '횡재', 'money', 1.8),
        (['Six of Pentacles', 'Ten of Pentacles'], '나눔이 복으로', 'money', 1.5),
        # 영적 강화
        (['The High Priestess', 'The Moon'], '직관 극대화', 'spiritual', 2.0),
        (['The Hermit', 'The Star'], '고독 속 깨달음', 'spiritual', 1.8),
        (['Judgement', 'The World'], '영적 완성', 'spiritual', 2.0),
    ],
    # 약화/경고 쌍 (함께 나오면 주의 필요)
    'conflicting': [
        (['Three of Swords', 'Ten of Swords'], '고통스러운 종말', 'love', -2.0),
        (['The Tower', 'Ten of Swords'], '완전한 붕괴', 'all', -2.0),
        (['The Devil', 'Seven of Swords'], '속임과 중독', 'all', -1.8),
        (['Five of Pentacles', 'Ten of Swords'], '경제적 어려움 극한', 'money', -2.0),
        (['Nine of Swords', 'The Moon'], '불안과 환상', 'health', -1.5),
        (['The Tower', 'Three of Swords'], '충격적 이별', 'love', -2.0),
        (['Five of Cups', 'Eight of Cups'], '떠나야 할 때', 'love', -1.5),
    ],
    # 변환 쌍 (하나가 다른 하나를 변화시킴)
    'transforming': [
        (['Death', 'The Star'], '끝에서 희망으로', 'all', 1.0),
        (['The Tower', 'The Sun'], '파괴 후 재건', 'all', 1.0),
        (['The Devil', 'Strength'], '속박에서 자유로', 'all', 1.0),
        (['Five of Cups', 'Six of Cups'], '슬픔에서 추억으로', 'love', 0.8),
        (['Ten of Swords', 'Ace of Swords'], '끝에서 새 시작으로', 'career', 1.0),
        (['The Hanged Man', 'The World'], '희생이 성취로', 'all', 1.2),
    ],
}

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


# =============================================================================
# TarotPatternEngine 클래스
# =============================================================================

class TarotPatternEngine:
    """
    규칙 기반 타로 패턴 분석 엔진.
    하드코딩된 조합 없이 동적으로 모든 카드 조합을 분석.
    """

    def __init__(self):
        self.suit_info = SUIT_INFO
        self.numerology = NUMEROLOGY
        self.court_ranks = COURT_RANKS
        self.element_interactions = ELEMENT_INTERACTIONS
        self.polarity_pairs = POLARITY_PAIRS
        self.transformation_sequences = TRANSFORMATION_SEQUENCES
        self._analysis_cache = {}

    # =========================================================================
    # 메인 분석 메서드
    # =========================================================================

    def analyze(self, cards: List[Dict]) -> Dict:
        """
        카드 목록을 받아 모든 패턴을 분석.

        Args:
            cards: List of {'name': str, 'isReversed': bool, ...}

        Returns:
            종합 분석 결과 딕셔너리
        """
        if not cards:
            return {}

        # 캐시 키 생성 (카드 이름과 역방향 여부로 해시)
        cache_key = tuple((c.get('name', ''), c.get('isReversed', False)) for c in cards)

        # 캐시 확인
        if cache_key in self._analysis_cache:
            return self._analysis_cache[cache_key]

        # 카드 정보 파싱
        parsed_cards = [self._parse_card(c) for c in cards]

        result = {
            # 슈트 패턴
            'suit_analysis': self._analyze_suit_pattern(parsed_cards),

            # 숫자 패턴
            'number_analysis': self._analyze_number_pattern(parsed_cards),

            # 메이저/마이너 비율
            'arcana_analysis': self._analyze_arcana_ratio(parsed_cards),

            # 궁정 카드 패턴
            'court_analysis': self._analyze_court_pattern(parsed_cards),

            # 극성/대칭 분석
            'polarity_analysis': self._analyze_polarity(parsed_cards),

            # 에너지 흐름
            'energy_flow': self._analyze_energy_flow(parsed_cards),

            # 원소 상호작용
            'element_interaction': self._analyze_element_interaction(parsed_cards),

            # 변환 시퀀스
            'transformation': self._find_transformation_sequences(parsed_cards),

            # 역방향 분석
            'reversal_analysis': self._analyze_reversals(parsed_cards),

            # 카드 시너지 (Tier 2)
            'synergy_analysis': self._analyze_card_synergies(parsed_cards),

            # 종합 메시지
            'synthesis': self._synthesize_patterns(parsed_cards),
        }

        # 캐시 저장 (최대 100개 유지)
        if len(self._analysis_cache) >= 100:
            # 오래된 항목 제거 (간단히 절반 삭제)
            keys_to_remove = list(self._analysis_cache.keys())[:50]
            for key in keys_to_remove:
                del self._analysis_cache[key]

        self._analysis_cache[cache_key] = result
        return result

    # =========================================================================
    # 카드 파싱
    # =========================================================================

    def _parse_card(self, card: Dict) -> Dict:
        """카드 이름에서 슈트, 숫자, 랭크 등 추출"""
        name = card.get('name', '')
        is_reversed = card.get('isReversed', False)

        parsed = {
            'name': name,
            'is_reversed': is_reversed,
            'is_major': False,
            'is_court': False,
            'suit': None,
            'number': None,
            'court_rank': None,
            'element': None,
        }

        # 메이저 아르카나 체크 (The로 시작하거나 특정 이름)
        major_arcana = [
            'The Fool', 'The Magician', 'The High Priestess', 'The Empress',
            'The Emperor', 'The Hierophant', 'The Lovers', 'The Chariot',
            'Strength', 'The Hermit', 'Wheel of Fortune', 'Justice',
            'The Hanged Man', 'Death', 'Temperance', 'The Devil',
            'The Tower', 'The Star', 'The Moon', 'The Sun',
            'Judgement', 'The World'
        ]

        if name in major_arcana:
            parsed['is_major'] = True
            parsed['suit'] = 'Major'
            parsed['element'] = 'Spirit'
            # 메이저 아르카나 번호
            if name in major_arcana:
                parsed['number'] = major_arcana.index(name)
            return parsed

        # 마이너 아르카나 파싱
        for suit in ['Wands', 'Cups', 'Swords', 'Pentacles']:
            if suit in name:
                parsed['suit'] = suit
                parsed['element'] = SUIT_INFO[suit]['element']

                # 숫자 카드 체크
                for num_word, num in [
                    ('Ace', 1), ('Two', 2), ('Three', 3), ('Four', 4),
                    ('Five', 5), ('Six', 6), ('Seven', 7), ('Eight', 8),
                    ('Nine', 9), ('Ten', 10)
                ]:
                    if num_word in name:
                        parsed['number'] = num
                        break

                # 궁정 카드 체크
                for rank in ['Page', 'Knight', 'Queen', 'King']:
                    if rank in name:
                        parsed['is_court'] = True
                        parsed['court_rank'] = rank
                        break

                break

        return parsed

    # =========================================================================
    # 슈트 패턴 분석
    # =========================================================================

    def _analyze_suit_pattern(self, cards: List[Dict]) -> Dict:
        """슈트 분포 및 지배적 슈트 분석"""
        suits = [c['suit'] for c in cards if c['suit']]
        suit_counts = Counter(suits)
        total = len(cards)

        result = {
            'counts': dict(suit_counts),
            'total': total,
            'percentages': {s: round(c/total*100, 1) for s, c in suit_counts.items()},
            'dominant': None,
            'missing': [],
            'balance': 'unknown',
            'messages': [],
        }

        if not suit_counts:
            return result

        # 지배적 슈트 (40% 이상)
        dominant_threshold = 0.4
        for suit, count in suit_counts.items():
            if count / total >= dominant_threshold:
                result['dominant'] = {
                    'suit': suit,
                    'count': count,
                    'percentage': round(count/total*100, 1),
                    'info': SUIT_INFO.get(suit, {}),
                }
                result['messages'].append(
                    f"{SUIT_INFO.get(suit, {}).get('korean', suit)} 에너지가 지배적입니다 ({count}/{total}장). "
                    f"{''.join(SUIT_INFO.get(suit, {}).get('themes', [])[:3])}에 집중하세요."
                )

        # 부족한 슈트
        all_suits = ['Wands', 'Cups', 'Swords', 'Pentacles']
        for suit in all_suits:
            if suit not in suit_counts:
                result['missing'].append({
                    'suit': suit,
                    'info': SUIT_INFO.get(suit, {}),
                })
                result['messages'].append(
                    f"{SUIT_INFO.get(suit, {}).get('korean', suit)} 에너지가 부족합니다. "
                    f"{SUIT_INFO.get(suit, {}).get('themes', [''])[0]}에 더 주의를 기울이세요."
                )

        # 균형 상태 판단
        if len(suit_counts) >= 3:
            max_count = max(suit_counts.values())
            min_count = min(suit_counts.values())
            if max_count - min_count <= 1:
                result['balance'] = 'balanced'
                result['messages'].append("원소 에너지가 균형을 이루고 있습니다.")
            elif max_count / total >= 0.5:
                result['balance'] = 'focused'
            else:
                result['balance'] = 'diverse'

        return result

    # =========================================================================
    # 숫자 패턴 분석
    # =========================================================================

    def _analyze_number_pattern(self, cards: List[Dict]) -> Dict:
        """숫자 패턴 분석 (같은 숫자, 연속 숫자, 수비학)"""
        numbers = [c['number'] for c in cards if c['number'] is not None]
        number_counts = Counter(numbers)

        result = {
            'counts': dict(number_counts),
            'repeated': [],
            'sequences': [],
            'numerology_focus': None,
            'messages': [],
        }

        if not numbers:
            return result

        # 반복되는 숫자 (2장 이상)
        for num, count in number_counts.items():
            if count >= 2 and num in NUMEROLOGY:
                num_info = NUMEROLOGY[num]
                result['repeated'].append({
                    'number': num,
                    'count': count,
                    'meaning': num_info['meaning'],
                    'korean': num_info['korean'],
                })
                result['messages'].append(
                    f"숫자 {num}이(가) {count}번 반복됩니다: {num_info['korean']}"
                )

        # 연속 숫자 찾기 (예: 3, 4, 5)
        unique_numbers = sorted(set(numbers))
        sequences = self._find_sequences(unique_numbers)
        for seq in sequences:
            if len(seq) >= 3:
                result['sequences'].append({
                    'numbers': seq,
                    'meaning': self._interpret_sequence(seq),
                })
                result['messages'].append(
                    f"숫자 시퀀스 발견 ({', '.join(map(str, seq))}): 진행 중인 여정을 나타냅니다."
                )

        # 가장 많이 나온 숫자의 수비학적 의미
        if number_counts:
            most_common = number_counts.most_common(1)[0]
            if most_common[0] in NUMEROLOGY:
                result['numerology_focus'] = {
                    'number': most_common[0],
                    'count': most_common[1],
                    **NUMEROLOGY[most_common[0]]
                }

        return result

    def _find_sequences(self, numbers: List[int]) -> List[List[int]]:
        """연속 숫자 시퀀스 찾기"""
        if not numbers:
            return []

        sequences = []
        current_seq = [numbers[0]]

        for i in range(1, len(numbers)):
            if numbers[i] == numbers[i-1] + 1:
                current_seq.append(numbers[i])
            else:
                if len(current_seq) >= 2:
                    sequences.append(current_seq)
                current_seq = [numbers[i]]

        if len(current_seq) >= 2:
            sequences.append(current_seq)

        return sequences

    def _interpret_sequence(self, seq: List[int]) -> str:
        """시퀀스 해석"""
        start = seq[0]
        end = seq[-1]

        if start <= 3 and end >= 5:
            return "시작에서 도전으로 - 성장통을 겪는 중"
        elif start >= 5 and end >= 8:
            return "도전에서 성취로 - 어려움을 극복하는 중"
        elif start >= 7:
            return "성찰에서 완성으로 - 마무리 단계"
        elif end <= 4:
            return "초기 단계 - 기초를 다지는 중"
        else:
            return "진행 중인 여정"

    # =========================================================================
    # 메이저/마이너 비율 분석
    # =========================================================================

    def _analyze_arcana_ratio(self, cards: List[Dict]) -> Dict:
        """메이저 vs 마이너 아르카나 비율 분석"""
        total = len(cards)
        major_count = sum(1 for c in cards if c['is_major'])
        minor_count = total - major_count

        major_ratio = major_count / total if total > 0 else 0

        result = {
            'major_count': major_count,
            'minor_count': minor_count,
            'total': total,
            'major_ratio': round(major_ratio * 100, 1),
            'significance': 'normal',
            'messages': [],
        }

        if major_ratio >= 0.7:
            result['significance'] = 'highly_karmic'
            result['messages'].append(
                "메이저 아르카나가 70% 이상입니다. 이것은 매우 중요한 인생의 전환점을 나타냅니다. "
                "운명적인 사건들이 일어나고 있으며, 큰 교훈을 배우는 시기입니다."
            )
        elif major_ratio >= 0.5:
            result['significance'] = 'significant'
            result['messages'].append(
                "메이저 아르카나가 절반 이상입니다. 중요한 인생 결정이나 변화의 시기입니다. "
                "일상을 넘어선 큰 흐름에 주목하세요."
            )
        elif major_ratio >= 0.3:
            result['significance'] = 'moderate'
            result['messages'].append(
                "메이저와 마이너의 균형. 일상적인 문제와 큰 교훈이 함께 작용합니다."
            )
        else:
            result['significance'] = 'practical'
            result['messages'].append(
                "마이너 아르카나가 대부분입니다. 일상적인 문제와 실질적인 상황에 집중하세요. "
                "작은 행동들이 모여 변화를 만듭니다."
            )

        return result

    # =========================================================================
    # 궁정 카드 패턴 분석
    # =========================================================================

    def _analyze_court_pattern(self, cards: List[Dict]) -> Dict:
        """궁정 카드 패턴 분석"""
        court_cards = [c for c in cards if c['is_court']]

        result = {
            'count': len(court_cards),
            'total': len(cards),
            'ratio': round(len(court_cards) / len(cards) * 100, 1) if cards else 0,
            'ranks': {},
            'suits': {},
            'people_focus': False,
            'messages': [],
        }

        if not court_cards:
            return result

        # 랭크별 분류
        rank_counts = Counter(c['court_rank'] for c in court_cards)
        result['ranks'] = {
            rank: {
                'count': count,
                'info': COURT_RANKS.get(rank, {}),
            }
            for rank, count in rank_counts.items()
        }

        # 슈트별 분류
        suit_counts = Counter(c['suit'] for c in court_cards)
        result['suits'] = dict(suit_counts)

        # 사람 중심 리딩 판단
        if len(court_cards) >= 3 or len(court_cards) / len(cards) >= 0.4:
            result['people_focus'] = True
            result['messages'].append(
                "궁정 카드가 많이 나왔습니다. 주변 사람들이 상황에 중요한 역할을 합니다. "
                "각 카드는 실제 인물이거나 당신 내면의 에너지를 나타낼 수 있습니다."
            )

        # 랭크별 해석
        for rank, data in result['ranks'].items():
            if data['count'] >= 2:
                result['messages'].append(
                    f"{COURT_RANKS[rank]['korean']} 카드가 {data['count']}장: {COURT_RANKS[rank]['meaning']}"
                )

        # 같은 슈트 궁정 카드
        for suit, count in suit_counts.items():
            if count >= 2:
                result['messages'].append(
                    f"{SUIT_INFO.get(suit, {}).get('korean', suit)} 궁정 카드가 {count}장: "
                    f"이 영역의 인물들이 중요합니다."
                )

        return result

    # =========================================================================
    # 극성/대칭 분석
    # =========================================================================

    def _analyze_polarity(self, cards: List[Dict]) -> Dict:
        """극성 쌍과 대칭 패턴 분석"""
        card_names = {c['name'] for c in cards}

        result = {
            'pairs_found': [],
            'balance_message': None,
            'messages': [],
        }

        for card1, card2, meaning in POLARITY_PAIRS:
            if card1 in card_names and card2 in card_names:
                result['pairs_found'].append({
                    'cards': [card1, card2],
                    'meaning': meaning,
                })
                result['messages'].append(
                    f"극성 쌍 발견: {card1} + {card2} = {meaning}"
                )

        if result['pairs_found']:
            result['balance_message'] = (
                "반대 에너지가 함께 나타났습니다. 이는 통합과 균형의 기회입니다. "
                "한쪽으로 치우치지 말고 양면을 모두 받아들이세요."
            )

        return result

    # =========================================================================
    # 에너지 흐름 분석
    # =========================================================================

    def _analyze_energy_flow(self, cards: List[Dict]) -> Dict:
        """카드 순서에 따른 에너지 흐름 분석"""
        if len(cards) < 2:
            return {'flow': 'single', 'trend': 'neutral', 'pattern': 'stable', 'messages': []}

        # 에너지 점수 계산 (메이저=3, 궁정=2, 숫자=숫자값/3)
        def get_energy_score(card: Dict) -> float:
            if card['is_major']:
                # 메이저 아르카나 에너지 곡선
                num = card['number'] if card['number'] is not None else 10
                if num <= 7:  # Fool to Chariot: 상승
                    return 2 + num * 0.3
                elif num <= 14:  # Strength to Temperance: 내면화
                    return 4 - (num - 7) * 0.2
                else:  # Devil to World: 변환
                    return 2 + (num - 14) * 0.4
            elif card['is_court']:
                return COURT_RANKS.get(card['court_rank'], {}).get('maturity', 2) * 0.8
            else:
                return (card['number'] or 5) / 3

        scores = [get_energy_score(c) for c in cards]

        # 흐름 패턴 분석
        result = {
            'scores': scores,
            'pattern': 'stable',
            'trend': 'neutral',
            'messages': [],
        }

        # 전반적 추세
        first_third = sum(scores[:len(scores)//3+1]) / (len(scores)//3+1) if scores else 0
        last_third = sum(scores[-(len(scores)//3+1):]) / (len(scores)//3+1) if scores else 0

        if last_third > first_third * 1.3:
            result['trend'] = 'ascending'
            result['pattern'] = 'growth'
            result['messages'].append("에너지가 상승하고 있습니다. 상황이 점점 강렬해지거나 좋아집니다.")
        elif first_third > last_third * 1.3:
            result['trend'] = 'descending'
            result['pattern'] = 'release'
            result['messages'].append("에너지가 하강하고 있습니다. 상황이 정리되거나 완화됩니다.")
        else:
            # V자 또는 역V자 패턴 체크
            mid = len(scores) // 2
            mid_score = scores[mid] if mid < len(scores) else 0
            avg_ends = (scores[0] + scores[-1]) / 2 if len(scores) >= 2 else 0

            if mid_score > avg_ends * 1.3:
                result['pattern'] = 'peak'
                result['messages'].append("중간에 에너지 정점이 있습니다. 핵심 전환점에 주목하세요.")
            elif mid_score < avg_ends * 0.7:
                result['pattern'] = 'valley'
                result['messages'].append("중간에 어려움이 있지만, 시작과 끝은 강합니다.")
            else:
                result['pattern'] = 'stable'
                result['messages'].append("에너지가 안정적으로 유지됩니다.")

        return result

    # =========================================================================
    # 원소 상호작용 분석
    # =========================================================================

    def _analyze_element_interaction(self, cards: List[Dict]) -> Dict:
        """원소 간 상호작용 분석"""
        elements = [c['element'] for c in cards if c['element'] and c['element'] != 'Spirit']

        if len(elements) < 2:
            return {'interactions': [], 'messages': []}

        result = {
            'element_counts': dict(Counter(elements)),
            'interactions': [],
            'overall_energy': 'neutral',
            'messages': [],
        }

        # 원소 쌍 분석
        positive_count = 0
        negative_count = 0

        for i in range(len(elements)):
            for j in range(i+1, len(elements)):
                pair = tuple(sorted([elements[i], elements[j]]))
                interaction = None

                # 정방향, 역방향 모두 체크
                for key in [pair, pair[::-1]]:
                    if key in ELEMENT_INTERACTIONS:
                        interaction = ELEMENT_INTERACTIONS[key]
                        break

                if interaction:
                    result['interactions'].append({
                        'elements': pair,
                        'type': interaction['type'],
                        'korean': interaction['korean'],
                    })

                    if interaction['type'] in ['amplify', 'support']:
                        positive_count += 1
                    elif interaction['type'] == 'conflict':
                        negative_count += 1

        # 전체 에너지 판단
        if positive_count > negative_count * 2:
            result['overall_energy'] = 'harmonious'
            result['messages'].append("원소들이 서로 조화롭게 작용합니다. 에너지가 잘 흐릅니다.")
        elif negative_count > positive_count * 2:
            result['overall_energy'] = 'conflicting'
            result['messages'].append("원소들 사이에 긴장이 있습니다. 내적 갈등이나 외부 도전이 예상됩니다.")
        else:
            result['overall_energy'] = 'dynamic'
            result['messages'].append("다양한 원소 에너지가 역동적으로 작용합니다.")

        return result

    # =========================================================================
    # 변환 시퀀스 찾기
    # =========================================================================

    def _find_transformation_sequences(self, cards: List[Dict]) -> Dict:
        """알려진 변환 시퀀스 찾기"""
        card_names = {c['name'] for c in cards}

        result = {
            'sequences_found': [],
            'messages': [],
        }

        for seq_name, seq_data in TRANSFORMATION_SEQUENCES.items():
            seq_cards = set(seq_data['cards'])
            matching = seq_cards & card_names

            if len(matching) >= 2:  # 최소 2장 이상 매칭
                completeness = len(matching) / len(seq_cards)
                result['sequences_found'].append({
                    'name': seq_name,
                    'korean': seq_data['korean'],
                    'cards_in_reading': list(matching),
                    'all_cards': seq_data['cards'],
                    'completeness': round(completeness * 100, 1),
                    'meaning': seq_data['meaning'],
                })

                if completeness == 1.0:
                    result['messages'].append(
                        f"완전한 '{seq_data['korean']}' 시퀀스! {seq_data['meaning']}"
                    )
                else:
                    result['messages'].append(
                        f"'{seq_data['korean']}' 시퀀스의 일부 ({int(completeness*100)}%): "
                        f"{', '.join(matching)}"
                    )

        return result

    # =========================================================================
    # 역방향 분석
    # =========================================================================

    def _analyze_reversals(self, cards: List[Dict]) -> Dict:
        """역방향 카드 패턴 분석"""
        total = len(cards)
        reversed_count = sum(1 for c in cards if c['is_reversed'])
        reversed_ratio = reversed_count / total if total > 0 else 0

        result = {
            'reversed_count': reversed_count,
            'total': total,
            'ratio': round(reversed_ratio * 100, 1),
            'significance': 'normal',
            'messages': [],
        }

        if reversed_ratio >= 0.8:
            result['significance'] = 'highly_blocked'
            result['messages'].append(
                "대부분의 카드가 역방향입니다. 막힘, 지연, 또는 내면화된 에너지를 나타냅니다. "
                "외부로 표현되지 못한 것들을 살펴보세요."
            )
        elif reversed_ratio >= 0.5:
            result['significance'] = 'challenged'
            result['messages'].append(
                "절반 이상이 역방향입니다. 도전과 내적 작업이 필요한 시기입니다. "
                "저항을 느끼는 부분에 주목하세요."
            )
        elif reversed_ratio >= 0.3:
            result['significance'] = 'some_blocks'
            result['messages'].append(
                "일부 역방향 카드가 있습니다. 특정 영역에서 막힘이나 재고가 필요합니다."
            )
        elif reversed_count == 0:
            result['significance'] = 'all_upright'
            result['messages'].append(
                "모든 카드가 정방향입니다. 에너지가 자유롭게 흐르고 있습니다."
            )

        return result

    # =========================================================================
    # 종합 분석
    # =========================================================================

    def _synthesize_patterns(self, cards: List[Dict]) -> Dict:
        """모든 패턴을 종합하여 핵심 메시지 도출"""
        # 각 분석을 병렬로 수행
        with ThreadPoolExecutor(max_workers=6) as executor:
            suit_future = executor.submit(self._analyze_suit_pattern, cards)
            number_future = executor.submit(self._analyze_number_pattern, cards)
            arcana_future = executor.submit(self._analyze_arcana_ratio, cards)
            court_future = executor.submit(self._analyze_court_pattern, cards)
            energy_future = executor.submit(self._analyze_energy_flow, cards)
            reversals_future = executor.submit(self._analyze_reversals, cards)

            # 결과 수집
            suit = suit_future.result()
            number = number_future.result()
            arcana = arcana_future.result()
            court = court_future.result()
            energy = energy_future.result()
            reversals = reversals_future.result()

        synthesis = {
            'primary_theme': None,
            'energy_quality': None,
            'key_numbers': [],
            'action_orientation': None,
            'summary': '',
        }

        # 1차 테마 결정
        if arcana['significance'] == 'highly_karmic':
            synthesis['primary_theme'] = 'karmic_turning_point'
        elif suit.get('dominant'):
            synthesis['primary_theme'] = f"{suit['dominant']['suit'].lower()}_focus"
        elif court['people_focus']:
            synthesis['primary_theme'] = 'relationship_dynamics'
        else:
            synthesis['primary_theme'] = 'balanced_situation'

        # 에너지 품질
        if reversals['ratio'] >= 50:
            synthesis['energy_quality'] = 'blocked'
        elif energy.get('trend') == 'ascending':
            synthesis['energy_quality'] = 'rising'
        elif energy.get('trend') == 'descending':
            synthesis['energy_quality'] = 'settling'
        else:
            synthesis['energy_quality'] = 'stable'

        # 핵심 숫자
        if number.get('repeated'):
            synthesis['key_numbers'] = [r['number'] for r in number['repeated']]

        # 행동 지향성
        active_elements = sum(1 for c in cards if c['element'] in ['Fire', 'Air'])
        passive_elements = sum(1 for c in cards if c['element'] in ['Water', 'Earth'])

        if active_elements > passive_elements * 1.5:
            synthesis['action_orientation'] = 'take_action'
        elif passive_elements > active_elements * 1.5:
            synthesis['action_orientation'] = 'wait_and_receive'
        else:
            synthesis['action_orientation'] = 'balanced_approach'

        # 요약 문장 생성
        summary_parts = []

        theme_messages = {
            'karmic_turning_point': '인생의 중요한 전환점입니다.',
            'wands_focus': '열정과 행동이 핵심입니다.',
            'cups_focus': '감정과 관계에 집중하세요.',
            'swords_focus': '명확한 결정과 소통이 필요합니다.',
            'pentacles_focus': '실질적인 문제와 안정에 집중하세요.',
            'relationship_dynamics': '주변 사람들이 중요한 역할을 합니다.',
            'balanced_situation': '다양한 요소가 균형을 이루고 있습니다.',
        }

        if synthesis['primary_theme'] in theme_messages:
            summary_parts.append(theme_messages[synthesis['primary_theme']])

        energy_messages = {
            'blocked': '현재 막힘이 있으니 내면을 살펴보세요.',
            'rising': '에너지가 상승 중입니다. 적극적으로 나아가세요.',
            'settling': '상황이 정리되고 있습니다. 마무리에 집중하세요.',
            'stable': '안정적인 에너지가 유지되고 있습니다.',
        }

        if synthesis['energy_quality'] in energy_messages:
            summary_parts.append(energy_messages[synthesis['energy_quality']])

        action_messages = {
            'take_action': '지금은 행동할 때입니다.',
            'wait_and_receive': '기다리며 받아들일 때입니다.',
            'balanced_approach': '행동과 기다림의 균형을 유지하세요.',
        }

        if synthesis['action_orientation'] in action_messages:
            summary_parts.append(action_messages[synthesis['action_orientation']])

        synthesis['summary'] = ' '.join(summary_parts)

        return synthesis

    # =========================================================================
    # 카드 시너지 분석 (Tier 2)
    # =========================================================================

    def _analyze_card_synergies(self, cards: List[Dict]) -> Dict:
        """카드 간 시너지 관계 분석 (강화/약화/변환)"""
        card_names = {c['name'] for c in cards}

        result = {
            'reinforcing': [],
            'conflicting': [],
            'transforming': [],
            'messages': [],
        }

        # 강화 쌍 찾기
        for pair_cards, meaning, theme, multiplier in CARD_SYNERGIES.get('reinforcing', []):
            if set(pair_cards).issubset(card_names):
                result['reinforcing'].append({
                    'cards': pair_cards,
                    'meaning': meaning,
                    'theme': theme,
                    'multiplier': multiplier,
                })
                result['messages'].append(f"✨ 강화 시너지: {' + '.join(pair_cards)} = {meaning}")

        # 약화/경고 쌍 찾기
        for pair_cards, meaning, theme, multiplier in CARD_SYNERGIES.get('conflicting', []):
            if set(pair_cards).issubset(card_names):
                result['conflicting'].append({
                    'cards': pair_cards,
                    'meaning': meaning,
                    'theme': theme,
                    'multiplier': multiplier,
                })
                result['messages'].append(f"⚠️ 주의 필요: {' + '.join(pair_cards)} = {meaning}")

        # 변환 쌍 찾기
        for pair_cards, meaning, theme, multiplier in CARD_SYNERGIES.get('transforming', []):
            if set(pair_cards).issubset(card_names):
                result['transforming'].append({
                    'cards': pair_cards,
                    'meaning': meaning,
                    'theme': theme,
                    'multiplier': multiplier,
                })
                result['messages'].append(f"🔄 변환 에너지: {' + '.join(pair_cards)} = {meaning}")

        return result

    # =========================================================================
    # 테마별 점수 분석 (Tier 2)
    # =========================================================================

    def analyze_theme_score(self, cards: List[Dict], theme: str) -> Dict:
        """
        특정 테마에 대한 카드 점수 계산.

        Args:
            cards: 카드 목록
            theme: 'love', 'career', 'money', 'health', 'spiritual'

        Returns:
            테마별 점수와 해석
        """
        if theme not in CARD_THEME_SCORES:
            return {'error': f'Unknown theme: {theme}'}

        theme_scores = CARD_THEME_SCORES[theme]
        total_score = 0
        card_scores = []
        key_cards = []

        for card in cards:
            card_name = card.get('name', '')
            is_reversed = card.get('isReversed', False)

            base_score = theme_scores.get(card_name, 0)
            # 역방향이면 점수 반전 (긍정→부정, 부정→긍정)
            if is_reversed:
                adjusted_score = -base_score * 0.7
            else:
                adjusted_score = base_score

            total_score += adjusted_score
            card_scores.append({
                'name': card_name,
                'is_reversed': is_reversed,
                'base_score': base_score,
                'adjusted_score': round(adjusted_score, 1),
            })

            # 핵심 카드 (절대값 3 이상)
            if abs(adjusted_score) >= 3:
                key_cards.append({
                    'name': card_name,
                    'score': adjusted_score,
                    'impact': 'very_positive' if adjusted_score >= 4 else
                             'positive' if adjusted_score >= 2 else
                             'negative' if adjusted_score <= -2 else
                             'very_negative' if adjusted_score <= -4 else 'neutral'
                })

        # 점수 해석
        avg_score = total_score / len(cards) if cards else 0
        max_possible = len(cards) * 5
        percentage = ((total_score + max_possible) / (2 * max_possible)) * 100 if max_possible > 0 else 50

        # 전망 결정
        if avg_score >= 3:
            outlook = 'very_positive'
            outlook_korean = '매우 긍정적'
            outlook_message = f'{theme} 영역에서 매우 좋은 기운이 흐르고 있습니다!'
        elif avg_score >= 1:
            outlook = 'positive'
            outlook_korean = '긍정적'
            outlook_message = f'{theme} 영역에서 좋은 흐름이 보입니다.'
        elif avg_score >= -1:
            outlook = 'neutral'
            outlook_korean = '중립적'
            outlook_message = f'{theme} 영역은 현재 균형 상태입니다. 당신의 선택이 중요합니다.'
        elif avg_score >= -3:
            outlook = 'challenging'
            outlook_korean = '도전적'
            outlook_message = f'{theme} 영역에서 도전이 있지만, 극복할 수 있습니다.'
        else:
            outlook = 'difficult'
            outlook_korean = '어려움'
            outlook_message = f'{theme} 영역에서 주의가 필요합니다. 신중하게 접근하세요.'

        return {
            'theme': theme,
            'total_score': round(total_score, 1),
            'average_score': round(avg_score, 2),
            'percentage': round(percentage, 1),
            'outlook': outlook,
            'outlook_korean': outlook_korean,
            'outlook_message': outlook_message,
            'card_scores': card_scores,
            'key_cards': key_cards,
        }

    def analyze_all_themes(self, cards: List[Dict]) -> Dict:
        """모든 테마에 대한 점수 분석"""
        themes = ['love', 'career', 'money', 'health', 'spiritual']
        results = {}

        for theme in themes:
            results[theme] = self.analyze_theme_score(cards, theme)

        # 최고/최저 테마 찾기
        sorted_themes = sorted(
            results.items(),
            key=lambda x: x[1].get('average_score', 0),
            reverse=True
        )

        return {
            'by_theme': results,
            'best_theme': sorted_themes[0] if sorted_themes else None,
            'worst_theme': sorted_themes[-1] if sorted_themes else None,
            'ranking': [(t, r['outlook_korean'], r['average_score']) for t, r in sorted_themes],
        }

    # =========================================================================
    # 실시간 컨텍스트 분석 (Tier 3)
    # =========================================================================

    def get_realtime_context(self, moon_phase: str = None) -> Dict:
        """
        현재 날짜/시간 기반 컨텍스트.

        Args:
            moon_phase: 수동 지정 가능 (new_moon, full_moon, etc.)

        Returns:
            실시간 컨텍스트 정보
        """
        from datetime import datetime

        now = datetime.now()
        weekday = now.weekday()  # 0=월요일

        result = {
            'date': now.strftime('%Y-%m-%d'),
            'weekday': weekday,
            'weekday_info': WEEKDAY_PLANETS.get(weekday, {}),
            'moon_phase': None,
            'messages': [],
        }

        # 요일 메시지
        planet_info = WEEKDAY_PLANETS.get(weekday, {})
        if planet_info:
            result['messages'].append(
                f"오늘은 {planet_info.get('korean', '')}의 날입니다. "
                f"{', '.join(planet_info.get('themes', []))}에 관한 리딩에 좋습니다."
            )

        # 달 위상 (수동 지정 또는 기본값)
        if moon_phase and moon_phase in MOON_PHASES:
            phase_info = MOON_PHASES[moon_phase]
            result['moon_phase'] = {
                'phase': moon_phase,
                **phase_info
            }
            result['messages'].append(
                f"{phase_info.get('korean', '')} 시기입니다. "
                f"'{phase_info.get('energy', '')}' 에너지가 흐릅니다. "
                f"{', '.join(phase_info.get('best_for', [])[:2])}에 좋은 시기입니다."
            )

        return result

    def apply_realtime_boost(self, cards: List[Dict], moon_phase: str = None) -> Dict:
        """
        실시간 컨텍스트를 적용한 카드 부스트 계산.

        Args:
            cards: 카드 목록
            moon_phase: 달 위상

        Returns:
            부스트 적용 결과
        """
        from datetime import datetime

        now = datetime.now()
        weekday = now.weekday()
        planet_info = WEEKDAY_PLANETS.get(weekday, {})

        boosted_cards = []
        boost_messages = []

        for card in cards:
            parsed = self._parse_card(card)
            boost = 1.0
            boost_reasons = []

            # 요일 원소 매칭
            if planet_info.get('element') == parsed.get('element'):
                boost *= 1.2
                boost_reasons.append(f"오늘의 {planet_info.get('korean', '')} 에너지와 공명")

            # 달 위상 슈트 부스트
            if moon_phase and moon_phase in MOON_PHASES:
                phase_info = MOON_PHASES[moon_phase]
                if parsed.get('suit') in phase_info.get('boost_suits', []):
                    boost *= 1.15
                    boost_reasons.append(f"{phase_info.get('korean', '')} 에너지 증폭")

            boosted_cards.append({
                'name': card.get('name', ''),
                'boost': round(boost, 2),
                'reasons': boost_reasons,
            })

            if boost > 1.0:
                boost_messages.append(
                    f"{card.get('name', '')}의 에너지가 강화됨 (x{boost:.2f})"
                )

        return {
            'cards': boosted_cards,
            'messages': boost_messages,
            'context': self.get_realtime_context(moon_phase),
        }


# =============================================================================
# Tier 4: 개인화 상수
# =============================================================================

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

# =============================================================================
# Tier 5: 다층 해석 상수
# =============================================================================

INTERPRETATION_LAYERS = {
    'surface': {
        'korean': '표면적 의미',
        'description': '카드가 직접적으로 보여주는 상황과 사건',
        'prompt_template': "이 카드가 현재 상황에서 직접적으로 보여주는 것은 무엇인가요?",
    },
    'psychological': {
        'korean': '심리적 의미',
        'description': '내면의 감정, 생각, 무의식적 패턴',
        'prompt_template': "이 카드가 당신의 내면 심리와 감정에 대해 말하는 것은?",
    },
    'shadow': {
        'korean': '그림자 작업',
        'description': '억압된 측면, 두려움, 성장 기회',
        'prompt_template': "이 카드가 보여주는 당신이 피하고 있는 것, 직면해야 할 것은?",
    },
    'spiritual': {
        'korean': '영적/카르마적 의미',
        'description': '영혼의 교훈, 전생의 패턴, 영적 성장',
        'prompt_template': "이 카드가 당신의 영혼 여정에서 가르치는 교훈은?",
    },
    'action': {
        'korean': '실천적 조언',
        'description': '구체적인 행동 지침과 다음 단계',
        'prompt_template': "이 카드의 메시지를 바탕으로 취할 수 있는 구체적 행동은?",
    },
}

# 각 메이저 아르카나의 다층 해석 베이스
MAJOR_ARCANA_LAYERS = {
    'The Fool': {
        'surface': '새로운 시작, 여행, 예상치 못한 기회',
        'psychological': '내면 아이의 회복, 과거 트라우마에서 자유로워짐',
        'shadow': '무모함, 책임 회피, 성장 거부',
        'spiritual': '영혼의 새로운 사이클 시작, 카르마 청산 완료',
        'action': '두려움 없이 첫 발을 내딛으세요. 완벽할 필요 없습니다.',
    },
    'The Magician': {
        'surface': '새 프로젝트 시작, 기술과 재능 활용',
        'psychological': '자기효능감, 능력에 대한 확신',
        'shadow': '조작, 사기, 재능 남용',
        'spiritual': '현실 창조의 힘, 의도와 현현의 법칙',
        'action': '가진 도구를 사용하세요. 지금 시작할 모든 것이 있습니다.',
    },
    'The High Priestess': {
        'surface': '비밀이 드러남, 직관적 통찰',
        'psychological': '무의식과의 연결, 꿈과 상징의 중요성',
        'shadow': '지나친 수동성, 비밀 유지의 부담',
        'spiritual': '내면 지혜와의 연결, 신성한 여성성',
        'action': '조용히 기다리며 내면의 목소리를 들으세요.',
    },
    'The Empress': {
        'surface': '풍요, 임신/출산, 창조적 프로젝트 완성',
        'psychological': '자기돌봄, 양육 받고자 하는 욕구',
        'shadow': '과잉보호, 의존성, 탐닉',
        'spiritual': '대지 어머니와의 연결, 자연의 순환',
        'action': '자신을 사랑하세요. 창조적 충동을 따르세요.',
    },
    'The Emperor': {
        'surface': '구조화, 리더십, 권위자와의 만남',
        'psychological': '내면의 아버지, 자기훈육',
        'shadow': '지배욕, 융통성 부족, 권위주의',
        'spiritual': '신성한 남성성, 보호의 원형',
        'action': '명확한 경계를 세우세요. 계획을 따르세요.',
    },
    'The Hierophant': {
        'surface': '전통적 가르침, 결혼, 공식적 의식',
        'psychological': '신념 체계 검토, 소속감 욕구',
        'shadow': '맹목적 순응, 교조주의, 위선',
        'spiritual': '영적 스승을 만남, 전통 지혜의 가치',
        'action': '신뢰할 수 있는 조언자를 찾으세요. 전통에서 배우세요.',
    },
    'The Lovers': {
        'surface': '연애, 파트너십, 중요한 선택',
        'psychological': '자아 통합, 내면의 남성성/여성성 균형',
        'shadow': '우유부단, 타인에게 책임 전가',
        'spiritual': '영혼의 짝, 신성한 결합',
        'action': '마음이 이끄는 대로 선택하세요. 진정성 있게.',
    },
    'The Chariot': {
        'surface': '승리, 여행, 장애물 극복',
        'psychological': '의지력과 결단력, 감정 통제',
        'shadow': '공격성, 강박적 통제',
        'spiritual': '영적 전사의 여정, 에고 극복',
        'action': '명확한 목표를 정하고 전진하세요. 멈추지 마세요.',
    },
    'Strength': {
        'surface': '인내로 상황 극복, 건강 회복',
        'psychological': '내면의 야수 길들이기, 본능과 화해',
        'shadow': '분노 억압, 자기 희생',
        'spiritual': '사랑의 힘, 부드러운 승리',
        'action': '힘이 아닌 사랑으로 접근하세요. 인내하세요.',
    },
    'The Hermit': {
        'surface': '혼자만의 시간, 조언자 역할',
        'psychological': '내면 탐구, 자기성찰의 필요',
        'shadow': '고립, 타인 거부, 우울',
        'spiritual': '내면의 빛을 따름, 영적 안내자',
        'action': '잠시 물러나 생각하세요. 지혜를 구하세요.',
    },
    'Wheel of Fortune': {
        'surface': '운명의 변화, 행운, 새로운 사이클',
        'psychological': '변화 수용, 통제 욕구 내려놓기',
        'shadow': '운명 탓하기, 책임 회피',
        'spiritual': '카르마의 수레바퀴, 인과의 법칙',
        'action': '변화에 저항하지 마세요. 기회를 잡으세요.',
    },
    'Justice': {
        'surface': '법적 문제, 공정한 결과, 계약',
        'psychological': '자기 정직, 양심의 소리',
        'shadow': '가혹한 자기 비판, 복수심',
        'spiritual': '카르마 균형, 우주적 정의',
        'action': '정직하게 행동하세요. 결과를 받아들이세요.',
    },
    'The Hanged Man': {
        'surface': '지연, 희생, 새로운 관점 필요',
        'psychological': '항복의 필요, 에고 내려놓기',
        'shadow': '순교자 콤플렉스, 수동적 공격성',
        'spiritual': '영적 입문, 깨달음 전 어둠',
        'action': '기다리세요. 다른 각도에서 보세요.',
    },
    'Death': {
        'surface': '끝, 변환, 오래된 것 떠나보내기',
        'psychological': '자아의 죽음과 재탄생',
        'shadow': '변화 거부, 과거에 집착',
        'spiritual': '영적 재탄생, 피닉스',
        'action': '놓아주세요. 끝은 시작입니다.',
    },
    'Temperance': {
        'surface': '균형, 치유, 조화로운 관계',
        'psychological': '내면 조화, 극단 피하기',
        'shadow': '과한 타협, 자기 부정',
        'spiritual': '연금술적 통합, 영혼의 균형',
        'action': '중용을 지키세요. 천천히 섞어가세요.',
    },
    'The Devil': {
        'surface': '중독, 속박, 물질주의',
        'psychological': '그림자 직면, 억압된 욕망',
        'shadow': '죄책감 회피, 탓하기',
        'spiritual': '어둠 속 빛 찾기, 탐욕 초월',
        'action': '당신을 묶는 것이 무엇인지 보세요. 선택할 수 있습니다.',
    },
    'The Tower': {
        'surface': '갑작스러운 변화, 붕괴, 충격적 진실',
        'psychological': '방어기제 무너짐, 진실 직면',
        'shadow': '혼란 조장, 파괴적 행동',
        'spiritual': '에고 탑의 붕괴, 영적 각성',
        'action': '저항하지 마세요. 무너짐이 해방입니다.',
    },
    'The Star': {
        'surface': '희망, 영감, 치유',
        'psychological': '상처 후 회복, 자기 가치 회복',
        'shadow': '비현실적 희망, 현실 도피',
        'spiritual': '우주와의 연결, 신성한 인도',
        'action': '희망을 품으세요. 치유가 진행 중입니다.',
    },
    'The Moon': {
        'surface': '환상, 두려움, 숨겨진 것',
        'psychological': '무의식의 부상, 꿈의 메시지',
        'shadow': '환상에 빠짐, 자기기만',
        'spiritual': '직관의 심화, 어둠 속 인도',
        'action': '두려움을 인정하세요. 직관을 믿으세요.',
    },
    'The Sun': {
        'surface': '성공, 기쁨, 활력',
        'psychological': '내면 아이의 기쁨, 자기 수용',
        'shadow': '과대망상, 현실 외면',
        'spiritual': '영적 빛, 진정한 자아 발현',
        'action': '기쁨을 누리세요. 빛나도 괜찮습니다.',
    },
    'Judgement': {
        'surface': '각성, 소명 발견, 과거 청산',
        'psychological': '자기 용서, 과거 통합',
        'shadow': '자기 비난, 타인 심판',
        'spiritual': '영혼의 부름, 더 높은 목적',
        'action': '과거를 용서하세요. 새롭게 일어나세요.',
    },
    'The World': {
        'surface': '완성, 여행, 목표 달성',
        'psychological': '자아 통합, 온전함',
        'shadow': '완료 두려움, 새 시작 거부',
        'spiritual': '한 사이클 완성, 우주적 춤',
        'action': '축하하세요. 그리고 다음을 준비하세요.',
    },
}

# =============================================================================
# Tier 6: 스토리텔링 상수
# =============================================================================

NARRATIVE_STRUCTURES = {
    'hero_journey': {
        'korean': '영웅의 여정',
        'stages': ['일상', '소명', '문턱', '시련', '심연', '보상', '귀환'],
        'description': '변화와 성장의 고전적 서사',
    },
    'phoenix': {
        'korean': '피닉스 스토리',
        'stages': ['과거의 영광', '몰락', '재의 시간', '불꽃', '재탄생'],
        'description': '파괴와 재생의 서사',
    },
    'love_story': {
        'korean': '사랑 이야기',
        'stages': ['고독', '만남', '장애물', '선택', '결합'],
        'description': '관계와 연결의 서사',
    },
    'discovery': {
        'korean': '발견의 여정',
        'stages': ['의문', '탐색', '미로', '통찰', '지혜'],
        'description': '진실과 깨달음의 서사',
    },
}

# 카드 연결 전이어
CARD_TRANSITIONS = {
    'contrast': ['그러나', '하지만', '반면에', '이와 대조적으로'],
    'consequence': ['그래서', '따라서', '그 결과', '이로 인해'],
    'addition': ['그리고', '더불어', '또한', '게다가'],
    'time': ['그 후', '이어서', '그다음', '마침내'],
    'condition': ['만약', '~한다면', '조건이 맞으면', '때가 되면'],
    'emphasis': ['특히', '무엇보다', '가장 중요한 것은', '핵심은'],
}


# =============================================================================
# TarotPatternEngine 클래스 확장 메서드
# =============================================================================

class PersonalizationMixin:
    """Tier 4: 개인화 기능 믹스인"""

    def calculate_birth_card(self, birthdate: str) -> Dict:
        """
        생년월일로 탄생 카드 계산.

        Args:
            birthdate: 'YYYY-MM-DD' 또는 'YYYYMMDD' 형식

        Returns:
            탄생 카드 정보
        """
        # 날짜 파싱
        clean_date = birthdate.replace('-', '').replace('/', '')
        if len(clean_date) != 8:
            return {'error': 'Invalid date format. Use YYYY-MM-DD or YYYYMMDD'}

        try:
            year = int(clean_date[:4])
            month = int(clean_date[4:6])
            day = int(clean_date[6:8])
        except ValueError:
            return {'error': 'Invalid date'}

        # 숫자 합산
        total = sum(int(d) for d in str(year)) + sum(int(d) for d in str(month)) + sum(int(d) for d in str(day))

        # 22 이하가 될 때까지 축소
        while total > 22:
            total = sum(int(d) for d in str(total))

        # 특별 케이스: 0이면 22로
        if total == 0:
            total = 22

        card_info = BIRTH_CARD_MAP.get(total, BIRTH_CARD_MAP.get(22))

        return {
            'birth_number': total,
            'primary_card': card_info['primary'],
            'secondary_card': card_info.get('secondary'),
            'korean': card_info['korean'],
            'traits': card_info['traits'],
            'message': f"당신의 탄생 카드는 '{card_info['korean']}'입니다. "
                       f"이 카드는 당신의 인생 전반에 걸친 테마와 배울 교훈을 나타냅니다. "
                       f"핵심 특성: {', '.join(card_info['traits'])}",
        }

    def calculate_year_card(self, birthdate: str, target_year: int = None) -> Dict:
        """
        연간 카드 계산 (Personal Year Card).

        Args:
            birthdate: 생년월일 'YYYY-MM-DD'
            target_year: 계산할 연도 (기본: 현재)

        Returns:
            연간 카드 정보
        """
        from datetime import datetime

        if target_year is None:
            target_year = datetime.now().year

        # 생일 파싱
        clean_date = birthdate.replace('-', '').replace('/', '')
        month = int(clean_date[4:6])
        day = int(clean_date[6:8])

        # 연간 숫자: 생일 월+일 + 대상 연도
        total = sum(int(d) for d in str(month)) + sum(int(d) for d in str(day)) + sum(int(d) for d in str(target_year))

        # 9 이하로 축소 (연간 사이클은 1-9)
        while total > 9:
            total = sum(int(d) for d in str(total))

        if total == 0:
            total = 9

        year_info = YEAR_THEMES.get(total, YEAR_THEMES.get(9))

        # 연간 카드 매핑
        year_card = BIRTH_CARD_MAP.get(total, BIRTH_CARD_MAP.get(9))

        return {
            'year': target_year,
            'personal_year_number': total,
            'year_card': year_card['primary'],
            'year_card_korean': year_card['korean'],
            'theme': year_info['theme'],
            'korean': year_info['korean'],
            'advice': year_info['advice'],
            'message': f"{target_year}년은 당신에게 '{year_info['korean']}'입니다. "
                       f"테마: {year_info['theme']}. {year_info['advice']}",
        }

    def personalize_reading(self, cards: List[Dict], birthdate: str) -> Dict:
        """
        리딩에 개인화 정보 적용.

        Args:
            cards: 뽑은 카드들
            birthdate: 사용자 생년월일

        Returns:
            개인화된 분석 결과
        """
        birth_card = self.calculate_birth_card(birthdate)
        year_card = self.calculate_year_card(birthdate)

        result = {
            'birth_card': birth_card,
            'year_card': year_card,
            'personal_connections': [],
            'personalized_messages': [],
        }

        # 탄생 카드와 뽑은 카드 연결
        for card in cards:
            card_name = card.get('name', '')

            if card_name == birth_card.get('primary_card'):
                result['personal_connections'].append({
                    'type': 'birth_card_direct',
                    'card': card_name,
                    'message': f"당신의 탄생 카드 '{birth_card.get('korean')}'가 직접 나왔습니다! "
                               f"이 리딩은 당신의 핵심 인생 테마와 깊이 연결되어 있습니다."
                })

            if card_name == birth_card.get('secondary_card'):
                result['personal_connections'].append({
                    'type': 'birth_card_secondary',
                    'card': card_name,
                    'message': f"당신의 보조 탄생 카드가 나왔습니다. "
                               f"잠재된 능력이 드러나고 있습니다."
                })

            if card_name == year_card.get('year_card'):
                result['personal_connections'].append({
                    'type': 'year_card',
                    'card': card_name,
                    'message': f"올해의 카드 '{year_card.get('year_card_korean')}'가 나왔습니다! "
                               f"{year_card.get('theme')}의 에너지가 강하게 작용하고 있습니다."
                })

        # 종합 개인화 메시지
        if result['personal_connections']:
            result['personalized_messages'].append(
                "이 리딩은 당신의 개인 운명 카드와 특별한 연결이 있습니다. "
                "우연이 아닌 운명적인 메시지에 주목하세요."
            )

        return result


class MultiLayerMixin:
    """Tier 5: 다층 해석 기능 믹스인"""

    def get_multi_layer_interpretation(self, card_name: str, context: Dict = None) -> Dict:
        """
        카드의 다층 해석 제공.

        Args:
            card_name: 카드 이름
            context: 추가 컨텍스트 (theme, is_reversed 등)

        Returns:
            다층 해석 딕셔너리
        """
        is_reversed = context.get('is_reversed', False) if context else False
        theme = context.get('theme', None) if context else None

        # 메이저 아르카나 해석
        base_layers = MAJOR_ARCANA_LAYERS.get(card_name)

        if base_layers:
            result = {
                'card': card_name,
                'layers': {},
            }

            for layer_key, layer_info in INTERPRETATION_LAYERS.items():
                layer_content = base_layers.get(layer_key, '')

                # 역방향이면 그림자 측면 강조
                if is_reversed and layer_key == 'shadow':
                    layer_content = f"⚠️ [역방향 강조] {layer_content}"

                result['layers'][layer_key] = {
                    'korean': layer_info['korean'],
                    'description': layer_info['description'],
                    'interpretation': layer_content,
                    'prompt': layer_info['prompt_template'],
                }

            result['integrated_message'] = self._integrate_layers(result['layers'])
            return result

        # 마이너 아르카나는 동적 생성
        return self._generate_minor_layers(card_name, is_reversed, theme)

    def _integrate_layers(self, layers: Dict) -> str:
        """다층 해석 통합 메시지 생성"""
        messages = []

        if 'surface' in layers:
            messages.append(f"표면적으로 {layers['surface']['interpretation']}")

        if 'psychological' in layers:
            messages.append(f"심리적으로는 {layers['psychological']['interpretation']}")

        if 'spiritual' in layers:
            messages.append(f"영적으로는 {layers['spiritual']['interpretation']}")

        if 'action' in layers:
            messages.append(f"실천적 조언: {layers['action']['interpretation']}")

        return ' '.join(messages)

    def _generate_minor_layers(self, card_name: str, is_reversed: bool, theme: str) -> Dict:
        """마이너 아르카나 다층 해석 동적 생성"""
        # 슈트와 숫자 파싱
        suit = None
        number = None

        for s in ['Wands', 'Cups', 'Swords', 'Pentacles']:
            if s in card_name:
                suit = s
                break

        for num_word, num in [('Ace', 1), ('Two', 2), ('Three', 3), ('Four', 4),
                               ('Five', 5), ('Six', 6), ('Seven', 7), ('Eight', 8),
                               ('Nine', 9), ('Ten', 10)]:
            if num_word in card_name:
                number = num
                break

        if not suit:
            return {'card': card_name, 'layers': {}, 'note': 'Court card - use card combination analysis'}

        suit_info = SUIT_INFO.get(suit, {})
        num_info = NUMEROLOGY.get(number, {})

        return {
            'card': card_name,
            'layers': {
                'surface': {
                    'korean': '표면적 의미',
                    'interpretation': f"{suit_info.get('korean', suit)} 영역에서 {num_info.get('meaning', '')}의 에너지",
                },
                'psychological': {
                    'korean': '심리적 의미',
                    'interpretation': f"{', '.join(suit_info.get('themes', [])[:2])}에 관한 {num_info.get('korean', '')}",
                },
                'action': {
                    'korean': '실천적 조언',
                    'interpretation': f"{num_info.get('energy', '')} 에너지를 {suit_info.get('direction', '')}으로 표현하세요.",
                },
            },
        }

    def get_reading_layers(self, cards: List[Dict], theme: str = None) -> Dict:
        """전체 리딩의 다층 해석"""
        result = {
            'cards': [],
            'collective_surface': [],
            'collective_psychological': [],
            'collective_shadow': [],
            'collective_spiritual': [],
            'collective_action': [],
            'narrative_summary': '',
        }

        for card in cards:
            card_name = card.get('name', '')
            is_reversed = card.get('isReversed', False)

            layer_result = self.get_multi_layer_interpretation(
                card_name,
                {'is_reversed': is_reversed, 'theme': theme}
            )

            result['cards'].append(layer_result)

            # 각 층별 수집
            layers = layer_result.get('layers', {})
            if 'surface' in layers:
                result['collective_surface'].append(layers['surface'].get('interpretation', ''))
            if 'psychological' in layers:
                result['collective_psychological'].append(layers['psychological'].get('interpretation', ''))
            if 'shadow' in layers:
                result['collective_shadow'].append(layers['shadow'].get('interpretation', ''))
            if 'spiritual' in layers:
                result['collective_spiritual'].append(layers['spiritual'].get('interpretation', ''))
            if 'action' in layers:
                result['collective_action'].append(layers['action'].get('interpretation', ''))

        # 서사 요약
        result['narrative_summary'] = self._build_layer_narrative(result)

        return result

    def _build_layer_narrative(self, layer_result: Dict) -> str:
        """층별 서사 구축"""
        parts = []

        if layer_result['collective_surface']:
            parts.append(f"현재 상황: {' → '.join(layer_result['collective_surface'][:3])}")

        if layer_result['collective_psychological']:
            parts.append(f"내면에서: {' '.join(layer_result['collective_psychological'][:2])}")

        if layer_result['collective_action']:
            parts.append(f"행동 조언: {layer_result['collective_action'][-1] if layer_result['collective_action'] else ''}")

        return ' | '.join(parts)


class StorytellingMixin:
    """Tier 6: 스토리텔링 기능 믹스인"""

    def build_narrative_arc(self, cards: List[Dict], context: Dict = None) -> Dict:
        """
        카드로 서사 구조 구축.

        Args:
            cards: 카드 목록
            context: 추가 컨텍스트 (theme, question 등)

        Returns:
            서사 구조
        """
        num_cards = len(cards)
        theme = context.get('theme', 'general') if context else 'general'

        # 카드 수에 따른 구조 선택
        if num_cards <= 3:
            structure = self._build_three_act_structure(cards)
        elif num_cards <= 5:
            structure = self._build_five_act_structure(cards)
        else:
            structure = self._build_hero_journey_structure(cards)

        # 카드 간 전이 생성
        transitions = self._generate_transitions(cards)

        # 테마별 스토리 톤 조정
        tone = self._determine_story_tone(cards, theme)

        return {
            'structure': structure,
            'transitions': transitions,
            'tone': tone,
            'opening_hook': self._create_opening_hook(cards[0] if cards else None),
            'climax': self._identify_climax(cards),
            'resolution': self._create_resolution(cards[-1] if cards else None),
            'full_narrative': self._weave_full_narrative(structure, transitions, tone),
        }

    def _build_three_act_structure(self, cards: List[Dict]) -> Dict:
        """3막 구조 (설정-갈등-해결)"""
        structure = {
            'type': 'three_act',
            'acts': []
        }

        if len(cards) >= 1:
            structure['acts'].append({
                'name': 'Setup (설정)',
                'card': cards[0].get('name'),
                'role': '현재 상황과 배경',
            })

        if len(cards) >= 2:
            structure['acts'].append({
                'name': 'Conflict (갈등)',
                'card': cards[1].get('name') if len(cards) > 1 else None,
                'role': '도전과 장애물',
            })

        if len(cards) >= 3:
            structure['acts'].append({
                'name': 'Resolution (해결)',
                'card': cards[2].get('name') if len(cards) > 2 else None,
                'role': '결과와 지혜',
            })

        return structure

    def _build_five_act_structure(self, cards: List[Dict]) -> Dict:
        """5막 구조 (도입-상승-절정-하강-결말)"""
        acts = [
            ('Exposition (도입)', '상황 소개'),
            ('Rising Action (상승)', '긴장 고조'),
            ('Climax (절정)', '핵심 전환점'),
            ('Falling Action (하강)', '결과 전개'),
            ('Resolution (결말)', '마무리와 교훈'),
        ]

        structure = {
            'type': 'five_act',
            'acts': []
        }

        for i, (name, role) in enumerate(acts):
            if i < len(cards):
                structure['acts'].append({
                    'name': name,
                    'card': cards[i].get('name'),
                    'role': role,
                })

        return structure

    def _build_hero_journey_structure(self, cards: List[Dict]) -> Dict:
        """영웅의 여정 구조 (6장 이상)"""
        journey_stages = [
            ('Ordinary World (일상)', '현재 상태'),
            ('Call to Adventure (소명)', '변화의 부름'),
            ('Threshold (문턱)', '여정의 시작'),
            ('Trials (시련)', '도전과 성장'),
            ('Abyss (심연)', '가장 어두운 순간'),
            ('Transformation (변환)', '핵심 변화'),
            ('Return (귀환)', '새로운 지혜와 함께'),
        ]

        structure = {
            'type': 'hero_journey',
            'korean': '영웅의 여정',
            'acts': []
        }

        for i, (name, role) in enumerate(journey_stages):
            if i < len(cards):
                structure['acts'].append({
                    'name': name,
                    'card': cards[i].get('name'),
                    'role': role,
                })

        return structure

    def _generate_transitions(self, cards: List[Dict]) -> List[Dict]:
        """카드 간 전이 문구 생성"""
        if len(cards) < 2:
            return []

        transitions = []

        for i in range(len(cards) - 1):
            card1 = cards[i]
            card2 = cards[i + 1]

            # 카드 에너지 비교
            transition_type = self._determine_transition_type(card1, card2)
            connector = CARD_TRANSITIONS.get(transition_type, CARD_TRANSITIONS['consequence'])[0]

            transitions.append({
                'from': card1.get('name'),
                'to': card2.get('name'),
                'type': transition_type,
                'connector': connector,
                'meaning': self._explain_transition(card1, card2, transition_type),
            })

        return transitions

    def _determine_transition_type(self, card1: Dict, card2: Dict) -> str:
        """두 카드 사이의 전이 유형 결정"""
        name1 = card1.get('name', '')
        name2 = card2.get('name', '')

        # 극성 대비 체크
        polarity_names = {p[0] for p in POLARITY_PAIRS} | {p[1] for p in POLARITY_PAIRS}
        if name1 in polarity_names and name2 in polarity_names:
            return 'contrast'

        # 숫자 진행 체크
        parsed1 = self._parse_card(card1)
        parsed2 = self._parse_card(card2)

        if parsed1.get('number') and parsed2.get('number'):
            if parsed2['number'] > parsed1['number']:
                return 'time'
            elif parsed2['number'] < parsed1['number']:
                return 'contrast'

        # 같은 슈트면 진행
        if parsed1.get('suit') == parsed2.get('suit'):
            return 'time'

        # 원소 상호작용 체크
        elem1 = parsed1.get('element')
        elem2 = parsed2.get('element')

        if elem1 and elem2:
            interaction = ELEMENT_INTERACTIONS.get((elem1, elem2)) or ELEMENT_INTERACTIONS.get((elem2, elem1))
            if interaction:
                if interaction['type'] == 'conflict':
                    return 'contrast'
                elif interaction['type'] == 'amplify':
                    return 'emphasis'

        return 'consequence'

    def _explain_transition(self, card1: Dict, card2: Dict, transition_type: str) -> str:
        """전이 설명 생성"""
        name1 = card1.get('name', '')
        name2 = card2.get('name', '')

        explanations = {
            'contrast': f"{name1}의 에너지가 {name2}로 전환되며 새로운 관점이 열립니다.",
            'consequence': f"{name1}로 인해 자연스럽게 {name2}의 상황이 펼쳐집니다.",
            'addition': f"{name1}의 에너지에 {name2}가 더해져 힘이 증폭됩니다.",
            'time': f"{name1}에서 {name2}로 시간이 흐르며 상황이 진전됩니다.",
            'condition': f"{name1}의 조건이 충족되면 {name2}가 실현됩니다.",
            'emphasis': f"{name2}가 {name1}의 메시지를 더욱 강조합니다.",
        }

        return explanations.get(transition_type, f"{name1}에서 {name2}로 흐름이 이어집니다.")

    def _determine_story_tone(self, cards: List[Dict], theme: str) -> Dict:
        """스토리 톤 결정"""
        # 카드 에너지 분석
        major_count = sum(1 for c in cards if 'The ' in c.get('name', ''))
        reversed_count = sum(1 for c in cards if c.get('isReversed', False))

        # 특정 카드 체크
        challenging_cards = {'The Tower', 'Death', 'Ten of Swords', 'Three of Swords', 'The Devil'}
        hopeful_cards = {'The Sun', 'The Star', 'Ace of Cups', 'Ten of Cups', 'The World'}

        has_challenge = any(c.get('name', '') in challenging_cards for c in cards)
        has_hope = any(c.get('name', '') in hopeful_cards for c in cards)

        # 톤 결정
        if has_challenge and has_hope:
            tone_type = 'transformative'
            description = '도전을 통한 성장'
            mood = '희망찬 긴장감'
        elif has_challenge:
            tone_type = 'serious'
            description = '진지한 성찰 필요'
            mood = '깊은 통찰'
        elif has_hope:
            tone_type = 'optimistic'
            description = '밝은 전망'
            mood = '기쁨과 축복'
        else:
            tone_type = 'balanced'
            description = '균형잡힌 여정'
            mood = '안정적 진행'

        return {
            'type': tone_type,
            'description': description,
            'mood': mood,
            'major_ratio': major_count / len(cards) if cards else 0,
            'challenge_level': reversed_count / len(cards) if cards else 0,
        }

    def _create_opening_hook(self, first_card: Dict) -> str:
        """오프닝 후크 생성"""
        if not first_card:
            return "당신의 이야기가 시작됩니다..."

        card_name = first_card.get('name', '')
        is_reversed = first_card.get('isReversed', False)

        hooks = {
            'The Fool': "모든 여정은 첫 발걸음에서 시작됩니다. 당신 앞에 무한한 가능성이 펼쳐져 있습니다.",
            'The Magician': "당신에게는 이미 필요한 모든 것이 있습니다. 이제 그것을 어떻게 사용할지가 문제입니다.",
            'The High Priestess': "보이지 않는 곳에 진실이 숨어 있습니다. 귀 기울여 들어보세요.",
            'The Empress': "풍요로움이 당신을 감싸고 있습니다. 그것을 느낄 준비가 되셨나요?",
            'The Tower': "때로는 모든 것이 무너져야 새로운 것이 세워질 수 있습니다.",
            'Death': "끝은 항상 새로운 시작을 품고 있습니다.",
            'The Sun': "빛이 당신을 향해 비추고 있습니다.",
        }

        hook = hooks.get(card_name, f"{card_name}가 당신의 이야기를 열어줍니다.")

        if is_reversed:
            hook = hook.replace('있습니다', '있지만, 아직 막힘이 있습니다')
            hook = hook.replace('비추고', '비추려 하지만 구름이')

        return hook

    def _identify_climax(self, cards: List[Dict]) -> Dict:
        """절정 포인트 식별"""
        if not cards:
            return {}

        # 가장 강렬한 카드 찾기
        major_cards = [c for c in cards if 'The ' in c.get('name', '')]

        climax_candidates = ['The Tower', 'Death', 'The Lovers', 'The Chariot', 'The World', 'Judgement']
        for card in cards:
            if card.get('name') in climax_candidates:
                return {
                    'card': card.get('name'),
                    'position': cards.index(card),
                    'message': f"이 리딩의 핵심 전환점은 '{card.get('name')}'입니다. "
                               f"이 카드의 메시지에 특히 주목하세요."
                }

        # 없으면 중간 카드
        mid_idx = len(cards) // 2
        return {
            'card': cards[mid_idx].get('name') if mid_idx < len(cards) else None,
            'position': mid_idx,
            'message': "리딩의 중심에서 균형점을 찾으세요.",
        }

    def _create_resolution(self, last_card: Dict) -> str:
        """결말 메시지 생성"""
        if not last_card:
            return "당신의 여정은 계속됩니다."

        card_name = last_card.get('name', '')
        is_reversed = last_card.get('isReversed', False)

        resolutions = {
            'The World': "한 사이클이 아름답게 완성됩니다. 다음 여정을 준비하세요.",
            'The Sun': "기쁨과 성공이 당신을 기다리고 있습니다.",
            'Ten of Cups': "사랑하는 이들과 함께 행복을 누리게 됩니다.",
            'The Star': "희망의 빛이 당신을 인도할 것입니다.",
            'Ace of Wands': "새로운 열정과 함께 새 시작이 기다립니다.",
            'Ten of Pentacles': "풍요와 안정이 당신의 것이 됩니다.",
        }

        resolution = resolutions.get(card_name,
                                      f"{card_name}의 에너지로 이 여정의 한 장이 마무리됩니다.")

        if is_reversed:
            resolution += " 다만, 완전한 실현을 위해 아직 작업이 필요합니다."

        return resolution

    def _weave_full_narrative(self, structure: Dict, transitions: List[Dict], tone: Dict) -> str:
        """전체 서사 엮기"""
        narrative_parts = []

        # 서두
        if tone['type'] == 'transformative':
            narrative_parts.append("변화의 바람이 불어옵니다.")
        elif tone['type'] == 'optimistic':
            narrative_parts.append("축복의 에너지가 흐르고 있습니다.")
        elif tone['type'] == 'serious':
            narrative_parts.append("깊은 성찰의 시간입니다.")
        else:
            narrative_parts.append("당신의 이야기가 펼쳐집니다.")

        # 각 막/단계
        for i, act in enumerate(structure.get('acts', [])):
            card = act.get('card', '')
            role = act.get('role', '')
            narrative_parts.append(f"[{act.get('name', '')}] {card}: {role}")

            # 전이 추가
            if i < len(transitions):
                trans = transitions[i]
                narrative_parts.append(f"→ {trans['connector']}...")

        # 마무리
        narrative_parts.append(f"\n이 리딩의 분위기: {tone['mood']}. {tone['description']}.")

        return '\n'.join(narrative_parts)

    def weave_card_connections(self, cards: List[Dict]) -> List[str]:
        """카드 간 연결고리 서술"""
        if len(cards) < 2:
            return []

        connections = []

        for i in range(len(cards) - 1):
            card1 = cards[i].get('name', '')
            card2 = cards[i + 1].get('name', '')

            # 시너지 체크
            synergy_found = False
            for synergy_type, synergies in CARD_SYNERGIES.items():
                for pair_cards, meaning, theme, multiplier in synergies:
                    if card1 in pair_cards and card2 in pair_cards:
                        connection = f"'{card1}'과 '{card2}'가 만나 {meaning}의 에너지를 만들어냅니다."
                        if synergy_type == 'reinforcing':
                            connection += " 강화된 긍정 에너지입니다. ✨"
                        elif synergy_type == 'conflicting':
                            connection += " 주의가 필요한 조합입니다. ⚠️"
                        elif synergy_type == 'transforming':
                            connection += " 변환의 에너지가 흐릅니다. 🔄"
                        connections.append(connection)
                        synergy_found = True
                        break

            if not synergy_found:
                # 일반 연결
                connections.append(f"'{card1}'의 에너지가 '{card2}'로 흘러들어갑니다.")

        return connections


# =============================================================================
# 확장된 TarotPatternEngine 클래스
# =============================================================================

class TarotPatternEnginePremium(TarotPatternEngine, PersonalizationMixin, MultiLayerMixin, StorytellingMixin):
    """
    프리미엄 타로 패턴 엔진.
    Tier 1-3 기본 분석 + Tier 4-6 고급 기능 통합.
    """

    def analyze_premium(self, cards: List[Dict], birthdate: str = None, theme: str = None,
                        moon_phase: str = None, include_narrative: bool = True) -> Dict:
        """
        프리미엄 종합 분석.

        Args:
            cards: 카드 목록
            birthdate: 사용자 생년월일 (개인화용)
            theme: 분석 테마
            moon_phase: 달 위상
            include_narrative: 스토리텔링 포함 여부

        Returns:
            종합 프리미엄 분석 결과
        """
        # Tier 1-3: 기본 분석
        base_analysis = self.analyze(cards)

        result = {
            'base_analysis': base_analysis,
            'theme_analysis': None,
            'realtime_context': None,
            'personalization': None,
            'multi_layer': None,
            'narrative': None,
        }

        # 테마 분석
        if theme:
            result['theme_analysis'] = self.analyze_theme_score(cards, theme)
        else:
            result['theme_analysis'] = self.analyze_all_themes(cards)

        # 실시간 컨텍스트
        result['realtime_context'] = self.get_realtime_context(moon_phase)
        result['realtime_boost'] = self.apply_realtime_boost(cards, moon_phase)

        # Tier 4: 개인화
        if birthdate:
            result['personalization'] = self.personalize_reading(cards, birthdate)

        # Tier 5: 다층 해석
        result['multi_layer'] = self.get_reading_layers(cards, theme)

        # Tier 6: 스토리텔링
        if include_narrative:
            result['narrative'] = self.build_narrative_arc(cards, {'theme': theme})
            result['card_connections'] = self.weave_card_connections(cards)

        # 종합 프리미엄 메시지
        result['premium_summary'] = self._build_premium_summary(result)

        return result

    def _build_premium_summary(self, analysis: Dict) -> Dict:
        """프리미엄 종합 요약 생성"""
        messages = []
        highlights = []

        # 기본 분석 핵심
        base = analysis.get('base_analysis', {})
        synthesis = base.get('synthesis', {})
        if synthesis.get('summary'):
            messages.append(synthesis['summary'])

        # 시너지 하이라이트
        synergy = base.get('synergy_analysis', {})
        if synergy.get('reinforcing'):
            for s in synergy['reinforcing'][:2]:
                highlights.append(f"✨ {s['meaning']}")
        if synergy.get('conflicting'):
            for s in synergy['conflicting'][:1]:
                highlights.append(f"⚠️ {s['meaning']}")

        # 개인화 연결
        personalization = analysis.get('personalization')
        if personalization and personalization.get('personal_connections'):
            for conn in personalization['personal_connections']:
                highlights.append(f"🎯 {conn['message'][:50]}...")

        # 테마 요약
        theme_analysis = analysis.get('theme_analysis', {})
        if isinstance(theme_analysis, dict) and 'outlook_message' in theme_analysis:
            messages.append(theme_analysis['outlook_message'])
        elif isinstance(theme_analysis, dict) and 'best_theme' in theme_analysis:
            best = theme_analysis.get('best_theme')
            if best:
                messages.append(f"가장 강한 영역: {best[0]} ({best[1].get('outlook_korean', '')})")

        # 서사 톤
        narrative = analysis.get('narrative', {})
        if narrative.get('tone'):
            messages.append(f"리딩 분위기: {narrative['tone'].get('mood', '')}")

        return {
            'main_message': ' '.join(messages),
            'highlights': highlights,
            'opening': narrative.get('opening_hook', ''),
            'resolution': narrative.get('resolution', ''),
        }


# =============================================================================
# 싱글톤 인스턴스
# =============================================================================

_pattern_engine = None
_premium_engine = None


def get_pattern_engine() -> TarotPatternEngine:
    """싱글톤 패턴 엔진 인스턴스 반환"""
    global _pattern_engine
    if _pattern_engine is None:
        _pattern_engine = TarotPatternEngine()
    return _pattern_engine


def get_premium_engine() -> TarotPatternEnginePremium:
    """싱글톤 프리미엄 엔진 인스턴스 반환"""
    global _premium_engine
    if _premium_engine is None:
        _premium_engine = TarotPatternEnginePremium()
    return _premium_engine


# =============================================================================
# 테스트
# =============================================================================

if __name__ == "__main__":
    import sys
    if sys.platform == 'win32':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')

    print("=" * 70)
    print("[TAROT PATTERN ENGINE PREMIUM TEST]")
    print("=" * 70)

    # 프리미엄 엔진 사용
    engine = get_premium_engine()

    # 테스트 카드 세트
    test_cards = [
        {"name": "The Fool", "isReversed": False},
        {"name": "The Magician", "isReversed": False},
        {"name": "Two of Cups", "isReversed": True},
        {"name": "Three of Cups", "isReversed": False},
        {"name": "Four of Cups", "isReversed": False},
        {"name": "Queen of Wands", "isReversed": False},
        {"name": "King of Cups", "isReversed": True},
        {"name": "The Lovers", "isReversed": False},
    ]

    # 테스트 생년월일
    test_birthdate = "1990-05-15"

    print(f"\n[Test Cards: {len(test_cards)}장]")
    for c in test_cards:
        print(f"  - {c['name']} {'(R)' if c['isReversed'] else ''}")
    print(f"\n[Test Birthdate: {test_birthdate}]")

    print("\n" + "=" * 70)
    print("[TIER 4: PERSONALIZATION]")
    print("=" * 70)

    # 탄생 카드 테스트
    birth_card = engine.calculate_birth_card(test_birthdate)
    print(f"\n탄생 카드: {birth_card.get('korean')} ({birth_card.get('primary_card')})")
    print(f"  특성: {', '.join(birth_card.get('traits', []))}")
    if birth_card.get('secondary_card'):
        print(f"  보조 카드: {birth_card.get('secondary_card')}")

    # 연간 카드 테스트
    year_card = engine.calculate_year_card(test_birthdate)
    print(f"\n연간 카드: {year_card.get('year_card_korean')} ({year_card.get('year_card')})")
    print(f"  테마: {year_card.get('korean')}")
    print(f"  조언: {year_card.get('advice')}")

    print("\n" + "=" * 70)
    print("[TIER 5: MULTI-LAYER INTERPRETATION]")
    print("=" * 70)

    # 다층 해석 테스트
    layer_result = engine.get_multi_layer_interpretation("The Fool")
    print("\n[The Fool 다층 해석]")
    for layer_key, layer_data in layer_result.get('layers', {}).items():
        print(f"  {layer_data.get('korean', layer_key)}: {layer_data.get('interpretation', '')[:50]}...")

    print("\n" + "=" * 70)
    print("[TIER 6: STORYTELLING]")
    print("=" * 70)

    # 스토리텔링 테스트
    narrative = engine.build_narrative_arc(test_cards[:5], {'theme': 'love'})
    print(f"\n[Opening Hook]")
    print(f"  {narrative.get('opening_hook', '')}")

    print(f"\n[Story Structure: {narrative.get('structure', {}).get('type', '')}]")
    for act in narrative.get('structure', {}).get('acts', []):
        print(f"  {act.get('name')}: {act.get('card')} - {act.get('role')}")

    print(f"\n[Tone]")
    tone = narrative.get('tone', {})
    print(f"  분위기: {tone.get('mood', '')} ({tone.get('description', '')})")

    print(f"\n[Resolution]")
    print(f"  {narrative.get('resolution', '')}")

    print("\n" + "=" * 70)
    print("[PREMIUM ANALYSIS]")
    print("=" * 70)

    # 종합 프리미엄 분석
    premium_result = engine.analyze_premium(
        test_cards,
        birthdate=test_birthdate,
        theme='love',
        moon_phase='full_moon',
        include_narrative=True
    )

    summary = premium_result.get('premium_summary', {})
    print(f"\n[Main Message]")
    print(f"  {summary.get('main_message', '')}")

    print(f"\n[Highlights]")
    for h in summary.get('highlights', []):
        print(f"  {h}")

    print(f"\n[Card Connections]")
    for conn in premium_result.get('card_connections', [])[:3]:
        print(f"  {conn}")

    # 개인화 연결 체크
    personalization = premium_result.get('personalization', {})
    if personalization.get('personal_connections'):
        print(f"\n[Personal Connections]")
        for conn in personalization['personal_connections']:
            print(f"  🎯 {conn['message']}")

    print("\n" + "=" * 70)
    print("[TEST COMPLETE - ALL TIERS (1-6) OPERATIONAL]")
    print("=" * 70)
