# backend_ai/app/tarot/mixins/multilayer.py
"""
Multi-Layer Mixin
=================
Tier 5: 다층 해석 기능 믹스인
- 메이저 아르카나 다층 해석
- 마이너 아르카나 동적 해석
- 전체 리딩 다층 분석
"""

from typing import List, Dict

from ..constants import SUIT_INFO, NUMEROLOGY
from ..layers_data import INTERPRETATION_LAYERS, MAJOR_ARCANA_LAYERS


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
                    layer_content = f"[역방향 강조] {layer_content}"

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
            parts.append(f"현재 상황: {' -> '.join(layer_result['collective_surface'][:3])}")

        if layer_result['collective_psychological']:
            parts.append(f"내면에서: {' '.join(layer_result['collective_psychological'][:2])}")

        if layer_result['collective_action']:
            parts.append(f"행동 조언: {layer_result['collective_action'][-1] if layer_result['collective_action'] else ''}")

        return ' | '.join(parts)
