# backend_ai/app/tarot/mixins/realtime_context.py
"""
Realtime Context Mixin for TarotPatternEngine.
Contains time-based context and boost calculation methods.
"""

from typing import List, Dict
from datetime import datetime

from ..constants import WEEKDAY_PLANETS, MOON_PHASES


class RealtimeContextMixin:
    """실시간 컨텍스트 믹스인 - 시간 기반 컨텍스트 및 부스트 계산"""

    def get_realtime_context(self, moon_phase: str = None) -> Dict:
        """
        현재 날짜/시간 기반 컨텍스트.

        Args:
            moon_phase: 수동 지정 가능 (new_moon, full_moon, etc.)

        Returns:
            실시간 컨텍스트 정보
        """
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
