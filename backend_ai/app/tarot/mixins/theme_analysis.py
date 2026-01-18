# backend_ai/app/tarot/mixins/theme_analysis.py
"""
Theme Analysis Mixin for TarotPatternEngine.
Contains theme-based scoring and analysis methods.
"""

from typing import List, Dict

from ..data import CARD_THEME_SCORES


class ThemeAnalysisMixin:
    """테마 분석 믹스인 - 테마별 점수 계산 및 분석"""

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
