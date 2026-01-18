# backend_ai/app/tarot/engine.py
"""
Tarot Pattern Engine
====================
규칙 기반 카드 조합 분석 엔진
하드코딩 없이 모든 카드 조합을 동적으로 분석

분석 항목:
1. 슈트 패턴 (Cups, Wands, Swords, Pentacles 분포)
2. 숫자 패턴 (같은 숫자, 연속 숫자, 수비학적 의미)
3. 메이저/마이너 비율
4. 궁정 카드 패턴
5. 극성/대칭 카드
6. 에너지 흐름
"""

from typing import List, Dict

from .constants import SUIT_INFO
from .mixins import (
    PatternAnalysisMixin,
    EnergyAnalysisMixin,
    ThemeAnalysisMixin,
    RealtimeContextMixin,
)


class TarotPatternEngine(
    PatternAnalysisMixin,
    EnergyAnalysisMixin,
    ThemeAnalysisMixin,
    RealtimeContextMixin,
):
    """
    규칙 기반 타로 패턴 분석 엔진.
    하드코딩된 조합 없이 동적으로 모든 카드 조합을 분석.

    Mixins:
    - PatternAnalysisMixin: 슈트, 숫자, 아르카나, 궁정 카드, 극성 분석
    - EnergyAnalysisMixin: 에너지 흐름, 원소 상호작용, 변환 시퀀스, 시너지 분석
    - ThemeAnalysisMixin: 테마별 점수 계산 및 분석
    - RealtimeContextMixin: 시간 기반 컨텍스트 및 부스트 계산
    """

    def __init__(self):
        self.suit_info = SUIT_INFO
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
