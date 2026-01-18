# backend_ai/app/tarot/mixins/pattern_analysis.py
"""
Pattern Analysis Mixin for TarotPatternEngine.
Contains suit, number, arcana, court, polarity analysis methods.
"""

from typing import List, Dict
from collections import Counter

from ..constants import SUIT_INFO, NUMEROLOGY, COURT_RANKS, POLARITY_PAIRS


class PatternAnalysisMixin:
    """패턴 분석 믹스인 - 슈트, 숫자, 아르카나, 궁정 카드 분석"""

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
