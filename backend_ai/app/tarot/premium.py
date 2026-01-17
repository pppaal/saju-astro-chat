# backend_ai/app/tarot/premium.py
"""
Tarot Pattern Engine Premium
============================
프리미엄 타로 패턴 엔진
Tier 1-3 기본 분석 + Tier 4-6 고급 기능 통합
"""

from typing import List, Dict

from .engine import TarotPatternEngine
from .mixins import PersonalizationMixin, MultiLayerMixin, StorytellingMixin


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
                highlights.append(f"{s['meaning']}")
        if synergy.get('conflicting'):
            for s in synergy['conflicting'][:1]:
                highlights.append(f"{s['meaning']}")

        # 개인화 연결
        personalization = analysis.get('personalization')
        if personalization and personalization.get('personal_connections'):
            for conn in personalization['personal_connections']:
                highlights.append(f"{conn['message'][:50]}...")

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
