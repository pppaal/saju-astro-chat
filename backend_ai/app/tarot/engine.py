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
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

from .constants import (
    SUIT_INFO,
    NUMEROLOGY,
    COURT_RANKS,
    ELEMENT_INTERACTIONS,
    POLARITY_PAIRS,
    TRANSFORMATION_SEQUENCES,
    WEEKDAY_PLANETS,
    MOON_PHASES,
)
from .data import CARD_THEME_SCORES, CARD_SYNERGIES


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
                result['messages'].append(f"강화 시너지: {' + '.join(pair_cards)} = {meaning}")

        # 약화/경고 쌍 찾기
        for pair_cards, meaning, theme, multiplier in CARD_SYNERGIES.get('conflicting', []):
            if set(pair_cards).issubset(card_names):
                result['conflicting'].append({
                    'cards': pair_cards,
                    'meaning': meaning,
                    'theme': theme,
                    'multiplier': multiplier,
                })
                result['messages'].append(f"주의 필요: {' + '.join(pair_cards)} = {meaning}")

        # 변환 쌍 찾기
        for pair_cards, meaning, theme, multiplier in CARD_SYNERGIES.get('transforming', []):
            if set(pair_cards).issubset(card_names):
                result['transforming'].append({
                    'cards': pair_cards,
                    'meaning': meaning,
                    'theme': theme,
                    'multiplier': multiplier,
                })
                result['messages'].append(f"변환 에너지: {' + '.join(pair_cards)} = {meaning}")

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
