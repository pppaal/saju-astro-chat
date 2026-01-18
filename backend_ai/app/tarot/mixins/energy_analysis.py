# backend_ai/app/tarot/mixins/energy_analysis.py
"""
Energy Analysis Mixin for TarotPatternEngine.
Contains energy flow, element interaction, transformation, and synthesis methods.
"""

from typing import List, Dict
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

from ..constants import (
    SUIT_INFO,
    COURT_RANKS,
    ELEMENT_INTERACTIONS,
    TRANSFORMATION_SEQUENCES,
)
from ..data import CARD_SYNERGIES


class EnergyAnalysisMixin:
    """에너지 분석 믹스인 - 에너지 흐름, 원소 상호작용, 변환 시퀀스, 시너지 분석"""

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
